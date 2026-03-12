/**
 * FrontOfficePage — Live operations dashboard for guest sessions and service requests.
 *
 * Split view: Left shows active guest sessions, Right shows request queue.
 * This is the operational nerve center for property staff.
 */
import { Box, Card, CardContent, Typography, Grid, Chip, Avatar, Divider, Button, Tabs, Tab, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";
import { ConciergeBell, Clock, CheckCircle, XCircle, ArrowRight, RefreshCw, Users } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface GuestSession {
  id: string;
  room_number: string;
  guest_name: string;
  check_in: string;
  requests_count: number;
  status: string;
}

interface ServiceRequest {
  id: string;
  request_number: string;
  room_number: string;
  service_name: string;
  status: string;
  created_at: string;
  priority: string;
}

const SESSIONS: GuestSession[] = [
  { id: "gs-1", room_number: "1201", guest_name: "Guest", check_in: "10:30 AM", requests_count: 3, status: "active" },
  { id: "gs-2", room_number: "1202", guest_name: "Guest", check_in: "11:15 AM", requests_count: 1, status: "active" },
  { id: "gs-3", room_number: "1203", guest_name: "Guest", check_in: "09:00 AM", requests_count: 5, status: "active" },
  { id: "gs-4", room_number: "P-01", guest_name: "Guest", check_in: "01:00 PM", requests_count: 2, status: "active" },
];

const REQUESTS: ServiceRequest[] = [
  { id: "sr-1", request_number: "PA-REQ-001", room_number: "1201", service_name: "Thai Massage 60 min", status: "pending", created_at: "2 min ago", priority: "normal" },
  { id: "sr-2", request_number: "PA-REQ-002", room_number: "1203", service_name: "Afternoon Tea Set", status: "confirmed", created_at: "15 min ago", priority: "normal" },
  { id: "sr-3", request_number: "PA-REQ-003", room_number: "1203", service_name: "Airport Transfer (Sedan)", status: "in_progress", created_at: "32 min ago", priority: "high" },
  { id: "sr-4", request_number: "PA-REQ-004", room_number: "P-01", service_name: "Afternoon Tea Set", status: "pending", created_at: "5 min ago", priority: "normal" },
  { id: "sr-5", request_number: "PA-REQ-005", room_number: "1202", service_name: "Express Laundry 5kg", status: "completed", created_at: "1 hour ago", priority: "low" },
  { id: "sr-6", request_number: "PA-REQ-006", room_number: "1201", service_name: "Breakfast Buffet", status: "completed", created_at: "3 hours ago", priority: "normal" },
];

const PRIORITY_COLORS: Record<string, string> = {
  high: "#DC2626",
  normal: "#737373",
  low: "#A3A3A3",
};

export default function FrontOfficePage() {
  const [tab, setTab] = useState(0);
  const filteredRequests = tab === 0 ? REQUESTS : tab === 1 ? REQUESTS.filter(r => ["pending", "confirmed", "in_progress"].includes(r.status)) : REQUESTS.filter(r => r.status === "completed");

  return (
    <Box>
      <PageHeader
        title="Front Office"
        subtitle="Monitor guest sessions and manage service requests in real-time"
        actions={
          <Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />} onClick={() => toast.info("Refresh — coming soon")}>
            Refresh
          </Button>
        }
      />

      <Grid container spacing={2}>
        {/* Left: Active Sessions */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">
                  <Users size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Active Sessions
                </Typography>
                <Chip label={SESSIONS.length} size="small" color="primary" />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {SESSIONS.map((session, i) => (
                  <Box key={session.id}>
                    <Box
                      sx={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                        cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1, px: 1, mx: -1,
                      }}
                      onClick={() => toast.info(`View session for Room ${session.room_number}`)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: "0.6875rem", fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>
                          {session.room_number}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500 }}>Room {session.room_number}</Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>
                            <Clock size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                            Since {session.check_in}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Chip label={`${session.requests_count} req`} size="small" variant="outlined" sx={{ fontSize: "0.625rem" }} />
                        <ArrowRight size={14} color="#A3A3A3" />
                      </Box>
                    </Box>
                    {i < SESSIONS.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Request Queue */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h5">
                  <ConciergeBell size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  Service Requests
                </Typography>
              </Box>
              <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0 } }}>
                <Tab label={`All (${REQUESTS.length})`} />
                <Tab label={`Active (${REQUESTS.filter(r => ["pending", "confirmed", "in_progress"].includes(r.status)).length})`} />
                <Tab label={`Completed (${REQUESTS.filter(r => r.status === "completed").length})`} />
              </Tabs>

              {/* Request List */}
              <Box>
                {filteredRequests.map((req, i) => (
                  <Box key={req.id}>
                    <Box
                      sx={{
                        display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                        cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1, px: 1, mx: -1,
                      }}
                      onClick={() => toast.info(`View request ${req.request_number}`)}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                        <Box sx={{ width: 3, height: 32, borderRadius: 1, bgcolor: PRIORITY_COLORS[req.priority] || "#737373" }} />
                        <Box sx={{ minWidth: 0, flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.25 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{req.service_name}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", color: "text.secondary" }}>
                              {req.request_number}
                            </Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>Room {req.room_number}</Typography>
                            <Typography variant="body2" sx={{ color: "text.disabled" }}>{req.created_at}</Typography>
                          </Box>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <StatusChip status={req.status} />
                        {req.status === "pending" && (
                          <Box sx={{ display: "flex", gap: 0.25 }}>
                            <Tooltip title="Confirm"><IconButton size="small" sx={{ color: "success.main" }} onClick={(e) => { e.stopPropagation(); toast.success("Confirmed"); }}><CheckCircle size={16} /></IconButton></Tooltip>
                            <Tooltip title="Reject"><IconButton size="small" sx={{ color: "error.main" }} onClick={(e) => { e.stopPropagation(); toast.error("Rejected"); }}><XCircle size={16} /></IconButton></Tooltip>
                          </Box>
                        )}
                      </Box>
                    </Box>
                    {i < filteredRequests.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
