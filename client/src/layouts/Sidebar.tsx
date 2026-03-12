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
} from "@mui/material";
import { ChevronLeft, ChevronRight, Menu } from "lucide-react";
import { navigation } from "@/lib/navigation";
import { useRBAC } from "@/hooks/useRBAC";

const SIDEBAR_WIDTH = 256;
const SIDEBAR_COLLAPSED = 64;

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
};

export default function Sidebar({ open, collapsed, onToggleCollapse, onClose }: SidebarProps) {
  const [location] = useLocation();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));
  const { can } = useRBAC();

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
      {/* Brand Header */}
      <Box
        sx={{
          height: 64,
          display: "flex",
          alignItems: "center",
          px: collapsed && !isMobile ? 1.25 : 2.5,
          gap: 1.5,
          flexShrink: 0,
        }}
      >
        <Box
          component="img"
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/pa-brand-icon-nei7rkLNRiRHEnAFboJMs8.webp"
          alt="PA"
          sx={{ width: 32, height: 32, borderRadius: 1, flexShrink: 0 }}
        />
        {(!collapsed || isMobile) && (
          <Box sx={{ overflow: "hidden" }}>
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                fontSize: "0.875rem",
                color: "var(--sidebar-foreground)",
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              Peppr Around
            </Typography>
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
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: "var(--sidebar-border)", mx: 1.5 }} />

      {/* Navigation */}
      <Box sx={{ flex: 1, overflowY: "auto", overflowX: "hidden", py: 1 }}>
        {navigation.map((group) => ({
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
                  item.path === "/"
                    ? location === "/"
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
                        }}
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
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
