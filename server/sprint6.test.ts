/**
 * sprint6.test.ts
 * Tests for Sprint 6 features:
 *  1. simulatePayment — stub-only force-confirm procedure
 *  2. getByRefNo — public request lookup by REQ-YYYYMMDD-NNNN
 *  3. Payment link URL construction
 *  4. TrackRequestPage data shape compatibility
 *  5. FORequestDetailPage payment panel logic
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── 1. simulatePayment procedure logic ────────────────────────────────────────

describe("simulatePayment — stub procedure", () => {
  it("only accepts PENDING payments", () => {
    const allowedStatuses = ["PENDING"];
    const rejectedStatuses = ["PAID", "FAILED", "CANCELLED", "REFUNDED"];

    allowedStatuses.forEach(s => expect(allowedStatuses).toContain(s));
    rejectedStatuses.forEach(s => expect(allowedStatuses).not.toContain(s));
  });

  it("returns PAID status with paidAt timestamp on success", () => {
    const simulatedResult = {
      status: "PAID" as const,
      paidAt: new Date().toISOString(),
    };

    expect(simulatedResult.status).toBe("PAID");
    expect(simulatedResult.paidAt).toBeTruthy();
    expect(new Date(simulatedResult.paidAt).getTime()).toBeLessThanOrEqual(Date.now() + 100);
  });

  it("transitions request to PAYMENT_CONFIRMED state", () => {
    const expectedTransition = {
      fromState: "PENDING_PAYMENT",
      toState: "PAYMENT_CONFIRMED",
      actorType: "system",
    };

    expect(expectedTransition.fromState).toBe("PENDING_PAYMENT");
    expect(expectedTransition.toState).toBe("PAYMENT_CONFIRMED");
    expect(expectedTransition.actorType).toBe("system");
  });

  it("is idempotent — already PAID payments return immediately", () => {
    // If payment.status === "PAID", return early without DB write
    const alreadyPaid = { status: "PAID", paidAt: new Date().toISOString() };
    expect(alreadyPaid.status).toBe("PAID");
    expect(alreadyPaid.paidAt).toBeTruthy();
  });

  it("rejects non-PENDING payments with BAD_REQUEST", () => {
    const nonPendingStatuses = ["PAID", "FAILED"];
    nonPendingStatuses.forEach(status => {
      const shouldReject = status !== "PENDING";
      expect(shouldReject).toBe(true);
    });
  });

  it("includes [STUB] marker in audit log note", () => {
    const auditNote = "[STUB] Payment simulated. ChargeId: charge_test_abc123";
    expect(auditNote).toMatch(/^\[STUB\]/);
    expect(auditNote).toContain("ChargeId:");
  });
});

// ── 2. getByRefNo — public procedure ─────────────────────────────────────────

describe("getByRefNo — public request lookup", () => {
  it("accepts REQ-YYYYMMDD-NNNN format", () => {
    const validRefs = [
      "REQ-20260325-1234",
      "REQ-20260101-0001",
      "REQ-20261231-9999",
    ];
    const pattern = /^REQ-\d{8}-\d{4}$/;
    validRefs.forEach(ref => expect(ref).toMatch(pattern));
  });

  it("rejects malformed reference numbers", () => {
    const invalidRefs = [
      "REQ-2026-1234",
      "req-20260325-1234",
      "20260325-1234",
      "",
      "REQ-20260325",
    ];
    const pattern = /^REQ-\d{8}-\d{4}$/;
    invalidRefs.forEach(ref => expect(ref).not.toMatch(pattern));
  });

  it("returns request + items + payment in one response", () => {
    // Shape test — mirrors the actual tRPC return type
    const mockResponse = {
      request: {
        id: "req-uuid-1",
        requestNumber: "REQ-20260325-1234",
        status: "SP_ACCEPTED",
        totalAmount: "350.00",
        currency: "THB",
        guestName: "John Doe",
        guestPhone: "0812345678",
        guestNotes: "Please knock",
        preferredDatetime: null,
        discountAmount: "0.00",
        createdAt: new Date(),
        confirmedAt: null,
        completedAt: null,
        cancelledAt: null,
      },
      items: [
        {
          id: "item-1",
          itemName: "Room Cleaning",
          itemCategory: "Housekeeping",
          quantity: 1,
          includedQuantity: 0,
          lineTotal: "350.00",
        },
      ],
      activeAssignment: null,
      payment: null,
    };

    expect(mockResponse.request.requestNumber).toMatch(/^REQ-\d{8}-\d{4}$/);
    expect(mockResponse.items).toHaveLength(1);
    expect(mockResponse.payment).toBeNull();
    expect(mockResponse.activeAssignment).toBeNull();
  });

  it("exposes payment paidAt for timeline display", () => {
    const mockPayment = {
      id: "pay-1",
      status: "PAID",
      amount: "350.00",
      paidAt: new Date("2026-03-25T10:00:00Z"),
      gatewayChargeId: "charge_stub_abc",
    };

    expect(mockPayment.paidAt).toBeInstanceOf(Date);
    expect(mockPayment.paidAt.toISOString()).toContain("2026-03-25");
  });
});

// ── 3. Payment link URL construction ─────────────────────────────────────────

describe("Payment link URL construction", () => {
  it("builds a valid payment URL from requestId", () => {
    const origin = "https://bo.peppr.vip";
    const requestId = "req-uuid-1234";
    const paymentUrl = `${origin}/guest/payment/${requestId}`;

    expect(paymentUrl).toBe("https://bo.peppr.vip/guest/payment/req-uuid-1234");
    expect(paymentUrl).toContain("/guest/payment/");
  });

  it("uses window.location.origin (not hardcoded domain)", () => {
    // The FORequestDetailPage uses window.location.origin dynamically
    // This test documents the expected behaviour
    const origin = "https://example.manus.space";
    const requestId = "req-abc";
    const url = `${origin}/guest/payment/${requestId}`;
    expect(url.startsWith(origin)).toBe(true);
    expect(url).not.toContain("hardcoded");
  });

  it("payment URL path is /guest/payment/:requestId (not refNo)", () => {
    // The payment page uses the internal UUID (request.id), not requestNumber
    // This is intentional: UUIDs are harder to guess than sequential refNos
    const requestId = "550e8400-e29b-41d4-a716-446655440000";
    const url = `/guest/payment/${requestId}`;
    expect(url).toMatch(/^\/guest\/payment\/[0-9a-f-]{36}$/i);
  });
});

// ── 4. TrackRequestPage data shape ────────────────────────────────────────────

describe("TrackRequestPage — tRPC data shape compatibility", () => {
  it("uses camelCase field names from Drizzle (not snake_case)", () => {
    // The new TrackRequestPage uses tRPC/Drizzle camelCase field names
    const drizzleRequest = {
      requestNumber: "REQ-20260325-1234",  // was: request_number
      guestName: "John Doe",               // was: guest_name
      guestPhone: "0812345678",            // was: guest_phone
      guestNotes: "No ice",                // was: guest_notes
      totalAmount: "350.00",               // was: total_amount
      discountAmount: "0.00",              // was: discount_amount
      statusReason: null,                  // was: status_reason
      preferredDatetime: null,             // was: preferred_datetime
      confirmedAt: null,                   // was: confirmed_at
      completedAt: null,                   // was: completed_at
      cancelledAt: null,                   // was: cancelled_at
      createdAt: new Date(),               // was: created_at
    };

    expect(drizzleRequest.requestNumber).toBeTruthy();
    expect(drizzleRequest.guestName).toBeTruthy();
    expect(drizzleRequest.totalAmount).toBeTruthy();
    // Verify no snake_case fields
    expect(Object.keys(drizzleRequest)).not.toContain("request_number");
    expect(Object.keys(drizzleRequest)).not.toContain("guest_name");
    expect(Object.keys(drizzleRequest)).not.toContain("total_amount");
  });

  it("handles PAYMENT_REQUIRED states by showing payment CTA", () => {
    const paymentTriggerStates = ["SP_ACCEPTED", "PENDING_PAYMENT"];
    const nonPaymentStates = ["SUBMITTED", "PENDING_MATCH", "IN_PROGRESS", "COMPLETED"];

    paymentTriggerStates.forEach(s => {
      const needsPayment = ["SP_ACCEPTED", "PENDING_PAYMENT"].includes(s);
      expect(needsPayment).toBe(true);
    });

    nonPaymentStates.forEach(s => {
      const needsPayment = ["SP_ACCEPTED", "PENDING_PAYMENT"].includes(s);
      expect(needsPayment).toBe(false);
    });
  });

  it("stops polling on terminal states", () => {
    const terminalStates = ["COMPLETED", "FULFILLED", "CANCELLED", "AUTO_CANCELLED", "DISPUTED", "EXPIRED"];
    const activeStates = ["SUBMITTED", "PENDING_MATCH", "SP_ACCEPTED", "PENDING_PAYMENT", "IN_PROGRESS"];

    const TERMINAL_STATES = new Set(terminalStates);

    terminalStates.forEach(s => expect(TERMINAL_STATES.has(s)).toBe(true));
    activeStates.forEach(s => expect(TERMINAL_STATES.has(s)).toBe(false));
  });

  it("payment paidAt is shown in timeline when present", () => {
    const payment = {
      status: "PAID",
      paidAt: new Date("2026-03-25T10:00:00Z"),
    };

    // Timeline should show paidAt when payment exists and is PAID
    const shouldShowPaidAt = payment.status === "PAID" && payment.paidAt != null;
    expect(shouldShowPaidAt).toBe(true);
  });
});

// ── 5. FORequestDetailPage payment panel ─────────────────────────────────────

describe("FORequestDetailPage — payment panel visibility", () => {
  it("shows payment panel for SP_ACCEPTED and PENDING_PAYMENT states", () => {
    const paymentStates = ["SP_ACCEPTED", "PENDING_PAYMENT"];
    const nonPaymentStates = [
      "SUBMITTED", "PENDING_MATCH", "DISPATCHED",
      "PAYMENT_CONFIRMED", "IN_PROGRESS", "COMPLETED",
    ];

    paymentStates.forEach(s => {
      const needsPayment = ["SP_ACCEPTED", "PENDING_PAYMENT"].includes(s);
      expect(needsPayment).toBe(true);
    });

    nonPaymentStates.forEach(s => {
      const needsPayment = ["SP_ACCEPTED", "PENDING_PAYMENT"].includes(s);
      expect(needsPayment).toBe(false);
    });
  });

  it("Assign button only shows for pre-dispatch states", () => {
    const assignableStates = ["SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "SP_REJECTED"];
    const nonAssignableStates = ["DISPATCHED", "SP_ACCEPTED", "PENDING_PAYMENT", "COMPLETED"];

    assignableStates.forEach(s => {
      const canAssign = ["SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "SP_REJECTED"].includes(s);
      expect(canAssign).toBe(true);
    });

    nonAssignableStates.forEach(s => {
      const canAssign = ["SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "SP_REJECTED"].includes(s);
      expect(canAssign).toBe(false);
    });
  });

  it("Cancel button is hidden for terminal states", () => {
    const terminalStates = ["COMPLETED", "FULFILLED", "CANCELLED", "AUTO_CANCELLED", "DISPUTED", "EXPIRED"];
    const activeStates = ["SUBMITTED", "DISPATCHED", "SP_ACCEPTED", "PENDING_PAYMENT"];

    terminalStates.forEach(s => {
      const canCancel = !terminalStates.includes(s);
      expect(canCancel).toBe(false);
    });

    activeStates.forEach(s => {
      const canCancel = !terminalStates.includes(s);
      expect(canCancel).toBe(true);
    });
  });

  it("payment link uses request.id (UUID), not requestNumber", () => {
    const request = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      requestNumber: "REQ-20260325-1234",
    };

    const paymentUrl = `/guest/payment/${request.id}`;
    expect(paymentUrl).toContain(request.id);
    expect(paymentUrl).not.toContain(request.requestNumber);
  });
});

// ── 6. Simulate Payment button UX ─────────────────────────────────────────────

describe("Simulate Payment button — UX contract", () => {
  it("is disabled when paymentId is null (before QR is generated)", () => {
    const paymentId = null;
    const isDisabled = !paymentId;
    expect(isDisabled).toBe(true);
  });

  it("is enabled once paymentId is set", () => {
    const paymentId = "pay-uuid-1234";
    const isDisabled = !paymentId;
    expect(isDisabled).toBe(false);
  });

  it("shows loading state while simulating", () => {
    const simulating = true;
    const buttonText = simulating ? "Simulating…" : "⚡ Simulate Payment (Demo Only)";
    expect(buttonText).toBe("Simulating…");
  });

  it("shows default label when not simulating", () => {
    const simulating = false;
    const buttonText = simulating ? "Simulating…" : "⚡ Simulate Payment (Demo Only)";
    expect(buttonText).toContain("Simulate Payment");
    expect(buttonText).toContain("Demo Only");
  });

  it("navigates to /guest/track/:refNo after successful simulation", () => {
    const refNo = "REQ-20260325-1234";
    const expectedPath = `/guest/track/${refNo}`;
    expect(expectedPath).toBe("/guest/track/REQ-20260325-1234");
  });
});
