/**
 * tRPC Staff Router — Type-safe procedures for staff management.
 *
 * Replaces the ky/axios → Express REST flow for staff positions and members.
 * All procedures use protectedProcedure (Manus OAuth session cookie).
 *
 * Procedures:
 *   staff.listPositions   — List staff positions
 *   staff.getPosition     — Get a single position
 *   staff.createPosition  — Create a new position
 *   staff.updatePosition  — Update a position
 *   staff.listMembers     — List staff members
 *   staff.getMember       — Get a single member
 *   staff.assignMember    — Assign a user to a position/property
 *   staff.updateMember    — Update a staff member
 *   staff.deactivateMember — Deactivate a staff member
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { pepprStaffPositions, pepprStaffMembers, pepprUsers, pepprProperties } from "../drizzle/schema";
import { eq, like, and, desc, asc, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

function generateId(): string {
  return nanoid(21);
}

const paginationInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
  search: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// ── Router ───────────────────────────────────────────────────────────────────
export const staffRouter = router({
  // ── Positions ──────────────────────────────────────────────────────────────

  /** List staff positions */
  listPositions: protectedProcedure
    .input(
      paginationInput.extend({
        department: z.string().optional(),
        property_id: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.search) conditions.push(like(pepprStaffPositions.title, `%${input.search}%`));
      if (input.department) conditions.push(eq(pepprStaffPositions.department, input.department));
      if (input.property_id) conditions.push(eq(pepprStaffPositions.propertyId, input.property_id));
      const where =
        conditions.length === 1
          ? conditions[0]
          : conditions.length > 1
          ? and(...conditions)
          : undefined;

      const countResult = await (where
        ? db.select({ count: sql<number>`count(*)` }).from(pepprStaffPositions).where(where)
        : db.select({ count: sql<number>`count(*)` }).from(pepprStaffPositions));
      const total = Number(countResult[0]?.count || 0);

      const orderFn = input.sortOrder === "desc" ? desc : asc;
      const rows = await db
        .select()
        .from(pepprStaffPositions)
        .where(where)
        .orderBy(orderFn(pepprStaffPositions.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      // Count members per position
      const memberCounts = await db
        .select({ positionId: pepprStaffMembers.positionId, count: sql<number>`count(*)` })
        .from(pepprStaffMembers)
        .groupBy(pepprStaffMembers.positionId);
      const countMap = new Map(memberCounts.map((r: any) => [r.positionId, Number(r.count)]));

      return {
        items: rows.map((r: any) => ({
          id: r.id,
          title: r.title,
          department: r.department,
          property_id: r.propertyId || null,
          members_count: countMap.get(r.id) || 0,
          status: r.status,
          created_at: r.createdAt?.toISOString(),
          updated_at: r.updatedAt?.toISOString(),
        })),
        total,
        page: input.page,
        page_size: input.pageSize,
        total_pages: Math.ceil(total / input.pageSize),
      };
    }),

  /** Get a single position by id */
  getPosition: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprStaffPositions)
        .where(eq(pepprStaffPositions.id, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Position not found" });
      const memberCount = Number(
        (
          await db
            .select({ count: sql<number>`count(*)` })
            .from(pepprStaffMembers)
            .where(eq(pepprStaffMembers.positionId, input.id))
        )[0]?.count || 0
      );
      const r = rows[0];
      return {
        id: r.id,
        title: r.title,
        department: r.department,
        property_id: r.propertyId || null,
        members_count: memberCount,
        status: r.status,
        created_at: r.createdAt?.toISOString(),
        updated_at: r.updatedAt?.toISOString(),
      };
    }),

  /** Create a new staff position */
  createPosition: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        department: z.string().min(1),
        property_id: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = generateId();
      await db.insert(pepprStaffPositions).values({
        id,
        title: input.title,
        department: input.department,
        propertyId: input.property_id || null,
      });
      const rows = await db
        .select()
        .from(pepprStaffPositions)
        .where(eq(pepprStaffPositions.id, id))
        .limit(1);
      const r = rows[0];
      return {
        id: r.id,
        title: r.title,
        department: r.department,
        property_id: r.propertyId || null,
        members_count: 0,
        status: r.status,
        created_at: r.createdAt?.toISOString(),
        updated_at: r.updatedAt?.toISOString(),
      };
    }),

  /** Update a staff position */
  updatePosition: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        department: z.string().optional(),
        property_id: z.string().nullable().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprStaffPositions)
        .where(eq(pepprStaffPositions.id, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Position not found" });

      const updates: Record<string, any> = {};
      if (input.title !== undefined) updates.title = input.title;
      if (input.department !== undefined) updates.department = input.department;
      if (input.property_id !== undefined) updates.propertyId = input.property_id;
      if (input.status !== undefined) updates.status = input.status;

      if (Object.keys(updates).length > 0) {
        await db
          .update(pepprStaffPositions)
          .set(updates)
          .where(eq(pepprStaffPositions.id, input.id));
      }

      const updated = await db
        .select()
        .from(pepprStaffPositions)
        .where(eq(pepprStaffPositions.id, input.id))
        .limit(1);
      const r = updated[0];
      return {
        id: r.id,
        title: r.title,
        department: r.department,
        property_id: r.propertyId || null,
        status: r.status,
        created_at: r.createdAt?.toISOString(),
        updated_at: r.updatedAt?.toISOString(),
      };
    }),

  // ── Members ────────────────────────────────────────────────────────────────

  /** List staff members with user and position info */
  listMembers: protectedProcedure
    .input(
      paginationInput.extend({
        property_id: z.string().optional(),
        position_id: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.property_id) conditions.push(eq(pepprStaffMembers.propertyId, input.property_id));
      if (input.position_id) conditions.push(eq(pepprStaffMembers.positionId, input.position_id));
      if (input.status) conditions.push(eq(pepprStaffMembers.status, input.status));
      const where =
        conditions.length === 1
          ? conditions[0]
          : conditions.length > 1
          ? and(...conditions)
          : undefined;

      const countResult = await (where
        ? db.select({ count: sql<number>`count(*)` }).from(pepprStaffMembers).where(where)
        : db.select({ count: sql<number>`count(*)` }).from(pepprStaffMembers));
      const total = Number(countResult[0]?.count || 0);

      const orderFn = input.sortOrder === "desc" ? desc : asc;
      const rows = await db
        .select()
        .from(pepprStaffMembers)
        .where(where)
        .orderBy(orderFn(pepprStaffMembers.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      // Enrich with user and position info
      const userIds = Array.from(new Set(rows.map((r: any) => r.userId)));
      const positionIds = Array.from(new Set(rows.map((r: any) => r.positionId)));
      const propertyIds = Array.from(new Set(rows.map((r: any) => r.propertyId)));

      const userMap = new Map<string, any>();
      if (userIds.length > 0) {
        const userRows = await db
          .select({ userId: pepprUsers.userId, fullName: pepprUsers.fullName, email: pepprUsers.email })
          .from(pepprUsers)
          .where(or(...userIds.map((id: string) => eq(pepprUsers.userId, id))));
        userRows.forEach((r: any) => userMap.set(r.userId, r));
      }

      const positionMap = new Map<string, any>();
      if (positionIds.length > 0) {
        const posRows = await db
          .select({ id: pepprStaffPositions.id, title: pepprStaffPositions.title, department: pepprStaffPositions.department })
          .from(pepprStaffPositions)
          .where(or(...positionIds.map((id: string) => eq(pepprStaffPositions.id, id))));
        posRows.forEach((r: any) => positionMap.set(r.id, r));
      }

      const propertyMap = new Map<string, any>();
      if (propertyIds.length > 0) {
        const propRows = await db
          .select({ id: pepprProperties.id, name: pepprProperties.name })
          .from(pepprProperties)
          .where(or(...propertyIds.map((id: string) => eq(pepprProperties.id, id))));
        propRows.forEach((r: any) => propertyMap.set(r.id, r));
      }

      return {
        items: rows.map((r: any) => ({
          id: r.id,
          user_id: r.userId,
          position_id: r.positionId,
          property_id: r.propertyId,
          status: r.status,
          user_name: userMap.get(r.userId)?.fullName || null,
          user_email: userMap.get(r.userId)?.email || null,
          position_title: positionMap.get(r.positionId)?.title || null,
          department: positionMap.get(r.positionId)?.department || null,
          property_name: propertyMap.get(r.propertyId)?.name || null,
          created_at: r.createdAt?.toISOString(),
          updated_at: r.updatedAt?.toISOString(),
        })),
        total,
        page: input.page,
        page_size: input.pageSize,
        total_pages: Math.ceil(total / input.pageSize),
      };
    }),

  /** Get a single staff member by id */
  getMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprStaffMembers)
        .where(eq(pepprStaffMembers.id, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });
      const r = rows[0];

      const userRows = await db
        .select({ fullName: pepprUsers.fullName, email: pepprUsers.email, mobile: pepprUsers.mobile })
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, r.userId))
        .limit(1);
      const posRows = await db
        .select({ title: pepprStaffPositions.title, department: pepprStaffPositions.department })
        .from(pepprStaffPositions)
        .where(eq(pepprStaffPositions.id, r.positionId))
        .limit(1);
      const propRows = await db
        .select({ name: pepprProperties.name })
        .from(pepprProperties)
        .where(eq(pepprProperties.id, r.propertyId))
        .limit(1);

      return {
        id: r.id,
        user_id: r.userId,
        position_id: r.positionId,
        property_id: r.propertyId,
        status: r.status,
        user_name: userRows[0]?.fullName || null,
        user_email: userRows[0]?.email || null,
        user_mobile: userRows[0]?.mobile || null,
        position_title: posRows[0]?.title || null,
        department: posRows[0]?.department || null,
        property_name: propRows[0]?.name || null,
        created_at: r.createdAt?.toISOString(),
        updated_at: r.updatedAt?.toISOString(),
      };
    }),

  /** Assign a user to a position at a property */
  assignMember: protectedProcedure
    .input(
      z.object({
        user_id: z.string(),
        position_id: z.string(),
        property_id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const id = generateId();
      await db.insert(pepprStaffMembers).values({
        id,
        userId: input.user_id,
        positionId: input.position_id,
        propertyId: input.property_id,
      });
      const rows = await db
        .select()
        .from(pepprStaffMembers)
        .where(eq(pepprStaffMembers.id, id))
        .limit(1);
      return { id: rows[0].id, user_id: rows[0].userId, position_id: rows[0].positionId, property_id: rows[0].propertyId, status: rows[0].status };
    }),

  /** Update a staff member */
  updateMember: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        position_id: z.string().optional(),
        property_id: z.string().optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprStaffMembers)
        .where(eq(pepprStaffMembers.id, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Staff member not found" });

      const updates: Record<string, any> = {};
      if (input.position_id !== undefined) updates.positionId = input.position_id;
      if (input.property_id !== undefined) updates.propertyId = input.property_id;
      if (input.status !== undefined) updates.status = input.status;

      if (Object.keys(updates).length > 0) {
        await db.update(pepprStaffMembers).set(updates).where(eq(pepprStaffMembers.id, input.id));
      }

      const updated = await db
        .select()
        .from(pepprStaffMembers)
        .where(eq(pepprStaffMembers.id, input.id))
        .limit(1);
      const r = updated[0];
      return { id: r.id, user_id: r.userId, position_id: r.positionId, property_id: r.propertyId, status: r.status };
    }),

  /** Deactivate a staff member */
  deactivateMember: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      await db
        .update(pepprStaffMembers)
        .set({ status: "inactive" })
        .where(eq(pepprStaffMembers.id, input.id));
      return { success: true };
    }),
});
