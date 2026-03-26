/**
 * useActiveRole — Active Role Context Hook
 *
 * Manages the user's currently selected role in the multi-tenant RBAC system.
 * Role selection is persisted in BOTH localStorage and cookies so it survives
 * incognito sessions and cross-browser scenarios.
 *
 * Usage:
 *   const { activeRole, allRoles, switchRole, hasPermission, isSwitching } = useActiveRole();
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";

const STORAGE_KEY = "peppr_active_role";
const COOKIE_KEY = "peppr_active_role";

export interface ActiveRoleContext {
  roleId: string;
  roleName: string;
  scopeType: "GLOBAL" | "PARTNER" | "PROPERTY";
  scopeId: string | null;
  scopeLabel: string | null;
  displayLabel: string;
  permissions: string[];
}

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

// Role-to-icon mapping for the carousel
export const ROLE_ICONS: Record<string, string> = {
  SUPER_ADMIN:       "🛡️",
  SYSTEM_ADMIN:      "🔐",
  PARTNER_ADMIN:     "🏢",
  PROPERTY_ADMIN:    "🏨",
  FRONT_DESK:        "🛎️",
  FRONT_OFFICE:      "🛎️",
  HOUSEKEEPING:      "🧹",
  SERVICE_PROVIDER:  "🔧",
  SP_ADMIN:          "🔧",
  SERVICE_OPERATOR:  "🎧",
};

// Role-to-color mapping for the carousel cards
export const ROLE_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  SUPER_ADMIN:       { bg: "from-violet-950 to-violet-900",  border: "border-violet-500",  badge: "bg-violet-500"  },
  SYSTEM_ADMIN:      { bg: "from-slate-950 to-slate-900",    border: "border-slate-500",   badge: "bg-slate-500"   },
  PARTNER_ADMIN:     { bg: "from-blue-950 to-blue-900",      border: "border-blue-500",    badge: "bg-blue-500"    },
  PROPERTY_ADMIN:    { bg: "from-emerald-950 to-emerald-900", border: "border-emerald-500", badge: "bg-emerald-500" },
  FRONT_DESK:        { bg: "from-amber-950 to-amber-900",    border: "border-amber-500",   badge: "bg-amber-500"   },
  FRONT_OFFICE:      { bg: "from-amber-950 to-amber-900",    border: "border-amber-500",   badge: "bg-amber-500"   },
  HOUSEKEEPING:      { bg: "from-cyan-950 to-cyan-900",      border: "border-cyan-500",    badge: "bg-cyan-500"    },
  SERVICE_PROVIDER:  { bg: "from-teal-950 to-teal-900",      border: "border-teal-500",    badge: "bg-teal-500"    },
  SP_ADMIN:          { bg: "from-teal-950 to-teal-900",      border: "border-teal-500",    badge: "bg-teal-500"    },
  SERVICE_OPERATOR:  { bg: "from-indigo-950 to-indigo-900",  border: "border-indigo-500",  badge: "bg-indigo-500"  },
};

/**
 * Load stored role from cookie first, then localStorage as fallback.
 * Cookie takes priority because it survives incognito/cross-browser.
 */
function loadStoredRole(): ActiveRoleContext | null {
  try {
    // Try cookie first
    const cookieRaw = getCookie(COOKIE_KEY);
    if (cookieRaw) {
      return JSON.parse(cookieRaw) as ActiveRoleContext;
    }
    // Fallback to localStorage
    const lsRaw = localStorage.getItem(STORAGE_KEY);
    if (lsRaw) {
      const parsed = JSON.parse(lsRaw) as ActiveRoleContext;
      // Migrate: also write to cookie for next time
      setCookie(COOKIE_KEY, lsRaw);
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save role to both cookie and localStorage for maximum durability.
 */
function saveStoredRole(role: ActiveRoleContext | null): void {
  try {
    if (role) {
      const json = JSON.stringify(role);
      localStorage.setItem(STORAGE_KEY, json);
      setCookie(COOKIE_KEY, json);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      deleteCookie(COOKIE_KEY);
    }
  } catch {
    // ignore
  }
}

export function useActiveRole() {
  const [activeRole, setActiveRole] = useState<ActiveRoleContext | null>(loadStoredRole);
  const [isSwitching, setIsSwitching] = useState(false);

  const { data: rolesData, isLoading: rolesLoading } = trpc.rbac.myRoles.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  const switchRoleMutation = trpc.rbac.switchRole.useMutation();

  // On mount: if no stored role but server returns roles, pick the first one
  useEffect(() => {
    if (!rolesData) return;
    const serverActive = rolesData.activeRole;
    const stored = loadStoredRole();

    if (!stored && serverActive) {
      setActiveRole(serverActive as ActiveRoleContext);
      saveStoredRole(serverActive as ActiveRoleContext);
    } else if (stored && rolesData.roles.length > 0) {
      // Validate stored role is still assigned
      const stillValid = rolesData.roles.some(
        (r) => r.roleId === stored.roleId && r.scopeId === stored.scopeId
      );
      if (!stillValid) {
        const fallback = rolesData.activeRole ?? (rolesData.roles[0] as unknown as ActiveRoleContext);
        setActiveRole(fallback as ActiveRoleContext);
        saveStoredRole(fallback as ActiveRoleContext);
      }
    }
  }, [rolesData]);

  const switchRole = useCallback(
    async (assignment: RoleAssignment) => {
      setIsSwitching(true);
      try {
        const result = await switchRoleMutation.mutateAsync({
          roleId: assignment.roleId,
          scopeId: assignment.scopeId,
          scopeType: assignment.scopeType,
        });

        const newContext: ActiveRoleContext = result.activeRole ?? {
          roleId: assignment.roleId,
          roleName: assignment.roleName,
          scopeType: assignment.scopeType,
          scopeId: assignment.scopeId,
          scopeLabel: assignment.scopeLabel,
          displayLabel: assignment.displayLabel,
          permissions: assignment.permissions,
        };

        setActiveRole(newContext);
        saveStoredRole(newContext);
        return newContext;
      } finally {
        setIsSwitching(false);
      }
    },
    [switchRoleMutation]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!activeRole) return false;
      if (activeRole.roleId === "SUPER_ADMIN") return true;
      return activeRole.permissions.includes(permission);
    },
    [activeRole]
  );

  const clearRole = useCallback(() => {
    setActiveRole(null);
    saveStoredRole(null);
  }, []);

  // Derive the active property/partner from the role scope
  const activeScopeId = activeRole?.scopeId ?? null;
  const activeScopeType = activeRole?.scopeType ?? "GLOBAL";

  return {
    activeRole,
    allRoles: (rolesData?.roles ?? []) as RoleAssignment[],
    rolesLoading,
    isSwitching,
    switchRole,
    hasPermission,
    clearRole,
    activeScopeId,
    activeScopeType,
    /** True if user has more than one role assignment (carousel needed) */
    hasMultipleRoles: (rolesData?.roles?.length ?? 0) > 1,
    /** Convenience: active property ID (null for GLOBAL/PARTNER roles) */
    activePropertyId: activeScopeType === "PROPERTY" ? activeScopeId : null,
    /** Convenience: active partner ID (null for GLOBAL/PROPERTY roles) */
    activePartnerId: activeScopeType === "PARTNER" ? activeScopeId : null,
  };
}
