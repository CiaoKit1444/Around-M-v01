/**
 * PartnersPage — Partner management with data table.
 *
 * Design: Precision Studio — full-width table with contextual actions.
 * Uses material-react-table for search, sort, filter, pagination.
 */
import { useMemo, useState } from "react";
import { Box, Button, Chip, IconButton, Tooltip, Card, CardContent } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, MoreVertical } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface Partner {
  id: string;
  name: string;
  contact_email: string;
  contact_phone: string;
  status: string;
  properties_count: number;
  created_at: string;
}

// Demo data
const DEMO_PARTNERS: Partner[] = [
  { id: "pa-ptr-001", name: "Grand Hyatt Group", contact_email: "ops@grandhyatt.com", contact_phone: "+66-2-254-1234", status: "active", properties_count: 3, created_at: "2026-01-15" },
  { id: "pa-ptr-002", name: "Siam Hospitality Corp", contact_email: "admin@siamhospitality.com", contact_phone: "+66-2-658-0000", status: "active", properties_count: 5, created_at: "2026-01-20" },
  { id: "pa-ptr-003", name: "Centara Hotels & Resorts", contact_email: "tech@centara.com", contact_phone: "+66-2-769-1234", status: "active", properties_count: 8, created_at: "2026-02-01" },
  { id: "pa-ptr-004", name: "Minor International", contact_email: "digital@minor.com", contact_phone: "+66-2-365-7500", status: "pending", properties_count: 0, created_at: "2026-02-28" },
  { id: "pa-ptr-005", name: "Dusit Thani Group", contact_email: "it@dusit.com", contact_phone: "+66-2-200-9000", status: "inactive", properties_count: 2, created_at: "2025-11-10" },
];

export default function PartnersPage() {
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
        accessorKey: "contact_email",
        header: "Email",
        size: 200,
        Cell: ({ cell }) => (
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>
            {cell.getValue<string>()}
          </Box>
        ),
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
            {cell.getValue<string>()}
          </Box>
        ),
      },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: DEMO_PARTNERS,
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
          <IconButton size="small" onClick={() => toast.info(`View ${row.original.name}`)}>
            <Eye size={16} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => toast.info(`Edit ${row.original.name}`)}>
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
        onAction={() => toast.info("Feature coming soon")}
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
            onClick={() => toast.info("Feature coming soon")}
          >
            Add Partner
          </Button>
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
