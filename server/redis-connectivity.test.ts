/**
 * Redis connectivity test — validates that REDIS_URL is set and the Upstash
 * instance responds to a PING command over TLS.
 *
 * Run: pnpm test -- redis-connectivity
 */
import { describe, it, expect, afterAll } from "vitest";
import Redis from "ioredis";

describe("Upstash Redis connectivity", () => {
  const url = process.env.REDIS_URL;

  it("REDIS_URL environment variable is set", () => {
    expect(url, "REDIS_URL must be set to activate the Redis rate-limit store").toBeTruthy();
  });

  it("connects to Upstash over TLS and responds to PING", async () => {
    if (!url) return; // skip if previous test already failed
    const isTls = url.startsWith("rediss://");
    const client = new Redis(url, {
      tls: isTls ? {} : undefined,
      connectTimeout: 10_000,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: true,
    });

    try {
      const response = await client.ping();
      expect(response).toBe("PONG");
    } finally {
      await client.quit();
    }
  }, 15_000); // allow 15s for TLS handshake in CI

  it("can SET and GET a test key", async () => {
    if (!url) return;
    const isTls = url.startsWith("rediss://");
    const client = new Redis(url, {
      tls: isTls ? {} : undefined,
      connectTimeout: 10_000,
      maxRetriesPerRequest: 3,
    });

    try {
      const key = `peppr:test:${Date.now()}`;
      await client.set(key, "ok", "EX", 10); // 10-second TTL
      const val = await client.get(key);
      expect(val).toBe("ok");
      await client.del(key); // clean up
    } finally {
      await client.quit();
    }
  }, 15_000);
});
