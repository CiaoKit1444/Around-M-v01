/**
 * Transaction State Machine
 *
 * Pure module — no DB, no HTTP context, no side-effects.
 * Defines valid states, transition rules, and guard conditions.
 *
 * Domain: transaction (ServiceRequest lifecycle)
 */

export const TRANSACTION_STATES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;

export type TransactionState = (typeof TRANSACTION_STATES)[number];

export const TERMINAL_STATES: Set<TransactionState> = new Set<TransactionState>([
  "COMPLETED",
  "CANCELLED",
]);

/**
 * Allowed transitions: from → set of valid next states.
 * Terminal states map to empty arrays.
 */
export const VALID_TRANSITIONS: Readonly<Record<TransactionState, readonly TransactionState[]>> = {
  PENDING:     ["CONFIRMED", "CANCELLED"],
  CONFIRMED:   ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED:   [],
  CANCELLED:   [],
};

// ── Error types ───────────────────────────────────────────────────────────────

export class TransitionError extends Error {
  constructor(
    public readonly code:
      | "INVALID_TRANSITION"
      | "TERMINAL_STATE"
      | "MISSING_REASON"
      | "NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "TransitionError";
  }
}

// ── Guards ────────────────────────────────────────────────────────────────────

/**
 * Validate a proposed state transition.
 * Throws `TransitionError` if the transition is not allowed.
 * Returns void on success (caller proceeds to write).
 */
export function assertTransition(
  from: TransactionState,
  to: TransactionState,
  reason?: string,
): void {
  if (TERMINAL_STATES.has(from)) {
    throw new TransitionError(
      "TERMINAL_STATE",
      `Transaction is in terminal state ${from} — no further transitions are allowed.`,
    );
  }

  const allowed = VALID_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new TransitionError(
      "INVALID_TRANSITION",
      `Invalid transition: ${from} → ${to}. Allowed: [${allowed.join(", ") || "none"}]`,
    );
  }

  if (to === "CANCELLED" && (!reason || reason.trim() === "")) {
    throw new TransitionError(
      "MISSING_REASON",
      "A reason is required when cancelling a transaction.",
    );
  }
}

/**
 * Return the timestamp column name to stamp for a given target state.
 * Returns null for states that do not stamp a dedicated column.
 */
export function timestampColumnFor(
  to: TransactionState,
): "confirmedAt" | "completedAt" | "cancelledAt" | null {
  switch (to) {
    case "CONFIRMED":   return "confirmedAt";
    case "COMPLETED":   return "completedAt";
    case "CANCELLED":   return "cancelledAt";
    default:            return null;
  }
}
