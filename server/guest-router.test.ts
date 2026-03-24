/**
 * Guest Router — Tests for the dedicated /api/public/guest/* endpoints.
 *
 * Validates:
 *   - Session creation (POST /sessions)
 *   - Session retrieval (GET /sessions/:id)
 *   - Session validation (GET /sessions/:id/validate)
 *   - Service menu (GET /sessions/:id/menu)
 *   - Request submission (POST /sessions/:id/requests)
 *   - Request listing (GET /sessions/:id/requests)
 *   - Request tracking (GET /requests/:number)
 *   - Property branding (GET /properties/:id/branding)
 *   - QR status (GET /qr/:qrCodeId/status) via /api/v1/public/qr mount
 *   - Token validation (POST /qr/validate-token)
 */
import { describe, it, expect } from "vitest";
import axios from "axios";

const BASE = "http://localhost:3000";
const GUEST_BASE = `${BASE}/api/public/guest`;

describe("Guest Router — Session endpoints", () => {
  it("POST /sessions should reject missing qr_code_id with 400", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/sessions`,
      {},
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(400);
    expect(res.data.detail).toContain("qr_code_id");
  });

  it("POST /sessions should return 404 for non-existent QR code", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/sessions`,
      { qr_code_id: "FAKE-QR-CODE-12345" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(404);
    expect(res.data.detail).toContain("QR code not found");
  });

  it("GET /sessions/:id should return 404 for non-existent session", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/non-existent-session`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(404);
    expect(res.data.detail).toContain("Session not found");
  });

  it("GET /sessions/:id/validate should return valid:false for non-existent session", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/non-existent-session/validate`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });

  it("GET /sessions/:id/menu should return 404 for non-existent session", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/non-existent-session/menu`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(404);
    expect(res.data.detail).toContain("Session not found");
  });

  it("POST /sessions/:id/requests should return 404 for non-existent session", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/sessions/non-existent-session/requests`,
      { items: [] },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(404);
    expect(res.data.detail).toContain("Session not found");
  });

  it("GET /sessions/:id/requests should return empty array or 404 for non-existent session", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/non-existent-session/requests`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    // Returns empty array (session filter matches nothing) or 404
    expect([200, 404]).toContain(res.status);
    if (res.status === 200) {
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data).toHaveLength(0);
    }
  });
});

describe("Guest Router — Request tracking", () => {
  it("GET /requests/:number should return 404 for non-existent request", async () => {
    const res = await axios.get(`${GUEST_BASE}/requests/REQ-NONEXISTENT-001`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(404);
    expect(res.data.detail).toContain("Request not found");
  });
});

describe("Guest Router — Property branding", () => {
  it("GET /properties/:id/branding should return 404 for non-existent property", async () => {
    const res = await axios.get(`${GUEST_BASE}/properties/non-existent-property/branding`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(404);
    expect(res.data.detail).toContain("Property not found");
  });
});

describe("Guest Router — QR status (public)", () => {
  it("GET /api/v1/public/qr/:qrCodeId/status should return 404 for non-existent QR", async () => {
    const res = await axios.get(`${BASE}/api/v1/public/qr/FAKE-QR-CODE/status`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(404);
    expect(res.data).toHaveProperty("detail");
  });

  it("POST /api/public/guest/qr/validate-token should return valid:false for bad token", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/qr/validate-token`,
      { qr_code_id: "FAKE-QR", stay_token: "bad-token" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });

  it("POST /api/public/guest/qr/validate-token should return valid:false when missing fields", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/qr/validate-token`,
      {},
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });
});

describe("Guest Router — Route mounting verification", () => {
  it("should respond on /api/public/guest/* path (not 404 from Express)", async () => {
    // Any valid sub-route should hit the guest router, not Express's default 404
    const res = await axios.post(
      `${GUEST_BASE}/sessions`,
      { qr_code_id: "test" },
      { timeout: 5000, validateStatus: () => true }
    );
    // Should get a response from our router (400 or 404), not Express's HTML 404
    expect(res.headers["content-type"]).toContain("application/json");
    expect([400, 404]).toContain(res.status);
  });

  it("should respond on /api/v1/public/qr/* path", async () => {
    const res = await axios.get(`${BASE}/api/v1/public/qr/test-qr/status`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    // Guest router returns JSON 404 for non-existent QR codes
    expect(res.headers["content-type"]).toContain("json");
    expect([404]).toContain(res.status);
  });
});
