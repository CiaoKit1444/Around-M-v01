/**
 * CatalogPage — Service Catalog (SKU) management.
 *
 * Shows catalog items with pricing, category, provider, and availability.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  provider_name: string;
  category: string;
  price: number;
  currency: string;
  unit: string;
  status: string;
}

const DEMO: CatalogItem[] = [
  { id: "ci-001", sku: "SPA-THM-60", name: "Thai Massage 60 min", provider_name: "Thai Wellness Spa Co.", category: "Spa & Wellness", price: 2500, currency: "THB", unit: "session", status: "available" },
  { id: "ci-002", sku: "SPA-ART-90", name: "Aromatherapy 90 min", provider_name: "Thai Wellness Spa Co.", category: "Spa & Wellness", price: 3800, currency: "THB", unit: "session", status: "available" },
  { id: "ci-003", sku: "FNB-BRK-BUF", name: "Breakfast Buffet", provider_name: "Bangkok Gourmet Catering", category: "Food & Beverage", price: 890, currency: "THB", unit: "person", status: "available" },
  { id: "ci-004", sku: "FNB-AFT-SET", name: "Afternoon Tea Set", provider_name: "Bangkok Gourmet Catering", category: "Food & Beverage", price: 1200, currency: "THB", unit: "set", status: "available" },
  { id: "ci-005", sku: "LND-EXP-5KG", name: "Express Laundry 5kg", provider_name: "Siam Laundry Express", category: "Laundry", price: 450, currency: "THB", unit: "batch", status: "available" },
  { id: "ci-006", sku: "TRN-APT-SED", name: "Airport Transfer (Sedan)", provider_name: "Royal Limousine Service", category: "Transportation", price: 1800, currency: "THB", unit: "trip", status: "available" },
  { id: "ci-007", sku: "AMN-FLR-PRE", name: "Premium Flower Arrangement", provider_name: "Artisan Florist", category: "Amenities", price: 2200, currency: "THB", unit: "piece", status: "pending" },
];

export default function CatalogPage() {
  const columns = useMemo<MRT_ColumnDef<CatalogItem>[]>(
    () => [
      { accessorKey: "sku", header: "SKU", size: 120, Cell: ({ cell }) => <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", fontWeight: 600 }}>{cell.getValue<string>()}</Box> },
      { accessorKey: "name", header: "Item Name", size: 200, Cell: ({ cell }) => <Box sx={{ fontWeight: 500 }}>{cell.getValue<string>()}</Box> },
      { accessorKey: "provider_name", header: "Provider", size: 180 },
      { accessorKey: "category", header: "Category", size: 130 },
      {
        accessorKey: "price",
        header: "Price",
        size: 100,
        Cell: ({ row }) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {row.original.price.toLocaleString()} <Box component="span" sx={{ fontWeight: 400, color: "text.secondary", fontSize: "0.6875rem" }}>{row.original.currency}</Box>
          </Box>
        ),
      },
      { accessorKey: "unit", header: "Unit", size: 80, Cell: ({ cell }) => <Box sx={{ color: "text.secondary", fontSize: "0.75rem" }}>/{cell.getValue<string>()}</Box> },
      { accessorKey: "status", header: "Status", size: 100, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} /> },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns, data: DEMO,
    enableColumnActions: false, enablePagination: true, enableSorting: true, enableGlobalFilter: true, enableRowActions: true, positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View"><IconButton size="small" onClick={() => toast.info(`View ${row.original.name}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => toast.info(`Edit ${row.original.name}`)}><Edit size={16} /></IconButton></Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => <EmptyState title="No catalog items yet" description="Add service items with pricing" actionLabel="Add Item" onAction={() => toast.info("Feature coming soon")} />,
  });

  return (
    <Box>
      <PageHeader title="Service Catalog" subtitle="Manage service items (SKUs) with pricing and terms" actions={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" size="small" onClick={() => toast.info("Bulk import — coming soon")}>Bulk Import</Button>
          <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => toast.info("Feature coming soon")}>Add Item</Button>
        </Box>
      } />
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}><MaterialReactTable table={table} /></CardContent></Card>
    </Box>
  );
}
