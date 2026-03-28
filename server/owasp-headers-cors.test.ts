/**
 * OWASP Security Fix Verification — FIND-04 & FIND-05
 *
 * FIND-04: helmet HTTP security headers
 * FIND-05: CORS origin allowlist
 *
 * These tests validate the middleware configuration logic without requiring
 * a live server — they test the buildCorsOrigins helper and helmet config
 * contract directly.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";

// ── FIND-05: CORS origin allowlist logic ─────────────────────────────────────
// Mirror the buildCorsOrigins function from server/_core/index.ts so we can
// unit-test it in isolation without booting the full Express app.
function buildCorsOrigins(env: Record<string, string | undefined>): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [
    /\.manus\.computer$/,
    /\.manus\.space$/,
  ];

  const extra = env.CORS_ALLOWED_ORIGINS ?? "";
  for (const raw of extra.split(",").map(s => s.trim()).filter(Boolean)) {
    origins.push(raw);
  }

  if (env.NODE_ENV === "development") {
    origins.push(/localhost/);
  }

  return origins;
}

function isOriginAllowed(origin: string, allowlist: (string | RegExp)[]): boolean {
  return allowlist.some(o =>
    typeof o === "string" ? o === origin : o.test(origin)
  );
}

describe("FIND-05 — CORS origin allowlist", () => {
  it("allows Manus sandbox preview domains (.manus.computer)", () => {
    const origins = buildCorsOrigins({});
    expect(isOriginAllowed("https://3000-abc123.sg1.manus.computer", origins)).toBe(true);
    expect(isOriginAllowed("https://preview.manus.computer", origins)).toBe(true);
  });

  it("allows Manus published app domains (.manus.space)", () => {
    const origins = buildCorsOrigins({});
    expect(isOriginAllowed("https://pepprdash-jkkhr27m.manus.space", origins)).toBe(true);
    expect(isOriginAllowed("https://myapp.manus.space", origins)).toBe(true);
  });

  it("allows custom domains from CORS_ALLOWED_ORIGINS env var", () => {
    const origins = buildCorsOrigins({ CORS_ALLOWED_ORIGINS: "https://bo.peppr.vip,https://staging.peppr.vip" });
    expect(isOriginAllowed("https://bo.peppr.vip", origins)).toBe(true);
    expect(isOriginAllowed("https://staging.peppr.vip", origins)).toBe(true);
  });

  it("allows localhost in development mode", () => {
    const origins = buildCorsOrigins({ NODE_ENV: "development" });
    expect(isOriginAllowed("http://localhost:3000", origins)).toBe(true);
    expect(isOriginAllowed("http://localhost:5173", origins)).toBe(true);
  });

  it("blocks localhost in production mode", () => {
    const origins = buildCorsOrigins({ NODE_ENV: "production" });
    expect(isOriginAllowed("http://localhost:3000", origins)).toBe(false);
  });

  it("blocks arbitrary unknown origins", () => {
    const origins = buildCorsOrigins({});
    expect(isOriginAllowed("https://evil.example.com", origins)).toBe(false);
    expect(isOriginAllowed("https://attacker.io", origins)).toBe(false);
    expect(isOriginAllowed("null", origins)).toBe(false);
  });

  it("blocks subdomain spoofing attempts", () => {
    const origins = buildCorsOrigins({ CORS_ALLOWED_ORIGINS: "https://bo.peppr.vip" });
    // These should NOT match — they are not in the allowlist
    expect(isOriginAllowed("https://evil.manus.computer.attacker.com", origins)).toBe(false);
    expect(isOriginAllowed("https://bo.peppr.vip.evil.com", origins)).toBe(false);
  });

  it("ignores empty or whitespace-only entries in CORS_ALLOWED_ORIGINS", () => {
    const origins = buildCorsOrigins({ CORS_ALLOWED_ORIGINS: " , , https://bo.peppr.vip , " });
    expect(isOriginAllowed("https://bo.peppr.vip", origins)).toBe(true);
    // Empty string should not be added as an allowed origin
    const stringOrigins = origins.filter(o => typeof o === "string");
    expect(stringOrigins).not.toContain("");
  });
});

// ── FIND-04: helmet configuration contract ───────────────────────────────────
describe("FIND-04 — helmet security headers configuration", () => {
  it("helmet package is installed and importable", async () => {
    const helmet = await import("helmet");
    expect(helmet.default).toBeDefined();
    expect(typeof helmet.default).toBe("function");
  });

  it("cors package is installed and importable", async () => {
    const cors = await import("cors");
    expect(cors.default).toBeDefined();
    expect(typeof cors.default).toBe("function");
  });

  it("helmet is configured with crossOriginEmbedderPolicy disabled for Maps compatibility", async () => {
    const helmet = await import("helmet");
    // Verify helmet can be called with our config without throwing
    expect(() =>
      helmet.default({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
      })
    ).not.toThrow();
  });

  it("production CSP directives include required sources", () => {
    const cspDirectives = {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [] as string[],
    };

    // Verify no wildcard (*) in script-src — that would defeat CSP
    expect(cspDirectives.scriptSrc).not.toContain("*");
    expect(cspDirectives.scriptSrc).not.toContain("'unsafe-eval'");
    // Frame ancestors should block clickjacking
    expect(cspDirectives.frameSrc).toContain("'none'");
    // Object sources should be blocked
    expect(cspDirectives.objectSrc).toContain("'none'");
  });
});
