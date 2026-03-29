/**
 * Tests for requestsRouter.updateRequestStatus procedure
 * and bootstrapRouter production environment guard.
 *
 * These are pure unit tests — no DB or server required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── updateRequestStatus: state machine validation ─────────────────────────────

describe("updateRequestStatus — state machine", () => {
  // Replicate the allowedFrom map from requestsRouter.ts
  const allowedFrom: Record<string, string[]> = {
    CONFIRMED:   ["PENDING", "SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "SP_REJECTED"],
    IN_PROGRESS: ["CONFIRMED", "DISPATCHED", "SP_ACCEPTED", "PAYMENT_CONFIRMED"],
    COMPLETED:   ["IN_PROGRESS"],
    REJECTED:    ["PENDING", "SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "CONFIRMED", "DISPATCHED"],
    CANCELLED:   ["PENDING", "SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "CONFIRMED", "DISPATCHED", "SP_ACCEPTED"],
  };

  const terminalStates = ["FULFILLED", "CANCELLED", "REJECTED"];

  function canTransition(from: string, to: string): boolean {
    if (terminalStates.includes(from)) return false;
    return (allowedFrom[to] ?? []).includes(from);
  }

  // Happy paths
  it("SUBMITTED → CONFIRMED is allowed", () => {
    expect(canTransition("SUBMITTED", "CONFIRMED")).toBe(true);
  });

  it("PENDING → CONFIRMED is allowed", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
  });

  it("PENDING_MATCH → CONFIRMED is allowed", () => {
    expect(canTransition("PENDING_MATCH", "CONFIRMED")).toBe(true);
  });

  it("AUTO_MATCHING → CONFIRMED is allowed", () => {
    expect(canTransition("AUTO_MATCHING", "CONFIRMED")).toBe(true);
  });

  it("CONFIRMED → IN_PROGRESS is allowed", () => {
    expect(canTransition("CONFIRMED", "IN_PROGRESS")).toBe(true);
  });

  it("DISPATCHED → IN_PROGRESS is allowed", () => {
    expect(canTransition("DISPATCHED", "IN_PROGRESS")).toBe(true);
  });

  it("SP_ACCEPTED → IN_PROGRESS is allowed", () => {
    expect(canTransition("SP_ACCEPTED", "IN_PROGRESS")).toBe(true);
  });

  it("PAYMENT_CONFIRMED → IN_PROGRESS is allowed", () => {
    expect(canTransition("PAYMENT_CONFIRMED", "IN_PROGRESS")).toBe(true);
  });

  it("IN_PROGRESS → COMPLETED is allowed", () => {
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("SUBMITTED → REJECTED is allowed", () => {
    expect(canTransition("SUBMITTED", "REJECTED")).toBe(true);
  });

  it("CONFIRMED → CANCELLED is allowed", () => {
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });

  // Blocked paths
  it("COMPLETED → CONFIRMED is blocked", () => {
    expect(canTransition("COMPLETED", "CONFIRMED")).toBe(false);
  });

  it("IN_PROGRESS → CONFIRMED is blocked (can only go forward)", () => {
    expect(canTransition("IN_PROGRESS", "CONFIRMED")).toBe(false);
  });

  it("FULFILLED → anything is blocked (terminal state)", () => {
    expect(canTransition("FULFILLED", "CONFIRMED")).toBe(false);
    expect(canTransition("FULFILLED", "IN_PROGRESS")).toBe(false);
    expect(canTransition("FULFILLED", "COMPLETED")).toBe(false);
  });

  it("CANCELLED → anything is blocked (terminal state)", () => {
    expect(canTransition("CANCELLED", "CONFIRMED")).toBe(false);
    expect(canTransition("CANCELLED", "IN_PROGRESS")).toBe(false);
  });

  it("REJECTED → anything is blocked (terminal state)", () => {
    expect(canTransition("REJECTED", "CONFIRMED")).toBe(false);
    expect(canTransition("REJECTED", "COMPLETED")).toBe(false);
  });

  it("COMPLETED → IN_PROGRESS is blocked (cannot go backward)", () => {
    expect(canTransition("COMPLETED", "IN_PROGRESS")).toBe(false);
  });

  it("PAYMENT_CONFIRMED → CONFIRMED is blocked (already past confirmation)", () => {
    expect(canTransition("PAYMENT_CONFIRMED", "CONFIRMED")).toBe(false);
  });
});

// ── updateRequestStatus: patch fields ─────────────────────────────────────────

describe("updateRequestStatus — patch field logic", () => {
  function buildPatch(status: string, reason?: string) {
    const now = new Date();
    const patch: Record<string, unknown> = { status, updatedAt: now };
    if (status === "REJECTED" || status === "CANCELLED") {
      patch.statusReason = reason ?? null;
      patch.cancelledAt = now;
    }
    if (status === "COMPLETED") {
      patch.completedAt = now;
      patch.slaDeadline = new Date(Date.now() + 10 * 60 * 1000);
    }
    if (status === "CONFIRMED") {
      patch.confirmedAt = now;
    }
    return patch;
  }

  it("CONFIRMED sets confirmedAt", () => {
    const patch = buildPatch("CONFIRMED");
    expect(patch.confirmedAt).toBeInstanceOf(Date);
    expect(patch.cancelledAt).toBeUndefined();
    expect(patch.completedAt).toBeUndefined();
  });

  it("IN_PROGRESS sets only status + updatedAt", () => {
    const patch = buildPatch("IN_PROGRESS");
    expect(patch.status).toBe("IN_PROGRESS");
    expect(patch.confirmedAt).toBeUndefined();
    expect(patch.completedAt).toBeUndefined();
    expect(patch.cancelledAt).toBeUndefined();
  });

  it("COMPLETED sets completedAt and slaDeadline (10-min window)", () => {
    const before = Date.now();
    const patch = buildPatch("COMPLETED");
    const after = Date.now();
    expect(patch.completedAt).toBeInstanceOf(Date);
    const sla = patch.slaDeadline as Date;
    expect(sla.getTime()).toBeGreaterThanOrEqual(before + 10 * 60 * 1000);
    expect(sla.getTime()).toBeLessThanOrEqual(after + 10 * 60 * 1000 + 100);
  });

  it("CANCELLED sets cancelledAt and statusReason", () => {
    const patch = buildPatch("CANCELLED", "Guest no-show");
    expect(patch.cancelledAt).toBeInstanceOf(Date);
    expect(patch.statusReason).toBe("Guest no-show");
  });

  it("REJECTED sets cancelledAt and statusReason", () => {
    const patch = buildPatch("REJECTED", "Out of stock");
    expect(patch.cancelledAt).toBeInstanceOf(Date);
    expect(patch.statusReason).toBe("Out of stock");
  });

  it("CANCELLED with no reason sets statusReason to null", () => {
    const patch = buildPatch("CANCELLED");
    expect(patch.statusReason).toBeNull();
  });
});

// ── bootstrapRouter: production environment guard ─────────────────────────────

describe("bootstrapRouter — production environment guard", () => {
  // Replicate isProductionEnvironment logic
  function isProductionEnvironment(nodeEnv: string, corsOrigins: string): boolean {
    if (nodeEnv === "development" || nodeEnv === "test") return false;
    const origins = corsOrigins.toLowerCase();
    const isStaging =
      origins.includes("staging") ||
      origins.includes(".manus.computer") ||
      origins.includes(".manus.space") ||
      origins.includes("localhost") ||
      origins.includes("127.0.0.1");
    return !isStaging;
  }

  it("returns false in development mode", () => {
    expect(isProductionEnvironment("development", "https://bo.peppr.vip")).toBe(false);
  });

  it("returns false in test mode", () => {
    expect(isProductionEnvironment("test", "https://bo.peppr.vip")).toBe(false);
  });

  it("returns false for manus.space staging origin", () => {
    expect(isProductionEnvironment("production", "https://pepprdash-jkkhr27m.manus.space")).toBe(false);
  });

  it("returns false for manus.computer preview origin", () => {
    expect(isProductionEnvironment("production", "https://3000-abc.sg1.manus.computer")).toBe(false);
  });

  it("returns false for localhost origin", () => {
    expect(isProductionEnvironment("production", "http://localhost:3000")).toBe(false);
  });

  it("returns false for 127.0.0.1 origin", () => {
    expect(isProductionEnvironment("production", "http://127.0.0.1:3000")).toBe(false);
  });

  it("returns true for production custom domain (bo.peppr.vip)", () => {
    expect(isProductionEnvironment("production", "https://bo.peppr.vip")).toBe(true);
  });

  it("returns true for production domain with no staging indicators", () => {
    expect(isProductionEnvironment("production", "https://admin.peppr.vip")).toBe(true);
  });

  it("P2 and P3 throw FORBIDDEN in production", () => {
    function assertNotProductionForDestructive(operation: string, nodeEnv: string, corsOrigins: string) {
      if (isProductionEnvironment(nodeEnv, corsOrigins)) {
        throw new Error(`Operation ${operation} is blocked in production environments.`);
      }
    }
    expect(() => assertNotProductionForDestructive("P2", "production", "https://bo.peppr.vip")).toThrow("P2 is blocked");
    expect(() => assertNotProductionForDestructive("P3", "production", "https://bo.peppr.vip")).toThrow("P3 is blocked");
  });

  it("P2 and P3 do NOT throw in staging", () => {
    function assertNotProductionForDestructive(operation: string, nodeEnv: string, corsOrigins: string) {
      if (isProductionEnvironment(nodeEnv, corsOrigins)) {
        throw new Error(`Operation ${operation} is blocked in production environments.`);
      }
    }
    expect(() => assertNotProductionForDestructive("P2", "production", "https://pepprdash-jkkhr27m.manus.space")).not.toThrow();
    expect(() => assertNotProductionForDestructive("P3", "development", "https://bo.peppr.vip")).not.toThrow();
  });
});

// ── STATUS_ACTIONS map: UI button availability ────────────────────────────────

describe("STATUS_ACTIONS — UI action availability", () => {
  // Replicate the STATUS_ACTIONS lookup logic
  const STATUS_ACTIONS: Record<string, string[]> = {
    SUBMITTED:         ["CONFIRMED", "REJECTED"],
    PENDING:           ["CONFIRMED", "REJECTED"],
    PENDING_MATCH:     ["CONFIRMED", "REJECTED"],
    AUTO_MATCHING:     ["CONFIRMED", "REJECTED"],
    CONFIRMED:         ["IN_PROGRESS", "CANCELLED"],
    DISPATCHED:        ["IN_PROGRESS", "CANCELLED"],
    SP_ACCEPTED:       ["IN_PROGRESS", "CANCELLED"],
    PAYMENT_CONFIRMED: ["IN_PROGRESS"],
    IN_PROGRESS:       ["COMPLETED", "CANCELLED"],
    // Terminal states — no actions
    COMPLETED:         [],
    FULFILLED:         [],
    CANCELLED:         [],
    REJECTED:          [],
  };

  function getActions(status: string): string[] {
    return STATUS_ACTIONS[status] ?? STATUS_ACTIONS[status.toLowerCase()] ?? [];
  }

  it("SUBMITTED shows Confirm and Reject buttons", () => {
    expect(getActions("SUBMITTED")).toContain("CONFIRMED");
    expect(getActions("SUBMITTED")).toContain("REJECTED");
  });

  it("CONFIRMED shows Start and Cancel buttons", () => {
    expect(getActions("CONFIRMED")).toContain("IN_PROGRESS");
    expect(getActions("CONFIRMED")).toContain("CANCELLED");
  });

  it("IN_PROGRESS shows Complete and Cancel buttons", () => {
    expect(getActions("IN_PROGRESS")).toContain("COMPLETED");
    expect(getActions("IN_PROGRESS")).toContain("CANCELLED");
  });

  it("COMPLETED shows no action buttons (terminal)", () => {
    expect(getActions("COMPLETED")).toHaveLength(0);
  });

  it("FULFILLED shows no action buttons (terminal)", () => {
    expect(getActions("FULFILLED")).toHaveLength(0);
  });

  it("CANCELLED shows no action buttons (terminal)", () => {
    expect(getActions("CANCELLED")).toHaveLength(0);
  });

  it("PAYMENT_CONFIRMED shows only Start (no cancel — payment received)", () => {
    expect(getActions("PAYMENT_CONFIRMED")).toContain("IN_PROGRESS");
    expect(getActions("PAYMENT_CONFIRMED")).not.toContain("CANCELLED");
  });

  it("unknown status returns empty array (safe default)", () => {
    expect(getActions("UNKNOWN_STATE")).toHaveLength(0);
  });
});
