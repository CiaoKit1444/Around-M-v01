/**
 * ProvidersPage — Service provider management with data table.
 *
 * Design: Precision Studio — table with category badges and ratings.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 */
import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Alert, Chip, Rating } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Store, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import type { CSVColumn } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import { useProviders } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoProviders } from "@/lib/api/demo-data";
import type { ServiceProvider } from "@/lib/api/types";

export default function ProvidersPage() {
  const [, navigate] = useLocation();
  // Stabilize params with useState — inline {} creates new ref each render → infinite re-fetches
  const [params] = useState(() => ({}));
  const [demoData] = useState(() => getDemoProviders());
  const query = useProviders(params);
  const { data, isLoading, isDemo } = useDemoFallback(query, demoData);

  const csvColumns = useMemo<CSVColumn<ServiceProvider>[]>(() => [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Category", accessor: "category" },
    { header: "Contact Person", accessor: "contact_person" },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone" },
    { header: "Status", accessor: "status" },
    { header: "Rating", accessor: "rating" },
  ], []);
  const { exportCSV, exporting } = useExportCSV<ServiceProvider>("providers", csvColumns);

  const columns = useMemo<MRT_ColumnDef<ServiceProvider>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Provider Name",
        size: 220,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "secondary.main", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Store size={16} color="white" />
            </Box>
            <Box>
              <Box sx={{ fontWeight: 500, fontSize: "0.8125rem" }}>{row.original.name}</Box>
              <Box sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{row.original.contact_person}</Box>
            </Box>
          </Box>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 140,
        Cell: ({ cell }) => <Chip label={cell.getValue<string>()} size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 22 }} />,
      },
      {
        accessorKey: "service_area",
        header: "Service Area",
        size: 140,
      },
      {
        accessorKey: "rating",
        header: "Rating",
        size: 140,
        Cell: ({ cell }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Rating value={cell.getValue<number>()} precision={0.1} size="small" readOnly />
            <Box sx={{ fontSize: "0.75rem", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{cell.getValue<number>()}</Box>
          </Box>
        ),
      },
      {
        accessorKey: "catalog_items_count",
        header: "Items",
        size: 70,
        Cell: ({ cell }) => <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{cell.getValue<number>()}</Box>,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />,
        filterVariant: "select",
        filterSelectOptions: ["active", "pending", "inactive"],
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
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/providers/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/providers/${row.original.id}/edit`)}><Edit size={16} /></IconButton></Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => (
      <EmptyState title="No service providers yet" description="Onboard your first service provider" actionLabel="Add Provider" onAction={() => navigate("/admin/providers/new")} />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Service Providers"
        subtitle="Manage service provider organizations and their catalogs"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/admin/providers/new")}>Add Provider</Button>
          </Box>
        }
      />
      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          {isLoading ? (
            <TableSkeleton rows={6} columns={5} />
          ) : (
            <MaterialReactTable table={table} />
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
