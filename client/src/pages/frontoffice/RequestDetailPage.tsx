/**
 * RequestDetailPage — View and manage a single service request.
 *
 * Design: Precision Studio — two-column layout with request info + timeline.
 * Shows request details, guest info, and allows status updates.
 */
import { useState } from "react";
import {
  Box, Card, CardContent, Typography, Button, Chip, Divider,
  TextField, MenuItem, Alert,
} from "@mui/material";
import { ArrowLeft, CheckCircle, XCircle, Clock, Truck, MessageSquare, DoorOpen } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

const STATUS_ACTIONS = [
  { value: "confirmed", label: "Confirm", color: "primary" as const, icon: <CheckCircle size={14} /> },
  { value: "in_progress", label: "Start Processing", color: "warning" as const, icon: <Truck size={14} /> },
  { value: "completed", label: "Mark Complete", color: "success" as const, icon: <CheckCircle size={14} /> },
  { value: "rejected", label: "Reject", color: "error" as const, icon: <XCircle size={14} /> },
];

export default function RequestDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const [note, setNote] = useState("");

  const handleStatusChange = (status: string) => {
    toast.success(`Request status updated to ${status}`);
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    toast.success("Note added");
    setNote("");
  };

  return (
    <Box>
      <PageHeader
        title={`Request #SR-${params.id?.slice(0, 6) || "003"}`}
        subtitle="Service Request Details"
        actions={
          <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/front-office")}>Back</Button>
        }
      />

      <Box sx={{ display: "flex", gap: 1, mb: 2.5 }}>
        <StatusChip status="in_progress" />
        <Chip label="Room 101" size="small" variant="outlined" icon={<DoorOpen size={12} />} />
        <Chip label="Grand Hyatt Bangkok" size="small" variant="outlined" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 340px" }, gap: 2.5 }}>
        {/* Main Content */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Request Info */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>Request Information</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {[
                  { label: "Service", value: "Thai Massage (60 min)" },
                  { label: "Provider", value: "Siam Spa & Wellness" },
                  { label: "Quantity", value: "2" },
                  { label: "Unit Price", value: "THB 1,500" },
                  { label: "Total", value: "THB 3,000" },
                  { label: "Requested At", value: "2026-03-12 08:30" },
                ].map((item) => (
                  <Box key={item.label}>
                    <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>{item.label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: item.label.includes("Price") || item.label === "Total" ? '"Geist Mono", monospace' : undefined }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Guest Note */}
              <Box sx={{ mt: 2.5, p: 2, bgcolor: "action.hover", borderRadius: 1.5 }}>
                <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>Guest Note</Typography>
                <Typography variant="body1">"Please schedule for 3 PM if possible. We prefer a female therapist."</Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Guest Info */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>Guest Information</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                {[
                  { label: "Guest Name", value: "John Smith" },
                  { label: "Room", value: "101 — Deluxe" },
                  { label: "Check-in", value: "2026-03-11 14:00" },
                  { label: "Expected Check-out", value: "2026-03-14 12:00" },
                  { label: "Session ID", value: "sess_a1b2c3d4" },
                  { label: "Total Requests", value: "3" },
                ].map((item) => (
                  <Box key={item.label}>
                    <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>{item.label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: item.label === "Session ID" ? '"Geist Mono", monospace' : undefined }}>{item.value}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>Update Status</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {STATUS_ACTIONS.map((action) => (
                  <Button
                    key={action.value} variant="outlined" size="small" color={action.color}
                    startIcon={action.icon} onClick={() => handleStatusChange(action.value)}
                  >
                    {action.label}
                  </Button>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* Timeline Sidebar */}
        <Card sx={{ height: "fit-content" }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>Timeline</Typography>
            {[
              { action: "In Progress", time: "09:00", actor: "Nattaya P.", detail: "Therapist assigned" },
              { action: "Confirmed", time: "08:45", actor: "Somchai K.", detail: "Scheduled for 15:00" },
              { action: "Submitted", time: "08:30", actor: "Guest", detail: "Via QR microsite" },
            ].map((event, i, arr) => (
              <Box key={i} sx={{ position: "relative", pl: 3, pb: i < arr.length - 1 ? 2.5 : 0 }}>
                {/* Timeline dot + line */}
                <Box sx={{ position: "absolute", left: 0, top: 4, width: 10, height: 10, borderRadius: "50%", bgcolor: i === 0 ? "primary.main" : "divider" }} />
                {i < arr.length - 1 && <Box sx={{ position: "absolute", left: 4, top: 16, width: 2, height: "calc(100% - 8px)", bgcolor: "divider" }} />}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{event.action}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>{event.detail}</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: '"Geist Mono", monospace' }}>
                  {event.time} — {event.actor}
                </Typography>
              </Box>
            ))}

            <Divider sx={{ my: 2 }} />

            {/* Add Note */}
            <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1, mb: 1, display: "block" }}>
              Add Note
            </Typography>
            <TextField
              fullWidth size="small" multiline rows={2} placeholder="Add a staff note..."
              value={note} onChange={(e) => setNote(e.target.value)}
            />
            <Button variant="outlined" size="small" startIcon={<MessageSquare size={14} />} onClick={handleAddNote} sx={{ mt: 1 }} disabled={!note.trim()}>
              Add Note
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
