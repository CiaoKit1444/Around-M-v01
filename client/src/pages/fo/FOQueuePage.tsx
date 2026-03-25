/**
 * FOQueuePage — Front Office Request Queue
 *
 * Live queue of all service requests for the property.
 * Features:
 * - Real-time SLA countdown clock per request card
 * - Auto / Manual matching toggle
 * - Assign provider dialog (manual dispatch)
 * - Reject / cancel with reason
 * - Request detail drawer with notes and audit log
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useActiveRole } from "@/hooks/useActiveRole";
import { Clock, Zap, UserCheck, XCircle, MessageSquare,
  RefreshCw, Search, ClipboardList,
  AlertTriangle, Loader2, ArrowRight, Wifi, WifiOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useFrontOfficeSSE } from "@/hooks/useFrontOfficeSSE";

// ─── SLA Clock ────────────────────────────────────────────────────────────────
function SLAClock({ deadline }: { deadline: string | null }) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!deadline) return;
    const update = () => {
      const diff = new Date(deadline).getTime() - Date.now();
      setRemaining(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!deadline || remaining === null) return null;

  const isBreached = remaining <= 0;
  const mins = Math.floor(Math.abs(remaining) / 60000);
  const secs = Math.floor((Math.abs(remaining) % 60000) / 1000);
  const label = isBreached
    ? `+${mins}m ${secs}s overdue`
    : `${mins}m ${secs}s`;

  const color = isBreached
    ? "text-red-400 bg-red-500/10 border-red-500/30"
    : remaining < 300000
    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-green-400 bg-green-500/10 border-green-500/30";

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-mono ${color}`}>
      <Clock className="w-3 h-3" />
      {label}
    </span>
  );
}

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SUBMITTED:       { label: "Submitted",       color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
  PENDING_MATCH:   { label: "Pending Match",   color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  DISPATCHED:      { label: "Dispatched",      color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
  SP_ACCEPTED:     { label: "SP Accepted",     color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  SP_REJECTED:     { label: "SP Rejected",     color: "bg-red-500/15 text-red-400 border-red-500/30" },
  PENDING_PAYMENT: { label: "Pending Payment", color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  PAYMENT_CONFIRMED:{ label: "Paid",           color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  IN_PROGRESS:     { label: "In Progress",     color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  COMPLETED:       { label: "Completed",       color: "bg-green-500/15 text-green-400 border-green-500/30" },
  FULFILLED:       { label: "Fulfilled",       color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  CANCELLED:       { label: "Cancelled",       color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30" },
  DISPUTED:        { label: "Disputed",        color: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
};

// ─── Assign Provider Dialog ────────────────────────────────────────────────────
function AssignDialog({
  requestId,
  propertyId,
  open,
  onClose,
}: {
  requestId: string;
  propertyId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const { data: providers = [] } = trpc.requests.listProviders.useQuery(
    { propertyId },
    { enabled: open && !!propertyId }
  );

  const assign = trpc.requests.assignProvider.useMutation({
    onSuccess: () => {
      toast.success("Provider assigned and request dispatched");
      utils.requests.listByProperty.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAssign = () => {
    if (!selectedProviderId) { toast.error("Select a provider first"); return; }
    assign.mutate({ requestId, providerId: selectedProviderId, note: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Assign Service Provider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Select Provider</Label>
            <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Choose a provider..." />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {providers.map((p: any) => (
                  <SelectItem key={p.id} value={p.id} className="text-zinc-100 focus:bg-zinc-700">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-zinc-400">{p.category}</p>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Dispatch Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any special instructions for the provider..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedProviderId || assign.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
          >
            {assign.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Dispatch
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ─────────────────────────────────────────────────────────────
function RejectDialog({
  requestId,
  open,
  onClose,
}: {
  requestId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const cancel = trpc.requests.cancelRequest.useMutation({
    onSuccess: () => {
      toast.success("Request cancelled");
      utils.requests.listByProperty.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Cancel / Reject Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-zinc-400 text-sm">
            This will cancel the request and notify the guest. Please provide a reason.
          </p>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for cancellation..."
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Back</Button>
          <Button
            onClick={() => cancel.mutate({ requestId, reason })}
            disabled={!reason.trim() || cancel.isPending}
            variant="destructive"
            className="gap-2"
          >
            {cancel.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Request Card ──────────────────────────────────────────────────────────────
function RequestCard({
  req,
  propertyId,
  onViewDetail,
}: {
  req: any;
  propertyId: string;
  onViewDetail: (id: string) => void;
}) {
  const [assignOpen, setAssignOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const utils = trpc.useUtils();

  const cfg = STATUS_CONFIG[req.status] ?? { label: req.status, color: "bg-zinc-700 text-zinc-300" };
  const canAssign = ["SUBMITTED", "PENDING_MATCH", "SP_REJECTED"].includes(req.status);
  const canReject = !["COMPLETED", "FULFILLED", "CANCELLED"].includes(req.status);

  // Auto-match toggle
  const setMatching = trpc.requests.setMatchingMode.useMutation({
    onSuccess: () => utils.requests.listByProperty.invalidate(),
    onError: (e: any) => toast.error(e.message),
  });

  const isAutoMatch = req.matchingMode === "AUTO";

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Top row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-100 font-semibold text-sm">{req.requestNumber}</span>
                <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                <SLAClock deadline={req.slaDeadline} />
              </div>

              {/* Guest + room */}
              <p className="text-zinc-400 text-xs">
                Room <span className="text-zinc-300 font-medium">{req.roomId.slice(-6)}</span>
                {req.guestName && <> · <span className="text-zinc-300">{req.guestName}</span></>}
                {" · "}฿{Number(req.totalAmount).toLocaleString()}
              </p>

              {/* Items summary */}
              {req.items && req.items.length > 0 && (
                <p className="text-zinc-500 text-xs truncate">
                  {req.items.map((i: any) => `${i.quantity}× ${i.catalogItemName}`).join(", ")}
                </p>
              )}

              {/* Matching mode toggle */}
              <div className="flex items-center gap-2 pt-1">
                <Switch
                  id={`match-${req.id}`}
                  checked={isAutoMatch}
                  onCheckedChange={(checked) =>
                    setMatching.mutate({ requestId: req.id, mode: checked ? "AUTO" : "MANUAL" })
                  }
                  disabled={!canAssign || setMatching.isPending}
                  className="data-[state=checked]:bg-amber-500 scale-75"
                />
                <Label htmlFor={`match-${req.id}`} className="text-zinc-400 text-xs cursor-pointer">
                  {isAutoMatch ? "Auto-match" : "Manual match"}
                </Label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1 px-2"
                onClick={() => onViewDetail(req.id)}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Detail
              </Button>
              {canAssign && (
                <Button
                  size="sm"
                  className="h-7 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 gap-1 px-2"
                  onClick={() => setAssignOpen(true)}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Assign
                </Button>
              )}
              {canReject && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-red-400 hover:bg-red-500/10 gap-1 px-2"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <AssignDialog
        requestId={req.id}
        propertyId={propertyId}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
      <RejectDialog
        requestId={req.id}
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
      />
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FOQueuePage() {
  const { activeRole } = useActiveRole();
  const [, navigate] = useLocation();
  const propertyId = activeRole?.scopeId ?? "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");

  const statusGroups: Record<string, string[]> = {
    active: ["SUBMITTED", "PENDING_MATCH", "SP_REJECTED", "DISPATCHED", "SP_ACCEPTED"],
    in_progress: ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "IN_PROGRESS"],
    completed: ["COMPLETED", "FULFILLED"],
    all: [],
  };

  const { data: requests = [], isLoading, refetch } = trpc.requests.listByProperty.useQuery(
    { propertyId, limit: 200 },
    { enabled: !!propertyId, refetchInterval: 15_000 }
  );

  // Real-time SSE — auto-invalidates tRPC queries on request.updated events
  const { isConnected: sseConnected, unreadCount, clearUnread } = useFrontOfficeSSE(propertyId || undefined);

  const filtered = useMemo(() => {
    let list = requests;
    if (statusFilter !== "all" && statusGroups[statusFilter]) {
      list = list.filter(r => statusGroups[statusFilter].includes(r.status));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.requestNumber.toLowerCase().includes(q) ||
        (r.guestName ?? "").toLowerCase().includes(q) ||
        r.roomId.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => {
      // SLA breached first, then by creation time
      const aBreached = a.slaDeadline && new Date(a.slaDeadline) < new Date();
      const bBreached = b.slaDeadline && new Date(b.slaDeadline) < new Date();
      if (aBreached && !bBreached) return -1;
      if (!aBreached && bBreached) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [requests, statusFilter, search]);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Request Queue</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {filtered.length} request{filtered.length !== 1 ? "s" : ""} · auto-refreshes every 15s
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* SSE connection indicator */}
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${
            sseConnected
              ? "text-green-400 bg-green-500/10 border-green-500/30"
              : "text-zinc-500 bg-zinc-800 border-zinc-700"
          }`}>
            {sseConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {sseConnected ? "Live" : "Polling"}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={() => { refetch(); clearUnread(); }}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
            >
              {unreadCount} new
            </button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-zinc-400 hover:text-zinc-200 gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ref, guest, room..."
            className="pl-9 bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
        </div>
        <div className="flex gap-1">
          {[
            { key: "active", label: "Active" },
            { key: "in_progress", label: "In Progress" },
            { key: "completed", label: "Completed" },
            { key: "all", label: "All" },
          ].map(({ key, label }) => (
            <Button
              key={key}
              size="sm"
              variant={statusFilter === key ? "default" : "ghost"}
              onClick={() => setStatusFilter(key)}
              className={statusFilter === key
                ? "bg-amber-500 text-black hover:bg-amber-400 text-xs"
                : "text-zinc-400 hover:text-zinc-200 text-xs"
              }
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No requests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <RequestCard
              key={req.id}
              req={req}
              propertyId={propertyId}
              onViewDetail={(id) => navigate(`/fo/queue/${id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
