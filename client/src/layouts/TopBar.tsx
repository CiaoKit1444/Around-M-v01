/**
 * TopBar — Minimal top bar with breadcrumbs, search, and user actions.
 *
 * Design: Precision Studio — clean, functional, no decoration.
 * Height: 56px. Background: transparent (content area bg shows through).
 */
import { useLocation } from "wouter";
import {
  Box,
  Breadcrumbs,
  IconButton,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  useMediaQuery,
  useTheme as useMuiTheme,
} from "@mui/material";
import { Menu as MenuIcon, Search, LogOut, Settings, User, Sun, Moon, RefreshCw, Loader2 } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { navigation } from "@/lib/navigation";
import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";
import { NotificationCenter, useNotifications } from "@/components/NotificationCenter";
import { ActiveRoleBadge } from "@/components/ActiveRoleBadge";

interface TopBarProps {
  onMenuClick: () => void;
}

function getBreadcrumbs(pathname: string) {
  const crumbs: { label: string; path: string }[] = [{ label: "Home", path: "/" }];
  if (pathname === "/") return crumbs;

  for (const group of navigation) {
    for (const item of group.items) {
      if (pathname.startsWith(item.path) && item.path !== "/") {
        crumbs.push({ label: item.title, path: item.path });
        break;
      }
    }
  }
  return crumbs;
}

function getPageTitle(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  for (const group of navigation) {
    for (const item of group.items) {
      if (pathname.startsWith(item.path) && item.path !== "/") {
        return item.title;
      }
    }
  }
  return "Page";
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();
  const { theme, toggleTheme } = useTheme();
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("md"));

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const { open: paletteOpen, setOpen: setPaletteOpen } = useCommandPalette();
  const { notifications, markRead, markAllRead, dismiss } = useNotifications();

  const breadcrumbs = getBreadcrumbs(location);
  const pageTitle = getPageTitle(location);

  const initials = user
    ? (user.full_name || user.first_name || "")
        .split(" ")
        .map((n: string) => n[0] || "")
        .slice(0, 2)
        .join("")
        .toUpperCase() || "PA"
    : "PA";

  return (
    <Box
      component="header"
      sx={{
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        px: { xs: 2, md: 3 },
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "sticky",
        top: 0,
        zIndex: 1100,
      }}
    >
      {/* Left: Menu + Breadcrumbs */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {isMobile && (
          <IconButton onClick={onMenuClick} size="small" sx={{ mr: 0.5 }}>
            <MenuIcon size={20} />
          </IconButton>
        )}
        <Box>
          <Typography variant="h4" sx={{ lineHeight: 1.2, mb: 0.25 }}>
            {pageTitle}
          </Typography>
          <Breadcrumbs
            separator="/"
            sx={{
              "& .MuiBreadcrumbs-separator": { mx: 0.5, color: "text.disabled" },
              "& .MuiBreadcrumbs-li": { lineHeight: 1 },
            }}
          >
            {breadcrumbs.map((crumb, i) => (
              <Typography
                key={crumb.path}
                variant="body2"
                sx={{
                  color: i === breadcrumbs.length - 1 ? "text.primary" : "text.secondary",
                  fontWeight: i === breadcrumbs.length - 1 ? 500 : 400,
                }}
              >
                {crumb.label}
              </Typography>
            ))}
          </Breadcrumbs>
        </Box>
      </Box>

      {/* Right: Actions */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {/* Active Role Badge with quick-switch */}
        <ActiveRoleBadge />
        <Tooltip title="Search (⌘K)">
          <IconButton size="small" sx={{ color: "text.secondary" }} onClick={() => setPaletteOpen(true)}>
            <Search size={18} />
          </IconButton>
        </Tooltip>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        <Tooltip title={theme === "dark" ? "Light mode" : "Dark mode"}>
          <IconButton size="small" sx={{ color: "text.secondary" }} onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </IconButton>
        </Tooltip>
        <NotificationCenter
          notifications={notifications}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
          onDismiss={dismiss}
        />
        <Tooltip title="Account">
          <IconButton
            onClick={(e) => setAnchorEl(e.currentTarget)}
            size="small"
            sx={{ ml: 0.5 }}
          >
            <Avatar
              sx={{
                width: 32,
                height: 32,
                fontSize: "0.75rem",
                fontWeight: 600,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              {initials}
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={anchorEl}
          open={menuOpen}
          onClose={() => setAnchorEl(null)}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: { width: 200, mt: 1 },
            },
          }}
        >
          <Box sx={{ px: 2, py: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              {user ? (user.full_name || `${user.first_name} ${user.last_name}`) : "Admin User"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {user?.email || "admin@peppraround.com"}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon><User size={16} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem" }}>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => setAnchorEl(null)}>
            <ListItemIcon><Settings size={16} /></ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem" }}>Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem
            disabled={logoutMutation.isPending}
            onClick={async () => {
              setAnchorEl(null);
              // Clear tRPC session cookie on the server
              try { await logoutMutation.mutateAsync(); } catch { /* ignore */ }
              // Clear local auth state (tokens, user)
              logout();
              // Clear stored active role so the next user starts fresh
              localStorage.removeItem("peppr_active_role");
              // Redirect to login
              navigate("/auth/login");
            }}
          >
            <ListItemIcon>
              {logoutMutation.isPending
                ? <Loader2 size={16} className="animate-spin" />
                : <LogOut size={16} />}
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: "0.8125rem" }}>
              {logoutMutation.isPending ? "Signing out…" : "Sign out"}
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
