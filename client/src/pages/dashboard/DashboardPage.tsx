/**
 * DashboardPage — Main overview with stats, charts, and recent activity.
 *
 * Design: Precision Studio — stat cards in a 4-column grid,
 * charts below, recent activity on the right.
 */
import { Box, Card, CardContent, Typography, Grid, Divider, Avatar, Chip } from "@mui/material";
import {
  Building2,
  DoorOpen,
  QrCode,
  ConciergeBell,
  Handshake,
  Truck,
  ArrowUpRight,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";

const STATS = [
  { title: "Total Properties", value: "24", trend: 12, trendLabel: "vs last month", icon: Building2, iconColor: "#2563EB" },
  { title: "Active Rooms", value: "1,248", trend: 8, trendLabel: "vs last month", icon: DoorOpen, iconColor: "#8B5CF6" },
  { title: "QR Codes Active", value: "986", trend: -3, trendLabel: "vs last week", icon: QrCode, iconColor: "#0EA5E9" },
  { title: "Service Requests", value: "142", trend: 24, trendLabel: "today", icon: ConciergeBell, iconColor: "#10B981" },
];

const RECENT_ACTIVITY = [
  { id: 1, action: "New partner onboarded", entity: "Grand Hyatt Bangkok", time: "2 min ago", icon: Handshake, color: "#2563EB" },
  { id: 2, action: "QR batch generated", entity: "120 codes for Tower A", time: "15 min ago", icon: QrCode, color: "#8B5CF6" },
  { id: 3, action: "Service request completed", entity: "Room 1204 — Spa Package", time: "32 min ago", icon: ConciergeBell, color: "#10B981" },
  { id: 4, action: "New provider registered", entity: "Thai Wellness Spa Co.", time: "1 hour ago", icon: Truck, color: "#F59E0B" },
  { id: 5, action: "Property config updated", entity: "Siam Kempinski", time: "2 hours ago", icon: Building2, color: "#0EA5E9" },
];

const TOP_PROPERTIES = [
  { name: "Grand Hyatt Bangkok", requests: 48, rooms: 320, occupancy: "87%" },
  { name: "Siam Kempinski", requests: 36, rooms: 280, occupancy: "92%" },
  { name: "Mandarin Oriental", requests: 29, rooms: 196, occupancy: "78%" },
  { name: "The Sukhothai", requests: 22, rooms: 148, occupancy: "85%" },
];

export default function DashboardPage() {
  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your Peppr Around platform"
      />

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {STATS.map((stat) => (
          <Grid key={stat.title} size={{ xs: 12, sm: 6, lg: 3 }}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={2}>
        {/* Left: Top Properties */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h5">Top Properties</Typography>
                <Chip label="This Month" size="small" variant="outlined" />
              </Box>
              <Box>
                {/* Table Header */}
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
                  <Typography variant="caption" color="text.secondary">Property</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right" }}>Requests</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right" }}>Rooms</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textAlign: "right" }}>Occupancy</Typography>
                </Box>
                {/* Table Rows */}
                {TOP_PROPERTIES.map((prop, i) => (
                  <Box
                    key={prop.name}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr 1fr 1fr",
                      gap: 2,
                      py: 1.5,
                      px: 1,
                      borderBottom: i < TOP_PROPERTIES.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                      "&:hover": { bgcolor: "action.hover" },
                      borderRadius: 0.5,
                      cursor: "pointer",
                      transition: "background 100ms",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 28,
                          height: 28,
                          fontSize: "0.6875rem",
                          fontWeight: 600,
                          bgcolor: "primary.main",
                          color: "primary.contrastText",
                        }}
                      >
                        {prop.name[0]}
                      </Avatar>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {prop.name}
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}
                    >
                      {prop.requests}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "text.secondary" }}
                    >
                      {prop.rooms}
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "text.secondary" }}
                    >
                      {prop.occupancy}
                    </Typography>
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
              <Typography variant="h5" sx={{ mb: 2 }}>
                Recent Activity
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {RECENT_ACTIVITY.map((activity, i) => {
                  const Icon = activity.icon;
                  return (
                    <Box key={activity.id}>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1.5,
                          py: 1.5,
                          alignItems: "flex-start",
                        }}
                      >
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: `${activity.color}10`,
                            flexShrink: 0,
                          }}
                        >
                          <Icon size={15} color={activity.color} strokeWidth={1.8} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body1" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                            {activity.action}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ color: "text.secondary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                          >
                            {activity.entity}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{ color: "text.disabled", whiteSpace: "nowrap", flexShrink: 0, fontSize: "0.6875rem" }}
                        >
                          {activity.time}
                        </Typography>
                      </Box>
                      {i < RECENT_ACTIVITY.length - 1 && <Divider />}
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
