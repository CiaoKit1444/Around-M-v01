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
  it("key prefix is derived from REDIS_KEY_PREFIX or NODE_ENV", () => {
    // The prefix is either the explicit REDIS_KEY_PREFIX secret or derived from NODE_ENV.
    // When REDIS_KEY_PREFIX=prod is set (as in production), prefix will be 'prod' regardless
    // of NODE_ENV. We only verify the value is one of the known valid prefixes.
    const prefix = process.env.REDIS_KEY_PREFIX ??
      (process.env.NODE_ENV === "production" ? "prod" :
       process.env.NODE_ENV === "test" ? "test" : "dev");
    expect(["prod", "dev", "test", "staging"]).toContain(prefix);
    // If no explicit override AND not production, prefix must not be 'prod'
    if (!process.env.REDIS_KEY_PREFIX && process.env.NODE_ENV !== "production") {
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
  it("PING round-trip latency is under 2000 ms", async () => {
    if (!client) return;
    const start = Date.now();
    const pong = await client.ping();
    const latency = Date.now() - start;
    expect(pong).toBe("PONG");
    // Upstash free-tier on Singapore edge can spike under cold-start;
    // 2000 ms is a generous but realistic SLA for a shared instance.
    expect(latency).toBeLessThan(2000);
  }, 10_000);

  it("SCAN returns correct count of active JTI revocation keys", async () => {
    if (!client) return;
    const prefix = process.env.REDIS_KEY_PREFIX ?? "test";
    // Write 3 test JTI keys
    const jtis = [nanoid(12), nanoid(12), nanoid(12)];
    for (const jti of jtis) {
      await client.set(`${prefix}:jti:revoked:scan-test-${jti}`, "1", "EX", 30);
    }

    // Replicate the SCAN logic from systemHealth.redis procedure
    let count = 0;
    let cursor = "0";
    const pattern = `${prefix}:jti:revoked:scan-test-*`;
    let iterations = 0;
    do {
      const [nextCursor, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      count += keys.length;
      cursor = nextCursor;
      iterations++;
    } while (cursor !== "0" && iterations < 5);

    expect(count).toBe(3);

    // Clean up
    for (const jti of jtis) {
      await client.del(`${prefix}:jti:revoked:scan-test-${jti}`);
    }
  }, 15_000);
});

// ── Phase 55: pruneExpiredJtis is exported ────────────────────────────────────
describe("Phase 55 — pruneExpiredJtis export", () => {
  it("pruneExpiredJtis is exported from pepprAuth", async () => {
    const mod = await import("./pepprAuth");
    expect(typeof mod.pruneExpiredJtis).toBe("function");
  });

  it("REDIS_KEY_PREFIX secret is set", () => {
    // Validates that the REDIS_KEY_PREFIX secret was injected correctly.
    // In production this should be 'prod'; in dev/test any non-empty value is valid.
    const prefix = process.env.REDIS_KEY_PREFIX;
    expect(prefix).toBeTruthy();
    expect(["prod", "dev", "test", "staging"]).toContain(prefix);
  });
});
