/**
 * Transaction Repository
 *
 * All database reads and writes for peppr_service_requests and peppr_request_items.
 * Contains zero business logic — only SQL.
 *
 * Domain: transaction
 */
import { eq, desc, and, like, sql } from "drizzle-orm";
import { getDb } from "../../db";
import {
  pepprServiceRequests,
  pepprRequestItems,
  type PepprServiceRequest,
} from "../../../drizzle/schema";
import type { TransactionState } from "./transactionStateMachine";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateTransactionInput {
  id: string;
  requestNumber: string;
  sessionId: string;
  propertyId: string;
  roomId: string;
  guestName?: string | null;
  guestPhone?: string | null;
  guestNotes?: string | null;
  preferredDatetime?: Date | null;
  subtotal: string;
  totalAmount: string;
  currency: string;
}

export interface CreateTransactionItemInput {
  id: string;
  requestId: string;
  itemId?: string | null;
  templateItemId?: string | null;
  itemName: string;
  itemCategory: string;
  unitPrice: string;
  quantity: number;
  includedQuantity: number;
  billableQuantity: number;
  lineTotal: string;
  currency: string;
  guestNotes?: string | null;
}

export interface TransitionUpdate {
  status: TransactionState;
  statusReason?: string | null;
  confirmedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
}

export interface ListTransactionsOptions {
  search?: string;
  status?: string;
  propertyId?: string;
  page: number;
  pageSize: number;
}

// ── Repository functions ──────────────────────────────────────────────────────

export async function findTransactionById(
  id: string,
): Promise<PepprServiceRequest | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(pepprServiceRequests)
    .where(eq(pepprServiceRequests.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function listTransactions(opts: ListTransactionsOptions) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };

  const conditions: any[] = [];
  if (opts.search) conditions.push(like(pepprServiceRequests.requestNumber, `%${opts.search}%`));
  if (opts.status)     conditions.push(eq(pepprServiceRequests.status, opts.status));
  if (opts.propertyId) conditions.push(eq(pepprServiceRequests.propertyId, opts.propertyId));

  const where = conditions.length === 1
    ? conditions[0]
    : conditions.length > 1
    ? and(...conditions)
    : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pepprServiceRequests)
    .where(where);
  const total = Number(countResult?.count ?? 0);

  const rows = await db
    .select()
    .from(pepprServiceRequests)
    .where(where)
    .orderBy(desc(pepprServiceRequests.createdAt))
    .limit(opts.pageSize)
    .offset((opts.page - 1) * opts.pageSize);

  return { rows, total };
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(pepprServiceRequests).values({
    id: input.id,
    requestNumber: input.requestNumber,
    sessionId: input.sessionId,
    propertyId: input.propertyId,
    roomId: input.roomId,
    guestName: input.guestName ?? null,
    guestPhone: input.guestPhone ?? null,
    guestNotes: input.guestNotes ?? null,
    preferredDatetime: input.preferredDatetime ?? null,
    subtotal: input.subtotal,
    discountAmount: "0",
    totalAmount: input.totalAmount,
    currency: input.currency,
  });
}

export async function createTransactionItem(
  input: CreateTransactionItemInput,
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.insert(pepprRequestItems).values({
    id: input.id,
    requestId: input.requestId,
    itemId: input.itemId ?? null,
    templateItemId: input.templateItemId ?? null,
    itemName: input.itemName,
    itemCategory: input.itemCategory,
    unitPrice: input.unitPrice,
    quantity: input.quantity,
    includedQuantity: input.includedQuantity,
    billableQuantity: input.billableQuantity,
    lineTotal: input.lineTotal,
    currency: input.currency,
    guestNotes: input.guestNotes ?? null,
  });
}

export async function applyTransition(
  id: string,
  update: TransitionUpdate,
): Promise<PepprServiceRequest | null> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const updatePayload: Record<string, any> = {
    status: update.status,
    statusReason: update.statusReason ?? null,
  };
  if (update.confirmedAt !== undefined) updatePayload.confirmedAt = update.confirmedAt;
  if (update.completedAt !== undefined) updatePayload.completedAt = update.completedAt;
  if (update.cancelledAt !== undefined) updatePayload.cancelledAt = update.cancelledAt;

  await db
    .update(pepprServiceRequests)
    .set(updatePayload)
    .where(eq(pepprServiceRequests.id, id));

  const rows = await db
    .select()
    .from(pepprServiceRequests)
    .where(eq(pepprServiceRequests.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function findItemsByRequestId(requestId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pepprRequestItems)
    .where(eq(pepprRequestItems.requestId, requestId));
}
