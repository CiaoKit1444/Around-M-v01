/**
 * FrontOfficePage — Live operations dashboard for guest sessions and service requests.
 *
 * Design: Precision Studio — split view with active sessions (left) and request queue (right).
 * Data: TanStack Query → FastAPI backend, with demo data fallback. Auto-refresh enabled.
 * Real-time: SSE connection for live updates (request.created, session.created, etc.)
 * Actions: Confirm, In Progress, Complete, Reject, Cancel — with reason dialog for rejections.
 */
import { useState, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Divider, Button, Tabs, Tab,
  IconButton, Tooltip, Alert, Badge, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress,
} from "@mui/material";
import {
  ConciergeBell, Clock, CheckCircle, XCircle, ArrowRight, RefreshCw, Users,
  Activity, Wifi, WifiOff, Bell, ChevronDown, ChevronUp, Play, Ban,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import StatCard from "@/components/shared/StatCard";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { useFrontOfficeSSE, type SSEEvent } from "@/hooks/useFrontOfficeSSE";
import { getDemoSessions, getDemoRequests } from "@/lib/api/demo-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { frontOfficeApi } from "@/lib/api/endpoints";
import type { ServiceRequest } from "@/lib/api/types";

const STATUS_PRIORITY_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  confirmed: "#2563EB",
  in_progress: "#8B5CF6",
  completed: "#10B981",
  rejected: "#DC2626",
  cancelled: "#A3A3A3",
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  "request.created": { label: "New Request", color: "#F59E0B" },
  "request.updated": { label: "Request Updated", color: "#2563EB" },
  "session.created": { label: "New Session", color: "#10B981" },
  "session.expired": { label: "Session Expired", color: "#A3A3A3" },
  connected: { label: "Connected", color: "#10B981" },
};

/** Valid status transitions for each current status */
const STATUS_ACTIONS: Record<string, { status: string; label: string; icon: typeof CheckCircle; color: string }[]> = {
  pending: [
    { status: "CONFIRMED", label: "Confirm", icon: CheckCircle, color: "success.main" },
    { status: "REJECTED", label: "Reject", icon: XCircle, color: "error.main" },
  ],
  confirmed: [
    { status: "IN_PROGRESS", label: "Start", icon: Play, color: "info.main" },
    { status: "CANCELLED", label: "Cancel", icon: Ban, color: "error.main" },
  ],
  in_progress: [
    { status: "COMPLETED", label: "Complete", icon: CheckCircle, color: "success.main" },
    { status: "CANCELLED", label: "Cancel", icon: Ban, color: "error.main" },
  ],
};

/** Statuses that require a reason */
const REASON_REQUIRED_STATUSES = ["REJECTED", "CANCELLED"];

export default function FrontOfficePage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState(0);
  const [showEvents, setShowEvents] = useState(false);
  const propertyId = "pr-001";
  const queryClient = useQueryClient();

  // Reason dialog state
  const [reasonDialog, setReasonDialog] = useState<{
    open: boolean;
    requestId: string;
    targetStatus: string;
    requestNumber: string;
  }>({ open: false, requestId: "", targetStatus: "", requestNumber: "" });
  const [reason, setReason] = useState("");

  // Real-time SSE connection
  const { isConnected, events, unreadCount, clearUnread } = useFrontOfficeSSE(propertyId);

  const sessionsQuery = useQuery({
    queryKey: ["front-office", "sessions", propertyId],
    queryFn: () => frontOfficeApi.sessions(propertyId),
    staleTime: 10_000,
  });
  const requestsQuery = useQuery({
    queryKey: ["front-office", "requests", propertyId],
    queryFn: () => frontOfficeApi.requests(propertyId),
    staleTime: 10_000,
  });

  const { data: sessionsData, isDemo: sessionsDemo } = useDemoFallback(sessionsQuery, getDemoSessions());
  const { data: requestsData, isDemo: requestsDemo } = useDemoFallback(requestsQuery, getDemoRequests());

  const sessions = sessionsData?.items ?? [];
  const requests = requestsData?.items ?? [];
  const isDemo = sessionsDemo || requestsDemo;

  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const inProgressRequests = requests.filter((r) => r.status === "in_progress").length;
  const completedToday = requests.filter((r) => r.status === "completed").length;

  const filteredRequests = tab === 0
    ? requests
    : tab === 1
    ? requests.filter((r) => ["pending", "confirmed", "in_progress"].includes(r.status))
    : requests.filter((r) => r.status === "completed");

  // Status update mutation with optimistic updates
  const statusMutation = useMutation({
    mutationFn: ({ requestId, status, reason }: { requestId: string; status: string; reason?: string }) =>
      frontOfficeApi.updateRequestStatus(requestId, status, reason),
    onMutate: async ({ requestId, status }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["front-office", "requests", propertyId] });

      // Snapshot previous value
      const previous = queryClient.getQueryData(["front-office", "requests", propertyId]);

      // Optimistically update the request status
      queryClient.setQueryData(
        ["front-office", "requests", propertyId],
        (old: any) => {
          if (!old?.items) return old;
          return {
            ...old,
            items: old.items.map((r: ServiceRequest) =>
              r.id === requestId ? { ...r, status: status.toLowerCase() } : r
            ),
          };
        }
      );

      return { previous };
    },
    onError: (err: any, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(["front-office", "requests", propertyId], context.previous);
      }
      const message = err?.message || "Failed to update request status";
      toast.error(message);
    },
    onSuccess: (_data, vars) => {
      const label = vars.status.charAt(0) + vars.status.slice(1).toLowerCase();
      toast.success(`Request ${label.replace("_", " ")} successfully`);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["front-office", "requests", propertyId] });
    },
  });

  const handleStatusAction = useCallback(
    (requestId: string, targetStatus: string, requestNumber: string) => {
      if (REASON_REQUIRED_STATUSES.includes(targetStatus)) {
        setReasonDialog({ open: true, requestId, targetStatus, requestNumber });
        setReason("");
      } else {
        statusMutation.mutate({ requestId, status: targetStatus });
      }
    },
    [statusMutation]
  );

  const handleReasonSubmit = useCallback(() => {
    if (!reason.trim()) {
      toast.error("Please provide a reason");
      return;
    }
    statusMutation.mutate({
      requestId: reasonDialog.requestId,
      status: reasonDialog.targetStatus,
      reason: reason.trim(),
    });
    setReasonDialog({ open: false, requestId: "", targetStatus: "", requestNumber: "" });
    setReason("");
  }, [reason, reasonDialog, statusMutation]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["front-office"] });
  }, [queryClient]);

  const handleToggleEvents = useCallback(() => {
    setShowEvents((prev) => !prev);
    if (!showEvents) clearUnread();
  }, [showEvents, clearUnread]);

  return (
    <Box>
      <PageHeader
        title="Front Office"
        subtitle="Monitor guest sessions and manage service requests in real-time"
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            {/* SSE Connection Status */}
            <Chip
              icon={isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
              label={isConnected ? "Live" : "Offline"}
              size="small"
              color={isConnected ? "success" : "default"}
              variant={isConnected ? "filled" : "outlined"}
              sx={{ fontWeight: 500, fontSize: "0.6875rem" }}
            />

            {/* Live Events Toggle */}
            <Badge badgeContent={unreadCount} color="error" max={99}>
              <Button
                variant={showEvents ? "contained" : "outlined"}
                size="small"
                startIcon={<Bell size={14} />}
                endIcon={showEvents ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                onClick={handleToggleEvents}
                sx={{ textTransform: "none" }}
              >
                Events
              </Button>
            </Badge>

            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={14} />}
              onClick={handleRefresh}
            >
              Refresh
            </Button>
          </Box>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo data — connect the FastAPI backend to see live data.
        </Alert>
      )}

      {/* Live Events Panel */}
      <Collapse in={showEvents}>
        <Card sx={{ mb: 2, border: "1px solid", borderColor: "divider" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 0.5 }}>
              <Activity size={14} />
              Live Event Feed
              {isConnected && (
                <Box
                  component="span"
                  sx={{
                    width: 6, height: 6, borderRadius: "50%", bgcolor: "#10B981",
                    display: "inline-block", ml: 0.5,
                    animation: "pulse 2s infinite",
                    "@keyframes pulse": {
                      "0%": { opacity: 1 },
                      "50%": { opacity: 0.4 },
                      "100%": { opacity: 1 },
                    },
                  }}
                />
              )}
            </Typography>
            {events.length === 0 ? (
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 2 }}>
                No events yet — waiting for activity...
              </Typography>
            ) : (
              <Box sx={{ maxHeight: 200, overflow: "auto" }}>
                {events.slice(0, 20).map((event, i) => (
                  <EventRow key={`${event.type}-${event.timestamp}-${i}`} event={event} />
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Collapse>

      {/* Stats Row */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
        <StatCard title="Active Sessions" value={activeSessions} icon={Activity} iconColor="#2563EB" />
        <StatCard title="Pending Requests" value={pendingRequests} icon={Clock} iconColor="#F59E0B" />
        <StatCard title="In Progress" value={inProgressRequests} icon={RefreshCw} iconColor="#8B5CF6" />
        <StatCard title="Completed Today" value={completedToday} icon={CheckCircle} iconColor="#10B981" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" }, gap: 2 }}>
        {/* Left: Active Sessions */}
        <Card sx={{ height: "fit-content" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h5">
                <Users size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Active Sessions
              </Typography>
              <Chip label={sessions.length} size="small" color="primary" />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {sessions.map((session, i) => (
                <Box key={session.id}>
                  <Box
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1, px: 1, mx: -1,
                    }}
                    onClick={() => navigate(`/front-office/sessions/${session.id}`)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: "0.6875rem", fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>
                        {session.room_number}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>Room {session.room_number}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          <Clock size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                          {session.request_count} requests
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <StatusChip status={session.status} />
                      <ArrowRight size={14} color="#A3A3A3" />
                    </Box>
                  </Box>
                  {i < sessions.length - 1 && <Divider />}
                </Box>
              ))}
              {sessions.length === 0 && (
                <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4, fontSize: "0.8125rem" }}>
                  No active sessions
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Right: Request Queue */}
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h5">
                <ConciergeBell size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Service Requests
              </Typography>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
              <Tab label={`All (${requests.length})`} />
              <Tab label={`Active (${requests.filter((r) => ["pending", "confirmed", "in_progress"].includes(r.status)).length})`} />
              <Tab label={`Completed (${requests.filter((r) => r.status === "completed").length})`} />
            </Tabs>

            <Box>
              {filteredRequests.map((req, i) => (
                <Box key={req.id}>
                  <Box
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1, px: 1, mx: -1,
                    }}
                    onClick={() => navigate(`/front-office/requests/${req.id}`)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                      <Box sx={{ width: 3, height: 32, borderRadius: 1, bgcolor: STATUS_PRIORITY_COLORS[req.status] || "#737373" }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{req.catalog_item_name}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", color: "text.secondary" }}>
                            {req.request_number}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>Room {req.room_number}</Typography>
                          <Typography variant="body2" sx={{ color: "text.disabled" }}>{new Date(req.created_at).toLocaleTimeString()}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <StatusChip status={req.status} />
                      {/* Action buttons based on current status */}
                      {STATUS_ACTIONS[req.status] && (
                        <Box sx={{ display: "flex", gap: 0.25 }}>
                          {STATUS_ACTIONS[req.status].map((action) => {
                            const Icon = action.icon;
                            return (
                              <Tooltip key={action.status} title={action.label}>
                                <IconButton
                                  size="small"
                                  sx={{ color: action.color }}
                                  disabled={statusMutation.isPending}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStatusAction(req.id, action.status, req.request_number);
                                  }}
                                >
                                  {statusMutation.isPending && statusMutation.variables?.requestId === req.id ? (
                                    <CircularProgress size={16} />
                                  ) : (
                                    <Icon size={16} />
                                  )}
                                </IconButton>
                              </Tooltip>
                            );
                          })}
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {i < filteredRequests.length - 1 && <Divider />}
                </Box>
              ))}
              {filteredRequests.length === 0 && (
                <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4, fontSize: "0.8125rem" }}>
                  No requests in this category
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Reason Dialog (for Reject / Cancel) */}
      <Dialog
        open={reasonDialog.open}
        onClose={() => setReasonDialog({ open: false, requestId: "", targetStatus: "", requestNumber: "" })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ pb: 1 }}>
          {reasonDialog.targetStatus === "REJECTED" ? "Reject Request" : "Cancel Request"}
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {reasonDialog.requestNumber}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            rows={3}
            label="Reason"
            placeholder={
              reasonDialog.targetStatus === "REJECTED"
                ? "e.g., Service not available at this time..."
                : "e.g., Guest requested cancellation..."
            }
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            sx={{ mt: 1 }}
            error={reason.length > 500}
            helperText={reason.length > 500 ? "Maximum 500 characters" : `${reason.length}/500`}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setReasonDialog({ open: false, requestId: "", targetStatus: "", requestNumber: "" })}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color={reasonDialog.targetStatus === "REJECTED" ? "error" : "warning"}
            onClick={handleReasonSubmit}
            disabled={!reason.trim() || reason.length > 500 || statusMutation.isPending}
            startIcon={statusMutation.isPending ? <CircularProgress size={16} /> : undefined}
          >
            {reasonDialog.targetStatus === "REJECTED" ? "Reject" : "Cancel Request"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/**
 * EventRow — Single event in the live feed.
 */
function EventRow({ event }: { event: SSEEvent }) {
  const config = EVENT_LABELS[event.type] || { label: event.type, color: "#737373" };
  const timeStr = new Date(event.receivedAt).toLocaleTimeString();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 0.75,
        px: 1,
        borderRadius: 1,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box
        sx={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          bgcolor: config.color,
          flexShrink: 0,
        }}
      />
      <Chip
        label={config.label}
        size="small"
        sx={{
          height: 20,
          fontSize: "0.625rem",
          fontWeight: 600,
          bgcolor: `${config.color}18`,
          color: config.color,
          border: `1px solid ${config.color}30`,
        }}
      />
      <Typography
        variant="body2"
        sx={{ flex: 1, fontSize: "0.75rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
      >
        {event.data.message ? String(event.data.message) : event.data.delta ? `+${event.data.delta} new` : JSON.stringify(event.data).slice(0, 60)}
      </Typography>
      <Typography variant="body2" sx={{ fontSize: "0.625rem", color: "text.disabled", flexShrink: 0 }}>
        {timeStr}
      </Typography>
    </Box>
  );
}
