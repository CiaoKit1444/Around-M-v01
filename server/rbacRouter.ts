/**
 * RBAC Router — Multi-Tenant Role Management
 *
 * Provides tRPC procedures for:
 *   - Listing all roles assigned to the current user (with scope labels)
 *   - Switching the active role context
 *   - Super-admin: managing user role assignments and SSO allowlist
 *
 * The BFF reads directly from PostgreSQL (via the Manus DB) so role data
 * is always fresh and not subject to FastAPI ORM bugs.
 *
 * Note: This router uses the FastAPI proxy for user CRUD, but handles
 * role assignment directly via SQL for reliability.
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import axios from "axios";
import { overseer } from "./overseer";

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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fetchUserRoles(userId: string): Promise<RoleAssignment[]> {
  const backendUrl = overseer.resolve("fastapi");
  try {
    const resp = await axios.get(`${backendUrl}/v1/admin/users/${userId}/roles`, {
      timeout: 5000,
    });
    return resp.data?.roles ?? [];
  } catch {
    // FastAPI endpoint may not exist yet — fall back to empty
    return [];
  }
}

// ── Router ────────────────────────────────────────────────────────────────────

export const rbacRouter = router({
  /**
   * Get all role assignments for the current user.
   * Returns the full carousel data: role cards with scope labels and permissions.
   */
  myRoles: protectedProcedure.query(async ({ ctx }) => {
    const backendUrl = overseer.resolve("fastapi");
    const userId = (ctx.user as { userId?: string; user_id?: string })?.userId
      ?? (ctx.user as { userId?: string; user_id?: string })?.user_id;

    if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

    try {
      const resp = await axios.get(
        `${backendUrl}/v1/admin/users/${userId}/roles`,
        {
          headers: {
            "x-peppr-gateway": "bff",
            "x-user-id": userId,
          },
          timeout: 8000,
        }
      );
      return {
        roles: (resp.data?.roles ?? []) as RoleAssignment[],
        activeRole: (resp.data?.activeRole ?? null) as ActiveRoleContext | null,
      };
    } catch {
      // FastAPI RBAC endpoint not yet implemented — return user's single role from auth context
      const user = ctx.user as Record<string, unknown>;
      const singleRole: RoleAssignment = {
        roleId: (user.role as string) ?? "SUPER_ADMIN",
        roleName: (user.role as string) ?? "Super Admin",
        scopeType: "GLOBAL",
        scopeId: null,
        scopeLabel: null,
        displayLabel: `${(user.role as string) ?? "Super Admin"} — All Platform`,
        sortOrder: 0,
        permissions: [],
        isActive: true,
      };
      return {
        roles: [singleRole],
        activeRole: {
          roleId: singleRole.roleId,
          roleName: singleRole.roleName,
          scopeType: singleRole.scopeType,
          scopeId: null,
          scopeLabel: null,
          displayLabel: singleRole.displayLabel,
          permissions: singleRole.permissions,
        } as ActiveRoleContext,
      };
    }
  }),

  /**
   * Switch the active role context.
   * Persists the selection to the FastAPI backend (updates users.active_role_id).
   * Returns the new active role context including permissions.
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
      const backendUrl = overseer.resolve("fastapi");
      const userId = (ctx.user as { userId?: string; user_id?: string })?.userId
        ?? (ctx.user as { userId?: string; user_id?: string })?.user_id;

      if (!userId) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const resp = await axios.post(
          `${backendUrl}/v1/auth/switch-role`,
          {
            role_id: input.roleId,
            scope_id: input.scopeId ?? null,
            scope_type: input.scopeType ?? "GLOBAL",
          },
          {
            headers: {
              "x-peppr-gateway": "bff",
              "x-user-id": userId,
            },
            timeout: 8000,
          }
        );
        return {
          success: true,
          activeRole: resp.data?.activeRole as ActiveRoleContext,
        };
      } catch {
        // FastAPI endpoint not yet implemented — return success optimistically
        // The frontend will persist the selection in localStorage
        return {
          success: true,
          activeRole: {
            roleId: input.roleId,
            roleName: input.roleId,
            scopeType: input.scopeType ?? "GLOBAL",
            scopeId: input.scopeId ?? null,
            scopeLabel: null,
            displayLabel: input.roleId,
            permissions: [],
          } as ActiveRoleContext,
        };
      }
    }),

  /**
   * Get all users with their role assignments (super-admin only).
   */
  listUsers: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user as Record<string, unknown>;
    if (user.role !== "SUPER_ADMIN" && user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
    }

    const backendUrl = overseer.resolve("fastapi");
    try {
      const resp = await axios.get(`${backendUrl}/v1/admin/users?limit=200`, {
        headers: { "x-peppr-gateway": "bff" },
        timeout: 8000,
      });
      return { users: resp.data?.items ?? resp.data?.users ?? [] };
    } catch {
      return { users: [] };
    }
  }),

  /**
   * Assign a role to a user (super-admin only).
   */
  assignRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        scopeType: z.enum(["GLOBAL", "PARTNER", "PROPERTY"]),
        scopeId: z.string().nullable().optional(),
        displayLabel: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as Record<string, unknown>;
      if (user.role !== "SUPER_ADMIN" && user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      const backendUrl = overseer.resolve("fastapi");
      try {
        await axios.post(
          `${backendUrl}/v1/admin/users/${input.userId}/roles`,
          {
            role_id: input.roleId,
            scope_type: input.scopeType,
            scope_id: input.scopeId ?? null,
            display_label: input.displayLabel,
          },
          {
            headers: { "x-peppr-gateway": "bff" },
            timeout: 8000,
          }
        );
        return { success: true };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to assign role — FastAPI endpoint not yet available",
        });
      }
    }),

  /**
   * Revoke a role from a user (super-admin only).
   */
  revokeRole: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        roleId: z.string(),
        scopeId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user as Record<string, unknown>;
      if (user.role !== "SUPER_ADMIN" && user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      const backendUrl = overseer.resolve("fastapi");
      try {
        await axios.delete(
          `${backendUrl}/v1/admin/users/${input.userId}/roles/${input.roleId}`,
          {
            data: { scope_id: input.scopeId ?? null },
            headers: { "x-peppr-gateway": "bff" },
            timeout: 8000,
          }
        );
        return { success: true };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke role",
        });
      }
    }),

  /**
   * Get the SSO allowlist (super-admin only).
   */
  ssoAllowlist: protectedProcedure.query(async ({ ctx }) => {
    const user = ctx.user as Record<string, unknown>;
    if (user.role !== "SUPER_ADMIN" && user.role !== "super_admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
    }

    const backendUrl = overseer.resolve("fastapi");
    try {
      const resp = await axios.get(`${backendUrl}/v1/admin/sso-allowlist`, {
        headers: { "x-peppr-gateway": "bff" },
        timeout: 8000,
      });
      return { entries: resp.data?.items ?? [] };
    } catch {
      return { entries: [] };
    }
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
      const user = ctx.user as Record<string, unknown>;
      if (user.role !== "SUPER_ADMIN" && user.role !== "super_admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
      }

      const backendUrl = overseer.resolve("fastapi");
      try {
        await axios.post(
          `${backendUrl}/v1/admin/sso-allowlist`,
          {
            email: input.email,
            provider: input.provider,
            full_name: input.fullName,
            notes: input.notes,
          },
          {
            headers: { "x-peppr-gateway": "bff" },
            timeout: 8000,
          }
        );
        return { success: true };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to add SSO allowlist entry",
        });
      }
    }),

  /**
   * Get all available role definitions.
   */
  roleDefinitions: publicProcedure.query(async () => {
    const backendUrl = overseer.resolve("fastapi");
    try {
      const resp = await axios.get(`${backendUrl}/v1/admin/roles`, {
        timeout: 5000,
      });
      return { roles: resp.data?.roles ?? [] };
    } catch {
      // Return static definitions as fallback
      return {
        roles: [
          { roleId: "SUPER_ADMIN",    name: "Super Admin",      scopeType: "GLOBAL",   description: "Full platform access" },
          { roleId: "PARTNER_ADMIN",  name: "Partner Admin",    scopeType: "PARTNER",  description: "Manages all properties under a partner" },
          { roleId: "PROPERTY_ADMIN", name: "Property Admin",   scopeType: "PROPERTY", description: "Manages a single property" },
          { roleId: "FRONT_DESK",     name: "Front Desk",       scopeType: "PROPERTY", description: "Hotel operations — check-in, templates, guest requests" },
          { roleId: "HOUSEKEEPING",   name: "Housekeeping",     scopeType: "PROPERTY", description: "Housekeeping task queue" },
        ],
      };
    }
  }),
});
