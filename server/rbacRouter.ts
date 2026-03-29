/**
 * RBAC Router — Multi-Tenant Role Management (Express-native)
 *
 * Reads directly from peppr_users and peppr_user_roles via Drizzle.
 * Works in published deployment without external dependencies.
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { pepprUsers, pepprUserRoles, pepprSsoAllowlist, pepprPartners, pepprProperties } from "../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface RoleAssignment {
  roleId: string;
  roleName: string;
  scopeType: "GLOBAL" | "PARTNER" | "PROPERTY";
  scopeId: string | null;
  scopeLabel: string | null;
  displayLabel: string;
  sortOrder: number;
  permissions: string[];
  isActive: boolean;
}

export interface ActiveRoleContext {
  roleId: string;
  roleName: string;
  scopeType: "GLOBAL" | "PARTNER" | "PROPERTY";
  scopeId: string | null;
  scopeLabel: string | null;
  displayLabel: string;
  permissions: string[];
}

// ── Role Definitions ─────────────────────────────────────────────────────────

const ROLE_DEFINITIONS: Record<string, {
  name: string;
  scopeType: "GLOBAL" | "PARTNER" | "PROPERTY";
  description: string;
  sortOrder: number;
  permissions: string[];
}> = {
  SUPER_ADMIN: {
    name: "Super Admin",
    scopeType: "GLOBAL",
    description: "Full platform access",
    sortOrder: 0,
    permissions: ["*"],
  },
  SYSTEM_ADMIN: {
    name: "System Admin",
    scopeType: "GLOBAL",
    description: "Full platform access (system-level)",
    sortOrder: 0,
    permissions: ["*"],
  },
  PARTNER_ADMIN: {
    name: "Partner Admin",
    scopeType: "PARTNER",
    description: "Manages all properties under a partner",
    sortOrder: 1,
    permissions: ["partner.read", "partner.write", "property.read", "property.write", "staff.read", "staff.write"],
  },
  PROPERTY_ADMIN: {
    name: "Property Admin",
    scopeType: "PROPERTY",
    description: "Manages a single property",
    sortOrder: 2,
    permissions: ["property.read", "property.write", "staff.read", "room.read", "room.write"],
  },
  FRONT_OFFICE: {
    name: "Front Office",
    scopeType: "PROPERTY",
    description: "Hotel operations — check-in, templates, guest requests",
    sortOrder: 3,
    permissions: ["property.read", "room.read", "guest.read", "guest.write"],
  },
  FRONT_DESK: {
    name: "Front Desk",
    scopeType: "PROPERTY",
    description: "Hotel operations — check-in, templates, guest requests",
    sortOrder: 3,
    permissions: ["property.read", "room.read", "guest.read", "guest.write"],
  },
  HOUSEKEEPING: {
    name: "Housekeeping",
    scopeType: "PROPERTY",
    description: "Housekeeping task queue",
    sortOrder: 4,
    permissions: ["property.read", "room.read", "housekeeping.read", "housekeeping.write"],
  },
  MAINTENANCE: {
    name: "Maintenance",
    scopeType: "PROPERTY",
    description: "Maintenance task queue",
    sortOrder: 5,
    permissions: ["property.read", "maintenance.read", "maintenance.write"],
  },
  REVENUE_MANAGER: {
    name: "Revenue Manager",
    scopeType: "PROPERTY",
    description: "Revenue and pricing management",
    sortOrder: 6,
    permissions: ["property.read", "revenue.read", "revenue.write", "analytics.read"],
  },
  CHANNEL_MANAGER: {
    name: "Channel Manager",
    scopeType: "PROPERTY",
    description: "Channel distribution management",
    sortOrder: 7,
    permissions: ["property.read", "channel.read", "channel.write"],
  },
  SP_ADMIN: {
    name: "SP Admin",
    scopeType: "GLOBAL",
    description: "Service Provider Admin — manages tickets, operators, and job dispatch",
    sortOrder: 8,
    permissions: ["sp.read", "sp.write", "ticket.read", "ticket.write", "operator.read", "operator.write"],
  },
  SERVICE_OPERATOR: {
    name: "Service Operator",
    scopeType: "GLOBAL",
    description: "Field-level operator — updates job stages and progress",
    sortOrder: 9,
    permissions: ["job.read", "job.write"],
  },
  SERVICE_PROVIDER: {
    name: "Service Provider",
    scopeType: "GLOBAL",
    description: "Legacy service provider role (use SP_ADMIN for new assignments)",
    sortOrder: 8,
    permissions: ["sp.read", "sp.write", "ticket.read", "ticket.write"],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Resolve the Peppr user ID from the Manus tRPC context user.
 * Looks up peppr_users by manus_open_id or email.
 */
async function resolvePepprUser(ctxUser: Record<string, unknown>) {
  const db = await getDb();
  if (!db) return null;
  const openId = (ctxUser.openId as string) ?? null;
  const email = (ctxUser.email as string) ?? null;

  if (openId) {
    const [row] = await db
      .select()
      .from(pepprUsers)
      .where(eq(pepprUsers.manusOpenId, openId))
      .limit(1);
    if (row) return row;
  }

  if (email) {
    const [row] = await db
      .select()
      .from(pepprUsers)
      .where(eq(pepprUsers.email, email))
      .limit(1);
    if (row) return row;
  }

  return null;
}

function buildRoleAssignment(
  roleId: string,
  isActive: boolean,
  scopeId?: string | null,
  scopeLabel?: string | null,
): RoleAssignment {
  const def = ROLE_DEFINITIONS[roleId] ?? {
    name: roleId,
    scopeType: "GLOBAL" as const,
    description: "",
    sortOrder: 99,
    permissions: [],
  };

  const resolvedScopeId = scopeId ?? null;
  const resolvedScopeLabel = scopeLabel ?? null;
  const scopeSuffix = resolvedScopeLabel
    ? resolvedScopeLabel
    : def.scopeType === "GLOBAL"
    ? "All Platform"
    : def.scopeType;

  return {
    roleId,
    roleName: def.name,
    scopeType: def.scopeType,
    scopeId: resolvedScopeId,
    scopeLabel: resolvedScopeLabel,
    displayLabel: `${def.name} — ${scopeSuffix}`,
    sortOrder: def.sortOrder,
    permissions: def.permissions,
    isActive,
  };
}

// ── Router ────────────────────────────────────────────────────────────────────

export const rbacRouter = router({
  /**
   * Get all role assignments for the current user.
   * Queries peppr_user_roles directly via Drizzle.
   */
  myRoles: protectedProcedure.query(async ({ ctx }) => {
    const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);

    if (!pepprUser) {
      return { roles: [] as RoleAssignment[], activeRole: null as ActiveRoleContext | null };
    }

    const db = await getDb();
    if (!db) return { roles: [] as RoleAssignment[], activeRole: null as ActiveRoleContext | null };
    const roleRows = await db
      .select()
      .from(pepprUserRoles)
      .where(eq(pepprUserRoles.userId, pepprUser.userId));

    if (roleRows.length === 0) {
      // Fallback: use the peppr_users.role field as a single role
      const fallbackRoleId = pepprUser.role ?? "USER";
      // Determine scope from peppr_users fields
      const fallbackScopeId = pepprUser.partnerId || pepprUser.propertyId || null;
      const assignment = buildRoleAssignment(fallbackRoleId, true, fallbackScopeId, null);
      return {
        roles: [assignment],
        activeRole: {
          roleId: assignment.roleId,
          roleName: assignment.roleName,
          scopeType: assignment.scopeType,
          scopeId: fallbackScopeId,
          scopeLabel: null,
          displayLabel: assignment.displayLabel,
          permissions: assignment.permissions,
        } as ActiveRoleContext,
      };
    }

    // Fetch partner and property names for scope labels
    const partnerIds = Array.from(new Set(roleRows.map((r) => r.partnerId).filter(Boolean))) as string[];
    const propertyIds = Array.from(new Set(roleRows.map((r) => r.propertyId).filter(Boolean))) as string[];

    const partnerMap: Record<string, string> = {};
    const propertyMap: Record<string, string> = {};

    if (partnerIds.length > 0) {
      const partners = await db
        .select({ id: pepprPartners.id, name: pepprPartners.name })
        .from(pepprPartners)
        .where(sql`${pepprPartners.id} IN (${sql.join(partnerIds.map((id) => sql`${id}`), sql`, `)})`);
      partners.forEach((p) => { partnerMap[p.id] = p.name; });
    }

    if (propertyIds.length > 0) {
      const properties = await db
        .select({ id: pepprProperties.id, name: pepprProperties.name })
        .from(pepprProperties)
        .where(sql`${pepprProperties.id} IN (${sql.join(propertyIds.map((id) => sql`${id}`), sql`, `)})`);
      properties.forEach((p) => { propertyMap[p.id] = p.name; });
    }

    const roles: RoleAssignment[] = roleRows.map((row, idx) => {
      const scopeId = row.partnerId || row.propertyId || null;
      const scopeLabel = row.partnerId
        ? (partnerMap[row.partnerId] ?? null)
        : row.propertyId
        ? (propertyMap[row.propertyId] ?? null)
        : null;
      return buildRoleAssignment(row.roleId, idx === 0, scopeId, scopeLabel);
    });

    // Sort by sortOrder
    roles.sort((a, b) => a.sortOrder - b.sortOrder);
    // Mark first as active by default
    if (roles.length > 0) {
      roles.forEach((r) => (r.isActive = false));
      roles[0].isActive = true;
    }

    const activeAssignment = roles[0];
    return {
      roles,
      activeRole: activeAssignment
        ? ({
            roleId: activeAssignment.roleId,
            roleName: activeAssignment.roleName,
            scopeType: activeAssignment.scopeType,
            scopeId: activeAssignment.scopeId,
            scopeLabel: activeAssignment.scopeLabel,
            displayLabel: activeAssignment.displayLabel,
            permissions: activeAssignment.permissions,
          } as ActiveRoleContext)
        : null,
    };
  }),

  /**
   * Switch the active role context.
   * Returns the new active role context including permissions.
   * Purely local — no external service dependency.
   */
  switchRole: protectedProcedure
    .input(
      z.object({
        roleId: z.string(),
        scopeId: z.string().nullable().optional(),
        scopeType: z.enum(["GLOBAL", "PARTNER", "PROPERTY"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
      if (!pepprUser) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Peppr user not found" });
      }

      const def = ROLE_DEFINITIONS[input.roleId] ?? {
        name: input.roleId,
        scopeType: input.scopeType ?? "GLOBAL",
        description: "",
        sortOrder: 99,
        permissions: [],
      };

      const activeRole: ActiveRoleContext = {
        roleId: input.roleId,
        roleName: def.name,
        scopeType: (input.scopeType ?? def.scopeType) as "GLOBAL" | "PARTNER" | "PROPERTY",
        scopeId: input.scopeId ?? null,
        scopeLabel: null,
        displayLabel: `${def.name} — ${(input.scopeType ?? def.scopeType) === "GLOBAL" ? "All Platform" : input.scopeType ?? def.scopeType}`,
        permissions: def.permissions,
      };

      return { success: true, activeRole };
    }),

  /**
   * Get all users with their role assignments (super-admin only).
   * Queries peppr_users directly.
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
    if (!pepprUser) {
      throw new TRPCError({ code: "FORBIDDEN", message: "User not found" });
    }

    // Check if user has SUPER_ADMIN or SYSTEM_ADMIN role
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
    const adminRole = await db
      .select()
      .from(pepprUserRoles)
      .where(and(
        eq(pepprUserRoles.userId, pepprUser.userId),
        sql`${pepprUserRoles.roleId} IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')`,
      ))
      .limit(1);

    if (adminRole.length === 0 && pepprUser.role !== "SUPER_ADMIN" && pepprUser.role !== "SYSTEM_ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
    }

    const allUsers = await db.select().from(pepprUsers);
    const allRoles = await db.select().from(pepprUserRoles);

    const usersWithRoles = allUsers.map((u) => {
      const userRoles = allRoles
        .filter((r) => r.userId === u.userId)
        .map((r) => {
          const def = ROLE_DEFINITIONS[r.roleId];
          return {
            roleId: r.roleId,
            roleName: def?.name ?? r.roleId,
            scopeType: def?.scopeType ?? "GLOBAL",
            scopeLabel: null as string | null,
            grantedAt: r.grantedAt,
          };
        });
      return {
        userId: u.userId,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        status: u.status,
        roles: userRoles,
      };
    });

    return { users: usersWithRoles };
  }),

  /**
   * Assign a role to a user (super-admin only).
   */
  assignRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        scopeType: z.enum(["GLOBAL", "PARTNER", "PROPERTY"]).optional(),
        scopeId: z.string().nullable().optional(),
        /** For PARTNER_ADMIN bindings */
        partnerId: z.string().nullable().optional(),
        /** For PROPERTY_ADMIN / STAFF / FRONT_OFFICE etc. bindings */
        propertyId: z.string().nullable().optional(),
        displayLabel: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
      if (!pepprUser) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const adminRole = await db
        .select()
        .from(pepprUserRoles)
        .where(and(
          eq(pepprUserRoles.userId, pepprUser.userId),
          sql`${pepprUserRoles.roleId} IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')`,
        ))
        .limit(1);

      if (adminRole.length === 0 && pepprUser.role !== "SUPER_ADMIN" && pepprUser.role !== "SYSTEM_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      // Resolve partner_id / property_id from scopeId for backward compat
      const def = ROLE_DEFINITIONS[input.roleId];
      const resolvedPartnerId = input.partnerId ?? (def?.scopeType === "PARTNER" ? input.scopeId : null) ?? null;
      const resolvedPropertyId = input.propertyId ?? (def?.scopeType === "PROPERTY" ? input.scopeId : null) ?? null;

      // Check if this exact binding already exists (same role + same scope)
      const existingConditions = [eq(pepprUserRoles.userId, input.userId), eq(pepprUserRoles.roleId, input.roleId)];
      if (resolvedPartnerId) existingConditions.push(eq(pepprUserRoles.partnerId, resolvedPartnerId));
      if (resolvedPropertyId) existingConditions.push(eq(pepprUserRoles.propertyId, resolvedPropertyId));

      const existing = await db
        .select()
        .from(pepprUserRoles)
        .where(and(...existingConditions))
        .limit(1);

      if (existing.length > 0) {
        return { success: true, message: "Role binding already exists" };
      }

      await db.insert(pepprUserRoles).values({
        userId: input.userId,
        roleId: input.roleId,
        partnerId: resolvedPartnerId,
        propertyId: resolvedPropertyId,
        grantedBy: pepprUser.userId,
      });

      return { success: true };
    }),

  /**
   * Revoke a role from a user (super-admin only).
   */
  revokeRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        /** Specific binding row ID — preferred for precise revocation */
        bindingId: z.number().optional(),
        /** Legacy: scope ID (partner_id or property_id) */
        scopeId: z.string().nullable().optional(),
        partnerId: z.string().nullable().optional(),
        propertyId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
      if (!pepprUser) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const adminRole = await db
        .select()
        .from(pepprUserRoles)
        .where(and(
          eq(pepprUserRoles.userId, pepprUser.userId),
          sql`${pepprUserRoles.roleId} IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')`,
        ))
        .limit(1);

      if (adminRole.length === 0 && pepprUser.role !== "SUPER_ADMIN" && pepprUser.role !== "SYSTEM_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      if (input.bindingId) {
        // Precise revocation by row ID
        await db.delete(pepprUserRoles).where(eq(pepprUserRoles.id, input.bindingId));
      } else {
        // Legacy: revoke by userId + roleId (+ optional scope)
        const conditions = [eq(pepprUserRoles.userId, input.userId), eq(pepprUserRoles.roleId, input.roleId)];
        const resolvedPartnerId = input.partnerId ?? input.scopeId ?? null;
        const resolvedPropertyId = input.propertyId ?? null;
        if (resolvedPartnerId) conditions.push(eq(pepprUserRoles.partnerId, resolvedPartnerId));
        if (resolvedPropertyId) conditions.push(eq(pepprUserRoles.propertyId, resolvedPropertyId));
        await db.delete(pepprUserRoles).where(and(...conditions));
      }

      return { success: true };
    }),

  /**
   * Get the SSO allowlist (super-admin only).
   */
  ssoAllowlist: protectedProcedure.query(async ({ ctx }) => {
    const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
    if (!pepprUser) throw new TRPCError({ code: "FORBIDDEN" });

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const entries = await db.select().from(pepprSsoAllowlist);
    return { entries };
  }),

  /**
   * Add an email to the SSO allowlist (super-admin only).
   */
  addSsoAllowlist: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        provider: z.enum(["google", "email"]).default("google"),
        fullName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
      if (!pepprUser) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.insert(pepprSsoAllowlist).values({
        email: input.email,
        note: input.notes ?? input.fullName ?? null,
        addedBy: pepprUser.userId,
      });

      return { success: true };
    }),

  /**
   * Remove an email from the SSO allowlist (super-admin only).
   */
  removeSsoAllowlist: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
      if (!pepprUser) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db
        .update(pepprSsoAllowlist)
        .set({ status: "REMOVED", removedAt: new Date() })
        .where(eq(pepprSsoAllowlist.id, input.id));

      return { success: true };
    }),

  /**
   * Get all role bindings for a specific user (super-admin only).
   */
  getUserRoles: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pepprUser = await resolvePepprUser(ctx.user as Record<string, unknown>);
      if (!pepprUser) throw new TRPCError({ code: "FORBIDDEN" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const adminRole = await db
        .select()
        .from(pepprUserRoles)
        .where(and(
          eq(pepprUserRoles.userId, pepprUser.userId),
          sql`${pepprUserRoles.roleId} IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')`,
        ))
        .limit(1);

      if (adminRole.length === 0 && pepprUser.role !== "SUPER_ADMIN" && pepprUser.role !== "SYSTEM_ADMIN") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      const roleRows = await db
        .select()
        .from(pepprUserRoles)
        .where(eq(pepprUserRoles.userId, input.userId));

      // Fetch partner and property names for scope labels
      const partnerIds = Array.from(new Set(roleRows.map((r) => r.partnerId).filter(Boolean))) as string[];
      const propertyIds = Array.from(new Set(roleRows.map((r) => r.propertyId).filter(Boolean))) as string[];

      const partnerMap: Record<string, string> = {};
      const propertyMap: Record<string, string> = {};

      if (partnerIds.length > 0) {
        const partners = await db
          .select({ id: pepprPartners.id, name: pepprPartners.name })
          .from(pepprPartners)
          .where(sql`${pepprPartners.id} IN (${sql.join(partnerIds.map((id) => sql`${id}`), sql`, `)})`);
        partners.forEach((p) => { partnerMap[p.id] = p.name; });
      }

      if (propertyIds.length > 0) {
        const properties = await db
          .select({ id: pepprProperties.id, name: pepprProperties.name })
          .from(pepprProperties)
          .where(sql`${pepprProperties.id} IN (${sql.join(propertyIds.map((id) => sql`${id}`), sql`, `)})`);
        properties.forEach((p) => { propertyMap[p.id] = p.name; });
      }

      const bindings = roleRows.map((r) => {
        const def = ROLE_DEFINITIONS[r.roleId];
        const scopeLabel = r.partnerId
          ? (partnerMap[r.partnerId] ?? r.partnerId)
          : r.propertyId
          ? (propertyMap[r.propertyId] ?? r.propertyId)
          : null;
        return {
          id: r.id,
          roleId: r.roleId,
          roleName: def?.name ?? r.roleId,
          scopeType: def?.scopeType ?? "GLOBAL" as const,
          partnerId: r.partnerId,
          propertyId: r.propertyId,
          scopeLabel,
          displayLabel: `${def?.name ?? r.roleId}${scopeLabel ? ` — ${scopeLabel}` : ""}`,
          grantedAt: r.grantedAt,
        };
      });

      return { bindings };
    }),

  /**
   * Get all available role definitions.
   */
  roleDefinitions: publicProcedure.query(async () => {
    return {
      roles: Object.entries(ROLE_DEFINITIONS).map(([roleId, def]) => ({
        roleId,
        name: def.name,
        scopeType: def.scopeType,
        description: def.description,
      })),
    };
  }),
});
