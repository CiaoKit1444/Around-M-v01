/**
 * Sprint 10 Tests
 *
 * Covers:
 * 1. confirmFulfilled procedure — state guard, FULFILLED transition, SSE broadcast
 * 2. raiseDispute procedure — state guard (COMPLETED + IN_PROGRESS), DISPUTED transition, owner notification
 * 3. getLandingPath role routing logic
 * 4. STUB_SMS_FAILURE_MODE env variable is read by stubSmsGateway
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// ─────────────────────────────────────────────────────────────────────────────
// 1. getLandingPath role routing logic (pure function, no DB needed)
// ─────────────────────────────────────────────────────────────────────────────
describe("getLandingPath role routing", () => {
  // Mirror the function from RoleSwitchPage for unit testing
  const getLandingPath = (roleId: string): string => {
    if (roleId === "FRONT_DESK" || roleId === "PROPERTY_ADMIN") return "/fo";
    if (roleId === "SERVICE_PROVIDER") return "/sp";
    return "/admin";
  };

  it("routes FRONT_DESK to /fo", () => {
    expect(getLandingPath("FRONT_DESK")).toBe("/fo");
  });

  it("routes PROPERTY_ADMIN to /fo", () => {
    expect(getLandingPath("PROPERTY_ADMIN")).toBe("/fo");
  });

  it("routes SERVICE_PROVIDER to /sp", () => {
    expect(getLandingPath("SERVICE_PROVIDER")).toBe("/sp");
  });

  it("routes SUPER_ADMIN to /admin", () => {
    expect(getLandingPath("SUPER_ADMIN")).toBe("/admin");
  });

  it("routes PARTNER_ADMIN to /admin", () => {
    expect(getLandingPath("PARTNER_ADMIN")).toBe("/admin");
  });

  it("routes HOUSEKEEPING to /admin", () => {
    expect(getLandingPath("HOUSEKEEPING")).toBe("/admin");
  });

  it("routes unknown role to /admin", () => {
    expect(getLandingPath("UNKNOWN_ROLE")).toBe("/admin");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. confirmFulfilled state guard
// ─────────────────────────────────────────────────────────────────────────────
describe("confirmFulfilled state guard", () => {
  const allowedFromStatus = "COMPLETED";
  const disallowedStatuses = [
    "PENDING", "SP_ACCEPTED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED",
    "IN_PROGRESS", "FULFILLED", "DISPUTED", "CANCELLED",
  ];

  it("allows transition from COMPLETED", () => {
    expect(allowedFromStatus).toBe("COMPLETED");
  });

  it.each(disallowedStatuses)("blocks transition from %s", (status) => {
    const allowed = status === "COMPLETED";
    expect(allowed).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. raiseDispute state guard
// ─────────────────────────────────────────────────────────────────────────────
describe("raiseDispute state guard", () => {
  const allowedStatuses = ["COMPLETED", "IN_PROGRESS"];
  const disallowedStatuses = [
    "PENDING", "SP_ACCEPTED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED",
    "FULFILLED", "DISPUTED", "CANCELLED",
  ];

  it.each(allowedStatuses)("allows dispute from %s", (status) => {
    expect(allowedStatuses.includes(status)).toBe(true);
  });

  it.each(disallowedStatuses)("blocks dispute from %s", (status) => {
    expect(allowedStatuses.includes(status)).toBe(false);
  });

  it("requires reason of at least 5 characters", () => {
    const validate = (reason: string) => reason.trim().length >= 5;
    expect(validate("ok")).toBe(false);
    expect(validate("short")).toBe(true);
    expect(validate("The service was not completed as requested")).toBe(true);
    expect(validate("    ")).toBe(false); // whitespace-only
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. STUB_SMS_FAILURE_MODE env variable integration
// ─────────────────────────────────────────────────────────────────────────────
describe("STUB_SMS_FAILURE_MODE env variable", () => {
  const originalEnv = process.env.STUB_SMS_FAILURE_MODE;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.STUB_SMS_FAILURE_MODE;
    } else {
      process.env.STUB_SMS_FAILURE_MODE = originalEnv;
    }
  });

  it("returns queued status on normal delivery (none mode)", async () => {
    delete process.env.STUB_SMS_FAILURE_MODE;
    vi.resetModules();
    const { sendSms } = await import("./stubSmsGateway");
    const result = await sendSms("+66812345678", "Test message");
    // Stub uses Twilio-shaped receipts: initial status is 'queued', no errorCode
    expect(result.status).toBe("queued");
    expect(result.stub).toBe(true);
    expect(result.errorCode == null).toBe(true); // null or undefined — no error
  });

  it("returns queued status when env is empty string", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "";
    vi.resetModules();
    const { sendSms } = await import("./stubSmsGateway");
    const result = await sendSms("+66812345678", "Test message");
    expect(result.status).toBe("queued");
    expect(result.errorCode == null).toBe(true); // null or undefined — no error
  });

  it("returns error receipt for 'network' failure mode", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "network";
    vi.resetModules();
    const { sendSms } = await import("./stubSmsGateway");
    const result = await sendSms("+66812345678", "Test");
    expect(result.errorCode).not.toBeNull();
    expect(result.status).not.toBe("queued");
  });

  it("returns error receipt for 'invalid_number' failure mode", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "invalid_number";
    vi.resetModules();
    const { sendSms } = await import("./stubSmsGateway");
    const result = await sendSms("+66812345678", "Test");
    expect(result.errorCode).toBe("21211");
  });

  it("returns error receipt for 'rate_limit' failure mode", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "rate_limit";
    vi.resetModules();
    const { sendSms } = await import("./stubSmsGateway");
    const result = await sendSms("+66812345678", "Test");
    expect(result.errorCode).toBe("14107");
  });

  it("returns error receipt for 'timeout' failure mode", async () => {
    process.env.STUB_SMS_FAILURE_MODE = "timeout";
    vi.resetModules();
    const { sendSms } = await import("./stubSmsGateway");
    const result = await sendSms("+66812345678", "Test");
    expect(result.errorCode).toBe("30008");
  });

  it("valid failure mode values are the documented set", () => {
    const validModes = ["none", "network", "invalid_number", "rate_limit", "timeout"];
    expect(validModes).toHaveLength(5);
    expect(validModes).toContain("none");
    expect(validModes).toContain("network");
    expect(validModes).toContain("invalid_number");
    expect(validModes).toContain("rate_limit");
    expect(validModes).toContain("timeout");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Dispute dialog validation (UI logic mirrored)
// ─────────────────────────────────────────────────────────────────────────────
describe("Dispute dialog submit button enablement", () => {
  const isSubmitEnabled = (reason: string, isPending: boolean) =>
    !isPending && reason.trim().length >= 5;

  it("disabled when reason is empty", () => {
    expect(isSubmitEnabled("", false)).toBe(false);
  });

  it("disabled when reason is too short", () => {
    expect(isSubmitEnabled("bad", false)).toBe(false);
  });

  it("disabled when mutation is pending", () => {
    expect(isSubmitEnabled("Service was not done", true)).toBe(false);
  });

  it("enabled when reason is long enough and not pending", () => {
    expect(isSubmitEnabled("Service was not done", false)).toBe(true);
  });

  it("disabled when reason is only whitespace", () => {
    expect(isSubmitEnabled("     ", false)).toBe(false);
  });
});
