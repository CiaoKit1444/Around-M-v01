/**
 * RevenueReportPage — Revenue analytics and reporting.
 *
 * Feature #24: Revenue reporting with charts, breakdowns by property/category,
 * and date range filtering. Uses recharts for visualization.
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button,
  FormControl, InputLabel, Select, MenuItem, Divider, CircularProgress,
} from "@mui/material";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useExportCSV } from "@/hooks/useExportCSV";

// ─── Demo data generators ─────────────────────────────────────────────────────
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CATEGORIES = ["Spa & Wellness", "Food & Beverage", "Housekeeping", "Concierge", "Transport", "Activities"];
const PROPERTIES = ["Grand Hyatt Bangkok", "Siam Kempinski", "Mandarin Oriental", "The Sukhothai", "Capella Bangkok"];
const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#0EA5E9"];

function genMonthlyRevenue(months = 12) {
  return MONTHS.slice(0, months).map((m, i) => ({
    month: m,
    revenue: Math.floor(180_000 + Math.sin(i * 0.8) * 60_000 + Math.random() * 40_000),
    requests: Math.floor(800 + Math.sin(i * 0.8) * 200 + Math.random() * 150),
    avgValue: 0,
  })).map((d) => ({ ...d, avgValue: Math.round(d.revenue / d.requests) }));
}

function genCategoryBreakdown() {
  return CATEGORIES.map((cat, i) => ({
    name: cat,
    value: Math.floor(30_000 + Math.random() * 120_000),
    color: COLORS[i],
  }));
}

function genPropertyBreakdown() {
  return PROPERTIES.map((p) => ({
    name: p.split(" ").slice(-1)[0], // short name
    fullName: p,
    revenue: Math.floor(80_000 + Math.random() * 200_000),
    requests: Math.floor(300 + Math.random() * 700),
    growth: Math.floor(-10 + Math.random() * 30),
  }));
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ title, value, sub, trend }: { title: string; value: string; sub?: string; trend?: number }) {
  const Icon = trend === undefined ? Minus : trend > 0 ? TrendingUp : TrendingDown;
  const color = trend === undefined ? "#6B7280" : trend > 0 ? "#10B981" : "#EF4444";
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: "1.75rem", fontWeight: 700, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
          {value}
        </Typography>
        {(sub || trend !== undefined) && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
            {trend !== undefined && <Icon size={14} style={{ color }} />}
            <Typography sx={{ fontSize: "0.75rem", color }}>
              {trend !== undefined ? `${trend > 0 ? "+" : ""}${trend}% vs last period` : sub}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

interface RevenueRow { month: string; revenue: number; requests: number; avgValue: number; }

export default function RevenueReportPage() {
  const [period, setPeriod] = useState("12m");
  const [loading] = useState(false);

  const months = period === "3m" ? 3 : period === "6m" ? 6 : 12;
  const monthlyData = useMemo(() => genMonthlyRevenue(months), [months]);
  const categoryData = useMemo(() => genCategoryBreakdown(), []);
  const propertyData = useMemo(() => genPropertyBreakdown(), []);

  const totalRevenue = monthlyData.reduce((s, d) => s + d.revenue, 0);
  const totalRequests = monthlyData.reduce((s, d) => s + d.requests, 0);
  const avgOrderValue = Math.round(totalRevenue / totalRequests);
  const growth = 14;

  const { exportCSV, exporting } = useExportCSV<RevenueRow>("revenue-report", [
    { header: "Month", accessor: "month" },
    { header: "Revenue (THB)", accessor: "revenue" },
    { header: "Requests", accessor: "requests" },
    { header: "Avg Order Value", accessor: "avgValue" },
  ]);

  const fmt = (n: number) =>
    n >= 1_000_000
      ? `฿${(n / 1_000_000).toFixed(1)}M`
      : n >= 1_000
      ? `฿${(n / 1_000).toFixed(0)}K`
      : `฿${n}`;

  return (
    <Box>
      <PageHeader
        title="Revenue Report"
        subtitle="Financial performance and service revenue analytics"
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <InputLabel>Period</InputLabel>
              <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value as string)}>
                <MenuItem value="3m">Last 3 months</MenuItem>
                <MenuItem value="6m">Last 6 months</MenuItem>
                <MenuItem value="12m">Last 12 months</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              size="small"
              onClick={() => exportCSV(monthlyData)}
              disabled={exporting}
            >
              Export CSV
            </Button>
          </Box>
        }
      />

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPI Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KPICard title="Total Revenue" value={fmt(totalRevenue)} trend={growth} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KPICard title="Total Requests" value={totalRequests.toLocaleString()} trend={8} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KPICard title="Avg Order Value" value={`฿${avgOrderValue.toLocaleString()}`} trend={5} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
              <KPICard title="Top Category" value="Spa & Wellness" sub="38% of revenue" />
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            {/* Revenue Trend */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h5">Revenue Trend</Typography>
                    <Chip label="Demo Data" size="small" variant="outlined" sx={{ fontSize: "0.625rem" }} />
                  </Box>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${(v / 1000).toFixed(0)}K`} />
                      <Tooltip
                        formatter={(v: number) => [`฿${v.toLocaleString()}`, "Revenue"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E5E5E5", fontSize: 12 }}
                      />
                      <Bar dataKey="revenue" fill="#2563EB" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Avg Order Value Trend */}
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h5" sx={{ mb: 2 }}>Average Order Value</Typography>
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} tickFormatter={(v) => `฿${v}`} />
                      <Tooltip
                        formatter={(v: number) => [`฿${v.toLocaleString()}`, "Avg Value"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid #E5E5E5", fontSize: 12 }}
                      />
                      <Line type="monotone" dataKey="avgValue" stroke="#10B981" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Grid>

            {/* Right: Category Breakdown + Property Table */}
            <Grid size={{ xs: 12, lg: 4 }}>
              {/* Category Pie */}
              <Card sx={{ mb: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h5" sx={{ mb: 1 }}>By Category</Typography>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, i) => (
                          <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`฿${v.toLocaleString()}`, ""]} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mt: 1 }}>
                    {categoryData.map((cat, i) => (
                      <Box key={cat.name} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: COLORS[i] }} />
                          <Typography sx={{ fontSize: "0.75rem" }}>{cat.name}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {fmt(cat.value)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </CardContent>
              </Card>

              {/* Property Breakdown */}
              <Card>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h5" sx={{ mb: 1.5 }}>By Property</Typography>
                  {propertyData.map((p, i) => (
                    <Box key={p.fullName}>
                      <Box sx={{ py: 1.25 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{p.fullName}</Typography>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            {p.growth > 0 ? <TrendingUp size={12} color="#10B981" /> : <TrendingDown size={12} color="#EF4444" />}
                            <Typography sx={{ fontSize: "0.6875rem", color: p.growth > 0 ? "#10B981" : "#EF4444", fontWeight: 700 }}>
                              {p.growth > 0 ? "+" : ""}{p.growth}%
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography sx={{ fontSize: "0.875rem", fontWeight: 700, color: "primary.main" }}>
                            {fmt(p.revenue)}
                          </Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                            {p.requests.toLocaleString()} requests
                          </Typography>
                        </Box>
                      </Box>
                      {i < propertyData.length - 1 && <Divider />}
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
}
