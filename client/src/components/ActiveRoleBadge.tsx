/**
 * ActiveRoleBadge — TopBar Role Indicator with Quick-Switch
 *
 * Displays the currently active role as a badge in the TopBar.
 * Clicking it opens a dropdown to switch roles without going to the full carousel page.
 */
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, RefreshCw, ShieldCheck } from "lucide-react";
import { useActiveRole, ROLE_ICONS, ROLE_COLORS, type RoleAssignment } from "@/hooks/useActiveRole";
import { getRoleLandingPath } from "@/lib/getRoleLandingPath";
import { cn } from "@/lib/utils";

export function ActiveRoleBadge() {
  const [, navigate] = useLocation();
  const { activeRole, allRoles, switchRole, isSwitching, hasMultipleRoles } = useActiveRole();

  if (!activeRole) return null;

  const colors = ROLE_COLORS[activeRole.roleId] ?? ROLE_COLORS["FRONT_DESK"];
  const icon = ROLE_ICONS[activeRole.roleId] ?? "👤";
  const hasScope = activeRole.scopeType !== "GLOBAL" && activeRole.scopeLabel;

  const handleSwitch = async (role: RoleAssignment) => {
    if (role.roleId === activeRole.roleId && role.scopeId === activeRole.scopeId) return;
    await switchRole(role);
    // Navigate to the correct portal for the selected role
    window.location.href = getRoleLandingPath(role.roleId);
  };

  if (!hasMultipleRoles) {
    // Single role — static chip, no dropdown
    return (
      <div
        title={`Active role: ${activeRole.roleName}${hasScope ? ` — ${activeRole.scopeLabel}` : ""}`}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium select-none",
          colors.border,
          "bg-zinc-900/80 text-zinc-200"
        )}
      >
        <span className="flex-shrink-0">{icon}</span>
        <span className="truncate max-w-[110px] sm:max-w-[160px]">{activeRole.roleName}</span>
        {hasScope && (
          <>
            <span className="text-zinc-500 flex-shrink-0">—</span>
            <span className="text-zinc-400 truncate max-w-[80px] sm:max-w-[120px]">{activeRole.scopeLabel}</span>
          </>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
            "hover:bg-zinc-800 transition-colors cursor-pointer",
            colors.border,
            "bg-zinc-900 text-zinc-200"
          )}
          disabled={isSwitching}
          aria-label={`Active role: ${activeRole.roleName}${hasScope ? ` — ${activeRole.scopeLabel}` : ""}. Click to switch role.`}
        >
          {isSwitching ? (
            <RefreshCw className="w-3 h-3 animate-spin flex-shrink-0" />
          ) : (
            <span className="flex-shrink-0">{icon}</span>
          )}
          <span className="font-semibold truncate max-w-[110px] sm:max-w-[160px]">{activeRole.roleName}</span>
          {hasScope && (
            <>
              <span className="text-zinc-500 flex-shrink-0">—</span>
              <span className="text-zinc-400 truncate max-w-[80px] sm:max-w-[120px]">{activeRole.scopeLabel}</span>
            </>
          )}
          <ChevronDown className="w-3 h-3 text-zinc-500 flex-shrink-0 ml-0.5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72 bg-zinc-900 border-zinc-800">
        {/* Current role header */}
        <div className="px-3 py-2.5 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">Active Role</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base flex-shrink-0">{icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 leading-tight">{activeRole.roleName}</p>
              {hasScope && (
                <p className="text-xs text-zinc-400 truncate">{activeRole.scopeLabel}</p>
              )}
            </div>
          </div>
        </div>

        <DropdownMenuLabel className="text-zinc-500 text-[10px] font-medium uppercase tracking-wider px-3 pt-2 pb-1">
          Switch to
        </DropdownMenuLabel>

        {allRoles.map((role, i) => {
          const roleColors = ROLE_COLORS[role.roleId] ?? ROLE_COLORS["FRONT_DESK"];
          const roleIcon = ROLE_ICONS[role.roleId] ?? "👤";
          const isActive = role.roleId === activeRole.roleId && role.scopeId === activeRole.scopeId;
          const roleHasScope = role.scopeType !== "GLOBAL" && role.scopeLabel;

          return (
            <DropdownMenuItem
              key={`${role.roleId}-${role.scopeId ?? i}`}
              onClick={() => handleSwitch(role)}
              className={cn(
                "flex items-start gap-2.5 py-2 px-3 cursor-pointer",
                isActive ? "bg-zinc-800/80" : "hover:bg-zinc-800/60"
              )}
            >
              <span className="text-base mt-0.5 flex-shrink-0">{roleIcon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-medium text-zinc-100 leading-tight">{role.roleName}</span>
                  {isActive && (
                    <Badge className={`${roleColors.badge} text-white border-0 text-[10px] px-1.5 py-0 leading-4`}>
                      Active
                    </Badge>
                  )}
                </div>
                {roleHasScope ? (
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{role.scopeLabel}</p>
                ) : (
                  <p className="text-xs text-zinc-600 mt-0.5">Global access</p>
                )}
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="bg-zinc-800 my-1" />
        <DropdownMenuItem
          onClick={() => navigate("/admin/role-switch")}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs cursor-pointer px-3 py-2"
        >
          <RefreshCw className="w-3 h-3 mr-2 flex-shrink-0" />
          Open full role carousel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
