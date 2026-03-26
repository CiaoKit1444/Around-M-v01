/**
 * getRoleLandingPath — Single source of truth for role → portal routing.
 *
 * Used by RoleSwitchPage (full picker) and ActiveRoleBadge (quick-switch dropdown)
 * so both always land on the same portal for a given role.
 */
export function getRoleLandingPath(roleId: string): string {
  if (roleId === "FRONT_DESK" || roleId === "FRONT_OFFICE" || roleId === "PROPERTY_ADMIN") return "/fo";
  if (roleId === "SERVICE_PROVIDER" || roleId === "SP_ADMIN") return "/sp";
  if (roleId === "SERVICE_OPERATOR") return "/so/jobs";
  return "/admin";
}
