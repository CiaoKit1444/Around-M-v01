/**
 * RoleSwitchPage — Post-Login Role Selection
 *
 * Shown after login when a user has multiple role assignments.
 * Redirects to the dashboard after role selection.
 * Also accessible from the TopBar for mid-session role switching.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";
import { RoleCarousel } from "@/components/RoleCarousel";
import { useActiveRole, type RoleAssignment } from "@/hooks/useActiveRole";
import { useAuth } from "@/_core/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function RoleSwitchPage() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { allRoles, rolesLoading, switchRole, isSwitching, activeRole, hasMultipleRoles } = useActiveRole();

  // If user only has one role, auto-select it and redirect
  useEffect(() => {
    if (!rolesLoading && allRoles.length === 1 && !activeRole) {
      switchRole(allRoles[0]).then(() => navigate("/"));
    }
  }, [rolesLoading, allRoles, activeRole, switchRole, navigate]);

  // If already has an active role and navigated here intentionally (mid-session switch),
  // show the carousel anyway
  const handleSelect = async (role: RoleAssignment) => {
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
