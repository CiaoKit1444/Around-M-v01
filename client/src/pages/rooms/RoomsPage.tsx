/**
 * RoomsPage — Room management with data table and bulk operations.
 *
 * Design: Precision Studio — table with row selection for bulk actions.
 * Shows room number, floor, zone, template assignment, QR status.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Chip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Layers, QrCode } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface Room {
  id: string;
  room_number: string;
  property_name: string;
  floor: string;
  zone: string;
  room_type: string;
  template_name: string | null;
  qr_status: string;
  status: string;
}

const DEMO_ROOMS: Room[] = [
  { id: "r-001", room_number: "1201", property_name: "Grand Hyatt Bangkok", floor: "12", zone: "Tower A", room_type: "Deluxe", template_name: "VIP Package", qr_status: "active", status: "active" },
  { id: "r-002", room_number: "1202", property_name: "Grand Hyatt Bangkok", floor: "12", zone: "Tower A", room_type: "Deluxe", template_name: "VIP Package", qr_status: "active", status: "active" },
  { id: "r-003", room_number: "1203", property_name: "Grand Hyatt Bangkok", floor: "12", zone: "Tower A", room_type: "Suite", template_name: "Premium Suite", qr_status: "active", status: "active" },
  { id: "r-004", room_number: "1204", property_name: "Grand Hyatt Bangkok", floor: "12", zone: "Tower B", room_type: "Standard", template_name: "Basic", qr_status: "pending", status: "active" },
  { id: "r-005", room_number: "1301", property_name: "Siam Kempinski", floor: "13", zone: "Main", room_type: "Deluxe", template_name: null, qr_status: "none", status: "active" },
  { id: "r-006", room_number: "1302", property_name: "Siam Kempinski", floor: "13", zone: "Main", room_type: "Suite", template_name: "VIP Package", qr_status: "active", status: "active" },
  { id: "r-007", room_number: "P-01", property_name: "Centara Grand", floor: "Pool", zone: "Pool Deck", room_type: "Cabana", template_name: "Pool Service", qr_status: "active", status: "active" },
];

export default function RoomsPage() {
  const columns = useMemo<MRT_ColumnDef<Room>[]>(
    () => [
      {
        accessorKey: "room_number",
        header: "Room",
        size: 80,
        Cell: ({ cell }) => (
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600, fontSize: "0.8125rem" }}>
            {cell.getValue<string>()}
          </Box>
        ),
      },
      { accessorKey: "property_name", header: "Property", size: 180 },
      { accessorKey: "floor", header: "Floor", size: 70 },
      { accessorKey: "zone", header: "Zone", size: 100 },
      { accessorKey: "room_type", header: "Type", size: 100 },
      {
        accessorKey: "template_name",
        header: "Template",
        size: 140,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | null>();
          return val ? (
            <Chip icon={<Layers size={12} />} label={val} size="small" variant="outlined" sx={{ fontSize: "0.6875rem" }} />
          ) : (
            <Box sx={{ color: "text.disabled", fontSize: "0.75rem", fontStyle: "italic" }}>Not assigned</Box>
          );
        },
      },
      {
        accessorKey: "qr_status",
        header: "QR",
        size: 80,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          if (val === "none") return <Box sx={{ color: "text.disabled", fontSize: "0.6875rem" }}>—</Box>;
          return <StatusChip status={val} />;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 90,
        Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />,
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: DEMO_ROOMS,
    enableColumnActions: false,
    enablePagination: true,
    enableSorting: true,
    enableGlobalFilter: true,
    enableRowSelection: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View"><IconButton size="small" onClick={() => toast.info(`View Room ${row.original.room_number}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => toast.info(`Edit Room ${row.original.room_number}`)}><Edit size={16} /></IconButton></Tooltip>
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
      <EmptyState title="No rooms yet" description="Create rooms individually or use bulk creation" actionLabel="Add Room" onAction={() => toast.info("Feature coming soon")} />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Rooms"
        subtitle="Manage rooms and service spots within properties"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" onClick={() => toast.info("Bulk create — coming soon")}>Bulk Create</Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => toast.info("Feature coming soon")}>Add Room</Button>
          </Box>
        }
      />
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <MaterialReactTable table={table} />
        </CardContent>
      </Card>
    </Box>
  );
}
