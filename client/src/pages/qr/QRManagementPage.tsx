/**
 * QRManagementPage — QR code lifecycle management.
 *
 * Design: Precision Studio — table with status indicators, access type badges, and bulk operations.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 * Bulk ops: Batch generate QR codes, bulk change access type.
 */
import { useMemo, useState, useCallback } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Chip, Typography, Alert } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { QrCode, Eye, Lock, Unlock, RefreshCw, Plus, Printer, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import QRBatchGenerateDialog from "@/components/dialogs/QRBatchGenerateDialog";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoQRCodes } from "@/lib/api/demo-data";
import type { QRCode as QRCodeType } from "@/lib/api/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qrApi } from "@/lib/api/endpoints";
import { toast } from "sonner";

export default function QRManagementPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const propertyId = "pr-001";
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const { exportCSV, exporting } = useExportCSV<QRCodeType>("qr-codes", [
    { header: "QR Code ID", accessor: "qr_code_id" },
    { header: "Room", accessor: "room_number" },
    { header: "Property", accessor: "property_name" },
    { header: "Access Type", accessor: "access_type" },
    { header: "Status", accessor: "status" },
    { header: "Scan Count", accessor: "scan_count" },
    { header: "Expires At", accessor: (r) => { const e = (r as unknown as Record<string, unknown>).expires_at; return e ? new Date(e as string).toLocaleDateString() : "Never"; } },
  ]);

  const query = useQuery({
    queryKey: ["qr", propertyId],
    queryFn: () => qrApi.list(propertyId),
    staleTime: 15_000,
  });
  const { data, isLoading, isDemo } = useDemoFallback(query, getDemoQRCodes());

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["qr"] });
  }, [queryClient]);

  const handleBulkSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["qr"] });
  }, [queryClient]);

  const handleBulkAccessChange = useCallback(async (rows: QRCodeType[], newType: "public" | "restricted") => {
    try {
      await Promise.all(
        rows.map((row) => qrApi.updateAccessType(propertyId, row.id, newType))
      );
      toast.success(`Updated ${rows.length} QR codes to ${newType}`);
      queryClient.invalidateQueries({ queryKey: ["qr"] });
    } catch {
      toast.error("Failed to update some QR codes");
    }
  }, [propertyId, queryClient]);

  const columns = useMemo<MRT_ColumnDef<QRCodeType>[]>(
    () => [
      {
        accessorKey: "qr_code_id",
        header: "QR Code ID",
        size: 220,
        Cell: ({ cell }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <QrCode size={14} strokeWidth={1.5} />
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", fontWeight: 600, color: "primary.main" }}>{cell.getValue<string>()}</Typography>
          </Box>
        ),
      },
      {
        accessorKey: "room_number",
        header: "Room",
        size: 80,
        Cell: ({ cell }) => <Chip label={cell.getValue<string>()} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.6875rem", height: 22 }} />,
      },
      { accessorKey: "property_name", header: "Property", size: 180 },
      {
        accessorKey: "access_type",
        header: "Access",
        size: 110,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          return (
            <Chip
              icon={type === "public" ? <Unlock size={12} /> : <Lock size={12} />}
              label={type.toUpperCase()}
              size="small"
              sx={{
                height: 22, fontSize: "0.6rem", fontWeight: 700,
                bgcolor: type === "public" ? "#f0fdf4" : "#fef2f2",
                color: type === "public" ? "#166534" : "#991b1b",
                border: `1px solid ${type === "public" ? "#bbf7d0" : "#fecaca"}`,
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          );
        },
        filterVariant: "select",
        filterSelectOptions: ["public", "restricted"],
      },
      { accessorKey: "status", header: "Status", size: 100, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />, filterVariant: "select", filterSelectOptions: ["active", "inactive", "suspended", "revoked"] },
      {
        accessorKey: "scan_count",
        header: "Scans",
        size: 80,
        Cell: ({ cell }) => <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.8125rem" }}>{cell.getValue<number>()}</Typography>,
      },
      {
        accessorKey: "last_scanned",
        header: "Last Scanned",
        size: 150,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          if (!val) return <Typography sx={{ color: "text.disabled", fontSize: "0.75rem", fontStyle: "italic" }}>Never</Typography>;
          return <Typography sx={{ fontSize: "0.75rem" }}>{new Date(val).toLocaleString()}</Typography>;
        },
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: data?.items ?? [],
    rowCount: data?.total ?? 0,
    state: { isLoading },
    enableColumnActions: false, enablePagination: true, enableSorting: true, enableGlobalFilter: true, enableRowSelection: true, enableRowActions: true, positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/qr/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
    ),
    renderTopToolbarCustomActions: ({ table: t }) => {
      const selectedRows = t.getSelectedRowModel().rows;
      const sel = selectedRows.length;
      if (sel === 0) return null;

      const handleBulkPrint = () => {
        const ids = selectedRows.map((r) => r.original.id).join(",");
        navigate(`/qr/print?ids=${ids}`);
      };

      return (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<Printer size={14} />}
            onClick={handleBulkPrint}
            sx={{ bgcolor: "primary.main" }}
          >
            Print Selected ({sel})
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Unlock size={14} />}
            onClick={() => handleBulkAccessChange(selectedRows.map((r) => r.original), "public")}
          >
            Set Public ({sel})
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Lock size={14} />}
            onClick={() => handleBulkAccessChange(selectedRows.map((r) => r.original), "restricted")}
          >
            Set Restricted ({sel})
          </Button>
        </Box>
      );
    },
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => (
      <EmptyState
        title="No QR codes yet"
        description="Generate QR codes for your rooms"
        actionLabel="Generate QR Batch"
        onAction={() => setBatchDialogOpen(true)}
      />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="QR Management"
        subtitle="Generate, manage, and monitor QR codes for rooms"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<Download size={14} />} onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />} onClick={handleRefresh}>
              Refresh
            </Button>
            <Button variant="outlined" size="small" startIcon={<Printer size={14} />} onClick={() => navigate("/qr/print?propertyId=" + propertyId)}>
              Print All
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => setBatchDialogOpen(true)}>
              Generate Batch
            </Button>
          </Box>
        }
      />
      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>}
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>{isLoading ? <TableSkeleton rows={6} columns={5} /> : <MaterialReactTable table={table} />}</CardContent></Card>

      {/* QR Batch Generate Dialog */}
      <QRBatchGenerateDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        propertyId={propertyId}
        propertyName="The Grand Palace Hotel"
        onSuccess={handleBulkSuccess}
      />
    </Box>
  );
}
