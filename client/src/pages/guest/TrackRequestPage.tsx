/**
 * TrackRequestPage — Guest tracks their service request status in real-time.
 *
 * Flow: After submission → lands here → polls for status updates + SSE for instant push.
 * Route: /guest/track/:requestNumber
 */
import { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Card, CardContent, Button, Chip, Divider,
  CircularProgress, Alert, LinearProgress,
} from "@mui/material";
import {
  Clock, CheckCircle, XCircle, RefreshCw, AlertTriangle,
  Loader2, Package, Phone, MessageSquare,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { guestApi } from "@/lib/api/endpoints";
import type { ServiceRequestFull } from "@/lib/api/types";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; progress: number }> = {
  PENDING: { label: "Pending", color: "#D97706", bg: "#FEF3C7", icon: <Clock size={20} />, progress: 20 },
  CONFIRMED: { label: "Confirmed", color: "#2563EB", bg: "#EFF6FF", icon: <CheckCircle size={20} />, progress: 40 },
  IN_PROGRESS: { label: "In Progress", color: "#7C3AED", bg: "#F5F3FF", icon: <Loader2 size={20} />, progress: 65 },
  COMPLETED: { label: "Completed", color: "#16A34A", bg: "#F0FDF4", icon: <CheckCircle size={20} />, progress: 100 },
  CANCELLED: { label: "Cancelled", color: "#737373", bg: "#F5F5F5", icon: <XCircle size={20} />, progress: 0 },
  REJECTED: { label: "Rejected", color: "#DC2626", bg: "#FEF2F2", icon: <XCircle size={20} />, progress: 0 },
};

export default function TrackRequestPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ requestNumber: string }>();

  const [request, setRequest] = useState<ServiceRequestFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch request
  const fetchRequest = async (showRefresh = false) => {
    if (!params.requestNumber) return;
    if (showRefresh) setRefreshing(true);
    try {
      const data = await guestApi.trackRequest(params.requestNumber);
      setRequest(data);
      setError("");

      // Stop polling if terminal status
      if (["COMPLETED", "CANCELLED", "REJECTED"].includes(data.status) && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError("Request not found. Please check the request number.");
      } else {
        setError("Could not load request status.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial load + polling
  useEffect(() => {
    fetchRequest();
    pollRef.current = setInterval(() => fetchRequest(), 10_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [params.requestNumber]);

  // SSE for real-time updates
  useEffect(() => {
    if (!request?.property_id) return;
    const origin = window.location.origin;
    const es = new EventSource(`${origin}/api/sse/front-office?property_id=${request.property_id}`);

    es.addEventListener("request_update", () => {
      fetchRequest();
    });

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [request?.property_id, params.requestNumber]);

  const statusConfig = request ? STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING : STATUS_CONFIG.PENDING;

  if (loading) {
    return (
      <GuestLayout propertyName="Tracking">
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={40} thickness={3} sx={{ color: "#404040", mb: 2 }} />
          <Typography variant="body2" sx={{ color: "#737373" }}>Loading request status...</Typography>
        </Box>
      </GuestLayout>
    );
  }

  if (error) {
    return (
      <GuestLayout propertyName="Peppr Around">
        <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>{error}</Alert>
        <Button variant="outlined" size="small" onClick={() => window.history.back()} sx={{ textTransform: "none" }}>
          Go Back
        </Button>
      </GuestLayout>
    );
  }

  if (!request) return null;

  const isTerminal = ["COMPLETED", "CANCELLED", "REJECTED"].includes(request.status);

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
        <Typography variant="body2" sx={{ color: "#737373" }}>
          Request #{request.request_number}
        </Typography>

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
      {request.status_reason && (
        <Alert
          severity={request.status === "REJECTED" ? "error" : "info"}
          icon={<AlertTriangle size={18} />}
          sx={{ borderRadius: 1.5, mb: 2 }}
        >
          {request.status_reason}
        </Alert>
      )}

      {/* Request Details */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Request Details</Typography>

          {request.items?.map((item, i) => (
            <Box key={item.request_item_id}>
              <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.item_name}</Typography>
                  <Typography variant="caption" sx={{ color: "#737373" }}>
                    {item.quantity}x · {item.item_category}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "right" }}>
                  {item.included_quantity > 0 && (
                    <Chip label={`${item.included_quantity} incl.`} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#F0FDF4", color: "#16A34A", mb: 0.25 }} />
                  )}
                  <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', color: "#404040", display: "block" }}>
                    {parseFloat(item.line_total) > 0 ? `${item.currency} ${parseFloat(item.line_total).toFixed(2)}` : "Free"}
                  </Typography>
                </Box>
              </Box>
              {i < request.items.length - 1 && <Divider />}
            </Box>
          ))}

          <Divider sx={{ my: 1 }} />

          {parseFloat(request.discount_amount) > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.25 }}>
              <Typography variant="caption" sx={{ color: "#16A34A" }}>Included items discount</Typography>
              <Typography variant="caption" sx={{ color: "#16A34A", fontFamily: '"Geist Mono", monospace' }}>
                -{request.currency} {parseFloat(request.discount_amount).toFixed(2)}
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 0.5 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
              {parseFloat(request.total_amount) > 0 ? `${request.currency} ${parseFloat(request.total_amount).toFixed(2)}` : "Free"}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Guest Info */}
      {(request.guest_name || request.guest_phone || request.guest_notes || request.preferred_datetime) && (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Your Info</Typography>
            {request.guest_name && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Package size={14} color="#737373" />
                <Typography variant="body2">{request.guest_name}</Typography>
              </Box>
            )}
            {request.guest_phone && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Phone size={14} color="#737373" />
                <Typography variant="body2">{request.guest_phone}</Typography>
              </Box>
            )}
            {request.guest_notes && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <MessageSquare size={14} color="#737373" />
                <Typography variant="body2">{request.guest_notes}</Typography>
              </Box>
            )}
            {request.preferred_datetime && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5 }}>
                <Clock size={14} color="#737373" />
                <Typography variant="body2">{new Date(request.preferred_datetime).toLocaleString()}</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Timestamps */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Timeline</Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#737373" }}>Submitted</Typography>
            <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
              {new Date(request.created_at).toLocaleString()}
            </Typography>
          </Box>
          {request.confirmed_at && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Confirmed</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
                {new Date(request.confirmed_at).toLocaleString()}
              </Typography>
            </Box>
          )}
          {request.completed_at && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Completed</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
                {new Date(request.completed_at).toLocaleString()}
              </Typography>
            </Box>
          )}
          {request.cancelled_at && (
            <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="caption" sx={{ color: "#737373" }}>Cancelled</Typography>
              <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace' }}>
                {new Date(request.cancelled_at).toLocaleString()}
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {!isTerminal && (
          <Button
            variant="outlined" fullWidth size="medium"
            startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
            onClick={() => fetchRequest(true)}
            disabled={refreshing}
            sx={{ textTransform: "none", borderColor: "#D4D4D4", color: "#404040", borderRadius: 1.5 }}
          >
            Refresh Status
          </Button>
        )}

        {sessionStorage.getItem("pa_guest_session") && (
          <Button
            variant="text" fullWidth size="small"
            onClick={() => {
              const sess = JSON.parse(sessionStorage.getItem("pa_guest_session")!);
              navigate(`/guest/menu/${sess.session_id}`);
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
    </GuestLayout>
  );
}
