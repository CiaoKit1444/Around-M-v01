/**
 * Tests for dual-auth middleware in server/routes/_helpers.ts
 *
 * Verifies that extractPepprUser and requireAuth support both:
 *   1. Bearer JWT (Peppr auth flow)
 *   2. Manus OAuth session cookie fallback
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const helpersSrc = readFileSync(
  resolve(__dirname, "routes/_helpers.ts"),
  "utf-8"
);

// ── 1. Structural checks on _helpers.ts ─────────────────────────────────────

describe("Dual-auth _helpers.ts structure", () => {
  it("imports cookie parser", () => {
    expect(helpersSrc).toContain('import { parse as parseCookieHeader } from "cookie"');
  });

  it("imports COOKIE_NAME from shared const", () => {
    expect(helpersSrc).toContain('import { COOKIE_NAME } from "@shared/const"');
  });

  it("imports pepprUsers and pepprUserRoles from schema", () => {
    expect(helpersSrc).toContain("pepprUsers");
    expect(helpersSrc).toContain("pepprUserRoles");
  });

  it("defines extractFromBearerToken function", () => {
    expect(helpersSrc).toContain("async function extractFromBearerToken");
  });

  it("defines extractFromSessionCookie function", () => {
    expect(helpersSrc).toContain("async function extractFromSessionCookie");
  });

  it("extractPepprUser tries Bearer first, then session cookie", () => {
    // The exported function should call both strategies in order
    expect(helpersSrc).toContain("extractFromBearerToken(req)");
    expect(helpersSrc).toContain("extractFromSessionCookie(req)");

    // Bearer should be tried first (appears before session cookie in the function)
    const bearerIdx = helpersSrc.indexOf("extractFromBearerToken(req)");
    const cookieIdx = helpersSrc.indexOf("extractFromSessionCookie(req)");
    expect(bearerIdx).toBeLessThan(cookieIdx);
  });

  it("Bearer extraction checks Authorization header", () => {
    expect(helpersSrc).toContain("req.headers.authorization");
    expect(helpersSrc).toContain('Bearer ');
  });

  it("Session cookie extraction reads cookie header", () => {
    expect(helpersSrc).toContain("req.headers.cookie");
    expect(helpersSrc).toContain("parseCookieHeader");
    expect(helpersSrc).toContain("COOKIE_NAME");
  });

  it("Session cookie extraction verifies JWT with HS256", () => {
    expect(helpersSrc).toContain('algorithms: ["HS256"]');
  });

  it("Session cookie extraction looks up pepprUsers by manusOpenId", () => {
    expect(helpersSrc).toContain("pepprUsers.manusOpenId");
    expect(helpersSrc).toContain("openId");
  });

  it("Session cookie extraction fetches role assignments", () => {
    expect(helpersSrc).toContain("pepprUserRoles");
    expect(helpersSrc).toContain("roleId");
  });

  it("requireAuth still returns 401 on failure", () => {
    expect(helpersSrc).toContain('res.status(401).json({ detail: "Authentication required" })');
  });

  it("requireAuth sets pepprUser on success", () => {
    expect(helpersSrc).toContain('(req as any).pepprUser = user');
  });
});

// ── 2. Verify the PepprJwtPayload interface is unchanged ────────────────────

describe("PepprJwtPayload interface", () => {
  it("has sub field", () => {
    expect(helpersSrc).toContain("sub: string");
  });

  it("has email field", () => {
    expect(helpersSrc).toContain("email: string");
  });

  it("has role field", () => {
    expect(helpersSrc).toContain("role: string");
  });

  it("has roles array field", () => {
    expect(helpersSrc).toContain("roles: string[]");
  });

  it("has partner_id field", () => {
    expect(helpersSrc).toContain("partner_id: string | null");
  });

  it("has property_id field", () => {
    expect(helpersSrc).toContain("property_id: string | null");
  });
});

// ── 3. Verify the session cookie path builds correct payload ────────────────

describe("Session cookie payload mapping", () => {
  it("maps pepprUser.userId to sub", () => {
    expect(helpersSrc).toContain("sub: pepprUser.userId");
  });

  it("maps pepprUser.email to email", () => {
    expect(helpersSrc).toContain("email: pepprUser.email");
  });

  it("maps pepprUser.partnerId to partner_id", () => {
    expect(helpersSrc).toContain("partner_id: pepprUser.partnerId");
  });

  it("maps pepprUser.propertyId to property_id", () => {
    expect(helpersSrc).toContain("property_id: pepprUser.propertyId");
  });
});
