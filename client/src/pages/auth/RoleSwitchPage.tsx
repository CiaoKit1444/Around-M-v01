/**
 * RoleSwitchPage — Post-Login Role Selection
 *
 * Shown after login when a user has multiple role assignments.
 * Redirects to the correct portal after role selection.
 * Also accessible from the TopBar for mid-session role switching.
 *
 * Three view modes:
 *   1. Dropdown  — compact property-scoped dropdown (legacy)
 *   2. Carousel  — swipeable role cards (default for most users)
 *   3. Dial      — circular orbit picker (default for SUPER_ADMIN / SYSTEM_ADMIN)
 *
 * "Remember my role" feature:
 *   - When checked, stores the selected role's composite key in both cookie
 *     and localStorage (key: peppr_remember_role = "<roleId>|<scopeId>")
 *   - On next login, if the stored key matches an available role, it is
 *     auto-selected and the user is sent directly to the dashboard.
 *   - Mid-session switches (user already has activeRole) skip the auto-select
 *     so the user can consciously pick a different role.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { RoleCarousel } from "@/components/RoleCarousel";
import { RoleDialSelector } from "@/components/RoleDialSelector";
import { useActiveRole, type RoleAssignment } from "@/hooks/useActiveRole";
import { getRoleLandingPath } from "@/lib/getRoleLandingPath";
import { useAuth } from "@/_core/hooks/useAuth";
import { getCookie, setCookie, deleteCookie } from "@/lib/cookies";
import { Loader2, LayoutGrid, Rows3, Circle } from "lucide-react";

const REMEMBER_ROLE_KEY = "peppr_remember_role";
const VIEW_MODE_KEY = "peppr_role_view_mode";

type ViewMode = "dropdown" | "carousel" | "dial";

/** Roles that default to the dial view */
const DIAL_DEFAULT_ROLES = new Set(["SUPER_ADMIN", "SYSTEM_ADMIN"]);

/** Read remember-role from cookie first, then localStorage */
function getRememberedRole(): string | null {
  return getCookie(REMEMBER_ROLE_KEY) || localStorage.getItem(REMEMBER_ROLE_KEY) || null;
}

/** Write remember-role to both cookie and localStorage */
function setRememberedRole(value: string): void {
  localStorage.setItem(REMEMBER_ROLE_KEY, value);
  setCookie(REMEMBER_ROLE_KEY, value);
}

/** Clear remember-role from both stores */
function clearRememberedRole(): void {
  localStorage.removeItem(REMEMBER_ROLE_KEY);
  deleteCookie(REMEMBER_ROLE_KEY);
}

export default function RoleSwitchPage() {
  const [location, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();

  // Read returnTo from query string — set by AdminGuard when redirecting here.
  // MUST use window.location.search because wouter's useLocation() strips query strings.
  const returnTo = (() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("returnTo");
      if (raw) {
        const decoded = decodeURIComponent(raw);
        // Only allow internal paths (must start with /)
        if (decoded.startsWith("/")) return decoded;
      }
    } catch { /* ignore */ }
    return null;
  })();
  const { allRoles, rolesLoading, switchRole, isSwitching, activeRole } = useActiveRole();
  const autoSelectAttempted = useRef(false);

  // Determine initial view mode: dial for super/system admins, carousel otherwise
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
    if (stored && ["dropdown", "carousel", "dial"].includes(stored)) return stored;
    return "carousel"; // will be overridden once roles load
  });

  // Once roles load, set default view mode based on highest role
  useEffect(() => {
    if (rolesLoading || allRoles.length === 0) return;
    const storedMode = localStorage.getItem(VIEW_MODE_KEY) as ViewMode | null;
    if (storedMode) return; // user has manually chosen a mode — respect it
    const hasSuperRole = allRoles.some((r) => DIAL_DEFAULT_ROLES.has(r.roleId));
    setViewMode(hasSuperRole ? "dial" : "carousel");
  }, [rolesLoading, allRoles]);

  const saveViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_KEY, mode);
  };

  // Determine the landing portal based on the selected role — uses shared utility
  const getLandingPath = useCallback((roleId: string): string => getRoleLandingPath(roleId), []);

  useEffect(() => {
    if (rolesLoading || authLoading || autoSelectAttempted.current) return;
    if (allRoles.length === 0) return;

    autoSelectAttempted.current = true;

    // Single role — auto-select without showing the picker
    if (allRoles.length === 1 && !activeRole) {
      const role = allRoles[0];
      switchRole(role).then(() => navigate(returnTo ?? getLandingPath(role.roleId)));
      return;
    }

    // "Remember my role" — only auto-select on fresh login (no active role yet)
    if (!activeRole) {
      const remembered = getRememberedRole();
      if (remembered) {
        const [remRoleId, remScopeId] = remembered.split("|");
        const match = allRoles.find(
          (r) => r.roleId === remRoleId && String(r.scopeId) === remScopeId
        );
        if (match) {
          switchRole(match).then(() => navigate(returnTo ?? getLandingPath(match.roleId)));
          return;
        }
        // Stored key no longer valid — clear it
        clearRememberedRole();
      }
    }
  }, [rolesLoading, authLoading, allRoles, activeRole, switchRole, navigate, getLandingPath]);

  const handleSelect = async (role: RoleAssignment, remember: boolean) => {
    if (remember) {
      setRememberedRole(`${role.roleId}|${role.scopeId}`);
    } else {
      clearRememberedRole();
    }
    await switchRole(role);
    navigate(returnTo ?? getLandingPath(role.roleId));
  };

  // ── Loading state ────────────────────────────────────────────────────────────
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

  // ── No roles assigned ────────────────────────────────────────────────────────
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
          <p className="text-zinc-500 text-xs mb-6">
            Logged in as: {user?.email ?? "unknown"}
          </p>
          <div className="flex flex-col gap-3">
            <p className="text-zinc-500 text-xs uppercase tracking-wider">Direct Portal Access</p>
            <button
              onClick={() => navigate("/fo")}
              className="w-full py-3 px-4 rounded-xl bg-amber-900/40 border border-amber-700 text-amber-300 text-sm font-medium hover:bg-amber-900/60 transition-colors flex items-center justify-between"
            >
              <span>🛎️ Front Office Portal</span>
              <span className="text-amber-500 text-xs">FRONT_OFFICE →</span>
            </button>
            <button
              onClick={() => navigate("/sp")}
              className="w-full py-3 px-4 rounded-xl bg-teal-900/40 border border-teal-700 text-teal-300 text-sm font-medium hover:bg-teal-900/60 transition-colors flex items-center justify-between"
            >
              <span>🔧 Service Provider Portal</span>
              <span className="text-teal-500 text-xs">SP_ADMIN →</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── View mode switcher bar ───────────────────────────────────────────────────
  const ViewModeSwitcher = () => (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-zinc-900/90 border border-zinc-700 rounded-full px-2 py-1.5 backdrop-blur-sm shadow-xl">
      <span className="text-zinc-500 text-xs px-2">View:</span>
      <button
        onClick={() => saveViewMode("dropdown")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          viewMode === "dropdown"
            ? "bg-amber-500 text-black"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        }`}
        title="Dropdown"
      >
        <Rows3 className="w-3.5 h-3.5" />
        Dropdown
      </button>
      <button
        onClick={() => saveViewMode("carousel")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          viewMode === "carousel"
            ? "bg-amber-500 text-black"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        }`}
        title="Carousel"
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Carousel
      </button>
      <button
        onClick={() => saveViewMode("dial")}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
          viewMode === "dial"
            ? "bg-amber-500 text-black"
            : "text-zinc-400 hover:text-white hover:bg-zinc-800"
        }`}
        title="Dial"
      >
        <Circle className="w-3.5 h-3.5" />
        Dial
      </button>
    </div>
  );

  // ── Dropdown view ────────────────────────────────────────────────────────────
  if (viewMode === "dropdown") {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-sm font-bold text-black">P</div>
              <span className="text-white font-semibold text-lg">Peppr Around</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="text-zinc-400 text-sm">Select your role to continue</p>
          </div>
          <div className="flex flex-col gap-3">
            {allRoles.sort((a, b) => a.sortOrder - b.sortOrder).map((role) => (
              <button
                key={`${role.roleId}-${role.scopeId}`}
                onClick={() => handleSelect(role, false)}
                disabled={isSwitching}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800/60 border border-zinc-700 text-left hover:border-amber-500 hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium text-sm">{role.roleName}</p>
                    {role.displayLabel && role.displayLabel !== role.roleName && (
                      <p className="text-zinc-400 text-xs mt-0.5">{role.displayLabel}</p>
                    )}
                  </div>
                  <span className="text-zinc-500 text-xs">{role.scopeType}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
        <ViewModeSwitcher />
      </div>
    );
  }

  // ── Dial view ────────────────────────────────────────────────────────────────
  if (viewMode === "dial") {
    return (
      <>
        <RoleDialSelector
          roles={allRoles}
          onSelect={handleSelect}
          isLoading={isSwitching}
          userName={user?.name ?? user?.email ?? undefined}
        />
        <ViewModeSwitcher />
      </>
    );
  }

  // ── Carousel view (default) ──────────────────────────────────────────────────
  return (
    <>
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
        <div className="flex-1">
          <RoleCarousel
            roles={allRoles}
            onSelect={handleSelect}
            isLoading={isSwitching}
            userName={user?.name ?? user?.email ?? undefined}
          />
        </div>
        {/* Portal shortcuts */}
        <div className="pb-20 px-4 flex justify-center gap-3">
          <button
            onClick={() => navigate("/fo")}
            className="py-2 px-4 rounded-lg bg-amber-900/30 border border-amber-800 text-amber-400 text-xs font-medium hover:bg-amber-900/50 transition-colors"
          >
            🛎️ Front Office
          </button>
          <button
            onClick={() => navigate("/sp")}
            className="py-2 px-4 rounded-lg bg-teal-900/30 border border-teal-800 text-teal-400 text-xs font-medium hover:bg-teal-900/50 transition-colors"
          >
            🔧 SP Portal
          </button>
        </div>
      </div>
      <ViewModeSwitcher />
    </>
  );
}
