/**
 * PropertiesPage — Property management with data table.
 *
 * Design: Precision Studio — full-width table with contextual actions.
 * Properties belong to Partners. Shows location, timezone, room count.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, MapPin } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface Property {
  id: string;
  name: string;
  partner_name: string;
  address: string;
  timezone: string;
  currency: string;
  rooms_count: number;
  status: string;
}

const DEMO_PROPERTIES: Property[] = [
  { id: "pa-prp-001", name: "Grand Hyatt Bangkok", partner_name: "Grand Hyatt Group", address: "494 Rajdamri Rd, Bangkok", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 320, status: "active" },
  { id: "pa-prp-002", name: "Grand Hyatt Erawan", partner_name: "Grand Hyatt Group", address: "494 Rajdamri Rd, Bangkok", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 380, status: "active" },
  { id: "pa-prp-003", name: "Siam Kempinski Hotel", partner_name: "Siam Hospitality Corp", address: "991/9 Rama I Rd, Bangkok", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 280, status: "active" },
  { id: "pa-prp-004", name: "Centara Grand at Central World", partner_name: "Centara Hotels & Resorts", address: "999/99 Rama I Rd, Bangkok", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 505, status: "active" },
  { id: "pa-prp-005", name: "Centara Grand Beach Resort Phuket", partner_name: "Centara Hotels & Resorts", address: "683 Patak Rd, Phuket", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 262, status: "active" },
  { id: "pa-prp-006", name: "Anantara Riverside Bangkok", partner_name: "Minor International", address: "257/1-3 Charoennakorn Rd", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 396, status: "pending" },
];

export default function PropertiesPage() {
  const columns = useMemo<MRT_ColumnDef<Property>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Property Name",
        size: 220,
        Cell: ({ cell }) => <Box sx={{ fontWeight: 500 }}>{cell.getValue<string>()}</Box>,
      },
      {
        accessorKey: "partner_name",
        header: "Partner",
        size: 180,
      },
      {
        accessorKey: "address",
        header: "Location",
        size: 200,
        Cell: ({ cell }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
            <MapPin size={12} />
            {cell.getValue<string>()}
          </Box>
        ),
      },
      {
        accessorKey: "rooms_count",
        header: "Rooms",
        size: 80,
        Cell: ({ cell }) => (
          <Box sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
            {cell.getValue<number>()}
          </Box>
        ),
      },
      {
        accessorKey: "currency",
        header: "Currency",
        size: 80,
        Cell: ({ cell }) => (
          <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>
            {cell.getValue<string>()}
          </Box>
        ),
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
    data: DEMO_PROPERTIES,
    enableColumnActions: false,
    enablePagination: true,
    enableSorting: true,
    enableGlobalFilter: true,
    enableRowActions: true,
    positionActionsColumn: "last",
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
    renderEmptyRowsFallback: () => (
      <EmptyState title="No properties yet" description="Add your first property to get started" actionLabel="Add Property" onAction={() => toast.info("Feature coming soon")} />
    ),
  });

  return (
    <Box>
      <PageHeader title="Properties" subtitle="Manage hotel properties and their configurations" actions={<Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => toast.info("Feature coming soon")}>Add Property</Button>} />
      <Card>
        <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
          <MaterialReactTable table={table} />
        </CardContent>
      </Card>
    </Box>
  );
}
