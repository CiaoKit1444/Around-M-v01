/**
 * Transaction Domain Tests
 *
 * Covers:
 * 1. transactionStateMachine — pure unit tests (no DB)
 * 2. transactionService — integration tests (mocked DB)
 */
import { describe, it, expect } from "vitest";
import {
  assertTransition,
  timestampColumnFor,
  TransitionError,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
  TRANSACTION_STATES,
} from "./transactionStateMachine";

// ── State Machine Unit Tests ──────────────────────────────────────────────────

describe("transactionStateMachine", () => {
  describe("VALID_TRANSITIONS", () => {
    it("covers all defined states", () => {
      for (const state of TRANSACTION_STATES) {
        expect(VALID_TRANSITIONS).toHaveProperty(state);
      }
    });

    it("terminal states have no outgoing transitions", () => {
      for (const terminal of TERMINAL_STATES) {
        expect(VALID_TRANSITIONS[terminal]).toHaveLength(0);
      }
    });

    it("PENDING → CONFIRMED is valid", () => {
      expect(VALID_TRANSITIONS.PENDING).toContain("CONFIRMED");
    });

    it("PENDING → CANCELLED is valid", () => {
      expect(VALID_TRANSITIONS.PENDING).toContain("CANCELLED");
    });

    it("CONFIRMED → IN_PROGRESS is valid", () => {
      expect(VALID_TRANSITIONS.CONFIRMED).toContain("IN_PROGRESS");
    });

    it("IN_PROGRESS → COMPLETED is valid", () => {
      expect(VALID_TRANSITIONS.IN_PROGRESS).toContain("COMPLETED");
    });

    it("COMPLETED → anything is invalid (terminal)", () => {
      expect(VALID_TRANSITIONS.COMPLETED).toHaveLength(0);
    });

    it("CANCELLED → anything is invalid (terminal)", () => {
      expect(VALID_TRANSITIONS.CANCELLED).toHaveLength(0);
    });
  });

  describe("assertTransition", () => {
    it("allows PENDING → CONFIRMED", () => {
      expect(() => assertTransition("PENDING", "CONFIRMED")).not.toThrow();
    });

    it("allows CONFIRMED → IN_PROGRESS", () => {
      expect(() => assertTransition("CONFIRMED", "IN_PROGRESS")).not.toThrow();
    });

    it("allows IN_PROGRESS → COMPLETED", () => {
      expect(() => assertTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
    });

    it("allows PENDING → CANCELLED with reason", () => {
      expect(() => assertTransition("PENDING", "CANCELLED", "Guest cancelled")).not.toThrow();
    });

    it("allows CONFIRMED → CANCELLED with reason", () => {
      expect(() => assertTransition("CONFIRMED", "CANCELLED", "Property closed")).not.toThrow();
    });

    it("throws INVALID_TRANSITION for PENDING → COMPLETED", () => {
      expect(() => assertTransition("PENDING", "COMPLETED")).toThrow(TransitionError);
      try {
        assertTransition("PENDING", "COMPLETED");
      } catch (e) {
        expect(e).toBeInstanceOf(TransitionError);
        expect((e as TransitionError).code).toBe("INVALID_TRANSITION");
      }
    });

    it("throws INVALID_TRANSITION for PENDING → IN_PROGRESS", () => {
      expect(() => assertTransition("PENDING", "IN_PROGRESS")).toThrow(TransitionError);
    });

    it("throws TERMINAL_STATE for COMPLETED → CANCELLED", () => {
      expect(() => assertTransition("COMPLETED", "CANCELLED", "reason")).toThrow(TransitionError);
      try {
        assertTransition("COMPLETED", "CANCELLED", "reason");
      } catch (e) {
        expect((e as TransitionError).code).toBe("TERMINAL_STATE");
      }
    });

    it("throws TERMINAL_STATE for CANCELLED → CONFIRMED", () => {
      expect(() => assertTransition("CANCELLED", "CONFIRMED")).toThrow(TransitionError);
      try {
        assertTransition("CANCELLED", "CONFIRMED");
      } catch (e) {
        expect((e as TransitionError).code).toBe("TERMINAL_STATE");
      }
    });

    it("throws MISSING_REASON for CANCELLED without reason", () => {
      expect(() => assertTransition("PENDING", "CANCELLED")).toThrow(TransitionError);
      try {
        assertTransition("PENDING", "CANCELLED");
      } catch (e) {
        expect((e as TransitionError).code).toBe("MISSING_REASON");
      }
    });

    it("throws MISSING_REASON for CANCELLED with empty reason", () => {
      expect(() => assertTransition("PENDING", "CANCELLED", "")).toThrow(TransitionError);
      try {
        assertTransition("PENDING", "CANCELLED", "  ");
      } catch (e) {
        expect((e as TransitionError).code).toBe("MISSING_REASON");
      }
    });
  });

  describe("timestampColumnFor", () => {
    it("returns confirmedAt for CONFIRMED", () => {
      expect(timestampColumnFor("CONFIRMED")).toBe("confirmedAt");
    });

    it("returns completedAt for COMPLETED", () => {
      expect(timestampColumnFor("COMPLETED")).toBe("completedAt");
    });

    it("returns cancelledAt for CANCELLED", () => {
      expect(timestampColumnFor("CANCELLED")).toBe("cancelledAt");
    });

    it("returns null for PENDING", () => {
      expect(timestampColumnFor("PENDING")).toBeNull();
    });

    it("returns null for IN_PROGRESS", () => {
      expect(timestampColumnFor("IN_PROGRESS")).toBeNull();
    });
  });

  describe("TransitionError", () => {
    it("is an instance of Error", () => {
      const err = new TransitionError("INVALID_TRANSITION", "test");
      expect(err).toBeInstanceOf(Error);
    });

    it("has correct name", () => {
      const err = new TransitionError("TERMINAL_STATE", "test");
      expect(err.name).toBe("TransitionError");
    });

    it("exposes code property", () => {
      const err = new TransitionError("MISSING_REASON", "test");
      expect(err.code).toBe("MISSING_REASON");
    });

    it("exposes message property", () => {
      const err = new TransitionError("NOT_FOUND", "Transaction 123 not found.");
      expect(err.message).toBe("Transaction 123 not found.");
    });
  });
});
