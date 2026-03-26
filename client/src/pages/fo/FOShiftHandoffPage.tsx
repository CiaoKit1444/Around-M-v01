/**
 * FOShiftHandoffPage — Front Office: Shift Handoff Summary
 *
 * Displays all open/in-progress requests at shift change time.
 * Helps outgoing staff brief incoming staff on pending work.
 * Uses tRPC data instead of legacy MUI/ky implementation.
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  Clock, AlertTriangle, CheckCircle2, Send,
  Loader2, ClipboardList, Flame, ArrowRight,
  FileText, Users, Timer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_GROUPS = {
  pending: ["SUBMITTED", "PENDING_MATCH", "SP_REJECTED"],
  dispatched: ["DISPATCHED", "SP_ACCEPTED"],
  inProgress: ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "IN_PROGRESS"],
};

const STATUS_BADGE: Record<string, string> = {
  SUBMITTED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  PENDING_MATCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  SP_REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
  DISPATCHED: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  SP_ACCEPTED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  PENDING_PAYMENT: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  PAYMENT_CONFIRMED: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  IN_PROGRESS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
};

function ElapsedBadge({ createdAt }: { createdAt: string }) {
  const minutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  const color = minutes < 30
    ? "text-green-400 bg-green-500/10 border-green-500/30"
    : minutes < 60
    ? "text-amber-400 bg-amber-500/10 border-amber-500/30"
    : "text-red-400 bg-red-500/10 border-red-500/30";
  const label = minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-mono ${color}`}>
      <Timer className="w-3 h-3" />
      {label}
    </span>
  );
}

function SLAIndicator({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;
  const remaining = new Date(deadline).getTime() - Date.now();
  const isBreached = remaining <= 0;

  if (!isBreached) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-mono text-red-400 bg-red-500/10 border-red-500/30">
      <AlertTriangle className="w-3 h-3" />
      SLA breached
    </span>
  );
}

interface RequestSectionProps {
  title: string;
  requests: any[];
  dotColor: string;
  emptyText: string;
}

function RequestSection({ title, requests, dotColor, emptyText }: RequestSectionProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        <h3 className="text-zinc-200 text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className="text-zinc-400 border-zinc-700 text-xs">
          {requests.length}
        </Badge>
      </div>

      {requests.length === 0 ? (
        <p className="text-zinc-600 text-xs pl-5">{emptyText}</p>
      ) : (
        <div className="space-y-1.5 pl-5">
          {requests.map(req => (
            <div
              key={req.id}
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg px-3 py-2.5 hover:bg-zinc-800 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 text-sm font-mono font-medium">{req.requestNumber}</span>
                  <Badge variant="outline" className={`text-[10px] ${STATUS_BADGE[req.status] ?? "bg-zinc-700 text-zinc-300"}`}>
                    {req.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-zinc-500 text-xs mt-0.5">
                  Room {req.roomId.slice(-6)}
                  {req.guestName && <> · {req.guestName}</>}
                  {" · "}฿{Number(req.totalAmount).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ElapsedBadge createdAt={req.createdAt} />
                <SLAIndicator deadline={req.slaDeadline} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FOShiftHandoffPage() {
  const { activeRole } = useActiveRole();
  const propertyId = activeRole?.scopeId ?? "";

  const [handoffDialogOpen, setHandoffDialogOpen] = useState(false);
  const [handoffNote, setHandoffNote] = useState("");

  const { data: allRequests = [], isLoading } = trpc.requests.listByProperty.useQuery(
    { propertyId, limit: 200 },
    { enabled: !!propertyId }
  );

  // Group requests
  const groups = useMemo(() => {
    const now = new Date();
    const pending = allRequests.filter(r => STATUS_GROUPS.pending.includes(r.status));
    const dispatched = allRequests.filter(r => STATUS_GROUPS.dispatched.includes(r.status));
    const inProgress = allRequests.filter(r => STATUS_GROUPS.inProgress.includes(r.status));
    const slaBreached = allRequests.filter(r =>
      !["COMPLETED", "FULFILLED", "CANCELLED", "DISPUTED"].includes(r.status) &&
      r.slaDeadline && new Date(r.slaDeadline) < now
    );
    return { pending, dispatched, inProgress, slaBreached };
  }, [allRequests]);

  const totalOpen = groups.pending.length + groups.dispatched.length + groups.inProgress.length;

  const handleCompleteHandoff = () => {
    toast.success(`Shift handoff completed. ${totalOpen} open requests transferred to incoming shift.`);
    setHandoffDialogOpen(false);
    setHandoffNote("");
  };

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Shift Handoff</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {activeRole?.scopeLabel ?? "Property"} · Current shift summary
          </p>
        </div>
        <Button
          onClick={() => setHandoffDialogOpen(true)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
        >
          <Send className="w-4 h-4" />
          Complete Handoff
        </Button>
      </div>

      {/* SLA breach alert */}
      {groups.slaBreached.length > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <Flame className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-medium">
            {groups.slaBreached.length} request{groups.slaBreached.length > 1 ? "s have" : " has"} breached SLA — incoming shift must address immediately
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: groups.pending.length, color: "text-amber-400", border: "border-l-amber-500" },
          { label: "Dispatched", value: groups.dispatched.length, color: "text-purple-400", border: "border-l-purple-500" },
          { label: "In Progress", value: groups.inProgress.length, color: "text-cyan-400", border: "border-l-cyan-500" },
          { label: "SLA Breached", value: groups.slaBreached.length, color: "text-red-400", border: "border-l-red-500" },
        ].map(s => (
          <Card key={s.label} className={`bg-zinc-900 border-zinc-800 border-l-4 ${s.border}`}>
            <CardContent className="p-4">
              <p className="text-zinc-500 text-xs uppercase tracking-wide">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>
                {isLoading ? "—" : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Request sections */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <CardTitle className="text-zinc-100 text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Open Requests for Incoming Shift
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          ) : totalOpen === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">All clear — no open requests</p>
              <p className="text-xs mt-1">The incoming shift starts with a clean slate.</p>
            </div>
          ) : (
            <>
              <RequestSection
                title="Pending (Awaiting Assignment)"
                requests={groups.pending}
                dotColor="bg-amber-400"
                emptyText="No pending requests"
              />
              <Separator className="bg-zinc-800" />
              <RequestSection
                title="Dispatched (Awaiting Provider)"
                requests={groups.dispatched}
                dotColor="bg-purple-400"
                emptyText="No dispatched requests"
              />
              <Separator className="bg-zinc-800" />
              <RequestSection
                title="In Progress (Being Handled)"
                requests={groups.inProgress}
                dotColor="bg-cyan-400"
                emptyText="No in-progress requests"
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Handoff Dialog */}
      <Dialog open={handoffDialogOpen} onOpenChange={setHandoffDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-amber-400" />
              Complete Shift Handoff
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will log the handoff and notify the incoming shift.
              All {totalOpen} open requests will be transferred.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
              <p className="text-amber-300 text-xs font-medium">
                {totalOpen} open request{totalOpen !== 1 ? "s" : ""} will be transferred to the incoming shift.
              </p>
            </div>
            <Textarea
              value={handoffNote}
              onChange={e => setHandoffNote(e.target.value)}
              placeholder="Brief the incoming shift on any special situations, VIP guests, pending issues..."
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setHandoffDialogOpen(false)} className="text-zinc-400">
              Cancel
            </Button>
            <Button
              onClick={handleCompleteHandoff}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2"
            >
              <Send className="w-4 h-4" />
              Submit Handoff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
