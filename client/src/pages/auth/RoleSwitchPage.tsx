/**
 * RoleSwitchPage — Post-Login Role Selection
 *
 * Shown after login when a user has multiple role assignments.
 * Redirects to the dashboard after role selection.
 * Also accessible from the TopBar for mid-session role switching.
 *
 * "Remember my role" feature:
 *   - When checked, stores the selected role's composite key in localStorage
 *     (key: peppr_remember_role = "<roleId>|<scopeId>")
 *   - On next login, if the stored key matches an available role, it is
 *     auto-selected and the user is sent directly to the dashboard.
 *   - Mid-session switches (user already has activeRole) skip the auto-select
 *     so the user can consciously pick a different role.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { RoleCarousel, REMEMBER_ROLE_KEY } from "@/components/RoleCarousel";
import { useActiveRole, type RoleAssignment } from "@/hooks/useActiveRole";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

const ACTIVE_ROLE_KEY = "peppr_active_role";

export default function RoleSwitchPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { allRoles, rolesLoading, switchRole, isSwitching, activeRole } = useActiveRole();
  const autoSelectAttempted = useRef(false);

  useEffect(() => {
    if (rolesLoading || authLoading || autoSelectAttempted.current) return;
    if (allRoles.length === 0) return;

    autoSelectAttempted.current = true;

    // Single role — auto-select without showing the picker
    if (allRoles.length === 1 && !activeRole) {
      switchRole(allRoles[0]).then(() => navigate("/"));
      return;
    }

    // "Remember my role" — only auto-select on fresh login (no active role yet)
    if (!activeRole) {
      const remembered = localStorage.getItem(REMEMBER_ROLE_KEY);
      if (remembered) {
        const [remRoleId, remScopeId] = remembered.split("|");
        const match = allRoles.find(
          (r) => r.roleId === remRoleId && String(r.scopeId) === remScopeId
        );
        if (match) {
          switchRole(match).then(() => navigate("/"));
          return;
        }
        // Stored key no longer valid — clear it
        localStorage.removeItem(REMEMBER_ROLE_KEY);
      }
    }
  }, [rolesLoading, authLoading, allRoles, activeRole, switchRole, navigate]);

  const handleSelect = async (role: RoleAssignment, remember: boolean) => {
    if (remember) {
      localStorage.setItem(REMEMBER_ROLE_KEY, `${role.roleId}|${role.scopeId}`);
    } else {
      localStorage.removeItem(REMEMBER_ROLE_KEY);
    }
    await switchRole(role);
    navigate("/");
  };

  if (authLoading || rolesLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Loading your roles...</p>
        </div>
      </div>
    );
  }

  if (allRoles.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-white text-xl font-bold mb-2">No roles assigned</h2>
          <p className="text-zinc-400 text-sm mb-6">
            Your account exists but no roles have been assigned yet.
            Please contact your administrator.
          </p>
          <p className="text-zinc-500 text-xs">
            Logged in as: {user?.email ?? "unknown"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <RoleCarousel
      roles={allRoles}
      onSelect={handleSelect}
      isLoading={isSwitching}
      userName={user?.name ?? user?.email ?? undefined}
    />
  );
}
