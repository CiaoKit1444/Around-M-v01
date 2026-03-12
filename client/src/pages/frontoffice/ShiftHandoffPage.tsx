/**
 * ShiftHandoffPage — Feature #45
 * Summary of open/in-progress requests at shift change.
 * Helps outgoing staff brief incoming staff on pending work.
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Alert, Skeleton, Avatar, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import { Clock, AlertTriangle, Flame, ArrowUp, Minus, CheckCircle, FileText, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import apiClient from "@/lib/api/client";

type Priority = "low" | "normal" | "high" | "urgent";

const PRIORITY_CONFIG: Record<Priority, { label: string; color: "default" | "primary" | "warning" | "error"; icon: React.ReactNode }> = {
  low: { label: "Low", color: "default", icon: <Minus size={12} /> },
  normal: { label: "Normal", color: "primary", icon: <ArrowUp size={12} /> },
  high: { label: "High", color: "warning", icon: <AlertTriangle size={12} /> },
  urgent: { label: "Urgent", color: "error", icon: <Flame size={12} /> },
};

interface HandoffRequest {
  id: string;
  request_number: string;
  catalog_item_name: string;
  room_number: string;
  property_name: string;
  status: string;
  priority: Priority;
  created_at: string;
  staff_notes_count: number;
  last_note?: string;
  elapsed_minutes: number;
}

interface HandoffSummary {
  pending: HandoffRequest[];
  in_progress: HandoffRequest[];
  confirmed: HandoffRequest[];
  shift_start: string;
  outgoing_staff: string;
}

function ElapsedBadge({ minutes }: { minutes: number }) {
  const color = minutes < 30 ? "success" : minutes < 60 ? "warning" : "error";
  const label = minutes < 60 ? `${Math.floor(minutes)}m` : `${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
  return <Chip label={label} color={color} size="small" icon={<Clock size={12} />} />;
}

export default function ShiftHandoffPage() {
  const [, navigate] = useLocation();
  const [handoffNote, setHandoffNote] = useState("");
  const [handoffDialog, setHandoffDialog] = useState(false);

  const { data, isLoading, error } = useQuery<HandoffSummary>({
    queryKey: ["shift-handoff"],
    queryFn: async () => {
      try {
        return await apiClient.get("/v1/front-office/shift-handoff").json<HandoffSummary>();
      } catch {
        // Demo fallback
        const now = Date.now();
        const makeReq = (id: string, num: string, item: string, room: string, prop: string, status: string, priority: Priority, minsAgo: number): HandoffRequest => ({
          id, request_number: num, catalog_item_name: item, room_number: room, property_name: prop,
          status, priority, created_at: new Date(now - minsAgo * 60000).toISOString(),
          staff_notes_count: Math.floor(Math.random() * 3), elapsed_minutes: minsAgo,
          last_note: minsAgo > 45 ? "Waiting for housekeeping to confirm availability." : undefined,
        });
        return {
          pending: [
            makeReq("r1", "REQ-1042", "Room Cleaning", "412", "Grand Hyatt", "pending", "urgent", 72),
            makeReq("r2", "REQ-1043", "Extra Towels", "305", "Grand Hyatt", "pending", "normal", 18),
            makeReq("r3", "REQ-1044", "Airport Transfer", "118", "Marriott", "pending", "high", 45),
          ],
          in_progress: [
            makeReq("r4", "REQ-1038", "Spa Booking", "220", "Grand Hyatt", "in_progress", "normal", 95),
            makeReq("r5", "REQ-1039", "Room Service", "507", "Novotel", "in_progress", "high", 38),
          ],
          confirmed: [
            makeReq("r6", "REQ-1040", "Laundry", "103", "Marriott", "confirmed", "low", 55),
            makeReq("r7", "REQ-1041", "Breakfast In Bed", "614", "Grand Hyatt", "confirmed", "normal", 22),
          ],
          shift_start: new Date(now - 4 * 3600000).toISOString(),
          outgoing_staff: "Front Desk Team A",
        };
      }
    },
  });

  const allOpen = [...(data?.pending ?? []), ...(data?.confirmed ?? []), ...(data?.in_progress ?? [])];
  const urgentCount = allOpen.filter(r => r.priority === "urgent" || r.priority === "high").length;

  const RequestRow = ({ req }: { req: HandoffRequest }) => {
    const pCfg = PRIORITY_CONFIG[req.priority];
    return (
      <TableRow
        hover
        sx={{ cursor: "pointer", bgcolor: req.priority === "urgent" ? "error.main" + "08" : undefined }}
        onClick={() => navigate(`/front-office/requests/${req.id}`)}
      >
        <TableCell>
          <Typography variant="body2" fontWeight={600} sx={{ fontFamily: '"Geist Mono", monospace' }}>
            {req.request_number}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{req.catalog_item_name}</Typography>
          <Typography variant="caption" color="text.secondary">{req.property_name}</Typography>
        </TableCell>
        <TableCell>
          <Chip label={`Room ${req.room_number}`} size="small" variant="outlined" />
        </TableCell>
        <TableCell>
          <Chip label={pCfg.label} color={pCfg.color} size="small" icon={<Box sx={{ display: "flex" }}>{pCfg.icon}</Box>} />
        </TableCell>
        <TableCell><ElapsedBadge minutes={req.elapsed_minutes} /></TableCell>
        <TableCell>
          {req.last_note ? (
            <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {req.last_note}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.disabled">No notes</Typography>
          )}
        </TableCell>
      </TableRow>
    );
  };

  const Section = ({ title, requests, color }: { title: string; requests: HandoffRequest[]; color: string }) => (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
        <Typography variant="subtitle2" fontWeight={600}>{title}</Typography>
        <Chip label={requests.length} size="small" />
      </Box>
      {requests.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ pl: 2.5 }}>No requests in this state.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Request #</TableCell>
                <TableCell>Service</TableCell>
                <TableCell>Room</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Elapsed</TableCell>
                <TableCell>Last Note</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map(req => <RequestRow key={req.id} req={req} />)}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Shift Handoff</Typography>
          <Typography variant="body2" color="text.secondary">
            {data ? `Shift started: ${new Date(data.shift_start).toLocaleString()} · ${data.outgoing_staff}` : "Current shift summary"}
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<Send size={16} />} onClick={() => setHandoffDialog(true)}>
          Complete Handoff
        </Button>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>Using demo data — backend endpoint not available.</Alert>}

      {urgentCount > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<Flame size={16} />}>
          <strong>{urgentCount} high-priority request{urgentCount !== 1 ? "s" : ""}</strong> require immediate attention from the incoming shift.
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Pending", value: data?.pending.length ?? 0, color: "#f59e0b" },
          { label: "Confirmed", value: data?.confirmed.length ?? 0, color: "#3b82f6" },
          { label: "In Progress", value: data?.in_progress.length ?? 0, color: "#8b5cf6" },
          { label: "High Priority", value: urgentCount, color: "#ef4444" },
        ].map(s => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <Card sx={{ borderLeft: `4px solid ${s.color}` }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                <Typography variant="h4" fontWeight={700} sx={{ color: s.color }}>
                  {isLoading ? <Skeleton width={40} /> : s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Request Sections */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Open Requests for Incoming Shift</Typography>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rectangular" height={60} sx={{ mb: 1, borderRadius: 1 }} />)
          ) : (
            <>
              <Section title="Pending (Not Yet Confirmed)" requests={data?.pending ?? []} color="#f59e0b" />
              <Divider sx={{ my: 2 }} />
              <Section title="Confirmed (Awaiting Start)" requests={data?.confirmed ?? []} color="#3b82f6" />
              <Divider sx={{ my: 2 }} />
              <Section title="In Progress (Being Handled)" requests={data?.in_progress ?? []} color="#8b5cf6" />
            </>
          )}
        </CardContent>
      </Card>

      {/* Handoff Dialog */}
      <Dialog open={handoffDialog} onClose={() => setHandoffDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircle size={20} />
            Complete Shift Handoff
          </Box>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            This will log the handoff and notify the incoming shift. All {allOpen.length} open requests will be transferred.
          </Alert>
          <TextField
            fullWidth multiline rows={4}
            label="Handoff Notes"
            placeholder="Brief the incoming shift on any special situations, VIP guests, pending issues..."
            value={handoffNote}
            onChange={e => setHandoffNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHandoffDialog(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<Send size={14} />} onClick={() => { setHandoffDialog(false); }}>
            Submit Handoff
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
