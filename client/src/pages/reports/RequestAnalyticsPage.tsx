/**
 * RequestAnalyticsPage — Service request analytics dashboard.
 *
 * Charts: daily volume (bar), avg response time trend (line),
 * SLA compliance gauge (radial), top service categories (horizontal bar).
 * Data: FastAPI /v1/reports/request-analytics — falls back to demo data.
 *
 * Design: Precision Studio — data-dense, minimal chrome, recharts-powered.
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Chip, Typography, FormControl,
  InputLabel, Select, MenuItem, Stack, Alert, CircularProgress,
  Button, Tooltip, IconButton,
} from "@mui/material";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, RadialBarChart,
  RadialBar, PolarAngleAxis, Cell, Legend,
} from "recharts";
import { RefreshCw, Download, TrendingUp, Clock, CheckCircle2, Star } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DailyVolume {
  date: string;       // "YYYY-MM-DD"
  total: number;
  confirmed: number;
  rejected: number;
  pending: number;
}

interface ResponseTimeTrend {
  date: string;
  avgMinutes: number;
  p90Minutes: number;
}

interface CategoryBreakdown {
  category: string;
  count: number;
  avgResponseMinutes: number;
}

interface RequestAnalyticsData {
  period: string;
  totalRequests: number;
  slaComplianceRate: number;   // 0-100
  avgResponseMinutes: number;
  dailyVolume: DailyVolume[];
  responseTimeTrend: ResponseTimeTrend[];
  topCategories: CategoryBreakdown[];
}

// ─── Demo Data ─────────────────────────────────────────────────────────────────

function generateDemoData(days: number): RequestAnalyticsData {
  const now = new Date();
  const dailyVolume: DailyVolume[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const total = 20 + Math.floor(Math.random() * 40);
    const rejected = Math.floor(total * 0.08);
    const pending = Math.floor(total * 0.12);
    return {
      date: d.toISOString().slice(0, 10),
      total,
      confirmed: total - rejected - pending,
      rejected,
      pending,
    };
  });

  const responseTimeTrend: ResponseTimeTrend[] = dailyVolume.map(d => ({
    date: d.date,
    avgMinutes: 8 + Math.random() * 12,
    p90Minutes: 18 + Math.random() * 20,
  }));

  const topCategories: CategoryBreakdown[] = [
    { category: "Housekeeping", count: 312, avgResponseMinutes: 9.2 },
    { category: "Room Service", count: 278, avgResponseMinutes: 14.5 },
    { category: "Spa & Wellness", count: 195, avgResponseMinutes: 22.1 },
    { category: "Maintenance", count: 143, avgResponseMinutes: 31.4 },
    { category: "Concierge", count: 121, avgResponseMinutes: 7.8 },
    { category: "Laundry", count: 98, avgResponseMinutes: 45.0 },
    { category: "Transport", count: 76, avgResponseMinutes: 18.3 },
  ];

  const totalRequests = dailyVolume.reduce((s, d) => s + d.total, 0);
  const avgResponseMinutes = responseTimeTrend.reduce((s, d) => s + d.avgMinutes, 0) / responseTimeTrend.length;

  return {
    period: `${days}d`,
    totalRequests,
    slaComplianceRate: 87.4,
    avgResponseMinutes: Math.round(avgResponseMinutes * 10) / 10,
    dailyVolume,
    responseTimeTrend,
    topCategories,
  };
}

const DEMO_7D = generateDemoData(7);
const DEMO_30D = generateDemoData(30);
const DEMO_90D = generateDemoData(90);

const DEMO_BY_PERIOD: Record<string, RequestAnalyticsData> = {
  "7d": DEMO_7D,
  "30d": DEMO_30D,
  "90d": DEMO_90D,
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}) {
  return (
    <Card sx={{ flex: 1, minWidth: 160 }}>
      <CardContent sx={{ py: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="flex-start">
          <Box sx={{ color: color ?? "primary.main", mt: 0.25 }}>
            <Icon size={20} />
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: "0.05em", fontSize: "0.65rem" }}>
              {label}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ lineHeight: 1.2, mt: 0.25 }}>
              {value}
            </Typography>
            {sub && (
              <Typography variant="caption" color="text.secondary">{sub}</Typography>
            )}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestAnalyticsPage() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  const { data: apiData, isLoading, refetch } = useQuery<RequestAnalyticsData>({
    queryKey: ["request-analytics", period],
    queryFn: async () => {
      try {
        return await apiClient
          .get(`/v1/reports/request-analytics`, { searchParams: { period } })
          .json<RequestAnalyticsData>();
      } catch {
        return DEMO_BY_PERIOD[period];
      }
    },
    staleTime: 60_000,
    retry: 1,
  });

  const data = apiData ?? DEMO_BY_PERIOD[period];
  const isDemo = !apiData || apiData === DEMO_BY_PERIOD[period];

  // Recharts needs short date labels
  const volumeData = useMemo(() =>
    data.dailyVolume.map(d => ({
      ...d,
      label: d.date.slice(5), // "MM-DD"
    })), [data]);

  const trendData = useMemo(() =>
    data.responseTimeTrend.map(d => ({
      ...d,
      label: d.date.slice(5),
      avg: Math.round(d.avgMinutes * 10) / 10,
      p90: Math.round(d.p90Minutes * 10) / 10,
    })), [data]);

  // SLA gauge data for RadialBarChart
  const slaGaugeData = [
    { name: "SLA Compliance", value: data.slaComplianceRate, fill: data.slaComplianceRate >= 90 ? "#22c55e" : data.slaComplianceRate >= 75 ? "#f59e0b" : "#ef4444" },
  ];

  const { exportCSV } = useExportCSV<DailyVolume>("request-analytics-volume", [
    { header: "Date", accessor: "date" },
    { header: "Total", accessor: "total" },
    { header: "Confirmed", accessor: "confirmed" },
    { header: "Rejected", accessor: "rejected" },
    { header: "Pending", accessor: "pending" },
  ]);

  return (
    <Box>
      <PageHeader
        title="Request Analytics"
        subtitle={`${data.totalRequests.toLocaleString()} requests · last ${period}${isDemo ? " — demo data" : ""}`}
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
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              size="small"
              onClick={() => exportCSV(data.dailyVolume)}
            >
              Export
            </Button>
          </Stack>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo analytics — connect FastAPI backend to see live request data.
        </Alert>
      )}

      {/* KPI Row */}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} sx={{ mb: 3 }}>
        <KpiCard icon={TrendingUp} label="Total Requests" value={data.totalRequests.toLocaleString()} sub={`last ${period}`} />
        <KpiCard icon={Clock} label="Avg Response Time" value={`${data.avgResponseMinutes} min`} sub="mean across all requests" color="#f59e0b" />
        <KpiCard icon={CheckCircle2} label="SLA Compliance" value={`${data.slaComplianceRate}%`} sub="requests within SLA window" color={data.slaComplianceRate >= 90 ? "#22c55e" : "#f59e0b"} />
        <KpiCard icon={Star} label="Top Category" value={data.topCategories[0]?.category ?? "—"} sub={`${data.topCategories[0]?.count ?? 0} requests`} color="#8b5cf6" />
      </Stack>

      {/* Daily Volume Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Daily Request Volume
          </Typography>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={volumeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={period === "90d" ? 6 : period === "30d" ? 4 : 0} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartTooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                formatter={(val: number, name: string) => [val, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="confirmed" stackId="a" fill="#22c55e" name="Confirmed" radius={[0, 0, 0, 0]} />
              <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" />
              <Bar dataKey="rejected" stackId="a" fill="#ef4444" name="Rejected" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Stack direction={{ xs: "column", md: "row" }} spacing={3} sx={{ mb: 3 }}>
        {/* Response Time Trend */}
        <Card sx={{ flex: 2 }}>
          <CardContent>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
              Response Time Trend
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={period === "90d" ? 6 : period === "30d" ? 4 : 0} />
                <YAxis tick={{ fontSize: 11 }} unit=" min" />
                <RechartTooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(val: number) => [`${val} min`]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} dot={false} name="Avg (min)" />
                <Line type="monotone" dataKey="p90" stroke="#8b5cf6" strokeWidth={1.5} strokeDasharray="4 2" dot={false} name="P90 (min)" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* SLA Compliance Gauge */}
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent sx={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 1 }}>
              SLA Compliance
            </Typography>
            <RadialBarChart
              width={180}
              height={160}
              cx={90}
              cy={90}
              innerRadius={55}
              outerRadius={80}
              data={slaGaugeData}
              startAngle={90}
              endAngle={-270}
            >
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar
                background={{ fill: "rgba(0,0,0,0.06)" }}
                dataKey="value"
                angleAxisId={0}
                cornerRadius={6}
              >
                {slaGaugeData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </RadialBar>
            </RadialBarChart>
            <Typography variant="h4" fontWeight={700} sx={{ mt: -2, color: slaGaugeData[0].fill }}>
              {data.slaComplianceRate}%
            </Typography>
            <Chip
              label={data.slaComplianceRate >= 90 ? "On Target" : data.slaComplianceRate >= 75 ? "At Risk" : "Below Target"}
              size="small"
              sx={{
                mt: 0.5,
                bgcolor: slaGaugeData[0].fill,
                color: "#fff",
                fontWeight: 600,
                fontSize: "0.7rem",
              }}
            />
          </CardContent>
        </Card>
      </Stack>

      {/* Top Categories */}
      <Card>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
            Top Service Categories
          </Typography>
          <Stack spacing={1.5}>
            {data.topCategories.map((cat, i) => {
              const max = data.topCategories[0]?.count ?? 1;
              const pct = Math.round((cat.count / max) * 100);
              return (
                <Box key={cat.category}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" fontWeight={500}>{cat.category}</Typography>
                      <Chip label={`${cat.count} req`} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      avg {cat.avgResponseMinutes.toFixed(1)} min
                    </Typography>
                  </Stack>
                  <Box sx={{ height: 6, bgcolor: "action.hover", borderRadius: 3, overflow: "hidden" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct}%`,
                        bgcolor: i === 0 ? "primary.main" : i === 1 ? "secondary.main" : "action.active",
                        borderRadius: 3,
                        transition: "width 0.6s ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
