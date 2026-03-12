/**
 * useRBAC — Role-Based Access Control hook.
 *
 * Feature #26: Provides permission checks based on user role.
 * Roles: super_admin > admin > manager > staff > viewer
 *
 * Usage:
 *   const { can, role, isAdmin } = useRBAC();
 *   if (can("manage:users")) { ... }
 */
import { useAuth } from "@/contexts/AuthContext";

// ─── Permission definitions ────────────────────────────────────────────────────
type Permission =
  | "view:dashboard"
  | "view:partners" | "manage:partners"
  | "view:properties" | "manage:properties"
  | "view:rooms" | "manage:rooms"
  | "view:providers" | "manage:providers"
  | "view:catalog" | "manage:catalog"
  | "view:templates" | "manage:templates"
  | "view:qr" | "manage:qr" | "generate:qr"
  | "view:front-office" | "manage:front-office"
  | "view:users" | "manage:users"
  | "view:staff" | "manage:staff"
  | "view:settings" | "manage:settings"
  | "view:reports"
  | "bulk:operations";

// ─── Role hierarchy ────────────────────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: [
    "view:dashboard",
    "view:partners", "manage:partners",
    "view:properties", "manage:properties",
    "view:rooms", "manage:rooms",
    "view:providers", "manage:providers",
    "view:catalog", "manage:catalog",
    "view:templates", "manage:templates",
    "view:qr", "manage:qr", "generate:qr",
    "view:front-office", "manage:front-office",
    "view:users", "manage:users",
    "view:staff", "manage:staff",
    "view:settings", "manage:settings",
    "view:reports",
    "bulk:operations",
  ],
  admin: [
    "view:dashboard",
    "view:partners", "manage:partners",
    "view:properties", "manage:properties",
    "view:rooms", "manage:rooms",
    "view:providers", "manage:providers",
    "view:catalog", "manage:catalog",
    "view:templates", "manage:templates",
    "view:qr", "manage:qr", "generate:qr",
    "view:front-office", "manage:front-office",
    "view:users",
    "view:staff", "manage:staff",
    "view:settings", "manage:settings",
    "view:reports",
    "bulk:operations",
  ],
  manager: [
    "view:dashboard",
    "view:partners",
    "view:properties",
    "view:rooms", "manage:rooms",
    "view:providers",
    "view:catalog",
    "view:templates",
    "view:qr", "manage:qr", "generate:qr",
    "view:front-office", "manage:front-office",
    "view:staff",
    "view:reports",
    "bulk:operations",
  ],
  staff: [
    "view:dashboard",
    "view:rooms",
    "view:qr",
    "view:front-office", "manage:front-office",
    "view:reports",
  ],
  viewer: [
    "view:dashboard",
    "view:partners",
    "view:properties",
    "view:rooms",
    "view:qr",
    "view:front-office",
    "view:reports",
  ],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useRBAC() {
  const { user } = useAuth();
  const role = (user?.role ?? "viewer").toLowerCase();

  const permissions = ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.viewer;

  const can = (permission: Permission): boolean => permissions.includes(permission);

  const canAny = (...perms: Permission[]): boolean => perms.some((p) => permissions.includes(p));

  const canAll = (...perms: Permission[]): boolean => perms.every((p) => permissions.includes(p));

  return {
    role,
    permissions,
    can,
    canAny,
    canAll,
    isAdmin: role === "admin" || role === "super_admin",
    isManager: role === "manager" || role === "admin" || role === "super_admin",
    isStaff: ["staff", "manager", "admin", "super_admin"].includes(role),
    isSuperAdmin: role === "super_admin",
  };
}
