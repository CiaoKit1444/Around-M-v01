/**
 * DataStates — Reusable loading skeletons and empty state components.
 *
 * Provides content-aware skeleton screens that mirror the real layout
 * so users never see a white screen or a generic spinner.
 *
 * Exports:
 *   TableSkeleton       — table rows with header
 *   CardSkeleton        — card grid (e.g. templates)
 *   StatCardSkeleton    — stat/KPI row
 *   DetailSkeleton      — detail/edit form page
 *   ListPageSkeleton    — full list page (header + stats + table)
 *   ReportSkeleton      — report page (header + chart area + table)
 *   GuestMenuSkeleton   — guest service menu
 *   GuestLandingSkeleton— guest scan landing
 *   DashboardSkeleton   — dashboard overview
 *   FrontOfficeSkeleton — front-office split view
 *   EmptyState          — illustrated empty state with CTA
 *   LoadingRow          — inline loading indicator
 */
import { Skeleton, Box, Typography, Button, Card, CardContent } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { SearchX, FolderOpen, Wifi } from "lucide-react";

// ─── Shared pulse animation ───────────────────────────────────────────────────
const PULSE_SX = {
  "@keyframes skeletonPulse": {
    "0%": { opacity: 1 },
    "50%": { opacity: 0.4 },
    "100%": { opacity: 1 },
  },
};

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  // Stable widths to avoid hydration mismatches
  const widths = [75, 55, 85, 65, 70, 60, 80, 50, 90, 45];
  return (
    <Box sx={{ px: 0 }}>
      {/* Header row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 2,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="60%" height={16} />
        ))}
      </Box>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <Box
          key={rowIdx}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 2,
            px: 2,
            py: 1.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            alignItems: "center",
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              variant={colIdx === 0 ? "rounded" : "text"}
              width={colIdx === 0 ? 32 : `${widths[(rowIdx * columns + colIdx) % widths.length]}%`}
              height={colIdx === 0 ? 32 : 14}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// ─── Card Grid Skeleton ───────────────────────────────────────────────────────
interface CardSkeletonProps {
  count?: number;
  columns?: number;
}

export function CardSkeleton({ count = 6, columns = 3 }: CardSkeletonProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: `repeat(${columns}, 1fr)` },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Skeleton variant="rounded" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={18} />
              <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Skeleton variant="text" width="90%" height={14} />
          <Skeleton variant="text" width="75%" height={14} sx={{ mt: 0.5 }} />
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="rounded" width={80} height={24} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${count}, 1fr)` },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="circular" width={20} height={20} />
          </Box>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="55%" height={12} sx={{ mt: 0.5 }} />
        </Box>
      ))}
    </Box>
  );
}

// ─── Page Header Skeleton ─────────────────────────────────────────────────────
export function PageHeaderSkeleton() {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 3 }}>
      <Box>
        <Skeleton variant="text" width={220} height={32} />
        <Skeleton variant="text" width={340} height={18} sx={{ mt: 0.5 }} />
      </Box>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Skeleton variant="rounded" width={100} height={36} />
        <Skeleton variant="rounded" width={120} height={36} />
      </Box>
    </Box>
  );
}

// ─── Full List Page Skeleton ──────────────────────────────────────────────────
export function ListPageSkeleton({ stats = 4, rows = 8, columns = 5 }: { stats?: number; rows?: number; columns?: number }) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <StatCardSkeleton count={stats} />
      <Box sx={{ mt: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", overflow: "hidden" }}>
        {/* Toolbar */}
        <Box sx={{ display: "flex", gap: 1.5, p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
          <Skeleton variant="rounded" width={260} height={36} />
          <Skeleton variant="rounded" width={120} height={36} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="rounded" width={90} height={36} />
        </Box>
        <TableSkeleton rows={rows} columns={columns} />
      </Box>
    </Box>
  );
}

// ─── Detail / Edit Page Skeleton ──────────────────────────────────────────────
export function DetailSkeleton({ sections = 2 }: { sections?: number }) {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" }, gap: 3 }}>
        {/* Main form area */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Array.from({ length: sections }).map((_, si) => (
            <Box key={si} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
              <Skeleton variant="text" width="35%" height={22} sx={{ mb: 2.5 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                {Array.from({ length: 4 }).map((_, fi) => (
                  <Box key={fi}>
                    <Skeleton variant="text" width="40%" height={14} sx={{ mb: 0.75 }} />
                    <Skeleton variant="rounded" width="100%" height={40} />
                  </Box>
                ))}
              </Box>
              {si === 0 && (
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width="40%" height={14} sx={{ mb: 0.75 }} />
                  <Skeleton variant="rounded" width="100%" height={80} />
                </Box>
              )}
            </Box>
          ))}
        </Box>
        {/* Sidebar */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="50%" height={18} sx={{ mb: 2 }} />
            {Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
                <Skeleton variant="text" width="40%" height={14} />
                <Skeleton variant="text" width="35%" height={14} />
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="50%" height={18} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" width="100%" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={36} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Dashboard Skeleton ───────────────────────────────────────────────────────
export function DashboardSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      {/* KPI row */}
      <StatCardSkeleton count={4} />
      {/* Charts row */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3, mt: 3 }}>
        <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Skeleton variant="text" width="30%" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" width="100%" height={220} />
        </Box>
        <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="circular" width={160} height={160} sx={{ mx: "auto", mb: 2 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.75 }}>
              <Skeleton variant="text" width="40%" height={14} />
              <Skeleton variant="text" width="20%" height={14} />
            </Box>
          ))}
        </Box>
      </Box>
      {/* Recent activity */}
      <Box sx={{ mt: 3, p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Skeleton variant="text" width="25%" height={20} sx={{ mb: 2 }} />
        <TableSkeleton rows={5} columns={4} />
      </Box>
    </Box>
  );
}

// ─── Front Office Skeleton ────────────────────────────────────────────────────
export function FrontOfficeSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <StatCardSkeleton count={4} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "340px 1fr" }, gap: 2, mt: 3 }}>
        {/* Sessions panel */}
        <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Skeleton variant="text" width="50%" height={20} />
            <Skeleton variant="rounded" width={32} height={22} />
          </Box>
          {Array.from({ length: 5 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Skeleton variant="circular" width={32} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="60%" height={16} />
                <Skeleton variant="text" width="40%" height={12} />
              </Box>
              <Skeleton variant="rounded" width={60} height={22} />
            </Box>
          ))}
        </Box>
        {/* Requests panel */}
        <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="rounded" width={80} height={22} />
          </Box>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Skeleton variant="rounded" width="100%" height={36} />
            <Skeleton variant="rounded" width={130} height={36} />
          </Box>
          <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
            <Skeleton variant="rounded" width={80} height={28} />
            <Skeleton variant="rounded" width={80} height={28} />
            <Skeleton variant="rounded" width={100} height={28} />
          </Box>
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 2, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
              <Skeleton variant="rounded" width={3} height={32} />
              <Box sx={{ flex: 1 }}>
                <Skeleton variant="text" width="50%" height={16} />
                <Skeleton variant="text" width="70%" height={12} />
              </Box>
              <Skeleton variant="rounded" width={70} height={22} />
              <Skeleton variant="rounded" width={60} height={28} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── Request Detail Skeleton ──────────────────────────────────────────────────
export function RequestDetailSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 340px" }, gap: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Status timeline */}
          <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 2 }} />
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              {Array.from({ length: 4 }).map((_, i) => (
                <Box key={i} sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
                  <Skeleton variant="circular" width={32} height={32} />
                  <Skeleton variant="text" width={60} height={12} />
                </Box>
              ))}
            </Box>
          </Box>
          {/* Notes */}
          <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="25%" height={20} sx={{ mb: 2 }} />
            {Array.from({ length: 3 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1.5, mb: 2 }}>
                <Skeleton variant="circular" width={28} height={28} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="rounded" width="100%" height={56} />
                </Box>
              </Box>
            ))}
            <Skeleton variant="rounded" width="100%" height={72} />
          </Box>
        </Box>
        {/* Sidebar */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="50%" height={18} sx={{ mb: 2 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 1 }}>
                <Skeleton variant="text" width="40%" height={14} />
                <Skeleton variant="text" width="35%" height={14} />
              </Box>
            ))}
          </Box>
          <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="40%" height={18} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" width="100%" height={8} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={14} />
          </Box>
          <Box sx={{ p: 2.5, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="40%" height={18} sx={{ mb: 2 }} />
            <Skeleton variant="rounded" width="100%" height={36} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" width="100%" height={36} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Report Page Skeleton ─────────────────────────────────────────────────────
export function ReportSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <StatCardSkeleton count={4} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 3, mt: 3 }}>
        <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="rounded" width="100%" height={260} />
        </Box>
        <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2 }} />
          {Array.from({ length: 6 }).map((_, i) => (
            <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1 }}>
              <Skeleton variant="circular" width={10} height={10} />
              <Skeleton variant="text" width="50%" height={14} />
              <Box sx={{ flex: 1 }} />
              <Skeleton variant="text" width="20%" height={14} />
            </Box>
          ))}
        </Box>
      </Box>
      <Box sx={{ mt: 3, p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Skeleton variant="text" width="25%" height={20} sx={{ mb: 2 }} />
        <TableSkeleton rows={6} columns={5} />
      </Box>
    </Box>
  );
}

// ─── Guest Landing Skeleton ───────────────────────────────────────────────────
export function GuestLandingSkeleton() {
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", p: 3, gap: 3 }}>
      <Skeleton variant="circular" width={80} height={80} />
      <Skeleton variant="text" width={200} height={32} />
      <Skeleton variant="text" width={280} height={18} />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, width: "100%", maxWidth: 360 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <Skeleton variant="circular" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={16} />
              <Skeleton variant="text" width="80%" height={12} />
            </Box>
          </Box>
        ))}
      </Box>
      <Skeleton variant="rounded" width="100%" height={48} sx={{ maxWidth: 360, borderRadius: 3 }} />
    </Box>
  );
}

// ─── Guest Menu Skeleton ──────────────────────────────────────────────────────
export function GuestMenuSkeleton() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {/* Header */}
      <Box sx={{ p: 2.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 2 }}>
        <Skeleton variant="circular" width={40} height={40} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="50%" height={20} />
          <Skeleton variant="text" width="35%" height={14} />
        </Box>
      </Box>
      {/* Category tabs */}
      <Box sx={{ display: "flex", gap: 1, p: 2, overflowX: "auto" }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" width={80} height={32} sx={{ flexShrink: 0, borderRadius: 4 }} />
        ))}
      </Box>
      {/* Items */}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ display: "flex", gap: 2, p: 2, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="rounded" width={72} height={72} sx={{ borderRadius: 1.5, flexShrink: 0 }} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="60%" height={18} />
              <Skeleton variant="text" width="90%" height={14} sx={{ mt: 0.5 }} />
              <Skeleton variant="text" width="40%" height={14} sx={{ mt: 0.5 }} />
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1.5 }}>
                <Skeleton variant="text" width="25%" height={20} />
                <Skeleton variant="rounded" width={100} height={32} sx={{ borderRadius: 2 }} />
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Settings Page Skeleton ───────────────────────────────────────────────────
export function SettingsSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "240px 1fr" }, gap: 3 }}>
        {/* Nav */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} variant="rounded" width="100%" height={40} />
          ))}
        </Box>
        {/* Content */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {Array.from({ length: 3 }).map((_, si) => (
            <Box key={si} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
              <Skeleton variant="text" width="30%" height={22} sx={{ mb: 2.5 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                {Array.from({ length: 4 }).map((_, fi) => (
                  <Box key={fi}>
                    <Skeleton variant="text" width="40%" height={14} sx={{ mb: 0.75 }} />
                    <Skeleton variant="rounded" width="100%" height={40} />
                  </Box>
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ─── QR Page Skeleton ─────────────────────────────────────────────────────────
export function QRDetailSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" }, gap: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="30%" height={20} sx={{ mb: 2 }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box key={i}>
                  <Skeleton variant="text" width="40%" height={14} sx={{ mb: 0.75 }} />
                  <Skeleton variant="rounded" width="100%" height={40} />
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
        <Box sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <Skeleton variant="text" width="50%" height={18} />
          <Skeleton variant="rounded" width={200} height={200} />
          <Skeleton variant="rounded" width="100%" height={36} />
          <Skeleton variant="rounded" width="100%" height={36} />
        </Box>
      </Box>
    </Box>
  );
}

// ─── API Keys Skeleton ────────────────────────────────────────────────────────
export function ApiKeysSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <StatCardSkeleton count={4} />
      <Box sx={{ mt: 3, p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
        <Skeleton variant="text" width="20%" height={20} sx={{ mb: 2 }} />
        <TableSkeleton rows={3} columns={7} />
      </Box>
    </Box>
  );
}

// ─── Shift Handoff Skeleton ───────────────────────────────────────────────────
export function ShiftHandoffSkeleton() {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <StatCardSkeleton count={4} />
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3, mt: 3 }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <Box key={i} sx={{ p: 3, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
            <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2 }} />
            {Array.from({ length: 4 }).map((_, j) => (
              <Box key={j} sx={{ display: "flex", justifyContent: "space-between", py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                <Skeleton variant="text" width="45%" height={14} />
                <Skeleton variant="rounded" width={70} height={22} />
              </Box>
            ))}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "error";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
}: EmptyStateProps) {
  const DefaultIcon =
    variant === "search" ? SearchX : variant === "error" ? Wifi : FolderOpen;
  const FinalIcon = Icon ?? DefaultIcon;

  const iconColor =
    variant === "error" ? "error.main" : variant === "search" ? "text.secondary" : "primary.main";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 4,
        textAlign: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          bgcolor: variant === "error" ? "error.main" : "primary.main",
          opacity: 0.1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 10,
          }}
        >
          <FinalIcon size={28} color={iconColor as string} />
        </Box>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 360, lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      )}

      {(action || secondaryAction) && (
        <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
          {action && (
            <Button variant="contained" size="small" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outlined" size="small" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Inline Loading Row ───────────────────────────────────────────────────────
export function LoadingRow({ message = "Loading..." }: { message?: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        py: 4,
        justifyContent: "center",
      }}
    >
      <Skeleton variant="circular" width={20} height={20} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}

// ─── Page Transition Shimmer ──────────────────────────────────────────────────
/**
 * Thin progress bar at the top of the page during route transitions.
 * Renders as a fixed-position shimmer strip.
 */
export function PageTransitionBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        bgcolor: "primary.main",
        ...PULSE_SX,
        animation: "skeletonPulse 1s ease-in-out infinite",
        transformOrigin: "left",
      }}
    />
  );
}
