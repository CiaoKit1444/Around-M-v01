/**
 * PartnersPage — Partner management with data table.
 *
 * Design: Precision Studio — full-width table with contextual actions.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Alert } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit } from "lucide-react";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { usePartners } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoPartners } from "@/lib/api/demo-data";
import type { Partner } from "@/lib/api/types";

export default function PartnersPage() {
  const [, navigate] = useLocation();
  const query = usePartners();
  const { data, isLoading, isDemo } = useDemoFallback(query, getDemoPartners());

  const columns = useMemo<MRT_ColumnDef<Partner>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Partner Name",
        size: 240,
        Cell: ({ cell }) => (
          <Box sx={{ fontWeight: 500 }}>{cell.getValue<string>()}</Box>
        ),
      },
      {
        accessorKey: "email",
        header: "Email",
        size: 200,
        Cell: ({ cell }) => (
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>
            {cell.getValue<string>()}
          </Box>
        ),
      },
      {
        accessorKey: "contact_person",
        header: "Contact",
        size: 150,
      },
      {
        accessorKey: "properties_count",
        header: "Properties",
        size: 100,
        Cell: ({ cell }) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {cell.getValue<number>()}
          </Box>
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
      {
        accessorKey: "created_at",
        header: "Created",
        size: 120,
        Cell: ({ cell }) => (
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", color: "text.secondary" }}>
            {new Date(cell.getValue<string>()).toLocaleDateString()}
          </Box>
        ),
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
        <Tooltip title="View">
          <IconButton size="small" onClick={() => navigate(`/partners/${row.original.id}`)}>
            <Eye size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => navigate(`/partners/${row.original.id}/edit`)}>
            <Edit size={16} />
          </IconButton>
        </Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: {
      sx: {
        fontSize: "0.6875rem",
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        color: "text.secondary",
        bgcolor: "background.default",
        borderBottom: "1px solid",
        borderColor: "divider",
      },
    },
    muiTableBodyCellProps: {
      sx: { fontSize: "0.8125rem", py: 1.25 },
    },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: {
      density: "compact",
      showGlobalFilter: true,
    },
    renderEmptyRowsFallback: () => (
      <EmptyState
        title="No partners yet"
        description="Start by onboarding your first partner"
        actionLabel="Add Partner"
        onAction={() => navigate("/partners/new")}
      />
    ),
  });

  return (
    <Box>
      <PageHeader
        title="Partners"
        subtitle="Manage partner organizations and their properties"
        actions={
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            size="small"
            onClick={() => navigate("/partners/new")}
          >
            Add Partner
          </Button>
        }
      />
      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo data — connect the FastAPI backend to see live data.
        </Alert>
      )}
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <MaterialReactTable table={table} />
        </CardContent>
      </Card>
    </Box>
  );
}
