/**
 * NotificationCenter — In-app notification inbox with grouped display.
 *
 * Features:
 *  - Groups notifications by type: "Service Requests", "Guest Sessions", "System"
 *  - Unread count badge on bell icon (caps at 99)
 *  - Per-item: click navigates to the relevant page, ✕ dismisses
 *  - Unread items have a blue left border + bold title + blue dot
 *  - "Mark all read" clears the badge
 *  - "View in Audit Log" footer link
 *  - Max 50 notifications kept in memory (oldest dropped)
 */
import { useState, useCallback, useMemo } from "react";
import {
  Badge, IconButton, Tooltip, Popover, Box, Typography,
  List, ListItemButton, ListItemText, ListItemIcon,
  Divider, Button, Chip, Tabs, Tab,
} from "@mui/material";
import { Bell, CheckCheck, ConciergeBell, Users, AlertCircle, Info, X, Eye, UserPlus } from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export interface Notification {
  id: string;
  type: "request" | "session" | "system" | "info";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  path?: string;
  /** For request notifications — enables inline quick-action buttons */
  requestId?: string;
  requestStatus?: string;
}

const TYPE_ICONS: Record<Notification["type"], React.ElementType> = {
  request: ConciergeBell,
  session: Users,
  system: AlertCircle,
  info: Info,
};

const TYPE_COLORS: Record<Notification["type"], string> = {
  request: "#F59E0B",   // amber — matches the pending banner
  session: "#10B981",   // green — check-in
  system: "#EF4444",    // red — errors
  info: "#3B82F6",      // blue — informational
};

/** Group labels shown as section headers inside the inbox */
const GROUP_LABELS: Record<Notification["type"], string> = {
  request: "Service Requests",
  session: "Guest Sessions",
  system: "System",
  info: "Info",
};

/** Tab filter options */
const TABS = [
  { label: "All", value: "all" as const },
  { label: "Requests", value: "request" as const },
  { label: "Sessions", value: "session" as const },
  { label: "System", value: "system" as const },
];

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
  const [activeTab, setActiveTab] = useState<"all" | Notification["type"]>("all");
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

  /** Filtered list based on active tab */
  const filtered = useMemo(() => {
    if (activeTab === "all") return notifications;
    return notifications.filter(n => n.type === activeTab);
  }, [notifications, activeTab]);

  /** Group filtered notifications by type, preserving recency order within each group */
  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of filtered) {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    }
    // Order: request → session → system → info
    const order: Notification["type"][] = ["request", "session", "system", "info"];
    return order.filter(t => groups[t]?.length).map(t => ({ type: t, items: groups[t] }));
  }, [filtered]);

  /** Unread count per tab for badge labels */
  const unreadByType = useMemo(() => {
    const counts: Record<string, number> = { all: 0, request: 0, session: 0, system: 0, info: 0 };
    for (const n of notifications) {
      if (!n.read) {
        counts.all += 1;
        counts[n.type] = (counts[n.type] ?? 0) + 1;
      }
    }
    return counts;
  }, [notifications]);

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
            sx: {
              width: 400,
              maxHeight: 560,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            },
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 2, py: 1.5,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderBottom: "1px solid", borderColor: "divider",
          flexShrink: 0,
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} fontSize="0.9rem">
              Inbox
            </Typography>
            {unreadCount > 0 && (
              <Chip
                label={unreadCount > 99 ? "99+" : unreadCount}
                size="small"
                color="error"
                sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }}
              />
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              size="small"
              startIcon={<CheckCheck size={13} />}
              onClick={onMarkAllRead}
              sx={{ fontSize: "0.72rem", color: "text.secondary" }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Tab filter */}
        <Box sx={{ borderBottom: "1px solid", borderColor: "divider", flexShrink: 0 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            variant="scrollable"
            scrollButtons={false}
            sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0, fontSize: "0.75rem" } }}
          >
            {TABS.map(tab => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {tab.label}
                    {unreadByType[tab.value] > 0 && (
                      <Box
                        sx={{
                          width: 16, height: 16, borderRadius: "50%",
                          bgcolor: "error.main", color: "#fff",
                          fontSize: "0.6rem", fontWeight: 700,
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}
                      >
                        {unreadByType[tab.value] > 9 ? "9+" : unreadByType[tab.value]}
                      </Box>
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>
        </Box>

        {/* Grouped notification list */}
        <Box sx={{ overflow: "auto", flex: 1 }}>
          {grouped.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <Bell size={28} style={{ opacity: 0.2, margin: "0 auto 8px" }} />
              <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                {activeTab === "all" ? "No notifications yet" : `No ${GROUP_LABELS[activeTab as Notification["type"]] ?? ""} notifications`}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                You're all caught up!
              </Typography>
            </Box>
          ) : (
            grouped.map(({ type, items }) => (
              <Box key={type}>
                {/* Group section header */}
                <Box sx={{
                  px: 2, py: 0.5,
                  bgcolor: "action.hover",
                  display: "flex", alignItems: "center", gap: 1,
                  position: "sticky", top: 0, zIndex: 1,
                }}>
                  <Box sx={{
                    width: 8, height: 8, borderRadius: "50%",
                    bgcolor: TYPE_COLORS[type as Notification["type"]],
                    flexShrink: 0,
                  }} />
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.68rem" }}>
                    {GROUP_LABELS[type as Notification["type"]]}
                  </Typography>
                  <Typography variant="caption" color="text.disabled" sx={{ ml: "auto", fontSize: "0.68rem" }}>
                    {items.filter(n => !n.read).length > 0 && `${items.filter(n => !n.read).length} unread`}
                  </Typography>
                </Box>

                <List disablePadding>
                  {items.map((n, idx) => {
                    const Icon = TYPE_ICONS[n.type];
                    const isPending = n.type === "request" && n.requestId && n.requestStatus === "SUBMITTED";
                    return (
                      <Box key={n.id}>
                        {idx > 0 && <Divider sx={{ ml: 7 }} />}
                        <Box sx={{ position: "relative" }}>
                          <ListItemButton
                            onClick={() => handleNotificationClick(n)}
                            sx={{
                              py: 1.25,
                              px: 2,
                              pb: isPending ? 4.5 : 1.25,
                              bgcolor: n.read ? "transparent" : "action.hover",
                              borderLeft: n.read ? "3px solid transparent" : `3px solid ${TYPE_COLORS[n.type]}`,
                              "&:hover": { bgcolor: "action.selected" },
                              transition: "border-color 0.15s",
                            }}
                          >
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <Box sx={{
                                width: 28, height: 28, borderRadius: "50%",
                                bgcolor: `${TYPE_COLORS[n.type]}22`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: TYPE_COLORS[n.type],
                                flexShrink: 0,
                              }}>
                                <Icon size={13} />
                              </Box>
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={n.read ? 400 : 600}
                                    fontSize="0.82rem"
                                    sx={{ flex: 1, lineHeight: 1.35 }}
                                  >
                                    {n.title}
                                  </Typography>
                                  {!n.read && (
                                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
                                  )}
                                </Box>
                              }
                              secondary={
                                <Box>
                                  <Typography variant="caption" color="text.secondary" display="block" sx={{ lineHeight: 1.3, fontSize: "0.75rem" }}>
                                    {n.message}
                                  </Typography>
                                  <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.7rem" }}>
                                    {formatDistanceToNow(n.timestamp, { addSuffix: true })}
                                  </Typography>
                                </Box>
                              }
                            />
                            <IconButton
                              size="small"
                              onClick={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                              sx={{ ml: 0.5, opacity: 0.35, "&:hover": { opacity: 1 }, p: 0.25, flexShrink: 0 }}
                            >
                              <X size={11} />
                            </IconButton>
                          </ListItemButton>

                          {/* Inline quick-action buttons for pending requests */}
                          {isPending && (
                            <Box
                              sx={{
                                position: "absolute", bottom: 6, left: 44, right: 36,
                                display: "flex", gap: 0.75,
                              }}
                            >
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Eye size={11} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkRead(n.id);
                                  navigate(`/admin/fo/requests/${n.requestId}`);
                                  handleClose();
                                }}
                                sx={{
                                  fontSize: "0.68rem", py: 0.25, px: 0.75, minWidth: 0,
                                  borderColor: "divider", color: "text.secondary",
                                  "&:hover": { borderColor: "primary.main", color: "primary.main" },
                                }}
                              >
                                View Detail
                              </Button>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<UserPlus size={11} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onMarkRead(n.id);
                                  navigate(`/admin/fo/requests/${n.requestId}?action=assign`);
                                  handleClose();
                                }}
                                sx={{
                                  fontSize: "0.68rem", py: 0.25, px: 0.75, minWidth: 0,
                                  borderColor: "#F59E0B", color: "#F59E0B",
                                  "&:hover": { bgcolor: "#F59E0B22", borderColor: "#F59E0B" },
                                }}
                              >
                                Assign
                              </Button>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    );
                  })}
                </List>
              </Box>
            ))
          )}
        </Box>

        {/* Footer */}
        {notifications.length > 0 && (
          <Box sx={{ px: 2, py: 0.75, borderTop: "1px solid", borderColor: "divider", textAlign: "center", flexShrink: 0 }}>
            <Button
              size="small"
              onClick={() => {
                // Pass the active tab as a ?type= filter so the Audit Log page pre-filters
                const typeParam = activeTab !== "all" ? `?type=${activeTab}` : "";
                navigate(`/admin/reports/audit${typeParam}`);
                handleClose();
              }}
              sx={{ fontSize: "0.72rem", color: "text.secondary" }}
            >
              {activeTab !== "all"
                ? `View ${GROUP_LABELS[activeTab as Notification["type"]] ?? ""} in audit log`
                : "View full audit log"}
            </Button>
          </Box>
        )}
      </Popover>
    </>
  );
}

/**
 * useNotifications — Manages notification state with SSE integration.
 *
 * Keeps max 50 notifications. Oldest are dropped when the limit is reached.
 * The `addNotification` function is called from useFrontOfficeSSE.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "read" | "timestamp">) => {
    setNotifications(prev => [
      { ...n, id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`, read: false, timestamp: new Date() },
      ...prev.slice(0, 49),
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
