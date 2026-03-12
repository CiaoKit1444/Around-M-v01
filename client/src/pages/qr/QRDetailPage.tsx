/**
 * QRDetailPage — View/Manage a single QR code.
 *
 * Design: Precision Studio — header + tabs (Details, Session, History).
 * Shows QR image, access type, lifecycle controls (activate, deactivate, suspend, revoke).
 */
import { useState } from "react";
import {
  Box, Card, CardContent, Typography, Button, Tabs, Tab,
  Chip, Alert, Divider, MenuItem, TextField,
} from "@mui/material";
import { ArrowLeft, QrCode, Play, Square, Pause, Ban, Clock, DoorOpen, Shield } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

export default function QRDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const [tab, setTab] = useState(0);
  const [accessType, setAccessType] = useState("public");

  const qrId = `PA-QR-20260312-${params.id?.slice(0, 8) || "a1b2c3d4"}`;

  const handleAction = (action: string) => {
    toast.success(`QR code ${action} successfully`);
  };

  return (
    <Box>
      <PageHeader
        title={qrId}
        subtitle="QR Code Management"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/qr")}>Back</Button>
          </Box>
        }
      />

      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        <StatusChip status="active" />
        <Chip label={accessType.toUpperCase()} size="small" variant="outlined" icon={<Shield size={12} />} />
        <Chip label="Room 101" size="small" variant="outlined" icon={<DoorOpen size={12} />} />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "280px 1fr" }, gap: 2.5 }}>
        {/* QR Code Preview Card */}
        <Card>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Box sx={{ width: 200, height: 200, mx: "auto", mb: 2, bgcolor: "background.default", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid", borderColor: "divider" }}>
              <QrCode size={120} strokeWidth={0.6} color="#262626" />
            </Box>
            <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500, mb: 2 }}>{qrId}</Typography>
            <Box sx={{ display: "flex", gap: 1, justifyContent: "center", flexWrap: "wrap" }}>
              <Button variant="outlined" size="small">Download PNG</Button>
              <Button variant="outlined" size="small">Download SVG</Button>
            </Box>
            <Divider sx={{ my: 2 }} />
            <TextField
              label="Access Type" fullWidth size="small" select
              value={accessType} onChange={(e) => { setAccessType(e.target.value); toast.success(`Access type changed to ${e.target.value}`); }}
            >
              <MenuItem value="public">Public — Anyone can scan</MenuItem>
              <MenuItem value="restricted">Restricted — Requires stay token</MenuItem>
            </TextField>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
            <Tab label="Details" />
            <Tab label="Active Session" />
            <Tab label="History" />
          </Tabs>

          <CardContent sx={{ p: 3 }}>
            {/* Details */}
            {tab === 0 && (
              <Box>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {[
                    { label: "Property", value: "Grand Hyatt Bangkok" },
                    { label: "Room", value: "101 — Deluxe" },
                    { label: "Template", value: "VIP Experience" },
                    { label: "Created", value: "2026-03-10 14:30" },
                    { label: "Last Scanned", value: "2026-03-12 09:15" },
                    { label: "Total Scans", value: "47" },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>{item.label}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>

                <Divider sx={{ my: 2.5 }} />

                <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1, mb: 1.5, display: "block" }}>
                  Lifecycle Actions
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Button variant="outlined" size="small" color="success" startIcon={<Play size={14} />} onClick={() => handleAction("activated")}>
                    Check-in (Activate)
                  </Button>
                  <Button variant="outlined" size="small" color="warning" startIcon={<Square size={14} />} onClick={() => handleAction("deactivated")}>
                    Check-out (Deactivate)
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<Pause size={14} />} onClick={() => handleAction("suspended")}>
                    Suspend
                  </Button>
                  <Button variant="outlined" size="small" startIcon={<Clock size={14} />} onClick={() => handleAction("extended")}>
                    Late Checkout
                  </Button>
                  <Button variant="outlined" size="small" color="error" startIcon={<Ban size={14} />} onClick={() => handleAction("revoked")}>
                    Revoke
                  </Button>
                </Box>
              </Box>
            )}

            {/* Active Session */}
            {tab === 1 && (
              <Box>
                <Alert severity="success" sx={{ mb: 2, borderRadius: 1.5 }}>
                  This QR code has an active guest session.
                </Alert>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                  {[
                    { label: "Guest Name", value: "John Smith" },
                    { label: "Check-in", value: "2026-03-11 14:00" },
                    { label: "Expected Check-out", value: "2026-03-14 12:00" },
                    { label: "Stay Token", value: "stk_a1b2c3d4e5f6" },
                    { label: "Service Requests", value: "3 (2 completed, 1 in progress)" },
                    { label: "Session Duration", value: "1d 19h" },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>{item.label}</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: item.label === "Stay Token" ? '"Geist Mono", monospace' : undefined }}>{item.value}</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* History */}
            {tab === 2 && (
              <Box>
                {[
                  { action: "Scanned", time: "2026-03-12 09:15", actor: "Guest" },
                  { action: "Service Request #SR-003", time: "2026-03-12 08:30", actor: "Guest" },
                  { action: "Service Request #SR-002 Completed", time: "2026-03-11 20:00", actor: "Staff: Nattaya P." },
                  { action: "Service Request #SR-001 Completed", time: "2026-03-11 16:45", actor: "Staff: Somchai K." },
                  { action: "Activated (Check-in)", time: "2026-03-11 14:00", actor: "Admin: Piyawat T." },
                  { action: "Access Type → PUBLIC", time: "2026-03-10 15:00", actor: "Admin: Piyawat T." },
                  { action: "Generated", time: "2026-03-10 14:30", actor: "System" },
                ].map((event, i, arr) => (
                  <Box key={i} sx={{ display: "flex", gap: 2, py: 1.5, borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                    <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary", minWidth: 130, flexShrink: 0 }}>{event.time}</Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{event.action}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>{event.actor}</Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
