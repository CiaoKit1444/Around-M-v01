/**
 * CatalogPage — Service Catalog (SKU) management.
 *
 * Design: Precision Studio — table with pricing, SKU codes, and provider links.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 */
import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Alert, Chip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Upload, Package, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import type { CSVColumn } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import { useCatalogItems } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoCatalog } from "@/lib/api/demo-data";
import type { CatalogItem } from "@/lib/api/types";

export default function CatalogPage() {
  const [, navigate] = useLocation();
  // Stabilize params with useState — inline {} creates new ref each render → infinite re-fetches
  const [params] = useState(() => ({}));
  const [demoData] = useState(() => getDemoCatalog());
  const query = useCatalogItems(params);
  const { data, isLoading, isDemo } = useDemoFallback(query, demoData);

  const csvColumns = useMemo<CSVColumn<CatalogItem>[]>(() => [
    { header: "SKU", accessor: "sku" },
    { header: "Name", accessor: "name" },
    { header: "Category", accessor: "category" },
    { header: "Unit Price", accessor: "price" },
    { header: "Currency", accessor: "currency" },
    { header: "Unit", accessor: "unit" },
    { header: "Status", accessor: "status" },
  ], []);
  const { exportCSV, exporting } = useExportCSV<CatalogItem>("catalog", csvColumns);

  const columns = useMemo<MRT_ColumnDef<CatalogItem>[]>(
    () => [
      {
        accessorKey: "sku",
        header: "SKU",
        size: 120,
        Cell: ({ cell }) => (
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", fontWeight: 600, color: "primary.main" }}>{cell.getValue<string>()}</Box>
        ),
      },
      {
        accessorKey: "name",
        header: "Item Name",
        size: 220,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 28, height: 28, borderRadius: 0.75, bgcolor: "action.hover", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={14} />
            </Box>
            <Box>
              <Box sx={{ fontWeight: 500, fontSize: "0.8125rem" }}>{row.original.name}</Box>
              <Box sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{row.original.provider_name}</Box>
            </Box>
          </Box>
        ),
      },
      {
        accessorKey: "category",
        header: "Category",
        size: 130,
        Cell: ({ cell }) => <Chip label={cell.getValue<string>()} size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 22 }} />,
      },
      {
        accessorKey: "price",
        header: "Price",
        size: 120,
        Cell: ({ row }) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {row.original.price.toLocaleString()}{" "}
            <Box component="span" sx={{ fontWeight: 400, color: "text.secondary", fontSize: "0.6875rem" }}>{row.original.currency}</Box>
          </Box>
        ),
      },
      {
        accessorKey: "unit",
        header: "Unit",
        size: 80,
        Cell: ({ cell }) => <Box sx={{ color: "text.secondary", fontSize: "0.75rem" }}>/{cell.getValue<string>()}</Box>,
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 100,
        Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />,
        filterVariant: "select",
        filterSelectOptions: ["available", "unavailable", "pending"],
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
        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/catalog/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/catalog/${row.original.id}/edit`)}><Edit size={16} /></IconButton></Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => (
      <EmptyState title="No catalog items yet" description="Add service items with pricing" actionLabel="Add Item" onAction={() => navigate("/admin/catalog/new")} />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Service Catalog"
        subtitle="Manage service items (SKUs) with pricing and terms"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
            <Button variant="outlined" startIcon={<Upload size={16} />} size="small" onClick={() => navigate("/admin/catalog/import")}>Bulk Import</Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/admin/catalog/new")}>Add Item</Button>
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
