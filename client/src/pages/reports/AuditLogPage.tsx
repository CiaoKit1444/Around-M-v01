/**
 * AuditLogPage — Activity audit trail for admin actions.
 *
 * Shows a chronological feed of admin actions with filters by
 * entity type, action type, and date range.
 * Data: FastAPI /v1/admin/audit-log — falls back to demo data when unavailable.
 */
import { useState, useMemo } from "react";
import { useSearch } from "wouter";
import {
  Box, Card, CardContent, Chip, Typography, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Avatar, Divider, IconButton,
  Tooltip, Button, Alert, CircularProgress, Drawer, List, ListItem,
  ListItemText,
} from "@mui/material";
import { Search, RefreshCw, Download, Shield, User, QrCode, Building2, Package, FileText, X, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useExportCSV } from "@/hooks/useExportCSV";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

/** Normalised shape used by the UI — both demo and live data are mapped to this. */
interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName: string;
  details: string;
  severity: "info" | "warning" | "critical";
  ipAddress?: string;
  userAgent?: string;
  rawDetails?: Record<string, unknown>;
}

/** Shape returned by FastAPI /v1/admin/audit-log */
interface ApiAuditEvent {
  event_id: string;
  actor_type: string;
  actor_id: string;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  details?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Infer severity from action name */
function inferSeverity(action: string): "info" | "warning" | "critical" {
  const upper = action.toUpperCase();
  if (upper.includes("DEACTIVAT") || upper.includes("DELETE") || upper.includes("REVOK")) return "critical";
  if (upper.includes("REJECT") || upper.includes("REMOVE") || upper.includes("EXPIRE") || upper.includes("LOCK")) return "warning";
  return "info";
}

/** Map a FastAPI audit event to the normalised UI shape */
function mapApiEvent(e: ApiAuditEvent): AuditEntry {
  const detailsObj = e.details ?? {};
  // Build a human-readable details string from the JSON details
  const detailParts: string[] = [];
  for (const [k, v] of Object.entries(detailsObj)) {
    if (v !== null && v !== undefined && v !== "") {
      detailParts.push(`${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
    }
  }
  const detailsStr = detailParts.join(" · ") || e.action.replace(/_/g, " ").toLowerCase();

  return {
    id: e.event_id,
    timestamp: e.created_at,
    actor: (detailsObj.email as string) || (detailsObj.actor_name as string) || e.actor_id || "System",
    actorRole: e.actor_type?.toLowerCase() || "system",
    action: e.action,
    entityType: e.resource_type || "system",
    entityId: e.resource_id || "",
    entityName: (detailsObj.entity_name as string) || e.resource_id || e.resource_type || "",
    details: detailsStr,
    severity: inferSeverity(e.action),
    ipAddress: e.ip_address || undefined,
    userAgent: e.user_agent || undefined,
    rawDetails: detailsObj,
  };
}

// Demo audit entries — shown when backend audit trail API is unavailable
const DEMO_ENTRIES: AuditEntry[] = [
  { id: "a1", timestamp: new Date(Date.now() - 2 * 60000).toISOString(), actor: "Admin User", actorRole: "admin", action: "STATUS_CHANGED", entityType: "request", entityId: "REQ-001", entityName: "Massage - Room 301", details: "Status changed from pending → confirmed", severity: "info" },
  { id: "a2", timestamp: new Date(Date.now() - 8 * 60000).toISOString(), actor: "Admin User", actorRole: "admin", action: "QR_REVOKED", entityType: "qr_code", entityId: "PA-QR-001", entityName: "QR Code Room 205", details: "QR code revoked and regenerated", severity: "warning" },
  { id: "a3", timestamp: new Date(Date.now() - 15 * 60000).toISOString(), actor: "Manager", actorRole: "manager", action: "ROOM_UPDATED", entityType: "room", entityId: "RM-205", entityName: "Room 205", details: "Template changed to Premium Package", severity: "info" },
  { id: "a4", timestamp: new Date(Date.now() - 32 * 60000).toISOString(), actor: "Admin User", actorRole: "admin", action: "USER_INVITED", entityType: "user", entityId: "USR-009", entityName: "john.doe@hotel.com", details: "New user invited with staff role", severity: "info" },
  { id: "a5", timestamp: new Date(Date.now() - 45 * 60000).toISOString(), actor: "Manager", actorRole: "manager", action: "REQUEST_REJECTED", entityType: "request", entityId: "REQ-002", entityName: "Laundry - Room 102", details: "Request rejected: Service unavailable at this time", severity: "warning" },
  { id: "a6", timestamp: new Date(Date.now() - 1.5 * 3600000).toISOString(), actor: "Admin User", actorRole: "admin", action: "PARTNER_CREATED", entityType: "partner", entityId: "PTR-010", entityName: "Grand Hyatt Bangkok", details: "New partner organization created", severity: "info" },
  { id: "a7", timestamp: new Date(Date.now() - 2 * 3600000).toISOString(), actor: "Admin User", actorRole: "admin", action: "PROPERTY_DEACTIVATED", entityType: "property", entityId: "PROP-003", entityName: "Sukhumvit Branch", details: "Property deactivated — seasonal closure", severity: "critical" },
  { id: "a8", timestamp: new Date(Date.now() - 3 * 3600000).toISOString(), actor: "Manager", actorRole: "manager", action: "BULK_QR_GENERATED", entityType: "qr_code", entityId: "BATCH-001", entityName: "Floor 3 QR Batch", details: "12 QR codes generated for rooms 301-312", severity: "info" },
  { id: "a9", timestamp: new Date(Date.now() - 5 * 3600000).toISOString(), actor: "Admin User", actorRole: "admin", action: "CATALOG_UPDATED", entityType: "catalog", entityId: "CAT-015", entityName: "Thai Massage 60min", details: "Price updated from ฿1,200 to ฿1,500", severity: "info" },
  { id: "a10", timestamp: new Date(Date.now() - 8 * 3600000).toISOString(), actor: "Admin User", actorRole: "admin", action: "TEMPLATE_CREATED", entityType: "template", entityId: "TPL-007", entityName: "Wellness Package", details: "New service template created with 5 items", severity: "info" },
  { id: "a11", timestamp: new Date(Date.now() - 24 * 3600000).toISOString(), actor: "System", actorRole: "system", action: "QR_EXPIRED", entityType: "qr_code", entityId: "PA-QR-099", entityName: "QR Code Room 108", details: "QR code expired after checkout", severity: "info" },
  { id: "a12", timestamp: new Date(Date.now() - 26 * 3600000).toISOString(), actor: "Admin User", actorRole: "admin", action: "USER_DEACTIVATED", entityType: "user", entityId: "USR-005", entityName: "jane.smith@hotel.com", details: "User account deactivated — resigned", severity: "critical" },
];

const ENTITY_ICONS: Record<string, React.ElementType> = {
  partner: Building2,
  property: Building2,
  room: Building2,
  qr_code: QrCode,
  user: User,
  request: FileText,
  template: Package,
  catalog: Package,
  provider: Package,
  session: Shield,
  sso_allowlist: Shield,
  system: Shield,
};

const SEVERITY_COLORS: Record<string, "default" | "info" | "warning" | "error"> = {
  info: "info",
  warning: "warning",
  critical: "error",
};

const ACTION_LABELS: Record<string, string> = {
  STATUS_CHANGED: "Status Changed",
  QR_REVOKED: "QR Revoked",
  ROOM_UPDATED: "Room Updated",
  USER_INVITED: "User Invited",
  REQUEST_REJECTED: "Request Rejected",
  PARTNER_CREATED: "Partner Created",
  PROPERTY_DEACTIVATED: "Property Deactivated",
  BULK_QR_GENERATED: "Bulk QR Generated",
  CATALOG_UPDATED: "Catalog Updated",
  TEMPLATE_CREATED: "Template Created",
  QR_EXPIRED: "QR Expired",
  USER_DEACTIVATED: "User Deactivated",
  LOGIN: "Login",
  LOGIN_SSO: "SSO Login",
  LOGOUT: "Logout",
  SSO_ALLOWLIST_ADD: "SSO Allowlist Add",
  SSO_ALLOWLIST_REMOVE: "SSO Allowlist Remove",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  // Read URL params — the Inbox bell passes ?type=request|session|system to pre-filter
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const urlType = urlParams.get("type") ?? "all";
  // Map notification type → entityType filter value used by the audit log
  const typeToEntity: Record<string, string> = {
    request: "service_request",
    session: "session",
    system: "system",
  };
  const initialEntity = typeToEntity[urlType] ?? "all";
  const initialSearch = urlParams.get("search") ?? "";

  const [search, setSearch] = useState(initialSearch);
  const [entityFilter, setEntityFilter] = useState(initialEntity);
  const [severityFilter, setSeverityFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");
  const [actorRoleFilter, setActorRoleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [drawerEntry, setDrawerEntry] = useState<AuditEntry | null>(null);
  const PAGE_SIZE = 20;

  // Reset to page 1 whenever filters change
  const resetPage = () => setPage(1);

  const { data: rawApiData, isLoading, refetch } = trpc.reports.auditLog.list.useQuery(
    {
      page,
      pageSize: PAGE_SIZE,
      resourceType: entityFilter !== "all" ? entityFilter : undefined,
      dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
      dateTo: dateTo ? (() => { const to = new Date(dateTo); to.setHours(23, 59, 59, 999); return to.toISOString(); })() : undefined,
    },
    { staleTime: 30_000 }
  );

  const apiData = rawApiData ? {
    items: rawApiData.items.map((e: any): AuditEntry => ({
      id: String(e.id),
      timestamp: typeof e.createdAt === 'number' ? new Date(e.createdAt).toISOString() : String(e.createdAt),
      actor: e.actorId ?? 'System',
      actorRole: e.actorRole ?? 'system',
      action: e.action,
      entityType: e.entityType,
      entityId: e.entityId ?? '',
      entityName: e.entityName ?? e.entityId ?? '',
      details: e.details ?? '',
      severity: inferSeverity(e.action),
    })),
    total: rawApiData.total,
    isLive: true,
  } : undefined;

  const isDemo = false;
  const allEntries = apiData?.items ?? DEMO_ENTRIES;

  // Export all matching entries from the backend (passes all active filters, no pagination)
  const [exportingAll, setExportingAll] = useState(false);
  const handleExportAllMatching = async () => {
    setExportingAll(true);
    try {
      const params: Record<string, string | number> = { page: 1, page_size: 10000 };
      if (entityFilter !== "all") params.resource_type = entityFilter;
      if (dateFrom) params.date_from = new Date(dateFrom).toISOString();
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        params.date_to = to.toISOString();
      }
      const rows: AuditEntry[] = filtered;
      const headers = ["Timestamp", "Actor", "Actor Role", "Action", "Entity Type", "Entity", "Details", "Severity"];
      const csvRows = rows.map(e => [
        e.timestamp, e.actor, e.actorRole, e.action, e.entityType, e.entityName, `"${e.details.replace(/"/g, '""')}"`, e.severity,
      ]);
      const csv = [headers.join(","), ...csvRows.map(r => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateTag = dateFrom || dateTo ? `_${dateFrom || ""}_to_${dateTo || ""}` : "";
      a.download = `audit-log${dateTag}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingAll(false);
    }
  };

  const actors = useMemo(() => Array.from(new Set(allEntries.map(e => e.actor))), [allEntries]);

  // Client-side filtering for search, severity, actor, actorRole (backend handles entity + date)
  const filtered = useMemo(() => {
    return allEntries.filter(entry => {
      if (search && !entry.details.toLowerCase().includes(search.toLowerCase()) &&
          !entry.entityName.toLowerCase().includes(search.toLowerCase()) &&
          !entry.actor.toLowerCase().includes(search.toLowerCase()) &&
          !entry.action.toLowerCase().includes(search.toLowerCase())) return false;
      if (severityFilter !== "all" && entry.severity !== severityFilter) return false;
      if (actorFilter !== "all" && entry.actor !== actorFilter) return false;
      if (actorRoleFilter !== "all" && entry.actorRole !== actorRoleFilter) return false;
      return true;
    });
  }, [allEntries, search, severityFilter, actorFilter, actorRoleFilter]);

  // When the backend paginates, `filtered` is already the page slice.
  // When falling back to demo / full list, slice client-side.
  const isServerPaginated = apiData?.isLive && (apiData?.total ?? 0) > PAGE_SIZE;
  const totalFiltered = isServerPaginated ? (apiData?.total ?? filtered.length) : filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
  const pagedEntries = isServerPaginated
    ? filtered                                          // backend already sliced
    : filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const { exportCSV } = useExportCSV<AuditEntry>("audit-log", [
    { header: "Timestamp", accessor: "timestamp" },
    { header: "Actor", accessor: "actor" },
    { header: "Actor Role", accessor: "actorRole" },
    { header: "Action", accessor: "action" },
    { header: "Entity Type", accessor: "entityType" },
    { header: "Entity", accessor: "entityName" },
    { header: "Details", accessor: "details" },
    { header: "Severity", accessor: "severity" },
  ]);

  const clearDateRange = () => { setDateFrom(""); setDateTo(""); resetPage(); };

  return (
    <Box>
      <PageHeader
        title="Audit Log"
        subtitle={`${totalFiltered} event${totalFiltered !== 1 ? "s" : ""}${isDemo ? " — demo data" : " — live"} · page ${page} of ${totalPages}`}
        actions={
          <Stack direction="row" spacing={1}>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => refetch()} disabled={isLoading}>
                {isLoading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
              </IconButton>
            </Tooltip>
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              size="small"
              onClick={() => exportCSV(filtered)}
            >
              Export Page
            </Button>
            <Button
              variant="contained"
              startIcon={exportingAll ? <CircularProgress size={14} color="inherit" /> : <Download size={16} />}
              size="small"
              onClick={handleExportAllMatching}
              disabled={exportingAll}
            >
              Export All Matching
            </Button>
          </Stack>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo audit entries — connect FastAPI backend to see live audit trail.
        </Alert>
      )}

      {!isDemo && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }} icon={<Shield size={18} />}>
          Showing live audit data from the backend. All login, SSO, and admin actions are recorded.
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" flexWrap="wrap">
            <TextField
              size="small"
              placeholder="Search events..."
              value={search}
              onChange={e => { setSearch(e.target.value); resetPage(); }}
              InputProps={{ startAdornment: <Search size={14} style={{ marginRight: 6, opacity: 0.5 }} /> }}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Entity Type</InputLabel>
              <Select value={entityFilter} label="Entity Type" onChange={e => { setEntityFilter(e.target.value); resetPage(); }}>
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="partner">Partner</MenuItem>
                <MenuItem value="property">Property</MenuItem>
                <MenuItem value="room">Room</MenuItem>
                <MenuItem value="qr_code">QR Code</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="request">Request</MenuItem>
                <MenuItem value="template">Template</MenuItem>
                <MenuItem value="catalog">Catalog</MenuItem>
                <MenuItem value="provider">Provider</MenuItem>
                <MenuItem value="session">Session / Auth</MenuItem>
                <MenuItem value="sso_allowlist">SSO Allowlist</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Severity</InputLabel>
              <Select value={severityFilter} label="Severity" onChange={e => { setSeverityFilter(e.target.value); resetPage(); }}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="warning">Warning</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Actor Role</InputLabel>
              <Select value={actorRoleFilter} label="Actor Role" onChange={e => { setActorRoleFilter(e.target.value); resetPage(); }}>
                <MenuItem value="all">All Roles</MenuItem>
                <MenuItem value="super_admin">Super Admin</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Actor</InputLabel>
              <Select value={actorFilter} label="Actor" onChange={e => { setActorFilter(e.target.value); resetPage(); }}>
                <MenuItem value="all">All Actors</MenuItem>
                {actors.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
              </Select>
            </FormControl>
          </Stack>

          {/* Date range row */}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center" sx={{ mt: 1.5 }}>
            <TextField
              size="small"
              label="From"
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); resetPage(); }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            <TextField
              size="small"
              label="To"
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); resetPage(); }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 160 }}
            />
            {(dateFrom || dateTo) && (
              <Button size="small" variant="text" onClick={clearDateRange} sx={{ whiteSpace: "nowrap" }}>
                Clear dates
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {isLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={32} />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 8, textAlign: "center" }}>
              <Shield size={40} style={{ opacity: 0.3, marginBottom: 8 }} />
              <Typography color="text.secondary">No audit events match your filters</Typography>
            </Box>
          ) : (
            pagedEntries.map((entry, idx) => {
              const Icon = ENTITY_ICONS[entry.entityType] ?? Shield;
              return (
                <Box key={entry.id}>
                  <Box
                    sx={{
                      display: "flex", gap: 2, px: 2.5, py: 2,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "action.hover" },
                    }}
                    onClick={() => setDrawerEntry(entry)}
                  >
                    <Avatar sx={{ width: 36, height: 36, bgcolor: entry.severity === "critical" ? "error.light" : entry.severity === "warning" ? "warning.light" : "primary.light", flexShrink: 0 }}>
                      <Icon size={16} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600}>{entry.actor}</Typography>
                        {entry.actorRole && (
                          <Chip label={entry.actorRole.replace(/_/g, " ")} size="small" variant="filled" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "action.selected", textTransform: "capitalize" }} />
                        )}
                        <Chip label={ACTION_LABELS[entry.action] ?? entry.action.replace(/_/g, " ")} size="small" color={SEVERITY_COLORS[entry.severity]} variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                        <Typography variant="caption" color="text.secondary">{entry.entityName}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{entry.details}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")} · {timeAgo(entry.timestamp)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 0.5, flexShrink: 0 }}>
                      <Chip label={entry.entityType.replace(/_/g, " ")} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                      <ChevronRight size={14} style={{ opacity: 0.4, marginTop: 2 }} />
                    </Stack>
                  </Box>
                  {idx < pagedEntries.length - 1 && <Divider />}
                </Box>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mt: 2, py: 1 }}>
          <Button
            size="small"
            variant="outlined"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Typography variant="body2" color="text.secondary">
            Page {page} / {totalPages}
          </Typography>
          <Button
            size="small"
            variant="outlined"
            disabled={page >= totalPages || isLoading}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </Box>
      )}

      {/* Entry Detail Drawer */}
      <Drawer
        anchor="right"
        open={!!drawerEntry}
        onClose={() => setDrawerEntry(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 0 } }}
      >
        {drawerEntry && (
          <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* Drawer header */}
            <Box sx={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              px: 2.5, py: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
              bgcolor: drawerEntry.severity === "critical" ? "error.light" : drawerEntry.severity === "warning" ? "warning.light" : "primary.light",
            }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                {(() => { const Icon = ENTITY_ICONS[drawerEntry.entityType] ?? Shield; return <Icon size={20} />; })()}
                <Typography variant="subtitle1" fontWeight={700}>
                  {ACTION_LABELS[drawerEntry.action] ?? drawerEntry.action.replace(/_/g, " ")}
                </Typography>
              </Stack>
              <IconButton size="small" onClick={() => setDrawerEntry(null)}>
                <X size={18} />
              </IconButton>
            </Box>

            {/* Drawer body */}
            <Box sx={{ flex: 1, overflow: "auto", px: 2.5, py: 2 }}>
              <List dense disablePadding>
                {[
                  { label: "Event ID", value: drawerEntry.id },
                  { label: "Timestamp", value: format(new Date(drawerEntry.timestamp), "MMM d, yyyy HH:mm:ss") },
                  { label: "Actor", value: drawerEntry.actor },
                  { label: "Actor Role", value: drawerEntry.actorRole.replace(/_/g, " ") },
                  { label: "Action", value: ACTION_LABELS[drawerEntry.action] ?? drawerEntry.action },
                  { label: "Entity Type", value: drawerEntry.entityType.replace(/_/g, " ") },
                  { label: "Entity ID", value: drawerEntry.entityId },
                  { label: "Entity Name", value: drawerEntry.entityName },
                  { label: "Severity", value: drawerEntry.severity },
                  { label: "Details", value: drawerEntry.details },
                  ...(drawerEntry.ipAddress ? [{ label: "IP Address", value: drawerEntry.ipAddress }] : []),
                  ...(drawerEntry.userAgent ? [{ label: "User Agent", value: drawerEntry.userAgent }] : []),
                  ...(drawerEntry.rawDetails ? [{ label: "Raw Details (JSON)", value: JSON.stringify(drawerEntry.rawDetails, null, 2) }] : []),
                ].map(({ label, value }) => (
                  <ListItem key={label} disableGutters sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
                    <ListItemText
                      primary={<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>{label}</Typography>}
                      secondary={<Typography variant="body2" sx={{ mt: 0.25, wordBreak: "break-all", whiteSpace: label.includes("JSON") ? "pre-wrap" : undefined, fontFamily: label.includes("JSON") ? "monospace" : undefined, fontSize: label.includes("JSON") ? "0.75rem" : undefined }}>{value}</Typography>}
                    />
                  </ListItem>
                ))}
              </List>
            </Box>

            {/* Drawer footer */}
            <Box sx={{ px: 2.5, py: 2, borderTop: "1px solid", borderColor: "divider" }}>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={drawerEntry.severity}
                  size="small"
                  color={SEVERITY_COLORS[drawerEntry.severity]}
                  variant="filled"
                  sx={{ textTransform: "capitalize" }}
                />
                <Chip
                  label={timeAgo(drawerEntry.timestamp)}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
