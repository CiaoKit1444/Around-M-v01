/**
 * tRPC Users Router — Type-safe procedures for user management.
 *
 * Replaces the ky/axios → Express REST flow for users.
 * All procedures use protectedProcedure (Manus OAuth session cookie).
 *
 * Procedures:
 *   users.list       — List users with pagination/search/filter
 *   users.get        — Get a single user by id
 *   users.invite     — Invite a new user
 *   users.update     — Update user profile/role
 *   users.deactivate — Deactivate a user
 *   users.reactivate — Reactivate a user
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { pepprUsers, pepprUserRoles } from "../drizzle/schema";
import { eq, like, and, desc, asc, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

function formatUser(r: any) {
  return {
    id: r.userId,
    user_id: r.userId,
    email: r.email,
    name: r.fullName,
    full_name: r.fullName,
    mobile: r.mobile || null,
    role: r.role,
    position_id: r.positionId || null,
    partner_id: r.partnerId || null,
    property_id: r.propertyId || null,
    email_verified: r.emailVerified,
    status: r.status,
    sso_provider: r.ssoProvider || null,
    last_login_at: r.lastLoginAt?.toISOString() || null,
    last_login: r.lastLoginAt?.toISOString() || null,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  };
}

const paginationInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(20),
  search: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  status: z.string().optional(),
  role: z.string().optional(),
});

// ── Router ───────────────────────────────────────────────────────────────────
export const usersRouter = router({
  /** List users with pagination, search, and filters */
  list: protectedProcedure
    .input(paginationInput)
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [];
      if (input.search) {
        conditions.push(
          or(
            like(pepprUsers.fullName, `%${input.search}%`),
            like(pepprUsers.email, `%${input.search}%`),
          )
        );
      }
      if (input.status) conditions.push(eq(pepprUsers.status, input.status));
      if (input.role) conditions.push(eq(pepprUsers.role, input.role));
      const where =
        conditions.length === 1
          ? conditions[0]
          : conditions.length > 1
          ? and(...conditions)
          : undefined;

      const countResult = await (where
        ? db.select({ count: sql<number>`count(*)` }).from(pepprUsers).where(where)
        : db.select({ count: sql<number>`count(*)` }).from(pepprUsers));
      const total = Number(countResult[0]?.count || 0);

      const orderFn = input.sortOrder === "desc" ? desc : asc;
      const rows = await db
        .select()
        .from(pepprUsers)
        .where(where)
        .orderBy(orderFn(pepprUsers.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      return {
        items: rows.map(formatUser),
        total,
        page: input.page,
        page_size: input.pageSize,
        total_pages: Math.ceil(total / input.pageSize),
      };
    }),

  /** Get a single user by id */
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      // Get roles
      const roles = await db
        .select()
        .from(pepprUserRoles)
        .where(eq(pepprUserRoles.userId, input.id));

      return {
        ...formatUser(rows[0]),
        roles: roles.map((r: any) => ({
          role_id: r.roleId,
          partner_id: r.partnerId || null,
          property_id: r.propertyId || null,
        })),
      };
    }),

  /** Invite a new user */
  invite: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().min(1),
        role: z.string().default("USER"),
        partner_id: z.string().optional(),
        property_id: z.string().optional(),
        role_bindings: z
          .array(
            z.object({
              role: z.string(),
              partner_id: z.string().optional(),
              property_id: z.string().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();

      // Check for duplicate email
      const existing = await db
        .select({ userId: pepprUsers.userId })
        .from(pepprUsers)
        .where(eq(pepprUsers.email, input.email.toLowerCase()))
        .limit(1);
      if (existing[0]) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
      }

      const userId = nanoid(21);
      const tempPassword = nanoid(16);
      const passwordHash = await bcrypt.hash(tempPassword, 12);

      await db.insert(pepprUsers).values({
        userId,
        email: input.email.toLowerCase(),
        passwordHash,
        fullName: input.name,
        role: input.role,
        partnerId: input.partner_id || null,
        propertyId: input.property_id || null,
        status: "ACTIVE",
      });

      // Insert role bindings if provided
      const bindings = input.role_bindings || [
        { role: input.role, partner_id: input.partner_id, property_id: input.property_id },
      ];
      for (const binding of bindings) {
        if (!binding.role) continue;
        await db.insert(pepprUserRoles).values({
          userId,
          roleId: binding.role,
          partnerId: binding.partner_id || null,
          propertyId: binding.property_id || null,
        }).onDuplicateKeyUpdate({ set: { roleId: binding.role } });
      }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, userId))
        .limit(1);
      return formatUser(rows[0]);
    }),

  /** Update user profile / role */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        role: z.string().optional(),
        mobile: z.string().optional(),
        partner_id: z.string().nullable().optional(),
        property_id: z.string().nullable().optional(),
        position_id: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.fullName = input.name;
      if (input.role !== undefined) updates.role = input.role;
      if (input.mobile !== undefined) updates.mobile = input.mobile;
      if (input.partner_id !== undefined) updates.partnerId = input.partner_id;
      if (input.property_id !== undefined) updates.propertyId = input.property_id;
      if (input.position_id !== undefined) updates.positionId = input.position_id;

      if (Object.keys(updates).length > 0) {
        await db.update(pepprUsers).set(updates).where(eq(pepprUsers.userId, input.id));
      }

      const updated = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, input.id))
        .limit(1);
      return formatUser(updated[0]);
    }),

  /** Deactivate a user */
  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      await db
        .update(pepprUsers)
        .set({ status: "INACTIVE" })
        .where(eq(pepprUsers.userId, input.id));
      return formatUser({ ...rows[0], status: "INACTIVE" });
    }),

  /** Reactivate a user */
  reactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, input.id))
        .limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      await db
        .update(pepprUsers)
        .set({ status: "ACTIVE" })
        .where(eq(pepprUsers.userId, input.id));
      return formatUser({ ...rows[0], status: "ACTIVE" });
    }),
});
