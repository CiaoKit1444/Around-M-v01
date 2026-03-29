/**
 * Sidebar — Dark charcoal navigation panel.
 *
 * Design: Precision Studio — dark sidebar with two-level hierarchy.
 * Group labels are uppercase 11px, items are 13px with icon + text.
 * Collapsed state shows icons only (56px width).
 */
import { useState } from "react";
import { useLocation, Link } from "wouter";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
  Chip,
} from "@mui/material";
import { trpc } from "@/lib/trpc";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { filterNavigation } from "@/lib/navigation";
import { useRBAC } from "@/hooks/useRBAC";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { useQuery } from "@tanstack/react-query";
import { propertiesApi } from "@/lib/api/endpoints";
import { LOGO_WHITE_URL } from "@/const";

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED = 64;

// ── Active Property Header ─────────────────────────────────────────────────
// Shows the brand logo + app name + active property context in the sidebar header.
// In collapsed mode, shows only the logo and a status dot tooltip.

function statusDotColor(status?: string): string {
  if (status === "active") return "#34d399"; // emerald-400
  if (status === "inactive") return "#71717a"; // zinc-500
  return "#fbbf24"; // amber-400 (pending / unknown)
}

function ActivePropertyHeader({
  collapsed,
  isMobile,
}: {
  collapsed: boolean;
  isMobile: boolean;
}) {
  const { propertyId } = useActiveProperty();

  // Fetch all properties so we can find the active one by ID.
  // Uses the same query key as PropertySwitcher so it shares the cache.
  const propertiesQuery = useQuery({
    queryKey: ["properties", "switcher"],
    queryFn: () => propertiesApi.list({ page: 1, page_size: 200 }),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const activeProperty = propertiesQuery.data?.items?.find(
    (p) => p.id === propertyId
  );

  const isExpanded = !collapsed || isMobile;

  return (
    <Box
      sx={{
        height: 64,
        display: "flex",
        alignItems: "center",
        px: isExpanded ? 2.5 : 1.25,
        gap: 1.5,
        flexShrink: 0,
      }}
    >
      {/* Logo with status dot overlay in collapsed mode */}
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        {/*
         * The sidebar is always dark (var(--sidebar) ≈ oklch(0.145)). We use the
         * white SVG logo and place it on a slightly lighter dark tile so it is
         * visible regardless of the OS colour-scheme preference.
         */}
        <Box
          sx={{
            width: 40, height: 40, borderRadius: 1,
            bgcolor: "rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden", flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={LOGO_WHITE_URL}
            alt="Peppr Around"
            sx={{ width: 32, height: 32, display: "block" }}
          />
        </Box>
        {/* Logo-level status dot removed — single pulse dot lives next to property name */}
      </Box>

      {/* Text block — hidden when collapsed on desktop */}
      {isExpanded && (
        <Box sx={{ overflow: "hidden", flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "var(--sidebar-foreground)",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
            }}
          >
            Peppr Around
          </Typography>
          {/* Active property row — single animated pulse dot signals live data context */}
          {activeProperty ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
              {/* Pulse dot: outer ring animates, inner dot stays solid */}
              <Box sx={{ position: "relative", width: 6, height: 6, flexShrink: 0 }}>
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    bgcolor: statusDotColor(activeProperty.status),
                    opacity: 0.35,
                    animation: "pepprPulse 2.2s ease-in-out infinite",
                    "@keyframes pepprPulse": {
                      "0%, 100%": { transform: "scale(1)", opacity: 0.35 },
                      "50%": { transform: "scale(2.4)", opacity: 0 },
                    },
                  }}
                />
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    bgcolor: statusDotColor(activeProperty.status),
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.625rem",
                  color: "var(--sidebar-accent-foreground)",
                  opacity: 0.7,
                  display: "block",
                  lineHeight: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: 140,
                }}
              >
                {activeProperty.name}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.625rem",
                color: "var(--sidebar-accent-foreground)",
                opacity: 0.5,
                display: "block",
                lineHeight: 1,
              }}
            >
              Admin Console
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onClose: () => void;
}

// Nav items that require specific permissions
const NAV_PERMISSIONS: Record<string, string> = {
  users: "view:users",
  staff: "view:staff",
  settings: "view:settings",
  "revenue-report": "view:reports",
  "satisfaction-report": "view:reports",
  "audit-log": "view:reports",
  "2fa": "view:settings",
};

export default function Sidebar({ open, collapsed, onToggleCollapse, onClose }: SidebarProps) {
  const [location] = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const { can, role } = useRBAC();
  const { activeRole } = useActiveRole();
  const { propertyId } = useActiveProperty();

  // Live pending request count for the Front Office badge
  const pendingQ = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId!, status: "PENDING", limit: 100 },
    { enabled: !!propertyId, staleTime: 15_000, refetchInterval: 30_000 }
  );
  // listByProperty returns an array directly (not { items })
  const pendingCount = Array.isArray(pendingQ.data) ? pendingQ.data.length : 0;
  // Map legacy RBAC role names to the new RoleId format used by filterNavigation.
  // This ensures nav items are visible even when the tRPC rbac.myRoles query
  // hasn't resolved yet or the user has no stored active role.
  const legacyRoleToRoleId: Record<string, string> = {
    super_admin: "SUPER_ADMIN",
    admin: "SUPER_ADMIN",
    manager: "PROPERTY_ADMIN",
    staff: "FRONT_DESK",
    viewer: "FRONT_DESK",
  };
  const fallbackRoleId = legacyRoleToRoleId[role] ?? "SUPER_ADMIN";
  const effectiveRoleId = activeRole?.roleId ?? fallbackRoleId;
  const filteredNav = filterNavigation(effectiveRoleId);

  const width = collapsed && !isMobile ? SIDEBAR_COLLAPSED : SIDEBAR_WIDTH;

  const content = (
    <Box
      sx={{
        width,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        bgcolor: "var(--sidebar)",
        color: "var(--sidebar-foreground)",
        transition: "width 200ms ease-out",
        overflow: "hidden",
      }}
    >
      {/* Brand Header + Active Property */}
      <ActivePropertyHeader collapsed={collapsed} isMobile={isMobile} />

      <Divider sx={{ borderColor: "var(--sidebar-border)", mx: 1.5 }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1 }}>
        {filteredNav.map((group) => ({
          ...group,
          items: group.items.filter((item) => {
            const perm = NAV_PERMISSIONS[item.id];
            if (!perm) return true;
            return can(perm as Parameters<typeof can>[0]);
          }),
        })).filter((group) => group.items.length > 0).map((group) => (
          <Box key={group.id} sx={{ mb: 0.5 }}>
            {(!collapsed || isMobile) && (
              <Typography
                sx={{
                  px: 2.5,
                  pt: 2,
                  pb: 0.5,
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--sidebar-foreground)",
                  opacity: 0.4,
                }}
              >
                {group.title}
              </Typography>
            )}
            <List disablePadding>
              {group.items.map((item) => {
                const isActive =
                  item.path === "/admin"
                    ? location === "/admin" || location === "/admin/"
                    : location.startsWith(item.path);
                const Icon = item.icon;

                const button = (
                  <ListItem key={item.id} disablePadding sx={{ px: 1 }}>
                    <ListItemButton
                      component={Link}
                      href={item.path}
                      onClick={isMobile ? onClose : undefined}
                      sx={{
                        borderRadius: 1,
                        minHeight: 36,
                        px: collapsed && !isMobile ? 1.5 : 2,
                        py: 0.5,
                        justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                        bgcolor: isActive ? "var(--sidebar-accent)" : "transparent",
                        color: isActive
                          ? "var(--sidebar-accent-foreground)"
                          : "var(--sidebar-foreground)",
                        opacity: isActive ? 1 : 0.7,
                        "&:hover": {
                          bgcolor: "var(--sidebar-accent)",
                          opacity: 1,
                        },
                        transition: "all 100ms ease",
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: collapsed && !isMobile ? 0 : 32,
                          color: isActive ? "var(--sidebar-primary)" : "inherit",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                        {/* Amber dot on icon when collapsed and there are pending requests */}
                        {collapsed && !isMobile && item.id === "front-office" && pendingCount > 0 && (
                          <Box
                            sx={{
                              position: "absolute",
                              top: -2,
                              right: -2,
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "#F59E0B",
                              border: "1.5px solid var(--sidebar)",
                            }}
                          />
                        )}
                      </ListItemIcon>
                      {(!collapsed || isMobile) && (
                        <ListItemText
                          primary={item.title}
                          primaryTypographyProps={{
                            fontSize: "0.8125rem",
                            fontWeight: isActive ? 600 : 400,
                          }}
                        />
                      )}
                      {(!collapsed || isMobile) && item.id === "front-office" && pendingCount > 0 && (
                        <Chip
                          label={pendingCount > 99 ? "99+" : pendingCount}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.625rem",
                            fontWeight: 700,
                            bgcolor: "#F59E0B",
                            color: "#fff",
                            ml: 0.5,
                            "& .MuiChip-label": { px: 0.75 },
                          }}
                        />
                      )}
                    </ListItemButton>
                  </ListItem>
                );

                return collapsed && !isMobile ? (
                  <Tooltip key={item.id} title={item.title} placement="right" arrow>
                    {button}
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Collapse Toggle (desktop only) */}
      {!isMobile && (
        <Box
          sx={{
            p: 1,
            display: "flex",
            justifyContent: collapsed ? "center" : "flex-end",
            borderTop: "1px solid var(--sidebar-border)",
          }}
        >
          <IconButton
            onClick={onToggleCollapse}
            size="small"
            sx={{ color: "var(--sidebar-foreground)", opacity: 0.5, "&:hover": { opacity: 1 } }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </IconButton>
        </Box>
      )}
    </Box>
  );

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onClose={onClose}
        variant="temporary"
        ModalProps={{ keepMounted: true }}
        PaperProps={{ sx: { border: "none" } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Box
      component="nav"
      sx={{
        width,
        flexShrink: 0,
        transition: "width 200ms ease-out",
      }}
    >
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width,
          height: "100vh",
          transition: "width 200ms ease-out",
          zIndex: 1200,
        }}
      >
        {content}
      </Box>
    </Box>
  );
}

export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED };
