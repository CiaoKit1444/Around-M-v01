/**
 * spTicketsRouter — SP Ticket Lifecycle
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { pepprSpTickets, pepprSoJobs } from "../drizzle/schema";
import { eq, and, desc, lt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

const TICKET_TRANSITIONS: Record<string, string[]> = {
  OPEN:       ["CONFIRMED", "CANCELLED"],
  CONFIRMED:  ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["RUNNING", "CANCELLED"],
  RUNNING:    ["PENDING", "CLOSED"],
  PENDING:    ["RUNNING", "CANCELLED"],
  CLOSED:     [],
  CANCELLED:  [],
};

const SO_TRANSITIONS: Record<string, string[]> = {
  DISPATCHED: ["RUNNING", "CANCELLED"],
  RUNNING:    ["PENDING", "CLOSED"],
  PENDING:    ["RUNNING", "CANCELLED"],
  CLOSED:     [],
  CANCELLED:  [],
};

function assertTicketTransition(from: string, to: string) {
  if (!TICKET_TRANSITIONS[from]?.includes(to)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid ticket transition: ${from} → ${to}` });
  }
}

function assertSoTransition(from: string, to: string) {
  if (!SO_TRANSITIONS[from]?.includes(to)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid job stage transition: ${from} → ${to}` });
  }
}

export const spTicketsRouter = router({
  createTicket: protectedProcedure
    .input(z.object({ requestId: z.string(), providerId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const id = nanoid();
      await db.insert(pepprSpTickets).values({ id, requestId: input.requestId, providerId: input.providerId, status: "OPEN", spAdminNotes: input.notes ?? null });
      return { id };
    }),

  listInbound: protectedProcedure
    .input(z.object({ providerId: z.string().optional(), limit: z.number().int().min(1).max(100).default(50), cursor: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], nextCursor: undefined };
      const { providerId, limit, cursor } = input;
      // If no providerId (SUPER_ADMIN / SYSTEM_ADMIN), return all OPEN tickets
      const statusFilter = eq(pepprSpTickets.status, "OPEN");
      const cursorFilter = cursor ? lt(pepprSpTickets.createdAt, new Date(cursor)) : undefined;
      const whereClause = providerId
        ? (cursorFilter ? and(eq(pepprSpTickets.providerId, providerId), statusFilter, cursorFilter) : and(eq(pepprSpTickets.providerId, providerId), statusFilter))
        : (cursorFilter ? and(statusFilter, cursorFilter) : statusFilter);
      const rows = await db.select().from(pepprSpTickets)
        .where(whereClause)
        .orderBy(desc(pepprSpTickets.createdAt)).limit(limit + 1);
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      return { items, nextCursor: hasMore ? items[items.length - 1].createdAt.getTime() : undefined };
    }),

  listByProvider: protectedProcedure
    .input(z.object({ providerId: z.string().optional(), limit: z.number().int().min(1).max(100).default(50), cursor: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [], nextCursor: undefined };
      const { providerId, limit, cursor } = input;
      // If no providerId (SUPER_ADMIN / SYSTEM_ADMIN), return all tickets
      const providerFilter = providerId ? eq(pepprSpTickets.providerId, providerId) : undefined;
      const cursorFilter = cursor ? lt(pepprSpTickets.createdAt, new Date(cursor)) : undefined;
      const rows = await db.select().from(pepprSpTickets)
        .where(providerFilter && cursorFilter ? and(providerFilter, cursorFilter) : providerFilter ?? cursorFilter ?? sql`1=1`)
        .orderBy(desc(pepprSpTickets.updatedAt)).limit(limit + 1);
      const hasMore = rows.length > limit;
      const items = hasMore ? rows.slice(0, limit) : rows;
      return { items, nextCursor: hasMore ? items[items.length - 1].createdAt.getTime() : undefined };
    }),

  acceptTicket: protectedProcedure
    .input(z.object({ ticketId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [ticket] = await db.select().from(pepprSpTickets).where(eq(pepprSpTickets.id, input.ticketId));
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      assertTicketTransition(ticket.status, "CONFIRMED");
      await db.update(pepprSpTickets).set({ status: "CONFIRMED", acceptedAt: new Date(), spAdminNotes: input.notes ?? ticket.spAdminNotes }).where(eq(pepprSpTickets.id, input.ticketId));
      return { success: true };
    }),

  declineTicket: protectedProcedure
    .input(z.object({ ticketId: z.string(), declineReason: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [ticket] = await db.select().from(pepprSpTickets).where(eq(pepprSpTickets.id, input.ticketId));
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      assertTicketTransition(ticket.status, "CANCELLED");
      await db.update(pepprSpTickets).set({ status: "CANCELLED", declineReason: input.declineReason, cancelledAt: new Date() }).where(eq(pepprSpTickets.id, input.ticketId));
      return { success: true };
    }),

  dispatchTicket: protectedProcedure
    .input(z.object({ ticketId: z.string(), operatorId: z.string(), notes: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [ticket] = await db.select().from(pepprSpTickets).where(eq(pepprSpTickets.id, input.ticketId));
      if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "Ticket not found" });
      assertTicketTransition(ticket.status, "DISPATCHED");
      await db.update(pepprSpTickets).set({ status: "DISPATCHED", dispatchedAt: new Date() }).where(eq(pepprSpTickets.id, input.ticketId));
      const jobId = nanoid();
      await db.insert(pepprSoJobs).values({
        id: jobId, ticketId: input.ticketId, operatorId: input.operatorId, status: "DISPATCHED",
        stageNotes: input.notes ?? null,
        stageHistory: JSON.stringify([{ stage: "DISPATCHED", timestamp: new Date().toISOString(), note: input.notes, actorId: input.operatorId }]),
        assignedAt: new Date(),
      });
      return { success: true, jobId };
    }),

  getSoJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [job] = await db.select().from(pepprSoJobs).where(eq(pepprSoJobs.id, input.jobId));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      const [ticket] = await db.select().from(pepprSpTickets).where(eq(pepprSpTickets.id, job.ticketId));
      return { job, ticket: ticket ?? null };
    }),

  listSoJobs: protectedProcedure
    .input(z.object({ operatorId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const items = await db
        .select()
        .from(pepprSoJobs)
        .where(eq(pepprSoJobs.operatorId, input.operatorId))
        .orderBy(desc(pepprSoJobs.createdAt));
      return { items };
    }),

  advanceSoJobStage: protectedProcedure
    .input(z.object({ jobId: z.string(), newStage: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [job] = await db.select().from(pepprSoJobs).where(eq(pepprSoJobs.id, input.jobId));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      assertSoTransition(job.status, input.newStage);
      const now = new Date();
      const existingHistory = Array.isArray(job.stageHistory) ? (job.stageHistory as unknown[]) : [];
      const newHistory = [...existingHistory, { stage: input.newStage, timestamp: now.toISOString(), actorId: ctx.user?.id }];
      const updates: Record<string, unknown> = { status: input.newStage, stageHistory: JSON.stringify(newHistory) };
      if (input.newStage === "RUNNING" && !job.startedAt) updates.startedAt = now;
      if (input.newStage === "CLOSED") { updates.completedAt = now; }
      if (input.newStage === "CANCELLED") updates.cancelledAt = now;
      await db.update(pepprSoJobs).set(updates as Parameters<ReturnType<typeof db.update>['set']>[0]).where(eq(pepprSoJobs.id, input.jobId));
      if (input.newStage === "CLOSED") {
        await db.update(pepprSpTickets).set({ status: "CLOSED", closedAt: now }).where(eq(pepprSpTickets.id, job.ticketId));
      }
      return { success: true, newStage: input.newStage };
    }),

  // FO: assign specific request items to an SP, creating a ticket
  assignItemsToSp: protectedProcedure
    .input(z.object({
      requestId: z.string(),
      providerId: z.string(),
      itemIds: z.array(z.string()).min(1),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const id = nanoid();
      await db.insert(pepprSpTickets).values({
        id,
        requestId: input.requestId,
        providerId: input.providerId,
        itemIds: JSON.stringify(input.itemIds),
        status: "OPEN",
        spAdminNotes: input.notes ?? null,
      });
      return { id };
    }),

  // FO: list all tickets for a given request (to show assignment badges)
  listTicketsForRequest: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };
      const rows = await db.select().from(pepprSpTickets)
        .where(eq(pepprSpTickets.requestId, input.requestId))
        .orderBy(desc(pepprSpTickets.createdAt));
      return { items: rows };
    }),

  updateJobStage: protectedProcedure
    .input(z.object({ jobId: z.string(), stage: z.enum(["RUNNING", "PENDING", "CLOSED", "CANCELLED"]), note: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const [job] = await db.select().from(pepprSoJobs).where(eq(pepprSoJobs.id, input.jobId));
      if (!job) throw new TRPCError({ code: "NOT_FOUND", message: "Job not found" });
      assertSoTransition(job.status, input.stage);
      const now = new Date();
      const existingHistory = Array.isArray(job.stageHistory) ? job.stageHistory as any[] : [];
      const newHistory = [...existingHistory, { stage: input.stage, timestamp: now.toISOString(), note: input.note, actorId: ctx.user?.id }];
      const updates: Record<string, unknown> = { status: input.stage, stageNotes: input.note ?? job.stageNotes, stageHistory: JSON.stringify(newHistory) };
      if (input.stage === "RUNNING" && !job.startedAt) updates.startedAt = now;
      if (input.stage === "CLOSED") updates.completedAt = now;
      if (input.stage === "CANCELLED") updates.cancelledAt = now;
      await db.update(pepprSoJobs).set(updates as any).where(eq(pepprSoJobs.id, input.jobId));
      if (input.stage === "CLOSED") {
        await db.update(pepprSpTickets).set({ status: "CLOSED", closedAt: now }).where(eq(pepprSpTickets.id, job.ticketId));
      }
      return { success: true };
    }),
});
