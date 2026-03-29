/**
 * FrontOfficeMonitorPage — Live operations dashboard for guest sessions and service requests (Admin/Manager view).
 *
 * Design: Precision Studio — split view with active sessions (left) and request queue (right).
 * Data: TanStack Query → backend API, with demo data fallback. Auto-refresh enabled.
 * Real-time: SSE connection for live updates (request.created, session.created, etc.)
 * Actions: Confirm, In Progress, Complete, Reject, Cancel — with reason dialog for rejections.
 */
import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Divider, Button, Tabs, Tab,
  IconButton, Tooltip, Alert, Badge, Collapse, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, CircularProgress, InputAdornment, MenuItem, Select,
  FormControl, InputLabel, Checkbox,
} from "@mui/material";
import {
  ConciergeBell, Clock, CheckCircle, XCircle, ArrowRight, RefreshCw, Users,
  Activity, Wifi, WifiOff, Bell, ChevronDown, ChevronUp, Play, Ban, Search, Filter,
  UserCheck, UserPlus,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import StatCard from "@/components/shared/StatCard";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { useFrontOfficeSSE, type SSEEvent } from "@/hooks/useFrontOfficeSSE";
import { getDemoSessions, getDemoRequests } from "@/lib/api/demo-data";
import { FrontOfficeSkeleton } from "@/components/ui/DataStates";
import { trpc } from "@/lib/trpc";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import type { ServiceRequest } from "@/lib/api/types";

const STATUS_PRIORITY_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  CONFIRMED: "#2563EB",
  IN_PROGRESS: "#8B5CF6",
  FULFILLED: "#10B981",
  COMPLETED: "#10B981",
  REJECTED: "#DC2626",
  CANCELLED: "#A3A3A3",
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  "request.created": { label: "New Request", color: "#F59E0B" },
  "request.updated": { label: "Request Updated", color: "#2563EB" },
  "session.created": { label: "New Session", color: "#10B981" },
  "session.expired": { label: "Session Expired", color: "#A3A3A3" },
  connected: { label: "Connected", color: "#10B981" },
};

/** Valid status transitions for each current status — keys MUST match DB uppercase values */
const STATUS_ACTIONS: Record<string, { status: string; label: string; icon: typeof CheckCircle; color: string }[]> = {
  PENDING: [
    { status: "CONFIRMED", label: "Confirm", icon: CheckCircle, color: "success.main" },
    { status: "REJECTED", label: "Reject", icon: XCircle, color: "error.main" },
  ],
  CONFIRMED: [
    { status: "IN_PROGRESS", label: "Start", icon: Play, color: "info.main" },
    { status: "CANCELLED", label: "Cancel", icon: Ban, color: "error.main" },
  ],
  IN_PROGRESS: [
    { status: "FULFILLED", label: "Complete", icon: CheckCircle, color: "success.main" },
    { status: "CANCELLED", label: "Cancel", icon: Ban, color: "error.main" },
  ],
};

/** Statuses that require a reason */
const REASON_REQUIRED_STATUSES = ["REJECTED", "CANCELLED"];

export default function FrontOfficePage() {
  const [, navigate] = useLocation();
  const searchString = useSearch();

  // Dynamic browser tab title for the Admin monitor view
  const { propertyId: _pid } = useActiveProperty();
  useEffect(() => {
    document.title = "Front Office Monitor | Peppr Around";
    return () => { document.title = "Peppr Around Admin"; };
  }, []);

  // Read ?status and ?tab from the URL on first render so Dashboard stat cards
  // can deep-link directly into the right filter/tab combination.
  const urlParams = new URLSearchParams(searchString);
  const initialStatus = urlParams.get("status") ?? "all";
  const initialTab = parseInt(urlParams.get("tab") ?? "0", 10);

  const [tab, setTab] = useState(isNaN(initialTab) ? 0 : initialTab);
  const [showEvents, setShowEvents] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "priority">("newest");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  // Sync URL when filter changes so back-button and share links stay accurate
  const handleStatusFilterChange = useCallback((value: string) => {
    setStatusFilter(value);
    const params = new URLSearchParams(window.location.search);
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    const newSearch = params.toString();
    navigate(`/admin/front-office${newSearch ? `?${newSearch}` : ""}`, { replace: true });
  }, [navigate]);

  const handleTabChange = useCallback((_: unknown, v: number) => {
    setTab(v);
    const params = new URLSearchParams(window.location.search);
    if (v === 0) {
      params.delete("tab");
    } else {
      params.set("tab", String(v));
    }
    const newSearch = params.toString();
    navigate(`/admin/front-office${newSearch ? `?${newSearch}` : ""}`, { replace: true });
  }, [navigate]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { propertyId } = useActiveProperty();

  // Reason dialog state
  const [reasonDialog, setReasonDialog] = useState<{
    open: boolean;
    requestId: string;
    targetStatus: string;
    requestNumber: string;
  }>({ open: false, requestId: "", targetStatus: "", requestNumber: "" });
  const [reason, setReason] = useState("");

  // Staff assignment state
  const [assignDialog, setAssignDialog] = useState<{ open: boolean; requestId: string; requestNumber: string }>({ open: false, requestId: "", requestNumber: "" });
  const [assignedStaff, setAssignedStaff] = useState<Record<string, string>>({});

  // Demo staff list
  const staffList = [
    { id: "s1", name: "Alice Chen", role: "Housekeeping" },
    { id: "s2", name: "Bob Tanaka", role: "Room Service" },
    { id: "s3", name: "Carol Patel", role: "Concierge" },
    { id: "s4", name: "David Kim", role: "Maintenance" },
    { id: "s5", name: "Eva Nguyen", role: "Spa" },
  ];

  const handleAssign = (staffId: string) => {
    const staff = staffList.find(s => s.id === staffId);
    if (!staff) return;
    setAssignedStaff(prev => ({ ...prev, [assignDialog.requestId]: staff.name }));
    toast.success(`Assigned to ${staff.name}`);
    setAssignDialog({ open: false, requestId: "", requestNumber: "" });
  };

  // Real-time SSE connection
  const { isConnected, events, unreadCount, clearUnread } = useFrontOfficeSSE(propertyId ?? undefined);

  const sessionsQuery = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId!, limit: 100 },
    { enabled: !!propertyId, staleTime: 10_000 }
  );
  const requestsQuery = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId!, limit: 100 },
    { enabled: !!propertyId, staleTime: 10_000 }
  );

  // Stabilize demo data with useState — inline getDemoX() creates new ref each render
  const [demoSessions] = useState(() => getDemoSessions());
  const [demoRequests] = useState(() => getDemoRequests());
  const { data: sessionsData, isDemo: sessionsDemo } = useDemoFallback(sessionsQuery, demoSessions);
  const { data: requestsData, isDemo: requestsDemo } = useDemoFallback(requestsQuery, demoRequests);

  // listByProperty returns a plain array (not { items })
  const sessions: any[] = Array.isArray(sessionsData) ? sessionsData : [];
  const requests: any[] = Array.isArray(requestsData) ? requestsData : [];
  const isDemo = sessionsDemo || requestsDemo;

  const activeSessions = sessions.filter((s: any) => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(s.status)).length;
  const pendingRequests = requests.filter((r: any) => r.status === "PENDING").length;
  const inProgressRequests = requests.filter((r: any) => r.status === "IN_PROGRESS").length;
  const completedToday = requests.filter((r: any) => ["FULFILLED", "COMPLETED"].includes(r.status)).length;

  const baseFiltered: any[] = tab === 0
    ? requests
    : tab === 1
    ? requests.filter((r: any) => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(r.status))
    : requests.filter((r: any) => ["FULFILLED", "COMPLETED"].includes(r.status));

  const filteredRequests = useMemo(() => {
    let result = baseFiltered;
    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) =>
        r.catalog_item_name.toLowerCase().includes(q) ||
        r.room_number.toLowerCase().includes(q) ||
        r.request_number.toLowerCase().includes(q) ||
        (r.provider_name || "").toLowerCase().includes(q)
      );
    }
    // Sort
    result = [...result].sort((a: any, b: any) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "priority") {
        const order: Record<string, number> = { PENDING: 0, CONFIRMED: 1, IN_PROGRESS: 2, FULFILLED: 3, COMPLETED: 3, REJECTED: 4, CANCELLED: 5 };
        return (order[a.status] ?? 9) - (order[b.status] ?? 9);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime(); // newest
    });
    return result;
  }, [baseFiltered, searchQuery, sortBy]);

  // Status update mutations via tRPC
  const utils = trpc.useUtils();
  const invalidateRequests = () => utils.requests.listByProperty.invalidate({ propertyId: propertyId! });
  const cancelMutation = trpc.requests.cancelRequest.useMutation({
    onSuccess: () => { toast.success("Request cancelled"); invalidateRequests(); },
    onError: (err: any) => toast.error(err?.message || "Failed to cancel request"),
  });
  // Generic status action handler — maps status to the right tRPC mutation
  const statusMutation = {
    mutate: ({ requestId, status, reason }: { requestId: string; status: string; reason?: string }) => {
      if (status === "CANCELLED") { cancelMutation.mutate({ requestId, reason }); }
      else { toast.info(`Use the Queue page for ${status} actions`); }
    },
    isPending: cancelMutation.isPending,
  };

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
    invalidateRequests();
  }, [utils, propertyId]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === filteredRequests.length
        ? new Set()
        : new Set(filteredRequests.map((r) => r.id))
    );
  }, [filteredRequests]);

  const handleBatchConfirm = useCallback(async () => {
    const ids = Array.from(selectedIds);
    toast.info(`Batch confirm ${ids.length} requests — use Queue page for bulk actions`);
    setSelectedIds(new Set());
  }, [selectedIds]);

  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  const handleBatchReject = useCallback(async () => {
    const ids = Array.from(selectedIds);
    const confirmed = await guardConfirm({
      action: `Bulk Reject ${ids.length} Request${ids.length !== 1 ? "s" : ""}`,
      description: `You are about to reject ${ids.length} selected service request${ids.length !== 1 ? "s" : ""}. Each will be marked as REJECTED and guests will be notified. This cannot be undone in bulk.`,
      severity: "warning",
      confirmLabel: `Reject ${ids.length} Request${ids.length !== 1 ? "s" : ""}`,
      audit: {
        entityType: "request",
        entityId: ids.join(","),
        entityName: `Bulk reject — ${ids.length} requests`,
        details: `Bulk rejection of ${ids.length} service requests via Front Office`,
      },
    });
    if (!confirmed) return;
    toast.info(`Batch reject ${ids.length} requests — use Queue page for bulk actions`);
    setSelectedIds(new Set());
  }, [selectedIds, guardConfirm]);

  const handleToggleEvents = useCallback(() => {
    setShowEvents((prev) => !prev);
    if (!showEvents) clearUnread();
  }, [showEvents, clearUnread]);

  // Show skeleton on first load (no data yet)
  if (sessionsQuery.isLoading && requestsQuery.isLoading && !sessionsData && !requestsData) {
    return <FrontOfficeSkeleton />;
  }

  return (
    <Box>
      <PageHeader
        title="Front Office Monitor"
        subtitle="Admin overview of guest sessions and service requests in real-time"
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
          Showing demo data — connect the backend to see live data.
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
        <StatCard title="Active Sessions" value={activeSessions} icon={Activity} iconColor="#2563EB" onClick={() => { setTab(1); handleStatusFilterChange("all"); }} />
        <StatCard title="Pending Requests" value={pendingRequests} icon={Clock} iconColor="#F59E0B" onClick={() => handleStatusFilterChange("PENDING")} />
        <StatCard title="In Progress" value={inProgressRequests} icon={RefreshCw} iconColor="#8B5CF6" onClick={() => handleStatusFilterChange("IN_PROGRESS")} />
        <StatCard title="Completed Today" value={completedToday} icon={CheckCircle} iconColor="#10B981" onClick={() => { setTab(2); handleStatusFilterChange("FULFILLED"); }} />
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
                    onClick={() => navigate(`/admin/front-office/requests/${session.id}`)}
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
              <Chip label={`${filteredRequests.length} shown`} size="small" variant="outlined" sx={{ fontSize: "0.6875rem" }} />
            </Box>

            {/* Batch Actions Bar */}
            {selectedIds.size > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5, p: 1.5, bgcolor: "primary.main", borderRadius: 1.5 }}>
                <Typography variant="body2" sx={{ color: "primary.contrastText", fontWeight: 600, flex: 1 }}>
                  {selectedIds.size} selected
                </Typography>
                <Button size="small" variant="contained" color="success"
                  sx={{ bgcolor: "#10B981", "&:hover": { bgcolor: "#059669" }, color: "white", fontSize: "0.75rem" }}
                  startIcon={<CheckCircle size={12} />} onClick={handleBatchConfirm}
                >
                  Confirm All
                </Button>
                <Button size="small" variant="contained" color="error"
                  sx={{ fontSize: "0.75rem" }}
                  startIcon={<Ban size={12} />} onClick={handleBatchReject}
                >
                  Reject All
                </Button>
                <Button size="small" variant="outlined"
                  sx={{ color: "primary.contrastText", borderColor: "rgba(255,255,255,0.5)", fontSize: "0.75rem" }}
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
              </Box>
            )}

            {/* Search + Sort Controls */}
            <Box sx={{ display: "flex", gap: 1, mb: 1.5 }}>
              <TextField
                size="small" placeholder="Search by service, room, request #..." fullWidth
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><Search size={14} color="#A3A3A3" /></InputAdornment> } }}
                sx={{ "& .MuiOutlinedInput-root": { fontSize: "0.8125rem" } }}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel sx={{ fontSize: "0.8125rem" }}>Sort</InputLabel>
                <Select
                  value={sortBy} label="Sort"
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  sx={{ fontSize: "0.8125rem" }}
                  startAdornment={<Filter size={12} style={{ marginRight: 4, marginLeft: 4, color: "#A3A3A3" }} />}
                >
                  <MenuItem value="newest" sx={{ fontSize: "0.8125rem" }}>Newest First</MenuItem>
                  <MenuItem value="oldest" sx={{ fontSize: "0.8125rem" }}>Oldest First</MenuItem>
                  <MenuItem value="priority" sx={{ fontSize: "0.8125rem" }}>By Priority</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel sx={{ fontSize: "0.8125rem" }}>Status</InputLabel>
                <Select
                  value={statusFilter} label="Status"
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  sx={{ fontSize: "0.8125rem" }}
                >
                  <MenuItem value="all" sx={{ fontSize: "0.8125rem" }}>All Statuses</MenuItem>
                  <MenuItem value="PENDING" sx={{ fontSize: "0.8125rem" }}>Pending</MenuItem>
                  <MenuItem value="CONFIRMED" sx={{ fontSize: "0.8125rem" }}>Confirmed</MenuItem>
                  <MenuItem value="IN_PROGRESS" sx={{ fontSize: "0.8125rem" }}>In Progress</MenuItem>
                  <MenuItem value="FULFILLED" sx={{ fontSize: "0.8125rem" }}>Completed</MenuItem>
                  <MenuItem value="REJECTED" sx={{ fontSize: "0.8125rem" }}>Rejected</MenuItem>
                  <MenuItem value="CANCELLED" sx={{ fontSize: "0.8125rem" }}>Cancelled</MenuItem>
                </Select>
              </FormControl>
            </Box>

<Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Tabs value={tab} onChange={handleTabChange} sx={{ mb: 2, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
                <Tab label={`All (${requests.length})`} />
                <Tab label={`Active (${requests.filter((r) => ["PENDING", "CONFIRMED", "IN_PROGRESS"].includes(r.status)).length})`} />
                <Tab label={`Completed (${requests.filter((r) => ["FULFILLED", "COMPLETED"].includes(r.status)).length})`} />
              </Tabs>
              {filteredRequests.length > 0 && (
                <Tooltip title={selectedIds.size === filteredRequests.length ? "Deselect all" : "Select all"}>
                  <Checkbox
                    size="small"
                    checked={selectedIds.size === filteredRequests.length && filteredRequests.length > 0}
                    indeterminate={selectedIds.size > 0 && selectedIds.size < filteredRequests.length}
                    onChange={toggleSelectAll}
                    sx={{ p: 0.5 }}
                  />
                </Tooltip>
              )}
            </Box>

            <Box>
              {filteredRequests.map((req, i) => (
                <Box key={req.id}>
                  <Box
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                      borderRadius: 1, px: 1, mx: -1,
                      bgcolor: selectedIds.has(req.id) ? "action.selected" : undefined,
                      "&:hover": { bgcolor: selectedIds.has(req.id) ? "action.selected" : "action.hover" },
                    }}
                  >
                    <Checkbox
                      size="small" sx={{ p: 0.5, mr: 0.5 }}
                      checked={selectedIds.has(req.id)}
                      onChange={() => toggleSelect(req.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1, cursor: "pointer" }}
                      onClick={() => navigate(`/admin/front-office/requests/${req.id}`)}
                    >
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
                      {/* Assigned staff badge */}
                      {assignedStaff[req.id] ? (
                        <Tooltip title={`Assigned to ${assignedStaff[req.id]}`}>
                          <Chip
                            icon={<UserCheck size={10} />}
                            label={assignedStaff[req.id].split(" ")[0]}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ fontSize: "0.6875rem", height: 22, cursor: "pointer" }}
                            onClick={(e) => { e.stopPropagation(); setAssignDialog({ open: true, requestId: req.id, requestNumber: req.request_number }); }}
                          />
                        </Tooltip>
                      ) : (
                        <Tooltip title="Assign to staff">
                          <IconButton
                            size="small"
                            sx={{ color: "text.disabled" }}
                            onClick={(e) => { e.stopPropagation(); setAssignDialog({ open: true, requestId: req.id, requestNumber: req.request_number }); }}
                          >
                            <UserPlus size={14} />
                          </IconButton>
                        </Tooltip>
                      )}
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
                                  {statusMutation.isPending ? (
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

      {/* Assign Staff Dialog */}
      <Dialog open={assignDialog.open} onClose={() => setAssignDialog({ open: false, requestId: "", requestNumber: "" })} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <UserPlus size={18} />
            Assign Request
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>{assignDialog.requestNumber}</Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 1 }}>
            {staffList.map(staff => (
              <Box
                key={staff.id}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 1.5,
                  border: "1px solid", borderColor: "divider", cursor: "pointer",
                  "&:hover": { bgcolor: "action.hover" },
                }}
                onClick={() => handleAssign(staff.id)}
              >
                <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", bgcolor: "primary.main" }}>
                  {staff.name.split(" ").map(n => n[0]).join("")}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight={600}>{staff.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{staff.role}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialog({ open: false, requestId: "", requestNumber: "" })}>Cancel</Button>
        </DialogActions>
      </Dialog>

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
      {/* Role Context Guard */}
      {guardDialog}
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
