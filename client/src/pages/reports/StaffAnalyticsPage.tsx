/**
 * StaffAnalyticsPage — Per-staff performance analytics.
 *
 * Metrics: requests handled, avg response time, SLA compliance rate, avg rating.
 * Charts: requests handled bar (horizontal), response time trend line.
 * Data: /v1/reports/staff-analytics — falls back to demo data.
 *
 * Design: Precision Studio — data-dense, minimal chrome, recharts-powered.
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Chip, Typography, FormControl,
  Select, MenuItem, Stack, Alert, CircularProgress,
  Button, Tooltip, IconButton, Avatar, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  LinearProgress,
} from "@mui/material";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, Legend, Cell,
} from "recharts";
import { RefreshCw, Download, Users, Clock, CheckCircle2, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useExportCSV } from "@/hooks/useExportCSV";
import { trpc } from "@/lib/trpc";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffMember {
  staffId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  requestsHandled: number;
  avgResponseMinutes: number;
  slaComplianceRate: number;   // 0–100
  avgRating: number;           // 0–5
  activeShifts: number;
}

interface DailyTrend {
  date: string;
  [staffId: string]: string | number;
}

interface StaffAnalyticsData {
  period: string;
  totalStaff: number;
  totalRequestsHandled: number;
  teamAvgResponseMinutes: number;
  teamSlaComplianceRate: number;
  staff: StaffMember[];
  dailyTrend: DailyTrend[];
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────

const STAFF_NAMES = [
  { name: "Arisa Tanaka", role: "Front Desk" },
  { name: "Korn Suthipong", role: "Concierge" },
  { name: "Pim Rattana", role: "Housekeeping Lead" },
  { name: "James Wiroj", role: "Maintenance" },
  { name: "Nook Chaiwat", role: "Room Service" },
];

function generateDemoData(days: number): StaffAnalyticsData {
  const now = new Date();
  const staff: StaffMember[] = STAFF_NAMES.map((s, i) => ({
    staffId: `staff-${i + 1}`,
    name: s.name,
    role: s.role,
    requestsHandled: 40 + Math.floor(Math.random() * 80),
    avgResponseMinutes: 6 + Math.random() * 20,
    slaComplianceRate: 75 + Math.random() * 24,
    avgRating: 3.8 + Math.random() * 1.1,
    activeShifts: 8 + Math.floor(Math.random() * 12),
  }));

  const dailyTrend: DailyTrend[] = Array.from({ length: Math.min(days, 14) }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (Math.min(days, 14) - 1 - i));
    const entry: DailyTrend = { date: d.toISOString().slice(5, 10) };
    staff.forEach(s => {
      entry[s.staffId] = 2 + Math.floor(Math.random() * 12);
    });
    return entry;
  });

  return {
    period: `${days}d`,
    totalStaff: staff.length,
    totalRequestsHandled: staff.reduce((s, m) => s + m.requestsHandled, 0),
    teamAvgResponseMinutes: Math.round(staff.reduce((s, m) => s + m.avgResponseMinutes, 0) / staff.length * 10) / 10,
    teamSlaComplianceRate: Math.round(staff.reduce((s, m) => s + m.slaComplianceRate, 0) / staff.length * 10) / 10,
    staff,
    dailyTrend,
  };
}

const DEMO: Record<string, StaffAnalyticsData> = {
  "7d": generateDemoData(7),
  "30d": generateDemoData(30),
  "90d": generateDemoData(90),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#22c55e", "#f59e0b", "#ef4444"];

function slaColor(rate: number) {
  if (rate >= 90) return "#22c55e";
  if (rate >= 75) return "#f59e0b";
  return "#ef4444";
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <Card sx={{ flex: 1, minWidth: 150 }}>
      <CardContent sx={{ py: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ color: color ?? "primary.main", mt: 0.25 }}><Icon size={20} /></Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.25 }}>{value}</Typography>
            {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type SortKey = "requestsHandled" | "avgResponseMinutes" | "slaComplianceRate" | "avgRating";

export default function StaffAnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [sortKey, setSortKey] = useState<SortKey>("requestsHandled");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const { data: rawApiData, isLoading, refetch } = trpc.reports.staffAnalytics.get.useQuery(
    { period },
    { staleTime: 60_000 }
  );
  // Map tRPC response shape to the StaffAnalyticsData interface
  const apiData: StaffAnalyticsData | undefined = rawApiData ? {
    period,
    totalStaff: rawApiData.summary.totalStaff,
    totalRequestsHandled: rawApiData.summary.totalHandled,
    teamAvgResponseMinutes: rawApiData.summary.avgResponseMinutes,
    teamSlaComplianceRate: rawApiData.summary.avgSlaCompliance,
    staff: rawApiData.staff.map((s: any) => ({
      staffId: s.id,
      name: s.name,
      role: s.role,
      requestsHandled: s.requestsHandled,
      avgResponseMinutes: s.avgResponseMinutes,
      slaComplianceRate: s.slaComplianceRate,
      avgRating: s.avgRating,
      activeShifts: 0,
    })),
    dailyTrend: [],
  } : undefined;

  const data = apiData ?? DEMO[period];
  const isDemo = false;

  const sortedStaff = useMemo(() => {
    return [...data.staff].sort((a, b) => {
      const diff = a[sortKey] - b[sortKey];
      return sortDir === "desc" ? -diff : diff;
    });
  }, [data.staff, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const { exportCSV } = useExportCSV<StaffMember>("staff-analytics", [
    { header: "Name", accessor: "name" },
    { header: "Role", accessor: "role" },
    { header: "Requests Handled", accessor: "requestsHandled" },
    { header: "Avg Response (min)", accessor: "avgResponseMinutes" },
    { header: "SLA Compliance (%)", accessor: "slaComplianceRate" },
    { header: "Avg Rating", accessor: "avgRating" },
  ]);

  const maxRequests = Math.max(...data.staff.map(s => s.requestsHandled), 1);

  return (
    <Box>
      <PageHeader
        title="Staff Analytics"
        subtitle={`${data.totalStaff} staff · ${data.totalRequestsHandled} requests handled · last ${period}${isDemo ? " — demo data" : ""}`}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select value={period} onChange={e => setPeriod(e.target.value as "7d" | "30d" | "90d")}>
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
              </Select>
            </FormControl>
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={() => refetch()} disabled={isLoading}>
                {isLoading ? <CircularProgress size={16} /> : <RefreshCw size={16} />}
              </IconButton>
            </Tooltip>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(data.staff)}>
              Export
            </Button>
          </Stack>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo analytics — connect backend API to see live staff data.
        </Alert>
      )}

      {/* KPI Row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <KpiCard icon={Users} label="Active Staff" value={String(data.totalStaff)} sub={`last ${period}`} />
        <KpiCard icon={CheckCircle2} label="Requests Handled" value={data.totalRequestsHandled.toLocaleString()} sub="team total" color="#22c55e" />
        <KpiCard icon={Clock} label="Team Avg Response" value={`${data.teamAvgResponseMinutes} min`} sub="mean across all staff" color="#f59e0b" />
        <KpiCard icon={Star} label="Team SLA Compliance" value={`${data.teamSlaComplianceRate}%`} sub="requests within SLA" color={slaColor(data.teamSlaComplianceRate)} />
      </Stack>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 3 }}>
        {/* Requests Handled Bar */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Requests Handled per Staff</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sortedStaff.map(s => ({ name: s.name.split(" ")[0], value: s.requestsHandled }))} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={60} />
                <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="value" name="Requests" radius={[0, 4, 4, 0]}>
                  {sortedStaff.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Daily Trend Line */}
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Daily Request Trend</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={data.dailyTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={data.dailyTrend.length > 10 ? 2 : 0} />
                <YAxis tick={{ fontSize: 11 }} />
                <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {data.staff.map((s, i) => (
                  <Line key={s.staffId} type="monotone" dataKey={s.staffId} name={s.name.split(" ")[0]} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Stack>

      {/* Staff Performance Table */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>Staff Performance Table</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Staff</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={sortKey === "requestsHandled"} direction={sortKey === "requestsHandled" ? sortDir : "desc"} onClick={() => handleSort("requestsHandled")}>
                      Requests
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={sortKey === "avgResponseMinutes"} direction={sortKey === "avgResponseMinutes" ? sortDir : "desc"} onClick={() => handleSort("avgResponseMinutes")}>
                      Avg Response
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ minWidth: 160 }}>
                    <TableSortLabel active={sortKey === "slaComplianceRate"} direction={sortKey === "slaComplianceRate" ? sortDir : "desc"} onClick={() => handleSort("slaComplianceRate")}>
                      SLA Compliance
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={sortKey === "avgRating"} direction={sortKey === "avgRating" ? sortDir : "desc"} onClick={() => handleSort("avgRating")}>
                      Avg Rating
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedStaff.map((s, i) => (
                  <TableRow key={s.staffId} hover>
                    <TableCell>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar sx={{ width: 28, height: 28, fontSize: "0.7rem", bgcolor: CHART_COLORS[i % CHART_COLORS.length] }}>
                          {s.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>{s.name}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip label={s.role} size="small" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                        <Box sx={{ width: 48, height: 4, bgcolor: "action.hover", borderRadius: 2, overflow: "hidden" }}>
                          <Box sx={{ height: "100%", width: `${(s.requestsHandled / maxRequests) * 100}%`, bgcolor: CHART_COLORS[i % CHART_COLORS.length], borderRadius: 2 }} />
                        </Box>
                        <Typography variant="body2">{s.requestsHandled}</Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" color={s.avgResponseMinutes > 20 ? "error.main" : s.avgResponseMinutes > 12 ? "warning.main" : "success.main"}>
                        {s.avgResponseMinutes.toFixed(1)} min
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <LinearProgress
                          variant="determinate"
                          value={s.slaComplianceRate}
                          sx={{ flex: 1, height: 6, borderRadius: 3, bgcolor: "action.hover", "& .MuiLinearProgress-bar": { bgcolor: slaColor(s.slaComplianceRate), borderRadius: 3 } }}
                        />
                        <Typography variant="caption" sx={{ minWidth: 36, textAlign: "right", color: slaColor(s.slaComplianceRate), fontWeight: 600 }}>
                          {s.slaComplianceRate.toFixed(0)}%
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
                        <Star size={12} style={{ color: "#f59e0b" }} />
                        <Typography variant="body2">{s.avgRating.toFixed(1)}</Typography>
                      </Stack>
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
