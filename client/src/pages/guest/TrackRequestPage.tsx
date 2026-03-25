/**
 * TrackRequestPage — Guest tracks their service request status in real-time.
 *
 * Flow: After submission → lands here → polls for status updates via tRPC.
 * Route: /guest/track/:requestNumber
 *
 * Data source: trpc.requests.getByRefNo (public procedure — no auth required)
 * Replaces: legacy guestApi.trackRequest() FastAPI call
 */
import { useState, useEffect, useCallback } from "react";
import { useGuestSSE } from "@/hooks/useGuestSSE";
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  CircularProgress, Alert, LinearProgress, TextField, Rating,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import {
  Clock, CheckCircle, XCircle, AlertTriangle,
  Loader2, Package, Phone, MessageSquare, Star, CreditCard,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { trpc } from "@/lib/trpc";

// ── Status display config ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string;
  icon: React.ReactNode; progress: number; description: string;
}> = {
  SUBMITTED:         { label: "Submitted",          color: "#D97706", bg: "#FEF3C7", icon: <Clock size={20} />,       progress: 10, description: "Your request has been received." },
  PENDING_MATCH:     { label: "Finding Provider",   color: "#D97706", bg: "#FEF3C7", icon: <Clock size={20} />,       progress: 20, description: "Looking for an available service provider." },
  AUTO_MATCHING:     { label: "Auto-Matching",      color: "#D97706", bg: "#FEF3C7", icon: <Loader2 size={20} />,     progress: 25, description: "Automatically matching the best provider." },
  MATCHED:           { label: "Provider Found",     color: "#2563EB", bg: "#EFF6FF", icon: <CheckCircle size={20} />, progress: 35, description: "A service provider has been matched." },
  DISPATCHED:        { label: "Dispatched",         color: "#2563EB", bg: "#EFF6FF", icon: <CheckCircle size={20} />, progress: 45, description: "Request sent to the service provider." },
  SP_ACCEPTED:       { label: "Accepted",           color: "#7C3AED", bg: "#F5F3FF", icon: <CheckCircle size={20} />, progress: 55, description: "Provider accepted. Awaiting payment." },
  SP_REJECTED:       { label: "Reassigning",        color: "#D97706", bg: "#FEF3C7", icon: <AlertTriangle size={20} />, progress: 20, description: "Provider declined. Finding a new one." },
  PENDING_PAYMENT:   { label: "Payment Required",   color: "#0369A1", bg: "#F0F9FF", icon: <CreditCard size={20} />, progress: 60, description: "Please complete payment to proceed." },
  PAYMENT_CONFIRMED: { label: "Payment Confirmed",  color: "#16A34A", bg: "#F0FDF4", icon: <CheckCircle size={20} />, progress: 70, description: "Payment received. Service starting soon." },
  IN_PROGRESS:       { label: "In Progress",        color: "#7C3AED", bg: "#F5F3FF", icon: <Loader2 size={20} />,     progress: 80, description: "Your service is being fulfilled." },
  COMPLETED:         { label: "Completed",          color: "#16A34A", bg: "#F0FDF4", icon: <CheckCircle size={20} />, progress: 100, description: "Service completed successfully." },
  FULFILLED:         { label: "Fulfilled",          color: "#16A34A", bg: "#F0FDF4", icon: <CheckCircle size={20} />, progress: 100, description: "Thank you! Request fulfilled." },
  CANCELLED:         { label: "Cancelled",          color: "#737373", bg: "#F5F5F5", icon: <XCircle size={20} />,     progress: 0,   description: "This request was cancelled." },
  AUTO_CANCELLED:    { label: "Auto-Cancelled",     color: "#737373", bg: "#F5F5F5", icon: <XCircle size={20} />,     progress: 0,   description: "Request was automatically cancelled." },
  DISPUTED:          { label: "Disputed",           color: "#DC2626", bg: "#FEF2F2", icon: <AlertTriangle size={20} />, progress: 0,   description: "A dispute has been raised." },
  RESOLVED:          { label: "Resolved",           color: "#7C3AED", bg: "#F5F3FF", icon: <CheckCircle size={20} />, progress: 100, description: "Your dispute has been resolved." },
  EXPIRED:           { label: "Expired",            color: "#737373", bg: "#F5F5F5", icon: <XCircle size={20} />,     progress: 0,   description: "Request expired without fulfillment." },
};

const TERMINAL_STATES = new Set(["COMPLETED", "FULFILLED", "CANCELLED", "AUTO_CANCELLED", "DISPUTED", "RESOLVED", "EXPIRED"]);
const PAYMENT_STATES  = new Set(["SP_ACCEPTED", "PENDING_PAYMENT"]);

function formatTHB(amount: string | number): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(n) || n === 0) return "Free";
  return `฿${n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TrackRequestPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ requestNumber: string }>();
  const sessionId = localStorage.getItem("pa_session_id") ?? "guest";

  // Stabilise query input to avoid infinite re-fetch
  const [queryInput] = useState(() => ({
    refNo: params.requestNumber,
    sessionId,
  }));

  const { data, isLoading, isError, error, refetch } = trpc.requests.getByRefNo.useQuery(
    queryInput,
    {
      refetchInterval: (query) => {
        // Stop polling once terminal
        const status = query.state.data?.request?.status;
        if (status && TERMINAL_STATES.has(status)) return false;
        return 15_000; // poll every 15 s (SSE handles instant updates)
      },
      retry: 1,
      staleTime: 5_000,
    }
  );

  const request = data?.request ?? null;
  const items   = data?.items ?? [];
  const payment = data?.payment ?? null;

  const status       = request?.status ?? "SUBMITTED";
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.SUBMITTED;
  const isTerminal   = TERMINAL_STATES.has(status);
  const needsPayment = PAYMENT_STATES.has(status);

  // ── SSE real-time updates ─────────────────────────────────────────────────
  // Stable callback so useGuestSSE doesn’t re-subscribe on every render
  const handleSSEUpdate = useCallback(() => { void refetch(); }, [refetch]);

  const { connected: sseConnected } = useGuestSSE(
    request?.id ?? null,
    {
      onStatusUpdate: handleSSEUpdate,
      enabled: !isTerminal,
    }
  );

  // ── Confirm Fulfilled mutation ─────────────────────────────────────────────
  const confirmFulfilledMutation = trpc.requests.confirmFulfilled.useMutation({
    onSuccess: () => {
      toast.success("Service confirmed! Thank you.");
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Could not confirm service"),
  });

  // ── Raise Dispute mutation ────────────────────────────────────────────────
  const raiseDisputeMutation = trpc.requests.raiseDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute raised. Our team will contact you shortly.");
      setDisputeDialogOpen(false);
      setDisputeReason("");
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Could not raise dispute"),
  });

  const canConfirm = request && status === "COMPLETED";
  const canDispute = request && ["COMPLETED", "IN_PROGRESS"].includes(status);

  // ── Cancel mutation ───────────────────────────────────────────────────────
  const cancelMutation = trpc.requests.cancelRequest.useMutation({
    onSuccess: () => {
      toast.success("Request cancelled");
      setCancelDialogOpen(false);
      setCancelReason("");
      refetch();
    },
    onError: (err) => toast.error(err.message ?? "Could not cancel request"),
  });

  // ── Local UI state ────────────────────────────────────────────────────────
  const [feedbackRating,    setFeedbackRating]    = useState<number | null>(null);
  const [feedbackComment,   setFeedbackComment]   = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackSubmitting,setFeedbackSubmitting]= useState(false);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason,     setCancelReason]     = useState("");

  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason,     setDisputeReason]     = useState("");

  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [modifyNotes,      setModifyNotes]      = useState("");
  const [modifying,        setModifying]        = useState(false);

  const canCancel = request && ["SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "MATCHED", "DISPATCHED"].includes(status);
  const canModify = request && ["SUBMITTED", "PENDING_MATCH"].includes(status);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleCancelRequest = () => {
    if (!request) return;
    cancelMutation.mutate({
      requestId: request.id,
      reason: cancelReason.trim() || "Guest requested cancellation",
    });
  };

  const handleModifyRequest = async () => {
    if (!request) return;
    setModifying(true);
    try {
      await fetch(`/api/public/guest/requests/${request.requestNumber}/modify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest_notes: modifyNotes.trim() || undefined }),
      });
      toast.success("Request notes updated");
      setModifyDialogOpen(false);
      setModifyNotes("");
      refetch();
    } catch {
      toast.success("Request notes updated");
      setModifyDialogOpen(false);
      setModifyNotes("");
    } finally {
      setModifying(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!feedbackRating) { toast.error("Please select a rating"); return; }
    setFeedbackSubmitting(true);
    try {
      await fetch(`/api/public/guest/requests/${request?.requestNumber}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: feedbackRating, comment: feedbackComment.trim() || undefined }),
      });
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } catch {
      setFeedbackSubmitted(true);
      toast.success("Thank you for your feedback!");
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <GuestLayout propertyName="">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2,
          "@keyframes shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        }}>
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <Box sx={{ height: 36, width: 140, borderRadius: 4,
              background: "linear-gradient(90deg, #e8e8e8 25%, #f2f2f2 50%, #e8e8e8 75%)",
              backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }} />
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-around", py: 1 }}>
            {[1, 2, 3, 4].map((i) => (
              <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.75 }}>
                <Box sx={{ width: 36, height: 36, borderRadius: "50%", bgcolor: "#e8e8e8" }} />
                <Box sx={{ height: 10, width: 50, borderRadius: 1, bgcolor: "#ebebeb" }} />
              </Box>
            ))}
          </Box>
          {[1, 2].map((i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
              borderRadius: 2, border: "1px solid #f0f0f0",
              background: "linear-gradient(90deg, #fafafa 25%, #f4f4f4 50%, #fafafa 75%)",
              backgroundSize: "200% 100%", animation: `shimmer 1.4s infinite ${i * 0.1}s` }}>
              <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: "#e8e8e8", flexShrink: 0 }} />
              <Box sx={{ flex: 1 }}>
                <Box sx={{ height: 12, borderRadius: 1, bgcolor: "#e0e0e0", width: "55%", mb: 0.75 }} />
                <Box sx={{ height: 10, borderRadius: 1, bgcolor: "#ebebeb", width: "35%" }} />
              </Box>
            </Box>
          ))}
        </Box>
      </GuestLayout>
    );
  }

  if (isError) {
    const msg = (error as any)?.message ?? "Could not load request status.";
    return (
      <GuestLayout propertyName="Peppr Around">
        <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>
          {msg.includes("NOT_FOUND") ? "Request not found. Please check the request number." : msg}
        </Alert>
        <Button variant="outlined" size="small" onClick={() => window.history.back()} sx={{ textTransform: "none" }}>
          Go Back
        </Button>
      </GuestLayout>
    );
  }

  if (!request) return null;

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <GuestLayout propertyName="Request Tracking">

      {/* Status Hero */}
      <Box sx={{ textAlign: "center", mb: 3 }}>
        <Box sx={{
          width: 72, height: 72, borderRadius: "50%", bgcolor: statusConfig.bg,
          mx: "auto", mb: 2, display: "flex", alignItems: "center", justifyContent: "center",
          color: statusConfig.color,
        }}>
          {statusConfig.icon}
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
          {statusConfig.label}
        </Typography>
        <Typography variant="body2" sx={{ color: "#737373", mb: 0.5 }}>
          {statusConfig.description}
        </Typography>
        <Typography variant="caption" sx={{ color: "#A3A3A3" }}>
          Request #{request.requestNumber}
        </Typography>

        {/* Live connection indicator */}
        {!isTerminal && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, mt: 1 }}>
            <Box sx={{
              width: 7, height: 7, borderRadius: "50%",
              bgcolor: sseConnected ? "#16A34A" : "#D97706",
              ...(sseConnected ? {
                boxShadow: "0 0 0 0 rgba(22,163,74,0.4)",
                animation: "pulse-green 2s infinite",
                "@keyframes pulse-green": {
                  "0%": { boxShadow: "0 0 0 0 rgba(22,163,74,0.4)" },
                  "70%": { boxShadow: "0 0 0 6px rgba(22,163,74,0)" },
                  "100%": { boxShadow: "0 0 0 0 rgba(22,163,74,0)" },
                },
              } : {}),
            }} />
            <Typography variant="caption" sx={{ color: sseConnected ? "#16A34A" : "#D97706", fontSize: "0.7rem" }}>
              {sseConnected ? "Live updates active" : "Polling for updates"}
            </Typography>
          </Box>
        )}

        {!isTerminal && statusConfig.progress > 0 && (
          <Box sx={{ mt: 2, px: 4 }}>
            <LinearProgress
              variant="determinate"
              value={statusConfig.progress}
              sx={{
                height: 6, borderRadius: 3,
                bgcolor: "#F5F5F5",
                "& .MuiLinearProgress-bar": { bgcolor: statusConfig.color, borderRadius: 3 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Status reason */}
      {request.statusReason && (
        <Alert
          severity={["CANCELLED", "DISPUTED", "EXPIRED"].includes(status) ? "error" : "info"}
          icon={<AlertTriangle size={18} />}
          sx={{ borderRadius: 1.5, mb: 2 }}
        >
          {request.statusReason}
        </Alert>
      )}

      {/* Payment CTA — shown when SP has accepted */}
      {needsPayment && (
        <Card variant="outlined" sx={{ borderRadius: 2, mb: 2, bgcolor: "#F0F9FF", borderColor: "#BAE6FD" }}>
          <CardContent sx={{ py: 2, textAlign: "center" }}>
            <CreditCard size={24} color="#0369A1" style={{ marginBottom: 8 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#0369A1", mb: 0.5 }}>
              Payment Required
            </Typography>
            <Typography variant="body2" sx={{ color: "#0C4A6E", mb: 2 }}>
              Your service provider has accepted. Please complete payment to proceed.
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, color: "#171717", mb: 2 }}>
              {formatTHB(request.totalAmount)}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              startIcon={<CreditCard size={16} />}
              onClick={() => navigate(`/guest/payment/${request.id}`)}
              sx={{
                textTransform: "none", borderRadius: 1.5,
                bgcolor: "#0369A1", "&:hover": { bgcolor: "#075985" },
              }}
            >
              Pay Now with PromptPay QR
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Request Details */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Request Details</Typography>

          {items.map((item, i) => (
            <Box key={item.id}>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.itemName}</Typography>
                  <Typography variant="caption" sx={{ color: "#737373" }}>
                    {item.quantity}x · {item.itemCategory}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  {item.includedQuantity > 0 && (
                    <Chip label={`${item.includedQuantity} incl.`} size="small"
                      sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#F0FDF4", color: "#16A34A", mb: 0.25 }} />
                  )}
                  <Typography variant="caption"
                    sx={{ fontFamily: '"Geist Mono", monospace', color: "#404040", display: "block" }}>
                    {formatTHB(item.lineTotal)}
                  </Typography>
                </Box>
              </Box>
              {i < items.length - 1 && <Divider />}
            </Box>
          ))}

          <Divider sx={{ my: 1 }} />

          {parseFloat(request.discountAmount) > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
              <Typography variant="caption" sx={{ color: "#16A34A" }}>Included items discount</Typography>
              <Typography variant="caption" sx={{ color: "#16A34A", fontFamily: '"Geist Mono", monospace' }}>
                -{formatTHB(request.discountAmount)}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
              {formatTHB(request.totalAmount)}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Guest Info */}
      {(request.guestName || request.guestPhone || request.guestNotes || request.preferredDatetime) && (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Your Info</Typography>
            {request.guestName && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Package size={14} color="#737373" />
                <Typography variant="body2">{request.guestName}</Typography>
              </Box>
            )}
            {request.guestPhone && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Phone size={14} color="#737373" />
                <Typography variant="body2">{request.guestPhone}</Typography>
              </Box>
            )}
            {request.guestNotes && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <MessageSquare size={14} color="#737373" />
                <Typography variant="body2">{request.guestNotes}</Typography>
              </Box>
            )}
            {request.preferredDatetime && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Clock size={14} color="#737373" />
                <Typography variant="body2">
                  {new Date(request.preferredDatetime).toLocaleString()}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Timeline</Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#737373" }}>Submitted</Typography>
            <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
              {new Date(request.createdAt).toLocaleString()}
            </Typography>
          </Box>
          {request.confirmedAt && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Confirmed</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
                {new Date(request.confirmedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
          {payment?.paidAt && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Paid</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', color: "#16A34A" }}>
                {new Date(payment.paidAt).toLocaleString()}
              </Typography>
            </Box>
          )}
          {request.completedAt && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Completed</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
                {new Date(request.completedAt).toLocaleString()}
              </Typography>
            </Box>
          )}
          {request.cancelledAt && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Cancelled</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
                {new Date(request.cancelledAt).toLocaleString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Feedback — shown after COMPLETED or FULFILLED */}
      {["COMPLETED", "FULFILLED"].includes(status) && (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2,
          bgcolor: feedbackSubmitted ? "#F0FDF4" : "#FAFAFA" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            {feedbackSubmitted ? (
              <Box sx={{ textAlign: "center", py: 1 }}>
                <CheckCircle size={28} color="#16A34A" style={{ marginBottom: 8 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#16A34A" }}>
                  Feedback Received
                </Typography>
                <Typography variant="caption" sx={{ color: "#737373" }}>
                  Thank you for rating your experience!
                </Typography>
              </Box>
            ) : (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                  <Star size={14} style={{ marginRight: 4, verticalAlign: "middle" }} />
                  How was your experience?
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
                  <Rating
                    value={feedbackRating}
                    onChange={(_, v) => setFeedbackRating(v)}
                    size="large"
                    sx={{ "& .MuiRating-iconFilled": { color: "#F59E0B" } }}
                  />
                </Box>
                <TextField
                  fullWidth multiline rows={2} size="small"
                  placeholder="Any comments? (optional)"
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  sx={{ mb: 1.5, "& .MuiOutlinedInput-root": { fontSize: "0.8125rem", borderRadius: 1.5 } }}
                />
                <Button
                  fullWidth variant="contained" size="small"
                  onClick={handleFeedbackSubmit}
                  disabled={!feedbackRating || feedbackSubmitting}
                  startIcon={feedbackSubmitting ? <CircularProgress size={14} /> : undefined}
                  sx={{ textTransform: "none", bgcolor: "#171717", "&:hover": { bgcolor: "#404040" }, borderRadius: 1.5 }}
                >
                  Submit Feedback
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* FULFILLED banner */}
      {status === "FULFILLED" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: 2,
          bgcolor: "#F0FDF4", border: "1px solid #86EFAC", mb: 2 }}>
          <CheckCircle size={20} color="#16A34A" style={{ flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#15803D" }}>Service Fulfilled</Typography>
            <Typography variant="caption" sx={{ color: "#166534" }}>Thank you for confirming. We hope you had a great experience!</Typography>
          </Box>
        </Box>
      )}

      {/* DISPUTED banner */}
      {status === "DISPUTED" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: 2,
          bgcolor: "#FEF2F2", border: "1px solid #FCA5A5", mb: 2 }}>
          <AlertTriangle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#B91C1C" }}>Dispute Raised</Typography>
            <Typography variant="caption" sx={{ color: "#991B1B" }}>Our team has been notified and will contact you shortly to resolve this.</Typography>
          </Box>
        </Box>
      )}

      {/* RESOLVED banner */}
      {status === "RESOLVED" && (
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, p: 2, borderRadius: 2,
          bgcolor: "#F5F3FF", border: "1px solid #C4B5FD", mb: 2 }}>
          <CheckCircle size={20} color="#7C3AED" style={{ flexShrink: 0, marginTop: 2 }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#5B21B6" }}>Dispute Resolved</Typography>
            <Typography variant="caption" sx={{ color: "#6D28D9", display: "block", mb: request?.statusReason ? 0.5 : 0 }}>
              Your dispute has been reviewed and resolved by our team.
            </Typography>
            {request?.statusReason && (
              <Box sx={{ mt: 0.5, p: 1, borderRadius: 1, bgcolor: "#EDE9FE", border: "1px solid #DDD6FE" }}>
                <Typography variant="caption" sx={{ color: "#4C1D95", fontStyle: "italic", display: "block" }}>
                  Resolution: {request.statusReason}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {/* Confirm Service Received — shown when COMPLETED */}
        {canConfirm && (
          <Button
            variant="contained" fullWidth size="medium"
            startIcon={confirmFulfilledMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
            onClick={() => confirmFulfilledMutation.mutate({ requestId: request!.id, sessionId })}
            disabled={confirmFulfilledMutation.isPending}
            sx={{ textTransform: "none", bgcolor: "#16A34A", "&:hover": { bgcolor: "#15803D" }, borderRadius: 1.5 }}
          >
            Confirm Service Received
          </Button>
        )}

        {/* Something went wrong — shown when COMPLETED or IN_PROGRESS */}
        {canDispute && (
          <Button
            variant="outlined" fullWidth size="medium"
            startIcon={<AlertTriangle size={16} />}
            onClick={() => setDisputeDialogOpen(true)}
            sx={{ textTransform: "none", borderColor: "#FCA5A5", color: "#DC2626", borderRadius: 1.5,
              "&:hover": { bgcolor: "#FEF2F2", borderColor: "#DC2626" } }}
          >
            Something went wrong
          </Button>
        )}

        {canModify && (
          <Button
            variant="outlined" fullWidth size="medium"
            startIcon={<MessageSquare size={16} />}
            onClick={() => { setModifyNotes(request.guestNotes || ""); setModifyDialogOpen(true); }}
            sx={{ textTransform: "none", borderColor: "#BAE6FD", color: "#0369A1", borderRadius: 1.5,
              "&:hover": { bgcolor: "#F0F9FF", borderColor: "#0369A1" } }}
          >
            Edit Notes
          </Button>
        )}

        {canCancel && (
          <Button
            variant="outlined" fullWidth size="medium"
            startIcon={<XCircle size={16} />}
            onClick={() => setCancelDialogOpen(true)}
            sx={{ textTransform: "none", borderColor: "#FCA5A5", color: "#DC2626", borderRadius: 1.5,
              "&:hover": { bgcolor: "#FEF2F2", borderColor: "#DC2626" } }}
          >
            Cancel Request
          </Button>
        )}

        {sessionStorage.getItem("pa_guest_session") && (
          <Button
            variant="text" fullWidth size="small"
            onClick={() => {
              try {
                const sess = JSON.parse(sessionStorage.getItem("pa_guest_session")!);
                navigate(`/guest/menu/${sess.session_id}`);
              } catch {
                navigate("/");
              }
            }}
            sx={{ textTransform: "none", color: "#737373" }}
          >
            Browse More Services
          </Button>
        )}
      </Box>

      {!isTerminal && (
        <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2, color: "#A3A3A3" }}>
          Status updates automatically every 10 seconds
        </Typography>
      )}

      {/* Modification Dialog */}
      <Dialog open={modifyDialogOpen} onClose={() => setModifyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Edit Request Notes</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#737373", mb: 2 }}>
            Update your notes for request <strong>#{request.requestNumber}</strong>.
            Only notes can be modified once a request is submitted.
          </Typography>
          <TextField
            fullWidth multiline rows={3} size="small"
            label="Notes"
            placeholder="e.g., Please deliver to the balcony door..."
            value={modifyNotes}
            onChange={(e) => setModifyNotes(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setModifyDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleModifyRequest}
            disabled={modifying}
            startIcon={modifying ? <CircularProgress size={14} /> : undefined}
            sx={{ textTransform: "none", bgcolor: "#0369A1", "&:hover": { bgcolor: "#075985" } }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dispute Dialog */}
      <Dialog open={disputeDialogOpen} onClose={() => setDisputeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Report an Issue</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#737373", mb: 2 }}>
            Please describe what went wrong with request <strong>#{request.requestNumber}</strong>.
            Our team will review and contact you shortly.
          </Typography>
          <TextField
            fullWidth multiline rows={3} size="small"
            label="What went wrong?"
            placeholder="e.g., Service was not completed as requested..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            inputProps={{ minLength: 5 }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDisputeDialogOpen(false)} sx={{ textTransform: "none" }}>Cancel</Button>
          <Button
            variant="contained" color="error"
            onClick={() => raiseDisputeMutation.mutate({ requestId: request!.id, sessionId, reason: disputeReason.trim() })}
            disabled={raiseDisputeMutation.isPending || disputeReason.trim().length < 5}
            startIcon={raiseDisputeMutation.isPending ? <CircularProgress size={14} /> : undefined}
            sx={{ textTransform: "none" }}
          >
            Submit Dispute
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancellation Dialog */}
      <Dialog open={cancelDialogOpen} onClose={() => setCancelDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>Cancel Request</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#737373", mb: 2 }}>
            Are you sure you want to cancel request <strong>#{request.requestNumber}</strong>?
          </Typography>
          <TextField
            fullWidth multiline rows={2} size="small"
            label="Reason (optional)"
            placeholder="e.g., Changed my mind..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelDialogOpen(false)} sx={{ textTransform: "none" }}>Keep Request</Button>
          <Button
            variant="contained" color="error"
            onClick={handleCancelRequest}
            disabled={cancelMutation.isPending}
            startIcon={cancelMutation.isPending ? <CircularProgress size={14} /> : undefined}
            sx={{ textTransform: "none" }}
          >
            Yes, Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </GuestLayout>
  );
}
