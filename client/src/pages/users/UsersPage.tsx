/**
 * UsersPage — User management with data table.
 *
 * Design: Precision Studio — table with role badges, avatar, and status.
 * Data: TanStack Query → backend API, with demo data fallback.
 */
import { useMemo, useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Avatar, Alert } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { Plus, Eye, Edit, Shield, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import type { CSVColumn } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import { useUsers } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoUsers } from "@/lib/api/demo-data";
import type { User } from "@/lib/api/types";

const ROLE_COLORS: Record<string, string> = {
  SYSTEM_ADMIN: "#DC2626", ADMIN: "#8B5CF6", PARTNER_ADMIN: "#2563EB", PROPERTY_ADMIN: "#0EA5E9", STAFF: "#737373",
};

export default function UsersPage() {
  const [, navigate] = useLocation();
  // Stabilize params with useState — inline {} creates new ref each render → infinite re-fetches
  const [params] = useState(() => ({}));
  const [demoData] = useState(() => getDemoUsers());
  const query = useUsers(params);
  const { data, isLoading, isDemo } = useDemoFallback(query, demoData);

  const csvColumns = useMemo<CSVColumn<User>[]>(() => [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Role", accessor: "role" },
    { header: "Status", accessor: "status" },
    { header: "Last Login", accessor: (r) => r.last_login ? new Date(r.last_login).toLocaleDateString() : "Never" },
    { header: "Created", accessor: (r) => new Date(r.created_at).toLocaleDateString() },
  ], []);
  const { exportCSV, exporting } = useExportCSV<User>("users", csvColumns);

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
              <Box sx={{ fontSize: "0.75rem", fontWeight: 500, color: ROLE_COLORS[val] || "#737373" }}>{val.replace(/_/g, " ")}</Box>
            </Box>
          );
        },
        filterVariant: "select",
        filterSelectOptions: ["SYSTEM_ADMIN", "ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "STAFF"],
      },
      { accessorKey: "property_scope", header: "Scope", size: 180 },
      {
        accessorKey: "last_login_at",
        header: "Last Login",
        size: 140,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          return <Box sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{val ? new Date(val).toLocaleString() : "Never"}</Box>;
        },
      },
      { accessorKey: "status", header: "Status", size: 90, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} /> },
    ],
    []
  );

  const table = useMaterialReactTable({
    columns,
    data: data?.items ?? [],
    rowCount: data?.total ?? 0,
    state: { isLoading },
    enableColumnActions: false, enablePagination: true, enableSorting: true, enableGlobalFilter: true, enableRowActions: true, positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/admin/users/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
        <Tooltip title="Edit"><IconButton size="small" onClick={() => navigate(`/admin/users/${row.original.id}/edit`)}><Edit size={16} /></IconButton></Tooltip>
      </Box>
    ),
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => <EmptyState title="No users yet" description="Invite users to the platform" actionLabel="Invite User" onAction={() => navigate("/admin/users/invite")} />,
  });

  return (
    <Box>
      <PageHeader title="Users" subtitle="Manage platform users and their access" actions={
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
          <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/admin/users/invite")}>Invite User</Button>
        </Box>
      } />
      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the backend API to see live data.</Alert>}
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>{isLoading ? <TableSkeleton rows={6} columns={5} /> : <MaterialReactTable table={table} />}</CardContent></Card>
    </Box>
  );
}
