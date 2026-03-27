/**
 * GuestHistoryPage — Shows all service requests made in the current guest session.
 *
 * Route: /guest/history/:sessionId
 * Guests can view all their requests, their statuses, and navigate to track individual ones.
 */
import { useState, useEffect } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Button,
  CircularProgress, Alert, Divider,
} from "@mui/material";
import {
  Clock, CheckCircle, XCircle, Loader2, Package, ArrowRight, RefreshCw,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { guestApi } from "@/lib/api/endpoints";
import { useGuestSession } from "@/hooks/useGuestSession";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  PENDING:     { label: "Pending",     color: "#D97706", bg: "#FEF3C7", icon: <Clock size={14} /> },
  CONFIRMED:   { label: "Confirmed",   color: "#2563EB", bg: "#EFF6FF", icon: <CheckCircle size={14} /> },
  IN_PROGRESS: { label: "In Progress", color: "#7C3AED", bg: "#F5F3FF", icon: <Loader2 size={14} /> },
  COMPLETED:   { label: "Completed",   color: "#16A34A", bg: "#F0FDF4", icon: <CheckCircle size={14} /> },
  CANCELLED:   { label: "Cancelled",   color: "#737373", bg: "#F5F5F5", icon: <XCircle size={14} /> },
  REJECTED:    { label: "Rejected",    color: "#DC2626", bg: "#FEF2F2", icon: <XCircle size={14} /> },
};

interface RequestSummary {
  id: string;
  request_number: string;
  catalog_item_name: string;
  status: string;
  total_amount?: string;
  currency?: string;
  created_at: string;
  item_count?: number;
}

export default function GuestHistoryPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ sessionId: string }>();
  const { session } = useGuestSession();

  const [requests, setRequests] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async (showRefresh = false) => {
    if (!params.sessionId) return;
    if (showRefresh) setRefreshing(true);
    try {
      const data = await guestApi.listRequests(params.sessionId);
      setRequests((data ?? []) as unknown as RequestSummary[]);
      setError("");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError("Session not found.");
      } else {
        setError("Could not load request history.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [params.sessionId]);

  const propertyName = session?.property_name || "Your Stay";
  const roomNumber = session?.room_number;

  // Dynamic page title — guest context
  useEffect(() => {
    const room = roomNumber ? `Room ${roomNumber}` : "Your Stay";
    const prop = propertyName !== "Your Stay" ? propertyName : "Peppr Around";
    document.title = `${room} — ${prop}`;
    return () => { document.title = "Peppr Around — Admin"; };
  }, [roomNumber, propertyName]);

  if (loading) {
    return (
      <GuestLayout propertyName="">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5,
          "@keyframes shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        }}>
          {/* Title shimmer */}
          <Box sx={{ height: 24, borderRadius: 1, bgcolor: "#e0e0e0", width: "40%", mb: 0.5 }} />
          <Box sx={{ height: 14, borderRadius: 1, bgcolor: "#ebebeb", width: "55%", mb: 1 }} />
          {/* Request cards */}
          {[1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{
              p: 2, borderRadius: 2, border: "1px solid #f0f0f0",
              background: "linear-gradient(90deg, #fafafa 25%, #f4f4f4 50%, #fafafa 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s infinite ${i * 0.1}s`,
            }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                <Box sx={{ height: 14, borderRadius: 1, bgcolor: "#e0e0e0", width: "50%" }} />
                <Box sx={{ height: 22, borderRadius: 4, bgcolor: "#e8e8e8", width: 70 }} />
              </Box>
              <Box sx={{ height: 11, borderRadius: 1, bgcolor: "#ebebeb", width: "75%", mb: 0.75 }} />
              <Box sx={{ height: 11, borderRadius: 1, bgcolor: "#ebebeb", width: "40%" }} />
            </Box>
          ))}
        </Box>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout propertyName={propertyName}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
          My Requests
        </Typography>
        {roomNumber && (
          <Typography variant="body2" sx={{ color: "#737373" }}>
            Room {roomNumber} · {requests.length} request{requests.length !== 1 ? "s" : ""}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>{error}</Alert>
      )}

      {/* Request List */}
      {requests.length === 0 ? (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5" }}>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Package size={32} color="#D4D4D4" style={{ marginBottom: 12 }} />
            <Typography variant="subtitle2" sx={{ color: "#404040", mb: 0.5 }}>No requests yet</Typography>
            <Typography variant="body2" sx={{ color: "#737373", mb: 2 }}>
              Browse our services and place your first request.
            </Typography>
            <Button
              variant="contained" size="small"
              onClick={() => navigate(`/guest/menu/${params.sessionId}`)}
              sx={{ textTransform: "none", bgcolor: "#171717", "&:hover": { bgcolor: "#404040" }, borderRadius: 1.5 }}
            >
              Browse Services
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5" }}>
          <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
            {requests.map((req, i) => {
              const cfg = STATUS_CONFIG[req.status] || STATUS_CONFIG.PENDING;
              const total = parseFloat(req.total_amount ?? "0");
              return (
                <Box key={req.id}>
                  <Box
                    sx={{
                      display: "flex", alignItems: "center", gap: 2, p: 2,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#FAFAFA" },
                    }}
                    onClick={() => navigate(`/guest/track/${req.request_number}`)}
                  >
                    {/* Status dot */}
                    <Box sx={{
                      width: 36, height: 36, borderRadius: "50%",
                      bgcolor: cfg.bg, color: cfg.color,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>
                      {cfg.icon}
                    </Box>

                    {/* Info */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
                        {req.catalog_item_name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', color: "#737373" }}>
                          #{req.request_number}
                        </Typography>
                        <Typography variant="caption" sx={{ color: "#A3A3A3" }}>
                          {new Date(req.created_at).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Right side */}
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
                      <Chip
                        label={cfg.label}
                        size="small"
                        sx={{
                          height: 20, fontSize: "0.625rem", fontWeight: 600,
                          bgcolor: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}30`,
                        }}
                      />
                      <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', color: "#404040" }}>
                        {total > 0 ? `${req.currency ?? ""} ${total.toFixed(2)}` : "Free"}
                      </Typography>
                    </Box>

                    <ArrowRight size={14} color="#D4D4D4" />
                  </Box>
                  {i < requests.length - 1 && <Divider />}
                </Box>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mt: 2 }}>
        <Button
          variant="outlined" fullWidth size="medium"
          startIcon={refreshing ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
          onClick={() => fetchHistory(true)}
          disabled={refreshing}
          sx={{ textTransform: "none", borderColor: "#D4D4D4", color: "#404040", borderRadius: 1.5 }}
        >
          Refresh
        </Button>
        <Button
          variant="contained" fullWidth size="medium"
          onClick={() => navigate(`/guest/menu/${params.sessionId}`)}
          sx={{ textTransform: "none", bgcolor: "#171717", "&:hover": { bgcolor: "#404040" }, borderRadius: 1.5 }}
        >
          Browse More Services
        </Button>
      </Box>
    </GuestLayout>
  );
}
