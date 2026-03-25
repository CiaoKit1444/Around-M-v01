/**
 * Service Requests Router — Sprint 2
 *
 * Covers the full post-cart lifecycle:
 *   submitCart → assign → accept/reject → payment → complete → confirm
 *
 * State machine:
 *   SUBMITTED → PENDING_MATCH / AUTO_MATCHING → MATCHED → DISPATCHED
 *   → SP_ACCEPTED → PENDING_PAYMENT → PAYMENT_CONFIRMED → IN_PROGRESS
 *   → COMPLETED → FULFILLED | AUTO_CANCELLED | DISPUTED
 *   Any pre-payment state → CANCELLED
 *   Any timed state → EXPIRED (via SLA cron, not here)
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import {
  pepprServiceRequests,
  pepprRequestItems,
  pepprSpAssignments,
  pepprPayments,
  pepprRequestEvents,
  pepprRequestNotes,
  pepprServiceProviders,
  pepprRooms,
  pepprProperties,
} from "../drizzle/schema";
import { eq, and, desc, asc, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { notifyOwner } from "./_core/notification";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generate REQ-YYYYMMDD-NNNN style reference number */
function generateRefNo(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = Math.floor(Math.random() * 9000 + 1000); // 4-digit random; replace with DB sequence post-MVP
  return `REQ-${date}-${seq}`;
}

/** Compute SLA deadline: now + minutes */
function slaDeadline(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/** Append an event to the audit log */
async function logEvent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  requestId: string,
  fromState: string | null,
  toState: string,
  actorType: "guest" | "staff" | "sp" | "system",
  actorId?: string,
  note?: string
) {
  await db.insert(pepprRequestEvents).values({
    id: nanoid(),
    requestId,
    fromState: fromState ?? undefined,
    toState,
    actorType,
    actorId: actorId ?? undefined,
    note: note ?? undefined,
    createdAt: new Date(),
  });
}

// ── Input schemas ─────────────────────────────────────────────────────────────

const CartItemSchema = z.object({
  itemId: z.string(),
  itemName: z.string(),
  itemCategory: z.string(),
  unitPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  guestNotes: z.string().optional(),
});

const SubmitCartInput = z.object({
  propertyId: z.string(),
  roomId: z.string(),
  sessionId: z.string(),
  guestName: z.string().optional(),
  guestPhone: z.string().optional(),
  guestNotes: z.string().optional(),
  preferredDatetime: z.string().optional(), // ISO string
  items: z.array(CartItemSchema).min(1),
  matchingMode: z.enum(["auto", "manual"]).default("auto"),
});

const AssignProviderInput = z.object({
  requestId: z.string(),
  providerId: z.string(),
  note: z.string().optional(),
});

const AcceptJobInput = z.object({
  assignmentId: z.string(),
  estimatedArrival: z.string(), // ISO string
  assignedStaffName: z.string().optional(),
  deliveryNotes: z.string().optional(),
});

const RejectJobInput = z.object({
  assignmentId: z.string(),
  rejectionReason: z.string(),
});

const AddNoteInput = z.object({
  requestId: z.string(),
  content: z.string(),
  isInternal: z.boolean().default(true),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const requestsRouter = router({

  /**
   * Submit cart → create service request (PUBLIC — called from Guest PWA)
   */
  submitCart: publicProcedure
    .input(SubmitCartInput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const requestId = nanoid();
      const refNo = generateRefNo();
      const now = new Date();

      // Compute totals
      const subtotal = input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
      const totalAmount = subtotal; // no discount at MVP

      // Create the request
      await db.insert(pepprServiceRequests).values({
        id: requestId,
        requestNumber: refNo,
        sessionId: input.sessionId,
        propertyId: input.propertyId,
        roomId: input.roomId,
        guestName: input.guestName ?? null,
        guestPhone: input.guestPhone ?? null,
        guestNotes: input.guestNotes ?? null,
        preferredDatetime: input.preferredDatetime ? new Date(input.preferredDatetime) : null,
        subtotal: subtotal.toFixed(2),
        discountAmount: "0.00",
        totalAmount: totalAmount.toFixed(2),
        currency: "THB",
        status: "SUBMITTED",
        matchingMode: input.matchingMode,
        slaDeadline: slaDeadline(5), // 5-min SLA to dispatch
        autoConfirmed: false,
        createdAt: now,
        updatedAt: now,
      });

      // Insert request items
      const itemRows = input.items.map((item) => ({
        id: nanoid(),
        requestId,
        itemId: item.itemId,
        itemName: item.itemName,
        itemCategory: item.itemCategory,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        includedQuantity: 0,
        billableQuantity: item.quantity,
        lineTotal: (item.unitPrice * item.quantity).toFixed(2),
        currency: "THB",
        guestNotes: item.guestNotes ?? null,
        status: "PENDING",
        createdAt: now,
      }));
      await db.insert(pepprRequestItems).values(itemRows);

      // Audit log
      await logEvent(db, requestId, null, "SUBMITTED", "guest", input.sessionId, "Cart submitted");

      // Notify Front Office
      await notifyOwner({
        title: `New Service Request ${refNo}`,
        content: `Property: ${input.propertyId} | Room: ${input.roomId} | Items: ${input.items.length} | Total: ฿${totalAmount.toFixed(2)}`,
      }).catch(() => {}); // non-blocking

      return {
        requestId,
        refNo,
        status: "SUBMITTED" as const,
        totalAmount,
        currency: "THB",
        slaDeadline: slaDeadline(5).toISOString(),
      };
    }),

  /**
   * Get full request detail (request + items + active assignment + payment)
   */
  getRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const items = await db.select().from(pepprRequestItems)
        .where(eq(pepprRequestItems.requestId, input.requestId))
        .orderBy(asc(pepprRequestItems.createdAt));

      const assignments = await db.select().from(pepprSpAssignments)
        .where(and(
          eq(pepprSpAssignments.requestId, input.requestId),
          eq(pepprSpAssignments.isActive, true),
        ))
        .limit(1);

      const [payment] = await db.select().from(pepprPayments)
        .where(eq(pepprPayments.requestId, input.requestId))
        .orderBy(desc(pepprPayments.createdAt))
        .limit(1);

      const events = await db.select().from(pepprRequestEvents)
        .where(eq(pepprRequestEvents.requestId, input.requestId))
        .orderBy(asc(pepprRequestEvents.createdAt));

      return {
        request,
        items,
        activeAssignment: assignments[0] ?? null,
        payment: payment ?? null,
        events,
      };
    }),

  /**
   * List requests for a property (Front Office queue)
   */
  listByProperty: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      status: z.string().optional(), // filter by state
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const conditions = [eq(pepprServiceRequests.propertyId, input.propertyId)];
      if (input.status) {
        conditions.push(eq(pepprServiceRequests.status, input.status));
      }

      const rows = await db.select().from(pepprServiceRequests)
        .where(and(...conditions))
        .orderBy(desc(pepprServiceRequests.createdAt))
        .limit(input.limit);

      return rows;
    }),

  /**
   * Assign a Service Provider to a request (Front Office action)
   */
  assignProvider: protectedProcedure
    .input(AssignProviderInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const allowedStates = ["SUBMITTED", "PENDING_MATCH", "SP_REJECTED"];
      if (!allowedStates.includes(request.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot assign from state ${request.status}` });
      }

      const now = new Date();
      const assignmentId = nanoid();

      // Deactivate any existing assignment
      await db.update(pepprSpAssignments)
        .set({ isActive: false, updatedAt: now })
        .where(and(
          eq(pepprSpAssignments.requestId, input.requestId),
          eq(pepprSpAssignments.isActive, true),
        ));

      // Create new assignment
      await db.insert(pepprSpAssignments).values({
        id: assignmentId,
        requestId: input.requestId,
        providerId: input.providerId,
        isActive: true,
        assignedAt: now,
        createdAt: now,
        updatedAt: now,
      });

      // Update request state to DISPATCHED
      await db.update(pepprServiceRequests)
        .set({
          status: "DISPATCHED",
          assignedProviderId: input.providerId,
          slaDeadline: slaDeadline(10), // 10-min SLA for SP to respond
          updatedAt: now,
        })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, request.status, "DISPATCHED", "staff",
        ctx.user?.openId, `Assigned to provider ${input.providerId}. ${input.note ?? ""}`);

      return { assignmentId, status: "DISPATCHED" as const };
    }),

  /**
   * SP accepts a job
   */
  acceptJob: protectedProcedure
    .input(AcceptJobInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [assignment] = await db.select().from(pepprSpAssignments)
        .where(eq(pepprSpAssignments.id, input.assignmentId))
        .limit(1);

      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      const now = new Date();

      await db.update(pepprSpAssignments)
        .set({
          acceptedAt: now,
          estimatedArrival: new Date(input.estimatedArrival),
          assignedStaffName: input.assignedStaffName ?? null,
          deliveryNotes: input.deliveryNotes ?? null,
          updatedAt: now,
        })
        .where(eq(pepprSpAssignments.id, input.assignmentId));

      await db.update(pepprServiceRequests)
        .set({
          status: "SP_ACCEPTED",
          slaDeadline: slaDeadline(15), // 15-min SLA for payment
          updatedAt: now,
        })
        .where(eq(pepprServiceRequests.id, assignment.requestId));

      await logEvent(db, assignment.requestId, "DISPATCHED", "SP_ACCEPTED", "sp",
        ctx.user?.openId, `Estimated arrival: ${input.estimatedArrival}`);

      return { status: "SP_ACCEPTED" as const };
    }),

  /**
   * SP rejects a job — returns to PENDING_MATCH
   */
  rejectJob: protectedProcedure
    .input(RejectJobInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [assignment] = await db.select().from(pepprSpAssignments)
        .where(eq(pepprSpAssignments.id, input.assignmentId))
        .limit(1);

      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      const now = new Date();

      await db.update(pepprSpAssignments)
        .set({
          rejectedAt: now,
          rejectionReason: input.rejectionReason,
          isActive: false,
          updatedAt: now,
        })
        .where(eq(pepprSpAssignments.id, input.assignmentId));

      await db.update(pepprServiceRequests)
        .set({
          status: "SP_REJECTED",
          assignedProviderId: null,
          slaDeadline: slaDeadline(5), // reset SLA for re-assignment
          updatedAt: now,
        })
        .where(eq(pepprServiceRequests.id, assignment.requestId));

      await logEvent(db, assignment.requestId, "DISPATCHED", "SP_REJECTED", "sp",
        ctx.user?.openId, `Rejected: ${input.rejectionReason}`);

      // Notify Front Office
      await notifyOwner({
        title: `SP Rejected Request`,
        content: `Request ${assignment.requestId} was rejected by provider. Reason: ${input.rejectionReason}`,
      }).catch(() => {});

      return { status: "SP_REJECTED" as const };
    }),

  /**
   * SP marks job as In Progress
   */
  markInProgress: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({ status: "IN_PROGRESS", updatedAt: now })
        .where(and(
          eq(pepprServiceRequests.id, input.requestId),
          eq(pepprServiceRequests.status, "PAYMENT_CONFIRMED"),
        ));

      await logEvent(db, input.requestId, "PAYMENT_CONFIRMED", "IN_PROGRESS", "sp", ctx.user?.openId);

      return { status: "IN_PROGRESS" as const };
    }),

  /**
   * SP marks job as Completed — starts 10-min guest confirmation window
   */
  markCompleted: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({
          status: "COMPLETED",
          completedAt: now,
          slaDeadline: slaDeadline(10), // 10-min guest confirmation window
          updatedAt: now,
        })
        .where(and(
          eq(pepprServiceRequests.id, input.requestId),
          eq(pepprServiceRequests.status, "IN_PROGRESS"),
        ));

      await logEvent(db, input.requestId, "IN_PROGRESS", "COMPLETED", "sp", ctx.user?.openId,
        "Service delivered. Awaiting guest confirmation (10 min).");

      return { status: "COMPLETED" as const, confirmationDeadline: slaDeadline(10).toISOString() };
    }),

  /**
   * Guest confirms fulfilment (OPT-IN)
   */
  confirmFulfilled: publicProcedure
    .input(z.object({ requestId: z.string(), sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({
          status: "FULFILLED",
          confirmedAt: now,
          autoConfirmed: false,
          updatedAt: now,
        })
        .where(and(
          eq(pepprServiceRequests.id, input.requestId),
          eq(pepprServiceRequests.status, "COMPLETED"),
        ));

      await logEvent(db, input.requestId, "COMPLETED", "FULFILLED", "guest", input.sessionId,
        "Guest confirmed fulfilment.");

      return { status: "FULFILLED" as const };
    }),

  /**
   * Guest raises a dispute
   */
  raiseDispute: publicProcedure
    .input(z.object({ requestId: z.string(), sessionId: z.string(), reason: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({ status: "DISPUTED", statusReason: input.reason, updatedAt: now })
        .where(and(
          eq(pepprServiceRequests.id, input.requestId),
          eq(pepprServiceRequests.status, "COMPLETED"),
        ));

      await logEvent(db, input.requestId, "COMPLETED", "DISPUTED", "guest", input.sessionId,
        `Dispute: ${input.reason}`);

      await notifyOwner({
        title: `Dispute Raised — ${input.requestId}`,
        content: `Guest raised a dispute: ${input.reason}`,
      }).catch(() => {});

      return { status: "DISPUTED" as const };
    }),

  /**
   * Cancel a request (pre-payment only)
   */
  cancelRequest: protectedProcedure
    .input(z.object({ requestId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const nonCancellableStates = ["PAYMENT_CONFIRMED", "IN_PROGRESS", "COMPLETED", "FULFILLED", "CANCELLED"];
      if (nonCancellableStates.includes(request.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot cancel from state ${request.status}` });
      }

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({
          status: "CANCELLED",
          statusReason: input.reason ?? null,
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, request.status, "CANCELLED", "staff",
        ctx.user?.openId, input.reason);

      return { status: "CANCELLED" as const };
    }),

  /**
   * Add a note to a request
   */
  addNote: protectedProcedure
    .input(AddNoteInput)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const noteId = nanoid();
      await db.insert(pepprRequestNotes).values({
        id: noteId,
        requestId: input.requestId,
        authorId: ctx.user?.openId ?? null,
        authorType: "staff",
        content: input.content,
        isInternal: input.isInternal,
        createdAt: new Date(),
      });

      return { noteId };
    }),

  /**
   * Update matching mode for a request (AUTO / MANUAL)
   */
  setMatchingMode: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      mode: z.enum(["AUTO", "MANUAL"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await db.update(pepprServiceRequests)
        .set({ matchingMode: input.mode.toLowerCase() as "auto" | "manual", updatedAt: new Date() })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, null, input.mode, "staff", ctx.user?.openId,
        `Matching mode changed to ${input.mode}`);

      return { mode: input.mode };
    }),

  /**
   * List jobs for a Service Provider (SP job queue)
   */
  listSpJobs: protectedProcedure
    .input(z.object({
      providerId: z.string(),
      status: z.string().optional(),
      limit: z.number().int().min(1).max(200).default(100),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      // Get all assignments for this provider
      const assignments = await db.select().from(pepprSpAssignments)
        .where(eq(pepprSpAssignments.providerId, input.providerId))
        .orderBy(desc(pepprSpAssignments.createdAt))
        .limit(input.limit);

      if (assignments.length === 0) return [];

      const requestIds = assignments.map(a => a.requestId);
      const requests = await db.select().from(pepprServiceRequests)
        .where(inArray(pepprServiceRequests.id, requestIds));

      // Filter by status if provided
      const filtered = input.status
        ? requests.filter(r => r.status === input.status)
        : requests;

      // Join assignment data
      return filtered.map(req => ({
        ...req,
        assignment: assignments.find(a => a.requestId === req.id) ?? null,
      }));
    }),

  /**
   * List available Service Providers for manual assignment (shortlist)
   */
  listProviders: protectedProcedure
    .input(z.object({
      propertyId: z.string(),
      category: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const rows = await db.select().from(pepprServiceProviders)
        .where(eq(pepprServiceProviders.status, "active"))
        .orderBy(desc(pepprServiceProviders.rating))
        .limit(20);

      return rows;
    }),
});
