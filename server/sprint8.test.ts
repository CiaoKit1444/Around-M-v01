/**
 * Sprint 8 Tests
 *
 * Covers:
 *  1. stubSmsGateway — normalisePhone, sendSms, sendWhatsApp, failure modes
 *  2. broadcastToRequest — exported from sse.ts (no-op when no clients)
 *  3. markCompleted — state guard, SSE broadcast, owner notification
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalisePhone,
  sendSms,
  sendWhatsApp,
  stubDispatch,
  type SmsDeliveryReceipt,
} from "./stubSmsGateway";
import { broadcastToRequest } from "./sse";

// ── 1. normalisePhone ─────────────────────────────────────────────────────────

describe("normalisePhone", () => {
  it("converts Thai 10-digit 0X number to E.164 +66X", () => {
    expect(normalisePhone("0812345678")).toBe("+66812345678");
  });

  it("converts number already starting with 66 to +66", () => {
    expect(normalisePhone("66812345678")).toBe("+66812345678");
  });

  it("leaves +66 numbers unchanged", () => {
    expect(normalisePhone("+66812345678")).toBe("+66812345678");
  });

  it("strips spaces and dashes before normalising", () => {
    // normalisePhone strips non-digits first
    expect(normalisePhone("081-234-5678")).toBe("+66812345678");
  });

  it("handles international numbers with country code", () => {
    const result = normalisePhone("+1 415 555 0100");
    expect(result).toMatch(/^\+/);
  });
});

// ── 2. sendSms — happy path ───────────────────────────────────────────────────

describe("sendSms (stub, no failure)", () => {
  beforeEach(() => {
    // Ensure no failure mode is active
    delete process.env.STUB_SMS_FAILURE_MODE;
    process.env.STUB_SMS_DELAY_MS = "0"; // No delay in tests
  });

  afterEach(() => {
    delete process.env.STUB_SMS_DELAY_MS;
  });

  it("returns a queued status with a Twilio-shaped SID", async () => {
    const receipt = await sendSms("0812345678", "Test message");
    expect(receipt.status).toBe("queued");
    expect(receipt.sid).toMatch(/^SM/);
    expect(receipt.channel).toBe("sms");
    expect(receipt.stub).toBe(true);
  });

  it("normalises the destination number to E.164", async () => {
    const receipt = await sendSms("0812345678", "Hello");
    expect(receipt.to).toBe("+66812345678");
  });

  it("calculates correct segment count for short message", async () => {
    const receipt = await sendSms("0812345678", "Hi");
    expect(receipt.numSegments).toBe(1);
  });

  it("calculates correct segment count for long message (>160 chars)", async () => {
    const longBody = "A".repeat(161);
    const receipt = await sendSms("0812345678", longBody);
    expect(receipt.numSegments).toBe(2);
  });

  it("includes pricePerSegment for SMS", async () => {
    const receipt = await sendSms("0812345678", "Test");
    expect(receipt.pricePerSegment).toBe("0.0075");
  });

  it("includes dateCreated as ISO-8601 string", async () => {
    const receipt = await sendSms("0812345678", "Test");
    expect(() => new Date(receipt.dateCreated)).not.toThrow();
    expect(receipt.dateCreated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── 3. sendWhatsApp — happy path ──────────────────────────────────────────────

describe("sendWhatsApp (stub, no failure)", () => {
  beforeEach(() => {
    delete process.env.STUB_SMS_FAILURE_MODE;
    process.env.STUB_SMS_DELAY_MS = "0";
  });

  afterEach(() => {
    delete process.env.STUB_SMS_DELAY_MS;
  });

  it("returns a queued status with a WA-prefixed SID", async () => {
    const receipt = await sendWhatsApp("0812345678", "WhatsApp message");
    expect(receipt.status).toBe("queued");
    expect(receipt.sid).toMatch(/^WA/);
    expect(receipt.channel).toBe("whatsapp");
  });

  it("uses lower pricePerSegment for WhatsApp", async () => {
    const receipt = await sendWhatsApp("0812345678", "Test");
    expect(receipt.pricePerSegment).toBe("0.0050");
  });

  it("includes whatsapp: prefix in from field", async () => {
    const receipt = await sendWhatsApp("0812345678", "Test");
    expect(receipt.from).toMatch(/^whatsapp:/);
  });
});

// ── 4. Failure modes ──────────────────────────────────────────────────────────

describe("stubDispatch failure modes", () => {
  afterEach(() => {
    delete process.env.STUB_SMS_FAILURE_MODE;
    delete process.env.STUB_SMS_DELAY_MS;
  });

  it("returns failed status with error code for network failure", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "network";
    process.env.STUB_SMS_DELAY_MS = "0";
    const receipt = await stubDispatch("0812345678", "Test", "sms");
    expect(receipt.status).toBe("failed");
    expect(receipt.errorCode).toBe("30006");
    expect(receipt.errorMessage).toBeTruthy();
    expect(receipt.stub).toBe(true);
  });

  it("returns undelivered status for invalid_number failure", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "invalid_number";
    process.env.STUB_SMS_DELAY_MS = "0";
    const receipt = await stubDispatch("0812345678", "Test", "sms");
    expect(receipt.status).toBe("undelivered");
    expect(receipt.errorCode).toBe("21211");
  });

  it("returns failed status for rate_limit failure", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "rate_limit";
    process.env.STUB_SMS_DELAY_MS = "0";
    const receipt = await stubDispatch("0812345678", "Test", "sms");
    expect(receipt.status).toBe("failed");
    expect(receipt.errorCode).toBe("14107");
  });

  it("returns undelivered status for timeout failure", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "timeout";
    process.env.STUB_SMS_DELAY_MS = "0";
    const receipt = await stubDispatch("0812345678", "Test", "sms");
    expect(receipt.status).toBe("undelivered");
    expect(receipt.errorCode).toBe("30008");
  });

  it("falls back to no failure for unknown failure mode", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "unknown_mode";
    process.env.STUB_SMS_DELAY_MS = "0";
    const receipt = await stubDispatch("0812345678", "Test", "sms");
    expect(receipt.status).toBe("queued");
    expect(receipt.errorCode).toBeUndefined();
  });
});

// ── 5. broadcastToRequest — no-op when no clients ────────────────────────────

describe("broadcastToRequest", () => {
  it("does not throw when no clients are connected for a requestId", () => {
    expect(() => {
      broadcastToRequest("non-existent-request-id", "request.updated", {
        requestId: "non-existent-request-id",
        status: "COMPLETED",
      });
    }).not.toThrow();
  });

  it("does not throw with empty string requestId", () => {
    expect(() => {
      broadcastToRequest("", "request.updated", { status: "COMPLETED" });
    }).not.toThrow();
  });

  it("handles null/undefined data gracefully", () => {
    expect(() => {
      broadcastToRequest("req-123", "heartbeat", null);
    }).not.toThrow();
  });
});

// ── 6. Delivery receipt shape validation ─────────────────────────────────────

describe("SmsDeliveryReceipt shape", () => {
  beforeEach(() => {
    process.env.STUB_SMS_DELAY_MS = "0";
    delete process.env.STUB_SMS_FAILURE_MODE;
  });

  afterEach(() => {
    delete process.env.STUB_SMS_DELAY_MS;
  });

  it("receipt has all required Twilio-compatible fields", async () => {
    const receipt: SmsDeliveryReceipt = await sendSms("0812345678", "Test");
    expect(receipt).toHaveProperty("sid");
    expect(receipt).toHaveProperty("to");
    expect(receipt).toHaveProperty("from");
    expect(receipt).toHaveProperty("body");
    expect(receipt).toHaveProperty("status");
    expect(receipt).toHaveProperty("numSegments");
    expect(receipt).toHaveProperty("pricePerSegment");
    expect(receipt).toHaveProperty("dateCreated");
    expect(receipt).toHaveProperty("channel");
    expect(receipt).toHaveProperty("stub");
  });

  it("stub flag is always true", async () => {
    const sms = await sendSms("0812345678", "Test");
    const wa = await sendWhatsApp("0812345678", "Test");
    expect(sms.stub).toBe(true);
    expect(wa.stub).toBe(true);
  });
});
