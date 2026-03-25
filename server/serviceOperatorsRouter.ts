/**
 * serviceOperatorsRouter — SP Admin manages Service Operator roster
 * and SOs query their own jobs.
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { pepprServiceOperators, pepprSoJobs } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { nanoid } from "nanoid";

export const serviceOperatorsRouter = router({
  listByProvider: protectedProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(pepprServiceOperators)
        .where(eq(pepprServiceOperators.providerId, input.providerId))
        .orderBy(desc(pepprServiceOperators.createdAt));
    }),

  createOperator: protectedProcedure
    .input(z.object({
      providerId: z.string(),
      userId: z.string(),
      displayName: z.string().min(1),
      specialisation: z.enum(["GENERAL", "TRANSPORT", "IN_ROOM", "MAINTENANCE"]).default("GENERAL"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const id = nanoid();
      await db.insert(pepprServiceOperators).values({
        id,
        providerId: input.providerId,
        userId: input.userId,
        displayName: input.displayName,
        specialisation: input.specialisation,
        status: "ACTIVE",
      });
      return { id };
    }),

  updateOperator: protectedProcedure
    .input(z.object({
      operatorId: z.string(),
      displayName: z.string().min(1).optional(),
      specialisation: z.enum(["GENERAL", "TRANSPORT", "IN_ROOM", "MAINTENANCE"]).optional(),
      status: z.enum(["ACTIVE", "INACTIVE", "ON_DUTY", "OFF_DUTY"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      const updates: Record<string, unknown> = {};
      if (input.displayName !== undefined) updates.displayName = input.displayName;
      if (input.specialisation !== undefined) updates.specialisation = input.specialisation;
      if (input.status !== undefined) updates.status = input.status;
      await db.update(pepprServiceOperators).set(updates as any).where(eq(pepprServiceOperators.id, input.operatorId));
      return { success: true };
    }),

  deleteOperator: protectedProcedure
    .input(z.object({ operatorId: z.string() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
      await db.update(pepprServiceOperators)
        .set({ status: "INACTIVE" })
        .where(eq(pepprServiceOperators.id, input.operatorId));
      return { success: true };
    }),

  getMyJobs: protectedProcedure
    .input(z.object({ operatorId: z.string(), limit: z.number().int().min(1).max(100).default(50) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { items: [] };
      const rows = await db.select().from(pepprSoJobs)
        .where(eq(pepprSoJobs.operatorId, input.operatorId))
        .orderBy(desc(pepprSoJobs.assignedAt))
        .limit(input.limit);
      return { items: rows };
    }),

  getJob: protectedProcedure
    .input(z.object({ jobId: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      const [job] = await db.select().from(pepprSoJobs).where(eq(pepprSoJobs.id, input.jobId));
      return job ?? null;
    }),
});
