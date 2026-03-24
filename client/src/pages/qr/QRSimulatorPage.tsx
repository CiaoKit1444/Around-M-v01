/**
 * QRSimulatorPage — Full-fidelity QR scan simulator for admin testing.
 *
 * Layout: Two-panel view
 *   Left: Phone frame mockup embedding the real guest flow via iframe
 *   Right: Data summary panel showing QR config, property, room, template, items
 *
 * Route: /qr/:id/simulate
 *
 * The simulator:
 * 1. Fetches QR code details from admin API
 * 2. Fetches the public QR status to verify it's scannable
 * 3. Opens the guest scan flow in an iframe pointed at /guest/scan/:qrCodeId
 * 4. Shows a live data panel with all configuration details
 */
import { useState, useEffect, useMemo, useRef } from "react";
import {
  Box, Card, CardContent, Typography, Button, Chip, Divider,
  Alert, Skeleton, IconButton, Tooltip, LinearProgress,
} from "@mui/material";
import {
  ArrowLeft, Smartphone, QrCode, Building2, DoorOpen, Shield,
  FileText, Package, RefreshCw, ExternalLink, Copy, Check,
  Layers, Clock, Globe, Lock, ChevronRight, Info,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { qrApi, guestApi, qrPublicApi } from "@/lib/api/endpoints";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import type { QRCode as QRCodeType } from "@/lib/api/types";

// ── Phone Frame Component ──────────────────────────────────────────────────
function PhoneFrame({ children, url }: { children: React.ReactNode; url?: string }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* URL bar */}
      {url && (
        <Box sx={{
          display: "flex", alignItems: "center", gap: 1,
          bgcolor: "#F5F5F5", borderRadius: "8px 8px 0 0",
          px: 2, py: 0.75, width: 375, maxWidth: "100%",
          border: "2px solid #E5E5E5", borderBottom: "none",
        }}>
          <Globe size={12} color="#A3A3A3" />
          <Typography variant="caption" sx={{
            fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem",
            color: "#737373", overflow: "hidden", textOverflow: "ellipsis",
            whiteSpace: "nowrap", flex: 1,
          }}>
            {url}
          </Typography>
        </Box>
      )}

      {/* Phone body */}
      <Box sx={{
        width: 375, maxWidth: "100%",
        height: 667,
        border: "2px solid #E5E5E5",
        borderRadius: url ? "0 0 24px 24px" : "24px",
        overflow: "hidden",
        bgcolor: "#FFFFFF",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        position: "relative",
      }}>
        {children}
      </Box>

      {/* Home indicator */}
      <Box sx={{
        width: 134, height: 5, borderRadius: 3,
        bgcolor: "#D4D4D4", mt: -1.5, position: "relative", zIndex: 1,
      }} />
    </Box>
  );
}

// ── Data Panel Section ─────────────────────────────────────────────────────
function DataSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        {icon}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#171717", fontSize: "0.8125rem" }}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

function DataRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5, gap: 2 }}>
      <Typography variant="caption" sx={{ color: "#737373", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        variant="caption"
        sx={{
          fontWeight: 500, color: "#171717", textAlign: "right",
          ...(mono ? { fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem" } : {}),
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function QRSimulatorPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { propertyId } = useActiveProperty();
  const qrCodeId = params.id || "";
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch QR code details (admin API)
  const qrQuery = useQuery({
    queryKey: ["qr", propertyId, qrCodeId],
    queryFn: () => qrApi.get(propertyId!, qrCodeId),
    enabled: !!qrCodeId && !!propertyId,
    retry: 1,
  });

  const qr = qrQuery.data;

  // Fetch public QR status (same endpoint guest uses)
  // Must use qr.qr_code_id (e.g., "QR-PEARL-101"), NOT the DB UUID from the route param
  const statusQuery = useQuery({
    queryKey: ["qr-public-status", qr?.qr_code_id],
    queryFn: () => qrPublicApi.getStatus(qr!.qr_code_id),
    enabled: !!qr?.qr_code_id,
    retry: 1,
  });

  const qrStatus = statusQuery.data;
  const isLoading = qrQuery.isLoading || statusQuery.isLoading;

  // Build the guest scan URL
  const guestScanUrl = useMemo(() => {
    if (!qr?.qr_code_id) return "";
    return `/guest/scan/${qr.qr_code_id}`;
  }, [qr?.qr_code_id]);

  const fullGuestUrl = useMemo(() => {
    if (!guestScanUrl) return "";
    return `${window.location.origin}${guestScanUrl}`;
  }, [guestScanUrl]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(fullGuestUrl);
    setCopied(true);
    toast.success("Guest URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefreshIframe = () => {
    if (iframeRef.current) {
      setIframeLoaded(false);
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenInNewTab = () => {
    window.open(guestScanUrl, "_blank");
  };

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="QR Scan Simulator" subtitle="Loading..." />
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "400px 1fr" }, gap: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <Skeleton variant="rounded" width={375} height={667} sx={{ borderRadius: 3 }} />
          </Box>
          <Box>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 2, borderRadius: 2 }} />
            ))}
          </Box>
        </Box>
      </Box>
    );
  }

  if (!qr) {
    return (
      <Box>
        <PageHeader
          title="QR Scan Simulator"
          subtitle="QR Code not found"
          actions={
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/qr")}>
              Back to QR Codes
            </Button>
          }
        />
        <Alert severity="error" sx={{ borderRadius: 1.5 }}>
          Could not load QR code data. The QR code may have been deleted or you may not have access.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="QR Scan Simulator"
        subtitle={`Testing: ${qr.qr_code_id}`}
        badge={{ label: "Simulator", color: "info" }}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Open guest view in new tab">
              <Button
                variant="outlined" size="small"
                startIcon={<ExternalLink size={14} />}
                onClick={handleOpenInNewTab}
                sx={{ textTransform: "none" }}
              >
                Open in Tab
              </Button>
            </Tooltip>
            <Tooltip title={copied ? "Copied!" : "Copy guest URL"}>
              <Button
                variant="outlined" size="small"
                startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                onClick={handleCopyUrl}
                sx={{ textTransform: "none" }}
              >
                {copied ? "Copied" : "Copy URL"}
              </Button>
            </Tooltip>
            <Button
              variant="outlined" size="small"
              startIcon={<ArrowLeft size={14} />}
              onClick={() => navigate(`/qr/${qrCodeId}`)}
            >
              Back
            </Button>
          </Box>
        }
      />

      {qr.status !== "active" && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 1.5 }}>
          This QR code is currently <strong>{qr.status}</strong>. The guest flow may not work as expected.
          Activate the QR code first for a full simulation.
        </Alert>
      )}

      <Box sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", lg: "auto 1fr" },
        gap: 3,
        alignItems: "start",
      }}>
        {/* ── Left: Phone Frame with iframe ── */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <PhoneFrame url={fullGuestUrl}>
            {!iframeLoaded && (
              <Box sx={{
                position: "absolute", top: 0, left: 0, right: 0,
                zIndex: 2,
              }}>
                <LinearProgress sx={{ height: 2 }} />
              </Box>
            )}
            <iframe
              ref={iframeRef}
              src={guestScanUrl}
              title="Guest QR Scan Simulator"
              onLoad={() => setIframeLoaded(true)}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                display: "block",
              }}
            />
          </PhoneFrame>

          {/* Controls below phone */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <Tooltip title="Refresh simulator">
              <IconButton size="small" onClick={handleRefreshIframe} sx={{ border: "1px solid #E5E5E5", borderRadius: 1 }}>
                <RefreshCw size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Open in new tab">
              <IconButton size="small" onClick={handleOpenInNewTab} sx={{ border: "1px solid #E5E5E5", borderRadius: 1 }}>
                <ExternalLink size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* ── Right: Data Summary Panel ── */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* QR Configuration */}
          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5" }}>
            <CardContent sx={{ p: 2.5 }}>
              <DataSection icon={<QrCode size={16} color="#7C3AED" />} title="QR Configuration">
                <DataRow label="QR Code ID" value={qr.qr_code_id} mono />
                <DataRow label="Status" value={<StatusChip status={qr.status} size="small" />} />
                <DataRow
                  label="Access Type"
                  value={
                    <Chip
                      label={qr.access_type.toUpperCase()}
                      size="small"
                      icon={qr.access_type === "restricted" ? <Lock size={10} /> : <Globe size={10} />}
                      sx={{ height: 20, fontSize: "0.625rem" }}
                    />
                  }
                />
                <DataRow label="Scan Count" value={qr.scan_count} />
                {qr.last_scanned && (
                  <DataRow label="Last Scanned" value={new Date(qr.last_scanned).toLocaleString()} />
                )}
                <DataRow label="Created" value={new Date(qr.created_at).toLocaleString()} />
              </DataSection>
            </CardContent>
          </Card>

          {/* Property & Room */}
          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5" }}>
            <CardContent sx={{ p: 2.5 }}>
              <DataSection icon={<Building2 size={16} color="#2563EB" />} title="Property & Room">
                <DataRow label="Property" value={qr.property_name || qr.property_id} />
                <DataRow label="Property ID" value={qr.property_id} mono />
                <DataRow
                  label="Room"
                  value={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <DoorOpen size={12} color="#737373" />
                      <span>Room {qr.room_number}</span>
                    </Box>
                  }
                />
                <DataRow label="Room ID" value={qr.room_id} mono />
              </DataSection>
            </CardContent>
          </Card>

          {/* Public API Status */}
          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5" }}>
            <CardContent sx={{ p: 2.5 }}>
              <DataSection icon={<Globe size={16} color="#16A34A" />} title="Public API Status">
                {statusQuery.isLoading ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="60%" />
                  </Box>
                ) : statusQuery.error ? (
                  <Alert severity="error" sx={{ borderRadius: 1, py: 0.5 }}>
                    Public API returned an error — guest scanning will fail.
                  </Alert>
                ) : qrStatus ? (
                  <>
                    <DataRow label="Public Status" value={qrStatus.status} />
                    <DataRow label="Access Type" value={qrStatus.access_type} />
                    <DataRow label="Property Name" value={qrStatus.property_name || "—"} />
                    <DataRow label="Room Number" value={qrStatus.room_number || "—"} />
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
                      <Info size={12} color="#737373" />
                      <Typography variant="caption" sx={{ color: "#737373", fontSize: "0.6875rem" }}>
                        This is the data returned by the public QR status endpoint that guests see when scanning.
                      </Typography>
                    </Box>
                  </>
                ) : null}
              </DataSection>
            </CardContent>
          </Card>

          {/* Guest Flow Guide */}
          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", bgcolor: "#FAFAFA" }}>
            <CardContent sx={{ p: 2.5 }}>
              <DataSection icon={<Smartphone size={16} color="#D97706" />} title="Simulator Guide">
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  {[
                    { step: "1", label: "QR Scan", desc: "Guest scans QR → verifies code status" },
                    { step: "2", label: qr.access_type === "restricted" ? "Token Entry" : "Welcome", desc: qr.access_type === "restricted" ? "Guest enters stay token for verification" : "Guest sees welcome screen with property info" },
                    { step: "3", label: "Service Menu", desc: "Browse categories, add items to cart" },
                    { step: "4", label: "Submit Request", desc: "Review cart, add notes, submit" },
                    { step: "5", label: "Track Status", desc: "Real-time tracking with request number" },
                  ].map((s) => (
                    <Box key={s.step} sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                      <Box sx={{
                        width: 24, height: 24, borderRadius: "50%",
                        bgcolor: "#171717", color: "#FFFFFF",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.6875rem", fontWeight: 700, flexShrink: 0,
                      }}>
                        {s.step}
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600, color: "#171717", display: "block" }}>
                          {s.label}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#737373", fontSize: "0.6875rem" }}>
                          {s.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </DataSection>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
