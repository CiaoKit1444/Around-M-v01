/**
 * RoomsPage — Room management with data table and bulk operations.
 *
 * Design: Precision Studio — table with row selection for bulk actions.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 * Bulk ops: Bulk create, bulk template assign, bulk QR generate.
 */
import { useMemo, useState, useCallback } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Chip, Alert } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Layers, QrCode, Upload, DoorOpen, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import BulkRoomCreateDialog from "@/components/dialogs/BulkRoomCreateDialog";
import BulkTemplateAssignDialog from "@/components/dialogs/BulkTemplateAssignDialog";
import QRBatchGenerateDialog from "@/components/dialogs/QRBatchGenerateDialog";
import { useRooms } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoRooms } from "@/lib/api/demo-data";
import type { Room } from "@/lib/api/types";
import { useQueryClient } from "@tanstack/react-query";
import { useActiveProperty } from "@/hooks/useActiveProperty";

export default function RoomsPage() {
  const { propertyId } = useActiveProperty();
  const { exportCSV, exporting } = useExportCSV<Room>("rooms", [
    { header: "Room Number", accessor: "room_number" },
    { header: "Property", accessor: "property_name" },
    { header: "Floor", accessor: "floor" },
    { header: "Zone", accessor: "zone" },
    { header: "Type", accessor: "room_type" },
    { header: "Status", accessor: "status" },
    { header: "Template", accessor: "template_name" },
  ]);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  // Stabilize params with useState — inline {} creates new ref each render → infinite re-fetches
  const [params] = useState(() => ({}));
  const [demoData] = useState(() => getDemoRooms());
  const query = useRooms(params);
  const { data, isLoading, isDemo } = useDemoFallback(query, demoData);

  // Dialog state
  const [bulkCreateOpen, setBulkCreateOpen] = useState(false);
  const [templateAssignOpen, setTemplateAssignOpen] = useState(false);
  const [qrGenerateOpen, setQrGenerateOpen] = useState(false);
  const [selectedForBulk, setSelectedForBulk] = useState<{ ids: string[]; numbers: string[] }>({ ids: [], numbers: [] });

  const handleBulkSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["qr"] });
  }, [queryClient]);

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
    renderTopToolbarCustomActions: ({ table: t }) => {
      const selectedRows = t.getSelectedRowModel().rows;
      const selectedCount = selectedRows.length;

      if (selectedCount === 0) return null;

      const handleOpenTemplateAssign = () => {
        setSelectedForBulk({
          ids: selectedRows.map((r) => r.original.id),
          numbers: selectedRows.map((r) => r.original.room_number),
        });
        setTemplateAssignOpen(true);
      };

      const handleOpenQrGenerate = () => {
        setSelectedForBulk({
          ids: selectedRows.map((r) => r.original.id),
          numbers: selectedRows.map((r) => r.original.room_number),
        });
        setQrGenerateOpen(true);
      };

      return (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" startIcon={<Layers size={14} />} onClick={handleOpenTemplateAssign}>
            Assign Template ({selectedCount})
          </Button>
          <Button size="small" variant="outlined" startIcon={<QrCode size={14} />} onClick={handleOpenQrGenerate}>
            Generate QR ({selectedCount})
          </Button>
        </Box>
      );
    },
    renderEmptyRowsFallback: () => (
      <EmptyState title="No rooms yet" description="Create rooms individually or use bulk creation" actionLabel="Add Room" onAction={() => navigate("/admin/rooms/new")} />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Rooms"
        subtitle="Manage rooms and service spots within properties"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
            <Button variant="outlined" startIcon={<Upload size={16} />} size="small" onClick={() => setBulkCreateOpen(true)}>
              Bulk Create
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/admin/rooms/new")}>
              Add Room
            </Button>
          </Box>
        }
      />
      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>
      )}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
            <MaterialReactTable table={table} />
          )}
        </CardContent>
      </Card>

      {/* Bulk Create Dialog */}
      <BulkRoomCreateDialog
        open={bulkCreateOpen}
        onClose={() => setBulkCreateOpen(false)}
        propertyId={propertyId ?? ""}
        propertyName="The Grand Palace Hotel"
        onSuccess={handleBulkSuccess}
      />

      {/* Bulk Template Assign Dialog */}
      <BulkTemplateAssignDialog
        open={templateAssignOpen}
        onClose={() => setTemplateAssignOpen(false)}
        selectedRoomIds={selectedForBulk.ids}
        selectedRoomNumbers={selectedForBulk.numbers}
        onSuccess={handleBulkSuccess}
      />

      {/* QR Batch Generate Dialog */}
      <QRBatchGenerateDialog
        open={qrGenerateOpen}
        onClose={() => setQrGenerateOpen(false)}
        propertyId={propertyId ?? ""}
        propertyName="The Grand Palace Hotel"
        preSelectedRoomIds={selectedForBulk.ids}
        onSuccess={handleBulkSuccess}
      />
    </Box>
  );
}
