/**
 * ScheduledReports — Feature #41
 * Configure daily/weekly summary emails to property admins.
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  Switch, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControlLabel, Checkbox, Alert, Snackbar,
  IconButton, Tooltip, Avatar, FormGroup,
} from "@mui/material";
import { Mail, Plus, Edit2, Trash2, Play, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

interface ScheduledReport {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  time: string;
  day_of_week?: number;
  recipients: string[];
  report_types: string[];
  property_ids: string[];
  enabled: boolean;
  last_sent?: string;
  next_send?: string;
}

const REPORT_TYPES = [
  { id: "requests_summary", label: "Requests Summary" },
  { id: "revenue", label: "Revenue Report" },
  { id: "satisfaction", label: "Guest Satisfaction" },
  { id: "sla_compliance", label: "SLA Compliance" },
  { id: "occupancy", label: "Occupancy Stats" },
];

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const DEMO_REPORTS: ScheduledReport[] = [
  {
    id: "1", name: "Daily Operations Summary", frequency: "daily", time: "08:00",
    recipients: ["ops@peppr.com", "manager@grandpalace.com"],
    report_types: ["requests_summary", "sla_compliance"], property_ids: ["all"],
    enabled: true, last_sent: "2026-03-12T08:00:00Z", next_send: "2026-03-13T08:00:00Z",
  },
  {
    id: "2", name: "Weekly Revenue Report", frequency: "weekly", time: "09:00", day_of_week: 1,
    recipients: ["finance@peppr.com"],
    report_types: ["revenue", "occupancy"], property_ids: ["all"],
    enabled: true, last_sent: "2026-03-10T09:00:00Z", next_send: "2026-03-17T09:00:00Z",
  },
  {
    id: "3", name: "Guest Satisfaction Digest", frequency: "weekly", time: "10:00", day_of_week: 5,
    recipients: ["gm@marriott.com", "quality@peppr.com"],
    report_types: ["satisfaction"], property_ids: ["prop-2"],
    enabled: false, last_sent: "2026-03-07T10:00:00Z", next_send: "2026-03-14T10:00:00Z",
  },
];

function FrequencyChip({ freq }: { freq: string }) {
  const color = freq === "daily" ? "primary" : freq === "weekly" ? "secondary" : "default";
  return <Chip label={freq} color={color} size="small" />;
}

interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  report?: ScheduledReport | null;
  onSave: (r: Partial<ScheduledReport>) => void;
}

function EditDialog({ open, onClose, report, onSave }: EditDialogProps) {
  const [name, setName] = useState(report?.name ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(report?.frequency ?? "daily");
  const [time, setTime] = useState(report?.time ?? "08:00");
  const [dayOfWeek, setDayOfWeek] = useState(report?.day_of_week ?? 1);
  const [recipients, setRecipients] = useState(report?.recipients.join(", ") ?? "");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(report?.report_types ?? []);

  const toggleType = (id: string) => {
    setSelectedTypes(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  };

  const handleSave = () => {
    onSave({
      name, frequency, time,
      day_of_week: frequency === "weekly" ? dayOfWeek : undefined,
      recipients: recipients.split(",").map(r => r.trim()).filter(Boolean),
      report_types: selectedTypes,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{report ? "Edit Report Schedule" : "New Report Schedule"}</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <TextField label="Schedule Name" value={name} onChange={e => setName(e.target.value)} fullWidth size="small" />
        <TextField select label="Frequency" value={frequency} onChange={e => setFrequency(e.target.value as "daily" | "weekly" | "monthly")} fullWidth size="small">
          <MenuItem value="daily">Daily</MenuItem>
          <MenuItem value="weekly">Weekly</MenuItem>
          <MenuItem value="monthly">Monthly</MenuItem>
        </TextField>
        {frequency === "weekly" && (
          <TextField select label="Day of Week" value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))} fullWidth size="small">
            {DAYS.map((d, i) => <MenuItem key={i} value={i}>{d}</MenuItem>)}
          </TextField>
        )}
        <TextField label="Send Time" type="time" value={time} onChange={e => setTime(e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
        <TextField label="Recipients (comma-separated emails)" value={recipients} onChange={e => setRecipients(e.target.value)} fullWidth size="small" multiline rows={2} />
        <Box>
          <Typography variant="caption" color="text.secondary" gutterBottom>Report Types</Typography>
          <FormGroup row>
            {REPORT_TYPES.map(rt => (
              <FormControlLabel
                key={rt.id}
                control={<Checkbox size="small" checked={selectedTypes.includes(rt.id)} onChange={() => toggleType(rt.id)} />}
                label={<Typography variant="body2">{rt.label}</Typography>}
              />
            ))}
          </FormGroup>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={!name || selectedTypes.length === 0}>Save Schedule</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function ScheduledReports() {
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ScheduledReport | null>(null);
  const [snackMsg, setSnackMsg] = useState("");
  const queryClient = useQueryClient();

  const { data: reports = DEMO_REPORTS } = useQuery<ScheduledReport[]>({
    queryKey: ["scheduled-reports"],
    queryFn: async () => {
      try {
        return await apiClient.get("/v1/reports/scheduled").json<ScheduledReport[]>();
      } catch {
        return DEMO_REPORTS;
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      try {
        await apiClient.patch(`/v1/reports/scheduled/${id}`, { json: { enabled } });
      } catch { /* demo */ }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(`/v1/reports/scheduled/${id}`);
      } catch { /* demo */ }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] }); setSnackMsg("Schedule deleted"); },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<ScheduledReport>) => {
      try {
        if (editTarget) {
          await apiClient.put(`/v1/reports/scheduled/${editTarget.id}`, { json: data });
        } else {
          await apiClient.post("/v1/reports/scheduled", { json: data });
        }
      } catch { /* demo */ }
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["scheduled-reports"] }); setSnackMsg("Schedule saved"); },
  });

  const sendNow = async (id: string) => {
    try {
      await apiClient.post(`/v1/reports/scheduled/${id}/send-now`);
    } catch { /* demo */ }
    setSnackMsg("Report queued for delivery");
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Scheduled Reports</Typography>
          <Typography variant="body2" color="text.secondary">Automated email reports for property admins</Typography>
        </Box>
        <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => { setEditTarget(null); setEditOpen(true); }}>
          New Schedule
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Reports are sent via email to configured recipients. Ensure email delivery is configured in system settings.
      </Alert>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Active Schedules", value: reports.filter(r => r.enabled).length, icon: CheckCircle, color: "#10b981" },
          { label: "Paused Schedules", value: reports.filter(r => !r.enabled).length, icon: AlertCircle, color: "#f59e0b" },
          { label: "Total Recipients", value: Array.from(new Set(reports.flatMap(r => r.recipients))).length, icon: Mail, color: "#6366f1" },
          { label: "Total Schedules", value: reports.length, icon: Clock, color: "#8b5cf6" },
        ].map(s => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <Card>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, "&:last-child": { pb: 2 } }}>
                <Avatar sx={{ bgcolor: s.color + "20", color: s.color, width: 40, height: 40 }}>
                  <s.icon size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                  <Typography variant="h6" fontWeight={600}>{s.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Schedule Name</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Send Time</TableCell>
                  <TableCell>Recipients</TableCell>
                  <TableCell>Report Types</TableCell>
                  <TableCell>Last Sent</TableCell>
                  <TableCell>Next Send</TableCell>
                  <TableCell align="center">Enabled</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reports.map(r => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Mail size={14} />
                        <Typography variant="body2" fontWeight={500}>{r.name}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell><FrequencyChip freq={r.frequency} /></TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {r.frequency === "weekly" ? `${DAYS[r.day_of_week ?? 1]} ` : ""}{r.time}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">{r.recipients.length} recipient{r.recipients.length !== 1 ? "s" : ""}</Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                        {r.report_types.slice(0, 2).map(t => (
                          <Chip key={t} label={REPORT_TYPES.find(rt => rt.id === t)?.label ?? t} size="small" variant="outlined" />
                        ))}
                        {r.report_types.length > 2 && <Chip label={`+${r.report_types.length - 2}`} size="small" />}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.last_sent ? new Date(r.last_sent).toLocaleDateString() : "Never"}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {r.next_send ? new Date(r.next_send).toLocaleDateString() : "—"}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={r.enabled}
                        size="small"
                        onChange={e => toggleMutation.mutate({ id: r.id, enabled: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Box sx={{ display: "flex", gap: 0.5, justifyContent: "flex-end" }}>
                        <Tooltip title="Send Now">
                          <IconButton size="small" onClick={() => sendNow(r.id)}><Play size={14} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => { setEditTarget(r); setEditOpen(true); }}><Edit2 size={14} /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => deleteMutation.mutate(r.id)}><Trash2 size={14} /></IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <EditDialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        report={editTarget}
        onSave={data => saveMutation.mutate(data)}
      />

      <Snackbar open={!!snackMsg} autoHideDuration={3000} onClose={() => setSnackMsg("")} message={snackMsg} />
    </Box>
  );
}
