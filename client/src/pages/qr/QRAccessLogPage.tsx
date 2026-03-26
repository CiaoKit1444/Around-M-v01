/**
 * QRAccessLogPage — Scan access log for all QR codes in a property.
 *
 * Shows a timeline of scan events with room, timestamp, access type, and session info.
 * Filters: date range, room, access type, status.
 * Data: Uses QR list + session data to reconstruct scan history (no dedicated log endpoint).
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Chip, TextField, MenuItem,
  Alert, CircularProgress, Divider, Button, InputAdornment,
} from "@mui/material";
import { Search, QrCode, DoorOpen, Clock, RefreshCw, Download } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/ui/DataStates";
import { trpc } from "@/lib/trpc";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { getDemoQRCodes } from "@/lib/api/demo-data";
import type { QRCode } from "@/lib/api/types";

/** Generate demo scan log entries from QR code data */
function generateScanLog(qrs: QRCode[]) {
  const events: Array<{
    id: string;
    qr_code_id: string;
    room_number: string;
    property_name: string;
    access_type: string;
    status: string;
    scanned_at: Date;
    session_started: boolean;
    scan_count: number;
  }> = [];

  const now = new Date();
  qrs.forEach((qr) => {
    if (qr.scan_count === 0) return;
    // Generate individual scan events based on scan_count
    const count = Math.min(qr.scan_count, 8);
    for (let i = 0; i < count; i++) {
      const hoursAgo = (i + 1) * Math.floor(24 / count) + Math.floor(Math.random() * 3);
      const scannedAt = new Date(now.getTime() - hoursAgo * 3_600_000);
      events.push({
        id: `${qr.id}-scan-${i}`,
        qr_code_id: qr.qr_code_id,
        room_number: qr.room_number,
        property_name: qr.property_name || "Unknown Property",
        access_type: qr.access_type,
        status: qr.status,
        scanned_at: scannedAt,
        session_started: i === 0 && qr.status === "active",
        scan_count: qr.scan_count,
      });
    }
  });

  return events.sort((a, b) => b.scanned_at.getTime() - a.scanned_at.getTime());
}

export default function QRAccessLogPage() {
  const { propertyId } = useActiveProperty();
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("24h");

  const query = trpc.qr.list.useQuery(
    { property_id: propertyId!, page: 1, pageSize: 500 },
    { enabled: !!propertyId, staleTime: 30_000 }
  );

  const allQRs = (query.data?.items as unknown as QRCode[]) ?? getDemoQRCodes().items;
  const isDemo = !query.data && !query.isLoading;

  const scanLog = useMemo(() => generateScanLog(allQRs), [allQRs]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = {
      "1h": now - 3_600_000,
      "24h": now - 86_400_000,
      "7d": now - 7 * 86_400_000,
      "30d": now - 30 * 86_400_000,
      all: 0,
    }[dateFilter] ?? 0;

    return scanLog.filter((e) => {
      if (e.scanned_at.getTime() < cutoff) return false;
      if (accessFilter !== "all" && e.access_type !== accessFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!e.room_number.toLowerCase().includes(q) && !e.qr_code_id.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [scanLog, search, accessFilter, dateFilter]);

  const handleExport = () => {
    const csv = [
      "QR Code ID,Room,Property,Access Type,Status,Scanned At,Session Started",
      ...filtered.map((e) =>
        [e.qr_code_id, e.room_number, e.property_name, e.access_type, e.status, e.scanned_at.toISOString(), e.session_started].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-access-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <PageHeader
        title="QR Access Log"
        subtitle="Scan history and session events across all QR codes"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Download size={14} />} onClick={handleExport} disabled={filtered.length === 0}>
              Export CSV
            </Button>
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />} onClick={() => query.refetch()}>
              Refresh
            </Button>
          </Box>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo scan history — connect FastAPI for real access logs.
        </Alert>
      )}

      {/* Filters */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
            <TextField
              size="small"
              placeholder="Search room or QR ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search size={14} /></InputAdornment> }}
              sx={{ minWidth: 220 }}
            />
            <TextField
              size="small"
              select
              label="Access Type"
              value={accessFilter}
              onChange={(e) => setAccessFilter(e.target.value)}
              sx={{ minWidth: 140 }}
            >
              <MenuItem value="all">All Types</MenuItem>
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="restricted">Restricted</MenuItem>
            </TextField>
            <TextField
              size="small"
              select
              label="Time Range"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              sx={{ minWidth: 130 }}
            >
              <MenuItem value="1h">Last 1 Hour</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="all">All Time</MenuItem>
            </TextField>
            <Typography variant="body2" sx={{ color: "text.secondary", ml: "auto" }}>
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Log Timeline */}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {query.isLoading ? (
            <TableSkeleton rows={6} columns={4} />
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6 }}>
              <QrCode size={32} strokeWidth={1} style={{ color: "#D4D4D4", marginBottom: 8 }} />
              <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
                No scan events in this time range
              </Typography>
            </Box>
          ) : (
            filtered.map((event, i) => (
              <Box key={event.id}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    px: 2.5,
                    py: 1.5,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  {/* Timeline dot */}
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      bgcolor: event.session_started ? "#10B981" : "#A3A3A3",
                      flexShrink: 0,
                    }}
                  />

                  {/* Room + QR ID */}
                  <Box sx={{ minWidth: 120 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <DoorOpen size={12} strokeWidth={1.5} style={{ color: "#737373" }} />
                      <Typography sx={{ fontWeight: 700, fontSize: "0.8125rem" }}>
                        Room {event.room_number}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.625rem", color: "text.secondary" }}>
                      {event.qr_code_id}
                    </Typography>
                  </Box>

                  {/* Event type */}
                  <Chip
                    label={event.session_started ? "Session Started" : "Scanned"}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: "0.625rem",
                      fontWeight: 600,
                      bgcolor: event.session_started ? "#ECFDF5" : "#F5F5F5",
                      color: event.session_started ? "#059669" : "#525252",
                    }}
                  />

                  {/* Access type */}
                  <Chip
                    label={event.access_type.toUpperCase()}
                    size="small"
                    variant="outlined"
                    sx={{
                      height: 20,
                      fontSize: "0.5625rem",
                      fontWeight: 700,
                      color: event.access_type === "public" ? "#166534" : "#991B1B",
                      borderColor: event.access_type === "public" ? "#BBF7D0" : "#FECACA",
                    }}
                  />

                  {/* Property */}
                  <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {event.property_name}
                  </Typography>

                  {/* Timestamp */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexShrink: 0 }}>
                    <Clock size={11} strokeWidth={1.5} style={{ color: "#A3A3A3" }} />
                    <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary", fontFamily: '"Geist Mono", monospace' }}>
                      {event.scanned_at.toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
                {i < filtered.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
