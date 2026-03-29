/**
 * QRAnalyticsDashboard — QR code scan analytics with trends and heatmap.
 *
 * Feature #27: Scan trends (daily/weekly), top rooms, hourly heatmap,
 * access type breakdown, and per-QR performance table.
 *
 * Route: /qr/analytics?propertyId=...
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Select, MenuItem,
  FormControl, InputLabel, Table, TableBody, TableCell, TableHead,
  TableRow, Alert, Tooltip, CircularProgress,
} from "@mui/material";
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { QrCode, TrendingUp, Eye, Clock, Shield, Globe } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useActiveProperty } from "@/hooks/useActiveProperty";

// ─── Demo data generators ─────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

function genWeeklyTrend(weeks = 8) {
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (weeks * 7 - i - 1));
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      scans: Math.floor(Math.random() * (isWeekend ? 80 : 50) + (isWeekend ? 30 : 15)),
      unique: Math.floor(Math.random() * (isWeekend ? 50 : 30) + (isWeekend ? 20 : 10)),
    };
  });
}

function genHourlyHeatmap() {
  return DAYS.map((day) => ({
    day,
    hours: HOURS.map((hour) => {
      const h = parseInt(hour);
      let base = 0;
      if (h >= 7 && h <= 10) base = 40; // morning
      else if (h >= 12 && h <= 14) base = 35; // lunch
      else if (h >= 18 && h <= 22) base = 50; // evening
      else if (h >= 0 && h <= 6) base = 2; // night
      else base = 15;
      return { hour, value: Math.floor(base + Math.random() * base * 0.6) };
    }),
  }));
}

const TOP_ROOMS = [
  { room: "101", scans: 142, sessions: 38, qr_id: "qr-001" },
  { room: "205", scans: 128, sessions: 31, qr_id: "qr-002" },
  { room: "312", scans: 115, sessions: 27, qr_id: "qr-003" },
  { room: "118", scans: 98, sessions: 22, qr_id: "qr-004" },
  { room: "407", scans: 87, sessions: 19, qr_id: "qr-005" },
];

const ACCESS_TYPE_DATA = [
  { name: "Public", value: 65, color: "#3B82F6" },
  { name: "Restricted", value: 35, color: "#8B5CF6" },
];

function getHeatColor(value: number, max: number): string {
  const ratio = value / max;
  if (ratio < 0.1) return "#F5F5F5";
  if (ratio < 0.25) return "#DBEAFE";
  if (ratio < 0.5) return "#93C5FD";
  if (ratio < 0.75) return "#3B82F6";
  return "#1D4ED8";
}

interface AnalyticsData {
  trend: { date: string; scans: number; unique: number }[];
  heatmap: { day: string; hours: { hour: string; value: number }[] }[];
  top_rooms: { room: string; scans: number; sessions: number; qr_id: string }[];
  access_type: { name: string; value: number; color: string }[];
}

export default function QRAnalyticsDashboard() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const { propertyId: activePropertyId } = useActiveProperty();
  const propertyId = params.get("propertyId") || activePropertyId || "";
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");

  // Try real API first, fall back to demo data on error
  const { data: apiData, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["qr-analytics", propertyId, period],
    queryFn: async () => {
      try {
        return await apiClient.get(`/v1/properties/${propertyId}/qr/analytics?period=${period}`).json<AnalyticsData>();
      } catch {
        // Demo fallback
        return {
          trend: genWeeklyTrend(12).slice(period === "7d" ? -7 : period === "30d" ? -30 : -90),
          heatmap: genHourlyHeatmap(),
          top_rooms: TOP_ROOMS,
          access_type: ACCESS_TYPE_DATA,
        };
      }
    },
    enabled: !!propertyId,
    staleTime: 60_000,
  });

  const isDemo = !apiData || !propertyId;

  // Use demo data when API data not yet available
  const demoTrend = useMemo(() => {
    const all = genWeeklyTrend(12);
    if (period === "7d") return all.slice(-7);
    if (period === "30d") return all.slice(-30);
    return all;
  }, [period]);

  const weeklyData = apiData?.trend ?? demoTrend;
  const heatmapData = useMemo(() => apiData?.heatmap ?? genHourlyHeatmap(), [apiData]);
  const maxHeat = useMemo(() =>
    Math.max(...heatmapData.flatMap((d) => d.hours.map((h) => h.value))), [heatmapData]);
  const topRooms = apiData?.top_rooms ?? TOP_ROOMS;
  const accessTypeData = apiData?.access_type ?? ACCESS_TYPE_DATA;

  const totalScans = weeklyData.reduce((s, d) => s + d.scans, 0);
  const totalUnique = weeklyData.reduce((s, d) => s + d.unique, 0);
  const avgDaily = Math.round(totalScans / (weeklyData.length || 1));
  const peakDay = weeklyData.reduce((a, b) => a.scans > b.scans ? a : b, weeklyData[0]);

  return (
    <Box>
      <PageHeader
        title="QR Analytics"
        subtitle="Scan trends, room performance, and access patterns"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/qr")}>
              <ArrowLeft size={14} className="mr-1" /> Back
            </Button>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel sx={{ fontSize: "0.8125rem" }}>Period</InputLabel>
              <Select
                value={period} label="Period"
                onChange={(e) => setPeriod(e.target.value as typeof period)}
                sx={{ fontSize: "0.8125rem" }}
              >
                <MenuItem value="7d" sx={{ fontSize: "0.8125rem" }}>Last 7 days</MenuItem>
                <MenuItem value="30d" sx={{ fontSize: "0.8125rem" }}>Last 30 days</MenuItem>
                <MenuItem value="90d" sx={{ fontSize: "0.8125rem" }}>Last 90 days</MenuItem>
              </Select>
            </FormControl>
          </Box>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.8125rem" }}>
          Showing demo analytics — connect backend API to see real scan data.
        </Alert>
      )}

      {/* KPI Cards */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 2, mb: 3 }}>
        {[
          { label: "Total Scans", value: totalScans.toLocaleString(), icon: <QrCode size={18} />, color: "#3B82F6" },
          { label: "Unique Sessions", value: totalUnique.toLocaleString(), icon: <Eye size={18} />, color: "#8B5CF6" },
          { label: "Avg / Day", value: avgDaily.toString(), icon: <TrendingUp size={18} />, color: "#10B981" },
          { label: "Peak Day", value: peakDay?.date ?? "—", icon: <Clock size={18} />, color: "#F59E0B" },
        ].map((kpi) => (
          <Card key={kpi.label} sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                <Typography variant="caption" sx={{ color: "#737373", fontWeight: 500 }}>{kpi.label}</Typography>
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace', color: "#171717" }}>
                {kpi.value}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Scan Trend Chart */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 3 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            <TrendingUp size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
            Scan Trend
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={weeklyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="scanGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="uniqueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F5F5F5" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.floor(weeklyData.length / 8)} />
              <YAxis tick={{ fontSize: 10 }} />
              <RechartTooltip contentStyle={{ fontSize: "0.75rem", borderRadius: 8 }} />
              <Area type="monotone" dataKey="scans" stroke="#3B82F6" fill="url(#scanGrad)" strokeWidth={2} name="Total Scans" />
              <Area type="monotone" dataKey="unique" stroke="#8B5CF6" fill="url(#uniqueGrad)" strokeWidth={2} name="Unique Sessions" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Hourly Heatmap + Access Type */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2, mb: 3 }}>
        {/* Heatmap */}
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5" }}>
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              <Clock size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Hourly Activity Heatmap
            </Typography>
            <Box sx={{ overflowX: "auto" }}>
              <Box sx={{ display: "flex", gap: 0.25, mb: 0.5, pl: "36px" }}>
                {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
                  <Typography key={h} variant="caption" sx={{ fontSize: "0.6rem", color: "#A3A3A3", width: "calc((100% - 36px) / 8)", textAlign: "center" }}>
                    {h.toString().padStart(2, "0")}:00
                  </Typography>
                ))}
              </Box>
              {heatmapData.map((row) => (
                <Box key={row.day} sx={{ display: "flex", alignItems: "center", gap: 0.25, mb: 0.25 }}>
                  <Typography variant="caption" sx={{ fontSize: "0.6875rem", color: "#737373", width: 32, flexShrink: 0 }}>
                    {row.day}
                  </Typography>
                  {row.hours.map((cell) => (
                    <Tooltip key={cell.hour} title={`${row.day} ${cell.hour}: ${cell.value} scans`} arrow>
                      <Box
                        sx={{
                          flex: 1, height: 16, borderRadius: 0.5,
                          bgcolor: getHeatColor(cell.value, maxHeat),
                          cursor: "default",
                          transition: "opacity 0.15s",
                          "&:hover": { opacity: 0.8 },
                        }}
                      />
                    </Tooltip>
                  ))}
                </Box>
              ))}
              {/* Legend */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1.5, pl: "36px" }}>
                <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#A3A3A3", mr: 0.5 }}>Low</Typography>
                {["#F5F5F5", "#DBEAFE", "#93C5FD", "#3B82F6", "#1D4ED8"].map((c) => (
                  <Box key={c} sx={{ width: 16, height: 10, borderRadius: 0.5, bgcolor: c }} />
                ))}
                <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#A3A3A3", ml: 0.5 }}>High</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Access Type Breakdown */}
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5" }}>
          <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              <Shield size={14} style={{ marginRight: 6, verticalAlign: "middle" }} />
              Access Type
            </Typography>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={accessTypeData} cx="50%" cy="50%"
                  innerRadius={45} outerRadius={70}
                  paddingAngle={3} dataKey="value"
                >
                  {accessTypeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Legend
                  formatter={(value) => <span style={{ fontSize: "0.75rem" }}>{value}</span>}
                />
                <RechartTooltip
                  formatter={(value: number) => [`${value}%`, ""]}
                  contentStyle={{ fontSize: "0.75rem", borderRadius: 8 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 1 }}>
              {accessTypeData.map((d) => (
                <Box key={d.name} sx={{ textAlign: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {d.name === "Public" ? <Globe size={12} color={d.color} /> : <Shield size={12} color={d.color} />}
                    <Typography variant="caption" sx={{ color: "#737373", fontSize: "0.75rem" }}>{d.name}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: d.color }}>{d.value}%</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Top Rooms Table */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 3 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
            Top Rooms by Scan Volume
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", py: 0.75 }}>Rank</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", py: 0.75 }}>Room</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", py: 0.75 }}>Total Scans</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", py: 0.75 }}>Sessions</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", py: 0.75 }}>Scan/Session</TableCell>
                <TableCell sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#737373", py: 0.75 }}>Bar</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topRooms.map((row, i) => (
                <TableRow key={row.qr_id} hover>
                  <TableCell sx={{ fontSize: "0.8125rem", py: 0.75 }}>
                    <Chip
                      label={`#${i + 1}`} size="small"
                      sx={{
                        height: 20, fontSize: "0.6875rem", fontWeight: 700,
                        bgcolor: i === 0 ? "#FEF3C7" : i === 1 ? "#F5F5F5" : "#FAFAFA",
                        color: i === 0 ? "#D97706" : "#737373",
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem", fontWeight: 600, py: 0.75 }}>Room {row.room}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem", fontFamily: '"Geist Mono", monospace', py: 0.75 }}>{row.scans}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem", fontFamily: '"Geist Mono", monospace', py: 0.75 }}>{row.sessions}</TableCell>
                  <TableCell sx={{ fontSize: "0.8125rem", fontFamily: '"Geist Mono", monospace', py: 0.75 }}>
                    {(row.scans / row.sessions).toFixed(1)}
                  </TableCell>
                  <TableCell sx={{ py: 0.75, minWidth: 100 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{
                        height: 6, borderRadius: 3,
                        width: `${(row.scans / (topRooms[0]?.scans || 1)) * 100}%`,
                        bgcolor: "#3B82F6", transition: "width 0.3s",
                      }} />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Box>
  );
}
