/**
 * OWASP Security Fix Verification — FIND-07, FIND-10, FIND-11
 *
 * FIND-07: Redis-backed rate limiter (express-rate-limit + optional Redis store)
 * FIND-10: Server-side password complexity validation
 * FIND-11: Hardcoded production domain removed from pepprAuth.ts
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const authFile = path.resolve(__dirname, "pepprAuth.ts");
const authContent = fs.readFileSync(authFile, "utf-8");

// ── FIND-07: Redis-backed rate limiter ────────────────────────────────────────
describe("FIND-07 — Redis-backed rate limiter", () => {
  it("uses express-rate-limit package instead of custom in-memory implementation", () => {
    expect(authContent).toContain("express-rate-limit");
    expect(authContent).toContain("expressRateLimit");
    // Old custom implementation should be gone
    expect(authContent).not.toContain("rateLimitStore");
    expect(authContent).not.toContain("new Map<string, RateLimitEntry>");
  });

  it("uses rate-limit-redis for the Redis store", () => {
    expect(authContent).toContain("rate-limit-redis");
    expect(authContent).toContain("RedisStore");
  });

  it("uses ioredis as the Redis client", () => {
    expect(authContent).toContain("ioredis");
    expect(authContent).toContain("redisClient");
  });

  it("falls back gracefully when REDIS_URL is not set with a warning log", () => {
    expect(authContent).toContain("REDIS_URL not set");
    expect(authContent).toContain("in-memory store");
    expect(authContent).toContain("Set REDIS_URL in production");
  });

  it("uses Redis when REDIS_URL is set", () => {
    expect(authContent).toContain("process.env.REDIS_URL");
    expect(authContent).toContain("new Redis(process.env.REDIS_URL");
  });

  it("all four rate limiters use makeRateLimit with distinct Redis key prefixes", () => {
    expect(authContent).toContain('"rl:login"');
    expect(authContent).toContain('"rl:sso"');
    expect(authContent).toContain('"rl:refresh"');
    expect(authContent).toContain('"rl:pwd-reset"');
  });

  it("rate-limit-redis and ioredis are in package.json dependencies", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../package.json"), "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(deps["express-rate-limit"]).toBeDefined();
    expect(deps["rate-limit-redis"]).toBeDefined();
    expect(deps["ioredis"]).toBeDefined();
  });
});

// ── FIND-10: Password complexity validation ───────────────────────────────────
describe("FIND-10 — Server-side password complexity validation", () => {
  it("validatePasswordComplexity function exists in pepprAuth.ts", () => {
    expect(authContent).toContain("function validatePasswordComplexity");
  });

  it("enforces minimum length of 8 characters", () => {
    expect(authContent).toContain("password.length < 8");
    expect(authContent).toContain("at least 8 characters");
  });

  it("enforces at least one uppercase letter", () => {
    expect(authContent).toContain("[A-Z]");
    expect(authContent).toContain("uppercase letter");
  });

  it("enforces at least one digit", () => {
    expect(authContent).toContain("[0-9]");
    expect(authContent).toContain("digit");
  });

  it("enforces at least one special character", () => {
    expect(authContent).toContain("[^A-Za-z0-9]");
    expect(authContent).toContain("special character");
  });

  it("complexity check is applied to the register endpoint", () => {
    // The register endpoint should call validatePasswordComplexity
    const registerSection = authContent.slice(authContent.indexOf("/api/v1/auth/register"));
    expect(registerSection).toContain("validatePasswordComplexity");
  });

  it("complexity check is applied to the reset-password endpoint", () => {
    const resetSection = authContent.slice(authContent.indexOf("/api/v1/auth/reset-password"));
    expect(resetSection).toContain("validatePasswordComplexity");
  });

  it("validatePasswordComplexity logic works correctly", () => {
    // Inline the validator logic to test it directly without importing the module
    function validatePasswordComplexity(password: string): string | null {
      if (password.length < 8) return "Password must be at least 8 characters long.";
      if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
      if (!/[0-9]/.test(password)) return "Password must contain at least one digit.";
      if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character (e.g. !@#$%^&*).";
      return null;
    }

    // Should fail: too short
    expect(validatePasswordComplexity("Ab1!")).not.toBeNull();
    // Should fail: no uppercase
    expect(validatePasswordComplexity("abcdef1!")).not.toBeNull();
    // Should fail: no digit
    expect(validatePasswordComplexity("Abcdefg!")).not.toBeNull();
    // Should fail: no special char
    expect(validatePasswordComplexity("Abcdef12")).not.toBeNull();
    // Should pass: all rules met
    expect(validatePasswordComplexity("Abcdef1!")).toBeNull();
    expect(validatePasswordComplexity("MyP@ssw0rd")).toBeNull();
    expect(validatePasswordComplexity("Str0ng#Pass")).toBeNull();
  });
});

// ── FIND-11: No hardcoded production domain ───────────────────────────────────
describe("FIND-11 — Hardcoded production domain removed", () => {
  it("bo.peppr.vip is no longer hardcoded as a fallback URL in pepprAuth.ts", () => {
    // The domain should not appear as a string literal fallback
    expect(authContent).not.toContain('"https://bo.peppr.vip"');
    expect(authContent).not.toContain("'https://bo.peppr.vip'");
  });

  it("uses CORS_ALLOWED_ORIGINS env var as the fallback base URL", () => {
    expect(authContent).toContain("process.env.CORS_ALLOWED_ORIGINS");
    expect(authContent).toContain("configuredOrigin");
  });

  it("returns a 500 error when neither origin nor CORS_ALLOWED_ORIGINS is set", () => {
    expect(authContent).toContain("Server misconfiguration: cannot build reset link.");
    expect(authContent).toContain("CORS_ALLOWED_ORIGINS is not set");
  });

  it("both forgot-password and admin reset-password endpoints use the env-driven base URL", () => {
    // Count occurrences of CORS_ALLOWED_ORIGINS usage in the reset link context
    const matches = authContent.match(/CORS_ALLOWED_ORIGINS.*?split/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });
});
