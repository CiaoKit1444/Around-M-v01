/**
 * NotificationCenter — Email-style in-app inbox.
 *
 * Two-panel design inside a single Popover:
 *  LIST VIEW  — compact envelope rows: avatar | subject + snippet + meta | unread dot + dismiss
 *  DETAIL VIEW — full message pane: back arrow | subject | body | metadata | action buttons
 *
 * Features preserved from previous version:
 *  - Tab filter (All / Requests / Sessions / System / Archived)
 *  - Property dropdown filter
 *  - Group collapse for 5+ requests from the same property
 *  - Inline quick-action mutations (Confirm, In Progress, Confirm Fulfilled)
 *  - Soft-archive on dismiss + Archived tab with restore
 *  - Mute toggle in header
 *  - Mark all read / Clear all
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Badge, IconButton, Tooltip, Popover, Box, Typography,
  List, Divider, Button, Chip, Tabs, Tab, Avatar,
} from "@mui/material";
import {
  Bell, BellOff, CheckCheck, ConciergeBell, Users, AlertCircle, Info,
  X, Eye, CheckCircle2, Truck, Loader2, Archive, RotateCcw, ArrowLeft,
  ChevronDown, ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface Notification {
  id: string;
  type: "request" | "session" | "system" | "info";
  title: string;
  message?: string;
  timestamp: Date;
  read: boolean;
  path?: string;
  requestId?: string;
  requestStatus?: string;
  propertyId?: string;
  propertyName?: string;
}

const TYPE_ICONS: Record<Notification["type"], React.ElementType> = {
  request: ConciergeBell,
  session: Users,
  system: AlertCircle,
  info: Info,
};

const TYPE_COLORS: Record<Notification["type"], string> = {
  request: "#F59E0B",
  session: "#10B981",
  system: "#EF4444",
  info: "#3B82F6",
};

const GROUP_LABELS: Record<Notification["type"], string> = {
  request: "Service Requests",
  session: "Guest Sessions",
  system: "System",
  info: "Info",
};

const TABS = [
  { label: "All",      value: "all"      as const },
  { label: "Requests", value: "request"  as const },
  { label: "Sessions", value: "session"  as const },
  { label: "System",   value: "system"   as const },
  { label: "Archived", value: "archived" as const },
];

interface PropertyOption { id: string; name: string; }

interface ArchivedNotificationItem extends Notification {
  archivedAt: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  archivedNotifications?: ArchivedNotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onDismiss: (id: string) => void;
  onBatchDismiss?: (ids: string[]) => void;
  onRestoreArchived?: (id: string) => void;
  onClearAll: () => void;
  properties?: PropertyOption[];
  muted?: boolean;
  muteRemainingLabel?: string;
  onToggleMute?: () => void;
}

const PROP_FILTER_KEY = "peppr_inbox_property_filter";

// ─────────────────────────────────────────────────────────────────────────────
// EnvelopeRow — a single compact email-style row in the list view
// ─────────────────────────────────────────────────────────────────────────────
function EnvelopeRow({
  n,
  onClick,
  onDismiss,
}: {
  n: Notification;
  onClick: () => void;
  onDismiss: (e: React.MouseEvent) => void;
}) {
  const Icon = TYPE_ICONS[n.type];
  const color = TYPE_COLORS[n.type];

  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.25,
        px: 2,
        py: 1.25,
        cursor: "pointer",
        borderLeft: n.read ? "3px solid transparent" : `3px solid ${color}`,
        bgcolor: n.read ? "transparent" : "action.hover",
        transition: "background 0.12s",
        "&:hover": { bgcolor: "action.selected" },
        position: "relative",
      }}
    >
      {/* Avatar */}
      <Avatar
        sx={{
          width: 32, height: 32,
          bgcolor: `${color}22`,
          color,
          flexShrink: 0,
          mt: 0.25,
        }}
      >
        <Icon size={15} />
      </Avatar>

      {/* Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Subject line */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.2 }}>
          <Typography
            variant="body2"
            fontWeight={n.read ? 400 : 700}
            fontSize="0.82rem"
            sx={{
              flex: 1, lineHeight: 1.3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {n.title}
          </Typography>
          {!n.read && (
            <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "primary.main", flexShrink: 0 }} />
          )}
        </Box>

        {/* Preview snippet */}
        {n.message && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              fontSize: "0.75rem",
              lineHeight: 1.35,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              mb: 0.4,
            }}
          >
            {n.message}
          </Typography>
        )}

        {/* Meta row: timestamp · property */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.7rem" }}>
            {formatDistanceToNow(n.timestamp, { addSuffix: true })}
          </Typography>
          {n.propertyName && (
            <>
              <Box sx={{ width: 2, height: 2, borderRadius: "50%", bgcolor: "text.disabled", flexShrink: 0 }} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.68rem", color: "text.disabled", fontStyle: "italic",
                  maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
              >
                {n.propertyName}
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {/* Dismiss button */}
      <IconButton
        size="small"
        onClick={onDismiss}
        sx={{ opacity: 0.3, "&:hover": { opacity: 1 }, p: 0.25, flexShrink: 0, mt: 0.25 }}
      >
        <X size={11} />
      </IconButton>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailPane — full message view shown when a row is clicked
// ─────────────────────────────────────────────────────────────────────────────
function DetailPane({
  n,
  onBack,
  onDismiss,
  onNavigate,
  onMarkRead,
  updateStatus,
  pendingAction,
}: {
  n: Notification;
  onBack: () => void;
  onDismiss: () => void;
  onNavigate: (path: string) => void;
  onMarkRead: (id: string) => void;
  updateStatus: ReturnType<typeof trpc.requests.updateRequestStatus.useMutation>;
  pendingAction: string | null;
}) {
  const color = TYPE_COLORS[n.type];
  const Icon = TYPE_ICONS[n.type];

  const isPending    = n.type === "request" && !!n.requestId && ["PENDING", "SUBMITTED"].includes(n.requestStatus ?? "");
  const isDispatched = n.type === "request" && !!n.requestId && ["DISPATCHED", "SP_ACCEPTED", "PAYMENT_CONFIRMED"].includes(n.requestStatus ?? "");
  const isCompleted  = n.type === "request" && !!n.requestId && n.requestStatus === "COMPLETED";
  const hasActions   = isPending || isDispatched || isCompleted || !!n.requestId;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Detail header */}
      <Box sx={{
        px: 1.5, py: 1,
        display: "flex", alignItems: "center", gap: 1,
        borderBottom: "1px solid", borderColor: "divider",
        flexShrink: 0,
      }}>
        <Tooltip title="Back to inbox">
          <IconButton size="small" onClick={onBack} sx={{ color: "text.secondary" }}>
            <ArrowLeft size={16} />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle2" fontWeight={700} fontSize="0.85rem" sx={{ flex: 1, lineHeight: 1.3 }}>
          {n.title}
        </Typography>
        <Tooltip title="Archive message">
          <IconButton size="small" onClick={onDismiss} sx={{ color: "text.secondary", opacity: 0.5, "&:hover": { opacity: 1 } }}>
            <Archive size={14} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Metadata strip */}
      <Box sx={{
        px: 2, py: 1,
        display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap",
        borderBottom: "1px solid", borderColor: "divider",
        bgcolor: "action.hover",
        flexShrink: 0,
      }}>
        <Avatar sx={{ width: 24, height: 24, bgcolor: `${color}22`, color, flexShrink: 0 }}>
          <Icon size={12} />
        </Avatar>
        <Chip
          label={GROUP_LABELS[n.type]}
          size="small"
          sx={{ height: 18, fontSize: "0.65rem", bgcolor: `${color}22`, color, fontWeight: 600, "& .MuiChip-label": { px: 0.75 } }}
        />
        {n.propertyName && (
          <Chip
            label={n.propertyName}
            size="small"
            variant="outlined"
            sx={{ height: 18, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }}
          />
        )}
        <Typography variant="caption" color="text.disabled" sx={{ ml: "auto", fontSize: "0.7rem" }}>
          {format(n.timestamp, "MMM d, yyyy · HH:mm")}
        </Typography>
      </Box>

      {/* Message body */}
      <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
        {n.message ? (
          <Typography variant="body2" fontSize="0.85rem" color="text.primary" sx={{ lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
            {n.message}
          </Typography>
        ) : (
          <Typography variant="body2" fontSize="0.82rem" color="text.secondary" fontStyle="italic">
            No additional details.
          </Typography>
        )}

        {/* Request status badge */}
        {n.requestStatus && (
          <Box sx={{ mt: 2 }}>
            <Chip
              label={`Status: ${n.requestStatus.replace(/_/g, " ")}`}
              size="small"
              sx={{
                height: 20, fontSize: "0.7rem", fontWeight: 600,
                bgcolor: `${color}18`, color,
                "& .MuiChip-label": { px: 1 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Action footer */}
      {hasActions && (
        <Box sx={{
          px: 2, py: 1.25,
          borderTop: "1px solid", borderColor: "divider",
          display: "flex", gap: 0.75, flexWrap: "wrap",
          flexShrink: 0,
        }}>
          {n.requestId && (
            <Button
              size="small"
              variant="outlined"
              startIcon={<Eye size={12} />}
              onClick={() => {
                onMarkRead(n.id);
                onNavigate(`/admin/fo/requests/${n.requestId}`);
              }}
              sx={{ fontSize: "0.72rem", borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "primary.main", color: "primary.main" } }}
            >
              View Detail
            </Button>
          )}

          {isPending && (
            <Button
              size="small"
              variant="contained"
              disabled={pendingAction === `${n.requestId}:CONFIRMED`}
              startIcon={pendingAction === `${n.requestId}:CONFIRMED` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              onClick={() => { if (n.requestId) updateStatus.mutate({ requestId: n.requestId, status: "CONFIRMED" }); }}
              sx={{ fontSize: "0.72rem", bgcolor: "#F59E0B", "&:hover": { bgcolor: "#D97706" }, "&.Mui-disabled": { opacity: 0.5 } }}
            >
              Confirm
            </Button>
          )}

          {isDispatched && (
            <Button
              size="small"
              variant="contained"
              disabled={pendingAction === `${n.requestId}:IN_PROGRESS`}
              startIcon={pendingAction === `${n.requestId}:IN_PROGRESS` ? <Loader2 size={12} className="animate-spin" /> : <Truck size={12} />}
              onClick={() => { if (n.requestId) updateStatus.mutate({ requestId: n.requestId, status: "IN_PROGRESS" }); }}
              sx={{ fontSize: "0.72rem", bgcolor: "#10B981", "&:hover": { bgcolor: "#059669" }, "&.Mui-disabled": { opacity: 0.5 } }}
            >
              In Progress
            </Button>
          )}

          {isCompleted && (
            <Button
              size="small"
              variant="contained"
              disabled={pendingAction === `${n.requestId}:COMPLETED`}
              startIcon={pendingAction === `${n.requestId}:COMPLETED` ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
              onClick={() => {
                onMarkRead(n.id);
                onNavigate(`/admin/fo/requests/${n.requestId}?action=confirm`);
              }}
              sx={{ fontSize: "0.72rem", bgcolor: "#6366F1", "&:hover": { bgcolor: "#4F46E5" }, "&.Mui-disabled": { opacity: 0.5 } }}
            >
              Confirm Fulfilled
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NotificationCenter — main component
// ─────────────────────────────────────────────────────────────────────────────
export function NotificationCenter({
  notifications,
  archivedNotifications = [],
  onMarkRead,
  onMarkAllRead,
  onDismiss,
  onBatchDismiss,
  onRestoreArchived,
  onClearAll,
  properties = [],
  muted = false,
  muteRemainingLabel,
  onToggleMute,
}: NotificationCenterProps) {
  const [anchorEl, setAnchorEl]           = useState<null | HTMLElement>(null);
  const [activeTab, setActiveTab]         = useState<"all" | Notification["type"] | "archived">("all");
  const [confirmClear, setConfirmClear]   = useState(false);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [propertyFilter, setPropertyFilter] = useState<string>(
    () => localStorage.getItem(PROP_FILTER_KEY) ?? "all"
  );
  const [, navigate] = useLocation();
  const open = Boolean(anchorEl);

  // Persist property filter
  useEffect(() => {
    localStorage.setItem(PROP_FILTER_KEY, propertyFilter);
  }, [propertyFilter]);

  // Reset detail pane when popover closes
  useEffect(() => {
    if (!open) setSelectedId(null);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.read).length;
  const isArchivedTab = activeTab === "archived";

  const handleOpen  = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleRowClick = useCallback((n: Notification) => {
    onMarkRead(n.id);
    setSelectedId(n.id);
  }, [onMarkRead]);

  const handleBack = useCallback(() => setSelectedId(null), []);

  const handleNavigate = useCallback((path: string) => {
    navigate(path);
    handleClose();
  }, [navigate]);

  const toggleGroupExpand = (propertyId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
  };

  // Inline status mutation
  const utils = trpc.useUtils();
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const updateStatus = trpc.requests.updateRequestStatus.useMutation({
    onMutate: ({ requestId, status }) => setPendingAction(`${requestId}:${status}`),
    onSuccess: ({ requestId, newStatus }) => {
      setPendingAction(null);
      onMarkRead(requestId);
      utils.requests.listByProperty.invalidate();
      const label = newStatus === "CONFIRMED" ? "Confirmed" : newStatus === "IN_PROGRESS" ? "In Progress" : newStatus === "COMPLETED" ? "Completed" : newStatus;
      toast.success(`Request ${label}`);
    },
    onError: (err) => {
      setPendingAction(null);
      toast.error(`Action failed: ${err.message}`);
    },
  });

  // Derived properties for filter dropdown
  const inboxProperties = useMemo(() => {
    const seen = new Map<string, string>();
    for (const n of notifications) {
      if (n.propertyId && n.propertyName && !seen.has(n.propertyId)) seen.set(n.propertyId, n.propertyName);
    }
    for (const p of properties) {
      if (!seen.has(p.id)) seen.set(p.id, p.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [notifications, properties]);

  // Filtered + grouped
  const filtered = useMemo(() => {
    let result = notifications;
    if (activeTab !== "all") result = result.filter(n => n.type === activeTab);
    if (propertyFilter !== "all") result = result.filter(n => !n.propertyId || n.propertyId === propertyFilter);
    return result;
  }, [notifications, activeTab, propertyFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    for (const n of filtered) {
      if (!groups[n.type]) groups[n.type] = [];
      groups[n.type].push(n);
    }
    const order: Notification["type"][] = ["request", "session", "system", "info"];
    return order.filter(t => groups[t]?.length).map(t => ({ type: t, items: groups[t] }));
  }, [filtered]);

  type RenderItem =
    | { kind: "single"; notification: Notification }
    | { kind: "group"; propertyId: string; propertyName: string; items: Notification[]; unread: number };

  const buildRequestRenderItems = useCallback((items: Notification[]): RenderItem[] => {
    const COLLAPSE_THRESHOLD = 5;
    const byProperty = new Map<string, Notification[]>();
    const noProperty: Notification[] = [];
    for (const n of items) {
      if (n.propertyId) {
        const arr = byProperty.get(n.propertyId) ?? [];
        arr.push(n);
        byProperty.set(n.propertyId, arr);
      } else {
        noProperty.push(n);
      }
    }
    const result: RenderItem[] = [];
    for (const [propId, propItems] of Array.from(byProperty.entries())) {
      if (propItems.length >= COLLAPSE_THRESHOLD && !expandedGroups.has(propId)) {
        result.push({ kind: "group", propertyId: propId, propertyName: propItems[0].propertyName ?? propId, items: propItems, unread: propItems.filter((n: Notification) => !n.read).length });
      } else {
        for (const n of propItems) result.push({ kind: "single", notification: n });
      }
    }
    for (const n of noProperty) result.push({ kind: "single", notification: n });
    result.sort((a, b) => {
      if (a.kind === "group" && b.kind === "group") return b.unread - a.unread;
      if (a.kind === "group") return -1;
      if (b.kind === "group") return 1;
      return b.notification.timestamp.getTime() - a.notification.timestamp.getTime();
    });
    return result;
  }, [expandedGroups]);

  const unreadByType = useMemo(() => {
    const counts: Record<string, number> = { all: 0, request: 0, session: 0, system: 0, info: 0 };
    for (const n of notifications) {
      if (!n.read) { counts.all += 1; counts[n.type] = (counts[n.type] ?? 0) + 1; }
    }
    return counts;
  }, [notifications]);

  // The selected notification object
  const selectedNotification = selectedId
    ? (notifications.find(n => n.id === selectedId) ?? null)
    : null;

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
              width: 420,
              height: 560,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            },
          },
        }}
      >
        {/* ── DETAIL VIEW ─────────────────────────────────────────────────── */}
        {selectedNotification ? (
          <DetailPane
            n={selectedNotification}
            onBack={handleBack}
            onDismiss={() => { onDismiss(selectedNotification.id); handleBack(); }}
            onNavigate={handleNavigate}
            onMarkRead={onMarkRead}
            updateStatus={updateStatus}
            pendingAction={pendingAction}
          />
        ) : (
          <>
            {/* ── LIST VIEW HEADER ──────────────────────────────────────── */}
            <Box sx={{
              px: 2, py: 1.25,
              display: "flex", alignItems: "center", justifyContent: "space-between",
              borderBottom: "1px solid", borderColor: "divider",
              flexShrink: 0,
            }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="subtitle2" fontWeight={700} fontSize="0.9rem">Inbox</Typography>
                {unreadCount > 0 && (
                  <Chip label={unreadCount > 99 ? "99+" : unreadCount} size="small" color="error"
                    sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700 }} />
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                {unreadCount > 0 && (
                  <Button size="small" startIcon={<CheckCheck size={13} />} onClick={onMarkAllRead}
                    sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                    Mark all read
                  </Button>
                )}
                {onToggleMute && (
                  <Tooltip title={muted ? `Muted${muteRemainingLabel ? ` — ${muteRemainingLabel}` : ""} — click to unmute` : "Mute alerts (30 min)"}>
                    <IconButton size="small" onClick={onToggleMute}
                      sx={{ color: muted ? "warning.main" : "text.secondary", bgcolor: muted ? "warning.main18" : "transparent" }}>
                      {muted ? <BellOff size={15} /> : <Bell size={15} />}
                    </IconButton>
                  </Tooltip>
                )}
                {notifications.length > 0 && !confirmClear && (
                  <Tooltip title="Clear all (shift handover)">
                    <Button size="small" onClick={() => setConfirmClear(true)}
                      sx={{ fontSize: "0.72rem", color: "error.main", minWidth: 0, px: 0.75 }}>
                      Clear all
                    </Button>
                  </Tooltip>
                )}
                {confirmClear && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, border: "1px solid", borderColor: "error.main", borderRadius: 1, px: 1, py: 0.25 }}>
                    <Typography variant="caption" sx={{ color: "error.main", fontSize: "0.68rem", fontWeight: 600 }}>
                      Clear {notifications.length}?
                    </Typography>
                    <Button size="small" onClick={() => { onClearAll(); setConfirmClear(false); }}
                      sx={{ fontSize: "0.68rem", color: "error.main", minWidth: 0, px: 0.5, py: 0 }}>Yes</Button>
                    <Button size="small" onClick={() => setConfirmClear(false)}
                      sx={{ fontSize: "0.68rem", color: "text.secondary", minWidth: 0, px: 0.5, py: 0 }}>No</Button>
                  </Box>
                )}
              </Box>
            </Box>

            {/* ── TABS ─────────────────────────────────────────────────── */}
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
                        {(unreadByType[tab.value] ?? 0) > 0 && (
                          <Box sx={{
                            width: 16, height: 16, borderRadius: "50%",
                            bgcolor: "error.main", color: "#fff",
                            fontSize: "0.6rem", fontWeight: 700,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            {unreadByType[tab.value] > 9 ? "9+" : unreadByType[tab.value]}
                          </Box>
                        )}
                      </Box>
                    }
                  />
                ))}
              </Tabs>
            </Box>

            {/* ── PROPERTY FILTER ──────────────────────────────────────── */}
            {inboxProperties.length > 1 && (
              <Box sx={{
                px: 2, py: 0.75,
                display: "flex", alignItems: "center", gap: 1,
                borderBottom: "1px solid", borderColor: "divider",
                flexShrink: 0, bgcolor: "action.hover",
              }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", whiteSpace: "nowrap", fontWeight: 600 }}>
                  Property:
                </Typography>
                <Box
                  component="select"
                  value={propertyFilter}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPropertyFilter(e.target.value)}
                  sx={{
                    flex: 1, fontSize: "0.72rem",
                    border: "1px solid", borderColor: "divider",
                    borderRadius: 1, px: 0.75, py: 0.25,
                    bgcolor: "background.paper", color: "text.primary",
                    cursor: "pointer", outline: "none",
                    "&:focus": { borderColor: "primary.main" },
                  }}
                >
                  <option value="all">All Properties ({notifications.length})</option>
                  {inboxProperties.map(p => {
                    const count = notifications.filter(n => n.propertyId === p.id).length;
                    return <option key={p.id} value={p.id}>{p.name} ({count})</option>;
                  })}
                </Box>
                {propertyFilter !== "all" && (
                  <Tooltip title="Show all properties">
                    <IconButton size="small" onClick={() => setPropertyFilter("all")} sx={{ p: 0.25 }}>
                      <X size={12} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            )}

            {/* ── NOTIFICATION LIST ─────────────────────────────────────── */}
            <Box sx={{ overflow: "auto", flex: 1 }}>
              {/* Archived tab */}
              {isArchivedTab ? (
                archivedNotifications.length === 0 ? (
                  <Box sx={{ py: 5, textAlign: "center" }}>
                    <Archive size={28} style={{ opacity: 0.2, margin: "0 auto 8px" }} />
                    <Typography variant="body2" color="text.secondary" fontSize="0.85rem">No archived notifications</Typography>
                    <Typography variant="caption" color="text.disabled">Dismissed items appear here</Typography>
                  </Box>
                ) : (
                  <List disablePadding>
                    {archivedNotifications.map((n, idx) => {
                      const Icon = TYPE_ICONS[n.type] ?? Info;
                      const color = TYPE_COLORS[n.type];
                      return (
                        <Box key={n.id}>
                          {idx > 0 && <Divider sx={{ ml: 7 }} />}
                          <Box sx={{
                            display: "flex", alignItems: "flex-start", gap: 1.25,
                            px: 2, py: 1.25, opacity: 0.7,
                            "&:hover": { opacity: 1, bgcolor: "action.hover" },
                          }}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: `${color}22`, color, flexShrink: 0, mt: 0.25 }}>
                              <Icon size={13} />
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography variant="body2" fontSize="0.82rem" sx={{ lineHeight: 1.3, mb: 0.2 }}>{n.title}</Typography>
                              {n.message && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mb: 0.3 }}>
                                  {n.message}
                                </Typography>
                              )}
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.7rem" }}>
                                Archived {formatDistanceToNow(new Date(n.archivedAt), { addSuffix: true })}
                              </Typography>
                            </Box>
                            {onRestoreArchived && (
                              <Tooltip title="Restore to inbox">
                                <IconButton size="small" onClick={() => onRestoreArchived(n.id)}
                                  sx={{ opacity: 0.5, "&:hover": { opacity: 1 }, p: 0.25, flexShrink: 0, color: "primary.main" }}>
                                  <RotateCcw size={13} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </List>
                )
              ) : grouped.length === 0 ? (
                <Box sx={{ py: 5, textAlign: "center" }}>
                  <Bell size={28} style={{ opacity: 0.2, margin: "0 auto 8px" }} />
                  <Typography variant="body2" color="text.secondary" fontSize="0.85rem">
                    {activeTab === "all" ? "No notifications yet" : `No ${GROUP_LABELS[activeTab as Notification["type"]] ?? ""} notifications`}
                  </Typography>
                  <Typography variant="caption" color="text.disabled">You're all caught up!</Typography>
                </Box>
              ) : (
                grouped.map(({ type, items }) => (
                  <Box key={type}>
                    {/* Section header */}
                    <Box sx={{
                      px: 2, py: 0.5,
                      bgcolor: "action.hover",
                      display: "flex", alignItems: "center", gap: 1,
                      position: "sticky", top: 0, zIndex: 1,
                    }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: TYPE_COLORS[type as Notification["type"]], flexShrink: 0 }} />
                      <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.68rem" }}>
                        {GROUP_LABELS[type as Notification["type"]]}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" sx={{ ml: "auto", fontSize: "0.68rem" }}>
                        {items.filter(n => !n.read).length > 0 && `${items.filter(n => !n.read).length} unread`}
                      </Typography>
                    </Box>

                    {(type === "request" ? buildRequestRenderItems(items) : items.map(n => ({ kind: "single" as const, notification: n }))).map((renderItem, idx) => {
                      // Collapsed group card
                      if (renderItem.kind === "group") {
                        const g = renderItem;
                        return (
                          <Box key={`group-${g.propertyId}`}>
                            {idx > 0 && <Divider sx={{ ml: 7 }} />}
                            <Box
                              onClick={() => toggleGroupExpand(g.propertyId)}
                              sx={{
                                display: "flex", alignItems: "center", gap: 1.25,
                                px: 2, py: 1.25, cursor: "pointer",
                                bgcolor: "action.hover",
                                borderLeft: g.unread > 0 ? `3px solid ${TYPE_COLORS.request}` : "3px solid transparent",
                                "&:hover": { bgcolor: "action.selected" },
                              }}
                            >
                              <Avatar sx={{ width: 32, height: 32, bgcolor: `${TYPE_COLORS.request}22`, color: TYPE_COLORS.request, flexShrink: 0 }}>
                                <ConciergeBell size={15} />
                              </Avatar>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.2 }}>
                                  <Typography variant="body2" fontWeight={700} fontSize="0.82rem" sx={{ flex: 1 }}>
                                    {g.items.length} pending requests
                                  </Typography>
                                  {g.unread > 0 && (
                                    <Chip label={g.unread} size="small" sx={{ height: 16, fontSize: "0.65rem", bgcolor: TYPE_COLORS.request, color: "#fff", "& .MuiChip-label": { px: 0.75 } }} />
                                  )}
                                </Box>
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.75rem" }}>
                                  {g.propertyName} — tap to expand
                                </Typography>
                              </Box>
                              {onBatchDismiss && (
                                <Tooltip title={`Archive all ${g.items.length}`}>
                                  <IconButton size="small" onClick={(e) => { e.stopPropagation(); onBatchDismiss(g.items.map(n => n.id)); }}
                                    sx={{ color: "text.secondary", "&:hover": { color: "error.main" } }}>
                                    <Archive size={14} />
                                  </IconButton>
                                </Tooltip>
                              )}
                              {expandedGroups.has(g.propertyId) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </Box>
                          </Box>
                        );
                      }

                      // Single envelope row
                      const n = renderItem.notification;
                      return (
                        <Box key={n.id}>
                          {idx > 0 && <Divider sx={{ ml: 7 }} />}
                          <EnvelopeRow
                            n={n}
                            onClick={() => handleRowClick(n)}
                            onDismiss={(e) => { e.stopPropagation(); onDismiss(n.id); }}
                          />
                        </Box>
                      );
                    })}
                  </Box>
                ))
              )}
            </Box>

            {/* Footer */}
            {notifications.length > 0 && (
              <Box sx={{ px: 2, py: 0.75, borderTop: "1px solid", borderColor: "divider", textAlign: "center", flexShrink: 0 }}>
                <Button size="small"
                  onClick={() => {
                    const typeParam = activeTab !== "all" ? `?type=${activeTab}` : "";
                    navigate(`/admin/reports/audit${typeParam}`);
                    handleClose();
                  }}
                  sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                  {activeTab !== "all" ? `View ${GROUP_LABELS[activeTab as Notification["type"]] ?? ""} in audit log` : "View full audit log"}
                </Button>
              </Box>
            )}
          </>
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
