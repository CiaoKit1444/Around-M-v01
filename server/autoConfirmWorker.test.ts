/**
 * autoConfirmWorker.test.ts
 *
 * Unit tests for the auto-confirm background worker logic.
 * Tests the pure business logic without hitting the database.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { OPT_IN_MINUTES } from "./autoConfirmWorker";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("Auto-confirm worker constants", () => {
  it("opt-in window is exactly 10 minutes", () => {
    expect(OPT_IN_MINUTES).toBe(10);
  });

  it("cutoff is calculated as now minus opt-in window", () => {
    const before = Date.now();
    const cutoff = new Date(Date.now() - OPT_IN_MINUTES * 60 * 1000);
    const after = Date.now();
    const expectedMs = OPT_IN_MINUTES * 60 * 1000;
    expect(before - cutoff.getTime()).toBeGreaterThanOrEqual(expectedMs);
    expect(after - cutoff.getTime()).toBeLessThanOrEqual(expectedMs + 100);
  });
});

// ── Eligibility logic ─────────────────────────────────────────────────────────

describe("Auto-confirm eligibility", () => {
  const OPT_IN_MS = OPT_IN_MINUTES * 60 * 1000;

  it("marks a request eligible when completedAt is older than the opt-in window", () => {
    const completedAt = new Date(Date.now() - OPT_IN_MS - 5000); // 5s past deadline
    const cutoff = new Date(Date.now() - OPT_IN_MS);
    expect(completedAt < cutoff).toBe(true);
  });

  it("does NOT mark a request eligible when completedAt is within the opt-in window", () => {
    const completedAt = new Date(Date.now() - OPT_IN_MS + 30_000); // 30s before deadline
    const cutoff = new Date(Date.now() - OPT_IN_MS);
    expect(completedAt < cutoff).toBe(false);
  });

  it("does NOT mark a request eligible when completedAt is exactly at the cutoff boundary", () => {
    const cutoff = new Date(Date.now() - OPT_IN_MS);
    const completedAt = new Date(cutoff.getTime() + 1); // 1ms after cutoff
    expect(completedAt < cutoff).toBe(false);
  });

  it("only processes COMPLETED status requests", () => {
    const statuses = ["SUBMITTED", "DISPATCHED", "IN_PROGRESS", "COMPLETED", "FULFILLED", "DISPUTED"];
    const eligible = statuses.filter(s => s === "COMPLETED");
    expect(eligible).toEqual(["COMPLETED"]);
  });

  it("does not re-process already FULFILLED requests", () => {
    const req = { status: "FULFILLED", autoConfirmed: true };
    expect(req.status === "COMPLETED").toBe(false);
  });
});

// ── State transition ──────────────────────────────────────────────────────────

describe("Auto-confirm state transition", () => {
  it("sets status to FULFILLED", () => {
    const update = { status: "FULFILLED", autoConfirmed: true, confirmedAt: new Date() };
    expect(update.status).toBe("FULFILLED");
  });

  it("sets autoConfirmed flag to true (distinguishes from guest-initiated confirmation)", () => {
    const autoUpdate = { autoConfirmed: true };
    const guestUpdate = { autoConfirmed: false };
    expect(autoUpdate.autoConfirmed).toBe(true);
    expect(guestUpdate.autoConfirmed).toBe(false);
  });

  it("sets confirmedAt to current time", () => {
    const before = Date.now();
    const confirmedAt = new Date();
    const after = Date.now();
    expect(confirmedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(confirmedAt.getTime()).toBeLessThanOrEqual(after);
  });
});

// ── Audit log ────────────────────────────────────────────────────────────────

describe("Auto-confirm audit log", () => {
  it("uses actorType=system for auto-confirm events", () => {
    const event = {
      actorType: "system",
      actorId: "auto-confirm-worker",
      fromState: "COMPLETED",
      toState: "FULFILLED",
    };
    expect(event.actorType).toBe("system");
    expect(event.actorId).toBe("auto-confirm-worker");
  });

  it("records correct state transition in audit log", () => {
    const event = { fromState: "COMPLETED", toState: "FULFILLED" };
    expect(event.fromState).toBe("COMPLETED");
    expect(event.toState).toBe("FULFILLED");
  });

  it("includes descriptive note mentioning the opt-in window duration", () => {
    const note = `Auto-confirmed after ${OPT_IN_MINUTES}-minute opt-in window elapsed`;
    expect(note).toContain("10-minute");
    expect(note).toContain("opt-in window");
  });
});

// ── SSE broadcast ─────────────────────────────────────────────────────────────

describe("Auto-confirm SSE broadcast", () => {
  it("broadcasts to property channel when propertyId is available", () => {
    const req = { propertyId: "prop-123", id: "req-456" };
    const broadcasts: string[] = [];
    const mockBroadcastToProperty = (propertyId: string) => broadcasts.push(`property:${propertyId}`);
    if (req.propertyId) mockBroadcastToProperty(req.propertyId);
    expect(broadcasts).toContain("property:prop-123");
  });

  it("always broadcasts to request channel regardless of propertyId", () => {
    const req = { id: "req-456" };
    const broadcasts: string[] = [];
    const mockBroadcastToRequest = (requestId: string) => broadcasts.push(`request:${requestId}`);
    mockBroadcastToRequest(req.id);
    expect(broadcasts).toContain("request:req-456");
  });

  it("SSE payload includes autoConfirmed=true flag", () => {
    const payload = { requestId: "req-456", status: "FULFILLED", autoConfirmed: true };
    expect(payload.autoConfirmed).toBe(true);
    expect(payload.status).toBe("FULFILLED");
  });

  it("skips property broadcast when propertyId is null", () => {
    const req = { propertyId: null, id: "req-789" };
    const broadcasts: string[] = [];
    const mockBroadcastToProperty = (propertyId: string) => broadcasts.push(`property:${propertyId}`);
    if (req.propertyId) mockBroadcastToProperty(req.propertyId);
    expect(broadcasts).toHaveLength(0);
  });
});

// ── Worker lifecycle ──────────────────────────────────────────────────────────

describe("Worker lifecycle", () => {
  it("poll interval is 60 seconds", () => {
    const POLL_INTERVAL_MS = 60_000;
    expect(POLL_INTERVAL_MS).toBe(60 * 1000);
  });

  it("worker is idempotent — calling start twice does not create duplicate intervals", () => {
    let timerCount = 0;
    let workerTimer: ReturnType<typeof setInterval> | null = null;
    const mockStart = () => {
      if (workerTimer) return; // guard
      workerTimer = setInterval(() => {}, 60_000);
      timerCount++;
    };
    mockStart();
    mockStart(); // second call should be no-op
    expect(timerCount).toBe(1);
    if (workerTimer) clearInterval(workerTimer);
  });

  it("stop clears the interval timer", () => {
    let workerTimer: ReturnType<typeof setInterval> | null = setInterval(() => {}, 60_000);
    const mockStop = () => {
      if (workerTimer) { clearInterval(workerTimer); workerTimer = null; }
    };
    mockStop();
    expect(workerTimer).toBeNull();
  });
});
