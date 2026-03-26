/**
 * SOJobDetailPage — Service Operator job detail
 * Shows full stage timeline, current status, notes field, and stage advance actions.
 * Stage machine: DISPATCHED → RUNNING ⇄ PENDING → CLOSED | CANCELLED
 */

import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, Loader2, AlertTriangle, CheckCircle2,
  Clock, Play, Pause, XCircle, ChevronRight,
  FileText, History, Truck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ── Stage config ──────────────────────────────────────────────────────────────

type StageKey = "DISPATCHED" | "RUNNING" | "PENDING" | "CLOSED" | "CANCELLED";

const STAGE_CONFIG: Record<StageKey, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  DISPATCHED: { label: "Dispatched",  color: "bg-blue-500/15 text-blue-400 border-blue-500/30",   icon: <Truck className="w-3.5 h-3.5" />,        description: "Job assigned, awaiting start" },
  RUNNING:    { label: "Running",     color: "bg-green-500/15 text-green-400 border-green-500/30", icon: <Play className="w-3.5 h-3.5" />,          description: "Service in progress" },
  PENDING:    { label: "Pending",     color: "bg-amber-500/15 text-amber-400 border-amber-500/30", icon: <Pause className="w-3.5 h-3.5" />,         description: "Temporarily paused" },
  CLOSED:     { label: "Closed",      color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",    icon: <CheckCircle2 className="w-3.5 h-3.5" />,  description: "Job completed" },
  CANCELLED:  { label: "Cancelled",   color: "bg-red-500/15 text-red-400 border-red-500/30",       icon: <XCircle className="w-3.5 h-3.5" />,       description: "Job cancelled" },
};

const TRANSITIONS: Record<StageKey, StageKey[]> = {
  DISPATCHED: ["RUNNING", "CANCELLED"],
  RUNNING:    ["PENDING", "CLOSED"],
  PENDING:    ["RUNNING", "CANCELLED"],
  CLOSED:     [],
  CANCELLED:  [],
};

const STAGE_ORDER: StageKey[] = ["DISPATCHED", "RUNNING", "PENDING", "CLOSED"];

// ── Stage history entry type ──────────────────────────────────────────────────

type HistoryEntry = {
  stage: string;
  timestamp: string;
  note?: string;
  actorId?: string | number;
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SOJobDetailPage() {
  const [, params] = useRoute("/so/jobs/:jobId");
  const [, navigate] = useLocation();
  const jobId = params?.jobId ?? "";

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [stageNote, setStageNote] = useState("");

  const { data, isLoading, isError, error, refetch } = trpc.spTickets.getSoJob.useQuery(
    { jobId },
    { enabled: !!jobId, refetchInterval: 15_000 }
  );

  const utils = trpc.useUtils();

  const advanceStage = trpc.spTickets.advanceSoJobStage.useMutation({
    onSuccess: (res) => {
      toast.success(`Stage updated to ${res.newStage}`);
      setStageNote("");
      void utils.spTickets.getSoJob.invalidate({ jobId });
      void utils.spTickets.listSoJobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateStage = trpc.spTickets.updateJobStage.useMutation({
    onSuccess: () => {
      toast.success("Stage updated");
      setStageNote("");
      setCancelOpen(false);
      setCancelReason("");
      void utils.spTickets.getSoJob.invalidate({ jobId });
      void utils.spTickets.listSoJobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (isError || !data?.job) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/so/jobs")}
          className="text-zinc-400 hover:text-zinc-200 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to My Jobs
        </Button>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{(error as any)?.message ?? "Job not found"}</span>
        </div>
      </div>
    );
  }

  const { job, ticket } = data;
  const status = (job.status ?? "DISPATCHED") as StageKey;
  const cfg = STAGE_CONFIG[status] ?? STAGE_CONFIG.DISPATCHED;
  const nextStages = TRANSITIONS[status] ?? [];
  const isTerminal = status === "CLOSED" || status === "CANCELLED";
  const history: HistoryEntry[] = Array.isArray(job.stageHistory) ? job.stageHistory as HistoryEntry[] : [];

  const handleAdvance = (newStage: StageKey) => {
    if (newStage === "CANCELLED") {
      setCancelOpen(true);
      return;
    }
    advanceStage.mutate({ jobId, newStage });
  };

  const handleCancel = () => {
    if (cancelReason.length < 5) return;
    updateStage.mutate({ jobId, stage: "CANCELLED", note: cancelReason });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon"
          className="text-zinc-400 hover:text-zinc-100 shrink-0 mt-0.5"
          onClick={() => navigate("/so/jobs")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-100">Job #{jobId.slice(0, 8).toUpperCase()}</h1>
            <Badge variant="outline" className={`text-xs gap-1 ${cfg.color}`}>
              {cfg.icon} {cfg.label}
            </Badge>
          </div>
          <p className="text-zinc-500 text-xs mt-0.5">{cfg.description}</p>
          {ticket && (
            <p className="text-zinc-600 text-xs mt-0.5">
              Ticket #{ticket.id.slice(0, 8).toUpperCase()} · Request #{ticket.requestId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>
      </div>

      {/* Stage progress bar */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-4">
          <div className="flex items-center gap-1">
            {STAGE_ORDER.map((s, i) => {
              const reached = STAGE_ORDER.indexOf(status) >= i || status === "CLOSED";
              const isCurrent = s === status;
              const sCfg = STAGE_CONFIG[s];
              return (
                <div key={s} className="flex items-center flex-1 min-w-0">
                  <div className={`flex flex-col items-center gap-1 flex-1 min-w-0 ${reached ? "opacity-100" : "opacity-30"}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border ${isCurrent ? sCfg.color : reached ? "bg-zinc-700 border-zinc-600 text-zinc-300" : "bg-zinc-800 border-zinc-700 text-zinc-600"}`}>
                      {sCfg.icon}
                    </div>
                    <span className={`text-xs font-medium truncate max-w-full ${isCurrent ? "text-zinc-100" : "text-zinc-500"}`}>{sCfg.label}</span>
                  </div>
                  {i < STAGE_ORDER.length - 1 && (
                    <ChevronRight className={`w-4 h-4 shrink-0 mx-0.5 ${reached ? "text-zinc-500" : "text-zinc-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Stage actions */}
      {!isTerminal && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Update Stage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Note (optional)</Label>
              <Textarea
                placeholder="Add a note about this stage update…"
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                rows={2}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {nextStages.filter((s) => s !== "CANCELLED").map((s) => {
                const sCfg = STAGE_CONFIG[s];
                return (
                  <Button key={s} size="sm"
                    disabled={advanceStage.isPending}
                    className={`gap-1.5 border ${sCfg.color} hover:opacity-80`}
                    onClick={() => handleAdvance(s)}>
                    {advanceStage.isPending && advanceStage.variables?.newStage === s
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : sCfg.icon}
                    Move to {sCfg.label}
                  </Button>
                );
              })}
              {nextStages.includes("CANCELLED") && (
                <Button size="sm" variant="ghost"
                  className="gap-1.5 text-red-400 hover:bg-red-500/10"
                  onClick={() => setCancelOpen(true)}>
                  <XCircle className="w-3.5 h-3.5" /> Cancel Job
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Job details */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-zinc-500">Assigned</span>
            <span className="text-zinc-300">{new Date(job.assignedAt).toLocaleString()}</span>
          </div>
          {job.startedAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Started</span>
              <span className="text-zinc-300">{new Date(job.startedAt).toLocaleString()}</span>
            </div>
          )}
          {job.completedAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Completed</span>
              <span className="text-zinc-300">{new Date(job.completedAt).toLocaleString()}</span>
            </div>
          )}
          {job.cancelledAt && (
            <div className="flex justify-between">
              <span className="text-zinc-500">Cancelled</span>
              <span className="text-zinc-300">{new Date(job.cancelledAt).toLocaleString()}</span>
            </div>
          )}
          {job.stageNotes && (
            <>
              <Separator className="bg-zinc-800" />
              <div>
                <p className="text-zinc-500 text-xs mb-1">Latest Note</p>
                <p className="text-zinc-300 text-sm">{job.stageNotes}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Stage history timeline */}
      {history.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <History className="w-4 h-4" /> Stage History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry, i) => {
                const sCfg = STAGE_CONFIG[entry.stage as StageKey] ?? STAGE_CONFIG.DISPATCHED;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs ${sCfg.color}`}>
                        {sCfg.icon}
                      </div>
                      {i < history.length - 1 && <div className="w-px flex-1 bg-zinc-800 mt-1" />}
                    </div>
                    <div className="flex-1 min-w-0 pb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-200 text-sm font-medium">{sCfg.label}</span>
                        <span className="text-zinc-600 text-xs">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {entry.note && (
                        <p className="text-zinc-400 text-xs mt-0.5">{entry.note}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={(v) => !v && setCancelOpen(false)}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-400" />
              Cancel Job
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-zinc-400 text-sm">
              Please provide a reason for cancelling this job. This will be recorded in the audit trail.
            </p>
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Cancellation Reason</Label>
              <Textarea
                placeholder="Describe why this job is being cancelled (min. 5 characters)…"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                rows={3}
              />
              {cancelReason.length > 0 && cancelReason.length < 5 && (
                <p className="text-red-400 text-xs">At least 5 characters required ({cancelReason.length}/5)</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setCancelOpen(false)}
              className="text-zinc-400 hover:text-zinc-200">
              Back
            </Button>
            <Button
              size="sm"
              disabled={updateStage.isPending || cancelReason.length < 5}
              className="bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 gap-1.5"
              onClick={handleCancel}
            >
              {updateStage.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <XCircle className="w-3.5 h-3.5" />}
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
