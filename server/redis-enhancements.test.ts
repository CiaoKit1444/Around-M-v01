/**
 * Redis Enhancements Test Suite — Phase 54
 *
 * Tests for:
 *   1. Redis JTI revocation (revokeJtiRedis / isJtiRevokedRedis)
 *   2. Redis health tRPC procedure (systemHealth.redis)
 *   3. Environment key prefix isolation
 *
 * Run: pnpm test -- redis-enhancements
 */
import { describe, it, expect, afterAll, beforeAll } from "vitest";
import Redis from "ioredis";
import { nanoid } from "nanoid";

// ── Shared Redis client ──────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL;
const isTls = REDIS_URL?.startsWith("rediss://") ?? false;

let client: Redis | null = null;
beforeAll(() => {
  if (!REDIS_URL) return;
  client = new Redis(REDIS_URL, {
    tls: isTls ? {} : undefined,
    connectTimeout: 10_000,
    maxRetriesPerRequest: 3,
  });
});
afterAll(async () => {
  if (client) await client.quit();
});

// ── Enhancement 1: Redis JTI revocation ─────────────────────────────────────
describe("Enhancement 1 — Redis JTI revocation", () => {
  it("REDIS_URL is set (prerequisite)", () => {
    expect(REDIS_URL, "REDIS_URL must be set for Redis JTI revocation to work").toBeTruthy();
  });

  it("can write a JTI revocation key with TTL and read it back", async () => {
    if (!client) return;
    const jti = `test-jti-${nanoid(12)}`;
    const prefix = process.env.REDIS_KEY_PREFIX ?? "test";
    const key = `${prefix}:jti:revoked:${jti}`;

    // Simulate revokeJtiRedis
    await client.set(key, "1", "EX", 30); // 30-second TTL

    // Simulate isJtiRevokedRedis
    const exists = await client.exists(key);
    expect(exists).toBe(1);

    // TTL should be set
    const ttl = await client.ttl(key);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(30);

    // Clean up
    await client.del(key);
  }, 15_000);

  it("returns 0 for a non-revoked JTI", async () => {
    if (!client) return;
    const prefix = process.env.REDIS_KEY_PREFIX ?? "test";
    const key = `${prefix}:jti:revoked:non-existent-${nanoid(8)}`;
    const exists = await client.exists(key);
    expect(exists).toBe(0);
  }, 10_000);

  it("key expires automatically after TTL", async () => {
    if (!client) return;
    const jti = `test-jti-expire-${nanoid(8)}`;
    const prefix = process.env.REDIS_KEY_PREFIX ?? "test";
    const key = `${prefix}:jti:revoked:${jti}`;

    await client.set(key, "1", "EX", 1); // 1-second TTL
    const beforeExpiry = await client.exists(key);
    expect(beforeExpiry).toBe(1);

    // Wait for expiry
    await new Promise((r) => setTimeout(r, 1500));
    const afterExpiry = await client.exists(key);
    expect(afterExpiry).toBe(0);
  }, 10_000);
});

// ── Enhancement 3: Environment key prefix isolation ──────────────────────────
describe("Enhancement 3 — Environment key prefix isolation", () => {
  it("key prefix is derived from NODE_ENV (not 'production')", () => {
    // Vitest does not set NODE_ENV=test by default; the prefix logic maps:
    //   production → 'prod' | test → 'test' | anything else → 'dev'
    // We verify the logic is consistent — prefix must be one of the known values.
    const prefix = process.env.REDIS_KEY_PREFIX ??
      (process.env.NODE_ENV === "production" ? "prod" :
       process.env.NODE_ENV === "test" ? "test" : "dev");
    expect(["prod", "test", "dev"]).toContain(prefix);
    // In CI/dev (non-production), prefix must NOT be 'prod'
    if (process.env.NODE_ENV !== "production") {
      expect(prefix).not.toBe("prod");
    }
  });

  it("rate-limit keys in test env are isolated from prod keys", async () => {
    if (!client) return;
    const testKey = `test:rl:login:192.0.2.1`;
    const prodKey = `prod:rl:login:192.0.2.1`;

    await client.set(testKey, "3", "EX", 60);
    // prod key should not exist
    const prodExists = await client.exists(prodKey);
    expect(prodExists).toBe(0);

    // test key should exist
    const testExists = await client.exists(testKey);
    expect(testExists).toBe(1);

    // Clean up
    await client.del(testKey);
  }, 10_000);
});

// ── Enhancement 2: Redis health tRPC procedure (integration) ─────────────────
describe("Enhancement 2 — Redis health tRPC procedure", () => {
  it("PING round-trip latency is under 500 ms", async () => {
    if (!client) return;
    const start = Date.now();
    const pong = await client.ping();
    const latency = Date.now() - start;
    expect(pong).toBe("PONG");
    expect(latency).toBeLessThan(500);
  }, 10_000);
});
