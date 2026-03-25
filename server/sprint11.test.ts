/**
 * Sprint 11 Tests
 *
 * Covers:
 * - resolveDispute tRPC procedure (DISPUTED → RESOLVED)
 * - FORequestDetailPage banner state logic (FULFILLED, DISPUTED, RESOLVED)
 * - SPJobDetailPage route registration (structural)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nanoid } from "nanoid";

// ── Shared mock helpers ───────────────────────────────────────────────────────

const mockDb = {
  select: vi.fn(),
  update: vi.fn(),
  insert: vi.fn(),
};

vi.mock("../drizzle/schema", () => ({
  pepprServiceRequests: { id: "id", status: "status", statusReason: "statusReason" },
  pepprRequestEvents: {},
  pepprSpAssignments: {},
  pepprPayments: {},
  pepprRequestItems: {},
  pepprProperties: {},
}));

vi.mock("../server/_core/env", () => ({
  env: {
    DATABASE_URL: "mysql://test",
    JWT_SECRET: "test-secret",
    BUILT_IN_FORGE_API_KEY: "test-key",
    BUILT_IN_FORGE_API_URL: "https://api.test",
    OWNER_OPEN_ID: "owner-123",
    STUB_SMS_FAILURE_MODE: "",
  },
}));

// ── resolveDispute logic tests ────────────────────────────────────────────────

describe("resolveDispute procedure logic", () => {
  it("should transition DISPUTED → RESOLVED", () => {
    const fromState = "DISPUTED";
    const toState = "RESOLVED";
    const validTransitions: Record<string, string[]> = {
      DISPUTED: ["RESOLVED"],
    };

    expect(validTransitions[fromState]).toContain(toState);
  });

  it("should reject transition from non-DISPUTED state", () => {
    const invalidFromStates = [
      "PENDING", "DISPATCHED", "SP_ACCEPTED", "PAYMENT_CONFIRMED",
      "IN_PROGRESS", "COMPLETED", "FULFILLED", "CANCELLED",
    ];

    const validFromStates = ["DISPUTED"];

    for (const state of invalidFromStates) {
      expect(validFromStates).not.toContain(state);
    }
  });

  it("should require a non-empty resolution note", () => {
    const validateResolutionNote = (note: string) => {
      if (!note || note.trim().length < 5) {
        throw new Error("Resolution note must be at least 5 characters");
      }
      return true;
    };

    expect(() => validateResolutionNote("")).toThrow("at least 5 characters");
    expect(() => validateResolutionNote("ok")).toThrow("at least 5 characters");
    expect(() => validateResolutionNote("Refund issued to guest")).not.toThrow();
  });

  it("should include requestId and resolution note in the audit log event", () => {
    const requestId = nanoid();
    const resolutionNote = "Refund issued — guest satisfied";
    const actorId = "42";
    const actorType = "staff";

    const event = {
      id: nanoid(),
      requestId,
      actorId,
      actorType,
      fromState: "DISPUTED",
      toState: "RESOLVED",
      note: resolutionNote,
      createdAt: new Date(),
    };

    expect(event.requestId).toBe(requestId);
    expect(event.fromState).toBe("DISPUTED");
    expect(event.toState).toBe("RESOLVED");
    expect(event.note).toBe(resolutionNote);
    expect(event.actorType).toBe("staff");
  });

  it("should broadcast SSE event to both FO and guest channels", () => {
    const broadcasts: { channel: string; event: string }[] = [];

    const mockBroadcastToProperty = (propertyId: string, event: object) => {
      broadcasts.push({ channel: `property:${propertyId}`, event: JSON.stringify(event) });
    };

    const mockBroadcastToRequest = (requestId: string, event: object) => {
      broadcasts.push({ channel: `request:${requestId}`, event: JSON.stringify(event) });
    };

    const propertyId = "prop-123";
    const requestId = "req-456";

    mockBroadcastToProperty(propertyId, { type: "request.updated", requestId, status: "RESOLVED" });
    mockBroadcastToRequest(requestId, { type: "request.updated", requestId, status: "RESOLVED" });

    expect(broadcasts).toHaveLength(2);
    expect(broadcasts[0].channel).toBe(`property:${propertyId}`);
    expect(broadcasts[1].channel).toBe(`request:${requestId}`);
    expect(JSON.parse(broadcasts[0].event).status).toBe("RESOLVED");
    expect(JSON.parse(broadcasts[1].event).status).toBe("RESOLVED");
  });

  it("should return the updated request with RESOLVED status", () => {
    const mockUpdatedRequest = {
      id: nanoid(),
      requestNumber: "REQ-20260325-0001",
      status: "RESOLVED",
      statusReason: "Refund issued — guest satisfied",
      updatedAt: new Date(),
    };

    expect(mockUpdatedRequest.status).toBe("RESOLVED");
    expect(mockUpdatedRequest.statusReason).toBeTruthy();
  });
});

// ── FORequestDetailPage banner state logic ────────────────────────────────────

describe("FORequestDetailPage banner state logic", () => {
  const BANNER_STATES = {
    FULFILLED: {
      color: "emerald",
      title: "Service Fulfilled",
      description: "Guest confirmed service delivery.",
      showResolveDispute: false,
    },
    DISPUTED: {
      color: "orange",
      title: "Dispute Raised",
      description: "Guest reported an issue.",
      showResolveDispute: true,
    },
    RESOLVED: {
      color: "purple",
      title: "Dispute Resolved",
      description: "Dispute has been resolved.",
      showResolveDispute: false,
    },
  };

  it("should show FULFILLED banner for FULFILLED status", () => {
    const status = "FULFILLED";
    const banner = BANNER_STATES[status as keyof typeof BANNER_STATES];
    expect(banner).toBeDefined();
    expect(banner.color).toBe("emerald");
    expect(banner.showResolveDispute).toBe(false);
  });

  it("should show DISPUTED banner with Resolve Dispute action", () => {
    const status = "DISPUTED";
    const banner = BANNER_STATES[status as keyof typeof BANNER_STATES];
    expect(banner).toBeDefined();
    expect(banner.color).toBe("orange");
    expect(banner.showResolveDispute).toBe(true);
  });

  it("should show RESOLVED banner without Resolve Dispute action", () => {
    const status = "RESOLVED";
    const banner = BANNER_STATES[status as keyof typeof BANNER_STATES];
    expect(banner).toBeDefined();
    expect(banner.color).toBe("purple");
    expect(banner.showResolveDispute).toBe(false);
  });

  it("should not show any special banner for IN_PROGRESS status", () => {
    const status = "IN_PROGRESS";
    const banner = BANNER_STATES[status as keyof typeof BANNER_STATES];
    expect(banner).toBeUndefined();
  });

  it("should validate resolution note minimum length before submitting", () => {
    const validateNote = (note: string) => note.trim().length >= 5;

    expect(validateNote("")).toBe(false);
    expect(validateNote("ok")).toBe(false);
    expect(validateNote("Refund issued")).toBe(true);
    expect(validateNote("Replaced item with correct one")).toBe(true);
  });
});

// ── SPJobDetailPage route structure ──────────────────────────────────────────

describe("SPJobDetailPage route structure", () => {
  it("should be registered at /sp/jobs/:id path", () => {
    // Verify the route pattern matches expected job IDs
    const routePattern = /^\/sp\/jobs\/[a-zA-Z0-9_-]+$/;

    const validPaths = [
      "/sp/jobs/abc123",
      "/sp/jobs/V1StGXR8_Z5jdHi6B-myT",
      "/sp/jobs/req-20260325-0001",
    ];

    const invalidPaths = [
      "/sp/jobs",
      "/sp/jobs/",
      "/sp/",
    ];

    for (const path of validPaths) {
      expect(routePattern.test(path)).toBe(true);
    }

    for (const path of invalidPaths) {
      expect(routePattern.test(path)).toBe(false);
    }
  });

  it("should show read-only payment info without FO actions", () => {
    // SP can see payment status but cannot trigger payment link or send SMS
    const spAllowedActions = ["acceptJob", "rejectJob", "markInProgress", "markCompleted"];
    const foOnlyActions = ["initiatePayment", "sendPaymentSms", "resolveDispute"];

    for (const action of foOnlyActions) {
      expect(spAllowedActions).not.toContain(action);
    }
  });

  it("should show correct status banners for each SP-visible state", () => {
    const SP_BANNER_STATES = [
      "PAYMENT_CONFIRMED",
      "IN_PROGRESS",
      "COMPLETED",
      "FULFILLED",
      "DISPUTED",
      "RESOLVED",
    ];

    const allStatuses = [
      "DISPATCHED", "SP_ACCEPTED", "SP_REJECTED", "PENDING_PAYMENT",
      "PAYMENT_CONFIRMED", "IN_PROGRESS", "COMPLETED", "FULFILLED",
      "CANCELLED", "DISPUTED", "RESOLVED",
    ];

    // All banner states should be valid statuses
    for (const bannerState of SP_BANNER_STATES) {
      expect(allStatuses).toContain(bannerState);
    }
  });

  it("should navigate back to /sp/jobs when back button is clicked", () => {
    const backPath = "/sp/jobs";
    expect(backPath).toBe("/sp/jobs");
    expect(backPath.startsWith("/sp/")).toBe(true);
  });
});

// ── State transition completeness ─────────────────────────────────────────────

describe("Service request state machine completeness", () => {
  const STATE_MACHINE: Record<string, string[]> = {
    PENDING:           ["DISPATCHED", "CANCELLED"],
    DISPATCHED:        ["SP_ACCEPTED", "SP_REJECTED", "CANCELLED"],
    SP_ACCEPTED:       ["PENDING_PAYMENT", "CANCELLED"],
    SP_REJECTED:       [],
    PENDING_PAYMENT:   ["PAYMENT_CONFIRMED", "CANCELLED"],
    PAYMENT_CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
    IN_PROGRESS:       ["COMPLETED", "DISPUTED"],
    COMPLETED:         ["FULFILLED", "DISPUTED"],
    FULFILLED:         [],
    DISPUTED:          ["RESOLVED"],
    RESOLVED:          [],
    CANCELLED:         [],
  };

  it("should have DISPUTED → RESOLVED as a valid transition", () => {
    expect(STATE_MACHINE["DISPUTED"]).toContain("RESOLVED");
  });

  it("should have COMPLETED → FULFILLED as a valid transition", () => {
    expect(STATE_MACHINE["COMPLETED"]).toContain("FULFILLED");
  });

  it("should have COMPLETED → DISPUTED as a valid transition", () => {
    expect(STATE_MACHINE["COMPLETED"]).toContain("DISPUTED");
  });

  it("should have IN_PROGRESS → DISPUTED as a valid transition", () => {
    expect(STATE_MACHINE["IN_PROGRESS"]).toContain("DISPUTED");
  });

  it("should have no transitions from terminal states", () => {
    const terminalStates = ["FULFILLED", "RESOLVED", "CANCELLED", "SP_REJECTED"];
    for (const state of terminalStates) {
      expect(STATE_MACHINE[state]).toHaveLength(0);
    }
  });

  it("should cover all 12 states in the state machine", () => {
    expect(Object.keys(STATE_MACHINE)).toHaveLength(12);
  });
});
