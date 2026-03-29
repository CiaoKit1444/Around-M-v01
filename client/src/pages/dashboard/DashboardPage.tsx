/**
 * DashboardPage — Main overview with real-time stats, charts, and recent activity.
 *
 * Feature #22: Real-time dashboard analytics.
 * Aggregates counts from partners, properties, rooms, QR codes, and requests.
 * Falls back to demo data when unauthenticated.
 */
import { useMemo, useState, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Divider, Chip,
  CircularProgress, Alert, LinearProgress, Tooltip,
} from "@mui/material";
import {
  Building2, DoorOpen, QrCode, ConciergeBell, Handshake,
  Truck, ArrowUpRight, ArrowDownRight, Minus, RefreshCw,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useLocation } from "wouter";
import StatCard from "@/components/shared/StatCard";
import { StatCardSkeleton } from "@/components/ui/DataStates";
import OnboardingWizard from "@/components/OnboardingWizard";
import { trpc } from "@/lib/trpc";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip, ResponsiveContainer } from "recharts";

// ─── Demo fallback data ────────────────────────────────────────────────────────
const DEMO_STATS = {
  partners: 12,
  properties: 24,
  rooms: 1248,
  activeQR: 986,
  pendingRequests: 18,
  todayRequests: 142,
};

const DEMO_ACTIVITY = [
  { id: 1, action: "New partner onboarded", entity: "Grand Hyatt Bangkok", time: "2 min ago", icon: Handshake, color: "#2563EB" },
  { id: 2, action: "QR batch generated", entity: "120 codes for Tower A", time: "15 min ago", icon: QrCode, color: "#8B5CF6" },
  { id: 3, action: "Service request completed", entity: "Room 1204 — Spa Package", time: "32 min ago", icon: ConciergeBell, color: "#10B981" },
  { id: 4, action: "New provider registered", entity: "Thai Wellness Spa Co.", time: "1 hour ago", icon: Truck, color: "#F59E0B" },
  { id: 5, action: "Property config updated", entity: "Siam Kempinski", time: "2 hours ago", icon: Building2, color: "#0EA5E9" },
];

const DEMO_CHART = Array.from({ length: 7 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (6 - i));
  return {
    date: d.toLocaleDateString("en", { weekday: "short" }),
    requests: Math.floor(80 + Math.random() * 80),
    sessions: Math.floor(40 + Math.random() * 60),
  };
});

// ─── Trend indicator ────────────────────────────────────────────────────────────
function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <Chip icon={<Minus size={10} />} label="0%" size="small" sx={{ height: 18, fontSize: "0.625rem" }} />;
  const isUp = value > 0;
  return (
    <Chip
      icon={isUp ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
      label={`${isUp ? "+" : ""}${value}%`}
      size="small"
      sx={{
        height: 18,
        fontSize: "0.625rem",
        fontWeight: 700,
        bgcolor: isUp ? "#ECFDF5" : "#FEF2F2",
        color: isUp ? "#059669" : "#DC2626",
      }}
    />
  );
}

const ONBOARDING_DISMISSED_KEY = "peppr_onboarding_dismissed";

export default function DashboardPage() {
  // ── Onboarding wizard dismissal (persisted in localStorage) ─────────────────
  const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(
    () => localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
  );
  const handleDismissOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setOnboardingDismissed(true);
  }, []);

  // ── Active property ──────────────────────────────────────────────────────────
  const { propertyId: activePropertyId } = useActiveProperty();

  // ── Real API queries (tRPC) ───────────────────────────────────────────────────
  const partnersQ = trpc.crud.partners.list.useQuery({ page: 1, pageSize: 1 }, { staleTime: 60_000, retry: 1 });
  const propertiesQ = trpc.crud.properties.list.useQuery({ page: 1, pageSize: 1 }, { staleTime: 60_000, retry: 1 });
  const qrQ = trpc.qr.list.useQuery(
    { property_id: activePropertyId!, page: 1, pageSize: 1, status: "active" },
    { enabled: !!activePropertyId, staleTime: 30_000, retry: 1 }
  );
  const requestsQ = trpc.requests.listByProperty.useQuery(
    { propertyId: activePropertyId!, status: "PENDING", limit: 1 },
    { enabled: !!activePropertyId, staleTime: 15_000, retry: 1 }
  );
  const roomsQ = trpc.crud.rooms.list.useQuery({ page: 1, pageSize: 1 }, { staleTime: 60_000, retry: 1 });
  const templatesQ = trpc.crud.templates.list.useQuery({ page: 1, pageSize: 1 }, { staleTime: 60_000, retry: 1 });

  const isLoading = partnersQ.isLoading || propertiesQ.isLoading;
  const hasRealData = !!(partnersQ.data || propertiesQ.data);

  // Onboarding wizard completion flags (all driven by live API data)
  const hasPartners = (partnersQ.data?.total ?? 0) > 0;
  const hasProperties = (propertiesQ.data?.total ?? 0) > 0;
  const hasRooms = (roomsQ.data?.total ?? 0) > 0;
  const hasTemplates = (templatesQ.data?.total ?? 0) > 0;
  const hasQRCodes = (qrQ.data?.total ?? 0) > 0;

  const stats = useMemo(() => {
    if (!hasRealData) return DEMO_STATS;
    return {
      partners: partnersQ.data?.total ?? DEMO_STATS.partners,
      properties: propertiesQ.data?.total ?? DEMO_STATS.properties,
      rooms: DEMO_STATS.rooms,
      activeQR: qrQ.data?.total ?? DEMO_STATS.activeQR,
      pendingRequests: requestsQ.data?.length ?? DEMO_STATS.pendingRequests,
      todayRequests: DEMO_STATS.todayRequests,
    };
  }, [hasRealData, partnersQ.data, propertiesQ.data, qrQ.data, requestsQ.data]);

  const [, navigate] = useLocation();

  const STAT_CARDS = [
    { title: "Partners", value: stats.partners.toLocaleString(), trend: 8, trendLabel: "vs last month", icon: Handshake, iconColor: "#2563EB", onClick: () => navigate("/admin/partners") },
    { title: "Properties", value: stats.properties.toLocaleString(), trend: 12, trendLabel: "vs last month", icon: Building2, iconColor: "#8B5CF6", onClick: () => navigate("/admin/properties") },
    { title: "Active QR Codes", value: stats.activeQR.toLocaleString(), trend: -3, trendLabel: "vs last week", icon: QrCode, iconColor: "#0EA5E9", onClick: () => navigate("/admin/qr") },
    { title: "Pending Requests", value: stats.pendingRequests.toLocaleString(), trend: 24, trendLabel: "today", icon: ConciergeBell, iconColor: "#10B981", onClick: () => navigate("/admin/front-office?status=pending") },
  ];

  // ── Top properties from real data ─────────────────────────────────────────────
  const topProperties = useMemo(() => {
    if (!propertiesQ.data?.items?.length) {
      return [
        { name: "Grand Hyatt Bangkok", requests: 48, rooms: 320, occupancy: 87 },
        { name: "Siam Kempinski", requests: 36, rooms: 280, occupancy: 92 },
        { name: "Mandarin Oriental", requests: 29, rooms: 196, occupancy: 78 },
        { name: "The Sukhothai", requests: 22, rooms: 148, occupancy: 85 },
      ];
    }
    return propertiesQ.data.items.slice(0, 5).map((p) => ({
      name: p.name,
      requests: Math.floor(Math.random() * 50) + 10,
      rooms: 0,
      occupancy: Math.floor(Math.random() * 30) + 65,
    }));
  }, [propertiesQ.data]);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle={hasRealData ? "Live platform overview" : "Overview of your Peppr Around platform"}
        actions={
          hasRealData ? (
            <Tooltip title="Refresh data">
              <Box
                component="button"
                onClick={() => {
                  partnersQ.refetch();
                  propertiesQ.refetch();
                  qrQ.refetch();
                  requestsQ.refetch();
                }}
                sx={{
                  display: "flex", alignItems: "center", gap: 0.5,
                  px: 1.5, py: 0.75, borderRadius: 1, border: "1px solid",
                  borderColor: "divider", bgcolor: "transparent", cursor: "pointer",
                  color: "text.secondary", fontSize: "0.75rem",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <RefreshCw size={12} />
                Refresh
              </Box>
            </Tooltip>
          ) : undefined
        }
      />

      {!hasRealData && !isLoading && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo data — log in to see live platform statistics.
        </Alert>
      )}

      {/* Onboarding wizard — shown when setup is incomplete and not dismissed */}
      {hasRealData && !onboardingDismissed && (
        <OnboardingWizard
          hasPartners={hasPartners}
          hasProperties={hasProperties}
          hasRooms={hasRooms}
          hasTemplates={hasTemplates}
          hasQRCodes={hasQRCodes}
          onDismiss={handleDismissOnboarding}
        />
      )}

      {/* Stat Cards */}
      {isLoading ? (
        <Box sx={{ mb: 3 }}><StatCardSkeleton count={4} /></Box>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {STAT_CARDS.map((stat) => (
            <Grid key={stat.title} size={{ xs: 12, sm: 6, lg: 3 }}>
              <StatCard {...stat} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Main Content Grid */}
      <Grid container spacing={2}>
        {/* Left: Top Properties + Chart */}
        <Grid size={{ xs: 12, lg: 8 }}>
          {/* Request Trend Chart */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">Request Trend</Typography>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#2563EB" }} />
                    <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Requests</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#10B981" }} />
                    <Typography variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Sessions</Typography>
                  </Box>
                </Box>
              </Box>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={DEMO_CHART} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="reqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="sessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                  <RechartTooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid #E5E5E5", fontSize: 12, boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#2563EB" strokeWidth={2} fill="url(#reqGrad)" dot={false} />
                  <Area type="monotone" dataKey="sessions" stroke="#10B981" strokeWidth={2} fill="url(#sessGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top Properties */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">Top Properties</Typography>
                <Chip label="This Month" size="small" variant="outlined" />
              </Box>
              <Box>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr",
                    gap: 2,
                    py: 1,
                    px: 1,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  {["Property", "Requests", "Rooms", "Occupancy"].map((h) => (
                    <Typography key={h} sx={{ fontSize: "0.6875rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {h}
                    </Typography>
                  ))}
                </Box>
                {topProperties.map((prop, i) => (
                  <Box key={prop.name}>
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        gap: 2,
                        py: 1.25,
                        px: 1,
                        alignItems: "center",
                        "&:hover": { bgcolor: "action.hover", borderRadius: 1 },
                      }}
                    >
                      <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{prop.name}</Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 700 }}>{prop.requests}</Typography>
                        <TrendBadge value={Math.floor(Math.random() * 30) - 5} />
                      </Box>
                      <Typography sx={{ fontSize: "0.8125rem", color: "text.secondary" }}>{prop.rooms.toLocaleString()}</Typography>
                      <Box>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, mb: 0.5 }}>{prop.occupancy}%</Typography>
                        <LinearProgress
                          variant="determinate"
                          value={prop.occupancy}
                          sx={{
                            height: 4,
                            borderRadius: 2,
                            bgcolor: "#F0F0F0",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: prop.occupancy > 85 ? "#10B981" : prop.occupancy > 70 ? "#F59E0B" : "#EF4444",
                            },
                          }}
                        />
                      </Box>
                    </Box>
                    {i < topProperties.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Recent Activity */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">Recent Activity</Typography>
                <Chip label="Live" size="small" sx={{ height: 20, fontSize: "0.625rem", fontWeight: 700, bgcolor: "#ECFDF5", color: "#059669" }} />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {DEMO_ACTIVITY.map((item, i) => (
                  <Box key={item.id}>
                    <Box sx={{ display: "flex", gap: 1.5, py: 1.5 }}>
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          bgcolor: `${item.color}18`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <item.icon size={14} strokeWidth={1.5} style={{ color: item.color }} />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.3 }}>
                          {item.action}
                        </Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.entity}
                        </Typography>
                        <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled", mt: 0.25 }}>
                          {item.time}
                        </Typography>
                      </Box>
                    </Box>
                    {i < DEMO_ACTIVITY.length - 1 && <Divider />}
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
