/**
 * RoomsPage — Room management with card grid layout.
 *
 * Design: 5 cards per row × 2 rows = 10 cards per page.
 * UX: Server-side search, sort (Room No / Last Update + asc/desc toggle),
 *     cursor-style pagination, stale-while-revalidate prefetch of next page.
 * Bulk ops: Bulk create, bulk template assign, bulk QR generate (preserved).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
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
  Alert,
} from "@mui/material";
import { DoorOpen, Download, Edit, Eye, Layers, Plus, QrCode, Upload } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { HierarchyToolbar, type SortField, type SortOrder } from "@/components/shared/HierarchyToolbar";
import BulkRoomCreateDialog from "@/components/dialogs/BulkRoomCreateDialog";
import BulkTemplateAssignDialog from "@/components/dialogs/BulkTemplateAssignDialog";
import QRBatchGenerateDialog from "@/components/dialogs/QRBatchGenerateDialog";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import type { Room } from "@/lib/api/types";

const PAGE_SIZE = 6; // 3 cols × 2 rows (desktop default)

const ROOM_TYPE_COLORS: Record<string, string> = {
  suite: "#F59E0B",
  deluxe: "#6366F1",
  standard: "#10B981",
  twin: "#3B82F6",
  single: "#8B5CF6",
};

function RoomCardSkeleton() {
  return (
    <Card sx={{ height: 168, borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <Skeleton variant="rounded" width={40} height={40} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={20} />
            <Skeleton variant="text" width="45%" height={14} />
          </Box>
        </Box>
        <Skeleton variant="text" width="70%" height={14} />
        <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.5 }} />
      </CardContent>
    </Card>
  );
}

interface RoomCardProps {
  room: Room;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onView: () => void;
  onEdit: () => void;
}

function RoomCard({ room, selected, onToggleSelect, onView, onEdit }: RoomCardProps) {
  const typeKey = (room.room_type ?? "standard").toLowerCase();
  const color = ROOM_TYPE_COLORS[typeKey] ?? "#6366F1";

  return (
    <Card
      sx={{
        height: 168,
        borderRadius: 2,
        border: "1px solid",
        borderColor: selected ? "primary.main" : "divider",
        boxShadow: selected ? "0 0 0 2px" : "none",
        boxShadowColor: selected ? "primary.main" : "transparent",
        transition: "box-shadow 0.15s, border-color 0.15s",
        "&:hover": {
          boxShadow: selected ? "0 0 0 2px" : "0 4px 16px rgba(0,0,0,0.10)",
          borderColor: selected ? "primary.main" : color,
        },
        position: "relative",
        overflow: "visible",
        bgcolor: selected ? "primary.50" : "background.paper",
      }}
    >
      {/* Selection checkbox overlay */}
      <Box
        onClick={(e) => { e.stopPropagation(); onToggleSelect(room.id); }}
        sx={{
          position: "absolute",
          top: 8,
          left: 8,
          width: 18,
          height: 18,
          borderRadius: 0.75,
          border: "2px solid",
          borderColor: selected ? "primary.main" : "divider",
          bgcolor: selected ? "primary.main" : "background.paper",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 2,
          transition: "all 0.15s",
          "&:hover": { borderColor: "primary.main" },
        }}
      >
        {selected && (
          <Box component="span" sx={{ color: "#fff", fontSize: "0.65rem", lineHeight: 1, fontWeight: 700 }}>✓</Box>
        )}
      </Box>

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
        <CardContent sx={{ p: 2, pl: 4, height: "100%", display: "flex", flexDirection: "column" }}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}>
            <Box
              sx={{
                width: 40, height: 40, flexShrink: 0,
                borderRadius: 1.5,
                bgcolor: `${color}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <DoorOpen size={18} color={color} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                variant="subtitle2"
                fontWeight={700}
                fontSize="0.9rem"
                fontFamily='"Geist Mono", monospace'
                sx={{ lineHeight: 1.3 }}
              >
                {room.room_number}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontSize="0.72rem">
                {[room.floor ? `Floor ${room.floor}` : null, room.zone].filter(Boolean).join(" · ") || "—"}
              </Typography>
            </Box>
          </Box>

          {/* Template */}
          <Box sx={{ mb: 0.75 }}>
            {room.template_name ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Chip
                  icon={<Layers size={10} />}
                  label={room.template_name}
                  size="small"
                  variant="outlined"
                  sx={{ height: 20, fontSize: "0.68rem", maxWidth: 120, "& .MuiChip-label": { px: 0.75 } }}
                />
                {(room as any).template_item_count != null && (
                  <Chip
                    label={`${(room as any).template_item_count} svc`}
                    size="small"
                    color="primary"
                    sx={{ height: 18, fontSize: "0.62rem", fontWeight: 700 }}
                  />
                )}
              </Box>
            ) : (
              <Typography variant="caption" color="text.disabled" fontSize="0.72rem" fontStyle="italic">
                No template assigned
              </Typography>
            )}
          </Box>

          {/* Meta chips */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: "auto" }}>
            <StatusChip status={room.status} />
            <Chip
              label={room.room_type}
              size="small"
              variant="outlined"
              sx={{ height: 20, fontSize: "0.68rem", borderColor: color, color, "& .MuiChip-label": { px: 0.75 } }}
            />
          </Box>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

export default function RoomsPage() {
  const { propertyId } = useActiveProperty();
  const [, navigate] = useLocation();

  // ── Toolbar state ──────────────────────────────────────────────────────────
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [page, setPage]           = useState(1);

  useEffect(() => { setPage(1); }, [search, sortBy, sortOrder]);

  // ── Selection state (for bulk ops) ────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  // ── Bulk dialog state ─────────────────────────────────────────────────────
  const [bulkCreateOpen, setBulkCreateOpen]       = useState(false);
  const [templateAssignOpen, setTemplateAssignOpen] = useState(false);
  const [qrGenerateOpen, setQrGenerateOpen]         = useState(false);

  // ── Server-side query ─────────────────────────────────────────────────────
  const queryInput = useMemo(() => ({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    sortBy,
    sortOrder,
  }), [page, search, sortBy, sortOrder]);

  const { data, isLoading, isPlaceholderData } = trpc.crud.rooms.list.useQuery(queryInput, {
    placeholderData: (prev) => prev,
    staleTime: 30_000,
  });

  // ── Prefetch next page ────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  useEffect(() => {
    const totalPages = data?.total_pages ?? 1;
    if (page < totalPages) {
      utils.crud.rooms.list.prefetch({ ...queryInput, page: page + 1 });
    }
  }, [page, data?.total_pages, queryInput, utils]);

  // ── Export ─────────────────────────────────────────────────────────────────
  const { exportCSV, exporting } = useExportCSV<Room>("rooms", [
    { header: "Room Number", accessor: "room_number" },
    { header: "Floor", accessor: "floor" },
    { header: "Zone", accessor: "zone" },
    { header: "Type", accessor: "room_type" },
    { header: "Status", accessor: "status" },
    { header: "Template", accessor: "template_name" },
  ]);

  const items = (data?.items ?? []) as Room[];
  const total = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const handleSortOrderToggle = useCallback(() => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  }, []);

  // Derive selected room numbers for bulk dialogs
  const selectedRooms = items.filter((r) => selectedIds.has(r.id));
  const selectedCount = selectedIds.size;

  const handleBulkSuccess = useCallback(() => {
    utils.crud.rooms.list.invalidate();
    setSelectedIds(new Set());
  }, [utils]);

  const ROOM_SORT_FIELDS = [
    { value: "name" as SortField, label: "Room No." },
    { value: "updated_at" as SortField, label: "Last Update" },
    { value: "id" as SortField, label: "ID" },
  ];

  return (
    <Box>
      <PageHeader
        title="Rooms"
        subtitle="Manage rooms and service spots within properties"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small"
              onClick={() => exportCSV(items)} disabled={exporting}>
              Export CSV
            </Button>
            <Button variant="outlined" startIcon={<Upload size={16} />} size="small"
              onClick={() => setBulkCreateOpen(true)}>
              Bulk Create
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small"
              onClick={() => navigate("/admin/rooms/new")}>
              Add Room
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
        searchPlaceholder="Search rooms…"
        sortFields={ROOM_SORT_FIELDS}
        actions={
          selectedCount > 0 ? (
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button size="small" variant="outlined" startIcon={<Layers size={14} />}
                onClick={() => setTemplateAssignOpen(true)}>
                Assign Template ({selectedCount})
              </Button>
              <Button size="small" variant="outlined" startIcon={<QrCode size={14} />}
                onClick={() => setQrGenerateOpen(true)}>
                Generate QR ({selectedCount})
              </Button>
              <Button size="small" variant="text" color="inherit"
                onClick={() => setSelectedIds(new Set())}
                sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                Clear
              </Button>
            </Box>
          ) : null
        }
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
          ? Array.from({ length: PAGE_SIZE }).map((_, i) => <RoomCardSkeleton key={i} />)
          : items.length === 0
          ? (
            <Box sx={{ gridColumn: "1 / -1", py: 8, textAlign: "center" }}>
              <DoorOpen size={40} style={{ opacity: 0.2, margin: "0 auto 12px" }} />
              <Typography variant="body1" color="text.secondary">
                {search ? `No rooms match "${search}"` : "No rooms yet"}
              </Typography>
              <Typography variant="caption" color="text.disabled">
                {search ? "Try a different search term" : "Create rooms individually or use bulk creation"}
              </Typography>
              {!search && (
                <Box sx={{ mt: 2, display: "flex", gap: 1, justifyContent: "center" }}>
                  <Button variant="outlined" size="small" startIcon={<Upload size={14} />}
                    onClick={() => setBulkCreateOpen(true)}>
                    Bulk Create
                  </Button>
                  <Button variant="contained" size="small" startIcon={<Plus size={14} />}
                    onClick={() => navigate("/admin/rooms/new")}>
                    Add Room
                  </Button>
                </Box>
              )}
            </Box>
          )
          : items.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              selected={selectedIds.has(room.id)}
              onToggleSelect={toggleSelect}
              onView={() => navigate(`/admin/rooms/${room.id}`)}
              onEdit={() => navigate(`/admin/rooms/${room.id}/edit`)}
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
          Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} rooms
          {selectedCount > 0 && ` · ${selectedCount} selected`}
        </Typography>
      )}

      {/* Bulk dialogs */}
      <BulkRoomCreateDialog
        open={bulkCreateOpen}
        onClose={() => setBulkCreateOpen(false)}
        propertyId={propertyId ?? ""}
        propertyName="Selected Property"
        onSuccess={handleBulkSuccess}
      />
      <BulkTemplateAssignDialog
        open={templateAssignOpen}
        onClose={() => setTemplateAssignOpen(false)}
        selectedRoomIds={selectedRooms.map((r) => r.id)}
        selectedRoomNumbers={selectedRooms.map((r) => r.room_number)}
        onSuccess={handleBulkSuccess}
      />
      <QRBatchGenerateDialog
        open={qrGenerateOpen}
        onClose={() => setQrGenerateOpen(false)}
        propertyId={propertyId ?? ""}
        propertyName="Selected Property"
        preSelectedRoomIds={selectedRooms.map((r) => r.id)}
        onSuccess={handleBulkSuccess}
      />
    </Box>
  );
}
