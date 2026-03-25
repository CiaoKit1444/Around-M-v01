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
import { generateQR, pollChargeStatus } from "./stubPaymentGateway";
import { sendSms, sendWhatsApp, normalisePhone } from "./stubSmsGateway";
import { broadcastToProperty, broadcastToRequest } from "./sse";

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

      // Fetch request to get propertyId for SSE broadcast
      const [updatedRequest] = await db.select()
        .from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, assignment.requestId))
        .limit(1);

      if (updatedRequest?.propertyId) {
        broadcastToProperty(updatedRequest.propertyId, "request.updated", {
          requestId: assignment.requestId,
          status: "SP_ACCEPTED",
          message: "Service provider accepted the job — payment required",
          estimatedArrival: input.estimatedArrival,
          assignedStaffName: input.assignedStaffName ?? null,
        });
      }

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
   * SP or FO marks job as In Progress
   * Transition: PAYMENT_CONFIRMED → IN_PROGRESS
   */
  markInProgress: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      if (request.status !== "PAYMENT_CONFIRMED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot mark as In Progress from state ${request.status} (expected PAYMENT_CONFIRMED)`,
        });
      }

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({ status: "IN_PROGRESS", updatedAt: now })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, "PAYMENT_CONFIRMED", "IN_PROGRESS", "staff",
        ctx.user?.openId, "Marked as in progress");

      // Broadcast to FO queue
      if (request.propertyId) {
        broadcastToProperty(request.propertyId, "request.updated", {
          requestId: input.requestId,
          status: "IN_PROGRESS",
          message: "Service is now in progress",
        });
      }

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

      // Fetch request to validate state and get propertyId
      const [req] = await db.select({
        id: pepprServiceRequests.id,
        status: pepprServiceRequests.status,
        propertyId: pepprServiceRequests.propertyId,
        requestNumber: pepprServiceRequests.requestNumber,
        guestPhone: pepprServiceRequests.guestPhone,
      })
        .from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "IN_PROGRESS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot complete service from state ${req.status} — must be IN_PROGRESS`,
        });
      }

      const now = new Date();
      const confirmationDeadline = slaDeadline(10); // 10-min guest confirmation window

      await db.update(pepprServiceRequests)
        .set({
          status: "COMPLETED",
          completedAt: now,
          slaDeadline: confirmationDeadline,
          updatedAt: now,
        })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, "IN_PROGRESS", "COMPLETED", "staff", ctx.user?.openId,
        "Service delivered. Awaiting guest confirmation (10 min).");

      // Broadcast SSE to FO queue so the card updates immediately
      if (req.propertyId) {
        broadcastToProperty(req.propertyId, "request.updated", {
          requestId: input.requestId,
          status: "COMPLETED",
          message: `Service for ${req.requestNumber} completed — awaiting guest confirmation`,
          confirmationDeadline: confirmationDeadline.toISOString(),
        });
      }

      // Notify owner (FO supervisor)
      void notifyOwner({
        title: `Service Completed: ${req.requestNumber}`,
        content: `Request ${req.requestNumber} has been marked as completed. Guest has 10 minutes to confirm fulfilment.`,
      });

      return {
        status: "COMPLETED" as const,
        confirmationDeadline: confirmationDeadline.toISOString(),
        requestNumber: req.requestNumber,
        feedbackUrl: `/guest/track/${req.requestNumber}`,
      };
    }),

  /**
   * Guest confirms fulfilment (OPT-IN)
   */
  confirmFulfilled: publicProcedure
    .input(z.object({ requestId: z.string(), sessionId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [req] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "COMPLETED")
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot confirm from status ${req.status}` });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({ status: "FULFILLED", confirmedAt: now, autoConfirmed: false, updatedAt: now })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, "COMPLETED", "FULFILLED", "guest", input.sessionId,
        "Guest confirmed fulfilment.");

      // Broadcast to FO queue and guest SSE
      if (req.propertyId) broadcastToProperty(req.propertyId, "request.updated", { requestId: input.requestId, status: "FULFILLED" });
      broadcastToRequest(input.requestId, "request.updated", { status: "FULFILLED" });

      return { status: "FULFILLED" as const };
    }),

  /**
   * Guest raises a dispute (COMPLETED or IN_PROGRESS → DISPUTED)
   */
  raiseDispute: publicProcedure
    .input(z.object({
      requestId: z.string(),
      sessionId: z.string(),
      reason: z.string().min(5, "Please describe the issue (at least 5 characters)"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [req] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (!["COMPLETED", "IN_PROGRESS"].includes(req.status))
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot raise dispute from status ${req.status}` });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({ status: "DISPUTED", statusReason: input.reason, updatedAt: now })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, req.status, "DISPUTED", "guest", input.sessionId,
        `Dispute: ${input.reason}`);

      await notifyOwner({
        title: `⚠️ Dispute Raised — ${req.requestNumber}`,
        content: `Guest raised a dispute for ${req.requestNumber}.\nReason: ${input.reason}`,
      }).catch(() => {});

      // Broadcast to FO and guest
      if (req.propertyId) broadcastToProperty(req.propertyId, "request.updated", { requestId: input.requestId, status: "DISPUTED" });
      broadcastToRequest(input.requestId, "request.updated", { status: "DISPUTED" });

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
   * Get request by reference number (PUBLIC — Guest PWA tracking)
   */
  getByRefNo: publicProcedure
    .input(z.object({ refNo: z.string(), sessionId: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.requestNumber, input.refNo))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const items = await db.select().from(pepprRequestItems)
        .where(eq(pepprRequestItems.requestId, request.id))
        .orderBy(asc(pepprRequestItems.createdAt));

      const [activeAssignment] = await db.select().from(pepprSpAssignments)
        .where(and(
          eq(pepprSpAssignments.requestId, request.id),
          eq(pepprSpAssignments.isActive, true),
        ))
        .limit(1);

      const [payment] = await db.select().from(pepprPayments)
        .where(eq(pepprPayments.requestId, request.id))
        .orderBy(desc(pepprPayments.createdAt))
        .limit(1);

      return {
        request,
        items,
        activeAssignment: activeAssignment ?? null,
        payment: payment ?? null,
      };
    }),

  /**
   * Initiate payment — generate a PromptPay QR charge (PUBLIC — Guest PWA)
   * Called when the SP has accepted and the request enters PENDING_PAYMENT state.
   */
  initiatePayment: publicProcedure
    .input(z.object({
      requestId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const payableStates = ["SP_ACCEPTED", "PENDING_PAYMENT"];
      if (!payableStates.includes(request.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot initiate payment from state ${request.status}`,
        });
      }

      // Check for existing pending payment
      const [existingPayment] = await db.select().from(pepprPayments)
        .where(and(
          eq(pepprPayments.requestId, input.requestId),
          eq(pepprPayments.status, "PENDING"),
        ))
        .limit(1);

      if (existingPayment) {
        // Return existing QR instead of creating a new charge
        return {
          paymentId: existingPayment.id,
          chargeId: existingPayment.gatewayChargeId ?? "",
          qrDataUrl: existingPayment.qrDataUrl ?? "",
          qrPayload: existingPayment.qrPayload ?? "",
          amount: parseFloat(existingPayment.amount),
          currency: existingPayment.currency,
          expiresAt: existingPayment.expiresAt?.toISOString() ?? "",
          status: "PENDING" as const,
        };
      }

      const amount = parseFloat(request.totalAmount);
      const qrResult = generateQR({
        requestId: input.requestId,
        amount,
        description: `Peppr ${request.requestNumber}`,
      });

      const now = new Date();
      const paymentId = nanoid();

      await db.insert(pepprPayments).values({
        id: paymentId,
        requestId: input.requestId,
        method: "promptpay_qr",
        amount: amount.toFixed(2),
        currency: "THB",
        status: "PENDING",
        gatewayChargeId: qrResult.chargeId,
        qrDataUrl: qrResult.qrDataUrl,
        qrPayload: qrResult.qrPayload,
        expiresAt: qrResult.expiresAt,
        createdAt: now,
        updatedAt: now,
      });

      // Transition request to PENDING_PAYMENT
      await db.update(pepprServiceRequests)
        .set({ status: "PENDING_PAYMENT", updatedAt: now })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, request.status, "PENDING_PAYMENT", "guest",
        input.sessionId, `Payment initiated. ChargeId: ${qrResult.chargeId}`);

      return {
        paymentId,
        chargeId: qrResult.chargeId,
        qrDataUrl: qrResult.qrDataUrl,
        qrPayload: qrResult.qrPayload,
        amount,
        currency: "THB",
        expiresAt: qrResult.expiresAt.toISOString(),
        status: "PENDING" as const,
      };
    }),

  /**
   * Poll payment status — guest polls every 3s to detect confirmation (PUBLIC)
   */
  pollPayment: publicProcedure
    .input(z.object({
      paymentId: z.string(),
      sessionId: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [payment] = await db.select().from(pepprPayments)
        .where(eq(pepprPayments.id, input.paymentId))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });

      // If already confirmed, return immediately
      if (payment.status === "PAID") {
        return { status: "PAID" as const, paidAt: payment.paidAt?.toISOString() };
      }

      // Poll stub gateway
      const gwStatus = pollChargeStatus(payment.gatewayChargeId ?? "");

      if (gwStatus.status === "PAID") {
        const now = new Date();
        // Update payment record
        await db.update(pepprPayments)
          .set({ status: "PAID", paidAt: gwStatus.paidAt ?? now, updatedAt: now })
          .where(eq(pepprPayments.id, input.paymentId));

        // Transition request to PAYMENT_CONFIRMED
        await db.update(pepprServiceRequests)
          .set({ status: "PAYMENT_CONFIRMED", updatedAt: now })
          .where(eq(pepprServiceRequests.id, payment.requestId));

        await logEvent(db, payment.requestId, "PENDING_PAYMENT", "PAYMENT_CONFIRMED", "system",
          undefined, `Payment confirmed. ChargeId: ${payment.gatewayChargeId}`);

        await notifyOwner({
          title: `Payment Confirmed`,
          content: `Request ${payment.requestId} payment confirmed. Amount: ฿${payment.amount}`,
        }).catch(() => {});

        return { status: "PAID" as const, paidAt: (gwStatus.paidAt ?? now).toISOString() };
      }

      if (gwStatus.status === "FAILED") {
        const now = new Date();
        await db.update(pepprPayments)
          .set({ status: "FAILED", updatedAt: now })
          .where(eq(pepprPayments.id, input.paymentId));
        return { status: "FAILED" as const };
      }

      return { status: "PENDING" as const };
    }),

  /**
   * Simulate Payment — stub-only: force-confirm a pending payment immediately.
   * This bypasses the 15-second auto-confirm delay for faster manual testing.
   * Should be disabled / removed when integrating a real payment gateway.
   *
   * PUBLIC — Guest PWA (no auth required for demo convenience)
   */
  simulatePayment: publicProcedure
    .input(z.object({
      paymentId: z.string(),
      sessionId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [payment] = await db.select().from(pepprPayments)
        .where(eq(pepprPayments.id, input.paymentId))
        .limit(1);

      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });

      if (payment.status === "PAID") {
        return { status: "PAID" as const, paidAt: payment.paidAt?.toISOString() };
      }

      if (payment.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot simulate payment from status ${payment.status}` });
      }

      const now = new Date();

      // Force-confirm in DB
      await db.update(pepprPayments)
        .set({ status: "PAID", paidAt: now, updatedAt: now })
        .where(eq(pepprPayments.id, input.paymentId));

      // Transition request
      await db.update(pepprServiceRequests)
        .set({ status: "PAYMENT_CONFIRMED", updatedAt: now })
        .where(eq(pepprServiceRequests.id, payment.requestId));

      await logEvent(db, payment.requestId, "PENDING_PAYMENT", "PAYMENT_CONFIRMED", "system",
        undefined, `[STUB] Payment simulated. ChargeId: ${payment.gatewayChargeId}`);

      await notifyOwner({
        title: "[STUB] Payment Simulated",
        content: `Request ${payment.requestId} payment force-confirmed. Amount: \u0e3f${payment.amount}`,
      }).catch(() => {});

      // Notify guest via SSE for instant UI update
      broadcastToRequest(payment.requestId, "request.updated", {
        requestId: payment.requestId,
        status: "PAYMENT_CONFIRMED",
        message: "Payment confirmed (demo simulation) \u2014 your service request is confirmed!",
      });

      return { status: "PAID" as const, paidAt: now.toISOString() };
    }),

  /**
   * Send Payment SMS — stub: logs the SMS and returns a mock delivery receipt.
   * Replace with real Twilio/SMS provider when available.
   * PROTECTED — FO agent only.
   */
  sendPaymentSms: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      phone: z.string().min(9).max(20),
      channel: z.enum(["sms", "whatsapp"]),
      origin: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [request] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId))
        .limit(1);

      if (!request) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });

      const paymentUrl = `${input.origin}/guest/payment/${input.requestId}`;

      // Message templates — swap for localised copy when available
      const messageBody = input.channel === "whatsapp"
        ? `\u{1F4CB} *Peppr Service Request*\n\nYour request *${request.requestNumber}* has been accepted by a service provider.\n\nPlease complete payment to proceed:\n${paymentUrl}\n\n_This link is valid for 30 minutes._`
        : `[Peppr] Request ${request.requestNumber} accepted. Pay now: ${paymentUrl} (valid 30 min)`;

      // Dispatch via stub gateway (swap with real Twilio/DTAC call when key is available)
      const receipt = input.channel === "whatsapp"
        ? await sendWhatsApp(input.phone, messageBody)
        : await sendSms(input.phone, messageBody);

      // Determine if delivery succeeded
      const delivered = ["queued", "sending", "sent", "delivered"].includes(receipt.status);

      await logEvent(db, input.requestId, request.status, request.status, "staff",
        ctx.user?.openId,
        `[STUB] ${input.channel.toUpperCase()} → ${normalisePhone(input.phone)} | sid=${receipt.sid} | status=${receipt.status}${receipt.errorCode ? ` | err=${receipt.errorCode}` : ""}`);

      if (!delivered) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Message delivery failed: ${receipt.errorMessage ?? receipt.status} (code ${receipt.errorCode ?? "unknown"})`,
        });
      }

      return {
        delivered,
        channel: receipt.channel,
        phone: receipt.to,
        messageId: receipt.sid,
        status: receipt.status,
        numSegments: receipt.numSegments,
        pricePerSegment: receipt.pricePerSegment,
        dateCreated: receipt.dateCreated,
        stub: true,
      };
    }),

  /**
   * Resolve a disputed request (FO staff action)
   * DISPUTED → RESOLVED
   */
  resolveDispute: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      resolutionNote: z.string().min(10, "Please provide a resolution note (at least 10 characters)"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [req] = await db.select().from(pepprServiceRequests)
        .where(eq(pepprServiceRequests.id, input.requestId)).limit(1);
      if (!req) throw new TRPCError({ code: "NOT_FOUND", message: "Request not found" });
      if (req.status !== "DISPUTED")
        throw new TRPCError({ code: "BAD_REQUEST", message: `Cannot resolve from status ${req.status}. Request must be in DISPUTED state.` });

      const now = new Date();
      await db.update(pepprServiceRequests)
        .set({ status: "RESOLVED", statusReason: input.resolutionNote, updatedAt: now })
        .where(eq(pepprServiceRequests.id, input.requestId));

      await logEvent(db, input.requestId, "DISPUTED", "RESOLVED", "staff", String(ctx.user.id),
        `Resolved by ${ctx.user.name ?? String(ctx.user.id)}: ${input.resolutionNote}`);

      // Notify guest via SSE and owner
      broadcastToRequest(input.requestId, "request.updated", { status: "RESOLVED", resolutionNote: input.resolutionNote });
      if (req.propertyId) broadcastToProperty(req.propertyId, "request.updated", { requestId: input.requestId, status: "RESOLVED" });

      await notifyOwner({
        title: `✅ Dispute Resolved — ${req.requestNumber}`,
        content: `Request ${req.requestNumber} dispute resolved by ${ctx.user.name ?? ctx.user.id}.\nResolution: ${input.resolutionNote}`,
      }).catch(() => {});

      return { status: "RESOLVED" as const, resolutionNote: input.resolutionNote };
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
