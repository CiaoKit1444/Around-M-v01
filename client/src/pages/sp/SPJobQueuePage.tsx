/**
 * SPJobQueuePage — Service Provider Job Queue
 *
 * Tabs: Incoming (DISPATCHED) | Active | History
 * Per-job actions: Accept (with ETA + staff name) | Reject (with reason) | Mark In Progress | Mark Completed
 */
import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  CheckCircle2, XCircle, PlayCircle, Flag,
  Loader2, Clock, User, FileText, Briefcase, ExternalLink,
  Filter, X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// ─── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DISPATCHED:       { label: "Awaiting Response", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  SP_ACCEPTED:      { label: "Accepted",          color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30" },
  PENDING_PAYMENT:  { label: "Pending Payment",   color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
  PAYMENT_CONFIRMED:{ label: "Paid — Ready",      color: "bg-teal-500/15 text-teal-400 border-teal-500/30" },
  IN_PROGRESS:      { label: "In Progress",       color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" },
  COMPLETED:        { label: "Completed",         color: "bg-green-500/15 text-green-400 border-green-500/30" },
  FULFILLED:        { label: "Fulfilled",         color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  SP_REJECTED:      { label: "Rejected",          color: "bg-red-500/15 text-red-400 border-red-500/30" },
};

// ─── Accept Dialog ─────────────────────────────────────────────────────────────
function AcceptDialog({
  assignmentId,
  open,
  onClose,
}: {
  assignmentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [eta, setEta] = useState("");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const accept = trpc.requests.acceptJob.useMutation({
    onSuccess: () => {
      toast.success("Job accepted — guest and hotel notified");
      utils.requests.listSpJobs.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleAccept = () => {
    if (!eta) { toast.error("Please provide an estimated arrival time"); return; }
    accept.mutate({
      assignmentId,
      estimatedArrival: new Date(eta).toISOString(),
      assignedStaffName: staffName || undefined,
      deliveryNotes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Accept Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Estimated Arrival *</Label>
            <Input
              type="datetime-local"
              value={eta}
              onChange={e => setEta(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Assigned Staff Name</Label>
            <Input
              value={staffName}
              onChange={e => setStaffName(e.target.value)}
              placeholder="e.g. Somchai K."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Delivery Notes</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any details for the hotel or guest..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            onClick={handleAccept}
            disabled={!eta || accept.isPending}
            className="bg-teal-500 hover:bg-teal-400 text-black font-semibold gap-2"
          >
            {accept.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ─────────────────────────────────────────────────────────────
function RejectDialog({
  assignmentId,
  open,
  onClose,
}: {
  assignmentId: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const reject = trpc.requests.rejectJob.useMutation({
    onSuccess: () => {
      toast.success("Job rejected — returned to hotel queue");
      utils.requests.listSpJobs.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Reject Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-zinc-400 text-sm">
            The request will be returned to the hotel's Front Office queue for re-assignment.
          </p>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for rejection (required)..."
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Back</Button>
          <Button
            onClick={() => reject.mutate({ assignmentId, rejectionReason: reason })}
            disabled={!reason.trim() || reject.isPending}
            variant="destructive"
            className="gap-2"
          >
            {reject.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Job Card ──────────────────────────────────────────────────────────────────
function JobCard({ job }: { job: any }) {
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const cfg = STATUS_CONFIG[job.status] ?? { label: job.status, color: "bg-zinc-700 text-zinc-300" };

  const markInProgress = trpc.requests.markInProgress.useMutation({
    onSuccess: () => {
      toast.success("Job marked as In Progress");
      utils.requests.listSpJobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markCompleted = trpc.requests.markCompleted.useMutation({
    onSuccess: () => {
      toast.success("Job marked as Completed — guest has 10 minutes to confirm");
      utils.requests.listSpJobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const assignmentId = job.assignment?.id ?? "";

  return (
    <>
      <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-100 font-semibold text-sm">{job.requestNumber}</span>
                <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
              </div>
              <p className="text-zinc-400 text-xs">
                Room <span className="text-zinc-300 font-medium">{job.roomId?.slice(-6)}</span>
                {job.guestName && <> · {job.guestName}</>}
                {" · "}฿{Number(job.totalAmount ?? 0).toLocaleString()}
              </p>
            </div>
            <p className="text-zinc-500 text-xs shrink-0">
              {new Date(job.createdAt).toLocaleDateString()}
            </p>
          </div>

          {/* Assignment details (if accepted) */}
          {job.assignment?.estimatedArrival && (
            <div className="bg-zinc-800 rounded-lg px-3 py-2 space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-300">
                <Clock className="w-3.5 h-3.5 text-teal-400" />
                ETA: {new Date(job.assignment.estimatedArrival).toLocaleString()}
              </div>
              {job.assignment.assignedStaffName && (
                <div className="flex items-center gap-2 text-xs text-zinc-300">
                  <User className="w-3.5 h-3.5 text-teal-400" />
                  Staff: {job.assignment.assignedStaffName}
                </div>
              )}
              {job.assignment.deliveryNotes && (
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <FileText className="w-3.5 h-3.5" />
                  {job.assignment.deliveryNotes}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            {job.status === "DISPATCHED" && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 gap-1"
                  onClick={() => setAcceptOpen(true)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-red-400 hover:bg-red-500/10 gap-1"
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Reject
                </Button>
              </>
            )}
            {job.status === "PAYMENT_CONFIRMED" && (
              <Button
                size="sm"
                className="h-7 text-xs bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 gap-1"
                onClick={() => markInProgress.mutate({ requestId: job.id })}
                disabled={markInProgress.isPending}
              >
                {markInProgress.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                Start Job
              </Button>
            )}
            {job.status === "IN_PROGRESS" && (
              <Button
                size="sm"
                className="h-7 text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 gap-1"
                onClick={() => markCompleted.mutate({ requestId: job.id })}
                disabled={markCompleted.isPending}
              >
                {markCompleted.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
                Mark Complete
              </Button>
            )}
            {/* Always show View Details */}
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 gap-1 ml-auto"
              onClick={() => navigate(`/sp/jobs/${job.id}`)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {assignmentId && (
        <>
          <AcceptDialog assignmentId={assignmentId} open={acceptOpen} onClose={() => setAcceptOpen(false)} />
          <RejectDialog assignmentId={assignmentId} open={rejectOpen} onClose={() => setRejectOpen(false)} />
        </>
      )}
    </>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
const TABS = [
  { key: "incoming", label: "Incoming", statuses: ["DISPATCHED"] },
  { key: "active", label: "Active", statuses: ["SP_ACCEPTED", "PENDING_PAYMENT", "PAYMENT_CONFIRMED", "IN_PROGRESS"] },
  { key: "history", label: "History", statuses: ["COMPLETED", "FULFILLED", "SP_REJECTED", "CANCELLED"] },
];

export default function SPJobQueuePage() {
  const { user } = useAuth();
  const { activeRole } = useActiveRole();
  const providerId = activeRole?.scopeId ?? undefined;
  const [activeTab, setActiveTab] = useState("incoming");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allJobs, setAllJobs] = useState<any[]>([]);
  // ── Filters ──────────────────────────────────────────────────────────────
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const hasActiveFilter = filterStatus !== "ALL" || filterFrom !== "" || filterTo !== "";

  const { data: pageData, isLoading, isFetching } = trpc.requests.listSpJobs.useQuery(
    { providerId, cursor },
    { refetchInterval: cursor === undefined ? 15_000 : false }
  );

  // Accumulate pages — reset when tab changes or on initial load
  useEffect(() => {
    if (!pageData) return;
    if (cursor === undefined) {
      // First page or refresh — replace all
      setAllJobs(pageData.items ?? []);
    } else {
      // Subsequent pages — append
      setAllJobs(prev => {
        const existingIds = new Set(prev.map((j: any) => j.id));
        const newItems = (pageData.items ?? []).filter((j: any) => !existingIds.has(j.id));
        return [...prev, ...newItems];
      });
    }
  }, [pageData]);

  const nextCursor = pageData?.nextCursor ?? null;

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    TABS.forEach(tab => {
      counts[tab.key] = allJobs.filter((j: any) => tab.statuses.includes(j.status)).length;
    });
    return counts;
  }, [allJobs]);

  const currentTab = TABS.find(t => t.key === activeTab)!;
  const filtered = useMemo(() => {
    return allJobs.filter((j: any) => {
      // Tab filter
      if (!currentTab.statuses.includes(j.status)) return false;
      // Status filter
      if (filterStatus !== "ALL" && j.status !== filterStatus) return false;
      // Date range filter (based on createdAt)
      if (filterFrom) {
        const from = new Date(filterFrom);
        from.setHours(0, 0, 0, 0);
        if (new Date(j.createdAt) < from) return false;
      }
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(j.createdAt) > to) return false;
      }
      return true;
    });
  }, [allJobs, activeTab, filterStatus, filterFrom, filterTo]);

  return (
    <div className="p-6 space-y-5 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Job Queue</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Auto-refreshes every 15 seconds</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {TABS.map(tab => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeTab === tab.key ? "default" : "ghost"}
            onClick={() => setActiveTab(tab.key)}
            className={`gap-2 text-xs ${
              activeTab === tab.key
                ? "bg-teal-500 text-black hover:bg-teal-400"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {tab.label}
            {tabCounts[tab.key] > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeTab === tab.key ? "bg-black/20" : "bg-zinc-700 text-zinc-300"
              }`}>
                {tabCounts[tab.key]}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium shrink-0">
          <Filter className="w-3.5 h-3.5" />
          Filters
        </div>
        {/* Status */}
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 text-xs">Status</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-700">
              <SelectItem value="ALL" className="text-zinc-200 text-xs">All statuses</SelectItem>
              {currentTab.statuses.map(s => (
                <SelectItem key={s} value={s} className="text-zinc-200 text-xs">
                  {STATUS_CONFIG[s]?.label ?? s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {/* From date */}
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 text-xs">From</span>
          <Input
            type="date"
            value={filterFrom}
            onChange={e => setFilterFrom(e.target.value)}
            className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 w-36"
          />
        </div>
        {/* To date */}
        <div className="flex flex-col gap-1">
          <span className="text-zinc-500 text-xs">To</span>
          <Input
            type="date"
            value={filterTo}
            onChange={e => setFilterTo(e.target.value)}
            className="h-7 text-xs bg-zinc-800 border-zinc-700 text-zinc-200 w-36"
          />
        </div>
        {/* Reset */}
        {hasActiveFilter && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200 gap-1 self-end"
            onClick={() => { setFilterStatus("ALL"); setFilterFrom(""); setFilterTo(""); }}
          >
            <X className="w-3 h-3" /> Reset
          </Button>
        )}
        {hasActiveFilter && (
          <span className="text-zinc-500 text-xs self-end ml-auto">
            {filtered.length} result{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-zinc-500">
          <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No {currentTab.label.toLowerCase()} jobs</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(job => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}

      {/* Load More */}
      {nextCursor !== null && !isLoading && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => setCursor(nextCursor)}
            className="text-zinc-400 border-zinc-700 hover:text-zinc-100 gap-2"
          >
            {isFetching ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading...</>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}


