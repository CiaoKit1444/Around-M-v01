/**
 * stubPaymentGateway.test.ts
 * Unit tests for the stub PromptPay QR payment gateway.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateQR, pollChargeStatus, refundCharge } from "./stubPaymentGateway";

// ── generateQR ────────────────────────────────────────────────────────────────

describe("generateQR", () => {
  it("returns a chargeId with the stub prefix", () => {
    const result = generateQR({ requestId: "req_001", amount: 350 });
    expect(result.chargeId).toMatch(/^ch_stub_/);
  });

  it("returns a base64 SVG data URL for the QR image", () => {
    const result = generateQR({ requestId: "req_001", amount: 350 });
    expect(result.qrDataUrl).toMatch(/^data:image\/svg\+xml;base64,/);
  });

  it("returns a non-empty qrPayload string", () => {
    const result = generateQR({ requestId: "req_001", amount: 350 });
    expect(result.qrPayload.length).toBeGreaterThan(10);
  });

  it("reflects the correct amount and currency", () => {
    const result = generateQR({ requestId: "req_001", amount: 1200.5, currency: "THB" });
    expect(result.amount).toBe(1200.5);
    expect(result.currency).toBe("THB");
  });

  it("defaults currency to THB when not provided", () => {
    const result = generateQR({ requestId: "req_002", amount: 500 });
    expect(result.currency).toBe("THB");
  });

  it("sets expiresAt approximately 15 minutes in the future", () => {
    const before = Date.now();
    const result = generateQR({ requestId: "req_003", amount: 100 });
    const after = Date.now();
    const expMs = result.expiresAt.getTime();
    expect(expMs).toBeGreaterThanOrEqual(before + 14 * 60 * 1000);
    expect(expMs).toBeLessThanOrEqual(after + 16 * 60 * 1000);
  });

  it("generates unique chargeIds for separate calls", () => {
    const a = generateQR({ requestId: "req_a", amount: 100 });
    const b = generateQR({ requestId: "req_b", amount: 200 });
    expect(a.chargeId).not.toBe(b.chargeId);
  });
});

// ── pollChargeStatus ──────────────────────────────────────────────────────────

describe("pollChargeStatus", () => {
  it("returns FAILED for an unknown chargeId", () => {
    const result = pollChargeStatus("ch_nonexistent");
    expect(result.status).toBe("FAILED");
  });

  it("returns PENDING immediately after charge creation", () => {
    const { chargeId } = generateQR({ requestId: "req_poll_1", amount: 200 });
    const result = pollChargeStatus(chargeId);
    expect(result.status).toBe("PENDING");
    expect(result.paidAt).toBeUndefined();
  });

  it("returns PAID after the auto-confirm delay has passed", () => {
    vi.useFakeTimers();
    const { chargeId } = generateQR({ requestId: "req_poll_2", amount: 300 });

    // Advance time by 20 seconds (past the 15-second auto-confirm)
    vi.advanceTimersByTime(20_000);

    const result = pollChargeStatus(chargeId);
    expect(result.status).toBe("PAID");
    expect(result.paidAt).toBeInstanceOf(Date);

    vi.useRealTimers();
  });

  it("returns PAID on subsequent polls once confirmed", () => {
    vi.useFakeTimers();
    const { chargeId } = generateQR({ requestId: "req_poll_3", amount: 400 });

    vi.advanceTimersByTime(20_000);
    pollChargeStatus(chargeId); // first poll → transitions to PAID
    vi.useRealTimers();

    // Second poll — should still be PAID
    const second = pollChargeStatus(chargeId);
    expect(second.status).toBe("PAID");
  });
});

// ── refundCharge ──────────────────────────────────────────────────────────────

describe("refundCharge", () => {
  it("returns false for an unknown chargeId", () => {
    expect(refundCharge("ch_unknown").success).toBe(false);
  });

  it("returns false for a PENDING charge (not yet paid)", () => {
    const { chargeId } = generateQR({ requestId: "req_ref_1", amount: 100 });
    expect(refundCharge(chargeId).success).toBe(false);
  });

  it("returns true for a PAID charge and marks it REFUNDED", () => {
    vi.useFakeTimers();
    const { chargeId } = generateQR({ requestId: "req_ref_2", amount: 500 });

    vi.advanceTimersByTime(20_000);
    pollChargeStatus(chargeId); // → PAID
    vi.useRealTimers();

    const refundResult = refundCharge(chargeId);
    expect(refundResult.success).toBe(true);

    // Subsequent poll should show REFUNDED
    const pollResult = pollChargeStatus(chargeId);
    expect(pollResult.status).toBe("REFUNDED");
  });
});

// ── Payment flow integration ──────────────────────────────────────────────────

describe("Full payment flow", () => {
  it("generates QR → polls PENDING → auto-confirms → refunds", () => {
    vi.useFakeTimers();

    // 1. Generate QR
    const qr = generateQR({ requestId: "req_flow_1", amount: 750 });
    expect(qr.chargeId).toBeTruthy();

    // 2. Poll before timeout → PENDING
    const poll1 = pollChargeStatus(qr.chargeId);
    expect(poll1.status).toBe("PENDING");

    // 3. Advance time → auto-confirm
    vi.advanceTimersByTime(20_000);
    const poll2 = pollChargeStatus(qr.chargeId);
    expect(poll2.status).toBe("PAID");

    vi.useRealTimers();

    // 4. Refund
    const refund = refundCharge(qr.chargeId);
    expect(refund.success).toBe(true);
  });
});
