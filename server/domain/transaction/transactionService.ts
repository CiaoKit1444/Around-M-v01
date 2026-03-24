/**
 * Transaction Service
 *
 * Business logic for the transaction domain.
 * Orchestrates: state machine validation → repository write → audit log.
 *
 * Invariants enforced here:
 * 1. Only this service may mutate peppr_service_requests.status.
 * 2. Every state transition writes an audit record before returning.
 * 3. Payment and fulfillment services NEVER call transition() directly.
 *
 * Domain: transaction
 */
import { logAuditEvent } from "../audit/auditService";
import {
  assertTransition,
  timestampColumnFor,
  TransitionError,
  type TransactionState,
} from "./transactionStateMachine";
import {
  findTransactionById,
  applyTransition,
  createTransaction,
  createTransactionItem,
  listTransactions,
  findItemsByRequestId,
  type CreateTransactionInput,
  type CreateTransactionItemInput,
  type ListTransactionsOptions,
} from "./transactionRepository";

// ── Re-export error type for handlers ────────────────────────────────────────
export { TransitionError };

// ── Create ────────────────────────────────────────────────────────────────────

export async function createServiceRequest(
  input: CreateTransactionInput,
  items: CreateTransactionItemInput[],
  actorId?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ id: string; requestNumber: string; status: string }> {
  await createTransaction(input);

  for (const item of items) {
    await createTransactionItem(item);
  }

  await logAuditEvent({
    actorType: actorId ? "USER" : "GUEST",
    actorId,
    action: "request_created",
    resourceType: "service_request",
    resourceId: input.id,
    details: {
      request_number: input.requestNumber,
      property_id: input.propertyId,
      room_id: input.roomId,
      item_count: items.length,
      total_amount: input.totalAmount,
    },
    ipAddress,
    userAgent,
  });

  return { id: input.id, requestNumber: input.requestNumber, status: "PENDING" };
}

// ── Transition ────────────────────────────────────────────────────────────────

/**
 * Transition a transaction to a new state.
 *
 * This is the ONLY function that may mutate peppr_service_requests.status.
 *
 * @throws TransitionError if the transition is not allowed
 * @throws Error if the transaction is not found or DB is unavailable
 */
export async function transitionServiceRequest(
  id: string,
  to: TransactionState,
  reason?: string,
  actorId?: string,
  ipAddress?: string,
  userAgent?: string,
): Promise<{ id: string; status: string }> {
  const current = await findTransactionById(id);
  if (!current) {
    throw new TransitionError("NOT_FOUND", `Transaction ${id} not found.`);
  }

  const from = current.status as TransactionState;

  // Guard: validates transition rules, terminal state, and reason requirement
  assertTransition(from, to, reason);

  // Build timestamp update
  const timestampCol = timestampColumnFor(to);
  const now = new Date();
  const timestampUpdate: Record<string, Date | null> = {};
  if (timestampCol) timestampUpdate[timestampCol] = now;

  const updated = await applyTransition(id, {
    status: to,
    statusReason: reason ?? null,
    confirmedAt: timestampUpdate.confirmedAt ?? undefined,
    completedAt: timestampUpdate.completedAt ?? undefined,
    cancelledAt: timestampUpdate.cancelledAt ?? undefined,
  });

  if (!updated) {
    throw new Error(`Transaction ${id} disappeared during transition.`);
  }

  // Audit — always written before returning
  const actionMap: Partial<Record<TransactionState, string>> = {
    CONFIRMED:   "request_confirmed",
    IN_PROGRESS: "request_in_progress",
    COMPLETED:   "request_completed",
    CANCELLED:   "request_cancelled",
  };

  await logAuditEvent({
    actorType: "USER",
    actorId,
    action: actionMap[to] ?? "request_status_changed",
    resourceType: "service_request",
    resourceId: id,
    details: {
      request_number: current.requestNumber,
      from_status: from,
      to_status: to,
      reason: reason ?? null,
    },
    ipAddress,
    userAgent,
  });

  return { id: updated.id, status: updated.status };
}

// ── Query ─────────────────────────────────────────────────────────────────────

export async function getServiceRequest(id: string) {
  return findTransactionById(id);
}

export async function getServiceRequestWithItems(id: string) {
  const request = await findTransactionById(id);
  if (!request) return null;
  const items = await findItemsByRequestId(id);
  return { request, items };
}

export async function listServiceRequests(opts: ListTransactionsOptions) {
  return listTransactions(opts);
}
