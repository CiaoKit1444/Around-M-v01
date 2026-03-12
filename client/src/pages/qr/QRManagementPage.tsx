/**
 * QRManagementPage — QR code management with generation, status tracking, and access type control.
 *
 * Shows QR codes with their room, access type, status, and last scan time.
 * Supports batch generation and bulk access type updates.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Chip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { QrCode, Eye, Shield, ShieldOff, RefreshCw } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface QRCode {
  id: string;
  qr_code_id: string;
  room_number: string;
  property_name: string;
  access_type: string;
  status: string;
  last_scanned: string | null;
  created_at: string;
}

const DEMO: QRCode[] = [
  { id: "q-001", qr_code_id: "PA-QR-20260301-a1b2c3d4", room_number: "1201", property_name: "Grand Hyatt Bangkok", access_type: "public", status: "active", last_scanned: "2 min ago", created_at: "2026-03-01" },
  { id: "q-002", qr_code_id: "PA-QR-20260301-e5f6g7h8", room_number: "1202", property_name: "Grand Hyatt Bangkok", access_type: "public", status: "active", last_scanned: "1 hour ago", created_at: "2026-03-01" },
  { id: "q-003", qr_code_id: "PA-QR-20260301-i9j0k1l2", room_number: "1203", property_name: "Grand Hyatt Bangkok", access_type: "restricted", status: "active", last_scanned: "5 min ago", created_at: "2026-03-01" },
  { id: "q-004", qr_code_id: "PA-QR-20260305-m3n4o5p6", room_number: "1301", property_name: "Siam Kempinski", access_type: "restricted", status: "active", last_scanned: null, created_at: "2026-03-05" },
  { id: "q-005", qr_code_id: "PA-QR-20260305-q7r8s9t0", room_number: "1302", property_name: "Siam Kempinski", access_type: "public", status: "suspended", last_scanned: "3 days ago", created_at: "2026-03-05" },
  { id: "q-006", qr_code_id: "PA-QR-20260310-u1v2w3x4", room_number: "P-01", property_name: "Centara Grand", access_type: "public", status: "active", last_scanned: "30 min ago", created_at: "2026-03-10" },
];

export default function QRManagementPage() {
  const columns = useMemo<MRT_ColumnDef<QRCode>[]>(
    () => [
      {
        accessorKey: "qr_code_id",
        header: "QR Code ID",
        size: 220,
        Cell: ({ cell }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <QrCode size={14} strokeWidth={1.5} />
            <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem" }}>{cell.getValue<string>()}</Box>
          </Box>
        ),
      },
      { accessorKey: "room_number", header: "Room", size: 80, Cell: ({ cell }) => <Box sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 600 }}>{cell.getValue<string>()}</Box> },
      { accessorKey: "property_name", header: "Property", size: 180 },
      {
        accessorKey: "access_type",
        header: "Access",
        size: 110,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          return (
            <Chip
              icon={val === "public" ? <Shield size={12} /> : <ShieldOff size={12} />}
              label={val.charAt(0).toUpperCase() + val.slice(1)}
              size="small"
              variant="outlined"
              color={val === "public" ? "info" : "warning"}
              sx={{ fontSize: "0.6875rem" }}
            />
          );
        },
        filterVariant: "select",
        filterSelectOptions: ["public", "restricted"],
      },
      { accessorKey: "status", header: "Status", size: 100, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} /> },
      {
        accessorKey: "last_scanned",
        header: "Last Scanned",
        size: 120,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | null>();
          return val ? (
            <Box sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{val}</Box>
          ) : (
            <Box sx={{ fontSize: "0.75rem", color: "text.disabled", fontStyle: "italic" }}>Never</Box>
          );
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns, data: DEMO,
    enableColumnActions: false, enablePagination: true, enableSorting: true, enableGlobalFilter: true, enableRowSelection: true, enableRowActions: true, positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View QR"><IconButton size="small" onClick={() => toast.info(`View QR ${row.original.qr_code_id}`)}><Eye size={16} /></IconButton></Tooltip>
      </Box>
    ),
    renderTopToolbarCustomActions: ({ table }) => {
      const sel = table.getSelectedRowModel().rows.length;
      return sel > 0 ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button size="small" variant="outlined" onClick={() => toast.info("Bulk access type — coming soon")}>Change Access ({sel})</Button>
        </Box>
      ) : null;
    },
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => <EmptyState title="No QR codes yet" description="Generate QR codes for your rooms" actionLabel="Generate QR Batch" onAction={() => toast.info("Feature coming soon")} />,
  });

  return (
    <Box>
      <PageHeader
        title="QR Management"
        subtitle="Generate, manage, and monitor QR codes for rooms"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />} onClick={() => toast.info("Refresh — coming soon")}>Refresh</Button>
            <Button variant="contained" startIcon={<QrCode size={16} />} size="small" onClick={() => toast.info("Generate batch — coming soon")}>Generate Batch</Button>
          </Box>
        }
      />
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}><MaterialReactTable table={table} /></CardContent></Card>
    </Box>
  );
}
