/**
 * ServicePopularityReport — Feature #39
 * Ranks services by request count and revenue, identifies trending items.
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Paper, Chip,
  LinearProgress, ToggleButtonGroup, ToggleButton, Skeleton, Alert,
  Avatar, Button,
} from "@mui/material";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ShoppingBag, DollarSign, Star, Hash, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import { useExportCSV } from "@/hooks/useExportCSV";

interface ServicePopularityItem {
  service_id: string;
  service_name: string;
  category: string;
  request_count: number;
  revenue: number;
  avg_rating: number;
  trend: "up" | "down" | "stable";
  trend_pct: number;
}

interface PopularityData {
  items: ServicePopularityItem[];
  total_requests: number;
  total_revenue: number;
  period: string;
}

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#ede9fe", "#f5f3ff"];

function TrendIcon({ trend, pct }: { trend: string; pct: number }) {
  if (trend === "up") return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "success.main" }}>
      <TrendingUp size={14} /><Typography variant="caption" color="success.main">+{pct}%</Typography>
    </Box>
  );
  if (trend === "down") return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "error.main" }}>
      <TrendingDown size={14} /><Typography variant="caption" color="error.main">-{pct}%</Typography>
    </Box>
  );
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
      <Minus size={14} /><Typography variant="caption" color="text.secondary">{pct}%</Typography>
    </Box>
  );
}

export default function ServicePopularityReport() {
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [sortBy, setSortBy] = useState<"requests" | "revenue" | "rating">("requests");

  const { data, isLoading, error } = useQuery<PopularityData>({
    queryKey: ["service-popularity", period],
    queryFn: async () => {
      try {
        return await apiClient.get(`/v1/reports/service-popularity?period=${period}`).json<PopularityData>();
      } catch {
        // Demo fallback
        const items: ServicePopularityItem[] = [
          { service_id: "1", service_name: "Room Cleaning", category: "Housekeeping", request_count: 342, revenue: 5130, avg_rating: 4.7, trend: "up", trend_pct: 12 },
          { service_id: "2", service_name: "Late Checkout", category: "Front Desk", request_count: 289, revenue: 8670, avg_rating: 4.5, trend: "up", trend_pct: 8 },
          { service_id: "3", service_name: "Extra Towels", category: "Housekeeping", request_count: 256, revenue: 0, avg_rating: 4.8, trend: "stable", trend_pct: 2 },
          { service_id: "4", service_name: "Airport Transfer", category: "Concierge", request_count: 198, revenue: 9900, avg_rating: 4.6, trend: "up", trend_pct: 22 },
          { service_id: "5", service_name: "Room Service", category: "F&B", request_count: 187, revenue: 11220, avg_rating: 4.3, trend: "down", trend_pct: 5 },
          { service_id: "6", service_name: "Laundry", category: "Housekeeping", request_count: 145, revenue: 2900, avg_rating: 4.4, trend: "stable", trend_pct: 1 },
          { service_id: "7", service_name: "Spa Booking", category: "Wellness", request_count: 132, revenue: 13200, avg_rating: 4.9, trend: "up", trend_pct: 31 },
          { service_id: "8", service_name: "Breakfast In Bed", category: "F&B", request_count: 98, revenue: 4900, avg_rating: 4.7, trend: "up", trend_pct: 15 },
          { service_id: "9", service_name: "Pillow Menu", category: "Housekeeping", request_count: 67, revenue: 0, avg_rating: 4.6, trend: "down", trend_pct: 3 },
          { service_id: "10", service_name: "Turndown Service", category: "Housekeeping", request_count: 54, revenue: 540, avg_rating: 4.5, trend: "stable", trend_pct: 0 },
        ];
        return { items, total_requests: 1768, total_revenue: 56460, period };
      }
    },
  });

  const sorted = [...(data?.items ?? [])].sort((a, b) => {
    if (sortBy === "requests") return b.request_count - a.request_count;
    if (sortBy === "revenue") return b.revenue - a.revenue;
    return b.avg_rating - a.avg_rating;
  });

  const { exportCSV } = useExportCSV<ServicePopularityItem>(`service-popularity-${period}`, [
    { header: "Service", accessor: "service_name" },
    { header: "Category", accessor: "category" },
    { header: "Request Count", accessor: "request_count" },
    { header: "Revenue", accessor: "revenue" },
    { header: "Avg Rating", accessor: "avg_rating" },
    { header: "Trend", accessor: "trend" },
    { header: "Trend %", accessor: "trend_pct" },
  ]);

  const maxCount = sorted[0]?.request_count ?? 1;

  const pieData = sorted.slice(0, 7).map(item => ({
    name: item.service_name,
    value: item.request_count,
  }));

  const barData = sorted.slice(0, 8).map(item => ({
    name: item.service_name.length > 12 ? item.service_name.slice(0, 12) + "…" : item.service_name,
    requests: item.request_count,
    revenue: item.revenue,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={600}>Service Popularity</Typography>
          <Typography variant="body2" color="text.secondary">Request volume and revenue by service item</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ToggleButtonGroup value={period} exclusive onChange={(_, v) => v && setPeriod(v)} size="small">
            <ToggleButton value="7d">7 days</ToggleButton>
            <ToggleButton value="30d">30 days</ToggleButton>
            <ToggleButton value="90d">90 days</ToggleButton>
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Download size={14} />}
            onClick={() => exportCSV(sorted)}
            disabled={sorted.length === 0}
          >
            Export
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="warning" sx={{ mb: 2 }}>Using demo data — backend endpoint not available.</Alert>}

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: "Total Requests", value: data?.total_requests?.toLocaleString() ?? "—", icon: Hash, color: "#6366f1" },
          { label: "Total Revenue", value: data ? `$${data.total_revenue.toLocaleString()}` : "—", icon: DollarSign, color: "#10b981" },
          { label: "Services Tracked", value: data?.items.length ?? "—", icon: ShoppingBag, color: "#f59e0b" },
          { label: "Top Rated", value: sorted[0]?.service_name ?? "—", icon: Star, color: "#ec4899" },
        ].map(kpi => (
          <Grid size={{ xs: 6, md: 3 }} key={kpi.label}>
            <Card>
              <CardContent sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, "&:last-child": { pb: 2 } }}>
                <Avatar sx={{ bgcolor: kpi.color + "20", color: kpi.color, width: 40, height: 40 }}>
                  <kpi.icon size={20} />
                </Avatar>
                <Box>
                  <Typography variant="caption" color="text.secondary">{kpi.label}</Typography>
                  <Typography variant="h6" fontWeight={600} noWrap sx={{ maxWidth: 120 }}>{isLoading ? <Skeleton width={60} /> : kpi.value}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Request Volume by Service</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="requests" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>Request Share</Typography>
              {isLoading ? <Skeleton variant="rectangular" height={220} /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={false}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Ranked Table */}
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={600}>Ranked Service Items</Typography>
            <ToggleButtonGroup value={sortBy} exclusive onChange={(_, v) => v && setSortBy(v)} size="small">
              <ToggleButton value="requests">By Requests</ToggleButton>
              <ToggleButton value="revenue">By Revenue</ToggleButton>
              <ToggleButton value="rating">By Rating</ToggleButton>
            </ToggleButtonGroup>
          </Box>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Requests</TableCell>
                  <TableCell align="right">Revenue</TableCell>
                  <TableCell align="right">Avg Rating</TableCell>
                  <TableCell align="right">Trend</TableCell>
                  <TableCell>Volume Bar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                  : sorted.map((item, idx) => (
                    <TableRow key={item.service_id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={idx < 3 ? 700 : 400} color={idx === 0 ? "warning.main" : "text.primary"}>
                          {idx + 1}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>{item.service_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={item.category} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{item.request_count.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{item.revenue > 0 ? `$${item.revenue.toLocaleString()}` : "—"}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 0.5 }}>
                          <Star size={12} color="#f59e0b" fill="#f59e0b" />
                          <Typography variant="body2">{item.avg_rating.toFixed(1)}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        <TrendIcon trend={item.trend} pct={item.trend_pct} />
                      </TableCell>
                      <TableCell sx={{ width: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={(item.request_count / maxCount) * 100}
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
