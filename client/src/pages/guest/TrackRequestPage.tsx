/**
 * TrackRequestPage — Guest tracks the status of their service request.
 *
 * Design: Mobile-first, clean timeline with status updates.
 * Shows request number, current status, and timeline of events.
 *
 * Route: /guest/track/:requestNumber
 */
import { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, Chip, CircularProgress } from "@mui/material";
import { Clock, CheckCircle, Truck, Package, ArrowLeft } from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { Button } from "@mui/material";

interface TimelineEvent {
  status: string;
  label: string;
  time: string;
  detail: string;
  active: boolean;
  completed: boolean;
}

const DEMO_TIMELINE: TimelineEvent[] = [
  { status: "submitted", label: "Submitted", time: "08:30", detail: "Your request has been received", active: false, completed: true },
  { status: "confirmed", label: "Confirmed", time: "08:45", detail: "Front desk confirmed your request", active: false, completed: true },
  { status: "in_progress", label: "In Progress", time: "09:00", detail: "Therapist assigned — arriving at 15:00", active: true, completed: false },
  { status: "completed", label: "Completed", time: "—", detail: "Service delivered", active: false, completed: false },
];

const STATUS_ICONS: Record<string, React.ReactNode> = {
  submitted: <Package size={18} />,
  confirmed: <CheckCircle size={18} />,
  in_progress: <Truck size={18} />,
  completed: <CheckCircle size={18} />,
};

export default function TrackRequestPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ requestNumber: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <GuestLayout propertyName="Grand Hyatt Bangkok">
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={40} thickness={3} sx={{ color: "#404040" }} />
        </Box>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout propertyName="Grand Hyatt Bangkok">
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
          Track Request
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "#737373", fontWeight: 500 }}>
            {params.requestNumber || "SR-A1B2C3"}
          </Typography>
          <Chip
            label="In Progress"
            size="small"
            sx={{
              bgcolor: "#FEF3C7", color: "#92400E", fontWeight: 600, fontSize: "0.6875rem",
              height: 22, "& .MuiChip-label": { px: 1 },
            }}
          />
        </Box>
      </Box>

      {/* Request Summary */}
      <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 2.5 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1, fontSize: "0.65rem" }}>
            Request Summary
          </Typography>
          {[
            { name: "Thai Massage (60 min) x2", price: "THB 3,000" },
            { name: "Room Service - Set Menu x1", price: "THB 2,200" },
          ].map((item) => (
            <Box key={item.name} sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
              <Typography variant="body2" sx={{ color: "#404040" }}>{item.name}</Typography>
              <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>{item.price}</Typography>
            </Box>
          ))}
          <Box sx={{ display: "flex", justifyContent: "space-between", pt: 1, mt: 1, borderTop: "1px solid #E5E5E5" }}>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>Total</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>THB 5,200</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 2.5 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1, fontSize: "0.65rem", mb: 2, display: "block" }}>
            Status Timeline
          </Typography>

          {DEMO_TIMELINE.map((event, i) => (
            <Box key={event.status} sx={{ display: "flex", gap: 2, position: "relative", pb: i < DEMO_TIMELINE.length - 1 ? 3 : 0 }}>
              {/* Timeline Line */}
              {i < DEMO_TIMELINE.length - 1 && (
                <Box sx={{
                  position: "absolute", left: 15, top: 32, width: 2, height: "calc(100% - 24px)",
                  bgcolor: event.completed ? "#171717" : "#E5E5E5",
                }} />
              )}

              {/* Icon */}
              <Box sx={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                bgcolor: event.active ? "#171717" : event.completed ? "#171717" : "#F5F5F5",
                color: event.active || event.completed ? "#FFFFFF" : "#A3A3A3",
                border: event.active ? "2px solid #171717" : "none",
                boxShadow: event.active ? "0 0 0 4px rgba(23,23,23,0.1)" : "none",
              }}>
                {STATUS_ICONS[event.status]}
              </Box>

              {/* Content */}
              <Box sx={{ flex: 1, pt: 0.25 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography variant="body1" sx={{
                    fontWeight: event.active ? 700 : event.completed ? 600 : 400,
                    color: event.active ? "#171717" : event.completed ? "#404040" : "#A3A3A3",
                  }}>
                    {event.label}
                  </Typography>
                  <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', color: "#A3A3A3" }}>
                    {event.time}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{
                  color: event.active ? "#404040" : "#A3A3A3",
                  fontSize: "0.8125rem",
                }}>
                  {event.detail}
                </Typography>
              </Box>
            </Box>
          ))}
        </CardContent>
      </Card>

      {/* Note */}
      <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 2.5 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1, fontSize: "0.65rem" }}>
            Your Note
          </Typography>
          <Typography variant="body2" sx={{ color: "#404040", mt: 0.5 }}>
            "Please schedule for 3 PM if possible. We prefer a female therapist."
          </Typography>
        </CardContent>
      </Card>

      {/* Back Button */}
      <Button
        variant="outlined" fullWidth size="large"
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate("/")}
        sx={{
          borderColor: "#D4D4D4", color: "#404040", borderRadius: 1.5, py: 1.5,
          textTransform: "none", fontWeight: 600,
          "&:hover": { borderColor: "#171717" },
        }}
      >
        Back to Services
      </Button>
    </GuestLayout>
  );
}
