/**
 * Guest E2E Flow — Tests for the full guest scan → session → menu flow.
 *
 * Validates:
 *   - Public QR codes: scan → auto-session → menu
 *   - Restricted QR codes: scan → token validation → session → menu
 *   - Template data in menu responses
 *   - Stay token validation edge cases
 */
import { describe, it, expect } from "vitest";
import axios from "axios";

const BASE = "http://localhost:3000";
const GUEST_BASE = `${BASE}/api/public/guest`;
const PUBLIC_QR_BASE = `${BASE}/api/v1/public/qr`;

// Known test data (seeded in the database)
const PUBLIC_QR = "QR-SIAM-103";       // public access, The Siam Riverside Hotel
const RESTRICTED_QR = "QR-PEARL-102";   // restricted access, Andaman Pearl Beach Resort
const VALID_TOKEN = "STK-PEARL-101";    // valid stay token for Andaman Pearl

describe("Guest E2E — Public QR Flow", () => {
  let sessionId: string;

  it("should return active status with access_type=public for a public QR code", async () => {
    const res = await axios.get(`${PUBLIC_QR_BASE}/${PUBLIC_QR}/status`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.qr_code_id).toBe(PUBLIC_QR);
    expect(res.data.access_type).toBe("public");
    expect(res.data.status).toBe("active");
    expect(res.data.property_name).toBeTruthy();
    expect(res.data.room_number).toBeTruthy();
  });

  it("should create a session without a token for public QR", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/sessions`,
      { qr_code_id: PUBLIC_QR },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(201);
    expect(res.data.session_id).toBeTruthy();
    expect(res.data.qr_code_id).toBe(PUBLIC_QR);
    expect(res.data.access_type).toBe("public");
    expect(res.data.status).toBe("ACTIVE");
    sessionId = res.data.session_id;
  });

  it("should return a valid session when queried", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/${sessionId}`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.session_id).toBe(sessionId);
  });

  it("should validate the session as active", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/${sessionId}/validate`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(true);
  });

  it("should return a service menu with template and categories", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/${sessionId}/menu`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.session_id).toBe(sessionId);
    expect(res.data.template_id).toBeTruthy();
    expect(res.data.template_name).toBeTruthy();
    expect(res.data.categories).toBeInstanceOf(Array);
    expect(res.data.categories.length).toBeGreaterThan(0);
    expect(res.data.total_items).toBeGreaterThan(0);

    // Verify category structure
    const firstCategory = res.data.categories[0];
    expect(firstCategory.category_name).toBeTruthy();
    expect(firstCategory.items).toBeInstanceOf(Array);
    expect(firstCategory.items.length).toBeGreaterThan(0);

    // Verify item structure
    const firstItem = firstCategory.items[0];
    expect(firstItem.item_id).toBeTruthy();
    expect(firstItem.item_name).toBeTruthy();
    expect(firstItem.unit_price).toBeTruthy();
    expect(firstItem.currency).toBe("THB");
  });
});

describe("Guest E2E — Restricted QR Flow", () => {
  let sessionId: string;

  it("should return active status with access_type=restricted for a restricted QR code", async () => {
    const res = await axios.get(`${PUBLIC_QR_BASE}/${RESTRICTED_QR}/status`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.qr_code_id).toBe(RESTRICTED_QR);
    expect(res.data.access_type).toBe("restricted");
    expect(res.data.status).toBe("active");
  });

  it("should reject session creation without a token for restricted QR", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/sessions`,
      { qr_code_id: RESTRICTED_QR },
      { timeout: 5000, validateStatus: () => true }
    );
    // Should fail because restricted QR requires a stay token
    expect([403, 422]).toContain(res.status);
  });

  it("should validate a correct stay token as valid", async () => {
    const res = await axios.post(
      `${PUBLIC_QR_BASE}/validate-token`,
      { qr_code_id: RESTRICTED_QR, stay_token: VALID_TOKEN },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(true);
  });

  it("should reject an incorrect stay token", async () => {
    const res = await axios.post(
      `${PUBLIC_QR_BASE}/validate-token`,
      { qr_code_id: RESTRICTED_QR, stay_token: "WRONG-TOKEN-123" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });

  it("should create a session with a valid stay token for restricted QR", async () => {
    const res = await axios.post(
      `${GUEST_BASE}/sessions`,
      { qr_code_id: RESTRICTED_QR, stay_token: VALID_TOKEN },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(201);
    expect(res.data.session_id).toBeTruthy();
    expect(res.data.qr_code_id).toBe(RESTRICTED_QR);
    expect(res.data.access_type).toBe("restricted");
    expect(res.data.status).toBe("ACTIVE");
    sessionId = res.data.session_id;
  });

  it("should return a service menu for the restricted session", async () => {
    const res = await axios.get(`${GUEST_BASE}/sessions/${sessionId}/menu`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    expect(res.status).toBe(200);
    expect(res.data.template_name).toBeTruthy();
    expect(res.data.categories).toBeInstanceOf(Array);
    expect(res.data.total_items).toBeGreaterThan(0);
  });
});

describe("Guest E2E — Token Validation Edge Cases", () => {
  it("should return valid:false for token on wrong property QR", async () => {
    // STK-PEARL-101 is for Andaman Pearl, not for Siam Riverside
    const res = await axios.post(
      `${PUBLIC_QR_BASE}/validate-token`,
      { qr_code_id: PUBLIC_QR, stay_token: VALID_TOKEN },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });

  it("should return valid:false for empty token", async () => {
    const res = await axios.post(
      `${PUBLIC_QR_BASE}/validate-token`,
      { qr_code_id: RESTRICTED_QR, stay_token: "" },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });

  it("should return valid:false for non-existent QR code", async () => {
    const res = await axios.post(
      `${PUBLIC_QR_BASE}/validate-token`,
      { qr_code_id: "FAKE-QR-999", stay_token: VALID_TOKEN },
      { timeout: 5000, validateStatus: () => true }
    );
    expect(res.status).toBe(200);
    expect(res.data.valid).toBe(false);
  });
});
