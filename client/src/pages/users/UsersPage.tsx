/**
 * UsersPage — User management with data table.
 *
 * Shows system users with role, status, last login, and actions.
 */
import { useMemo } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Avatar } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Shield } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  property_scope: string;
  last_login: string;
  status: string;
}

const DEMO: User[] = [
  { id: "u-001", name: "Admin User", email: "admin@peppraround.com", role: "SYSTEM_ADMIN", property_scope: "Global", last_login: "5 min ago", status: "active" },
  { id: "u-002", name: "Somchai K.", email: "somchai@grandhyatt.com", role: "PROPERTY_ADMIN", property_scope: "Grand Hyatt Bangkok", last_login: "1 hour ago", status: "active" },
  { id: "u-003", name: "Nattaya P.", email: "nattaya@siamkempinski.com", role: "PROPERTY_ADMIN", property_scope: "Siam Kempinski", last_login: "3 hours ago", status: "active" },
  { id: "u-004", name: "Priya S.", email: "priya@centara.com", role: "PARTNER_ADMIN", property_scope: "Centara Hotels & Resorts", last_login: "1 day ago", status: "active" },
  { id: "u-005", name: "John D.", email: "john@peppraround.com", role: "ADMIN", property_scope: "Global", last_login: "2 days ago", status: "inactive" },
];

const ROLE_COLORS: Record<string, string> = {
  SYSTEM_ADMIN: "#DC2626",
  ADMIN: "#8B5CF6",
  PARTNER_ADMIN: "#2563EB",
  PROPERTY_ADMIN: "#0EA5E9",
  STAFF: "#737373",
};

export default function UsersPage() {
  const columns = useMemo<MRT_ColumnDef<User>[]>(
    () => [
      {
        accessorKey: "name",
        header: "User",
        size: 200,
        Cell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Avatar sx={{ width: 28, height: 28, fontSize: "0.6875rem", fontWeight: 600, bgcolor: ROLE_COLORS[row.original.role] || "#737373" }}>
              {row.original.name.charAt(0)}
            </Avatar>
            <Box>
              <Box sx={{ fontWeight: 500, fontSize: "0.8125rem" }}>{row.original.name}</Box>
              <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", color: "text.secondary" }}>{row.original.email}</Box>
            </Box>
          </Box>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        size: 140,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Shield size={12} color={ROLE_COLORS[val] || "#737373"} />
              <Box sx={{ fontSize: "0.75rem", fontWeight: 500, color: ROLE_COLORS[val] || "#737373" }}>
                {val.replace(/_/g, " ")}
              </Box>
            </Box>
          );
        },
      },
      { accessorKey: "property_scope", header: "Scope", size: 180 },
      { accessorKey: "last_login", header: "Last Login", size: 120, Cell: ({ cell }) => <Box sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{cell.getValue<string>()}</Box> },
      { accessorKey: "status", header: "Status", size: 90, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} /> },
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
    renderEmptyRowsFallback: () => <EmptyState title="No users yet" description="Invite users to the platform" actionLabel="Invite User" onAction={() => toast.info("Feature coming soon")} />,
  });

  return (
    <Box>
      <PageHeader title="Users" subtitle="Manage platform users and their access" actions={<Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => toast.info("Feature coming soon")}>Invite User</Button>} />
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}><MaterialReactTable table={table} /></CardContent></Card>
    </Box>
  );
}
