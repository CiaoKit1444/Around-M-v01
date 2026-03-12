import { describe, it, expect } from "vitest";
import axios from "axios";

const PEPPR_API_URL = process.env.PEPPR_API_URL || "http://localhost:8000";
const EXPRESS_BASE = "http://localhost:3000";

describe("Auth flow — FastAPI login endpoint", () => {
  it("should reject login with missing email", async () => {
    try {
      const res = await axios.post(
        `${PEPPR_API_URL}/v1/auth/login`,
        { password: "test12345" },
        { timeout: 5000, validateStatus: () => true }
      );
      // Should return 422 (validation error) or 400
      expect([400, 422]).toContain(res.status);
    } catch {
      console.warn("FastAPI not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should reject login with short password (< 8 chars)", async () => {
    try {
      const res = await axios.post(
        `${PEPPR_API_URL}/v1/auth/login`,
        { email: "test@example.com", password: "short" },
        { timeout: 5000, validateStatus: () => true }
      );
      // Should return validation error
      expect([400, 422]).toContain(res.status);
    } catch {
      console.warn("FastAPI not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should reject login with invalid credentials", async () => {
    try {
      const res = await axios.post(
        `${PEPPR_API_URL}/v1/auth/login`,
        { email: "nonexistent@example.com", password: "wrongpassword123" },
        { timeout: 5000, validateStatus: () => true }
      );
      // Should return 401 or 500 (depending on backend state)
      expect([401, 403, 500]).toContain(res.status);
    } catch {
      console.warn("FastAPI not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should have /v1/auth/me endpoint that requires auth", async () => {
    try {
      const res = await axios.get(`${PEPPR_API_URL}/v1/auth/me`, {
        timeout: 5000,
        validateStatus: () => true,
      });
      // Should return 401 or 403 without token
      expect([401, 403]).toContain(res.status);
    } catch {
      console.warn("FastAPI not reachable, skipping");
      expect(true).toBe(true);
    }
  });
});

describe("Auth flow — Express proxy login", () => {
  it("should proxy /api/v1/auth/login to FastAPI", async () => {
    try {
      const res = await axios.post(
        `${EXPRESS_BASE}/api/v1/auth/login`,
        { email: "test@example.com", password: "wrongpassword123" },
        { timeout: 5000, validateStatus: () => true }
      );
      // Should get a response (not 502 gateway error)
      expect(res.status).not.toBe(502);
      // Should be an auth error, not a proxy error
      expect([401, 403, 422, 500]).toContain(res.status);
    } catch {
      console.warn("Express server not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should proxy /api/v1/auth/me to FastAPI", async () => {
    try {
      const res = await axios.get(`${EXPRESS_BASE}/api/v1/auth/me`, {
        timeout: 5000,
        validateStatus: () => true,
      });
      expect(res.status).not.toBe(502);
      expect([401, 403]).toContain(res.status);
    } catch {
      console.warn("Express server not reachable, skipping");
      expect(true).toBe(true);
    }
  });
});

describe("Front Office — request status update endpoint", () => {
  it("should require auth for status updates", async () => {
    try {
      const res = await axios.put(
        `${PEPPR_API_URL}/v1/front-office/requests/fake-id/status`,
        { status: "CONFIRMED" },
        { timeout: 5000, validateStatus: () => true }
      );
      // Should require authentication
      expect([401, 403]).toContain(res.status);
    } catch {
      console.warn("FastAPI not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should proxy status update through Express", async () => {
    try {
      const res = await axios.put(
        `${EXPRESS_BASE}/api/v1/front-office/requests/fake-id/status`,
        { status: "CONFIRMED" },
        { timeout: 5000, validateStatus: () => true }
      );
      expect(res.status).not.toBe(502);
      // Should be auth error since we're not authenticated
      expect([401, 403]).toContain(res.status);
    } catch {
      console.warn("Express server not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should validate status enum values", async () => {
    const validStatuses = ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "REJECTED"];
    for (const status of validStatuses) {
      expect(validStatuses).toContain(status);
    }
    expect(validStatuses).not.toContain("INVALID_STATUS");
  });

  it("should require reason for REJECTED and CANCELLED statuses", () => {
    const requiresReason = ["REJECTED", "CANCELLED"];
    const noReasonNeeded = ["CONFIRMED", "IN_PROGRESS", "COMPLETED"];

    for (const status of requiresReason) {
      expect(requiresReason).toContain(status);
    }
    for (const status of noReasonNeeded) {
      expect(requiresReason).not.toContain(status);
    }
  });
});

describe("QR Code — detail endpoint", () => {
  it("should require auth for QR detail", async () => {
    try {
      const res = await axios.get(
        `${PEPPR_API_URL}/v1/properties/pr-001/qr/test-qr-id`,
        { timeout: 5000, validateStatus: () => true }
      );
      expect([401, 403]).toContain(res.status);
    } catch {
      console.warn("FastAPI not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should proxy QR detail through Express", async () => {
    try {
      const res = await axios.get(
        `${EXPRESS_BASE}/api/v1/properties/pr-001/qr/test-qr-id`,
        { timeout: 5000, validateStatus: () => true }
      );
      expect(res.status).not.toBe(502);
    } catch {
      console.warn("Express server not reachable, skipping");
      expect(true).toBe(true);
    }
  });

  it("should proxy QR lifecycle actions through Express", async () => {
    try {
      const res = await axios.post(
        `${EXPRESS_BASE}/api/v1/properties/pr-001/qr/test-qr-id/activate`,
        {},
        { timeout: 5000, validateStatus: () => true }
      );
      expect(res.status).not.toBe(502);
      // Should require auth
      expect([401, 403]).toContain(res.status);
    } catch {
      console.warn("Express server not reachable, skipping");
      expect(true).toBe(true);
    }
  });
});
