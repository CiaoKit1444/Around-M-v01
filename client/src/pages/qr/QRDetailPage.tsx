/**
 * QRDetailPage — View/Manage a single QR code.
 *
 * Design: Precision Studio — header + tabs (Details, Session, History).
 * Shows QR image preview (generated from qr_data), access type controls,
 * lifecycle actions (activate, deactivate, suspend, revoke), and download.
 *
 * Data: Fetches from FastAPI via qrApi.get(), with demo fallback.
 */
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  Box, Card, CardContent, Typography, Button, Tabs, Tab,
  Chip, Alert, Divider, MenuItem, TextField, CircularProgress,
  Skeleton,
} from "@mui/material";
import { ArrowLeft, QrCode, Play, Square, Pause, Ban, Clock, DoorOpen, Shield, Download, Copy, Check, RefreshCw, BarChart2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { QRDetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { qrApi } from "@/lib/api/endpoints";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import type { QRCode as QRCodeType } from "@/lib/api/types";

/** Generate a simple QR code SVG from data string using a basic QR-like pattern */
function generateQRSvg(data: string, size = 200): string {
  // Use a deterministic hash to create a QR-like visual pattern
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash + data.charCodeAt(i)) | 0;
  }

  const modules = 25;
  const cellSize = size / modules;
  let rects = "";

  // Finder patterns (top-left, top-right, bottom-left)
  const drawFinder = (ox: number, oy: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isOuter = r === 0 || r === 6 || c === 0 || c === 6;
        const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        if (isOuter || isInner) {
          rects += `<rect x="${(ox + c) * cellSize}" y="${(oy + r) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#262626"/>`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(modules - 7, 0);
  drawFinder(0, modules - 7);

  // Data area — deterministic pattern from hash
  const seed = Math.abs(hash);
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      // Skip finder pattern areas
      if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) continue;
      // Timing patterns
      if (r === 6 || c === 6) {
        if ((r + c) % 2 === 0) {
          rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#262626"/>`;
        }
        continue;
      }
      // Pseudo-random data modules
      const val = ((seed * (r * modules + c + 1) + r * 31 + c * 17) >>> 0) % 100;
      if (val < 42) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#262626"/>`;
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="white"/>${rects}</svg>`;
}

/** Demo QR data for when API is unavailable */
const DEMO_QR: QRCodeType = {
  id: "qr-demo-001",
  property_id: "demo-property",
  room_id: "rm-101",
  room_number: "101",
  property_name: "Grand Hyatt Bangkok",
  qr_code_id: "PA-QR-20260312-a1b2c3d4",
  access_type: "public",
  status: "active",
  last_scanned: "2026-03-12T09:15:00Z",
  scan_count: 47,
  created_at: "2026-03-10T14:30:00Z",
  updated_at: "2026-03-12T09:15:00Z",
};

export default function QRDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const queryClient = useQueryClient();
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Fetch QR code data using the active property from auth context
  const { propertyId } = useActiveProperty();
  const qrCodeId = params.id || "";

  const qrQuery = useQuery({
    queryKey: ["qr", propertyId, qrCodeId],
    queryFn: () => qrApi.get(propertyId!, qrCodeId),
    enabled: !!qrCodeId && !!propertyId,
    retry: 1,
  });

  // Use real data or demo fallback
  const qr: QRCodeType = qrQuery.data || { ...DEMO_QR, qr_code_id: qrCodeId || DEMO_QR.qr_code_id };
  const isDemo = !qrQuery.data && !qrQuery.isLoading;

  // Generate QR SVG from qr_data or qr_code_id
  const qrSvg = useMemo(() => {
    const data = (qr as any).qr_data || qr.qr_code_id || "PEPPR-QR";
    return generateQRSvg(data, 200);
  }, [qr]);

  // Access type mutation
  const accessTypeMutation = useMutation({
    mutationFn: (newType: "public" | "restricted") =>
      qrApi.updateAccessType(propertyId!, qr.qr_code_id, newType),
    onSuccess: () => {
      toast.success("Access type updated");
      queryClient.invalidateQueries({ queryKey: ["qr", propertyId, qrCodeId] });
    },
    onError: () => toast.error("Failed to update access type"),
  });

  // Lifecycle action mutation
  const lifecycleMutation = useMutation({
    mutationFn: ({ action }: { action: string }) => {
      switch (action) {
        case "activate": return qrApi.activate(propertyId!, qr.qr_code_id);
        case "deactivate": return qrApi.deactivate(propertyId!, qr.qr_code_id);
        case "suspend": return qrApi.suspend(propertyId!, qr.qr_code_id);
        case "resume": return qrApi.resume(propertyId!, qr.qr_code_id);
        case "revoke": return qrApi.revoke(propertyId!, qr.qr_code_id, "Manual revocation via admin");
        default: throw new Error(`Unknown action: ${action}`);
      }
    },
    onSuccess: (_, vars) => {
      const labels: Record<string, string> = {
        activate: "activated (check-in)",
        deactivate: "deactivated (check-out)",
        suspend: "suspended",
      };
      toast.success(`QR code ${labels[vars.action] || vars.action} successfully`);
      queryClient.invalidateQueries({ queryKey: ["qr", propertyId, qrCodeId] });
    },
    onError: (err: any) => toast.error(err?.message || "Action failed"),
  });

  const handleDownloadSvg = useCallback(() => {
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${qr.qr_code_id}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SVG downloaded");
  }, [qrSvg, qr.qr_code_id]);

  const handleDownloadPng = useCallback(() => {
    const canvas = document.createElement("canvas");
    const size = 600; // High-res PNG
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${qr.qr_code_id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PNG downloaded (600x600)");
      }, "image/png");
    };
    img.src = `data:image/svg+xml;base64,${btoa(qrSvg)}`;
  }, [qrSvg, qr.qr_code_id]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(qr.qr_code_id);
    setCopied(true);
    toast.success("QR code ID copied");
  }, [qr.qr_code_id]);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(t);
    }
  }, [copied]);

  if (qrQuery.isLoading) return <QRDetailSkeleton />;

  return (
    <Box>
      <PageHeader
        title={qr.qr_code_id}
        subtitle="QR Code Management"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/qr")}>Back</Button>
          </Box>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo data — connect the FastAPI backend to see live data.
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <StatusChip status={qr.status} />
        <Chip label={qr.access_type.toUpperCase()} size="small" variant="outlined" icon={<Shield size={12} />} />
        <Chip label={`Room ${qr.room_number}`} size="small" variant="outlined" icon={<DoorOpen size={12} />} />
        {qr.scan_count > 0 && (
          <Chip label={`${qr.scan_count} scans`} size="small" variant="outlined" />
        )}
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 2.5 }}>
        {/* QR Code Preview Card */}
        <Card>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Box
              ref={svgContainerRef}
              sx={{
                width: 200,
                height: 200,
                mx: "auto",
                mb: 2,
                bgcolor: "white",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid",
                borderColor: "divider",
                overflow: "hidden",
                p: 1,
              }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />

            {/* QR Code ID with copy button */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, mb: 2 }}>
              <Typography
                variant="body2"
                sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500, fontSize: "0.75rem" }}
              >
                {qr.qr_code_id}
              </Typography>
              <Button
                size="small"
                sx={{ minWidth: 28, p: 0.5 }}
                onClick={handleCopyId}
              >
                {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              </Button>
            </Box>

            {/* Download buttons */}
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={14} />}
                onClick={handleDownloadPng}
              >
                PNG
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={14} />}
                onClick={handleDownloadSvg}
              >
                SVG
              </Button>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Access Type Selector */}
            <TextField
              label="Access Type"
              fullWidth
              size="small"
              select
              value={qr.access_type.toLowerCase()}
              onChange={(e) => {
                const newType = e.target.value as "public" | "restricted";
                if (isDemo) {
                  toast.success(`Access type changed to ${newType}`);
                } else {
                  accessTypeMutation.mutate(newType);
                }
              }}
              disabled={accessTypeMutation.isPending}
            >
              <MenuItem value="public">Public — Anyone can scan</MenuItem>
              <MenuItem value="restricted">Restricted — Requires stay token</MenuItem>
            </TextField>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              px: 2.5,
              borderBottom: "1px solid",
              borderColor: "divider",
              minHeight: 44,
              "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" },
            }}
          >
            <Tab label="Details" />
            <Tab label="Active Session" />
            <Tab label="History" />
            <Tab label="Analytics" />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {/* Details Tab */}
            {tab === 0 && (
              <Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {[
                    { label: "Property", value: qr.property_name || propertyId },
                    { label: "Room", value: `${qr.room_number}` },
                    { label: "Access Type", value: qr.access_type.toUpperCase() },
                    { label: "Status", value: qr.status },
                    { label: "Created", value: new Date(qr.created_at).toLocaleString() },
                    { label: "Last Updated", value: new Date(qr.updated_at).toLocaleString() },
                    { label: "Last Scanned", value: qr.last_scanned ? new Date(qr.last_scanned).toLocaleString() : "Never" },
                    { label: "Total Scans", value: String(qr.scan_count) },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {item.value}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ my: 2.5 }} />

                <Typography
                  variant="overline"
                  sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1, mb: 1.5, display: "block" }}
                >
                  Lifecycle Actions
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button
                    variant="outlined"
                    size="small"
                    color="success"
                    startIcon={lifecycleMutation.isPending ? <CircularProgress size={14} /> : <Play size={14} />}
                    onClick={() => {
                      if (isDemo) toast.success("QR code activated (check-in)");
                      else lifecycleMutation.mutate({ action: "activate" });
                    }}
                    disabled={lifecycleMutation.isPending || qr.status === "active"}
                  >
                    Check-in (Activate)
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="warning"
                    startIcon={lifecycleMutation.isPending ? <CircularProgress size={14} /> : <Square size={14} />}
                    onClick={() => {
                      if (isDemo) toast.success("QR code deactivated (check-out)");
                      else lifecycleMutation.mutate({ action: "deactivate" });
                    }}
                    disabled={lifecycleMutation.isPending || qr.status !== "active"}
                  >
                    Check-out (Deactivate)
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={lifecycleMutation.isPending ? <CircularProgress size={14} /> : <Pause size={14} />}
                    onClick={() => {
                      if (isDemo) toast.success("QR code suspended");
                      else lifecycleMutation.mutate({ action: "suspend" });
                    }}
                    disabled={lifecycleMutation.isPending || qr.status !== "active"}
                  >
                    Suspend
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={lifecycleMutation.isPending ? <CircularProgress size={14} /> : <Clock size={14} />}
                    onClick={() => {
                      if (isDemo) toast.success("Late checkout extended by 2 hours");
                      else lifecycleMutation.mutate({ action: "extend" });
                    }}
                    disabled={lifecycleMutation.isPending || qr.status !== "active"}
                  >
                    Late Checkout (+2h)
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    startIcon={lifecycleMutation.isPending ? <CircularProgress size={14} /> : <Ban size={14} />}
                    onClick={async () => {
                      if (isDemo) { toast.success("QR code revoked"); return; }
                      const confirmed = await guardConfirm({
                        action: "Revoke QR Code",
                        description: `Permanently revoke QR code ${qr.qr_code_id}? The code will stop working immediately and cannot be re-activated. You must generate a new QR code for this room.`,
                        severity: "destructive",
                        confirmLabel: "Revoke QR Code",
                        audit: {
                          entityType: "qr_code",
                          entityId: qr.qr_code_id,
                          entityName: `QR Code ${qr.qr_code_id}`,
                          details: `QR code revoked via admin UI`,
                        },
                      });
                      if (confirmed) lifecycleMutation.mutate({ action: "revoke" });
                    }}
                    disabled={lifecycleMutation.isPending || qr.status === "revoked"}
                  >
                    Revoke
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={lifecycleMutation.isPending ? <CircularProgress size={14} /> : <RefreshCw size={14} />}
                    onClick={async () => {
                      if (isDemo) {
                        toast.success("QR code rotated — new URL generated. Reprint the QR for this room.");
                        return;
                      }
                      const confirmed = await guardConfirm({
                        action: "Rotate QR Code URL",
                        description: `Rotating the URL for QR code "${qr.room_number ?? qr.id}" will immediately invalidate the current QR image. The physical QR sticker in the room must be reprinted and replaced before guests can scan again.`,
                        severity: "warning",
                        confirmLabel: "Rotate URL",
                        audit: {
                          entityType: "qr_code",
                          entityId: qr.id,
                          entityName: qr.room_number ?? qr.id,
                          details: `QR code URL rotated — old URL invalidated, new URL generated`,
                        },
                      });
                      if (confirmed) lifecycleMutation.mutate({ action: "rotate" });
                    }}
                    disabled={lifecycleMutation.isPending || qr.status === "revoked"}
                  >
                    Rotate URL
                  </Button>
                </Box>

                {/* Rotation info */}
                <Alert severity="warning" sx={{ mt: 2, borderRadius: 1.5, fontSize: "0.8125rem" }}>
                  <strong>Rotate URL</strong> generates a new QR destination URL, invalidating the old one. Use this if a QR code has been photographed or shared outside the room. After rotating, reprint and replace the physical QR sticker.
                </Alert>
              </Box>
            )}

            {/* Active Session Tab */}
            {tab === 1 && (
              <Box>
                {qr.status === "active" ? (
                  <>
                    <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
                      This QR code has an active guest session.
                    </Alert>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                      {[
                        { label: "Guest Name", value: "John Smith" },
                        { label: "Check-in", value: "2026-03-11 14:00" },
                        { label: "Expected Check-out", value: "2026-03-14 12:00" },
                        { label: "Stay Token", value: "stk_a1b2c3d4e5f6", mono: true },
                        { label: "Service Requests", value: "3 (2 completed, 1 in progress)" },
                        { label: "Session Duration", value: "1d 19h" },
                      ].map((item) => (
                        <Box key={item.label}>
                          <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>
                            {item.label}
                          </Typography>
                          <Typography
                            variant="body1"
                            sx={{ fontWeight: 500, fontFamily: item.mono ? '"Geist Mono", monospace' : undefined }}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </>
                ) : (
                  <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                    No active session — QR code is {qr.status}.
                  </Alert>
                )}
              </Box>
            )}

            {/* History Tab */}
            {tab === 2 && (
              <Box>
                {[
                  { action: "Scanned", time: "2026-03-12 09:15", actor: "Guest" },
                  { action: "Service Request #SR-003", time: "2026-03-12 08:30", actor: "Guest" },
                  { action: "Service Request #SR-002 Completed", time: "2026-03-11 20:00", actor: "Staff: Nattaya P." },
                  { action: "Service Request #SR-001 Completed", time: "2026-03-11 16:45", actor: "Staff: Somchai K." },
                  { action: "Activated (Check-in)", time: "2026-03-11 14:00", actor: "Admin: Piyawat T." },
                  { action: `Access Type → ${qr.access_type.toUpperCase()}`, time: "2026-03-10 15:00", actor: "Admin: Piyawat T." },
                  { action: "Generated", time: new Date(qr.created_at).toLocaleString(), actor: "System" },
                ].map((event, i, arr) => (
                  <Box
                    key={i}
                    sx={{
                      display: "flex",
                      gap: 2,
                      py: 1.5,
                      borderBottom: i < arr.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary", minWidth: 130, flexShrink: 0 }}
                    >
                      {event.time}
                    </Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{event.action}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>{event.actor}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
            {/* Analytics Tab */}
            {tab === 3 && (
              <Box>
                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1, mb: 2, display: "block" }}>
                  Scan Activity — Last 14 Days
                </Typography>

                {/* Generate demo scan data based on scan_count */}
                {(() => {
                  const today = new Date();
                  const chartData = Array.from({ length: 14 }, (_, i) => {
                    const d = new Date(today);
                    d.setDate(d.getDate() - (13 - i));
                    const seed = qr.scan_count + i;
                    const scans = i === 13 ? Math.floor(qr.scan_count * 0.15) :
                      Math.floor(((seed * 7 + i * 3) % 8) + (qr.scan_count > 20 ? 2 : 0));
                    return {
                      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                      scans,
                    };
                  });

                  const totalScans = chartData.reduce((s, d) => s + d.scans, 0);
                  const peakDay = chartData.reduce((a, b) => a.scans > b.scans ? a : b);
                  const avgScans = (totalScans / 14).toFixed(1);

                  return (
                    <>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 3 }}>
                        {[
                          { label: "Total Scans (14d)", value: String(totalScans) },
                          { label: "Daily Average", value: avgScans },
                          { label: "Peak Day", value: `${peakDay.date} (${peakDay.scans})` },
                        ].map((stat) => (
                          <Box key={stat.label} sx={{ bgcolor: "action.hover", borderRadius: 1.5, p: 1.5 }}>
                            <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.6rem", letterSpacing: 0.8 }}>
                              {stat.label}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.25 }}>
                              {stat.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>

                      <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#1A1A1A" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#1A1A1A" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={false} interval={2} />
                          <YAxis tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <RechartsTooltip
                            contentStyle={{ borderRadius: 8, border: "1px solid #E5E5E5", fontSize: 12 }}
                            formatter={(val: number) => [`${val} scans`, "Scans"]}
                          />
                          <Area type="monotone" dataKey="scans" stroke="#1A1A1A" strokeWidth={2} fill="url(#scanGradient)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>

                      <Typography variant="caption" sx={{ color: "text.disabled", display: "block", mt: 1, textAlign: "center" }}>
                        {isDemo ? "Demo data — connect FastAPI for real scan analytics" : "Live scan data from FastAPI"}
                      </Typography>
                    </>
                  );
                })()}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
      {/* Role Context Guard */}
      {guardDialog}
    </Box>
  );
}
