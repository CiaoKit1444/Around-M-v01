/**
 * PropertiesPage — Property management with data table.
 *
 * Design: Precision Studio — full-width table with property type badges.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 */
import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Alert, Chip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Building2, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import { PropertyOnboardingWizard } from "@/components/dialogs/PropertyOnboardingWizard";
import { useProperties } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoProperties } from "@/lib/api/demo-data";
import type { Property } from "@/lib/api/types";

export default function PropertiesPage() {
  // PropertyOnboardingWizard is rendered at the bottom of the component
  const [, navigate] = useLocation();
  const [wizardOpen, setWizardOpen] = useState(false);
  // Stabilize params with useState — inline {} creates new ref each render → infinite re-fetches
  const [params] = useState(() => ({}));
  const [demoData] = useState(() => getDemoProperties());
  const query = useProperties(params);
  const { data, isLoading, isDemo } = useDemoFallback(query, demoData);
  const { exportCSV, exporting } = useExportCSV<Property>("properties", [
    { header: "Name", accessor: "name" },
    { header: "Partner", accessor: "partner_name" },
    { header: "Country", accessor: "country" },
    { header: "City", accessor: "city" },
    { header: "Status", accessor: "status" },
    { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
  ]);

  const columns = useMemo<MRT_ColumnDef<Property>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Property Name",
        size: 240,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: 1, bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Building2 size={16} color="white" />
            </Box>
            <Box>
              <Box sx={{ fontWeight: 500, fontSize: "0.8125rem" }}>{row.original.name}</Box>
              <Box sx={{ fontSize: "0.6875rem", color: "text.secondary" }}>{row.original.partner_name}</Box>
            </Box>
          </Box>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        size: 100,
        Cell: ({ cell }) => (
          <Chip label={cell.getValue<string>()} size="small" variant="outlined" sx={{ fontSize: "0.6875rem", height: 22 }} />
        ),
      },
      {
        accessorKey: "city",
        header: "Location",
        size: 140,
        Cell: ({ row }) => (
          <Box sx={{ fontSize: "0.8125rem" }}>
            {row.original.city}, {row.original.country}
          </Box>
        ),
      },
      {
        accessorKey: "rooms_count",
        header: "Rooms",
        size: 80,
        Cell: ({ cell }) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{cell.getValue<number>()}</Box>
        ),
      },
      {
        accessorKey: "active_qr_count",
        header: "Active QRs",
        size: 100,
        Cell: ({ cell }) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{cell.getValue<number>()}</Box>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 120,
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
    enableColumnFilters: true,
    enablePagination: true,
    enableSorting: true,
    enableGlobalFilter: true,
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/admin/properties/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/admin/properties/${row.original.id}/edit`)}><Edit size={16} /></IconButton></Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => (
      <EmptyState title="No properties yet" description="Add a property to start managing rooms and services" actionLabel="Add Property" onAction={() => navigate("/admin/properties/new")} />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Properties"
        subtitle="Manage hotels, resorts, and service locations"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
            <Button variant="outlined" startIcon={<Building2 size={16} />} size="small" onClick={() => setWizardOpen(true)}>Setup Wizard</Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/admin/properties/new")}>Add Property</Button>
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
      <PropertyOnboardingWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={(id) => navigate(`/admin/properties/${id}`)}
      />
    </Box>
  );
}
