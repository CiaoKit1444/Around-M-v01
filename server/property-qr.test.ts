/**
 * Property-scoped QR Router — Tests for /api/v1/properties/:propertyId/qr/*
 *
 * Validates that the property-scoped QR routes are properly mounted and
 * respond with JSON (not Vite HTML fallback). All endpoints require auth,
 * so we expect 401 for unauthenticated requests.
 */
import { describe, it, expect } from "vitest";
import axios from "axios";

const BASE = "http://localhost:3000";
const PROP_ID = "test-property-id";
const QR_ID = "test-qr-id";

describe("Property-scoped QR Router — Route mounting", () => {
  it("GET /api/v1/properties/:propertyId/qr should return JSON (not HTML)", async () => {
    const res = await axios.get(`${BASE}/api/v1/properties/${PROP_ID}/qr`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
    expect(res.data.detail).toBe("Authentication required");
  });

  it("GET /api/v1/properties/:propertyId/qr/:qrCodeId should return JSON", async () => {
    const res = await axios.get(`${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/generate should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/generate`,
      { room_ids: ["room-1"] },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("PUT /api/v1/properties/:propertyId/qr/:qrCodeId/access-type should return JSON", async () => {
    const res = await axios.put(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/access-type`,
      { access_type: "public" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/:qrCodeId/activate should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/activate`,
      {},
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/:qrCodeId/deactivate should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/deactivate`,
      {},
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/:qrCodeId/suspend should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/suspend`,
      {},
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/:qrCodeId/resume should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/resume`,
      {},
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/:qrCodeId/revoke should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/revoke`,
      { reason: "test" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/:qrCodeId/extend should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/${QR_ID}/extend`,
      { extension_hours: 24 },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/properties/:propertyId/qr/room-change should return JSON", async () => {
    const res = await axios.post(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/room-change`,
      { from_qr_code_id: "qr-1", to_room_id: "room-2" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/properties/:propertyId/qr/tokens/active should return JSON", async () => {
    const res = await axios.get(
      `${BASE}/api/v1/properties/${PROP_ID}/qr/tokens/active`,
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.headers["content-type"]).toContain("json");
    expect(res.status).toBe(401);
  });
});
