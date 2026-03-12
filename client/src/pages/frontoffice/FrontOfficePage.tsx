/**
 * FrontOfficePage — Live operations dashboard for guest sessions and service requests.
 *
 * Design: Precision Studio — split view with active sessions (left) and request queue (right).
 * Data: TanStack Query → FastAPI backend, with demo data fallback. Auto-refresh enabled.
 */
import { useState } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Avatar, Divider, Button, Tabs, Tab,
  IconButton, Tooltip, Alert,
} from "@mui/material";
import { ConciergeBell, Clock, CheckCircle, XCircle, ArrowRight, RefreshCw, Users, Activity } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import StatCard from "@/components/shared/StatCard";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoSessions, getDemoRequests } from "@/lib/api/demo-data";
import type { GuestSession, ServiceRequest } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";
import { frontOfficeApi } from "@/lib/api/endpoints";

const STATUS_PRIORITY_COLORS: Record<string, string> = { pending: "#F59E0B", confirmed: "#2563EB", in_progress: "#8B5CF6", completed: "#10B981", rejected: "#DC2626", cancelled: "#A3A3A3" };

export default function FrontOfficePage() {
  const [, navigate] = useLocation();
  const [tab, setTab] = useState(0);
  const propertyId = "pr-001";

  const sessionsQuery = useQuery({
    queryKey: ["front-office", "sessions", propertyId],
    queryFn: () => frontOfficeApi.sessions(propertyId),
    staleTime: 10_000,
  });
  const requestsQuery = useQuery({
    queryKey: ["front-office", "requests", propertyId],
    queryFn: () => frontOfficeApi.requests(propertyId),
    staleTime: 10_000,
  });

  const { data: sessionsData, isDemo: sessionsDemo } = useDemoFallback(sessionsQuery, getDemoSessions());
  const { data: requestsData, isDemo: requestsDemo } = useDemoFallback(requestsQuery, getDemoRequests());

  const sessions = sessionsData?.items ?? [];
  const requests = requestsData?.items ?? [];
  const isDemo = sessionsDemo || requestsDemo;

  const activeSessions = sessions.filter((s) => s.status === "active").length;
  const pendingRequests = requests.filter((r) => r.status === "pending").length;
  const inProgressRequests = requests.filter((r) => r.status === "in_progress").length;
  const completedToday = requests.filter((r) => r.status === "completed").length;

  const filteredRequests = tab === 0
    ? requests
    : tab === 1
    ? requests.filter((r) => ["pending", "confirmed", "in_progress"].includes(r.status))
    : requests.filter((r) => r.status === "completed");

  return (
    <Box>
      <PageHeader
        title="Front Office"
        subtitle="Monitor guest sessions and manage service requests in real-time"
        actions={<Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />}>Refresh</Button>}
      />

      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>}

      {/* Stats Row */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "1fr 1fr 1fr 1fr" }, gap: 2, mb: 3 }}>
        <StatCard title="Active Sessions" value={activeSessions} icon={Activity} iconColor="#2563EB" />
        <StatCard title="Pending Requests" value={pendingRequests} icon={Clock} iconColor="#F59E0B" />
        <StatCard title="In Progress" value={inProgressRequests} icon={RefreshCw} iconColor="#8B5CF6" />
        <StatCard title="Completed Today" value={completedToday} icon={CheckCircle} iconColor="#10B981" />
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" }, gap: 2 }}>
        {/* Left: Active Sessions */}
        <Card sx={{ height: "fit-content" }}>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <Typography variant="h5">
                <Users size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Active Sessions
              </Typography>
              <Chip label={sessions.length} size="small" color="primary" />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column" }}>
              {sessions.map((session, i) => (
                <Box key={session.id}>
                  <Box
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1, px: 1, mx: -1,
                    }}
                    onClick={() => navigate(`/front-office/sessions/${session.id}`)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar sx={{ width: 32, height: 32, fontSize: "0.6875rem", fontWeight: 700, bgcolor: "primary.main", color: "primary.contrastText" }}>
                        {session.room_number}
                      </Avatar>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>Room {session.room_number}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          <Clock size={10} style={{ marginRight: 3, verticalAlign: "middle" }} />
                          {session.request_count} requests
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <StatusChip status={session.status} />
                      <ArrowRight size={14} color="#A3A3A3" />
                    </Box>
                  </Box>
                  {i < sessions.length - 1 && <Divider />}
                </Box>
              ))}
              {sessions.length === 0 && (
                <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4, fontSize: "0.8125rem" }}>
                  No active sessions
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Right: Request Queue */}
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="h5">
                <ConciergeBell size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />
                Service Requests
              </Typography>
            </Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, minHeight: 36, "& .MuiTab-root": { minHeight: 36, py: 0, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
              <Tab label={`All (${requests.length})`} />
              <Tab label={`Active (${requests.filter((r) => ["pending", "confirmed", "in_progress"].includes(r.status)).length})`} />
              <Tab label={`Completed (${requests.filter((r) => r.status === "completed").length})`} />
            </Tabs>

            <Box>
              {filteredRequests.map((req, i) => (
                <Box key={req.id}>
                  <Box
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5,
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, borderRadius: 1, px: 1, mx: -1,
                    }}
                    onClick={() => navigate(`/front-office/requests/${req.id}`)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
                      <Box sx={{ width: 3, height: 32, borderRadius: 1, bgcolor: STATUS_PRIORITY_COLORS[req.status] || "#737373" }} />
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{req.catalog_item_name}</Typography>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", color: "text.secondary" }}>
                            {req.request_number}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary" }}>Room {req.room_number}</Typography>
                          <Typography variant="body2" sx={{ color: "text.disabled" }}>{new Date(req.created_at).toLocaleTimeString()}</Typography>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <StatusChip status={req.status} />
                      {req.status === "pending" && (
                        <Box sx={{ display: "flex", gap: 0.25 }}>
                          <Tooltip title="Confirm"><IconButton size="small" sx={{ color: "success.main" }} onClick={(e) => e.stopPropagation()}><CheckCircle size={16} /></IconButton></Tooltip>
                          <Tooltip title="Reject"><IconButton size="small" sx={{ color: "error.main" }} onClick={(e) => e.stopPropagation()}><XCircle size={16} /></IconButton></Tooltip>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  {i < filteredRequests.length - 1 && <Divider />}
                </Box>
              ))}
              {filteredRequests.length === 0 && (
                <Typography sx={{ color: "text.secondary", textAlign: "center", py: 4, fontSize: "0.8125rem" }}>
                  No requests in this category
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
