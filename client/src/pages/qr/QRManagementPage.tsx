/**
 * QRManagementPage — QR code lifecycle management.
 *
 * Design: Precision Studio — table with status indicators, access type badges, and bulk operations.
 * Data: tRPC → trpc.qr.list / trpc.qr.bulkUpdateAccess / trpc.qr.bulkRevoke / trpc.qr.bulkExtend
 */
import { useMemo, useState, useCallback, useRef, useEffect } from "react";
import { QrCode, Eye, Lock, Unlock, RefreshCw, Plus, Printer, Download, CalendarClock, ShieldOff } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { TableSkeleton } from "@/components/ui/DataStates";
import QRBatchGenerateDialog from "@/components/dialogs/QRBatchGenerateDialog";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

type QRRow = {
  id: string;
  qr_code_id: string;
  room_number: string | null;
  property_name: string | null;
  access_type: string;
  status: string;
  scan_count: number;
  last_scanned: string | null;
  expires_at: string | null;
};

export default function QRManagementPage() {
  const [, navigate] = useLocation();
  const { propertyId } = useActiveProperty();
  const { activeRole } = useActiveRole();

  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [allPagesSelected, setAllPagesSelected] = useState(false);
  const [expiryDialogOpen, setExpiryDialogOpen] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryTargetIds, setExpiryTargetIds] = useState<string[]>([]);
  const [expiryUpdating, setExpiryUpdating] = useState(false);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState("");
  const [revokeTargetIds, setRevokeTargetIds] = useState<string[]>([]);
  const [revokeUpdating, setRevokeUpdating] = useState(false);
  const [searchText, setSearchText] = useState("");

  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // tRPC queries
  const utils = trpc.useUtils();
  const propertiesQuery = trpc.crud.properties.list.useQuery(
    { page: 1, pageSize: 200 },
    { staleTime: 2 * 60 * 1000 }
  );
  const activePropertyName = useMemo(() => {
    const props = propertiesQuery.data?.items ?? [];
    return props.find((p: any) => p.id === propertyId)?.name ?? activeRole?.scopeLabel ?? "Property";
  }, [propertiesQuery.data, propertyId, activeRole?.scopeLabel]);

  const qrQuery = trpc.qr.list.useQuery(
    { property_id: propertyId!, page: 1, pageSize: 200 },
    { enabled: !!propertyId, staleTime: 15_000 }
  );

  const bulkUpdateAccess = trpc.qr.bulkUpdateAccess.useMutation({
    onSuccess: (res) => {
      toast.success(`Updated ${res.updated} QR codes`);
      utils.qr.list.invalidate();
    },
    onError: () => toast.error("Failed to update some QR codes"),
  });

  const bulkRevoke = trpc.qr.bulkRevoke.useMutation({
    onSuccess: (res) => {
      toast.success(`Revoked ${res.revoked} QR codes`);
      utils.qr.list.invalidate();
      clearAllSelection();
      setRevokeDialogOpen(false);
    },
    onError: () => toast.error("Failed to revoke some QR codes"),
    onSettled: () => setRevokeUpdating(false),
  });

  const bulkExtend = trpc.qr.bulkExtend.useMutation({
    onSuccess: (res) => {
      toast.success(`Updated expiry for ${res.extended} QR codes`);
      utils.qr.list.invalidate();
    },
    onError: () => toast.error("Failed to update expiry for some QR codes"),
    onSettled: () => setExpiryUpdating(false),
  });

  const clearAllSelection = useCallback(() => {
    selectedIdsRef.current.clear();
    setSelectedIds(new Set());
    setAllPagesSelected(false);
  }, []);

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

  const { exportCSV, exporting } = useExportCSV<QRRow>("qr-codes", [
    { header: "QR Code ID", accessor: "qr_code_id" },
    { header: "Room", accessor: "room_number" },
    { header: "Property", accessor: "property_name" },
    { header: "Access Type", accessor: "access_type" },
    { header: "Status", accessor: "status" },
    { header: "Scan Count", accessor: "scan_count" },
    { header: "Expires At", accessor: (r) => r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "Never" },
  ]);

  const items = useMemo(() => {
    const all = (qrQuery.data?.items ?? []) as unknown as QRRow[];
    if (!searchText) return all;
    const q = searchText.toLowerCase();
    return all.filter(
      (r) =>
        r.qr_code_id.toLowerCase().includes(q) ||
        (r.room_number ?? "").toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        r.access_type.toLowerCase().includes(q)
    );
  }, [qrQuery.data, searchText]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        selectedIdsRef.current.delete(id);
      } else {
        next.add(id);
        selectedIdsRef.current.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === items.length && items.length > 0) {
      clearAllSelection();
    } else {
      const next = new Set(items.map((r) => r.id));
      selectedIdsRef.current = new Set(next);
      setSelectedIds(next);
    }
  }, [items, selectedIds.size, clearAllSelection]);

  const selectedRows = useMemo(() => items.filter((r) => selectedIds.has(r.id)), [items, selectedIds]);
  const sel = allPagesSelected ? (qrQuery.data?.total ?? 0) : selectedIds.size;
  const isLoading = qrQuery.isLoading;

  return (
    <div>
      <PageHeader
        title="QR Management"
        subtitle="Generate, manage, and monitor QR codes for rooms"
        actions={
          <div className="flex gap-2 items-center flex-wrap">
            {sel > 0 && (
              <Badge variant="outline" className="text-xs font-semibold h-7 px-2 cursor-pointer" onClick={clearAllSelection}>
                {sel} selected{allPagesSelected ? " (all pages)" : ""} · Esc to clear ×
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => exportCSV(items)} disabled={exporting}>
              <Download size={14} className="mr-1" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => utils.qr.list.invalidate()}>
              <RefreshCw size={14} className="mr-1" /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/qr/print?propertyId=" + propertyId)}>
              <Printer size={14} className="mr-1" /> Print All
            </Button>
            <Button size="sm" onClick={() => setBatchDialogOpen(true)}>
              <Plus size={14} className="mr-1" /> Generate Batch
            </Button>
          </div>
        }
      />

      {/* Bulk action bar */}
      {sel > 0 && (
        <div className="flex gap-2 flex-wrap mb-3 p-3 bg-muted/50 rounded-lg border">
          <Button size="sm" variant="outline" onClick={() => {
            if (allPagesSelected) navigate(`/admin/qr/print?propertyId=${propertyId}&allPages=true`);
            else navigate(`/admin/qr/print?ids=${selectedRows.map((r) => r.id).join(",")}`);
          }}>
            <Printer size={13} className="mr-1" /> Print {allPagesSelected ? `All (${sel})` : `Selected (${sel})`}
          </Button>
          {!allPagesSelected && (
            <>
              <Button size="sm" variant="outline" onClick={() => bulkUpdateAccess.mutate({ property_id: propertyId!, qr_ids: selectedRows.map((r) => r.id), access_type: "public" })}>
                <Unlock size={13} className="mr-1" /> Set Public ({sel})
              </Button>
              <Button size="sm" variant="outline" onClick={() => bulkUpdateAccess.mutate({ property_id: propertyId!, qr_ids: selectedRows.map((r) => r.id), access_type: "restricted" })}>
                <Lock size={13} className="mr-1" /> Set Restricted ({sel})
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                setExpiryTargetIds(selectedRows.map((r) => r.id));
                setExpiryDate("");
                setExpiryDialogOpen(true);
              }}>
                <CalendarClock size={13} className="mr-1" /> Set Expiry ({sel})
              </Button>
              <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={async () => {
                const ids = selectedRows.map((r) => r.id);
                const confirmed = await guardConfirm({
                  action: "Revoke QR Codes",
                  description: `This will permanently revoke ${ids.length} selected QR code${ids.length !== 1 ? "s" : ""}. Guests using these codes will lose access immediately.`,
                  severity: "destructive",
                  confirmLabel: `Revoke ${ids.length} Code${ids.length !== 1 ? "s" : ""}`,
                  audit: { entityType: "qr_code", entityId: ids.join(","), entityName: `${ids.length} QR Codes`, details: `Bulk revoke via admin UI` },
                });
                if (!confirmed) return;
                setRevokeTargetIds(ids);
                setRevokeReason("");
                setRevokeDialogOpen(true);
              }}>
                <ShieldOff size={13} className="mr-1" /> Revoke ({sel})
              </Button>
            </>
          )}
          {!allPagesSelected && (qrQuery.data?.total ?? 0) > items.length && (
            <Button size="sm" variant="ghost" className="text-primary underline text-xs" onClick={() => setAllPagesSelected(true)}>
              Select all {qrQuery.data?.total} QR codes across all pages
            </Button>
          )}
          {allPagesSelected && (
            <Button size="sm" variant="ghost" className="text-warning text-xs" onClick={() => { setAllPagesSelected(false); clearAllSelection(); }}>
              Clear all-pages selection ({sel})
            </Button>
          )}
        </div>
      )}

      {/* Search */}
      <div className="mb-3">
        <Input
          placeholder="Search QR code ID, room, status..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="max-w-sm h-8 text-sm"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No QR codes yet"
              description="Generate QR codes for your rooms"
              actionLabel="Generate QR Batch"
              onAction={() => setBatchDialogOpen(true)}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={items.length > 0 && selectedIds.size === items.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">QR Code ID</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Room</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Property</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Access</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide text-right">Scans</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wide">Last Scanned</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((row) => (
                  <TableRow key={row.id} className={selectedIds.has(row.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={selectedIds.has(row.id)} onCheckedChange={() => toggleRow(row.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <QrCode size={13} className="text-muted-foreground shrink-0" />
                        <span className="font-mono text-[11px] font-semibold text-primary">{row.qr_code_id}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {row.room_number ? (
                        <Badge variant="outline" className="text-[11px] font-semibold h-5">{row.room_number}</Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{row.property_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold h-5 gap-1 ${
                          row.access_type === "public"
                            ? "bg-green-50 text-green-800 border-green-200"
                            : "bg-red-50 text-red-800 border-red-200"
                        }`}
                      >
                        {row.access_type === "public" ? <Unlock size={10} /> : <Lock size={10} />}
                        {row.access_type.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusChip status={row.status} />
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums text-sm">{row.scan_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.last_scanned ? new Date(row.last_scanned).toLocaleString() : <span className="italic">Never</span>}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => navigate(`/admin/qr/${row.id}`)}
                        title="View"
                      >
                        <Eye size={14} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* QR Batch Generate Dialog */}
      <QRBatchGenerateDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        propertyId={propertyId ?? ""}
        propertyName={activePropertyName}
        onSuccess={() => utils.qr.list.invalidate()}
      />

      {/* Set Expiry Date Dialog */}
      <Dialog open={expiryDialogOpen} onOpenChange={setExpiryDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Set Expiry Date</DialogTitle>
            <DialogDescription>
              Set a new expiry date for {expiryTargetIds.length} selected QR code{expiryTargetIds.length !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="expiry-date">Expiry Date</Label>
            <Input
              id="expiry-date"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpiryDialogOpen(false)} disabled={expiryUpdating}>Cancel</Button>
            <Button
              disabled={expiryUpdating || !expiryDate}
              onClick={async () => {
                setExpiryDialogOpen(false);
                const ok = await guardConfirm({
                  action: `Set Expiry for ${expiryTargetIds.length} QR Codes`,
                  description: `Update expiry to ${expiryDate} for ${expiryTargetIds.length} QR code${expiryTargetIds.length !== 1 ? "s" : ""}.`,
                  severity: "warning",
                  confirmLabel: "Apply Expiry",
                  audit: { entityType: "qr_code", entityId: expiryTargetIds.join(","), entityName: `${expiryTargetIds.length} QR codes`, details: `Bulk expiry set to ${expiryDate}` },
                });
                if (!ok) return;
                setExpiryUpdating(true);
                const hoursFromNow = Math.max(1, Math.round((new Date(expiryDate).getTime() - Date.now()) / 3_600_000));
                bulkExtend.mutate({ property_id: propertyId!, qr_ids: expiryTargetIds, hours: hoursFromNow });
              }}
            >
              {expiryUpdating ? "Updating..." : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Context Guard */}
      {guardDialog}

      {/* Revoke All Selected Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive">Revoke QR Codes</DialogTitle>
            <DialogDescription>
              This will permanently revoke {revokeTargetIds.length} selected QR code{revokeTargetIds.length !== 1 ? "s" : ""}.
              Revoked codes cannot be re-activated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Reason (optional)</Label>
            <Textarea
              id="revoke-reason"
              placeholder="e.g. Guest checked out, security incident..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeDialogOpen(false)} disabled={revokeUpdating}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={revokeUpdating}
              onClick={() => {
                setRevokeUpdating(true);
                bulkRevoke.mutate({ property_id: propertyId!, qr_ids: revokeTargetIds, reason: revokeReason || undefined });
              }}
            >
              {revokeUpdating ? "Revoking..." : `Revoke ${revokeTargetIds.length} Code${revokeTargetIds.length !== 1 ? "s" : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
