/**
 * E2E — Onboarding Flow
 *
 * Covers: partner creation → property creation → bulk room creation →
 *         user invitation → SSO allowlist → admin user list
 *
 * Stubs bypassed: none (onboarding has no time-gated stubs)
 * Auth: admin JWT signed with JWT_SECRET from .env
 */
import { describe, it, expect, beforeAll } from "vitest";
import { makeJwt, postJson, fetchJson, deleteReq, SEED } from "./testHelpers";

const V1 = "/api/v1";

let token: string;
let createdPartnerId: string;
let createdPropertyId: string;

beforeAll(async () => {
  token = await makeJwt({ role: "admin" });
});

describe("Onboarding Flow", () => {
  // ON-01: Auth guard
  it("ON-01: unauthenticated request to protected route returns 401", async () => {
    const r = await fetch("http://localhost:3000/api/v1/partners");
    expect(r.status).toBe(401);
  });

  // ON-02: Create partner
  it("ON-02: POST /partners creates a new partner", async () => {
    const ts = Date.now();
    const r = await postJson(`${V1}/partners`, token, {
      name: `E2E Partner ${ts}`,
      email: `e2e-partner-${ts}@test.com`,
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ name: expect.stringContaining("E2E Partner") });
    createdPartnerId = r.body.id;
    expect(createdPartnerId).toBeTruthy();
  });

  // ON-03: Create property
  it("ON-03: POST /properties creates a property under the new partner", async () => {
    if (!createdPartnerId) return;
    const ts = Date.now();
    const r = await postJson(`${V1}/properties`, token, {
      name: `E2E Hotel ${ts}`,
      partner_id: createdPartnerId,
      type: "hotel",
      address: "123 Test Street",
      city: "Bangkok",
      country: "TH",
    });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ name: expect.stringContaining("E2E Hotel") });
    createdPropertyId = r.body.id;
    expect(createdPropertyId).toBeTruthy();
  });

  // ON-04: Bulk create rooms
  it("ON-04: POST /rooms/bulk creates multiple rooms", async () => {
    if (!createdPropertyId) return;
    const r = await postJson(`${V1}/rooms/bulk`, token, {
      property_id: createdPropertyId,
      rooms: [
        { room_number: "E2E-101", room_type: "standard", floor: 1 },
        { room_number: "E2E-102", room_type: "standard", floor: 1 },
        { room_number: "E2E-201", room_type: "deluxe", floor: 2 },
      ],
    });
    expect(r.status).toBe(201);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBe(3);
  });

  // ON-05: Get created property
  it("ON-05: GET /properties/:id returns the newly created property", async () => {
    if (!createdPropertyId) return;
    const r = await fetchJson(`${V1}/properties/${createdPropertyId}`, token);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(createdPropertyId);
  });

  // ON-06: Generate password reset link
  it("ON-06: POST /admin/generate-reset-link returns a reset token", async () => {
    const r = await postJson(`${V1}/admin/generate-reset-link`, token, {
      user_id: SEED.SIAM_USER_ID,
    });
    // 200 with token, or 404 if seed user not present in this environment
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      expect(r.body).toHaveProperty("token");
    }
  });

  // ON-07: SSO allowlist
  it("ON-07: POST /sso-allowlist adds an email to the allowlist", async () => {
    if (!createdPropertyId) return;
    const ts = Date.now();
    const r = await postJson(`${V1}/sso-allowlist`, token, {
      property_id: createdPropertyId,
      email: `staff-${ts}@e2e-hotel.com`,
      role: "staff",
    });
    expect([200, 201]).toContain(r.status);
  });

  // ON-08: List users
  it("ON-08: GET /admin/users returns a paginated list", async () => {
    const r = await fetchJson(`${V1}/admin/users?page=1&page_size=5`, token);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  // ON-09: Cleanup
  it("ON-09: DELETE /properties/:id removes the test property", async () => {
    if (!createdPropertyId) return;
    const r = await deleteReq(`${V1}/properties/${createdPropertyId}`, token);
    expect([200, 204, 404]).toContain(r.status);
  });
});
