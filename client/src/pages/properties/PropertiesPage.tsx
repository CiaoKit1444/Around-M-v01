/**
 * PropertiesPage — Property management with card grid layout.
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
import { Building2, Download, DoorOpen, Edit, Eye, MapPin, Plus } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { HierarchyToolbar, type SortField, type SortOrder } from "@/components/shared/HierarchyToolbar";
import { PropertyOnboardingWizard } from "@/components/dialogs/PropertyOnboardingWizard";
import { useExportCSV } from "@/hooks/useExportCSV";
import { HighlightText } from "@/components/shared/HighlightText";
import type { Property } from "@/lib/api/types";

const PAGE_SIZE = 6; // 3 cols × 2 rows (desktop default)

const TYPE_COLORS: Record<string, string> = {
  hotel: "#6366F1",
  resort: "#10B981",
  villa: "#F59E0B",
  apartment: "#3B82F6",
  hostel: "#EC4899",
};

function PropertyCardSkeleton() {
  return (
    <Card sx={{ height: 168, borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Skeleton variant="rounded" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="75%" height={18} />
            <Skeleton variant="text" width="55%" height={14} />
          </Box>
        </Box>
        <Skeleton variant="text" width="50%" height={14} />
        <Skeleton variant="text" width="65%" height={14} sx={{ mt: 0.5 }} />
      </CardContent>
    </Card>
  );
}

interface PropertyCardProps {
  property: Property;
  index: number;
  onView: () => void;
  onEdit: () => void;
  highlight?: string;
}

function PropertyCard({ property, index, onView, onEdit, highlight }: PropertyCardProps) {
  const typeKey = (property.type ?? "hotel").toLowerCase();
  const color = TYPE_COLORS[typeKey] ?? "#6366F1";

  return (
    <Card
      sx={{
        height: 168,
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
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
            <Avatar
              variant="rounded"
              sx={{
                width: 40, height: 40, flexShrink: 0,
                bgcolor: `${color}22`, color,
                borderRadius: 1.5,
              }}
            >
              <Building2 size={18} />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                fontSize="0.85rem"
                sx={{ lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                <HighlightText text={property.name} query={highlight} />
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                {property.partner_name ?? "—"}
              </Typography>
            </Box>
          </Box>

          {/* Location */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
            <MapPin size={11} style={{ opacity: 0.45, flexShrink: 0 }} />
            <Typography variant="caption" color="text.secondary" fontSize="0.72rem"
              sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <HighlightText
                text={[property.city, property.country].filter(Boolean).join(", ")}
                query={highlight}
              />
            </Typography>
          </Box>

          {/* Meta chips */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mt: "auto" }}>
            <StatusChip status={property.status} />
            <Chip
              label={property.type}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.68rem", "& .MuiChip-label": { px: 0.75 }, borderColor: color, color }}
            />
            <Chip
              icon={<DoorOpen size={10} />}
              label={`${property.rooms_count ?? 0} room${(property.rooms_count ?? 0) !== 1 ? "s" : ""}`}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.68rem", "& .MuiChip-label": { px: 0.75 } }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function PropertiesPage() {
  const [, navigate] = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);

  // ── Toolbar state ──────────────────────────────────────────────────────────
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage]           = useState(1);

  useEffect(() => { setPage(1); }, [search, sortBy, sortOrder]);

  // ── Server-side query ─────────────────────────────────────────────────────
  const queryInput = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    sortBy,
    sortOrder,
  }), [page, search, sortBy, sortOrder]);

  const { data, isLoading, isPlaceholderData } = trpc.crud.properties.list.useQuery(queryInput, {
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  // ── Prefetch next page ────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  useEffect(() => {
    const totalPages = data?.total_pages ?? 1;
    if (page < totalPages) {
      utils.crud.properties.list.prefetch({ ...queryInput, page: page + 1 });
    }
  }, [page, data?.total_pages, queryInput, utils]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const { exportCSV, exporting } = useExportCSV<Property>("properties", [
    { header: "Name", accessor: "name" },
    { header: "Partner", accessor: "partner_name" },
    { header: "Country", accessor: "country" },
    { header: "City", accessor: "city" },
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
        title="Properties"
        subtitle="Manage hotels, resorts, and service locations"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small"
              onClick={() => exportCSV(items)} disabled={exporting}>
              Export CSV
            </Button>
            <Button variant="outlined" startIcon={<Building2 size={16} />} size="small"
              onClick={() => setWizardOpen(true)}>
              Setup Wizard
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small"
              onClick={() => navigate("/admin/properties/new")}>
              Add Property
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
        searchPlaceholder="Search properties…"
        recentSearchesKey="recent-searches-properties"
      />

      {/* Card grid */}
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
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <PropertyCardSkeleton key={i} />)
          : items.length === 0
          ? (
            <Box sx={{ gridColumn: "1 / -1", py: 8, textAlign: "center" }}>
              <Building2 size={40} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
              <Typography variant="body1" color="text.secondary">
                {search ? `No properties match "${search}"` : "No properties yet"}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {search ? "Try a different search term" : "Add a property to start managing rooms and services"}
              </Typography>
              {!search && (
                <Box sx={{ mt: 2 }}>
                  <Button variant="contained" size="small" startIcon={<Plus size={14} />}
                    onClick={() => navigate("/admin/properties/new")}>
                    Add Property
                  </Button>
                </Box>
              )}
            </Box>
          )
          : items.map((property, idx) => (
            <PropertyCard
              key={property.id}
              property={property}
              index={(page - 1) * PAGE_SIZE + idx}
              onView={() => navigate(`/admin/properties/${property.id}`)}
              onEdit={() => navigate(`/admin/properties/${property.id}/edit`)}
              highlight={search}
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

      {total > 0 && (
        <Typography variant="caption" color="text.disabled" sx={{ display: "block", textAlign: "center", mt: 1 }}>
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} properties
        </Typography>
      )}

      <PropertyOnboardingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={(id) => navigate(`/admin/properties/${id}`)}
      />
    </Box>
  );
}
