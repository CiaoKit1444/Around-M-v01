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
import { ChevronDown, RefreshCw } from "lucide-react";
import { useActiveRole, ROLE_ICONS, ROLE_COLORS, type RoleAssignment } from "@/hooks/useActiveRole";
import { cn } from "@/lib/utils";

export function ActiveRoleBadge() {
  const [, navigate] = useLocation();
  const { activeRole, allRoles, switchRole, isSwitching, hasMultipleRoles } = useActiveRole();

  if (!activeRole) return null;

  const colors = ROLE_COLORS[activeRole.roleId] ?? ROLE_COLORS["FRONT_DESK"];
  const icon = ROLE_ICONS[activeRole.roleId] ?? "👤";

  const handleSwitch = async (role: RoleAssignment) => {
    if (role.roleId === activeRole.roleId && role.scopeId === activeRole.scopeId) return;
    await switchRole(role);
    // Reload to apply new role context
    window.location.href = "/";
  };

  if (!hasMultipleRoles) {
    // Single role — just show the badge, no dropdown
    return (
      <div className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
        colors.border,
        "bg-zinc-900 text-zinc-200"
      )}>
        <span>{icon}</span>
        <span>{activeRole.roleName}</span>
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
        >
          {isSwitching ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <span>{icon}</span>
          )}
          <span className="max-w-[120px] truncate">{activeRole.roleName}</span>
          {activeRole.scopeType !== "GLOBAL" && activeRole.scopeLabel && (
            <span className="text-zinc-500 truncate max-w-[80px]">· {activeRole.scopeLabel}</span>
          )}
          <ChevronDown className="w-3 h-3 text-zinc-500" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 bg-zinc-900 border-zinc-800">
        <DropdownMenuLabel className="text-zinc-400 text-xs font-normal">
          Switch active role
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-zinc-800" />

        {allRoles.map((role, i) => {
          const roleColors = ROLE_COLORS[role.roleId] ?? ROLE_COLORS["FRONT_DESK"];
          const roleIcon = ROLE_ICONS[role.roleId] ?? "👤";
          const isActive = role.roleId === activeRole.roleId && role.scopeId === activeRole.scopeId;

          return (
            <DropdownMenuItem
              key={`${role.roleId}-${role.scopeId ?? i}`}
              onClick={() => handleSwitch(role)}
              className={cn(
                "flex items-start gap-2.5 py-2.5 cursor-pointer",
                isActive ? "bg-zinc-800" : "hover:bg-zinc-800"
              )}
            >
              <span className="text-base mt-0.5">{roleIcon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-zinc-100">{role.roleName}</span>
                  {isActive && (
                    <Badge className={`${roleColors.badge} text-white border-0 text-[10px] px-1.5 py-0`}>
                      Active
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-zinc-500 truncate">{role.displayLabel}</p>
              </div>
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator className="bg-zinc-800" />
        <DropdownMenuItem
          onClick={() => navigate("/role-switch")}
          className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 text-xs cursor-pointer"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Open role carousel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
