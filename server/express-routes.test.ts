/**
 * Express-native API Routes — Validates that all endpoints are served
 * directly by Express (no FastAPI proxy dependency).
 */
import { describe, it, expect } from "vitest";

const BASE = "http://localhost:3000";

describe("Express-native API — no FastAPI dependency", () => {
  it("should NOT have apiProxy registered (no 502 Bad Gateway)", async () => {
    // Previously, hitting an unmapped route via apiProxy would return 502.
    // Now it should return 401 (auth required) or 404 (not found).
    const res = await fetch(`${BASE}/api/v1/partners`);
    expect(res.status).not.toBe(502);
  });
});

describe("Express-native endpoints require auth", () => {
  const protectedEndpoints = [
    "/api/v1/partners",
    "/api/v1/properties",
    "/api/v1/rooms",
    "/api/v1/providers",
    "/api/v1/catalog",
    "/api/v1/templates",
    "/api/v1/qr-codes",
    "/api/v1/staff/positions",
    "/api/v1/staff/members",
    "/api/v1/admin/audit",
    "/api/v1/admin/sso-allowlist",
    "/api/v1/admin/users",
  ];

  for (const endpoint of protectedEndpoints) {
    it(`should return 401 for unauthenticated ${endpoint}`, async () => {
      const res = await fetch(`${BASE}${endpoint}`);
      expect(res.status).toBe(401);
    });
  }
});

describe("Express-native public endpoints", () => {
  it("should serve public QR validation (returns valid:false for unknown code)", async () => {
    const res = await fetch(`${BASE}/api/v1/public/qr/validate/nonexistent-code`);
    // Returns 404 with valid:false for non-existent QR codes
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.valid).toBe(false);
  });

  it("should serve public guest session creation (returns 400 for missing body)", async () => {
    const res = await fetch(`${BASE}/api/v1/public/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    // Should return 400 (bad request) not 502 (proxy error)
    expect(res.status).not.toBe(502);
    expect(res.status).toBe(400);
  });
});
