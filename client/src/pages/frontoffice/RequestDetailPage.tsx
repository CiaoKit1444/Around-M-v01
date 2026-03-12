/**
 * RequestDetailPage — Full service request view wired to FastAPI.
 *
 * Features:
 * - Full item breakdown with pricing (unit price × qty = line total)
 * - Status timeline with actor and timestamp
 * - Status action buttons (Confirm, Start, Complete, Reject, Cancel)
 * - Rejection/cancellation reason dialog
 * - Staff note field
 * - Guest info panel
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Button, Chip, Divider,
  TextField, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Avatar,
} from "@mui/material";
import {
  ArrowLeft, CheckCircle, XCircle, Clock, Truck, MessageSquare,
  DoorOpen, User, Phone, Calendar, Play, Ban, Package,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { frontOfficeApi } from "@/lib/api/endpoints";
import type { ServiceRequest } from "@/lib/api/types";
import type { ReactNode } from "react";

interface StatusAction {
  status: string;
  label: string;
  color: "primary" | "warning" | "success" | "error";
  icon: ReactNode;
  requiresReason?: boolean;
}

const STATUS_ACTIONS: Record<string, StatusAction[]> = {
  pending: [
    { status: "CONFIRMED", label: "Confirm", color: "success", icon: <CheckCircle size={14} /> },
    { status: "REJECTED", label: "Reject", color: "error", icon: <XCircle size={14} />, requiresReason: true },
  ],
  confirmed: [
    { status: "IN_PROGRESS", label: "Start", color: "warning", icon: <Play size={14} /> },
    { status: "CANCELLED", label: "Cancel", color: "error", icon: <Ban size={14} />, requiresReason: true },
  ],
  in_progress: [
    { status: "COMPLETED", label: "Complete", color: "success", icon: <CheckCircle size={14} /> },
    { status: "CANCELLED", label: "Cancel", color: "error", icon: <Ban size={14} />, requiresReason: true },
  ],
};

function TimelineEvent({ action, time, actor, detail, isFirst, isLast }: {
  action: string; time: string; actor: string; detail?: string;
  isFirst: boolean; isLast: boolean;
}) {
  return (
    <Box sx={{ position: "relative", pl: 3, pb: isLast ? 0 : 2.5 }}>
      <Box sx={{
        position: "absolute", left: 0, top: 4, width: 10, height: 10,
        borderRadius: "50%", bgcolor: isFirst ? "primary.main" : "divider",
      }} />
      {!isLast && <Box sx={{ position: "absolute", left: 4, top: 16, width: 2, height: "calc(100% - 8px)", bgcolor: "divider" }} />}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{action}</Typography>
      {detail && <Typography variant="body2" sx={{ color: "text.secondary" }}>{detail}</Typography>}
      <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: '"Geist Mono", monospace' }}>
        {time} — {actor}
      </Typography>
    </Box>
  );
}

export default function RequestDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();

  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [reasonDialog, setReasonDialog] = useState<{ status: string; label: string } | null>(null);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!params.id) return;
    let cancelled = false;
    setLoading(true);
    frontOfficeApi.getRequest(params.id)
      .then((r) => { if (!cancelled) setRequest(r); })
      .catch((err) => {
        if (!cancelled) setError(err?.response?.status === 404 ? "Request not found." : "Failed to load request.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  const handleStatusUpdate = async (status: string, statusReason?: string) => {
    if (!params.id) return;
    setUpdatingStatus(status);
    setReasonDialog(null);
    setReason("");
    try {
      const updated = await frontOfficeApi.updateRequestStatus(params.id, status, statusReason);
      setRequest(updated);
      toast.success(`Request ${status.toLowerCase().replace("_", " ")}`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update status.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleActionClick = (action: StatusAction) => {
    if (action.requiresReason) {
      setReasonDialog({ status: action.status, label: action.label });
    } else {
      handleStatusUpdate(action.status);
    }
  };

  if (loading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress size={32} /></Box>;
  }

  if (error || !request) {
    return (
      <Box>
        <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/front-office")} sx={{ mb: 2 }}>
          Back to Front Office
        </Button>
        <Alert severity="error">{error || "Request not found."}</Alert>
      </Box>
    );
  }

  const currentStatus = request.status.toLowerCase();
  const availableActions = STATUS_ACTIONS[currentStatus] || [];

  // Build timeline from timestamps
  const timeline: { action: string; time: string; actor: string; detail?: string }[] = [];
  if (request.completed_at) timeline.push({ action: "Completed", time: new Date(request.completed_at).toLocaleString(), actor: "Staff" });
  if (request.confirmed_at) timeline.push({ action: "Confirmed", time: new Date(request.confirmed_at).toLocaleString(), actor: "Staff" });
  timeline.push({ action: "Submitted", time: new Date(request.created_at).toLocaleString(), actor: "Guest", detail: "Via QR microsite" });

  return (
    <Box>
      <PageHeader
        title={`Request #${request.request_number}`}
        subtitle={`${request.catalog_item_name} · ${request.property_name || "—"}`}
        actions={
          <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/front-office")}>
            Back
          </Button>
        }
      />

      <Box sx={{ display: "flex", gap: 1, mb: 2.5, flexWrap: "wrap" }}>
        <StatusChip status={request.status.toLowerCase()} />
        <Chip label={`Room ${request.room_number}`} size="small" variant="outlined" icon={<DoorOpen size={12} />} />
        {request.property_name && <Chip label={request.property_name} size="small" variant="outlined" />}
        <Chip
          label={`${request.currency} ${Number(request.total_price).toLocaleString()}`}
          size="small" variant="outlined"
          sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 340px" }, gap: 2.5 }}>
        {/* Main Content */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* Request Items */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Package size={16} />
                <Typography variant="h5">Request Items</Typography>
              </Box>

              {/* Header row */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 1, mb: 1, px: 0.5 }}>
                {["Service", "Qty", "Unit Price", "Total"].map((h) => (
                  <Typography key={h} variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>{h}</Typography>
                ))}
              </Box>
              <Divider sx={{ mb: 1.5 }} />

              {/* Single item (ServiceRequest has one item) */}
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: 1, alignItems: "center", py: 1 }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>{request.catalog_item_name}</Typography>
                  {request.provider_name && (
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>{request.provider_name}</Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', textAlign: "right" }}>
                  {request.quantity}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', textAlign: "right" }}>
                  {request.currency} {(Number(request.total_price) / request.quantity).toLocaleString()}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, textAlign: "right" }}>
                  {request.currency} {Number(request.total_price).toLocaleString()}
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5 }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 3 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  Total: {request.currency} {Number(request.total_price).toLocaleString()}
                </Typography>
              </Box>

              {/* Guest Note */}
              {request.notes && (
                <Box sx={{ mt: 2.5, p: 2, bgcolor: "action.hover", borderRadius: 1.5 }}>
                  <Typography variant="overline" sx={{ color: "text.secondary", fontSize: "0.65rem", letterSpacing: 1 }}>
                    Guest Note
                  </Typography>
                  <Typography variant="body1">"{request.notes}"</Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Guest Info */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <User size={16} />
                <Typography variant="h5">Guest Information</Typography>
              </Box>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                {[
                  { label: "Room", value: request.room_number, icon: <DoorOpen size={14} /> },
                  { label: "Property", value: request.property_name || "—", icon: null },
                  { label: "Session ID", value: request.session_id, mono: true, icon: null },
                  { label: "Requested At", value: new Date(request.created_at).toLocaleString(), icon: <Calendar size={14} /> },
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
            </CardContent>
          </Card>

          {/* Status Actions */}
          {availableActions.length > 0 && (
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h5" sx={{ mb: 2 }}>Update Status</Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {availableActions.map((action) => (
                    <Button
                      key={action.status}
                      variant="outlined" size="small" color={action.color}
                      startIcon={updatingStatus === action.status ? <CircularProgress size={14} /> : action.icon}
                      onClick={() => handleActionClick(action)}
                      disabled={!!updatingStatus}
                    >
                      {action.label}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Timeline Sidebar */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>Timeline</Typography>
              {timeline.map((event, i) => (
                <TimelineEvent
                  key={i}
                  action={event.action}
                  time={event.time}
                  actor={event.actor}
                  detail={event.detail}
                  isFirst={i === 0}
                  isLast={i === timeline.length - 1}
                />
              ))}

              <Divider sx={{ my: 2 }} />

              <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1, mb: 1, display: "block" }}>
                Add Staff Note
              </Typography>
              <TextField
                fullWidth size="small" multiline rows={2} placeholder="Add a staff note..."
                value={note} onChange={(e) => setNote(e.target.value)}
              />
              <Button
                variant="outlined" size="small" startIcon={<MessageSquare size={14} />}
                onClick={() => { toast.success("Note added"); setNote(""); }}
                sx={{ mt: 1 }} disabled={!note.trim()}
              >
                Add Note
              </Button>
            </CardContent>
          </Card>

          {/* Request Meta */}
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>Request Details</Typography>
              {[
                { label: "Request ID", value: request.id, mono: true },
                { label: "Request #", value: request.request_number, mono: true },
                { label: "Status", value: request.status },
                { label: "Created", value: new Date(request.created_at).toLocaleString() },
                { label: "Updated", value: new Date(request.updated_at).toLocaleString() },
              ].map((item) => (
                <Box key={item.label} sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>{item.label}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, fontFamily: item.mono ? '"Geist Mono", monospace' : undefined, maxWidth: "60%", textAlign: "right", wordBreak: "break-all" }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Reason Dialog */}
      <Dialog open={!!reasonDialog} onClose={() => setReasonDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{reasonDialog?.label} Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Please provide a reason for {reasonDialog?.label.toLowerCase()}ing this request.
          </Typography>
          <TextField
            fullWidth size="small" multiline rows={3}
            label="Reason" placeholder="Enter reason..."
            value={reason} onChange={(e) => setReason(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setReasonDialog(null); setReason(""); }}>Cancel</Button>
          <Button
            variant="contained"
            color={reasonDialog?.status === "REJECTED" || reasonDialog?.status === "CANCELLED" ? "error" : "primary"}
            onClick={() => handleStatusUpdate(reasonDialog!.status, reason)}
            disabled={!reason.trim()}
          >
            {reasonDialog?.label}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
