/**
 * QRManagementPage — QR code lifecycle management.
 *
 * Design: Precision Studio — table with status indicators, access type badges, and bulk operations.
 * Data: TanStack Query → FastAPI backend, with demo data fallback.
 * Bulk ops: Batch generate QR codes, bulk change access type.
 */
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { Box, Button, Card, CardContent, IconButton, Tooltip, Chip, Typography, Alert, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from "@mui/material";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { QrCode, Eye, Lock, Unlock, RefreshCw, Plus, Printer, Download, CalendarClock, ShieldOff } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import QRBatchGenerateDialog from "@/components/dialogs/QRBatchGenerateDialog";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoQRCodes } from "@/lib/api/demo-data";
import type { QRCode as QRCodeType } from "@/lib/api/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qrApi } from "@/lib/api/endpoints";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { toast } from "sonner";

export default function QRManagementPage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { propertyId } = useActiveProperty();
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  // Cross-page selection: when true, all items across all pages are considered selected
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  // Set Expiry Date bulk dialog
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTargetIds, setExpiryTargetIds] = useState<string[]>([]);
  const [expiryUpdating, setExpiryUpdating] = useState(false);
  // Persist selected row IDs across pagination using a Set stored in a ref
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  // Revoke All Selected dialog
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeTargetIds, setRevokeTargetIds] = useState<string[]>([]);
  const [revokeUpdating, setRevokeUpdating] = useState(false);

  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Helper: clear all selection state
  const clearAllSelection = useCallback(() => {
    selectedIdsRef.current.clear();
    setRowSelection({});
    setAllPagesSelected(false);
  }, []);

  // Escape key shortcut to clear selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIdsRef.current.size > 0) {
        clearAllSelection();
        toast.info("Selection cleared");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [clearAllSelection]);
  const { exportCSV, exporting } = useExportCSV<QRCodeType>("qr-codes", [
    { header: "QR Code ID", accessor: "qr_code_id" },
    { header: "Room", accessor: "room_number" },
    { header: "Property", accessor: "property_name" },
    { header: "Access Type", accessor: "access_type" },
    { header: "Status", accessor: "status" },
    { header: "Scan Count", accessor: "scan_count" },
    { header: "Expires At", accessor: (r) => { const e = (r as unknown as Record<string, unknown>).expires_at; return e ? new Date(e as string).toLocaleDateString() : "Never"; } },
  ]);

  const query = useQuery({
    queryKey: ["qr", propertyId],
    queryFn: () => qrApi.list(propertyId!),
    enabled: !!propertyId,
    staleTime: 15_000,
  });
  const { data, isLoading, isDemo } = useDemoFallback(query, getDemoQRCodes());

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["qr"] });
  }, [queryClient]);

  const handleBulkSuccess = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["qr"] });
  }, [queryClient]);

  const handleBulkAccessChange = useCallback(async (rows: QRCodeType[], newType: "public" | "restricted") => {
    try {
      await Promise.all(
        rows.map((row) => qrApi.updateAccessType(propertyId!, row.id, newType))
      );
      toast.success(`Updated ${rows.length} QR codes to ${newType}`);
      queryClient.invalidateQueries({ queryKey: ["qr"] });
    } catch {
      toast.error("Failed to update some QR codes");
    }
  }, [propertyId, queryClient]);

  const columns = useMemo<MRT_ColumnDef<QRCodeType>[]>(
    () => [
      {
        accessorKey: "qr_code_id",
        header: "QR Code ID",
        size: 220,
        Cell: ({ cell }) => (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <QrCode size={14} strokeWidth={1.5} />
            <Typography sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem", fontWeight: 600, color: "primary.main" }}>{cell.getValue<string>()}</Typography>
          </Box>
        ),
      },
      {
        accessorKey: "room_number",
        header: "Room",
        size: 80,
        Cell: ({ cell }) => <Chip label={cell.getValue<string>()} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: "0.6875rem", height: 22 }} />,
      },
      { accessorKey: "property_name", header: "Property", size: 180 },
      {
        accessorKey: "access_type",
        header: "Access",
        size: 110,
        Cell: ({ cell }) => {
          const type = cell.getValue<string>();
          return (
            <Chip
              icon={type === "public" ? <Unlock size={12} /> : <Lock size={12} />}
              label={type.toUpperCase()}
              size="small"
              sx={{
                height: 22, fontSize: "0.6rem", fontWeight: 700,
                bgcolor: type === "public" ? "#f0fdf4" : "#fef2f2",
                color: type === "public" ? "#166534" : "#991b1b",
                border: `1px solid ${type === "public" ? "#bbf7d0" : "#fecaca"}`,
                "& .MuiChip-icon": { color: "inherit" },
              }}
            />
          );
        },
        filterVariant: "select",
        filterSelectOptions: ["public", "restricted"],
      },
      { accessorKey: "status", header: "Status", size: 100, Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />, filterVariant: "select", filterSelectOptions: ["active", "inactive", "suspended", "revoked"] },
      {
        accessorKey: "scan_count",
        header: "Scans",
        size: 80,
        Cell: ({ cell }) => <Typography sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, fontSize: "0.8125rem" }}>{cell.getValue<number>()}</Typography>,
      },
      {
        accessorKey: "last_scanned",
        header: "Last Scanned",
        size: 150,
        Cell: ({ cell }) => {
          const val = cell.getValue<string>();
          if (!val) return <Typography sx={{ color: "text.disabled", fontSize: "0.75rem", fontStyle: "italic" }}>Never</Typography>;
          return <Typography sx={{ fontSize: "0.75rem" }}>{new Date(val).toLocaleString()}</Typography>;
        },
      },
    ],
    []
  );

  // When data changes (page change), rebuild rowSelection from persisted IDs
  useEffect(() => {
    if (!data?.items) return;
    const newSel: Record<string, boolean> = {};
    data.items.forEach((item) => {
      if (selectedIdsRef.current.has(item.id)) newSel[item.id] = true;
    });
    setRowSelection(newSel);
  }, [data?.items]);

  const handleRowSelectionChange = useCallback((updater: ((old: Record<string, boolean>) => Record<string, boolean>) | Record<string, boolean>) => {
    setRowSelection((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Sync additions and removals into the persistent ref
      Object.entries(next).forEach(([id, selected]) => {
        if (selected) selectedIdsRef.current.add(id);
        else selectedIdsRef.current.delete(id);
      });
      // Remove IDs that are no longer selected (deselected on this page)
      Object.keys(prev).forEach((id) => {
        if (!next[id]) selectedIdsRef.current.delete(id);
      });
      return next;
    });
  }, []);

  const table = useMaterialReactTable({
    columns,
    data: data?.items ?? [],
    rowCount: data?.total ?? 0,
    getRowId: (row) => row.id,
    state: { isLoading, rowSelection },
    onRowSelectionChange: handleRowSelectionChange,
    enableColumnActions: false, enablePagination: true, enableSorting: true, enableGlobalFilter: true, enableRowSelection: true, enableRowActions: true, positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Tooltip title="View"><IconButton size="small" onClick={() => navigate(`/qr/${row.original.id}`)}><Eye size={16} /></IconButton></Tooltip>
    ),
    renderTopToolbarCustomActions: ({ table: t }) => {
      const selectedRows = t.getSelectedRowModel().rows;
      const sel = selectedRows.length;
      const allPageRows = t.getRowModel().rows;
      const totalCount = data?.total ?? allPageRows.length;
      const allPageSelected = allPageRows.length > 0 && allPageRows.every((r) => r.getIsSelected());
      const hasMultiplePages = totalCount > allPageRows.length;

      const handleSelectAllPage = () => {
        if (allPageSelected) {
          allPageRows.forEach((r) => r.toggleSelected(false));
          setAllPagesSelected(false);
        } else {
          allPageRows.forEach((r) => r.toggleSelected(true));
        }
      };

      const handleBulkPrint = () => {
        if (allPagesSelected) {
          // Print all items across all pages — pass propertyId so print page fetches all
          navigate(`/qr/print?propertyId=${propertyId}&allPages=true`);
        } else {
          const ids = selectedRows.map((r) => r.original.id).join(",");
          navigate(`/qr/print?ids=${ids}`);
        }
      };

      return (
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          {/* Select All on Page shortcut */}
          <Button
            size="small"
            variant={allPageSelected ? "contained" : "outlined"}
            onClick={handleSelectAllPage}
            sx={{ minWidth: "auto", fontSize: "0.6875rem", fontWeight: 600 }}
          >
            {allPageSelected ? `Deselect All (${allPageRows.length})` : `Select All on Page (${allPageRows.length})`}
          </Button>

          {/* Cross-page select prompt — only shown when all page rows are selected and there are more pages */}
          {allPageSelected && hasMultiplePages && !allPagesSelected && (
            <Button
              size="small"
              variant="text"
              color="primary"
              onClick={() => setAllPagesSelected(true)}
              sx={{ fontSize: "0.6875rem", fontWeight: 600, textDecoration: "underline" }}
            >
              Select all {totalCount} QR codes across all pages
            </Button>
          )}
          {allPagesSelected && (
            <Button
              size="small"
              variant="text"
              color="warning"
              onClick={() => {
                setAllPagesSelected(false);
                allPageRows.forEach((r) => r.toggleSelected(false));
              }}
              sx={{ fontSize: "0.6875rem", fontWeight: 600 }}
            >
              Clear all-pages selection ({totalCount})
            </Button>
          )}

          {(sel > 0 || allPagesSelected) && (
            <>
              <Button
                size="small"
                variant="contained"
                startIcon={<Printer size={14} />}
                onClick={handleBulkPrint}
                sx={{ bgcolor: "primary.main" }}
              >
                Print {allPagesSelected ? `All (${totalCount})` : `Selected (${sel})`}
              </Button>
              {!allPagesSelected && (
                <>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Unlock size={14} />}
                    onClick={() => handleBulkAccessChange(selectedRows.map((r) => r.original), "public")}
                  >
                    Set Public ({sel})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<Lock size={14} />}
                    onClick={() => handleBulkAccessChange(selectedRows.map((r) => r.original), "restricted")}
                  >
                    Set Restricted ({sel})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<CalendarClock size={14} />}
                    onClick={() => {
                      setExpiryTargetIds(selectedRows.map((r) => r.original.id));
                      setExpiryDate("");
                      setExpiryDialogOpen(true);
                    }}
                  >
                    Set Expiry ({sel})
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    startIcon={<ShieldOff size={14} />}
                    onClick={async () => {
                      const ids = selectedRows.map((r) => r.original.id);
                      const confirmed = await guardConfirm({
                        action: "Revoke QR Codes",
                        description: `This will permanently revoke ${ids.length} selected QR code${ids.length !== 1 ? "s" : ""}. Guests using these codes will lose access immediately and codes cannot be re-activated.`,
                        severity: "destructive",
                        confirmLabel: `Revoke ${ids.length} Code${ids.length !== 1 ? "s" : ""}`,
                      });
                      if (!confirmed) return;
                      setRevokeTargetIds(ids);
                      setRevokeReason("");
                      setRevokeDialogOpen(true);
                    }}
                  >
                    Revoke ({sel})
                  </Button>
                </>
              )}
            </>
          )}
        </Box>
      );
    },
    muiTablePaperProps: { elevation: 0, sx: { border: "none" } },
    muiTableHeadCellProps: { sx: { fontSize: "0.6875rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "text.secondary", bgcolor: "background.default", borderBottom: "1px solid", borderColor: "divider" } },
    muiTableBodyCellProps: { sx: { fontSize: "0.8125rem", py: 1.25 } },
    muiTopToolbarProps: { sx: { px: 0, minHeight: 48 } },
    muiBottomToolbarProps: { sx: { px: 0 } },
    initialState: { density: "compact", showGlobalFilter: true },
    renderEmptyRowsFallback: () => (
      <EmptyState
        title="No QR codes yet"
        description="Generate QR codes for your rooms"
        actionLabel="Generate QR Batch"
        onAction={() => setBatchDialogOpen(true)}
      />
    ),
  });

  // Derive total selected count from persistent ref for the header badge
  const totalSelectedCount = Object.keys(rowSelection).length > 0 || allPagesSelected
    ? allPagesSelected
      ? (data?.total ?? 0)
      : selectedIdsRef.current.size
    : 0;

  return (
    <Box>
      <PageHeader
        title="QR Management"
        subtitle="Generate, manage, and monitor QR codes for rooms"
        actions={
          <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
            {/* Persistent selection count badge */}
            {totalSelectedCount > 0 && (
              <Chip
                label={`${totalSelectedCount} selected${allPagesSelected ? " (all pages)" : ""} · Press Esc to clear`}
                size="small"
                color="primary"
                variant="outlined"
                onDelete={clearAllSelection}
                sx={{ fontSize: "0.6875rem", fontWeight: 600, height: 28 }}
              />
            )}
            <Button variant="outlined" size="small" startIcon={<Download size={14} />} onClick={() => exportCSV(data?.items ?? [])} disabled={exporting}>Export CSV</Button>
            <Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />} onClick={handleRefresh}>
              Refresh
            </Button>
            <Button variant="outlined" size="small" startIcon={<Printer size={14} />} onClick={() => navigate("/qr/print?propertyId=" + propertyId)}>
              Print All
            </Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => setBatchDialogOpen(true)}>
              Generate Batch
            </Button>
          </Box>
        }
      />
      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the FastAPI backend to see live data.</Alert>}
      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>{isLoading ? <TableSkeleton rows={6} columns={5} /> : <MaterialReactTable table={table} />}</CardContent></Card>

      {/* QR Batch Generate Dialog */}
      <QRBatchGenerateDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        propertyId={propertyId ?? ""}
        propertyName="The Grand Palace Hotel"
        onSuccess={handleBulkSuccess}
      />

      {/* Set Expiry Date Dialog */}
      <Dialog open={expiryDialogOpen} onClose={() => setExpiryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem" }}>
          Set Expiry Date
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Set a new expiry date for {expiryTargetIds.length} selected QR code{expiryTargetIds.length !== 1 ? "s" : ""}.
            Leave blank to remove the expiry (codes never expire).
          </Typography>
          <TextField
            label="Expiry Date"
            type="date"
            fullWidth
            size="small"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: new Date().toISOString().split("T")[0] }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setExpiryDialogOpen(false)} disabled={expiryUpdating}>Cancel</Button>
          <Button
            variant="contained"
            disabled={expiryUpdating}
            onClick={async () => {
              setExpiryUpdating(true);
              try {
                // Calculate hours from now to the chosen expiry date
                const hoursFromNow = expiryDate
                  ? Math.max(1, Math.round((new Date(expiryDate).getTime() - Date.now()) / 3_600_000))
                  : 0;
                if (hoursFromNow > 0) {
                  await Promise.all(
                    expiryTargetIds.map((id) => qrApi.extend(propertyId!, id, hoursFromNow))
                  );
                }
                toast.success(`Updated expiry for ${expiryTargetIds.length} QR code${expiryTargetIds.length !== 1 ? "s" : ""}`);
                queryClient.invalidateQueries({ queryKey: ["qr"] });
                setExpiryDialogOpen(false);
              } catch {
                toast.error("Failed to update expiry for some QR codes");
              } finally {
                setExpiryUpdating(false);
              }
            }}
          >
            {expiryUpdating ? "Updating..." : "Apply"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Context Guard */}
      {guardDialog}

      {/* Revoke All Selected Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: "1rem", color: "error.main" }}>
          Revoke QR Codes
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            This will permanently revoke {revokeTargetIds.length} selected QR code{revokeTargetIds.length !== 1 ? "s" : ""}.
            Revoked codes cannot be re-activated. Guests using these codes will lose access immediately.
          </Typography>
          <TextField
            label="Reason (optional)"
            placeholder="e.g. Guest checked out, security incident..."
            fullWidth
            size="small"
            multiline
            rows={2}
            value={revokeReason}
            onChange={(e) => setRevokeReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={revokeUpdating}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            disabled={revokeUpdating}
            onClick={async () => {
              setRevokeUpdating(true);
              try {
                await Promise.all(
                  revokeTargetIds.map((id) => qrApi.revoke(propertyId!, id, revokeReason || undefined))
                );
                toast.success(`Revoked ${revokeTargetIds.length} QR code${revokeTargetIds.length !== 1 ? "s" : ""}`);
                queryClient.invalidateQueries({ queryKey: ["qr"] });
                clearAllSelection();
                setRevokeDialogOpen(false);
              } catch {
                toast.error("Failed to revoke some QR codes");
              } finally {
                setRevokeUpdating(false);
              }
            }}
          >
            {revokeUpdating ? "Revoking..." : `Revoke ${revokeTargetIds.length} Code${revokeTargetIds.length !== 1 ? "s" : ""}`}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
