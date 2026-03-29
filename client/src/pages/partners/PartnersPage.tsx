/**
 * PartnersPage — Partner management with card grid layout.
 *
 * Design: 5 cards per row × 2 rows = 10 cards per page.
 * UX: Server-side search, sort (ID / Name / Last Update + asc/desc toggle),
 *     cursor-style pagination, and stale-while-revalidate prefetch of next page.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  IconButton,
  Pagination,
  Skeleton,
  Tooltip,
  Typography,
} from "@mui/material";
import { Building2, Download, Edit, Eye, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { HierarchyToolbar, type SortField, type SortOrder } from "@/components/shared/HierarchyToolbar";
import { useExportCSV } from "@/hooks/useExportCSV";
import type { Partner } from "@/lib/api/types";

const PAGE_SIZE = 6; // 3 cols × 2 rows (desktop default)

// Colour palette for partner avatars (cycles by index)
const AVATAR_COLORS = [
  "#6366F1", "#F59E0B", "#10B981", "#3B82F6", "#EC4899",
  "#8B5CF6", "#14B8A6", "#F97316", "#EF4444", "#06B6D4",
];

function PartnerCardSkeleton() {
  return (
    <Card sx={{ height: 160, borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Skeleton variant="circular" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={18} />
            <Skeleton variant="text" width="50%" height={14} />
          </Box>
        </Box>
        <Skeleton variant="text" width="40%" height={14} />
        <Skeleton variant="text" width="60%" height={14} sx={{ mt: 0.5 }} />
      </CardContent>
    </Card>
  );
}

interface PartnerCardProps {
  partner: Partner;
  index: number;
  onView: () => void;
  onEdit: () => void;
}

function PartnerCard({ partner, index, onView, onEdit }: PartnerCardProps) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const initials = partner.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <Card
      sx={{
        height: 160,
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        transition: "box-shadow 0.15s, border-color 0.15s",
        "&:hover": {
          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
          borderColor: color,
        },
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Quick-action overlay */}
      <Box
        className="card-actions"
        sx={{
          position: "absolute",
          top: 8,
          right: 8,
          display: "flex",
          gap: 0.5,
          opacity: 0,
          transition: "opacity 0.15s",
          ".MuiCard-root:hover &": { opacity: 1 },
          zIndex: 2,
        }}
      >
        <Tooltip title="View">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onView(); }}
            sx={{ bgcolor: "background.paper", boxShadow: 1, width: 26, height: 26 }}>
            <Eye size={13} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); onEdit(); }}
            sx={{ bgcolor: "background.paper", boxShadow: 1, width: 26, height: 26 }}>
            <Edit size={13} />
          </IconButton>
        </Tooltip>
      </Box>

      <CardActionArea onClick={onView} sx={{ height: "100%", borderRadius: 2 }}>
        <CardContent sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Header row */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
            <Avatar
              sx={{
                width: 40, height: 40, flexShrink: 0,
                bgcolor: `${color}22`, color,
                fontSize: "0.9rem", fontWeight: 700,
              }}
            >
              {initials}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                fontSize="0.85rem"
                sx={{ lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {partner.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem"
                sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                {partner.email}
              </Typography>
            </Box>
          </Box>

          {/* Meta row */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: "auto" }}>
            <StatusChip status={partner.status} />
            <Chip
              icon={<Building2 size={11} />}
              label={`${partner.properties_count ?? 0} propert${(partner.properties_count ?? 0) === 1 ? "y" : "ies"}`}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.68rem", "& .MuiChip-label": { px: 0.75 } }}
            />
          </Box>

          {/* Contact */}
          {partner.contact_person && (
            <Typography variant="caption" color="text.disabled" fontSize="0.7rem" sx={{ mt: 0.75 }}>
              Contact: {partner.contact_person}
            </Typography>
          )}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function PartnersPage() {
  const [, navigate] = useLocation();

  // ── Toolbar state ──────────────────────────────────────────────────────────
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage]           = useState(1);

  // Reset to page 1 whenever search/sort changes
  useEffect(() => { setPage(1); }, [search, sortBy, sortOrder]);

  // ── Server-side query (current page) ──────────────────────────────────────
  const queryInput = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    sortBy,
    sortOrder,
  }), [page, search, sortBy, sortOrder]);

  const { data, isLoading, isPlaceholderData } = trpc.crud.partners.list.useQuery(queryInput, {
    placeholderData: (prev) => prev, // keep previous page data while next page loads (SWR effect)
    staleTime: 30_000,
  });

  // ── Prefetch next page (lazy-load / pull-load pattern) ────────────────────
  const utils = trpc.useUtils();
  useEffect(() => {
    const totalPages = data?.total_pages ?? 1;
    if (page < totalPages) {
      utils.crud.partners.list.prefetch({
        ...queryInput,
        page: page + 1,
      });
    }
  }, [page, data?.total_pages, queryInput, utils]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const { exportCSV, exporting } = useExportCSV<Partner>("partners", [
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Contact", accessor: "contact_person" },
    { header: "Properties", accessor: "properties_count" },
    { header: "Status", accessor: "status" },
    { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
  ]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  return (
    <Box>
      <PageHeader
        title="Partners"
        subtitle="Manage partner organizations and their properties"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<Download size={16} />}
              size="small"
              onClick={() => exportCSV(items)}
              disabled={exporting}
            >
              Export CSV
            </Button>
            <Button
              variant="contained"
              startIcon={<Plus size={16} />}
              size="small"
              onClick={() => navigate("/admin/partners/new")}
            >
              Add Partner
            </Button>
          </Box>
        }
      />

      {/* Toolbar */}
      <HierarchyToolbar
        search={search}
        onSearchChange={setSearch}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortOrder={sortOrder}
        onSortOrderToggle={handleSortOrderToggle}
        total={total}
        searchPlaceholder="Search partners…"
      />

      {/* Card grid — responsive: 1col→xs, 2col→sm, 3col→md+ */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(1, 1fr)",
            sm: "repeat(2, 1fr)",
            md: "repeat(3, 1fr)",
          },
          gap: 2,
          opacity: isPlaceholderData ? 0.6 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {isLoading
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <PartnerCardSkeleton key={i} />)
          : items.length === 0
          ? (
            <Box sx={{ gridColumn: "1 / -1", py: 8, textAlign: "center" }}>
              <Building2 size={40} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
              <Typography variant="body1" color="text.secondary">
                {search ? `No partners match "${search}"` : "No partners yet"}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {search ? "Try a different search term" : "Start by onboarding your first partner"}
              </Typography>
              {!search && (
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" size="small" startIcon={<Plus size={14} />}
                    onClick={() => navigate("/admin/partners/new")}>
                    Add Partner
                  </Button>
                </Box>
              )}
            </Box>
          )
          : items.map((partner, idx) => (
            <PartnerCard
              key={partner.id}
              partner={partner}
              index={(page - 1) * PAGE_SIZE + idx}
              onView={() => navigate(`/admin/partners/${partner.id}`)}
              onEdit={() => navigate(`/admin/partners/${partner.id}/edit`)}
            />
          ))
        }
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_, p) => setPage(p)}
            color="primary"
            size="small"
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Page info */}
      {total > 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 1 }}>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} partners
        </Typography>
      )}
    </Box>
  );
}
