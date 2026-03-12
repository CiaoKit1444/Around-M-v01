/**
 * OperationalEfficiencyReport — Feature #40
 * Average time from request to confirmation/completion, SLA compliance.
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  LinearProgress, ToggleButtonGroup, ToggleButton, Skeleton, Alert,
  Avatar,
} from "@mui/material";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Clock, CheckCircle, AlertTriangle, Timer, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

interface SLAMetric {
  property_name: string;
  avg_response_min: number;
  avg_completion_min: number;
  sla_compliance_pct: number;
  requests_total: number;
  requests_overdue: number;
}

interface DailyEfficiency {
  date: string;
  avg_response: number;
  avg_completion: number;
  sla_compliance: number;
}

interface EfficiencyData {
  metrics: SLAMetric[];
  daily: DailyEfficiency[];
  overall_response_min: number;
  overall_completion_min: number;
  overall_sla_pct: number;
  period: string;
}

function SLABadge({ pct }: { pct: number }) {
  const color = pct >= 95 ? "success" : pct >= 80 ? "warning" : "error";
  return <Chip label={`${pct.toFixed(1)}%`} color={color} size="small" />;
}

function TimeDisplay({ minutes }: { minutes: number }) {
  if (minutes < 60) return <Typography variant="body2">{minutes.toFixed(0)}m</Typography>;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return <Typography variant="body2">{h}h {m}m</Typography>;
}

export default function OperationalEfficiencyReport() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data, isLoading, error } = useQuery<EfficiencyData>({
    queryKey: ["operational-efficiency", period],
    queryFn: async () => {
      try {
        return await apiClient.get(`/v1/reports/operational-efficiency?period=${period}`).json<EfficiencyData>();
      } catch {
        // Demo fallback
        const metrics: SLAMetric[] = [
          { property_name: "Grand Hyatt Bangkok", avg_response_min: 8.2, avg_completion_min: 42.5, sla_compliance_pct: 96.4, requests_total: 412, requests_overdue: 15 },
          { property_name: "Marriott Sukhumvit", avg_response_min: 12.1, avg_completion_min: 58.3, sla_compliance_pct: 88.7, requests_total: 287, requests_overdue: 32 },
          { property_name: "Novotel Silom", avg_response_min: 6.8, avg_completion_min: 35.2, sla_compliance_pct: 97.8, requests_total: 198, requests_overdue: 4 },
          { property_name: "Ibis Styles Khaosan", avg_response_min: 18.5, avg_completion_min: 72.1, sla_compliance_pct: 79.2, requests_total: 143, requests_overdue: 30 },
          { property_name: "Centara Grand", avg_response_min: 9.4, avg_completion_min: 48.7, sla_compliance_pct: 93.1, requests_total: 321, requests_overdue: 22 },
        ];
        const daily: DailyEfficiency[] = Array.from({ length: 14 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (13 - i));
          return {
            date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            avg_response: 8 + Math.random() * 8,
            avg_completion: 35 + Math.random() * 30,
            sla_compliance: 85 + Math.random() * 12,
          };
        });
        return { metrics, daily, overall_response_min: 11.0, overall_completion_min: 51.4, overall_sla_pct: 91.0, period };
      }
    },
  });

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Operational Efficiency</Typography>
          <Typography variant="body2" color="text.secondary">Response times, completion rates, and SLA compliance</Typography>
        </Box>
        <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
          <ToggleButton value="7d">7 days</ToggleButton>
          <ToggleButton value="30d">30 days</ToggleButton>
          <ToggleButton value="90d">90 days</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>Using demo data — backend endpoint not available.</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Avg Response Time", value: data ? `${data.overall_response_min.toFixed(1)}m` : "—", icon: Zap, color: "#6366f1", sub: "time to first action" },
          { label: "Avg Completion Time", value: data ? `${data.overall_completion_min.toFixed(1)}m` : "—", icon: Timer, color: "#8b5cf6", sub: "request to done" },
          { label: "SLA Compliance", value: data ? `${data.overall_sla_pct.toFixed(1)}%` : "—", icon: CheckCircle, color: "#10b981", sub: "within SLA target" },
          { label: "Overdue Requests", value: data ? data.metrics.reduce((s, m) => s + m.requests_overdue, 0).toString() : "—", icon: AlertTriangle, color: "#f59e0b", sub: "exceeded SLA" },
        ].map(kpi => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
            <Card>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, "&:last-child": { pb: 2 } }}>
                <Avatar sx={{ bgcolor: kpi.color + "20", color: kpi.color, width: 40, height: 40 }}>
                  <kpi.icon size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                  <Typography variant="h6" fontWeight={600}>{isLoading ? <Skeleton width={60} /> : kpi.value}</Typography>
                  <Typography variant="caption" color="text.disabled">{kpi.sub}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Trend Charts */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Response & Completion Time Trend</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data?.daily ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="m" />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}m`} />
                    <Legend iconSize={10} />
                    <Line type="monotone" dataKey="avg_response" name="Response" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="avg_completion" name="Completion" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>SLA Compliance Trend</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data?.daily ?? []} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} unit="%" />
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                    <Area type="monotone" dataKey="sla_compliance" name="SLA %" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Per-Property Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={600} gutterBottom>SLA Performance by Property</Typography>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Property</TableCell>
                  <TableCell align="right">Avg Response</TableCell>
                  <TableCell align="right">Avg Completion</TableCell>
                  <TableCell align="right">Total Requests</TableCell>
                  <TableCell align="right">Overdue</TableCell>
                  <TableCell align="center">SLA Compliance</TableCell>
                  <TableCell>SLA Bar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                  : data?.metrics.map(m => (
                    <TableRow key={m.property_name} hover>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Clock size={14} />
                          <Typography variant="body2" fontWeight={500}>{m.property_name}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right"><TimeDisplay minutes={m.avg_response_min} /></TableCell>
                      <TableCell align="right"><TimeDisplay minutes={m.avg_completion_min} /></TableCell>
                      <TableCell align="right"><Typography variant="body2">{m.requests_total}</Typography></TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color={m.requests_overdue > 20 ? "error.main" : "text.primary"}>
                          {m.requests_overdue}
                        </Typography>
                      </TableCell>
                      <TableCell align="center"><SLABadge pct={m.sla_compliance_pct} /></TableCell>
                      <TableCell sx={{ width: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={m.sla_compliance_pct}
                          color={m.sla_compliance_pct >= 95 ? "success" : m.sla_compliance_pct >= 80 ? "warning" : "error"}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
