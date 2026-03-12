/**
 * ProvidersPage — Service Provider management with data table.
 *
 * Shows provider name, category, contact, catalog item count, status.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface Provider {
  id: string;
  name: string;
  category: string;
  contact_email: string;
  contact_phone: string;
  catalog_items: number;
  status: string;
}

const DEMO: Provider[] = [
  { id: "sp-001", name: "Thai Wellness Spa Co.", category: "Spa & Wellness", contact_email: "ops@thaiwellness.com", contact_phone: "+66-2-111-2222", catalog_items: 12, status: "active" },
  { id: "sp-002", name: "Bangkok Gourmet Catering", category: "Food & Beverage", contact_email: "info@bkkgourmet.com", contact_phone: "+66-2-333-4444", catalog_items: 24, status: "active" },
  { id: "sp-003", name: "Siam Laundry Express", category: "Laundry", contact_email: "service@siamlaundry.com", contact_phone: "+66-2-555-6666", catalog_items: 6, status: "active" },
  { id: "sp-004", name: "Royal Limousine Service", category: "Transportation", contact_email: "book@royallimo.com", contact_phone: "+66-2-777-8888", catalog_items: 8, status: "active" },
  { id: "sp-005", name: "Artisan Florist", category: "Amenities", contact_email: "hello@artisanflorist.com", contact_phone: "+66-2-999-0000", catalog_items: 15, status: "pending" },
];

export default function ProvidersPage() {
  const columns = useMemo<MRT_ColumnDef<Provider>[]>(
    () => [
      { accessorKey: "name", header: "Provider Name", size: 200, Cell: ({ cell }) => <Box sx={{ fontWeight: 500 }}>{cell.getValue<string>()}</Box> },
      { accessorKey: "category", header: "Category", size: 140 },
      { accessorKey: "contact_email", header: "Email", size: 180, Cell: ({ cell }) => <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>{cell.getValue<string>()}</Box> },
      { accessorKey: "catalog_items", header: "Catalog Items", size: 110, Cell: ({ cell }) => <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{cell.getValue<number>()}</Box> },
      { accessorKey: "status", header: "Status", size: 100, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />, filterVariant: "select", filterSelectOptions: ["active", "pending", "inactive"] },
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
    renderEmptyRowsFallback: () => <EmptyState title="No providers yet" description="Onboard your first service provider" actionLabel="Add Provider" onAction={() => toast.info("Feature coming soon")} />,
  });

  return (
    <Box>
      <PageHeader title="Service Providers" subtitle="Manage external service providers and their offerings" actions={<Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => toast.info("Feature coming soon")}>Add Provider</Button>} />
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}><MaterialReactTable table={table} /></CardContent></Card>
    </Box>
  );
}
