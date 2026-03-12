/**
 * RoomsPage — Room management with data table and bulk operations.
 *
 * Design: Precision Studio — table with row selection for bulk actions.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Chip, Alert } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Layers, QrCode, Upload, DoorOpen } from "lucide-react";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { useRooms } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoRooms } from "@/lib/api/demo-data";
import type { Room } from "@/lib/api/types";
import { toast } from "sonner";

export default function RoomsPage() {
  const [, navigate] = useLocation();
  const query = useRooms();
  const { data, isLoading, isDemo } = useDemoFallback(query, getDemoRooms());

  const columns = useMemo<MRT_ColumnDef<Room>[]>(
    () => [
      {
        accessorKey: "room_number",
        header: "Room",
        size: 100,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <DoorOpen size={14} />
            <Box sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace', fontSize: "0.8125rem" }}>{row.original.room_number}</Box>
          </Box>
        ),
      },
      { accessorKey: "property_name", header: "Property", size: 200 },
      {
        accessorKey: "floor",
        header: "Floor",
        size: 70,
        Cell: ({ cell }) => <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>{cell.getValue<string>()}</Box>,
      },
      { accessorKey: "zone", header: "Zone", size: 100 },
      {
        accessorKey: "room_type",
        header: "Type",
        size: 100,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          const color = type === "Suite" ? "warning" : type === "Deluxe" ? "info" : "default";
          return <Chip label={type} size="small" color={color as any} variant="outlined" sx={{ fontSize: "0.6875rem", height: 22 }} />;
        },
      },
      {
        accessorKey: "template_name",
        header: "Template",
        size: 140,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          return val ? (
            <Chip icon={<Layers size={12} />} label={val} size="small" variant="outlined" sx={{ fontSize: "0.6875rem" }} />
          ) : (
            <Box sx={{ color: "text.disabled", fontSize: "0.75rem", fontStyle: "italic" }}>Unassigned</Box>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 90,
        Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />,
        filterVariant: "select",
        filterSelectOptions: ["active", "maintenance", "inactive"],
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: data?.items ?? [],
    rowCount: data?.total ?? 0,
    state: { isLoading },
    enableColumnActions: false,
    enablePagination: true,
    enableSorting: true,
    enableGlobalFilter: true,
    enableRowSelection: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/rooms/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/rooms/${row.original.id}/edit`)}><Edit size={16} /></IconButton></Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderTopToolbarCustomActions: ({ table }) => {
      const selectedCount = table.getSelectedRowModel().rows.length;
      return selectedCount > 0 ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Layers size={14} />} onClick={() => toast.info("Bulk assign template — coming soon")}>
            Assign Template ({selectedCount})
          </Button>
          <Button size="small" variant="outlined" startIcon={<QrCode size={14} />} onClick={() => toast.info("Bulk generate QR — coming soon")}>
            Generate QR ({selectedCount})
          </Button>
        </Box>
      ) : null;
    },
    renderEmptyRowsFallback: () => (
      <EmptyState title="No rooms yet" description="Create rooms individually or use bulk creation" actionLabel="Add Room" onAction={() => navigate("/rooms/new")} />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Rooms"
        subtitle="Manage rooms and service spots within properties"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Upload size={16} />} size="small" onClick={() => toast.info("Bulk import coming soon")}>Bulk Import</Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/rooms/new")}>Add Room</Button>
          </Box>
        }
      />
      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>
      )}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <MaterialReactTable table={table} />
        </CardContent>
      </Card>
    </Box>
  );
}
