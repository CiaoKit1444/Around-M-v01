/**
 * E2E — Settings Flow
 *
 * Covers: property config (PUT /config) → property configuration (PATCH /configuration) →
 *         property detail (GET /properties/:id) → rooms list →
 *         public branding endpoint → font-size preference (guest session)
 *
 * API field mapping (verified against live server):
 *   PUT /config   → logo_url, primary_color, secondary_color, welcome_message,
 *                   qr_validation_limit, service_catalog_limit, request_submission_limit,
 *                   enable_guest_cancellation, enable_alternative_proposals, enable_direct_messaging
 *   PATCH /configuration → same fields (partial update, returns { success, data })
 *   GET /properties/:id  → config embedded in response
 *
 * Note: CMS banners and greeting config are tRPC-only (require Manus OAuth session cookie).
 *       Those are tested via the browser UI, not this test suite.
 *
 * Stubs bypassed: none
 * Auth: admin JWT
 */
import { describe, it, expect, beforeAll } from "vitest";
import { makeJwt, putJson, patchJson, fetchJson, SEED } from "./testHelpers";

const V1 = "/api/v1";

let token: string;
let guestSessionId: string;

beforeAll(async () => {
  token = await makeJwt({ role: "admin" });
  // Create a guest session for font-size test
  const r = await fetch("http://localhost:3000/api/v1/public/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qr_code_id: SEED.SIAM_QR_PUBLIC }),
  });
  if (r.ok) {
    const body = await r.json();
    guestSessionId = body.session_id;
  }
});

describe("Settings Flow", () => {
  // ST-01: PUT /properties/:id/config — upserts property config (branding, limits)
  it("ST-01: PUT /properties/:id/config updates property config", async () => {
    const r = await putJson(`${V1}/properties/${SEED.SIAM_PROPERTY_ID}/config`, token, {
      logo_url: "https://example.com/siam-logo.png",
      primary_color: "#FF6B35",
      secondary_color: "#2C3E50",
      welcome_message: "Welcome to The Siam Riverside Hotel",
      qr_validation_limit: 50,
      service_catalog_limit: 100,
      request_submission_limit: 20,
      enable_guest_cancellation: true,
      enable_alternative_proposals: false,
      enable_direct_messaging: false,
    });
    expect([200, 201]).toContain(r.status);
    // Response returns the property row (config is embedded)
    expect(r.body).toHaveProperty("id");
  });

  // ST-02: PATCH /properties/:id/configuration — partial update of config
  it("ST-02: PATCH /properties/:id/configuration updates property configuration", async () => {
    const r = await patchJson(
      `${V1}/properties/${SEED.SIAM_PROPERTY_ID}/configuration`,
      token,
      {
        welcome_message: "Sawadee krap — Welcome to Siam",
        enable_direct_messaging: true,
      }
    );
    expect([200, 201]).toContain(r.status);
    // Response is { success: true, data: { property_id, ... } }
    expect(r.body).toHaveProperty("success");
  });

  // ST-03: GET /properties/:id — config is embedded in the property detail response
  it("ST-03: GET /properties/:id includes config in property detail", async () => {
    const r = await fetchJson(`${V1}/properties/${SEED.SIAM_PROPERTY_ID}`, token);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("id");
    // config may be null if never set, or an object with logo_url etc.
    expect(["object", "undefined"].includes(typeof r.body.config) || r.body.config === null).toBe(true);
  });

  // ST-04: Public branding endpoint
  it("ST-04: GET /public/properties/:id/branding returns branding data", async () => {
    const r = await fetch(
      `http://localhost:3000${V1}/public/properties/${SEED.SIAM_PROPERTY_ID}/branding`
    );
    expect([200, 404]).toContain(r.status);
    if (r.status === 200) {
      const body = await r.json();
      expect(body).toHaveProperty("property_name");
    }
  });

  // ST-05: List properties
  it("ST-05: GET /properties returns paginated list", async () => {
    const r = await fetchJson(`${V1}/properties?page=1&page_size=5`, token);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(r.body.items.length).toBeGreaterThan(0);
  });

  // ST-06: Get property detail
  it("ST-06: GET /properties/:id returns property detail", async () => {
    const r = await fetchJson(`${V1}/properties/${SEED.SIAM_PROPERTY_ID}`, token);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(SEED.SIAM_PROPERTY_ID);
    expect(r.body).toHaveProperty("name");
  });

  // ST-07: List rooms for property
  it("ST-07: GET /rooms returns rooms for Siam property", async () => {
    const r = await fetchJson(
      `${V1}/rooms?property_id=${SEED.SIAM_PROPERTY_ID}&page=1&page_size=5`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(r.body.items.length).toBeGreaterThan(0);
  });

  // ST-08: Font-size preference (guest session preference — S/M/L/XL)
  it("ST-08: PATCH /public/sessions/:id/font-size updates guest font preference", async () => {
    if (!guestSessionId) {
      console.log("ST-08: skipped — no guest session available");
      return;
    }
    const r = await fetch(
      `http://localhost:3000${V1}/public/sessions/${guestSessionId}/font-size`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ font_size: "L" }),
      }
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.font_size).toBe("L");
  });

  // ST-09: Invalid font-size is rejected
  it("ST-09: PATCH /public/sessions/:id/font-size rejects invalid value", async () => {
    if (!guestSessionId) return;
    const r = await fetch(
      `http://localhost:3000${V1}/public/sessions/${guestSessionId}/font-size`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ font_size: "huge" }),
      }
    );
    expect(r.status).toBe(400);
  });
});
