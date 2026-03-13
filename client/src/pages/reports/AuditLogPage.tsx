/**
 * AuditLogPage — Activity audit trail for admin actions.
 *
 * Shows a chronological feed of admin actions with filters by user,
 * entity type, action type, severity, actor role, and date range.
 * Clicking a row opens a detail drawer with the full entry.
 * Data: FastAPI /v1/admin/audit-log — falls back to demo data when unavailable.
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Chip, Typography, TextField, MenuItem,
  Select, FormControl, InputLabel, Stack, Avatar, Divider, IconButton,
  Tooltip, Button, Alert, CircularProgress, Drawer, List, ListItem,
  ListItemText,
} from "@mui/material";
import { Search, RefreshCw, Download, Shield, User, QrCode, Building2, Package, FileText, X, ChevronRight } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { format } from "date-fns";

interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  action: string;
  entityType: "partner" | "property" | "room" | "qr_code" | "user" | "request" | "template" | "catalog" | "provider";
  entityId: string;
  entityName: string;
  details: string;
  severity: "info" | "warning" | "critical";
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

export default function AuditLogPage() {
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
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

  // Try real API first, fall back to demo data on error
  // Pass page + page_size so the backend can paginate when available
  const { data: apiData, isLoading, error, refetch } = useQuery<{ items: AuditEntry[]; total?: number }>({
    queryKey: ["audit-log", page],
    queryFn: async () => {
      try {
        return await apiClient
          .get("/v1/admin/audit-log", { searchParams: { page, page_size: PAGE_SIZE } })
          .json<{ items: AuditEntry[]; total?: number }>();
      } catch {
        return { items: DEMO_ENTRIES, total: DEMO_ENTRIES.length };
      }
    },
    staleTime: 30_000,
    retry: 1,
  });

  const allEntries = apiData?.items ?? DEMO_ENTRIES;
  const isDemo = !apiData || apiData.items === DEMO_ENTRIES;

  const actors = useMemo(() => Array.from(new Set(allEntries.map(e => e.actor))), [allEntries]);

  const filtered = useMemo(() => {
    return allEntries.filter(entry => {
      if (search && !entry.details.toLowerCase().includes(search.toLowerCase()) &&
          !entry.entityName.toLowerCase().includes(search.toLowerCase()) &&
          !entry.actor.toLowerCase().includes(search.toLowerCase())) return false;
      if (entityFilter !== "all" && entry.entityType !== entityFilter) return false;
      if (severityFilter !== "all" && entry.severity !== severityFilter) return false;
      if (actorFilter !== "all" && entry.actor !== actorFilter) return false;
      if (actorRoleFilter !== "all" && entry.actorRole !== actorRoleFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(entry.timestamp) < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(entry.timestamp) > to) return false;
      }
      return true;
    });
  }, [allEntries, search, entityFilter, severityFilter, actorFilter, actorRoleFilter, dateFrom, dateTo]);

  // When the backend paginates, `filtered` is already the page slice.
  // When falling back to demo / full list, slice client-side.
  const isServerPaginated = !!(apiData?.total && apiData.total > PAGE_SIZE);
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
        subtitle={`${totalFiltered} event${totalFiltered !== 1 ? "s" : ""}${isDemo ? " — demo data" : ""} · page ${page} of ${totalPages}`}
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
              Export
            </Button>
          </Stack>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo audit entries — connect FastAPI backend to see live audit trail.
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
                <MenuItem value="partner_admin">Partner Admin</MenuItem>
                <MenuItem value="property_admin">Property Admin</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
                <MenuItem value="staff">Staff</MenuItem>
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
                        <Chip label={ACTION_LABELS[entry.action] ?? entry.action} size="small" color={SEVERITY_COLORS[entry.severity]} variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                        <Typography variant="caption" color="text.secondary">{entry.entityName}</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{entry.details}</Typography>
                      <Typography variant="caption" color="text.disabled">
                        {format(new Date(entry.timestamp), "MMM d, yyyy HH:mm")} · {timeAgo(entry.timestamp)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="flex-start" sx={{ mt: 0.5, flexShrink: 0 }}>
                      <Chip label={entry.entityType.replace("_", " ")} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
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
                  {ACTION_LABELS[drawerEntry.action] ?? drawerEntry.action}
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
                  { label: "Entity Type", value: drawerEntry.entityType.replace("_", " ") },
                  { label: "Entity ID", value: drawerEntry.entityId },
                  { label: "Entity Name", value: drawerEntry.entityName },
                  { label: "Severity", value: drawerEntry.severity },
                  { label: "Details", value: drawerEntry.details },
                ].map(({ label, value }) => (
                  <ListItem key={label} disableGutters sx={{ py: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
                    <ListItemText
                      primary={<Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>{label}</Typography>}
                      secondary={<Typography variant="body2" sx={{ mt: 0.25, wordBreak: "break-all" }}>{value}</Typography>}
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
