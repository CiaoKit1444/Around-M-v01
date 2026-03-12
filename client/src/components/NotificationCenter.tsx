/**
 * NotificationCenter — In-app notification bell with unread count.
 *
 * Shows recent events (new requests, status changes, system alerts)
 * with mark-as-read and click-to-navigate. Uses SSE events for live updates.
 */
import { useState, useCallback } from "react";
import {
  Badge, IconButton, Tooltip, Popover, Box, Typography,
  List, ListItem, ListItemButton, ListItemText, ListItemIcon,
  Divider, Button, Chip,
} from "@mui/material";
import { Bell, CheckCheck, ConciergeBell, QrCode, AlertCircle, Info, X } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  type: "request" | "qr" | "system" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  path?: string;
}

const TYPE_ICONS: Record<Notification["type"], React.ElementType> = {
  request: ConciergeBell,
  qr: QrCode,
  system: AlertCircle,
  info: Info,
};

const TYPE_COLORS: Record<Notification["type"], string> = {
  request: "primary.main",
  qr: "secondary.main",
  system: "error.main",
  info: "info.main",
};

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
}

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onDismiss,
}: NotificationCenterProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [, navigate] = useLocation();
  const open = Boolean(anchorEl);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleClose = () => setAnchorEl(null);

  const handleNotificationClick = useCallback((n: Notification) => {
    onMarkRead(n.id);
    if (n.path) {
      navigate(n.path);
      handleClose();
    }
  }, [onMarkRead, navigate]);

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton size="small" sx={{ color: "text.secondary" }} onClick={handleOpen}>
          <Badge badgeContent={unreadCount} color="error" max={99}>
            <Bell size={18} />
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: { width: 360, maxHeight: 480, overflow: "hidden", display: "flex", flexDirection: "column" },
          },
        }}
      >
        {/* Header */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid", borderColor: "divider" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>Notifications</Typography>
            {unreadCount > 0 && (
              <Chip label={unreadCount} size="small" color="error" sx={{ height: 18, fontSize: "0.65rem" }} />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCheck size={14} />}
              onClick={onMarkAllRead}
              sx={{ fontSize: "0.75rem" }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Notification List */}
        <List sx={{ overflow: "auto", flex: 1, py: 0 }}>
          {notifications.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No notifications"
                secondary="You're all caught up!"
                primaryTypographyProps={{ color: "text.secondary", fontSize: "0.875rem" }}
                secondaryTypographyProps={{ fontSize: "0.75rem" }}
              />
            </ListItem>
          ) : (
            notifications.map((n, idx) => {
              const Icon = TYPE_ICONS[n.type];
              return (
                <Box key={n.id}>
                  {idx > 0 && <Divider />}
                  <ListItemButton
                    onClick={() => handleNotificationClick(n)}
                    sx={{
                      py: 1.5,
                      px: 2,
                      bgcolor: n.read ? "transparent" : "action.hover",
                      "&:hover": { bgcolor: "action.selected" },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          bgcolor: `${TYPE_COLORS[n.type]}22`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: TYPE_COLORS[n.type],
                        }}
                      >
                        <Icon size={14} />
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Typography variant="body2" fontWeight={n.read ? 400 : 600} sx={{ flex: 1 }}>
                            {n.title}
                          </Typography>
                          {!n.read && (
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {n.message}
                          </Typography>
                          <Typography variant="caption" color="text.disabled">
                            {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                          </Typography>
                        </Box>
                      }
                    />
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                      sx={{ ml: 0.5, opacity: 0.4, "&:hover": { opacity: 1 } }}
                    >
                      <X size={12} />
                    </IconButton>
                  </ListItemButton>
                </Box>
              );
            })
          )}
        </List>

        {notifications.length > 0 && (
          <Box sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider", textAlign: "center" }}>
            <Button size="small" onClick={handleClose} sx={{ fontSize: "0.75rem" }}>
              View all activity in Audit Log
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}

/**
 * useNotifications — Manages notification state with SSE integration.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "read" | "timestamp">) => {
    setNotifications(prev => [
      { ...n, id: `notif-${Date.now()}-${Math.random()}`, read: false, timestamp: new Date() },
      ...prev.slice(0, 49), // Keep max 50
    ]);
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifications, addNotification, markRead, markAllRead, dismiss };
}
