/**
 * SatisfactionReportPage — Guest satisfaction analytics.
 *
 * Feature #25: Guest satisfaction report with NPS, star ratings,
 * category breakdowns, and recent feedback list.
 */
import { useState, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Chip, Button, Alert,
  FormControl, InputLabel, Select, MenuItem, Divider, LinearProgress,
  Avatar,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/client";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Star, Download, ThumbsUp, ThumbsDown, Minus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useExportCSV } from "@/hooks/useExportCSV";

// ─── Demo data ────────────────────────────────────────────────────────────────
const CATEGORIES = ["Spa & Wellness", "Food & Beverage", "Housekeeping", "Concierge", "Transport", "Activities"];

function genRatingDist() {
  return [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: star === 5 ? 420 : star === 4 ? 280 : star === 3 ? 95 : star === 2 ? 35 : 18,
  }));
}

function genCategoryRatings() {
  return CATEGORIES.map((cat) => ({
    subject: cat.split(" ")[0],
    fullName: cat,
    rating: parseFloat((3.8 + Math.random() * 1.1).toFixed(1)),
  }));
}

function genMonthlyNPS() {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((m) => ({
    month: m,
    nps: Math.floor(45 + Math.random() * 30),
    promoters: Math.floor(55 + Math.random() * 20),
    passives: Math.floor(25 + Math.random() * 15),
    detractors: Math.floor(5 + Math.random() * 15),
  }));
}

const RECENT_FEEDBACK = [
  { id: 1, guest: "Guest 1204", property: "Grand Hyatt", service: "Spa Package", rating: 5, comment: "Absolutely wonderful experience. The therapist was professional and the ambiance was perfect.", time: "2h ago" },
  { id: 2, guest: "Guest 0892", property: "Siam Kempinski", service: "Room Service", rating: 4, comment: "Food was excellent, delivery was slightly delayed but staff was apologetic.", time: "4h ago" },
  { id: 3, guest: "Guest 1567", property: "Mandarin Oriental", service: "Airport Transfer", rating: 3, comment: "Driver was on time but the vehicle was not as described.", time: "6h ago" },
  { id: 4, guest: "Guest 0341", property: "The Sukhothai", service: "Concierge", rating: 5, comment: "The concierge arranged everything perfectly for our anniversary dinner.", time: "8h ago" },
  { id: 5, guest: "Guest 2103", property: "Capella Bangkok", service: "Housekeeping", rating: 2, comment: "Room was not cleaned to our expectations. Raised with the front desk.", time: "12h ago" },
];

function StarRating({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <Box sx={{ display: "flex", gap: 0.25 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= value ? "#F59E0B" : "none"}
          stroke={s <= value ? "#F59E0B" : "#D1D5DB"}
        />
      ))}
    </Box>
  );
}

interface FeedbackRow { id?: number; guest: string; property: string; service: string; rating: number; comment: string; time: string; }

interface SatisfactionData {
  rating_dist: { star: number; count: number }[];
  category_ratings: { subject: string; fullName: string; rating: number }[];
  monthly_nps: { month: string; nps: number; promoters: number; passives: number; detractors: number }[];
  recent_feedback: FeedbackRow[];
  nps_score: number;
  promoters_pct: number;
  detractors_pct: number;
  response_rate: number;
}

export default function SatisfactionReportPage() {
  const [period, setPeriod] = useState("30d");

  // Try real API first, fall back to demo data on error
  const { data: apiData, isLoading } = useQuery<SatisfactionData>({
    queryKey: ["satisfaction-report", period],
    queryFn: async () => {
      try {
        return await apiClient.get(`/v1/reports/satisfaction?period=${period}`).json<SatisfactionData>();
      } catch {
        return {
          rating_dist: genRatingDist(),
          category_ratings: genCategoryRatings(),
          monthly_nps: genMonthlyNPS(),
          recent_feedback: RECENT_FEEDBACK,
          nps_score: 62,
          promoters_pct: 71,
          detractors_pct: 9,
          response_rate: 68,
        };
      }
    },
    staleTime: 60_000,
  });

  const isDemo = !apiData;
  const demoRatingDist = useMemo(() => genRatingDist(), []);
  const demoCategoryRatings = useMemo(() => genCategoryRatings(), []);
  const demoMonthlyNPS = useMemo(() => genMonthlyNPS(), []);

  const ratingDist = apiData?.rating_dist ?? demoRatingDist;
  const categoryRatings = apiData?.category_ratings ?? demoCategoryRatings;
  const monthlyNPS = apiData?.monthly_nps ?? demoMonthlyNPS;
  const recentFeedback = apiData?.recent_feedback ?? RECENT_FEEDBACK;
  const npsScore = apiData?.nps_score ?? 62;
  const promotersPct = apiData?.promoters_pct ?? 71;
  const detractorsPct = apiData?.detractors_pct ?? 9;
  const responseRate = apiData?.response_rate ?? 68;

  const totalReviews = ratingDist.reduce((s, r) => s + r.count, 0);
  const avgRating = (ratingDist.reduce((s, r) => s + r.star * r.count, 0) / (totalReviews || 1)).toFixed(1);

  const { exportCSV, exporting } = useExportCSV<FeedbackRow>("satisfaction-report", [
    { header: "Guest", accessor: "guest" },
    { header: "Property", accessor: "property" },
    { header: "Service", accessor: "service" },
    { header: "Rating", accessor: "rating" },
    { header: "Comment", accessor: "comment" },
    { header: "Time", accessor: "time" },
  ]);

  return (
    <Box>
      <PageHeader
        title="Satisfaction Report"
        subtitle="Guest feedback, ratings, and NPS analytics"
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Period</InputLabel>
              <Select value={period} label="Period" onChange={(e) => setPeriod(e.target.value as string)}>
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              size="small"
              onClick={() => exportCSV(recentFeedback)}
              disabled={exporting}
            >
              Export CSV
            </Button>
          </Box>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo satisfaction data — connect FastAPI backend to see real guest feedback.
        </Alert>
      )}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Overall Rating */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                Overall Rating
              </Typography>
              <Typography sx={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1, color: "#F59E0B" }}>
                {avgRating}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", my: 0.75 }}>
                <StarRating value={Math.round(parseFloat(avgRating))} size={16} />
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {totalReviews.toLocaleString()} reviews
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* NPS Score */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                NPS Score
              </Typography>
              <Typography sx={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1, color: npsScore >= 50 ? "#10B981" : npsScore >= 30 ? "#F59E0B" : "#EF4444" }}>
                {npsScore}
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, my: 0.75 }}>
                <ThumbsUp size={14} color="#10B981" />
                <Typography sx={{ fontSize: "0.75rem", color: "#10B981", fontWeight: 600 }}>Excellent</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                Industry avg: 45
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Promoters */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                Promoters
              </Typography>
              <Typography sx={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1, color: "#10B981" }}>
                {promotersPct}%
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, my: 0.75 }}>
                <ThumbsUp size={14} color="#10B981" />
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Score 9-10</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                Detractors: {detractorsPct}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Rate */}
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <Card>
            <CardContent sx={{ p: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1 }}>
                Response Rate
              </Typography>
              <Typography sx={{ fontSize: "3rem", fontWeight: 800, lineHeight: 1, color: "#2563EB" }}>
                {responseRate}%
              </Typography>
              <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5, my: 0.75 }}>
                <Minus size={14} color="#6B7280" />
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>vs 65% last period</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                {totalReviews.toLocaleString()} of {Math.round(totalReviews / ((responseRate / 100) || 1)).toLocaleString()} guests
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Left: Rating Distribution + NPS Trend */}
        <Grid size={{ xs: 12, lg: 7 }}>
          {/* Rating Distribution */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>Rating Distribution</Typography>
              <Box sx={{ display: "flex", gap: 3 }}>
                <Box sx={{ flex: 1 }}>
                  {ratingDist.map(({ star, count }) => {
                    const pct = Math.round((count / totalReviews) * 100);
                    return (
                      <Box key={star} sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, width: 60, flexShrink: 0 }}>
                          <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>{star}</Typography>
                          <Star size={12} fill="#F59E0B" stroke="#F59E0B" />
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            flex: 1, height: 8, borderRadius: 4,
                            bgcolor: "#F5F5F5",
                            "& .MuiLinearProgress-bar": {
                              bgcolor: star >= 4 ? "#10B981" : star === 3 ? "#F59E0B" : "#EF4444",
                            },
                          }}
                        />
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", width: 40, textAlign: "right" }}>
                          {pct}%
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* NPS Trend */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 2 }}>NPS Trend</Typography>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={monthlyNPS} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#A3A3A3" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E5E5", fontSize: 12 }} />
                  <Bar dataKey="promoters" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} name="Promoters" />
                  <Bar dataKey="passives" stackId="a" fill="#F59E0B" name="Passives" />
                  <Bar dataKey="detractors" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} name="Detractors" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Category Radar + Recent Feedback */}
        <Grid size={{ xs: 12, lg: 5 }}>
          {/* Category Radar */}
          <Card sx={{ mb: 2 }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 1 }}>By Service Category</Typography>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart data={categoryRatings}>
                  <PolarGrid stroke="#F0F0F0" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6B7280" }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10, fill: "#A3A3A3" }} />
                  <Radar name="Rating" dataKey="rating" stroke="#2563EB" fill="#2563EB" fillOpacity={0.15} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
                {categoryRatings.map((cat) => (
                  <Chip
                    key={cat.subject}
                    label={`${cat.subject}: ${cat.rating}`}
                    size="small"
                    sx={{ height: 20, fontSize: "0.625rem" }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Recent Feedback */}
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" sx={{ mb: 1.5 }}>Recent Feedback</Typography>
              {recentFeedback.map((fb, i) => (
                <Box key={fb.id ?? i}>
                  <Box sx={{ py: 1.5 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: "0.625rem", bgcolor: "#E5E7EB", color: "#374151" }}>
                          {fb.guest.slice(-4)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: "0.75rem", fontWeight: 600 }}>{fb.guest}</Typography>
                          <Typography sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{fb.property} · {fb.service}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.25 }}>
                        <StarRating value={fb.rating} size={11} />
                        <Typography sx={{ fontSize: "0.6875rem", color: "text.disabled" }}>{fb.time}</Typography>
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.5, pl: 4 }}>
                      "{fb.comment}"
                    </Typography>
                  </Box>
                  {i < recentFeedback.length - 1 && <Divider />}
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
