/**
 * SPJobDetailPage — Service Provider: read-only detail view for a single job.
 *
 * Route: /sp/jobs/:id
 *
 * Shows: job items, payment status, assignment info, timeline, audit log.
 * SP-only actions: Accept, Reject, Start Job, Mark Complete (same as queue card).
 * No FO-only actions (no payment link, no dispute resolution, no assignment).
 */

import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft, CheckCircle, Clock, Package,
  Phone, User, FileText, Loader2, AlertTriangle,
  PlayCircle, Flag, CheckCircle2, XCircle,
  CreditCard, ShieldCheck, AlertOctagon, Scale,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  DISPATCHED:        { label: "Awaiting Response",  color: "bg-amber-500/15 text-amber-400 border-amber-500/30",    description: "Waiting for your response" },
  SP_ACCEPTED:       { label: "Accepted",           color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30", description: "Accepted — awaiting guest payment" },
  SP_REJECTED:       { label: "Rejected",           color: "bg-red-500/15 text-red-400 border-red-500/30",          description: "You declined this job" },
  PENDING_PAYMENT:   { label: "Pending Payment",    color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", description: "Payment link sent to guest" },
  PAYMENT_CONFIRMED: { label: "Paid — Ready",       color: "bg-teal-500/15 text-teal-400 border-teal-500/30",       description: "Payment received — ready to start" },
  IN_PROGRESS:       { label: "In Progress",        color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",       description: "Service being delivered" },
  COMPLETED:         { label: "Completed",          color: "bg-green-500/15 text-green-400 border-green-500/30",    description: "Service complete — awaiting guest confirmation" },
  FULFILLED:         { label: "Fulfilled",          color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", description: "Guest confirmed — fully closed" },
  CANCELLED:         { label: "Cancelled",          color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",       description: "Request cancelled" },
  DISPUTED:          { label: "Disputed",           color: "bg-orange-500/15 text-orange-400 border-orange-500/30", description: "Guest raised a dispute" },
  RESOLVED:          { label: "Resolved",           color: "bg-purple-500/15 text-purple-400 border-purple-500/30", description: "Dispute resolved" },
};

// ── Accept Dialog ─────────────────────────────────────────────────────────────

function AcceptDialog({
  assignmentId, open, onClose,
}: { assignmentId: string; open: boolean; onClose: () => void }) {
  const [eta, setEta] = useState("");
  const [staffName, setStaffName] = useState("");
  const [notes, setNotes] = useState("");
  const utils = trpc.useUtils();

  const accept = trpc.requests.acceptJob.useMutation({
    onSuccess: () => {
      toast.success("Job accepted — guest and hotel notified");
      utils.requests.getRequest.invalidate();
      utils.requests.listSpJobs.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

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
              onChange={(e) => setEta(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Staff Name (optional)</Label>
            <Input
              placeholder="Technician name"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Delivery Notes (optional)</Label>
            <Textarea
              placeholder="Any notes for the guest or hotel…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            size="sm"
            disabled={accept.isPending || !eta}
            className="bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 gap-1.5"
            onClick={() => accept.mutate({ assignmentId, estimatedArrival: new Date(eta).toISOString(), assignedStaffName: staffName || undefined, deliveryNotes: notes || undefined })}
          >
            {accept.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Confirm Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Reject Dialog ─────────────────────────────────────────────────────────────

function RejectDialog({
  assignmentId, open, onClose,
}: { assignmentId: string; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const reject = trpc.requests.rejectJob.useMutation({
    onSuccess: () => {
      toast.success("Job declined");
      utils.requests.getRequest.invalidate();
      utils.requests.listSpJobs.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Decline Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-zinc-400 text-sm">Please provide a reason for declining this job.</p>
          <Textarea
            placeholder="Reason for declining…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
            rows={3}
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            size="sm"
            disabled={reject.isPending || !reason.trim()}
            className="bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 gap-1.5"
            onClick={() => reject.mutate({ assignmentId, rejectionReason: reason })}
          >
            {reject.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
            Confirm Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SPJobDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();

  const [acceptOpen, setAcceptOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data, isLoading, isError, error } = trpc.requests.getRequest.useQuery(
    { requestId: params.id },
    { enabled: !!params.id, refetchInterval: 10_000 }
  );

  const utils = trpc.useUtils();

  const markInProgress = trpc.requests.markInProgress.useMutation({
    onSuccess: () => {
      toast.success("Job marked as In Progress");
      void utils.requests.getRequest.invalidate({ requestId: params.id });
      void utils.requests.listSpJobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markCompleted = trpc.requests.markCompleted.useMutation({
    onSuccess: () => {
      toast.success("Job completed — guest has 10 minutes to confirm");
      void utils.requests.getRequest.invalidate({ requestId: params.id });
      void utils.requests.listSpJobs.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const request    = data?.request ?? null;
  const items      = data?.items ?? [];
  const payment    = data?.payment ?? null;
  const events     = data?.events ?? [];
  const assignment = data?.activeAssignment ?? null;

  const status = request?.status ?? "DISPATCHED";
  const cfg    = STATUS_CONFIG[status] ?? { label: status, color: "bg-zinc-700 text-zinc-300", description: "" };

  const canAccept   = status === "DISPATCHED" && !!assignment;
  const canReject   = status === "DISPATCHED" && !!assignment;
  const canStart    = status === "PAYMENT_CONFIRMED";
  const canComplete = status === "IN_PROGRESS";

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (isError || !request) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/sp/jobs")}
          className="text-zinc-400 hover:text-zinc-200 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Jobs
        </Button>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{(error as any)?.message ?? "Job not found"}</span>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-3xl">

      {/* Back + header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/sp/jobs")}
          className="text-zinc-400 hover:text-zinc-200 gap-1.5 mt-0.5 shrink-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-zinc-100">{request.requestNumber}</h1>
            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
          </div>
          <p className="text-zinc-500 text-xs mt-0.5">{cfg.description}</p>
        </div>

        {/* SP actions */}
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          {canComplete && (
            <Button size="sm"
              disabled={markCompleted.isPending}
              className="h-8 text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 gap-1"
              onClick={() => markCompleted.mutate({ requestId: request.id })}>
              {markCompleted.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
              Mark Complete
            </Button>
          )}
          {canStart && (
            <Button size="sm"
              disabled={markInProgress.isPending}
              className="h-8 text-xs bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-400 border border-cyan-500/30 gap-1"
              onClick={() => markInProgress.mutate({ requestId: request.id })}>
              {markInProgress.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              Start Job
            </Button>
          )}
          {canAccept && (
            <Button size="sm"
              className="h-8 text-xs bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 gap-1"
              onClick={() => setAcceptOpen(true)}>
              <CheckCircle2 className="w-3.5 h-3.5" /> Accept
            </Button>
          )}
          {canReject && (
            <Button size="sm" variant="ghost"
              className="h-8 text-xs text-red-400 hover:bg-red-500/10 gap-1"
              onClick={() => setRejectOpen(true)}>
              <XCircle className="w-3.5 h-3.5" /> Decline
            </Button>
          )}
        </div>
      </div>

      {/* Status banners */}
      {status === "PAYMENT_CONFIRMED" && (
        <Card className="bg-zinc-900 border-teal-500/30">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <p className="text-teal-300 text-sm font-medium">Payment Confirmed</p>
                <p className="text-zinc-500 text-xs">Guest has paid. Click "Start Job" to begin service delivery.</p>
              </div>
            </div>
            <Button size="sm" disabled={markInProgress.isPending}
              className="bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 gap-1.5 text-xs shrink-0"
              onClick={() => markInProgress.mutate({ requestId: request.id })}>
              {markInProgress.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
              Start Job
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "IN_PROGRESS" && (
        <Card className="bg-zinc-900 border-cyan-500/30">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-cyan-300 text-sm font-medium">Job In Progress</p>
                <p className="text-zinc-500 text-xs">Click "Mark Complete" when service delivery is done.</p>
              </div>
            </div>
            <Button size="sm" disabled={markCompleted.isPending}
              className="bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 gap-1.5 text-xs shrink-0"
              onClick={() => markCompleted.mutate({ requestId: request.id })}>
              {markCompleted.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Flag className="w-3.5 h-3.5" />}
              Mark Complete
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "COMPLETED" && (
        <Card className="bg-zinc-900 border-green-500/30">
          <CardContent className="py-3 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
            <div>
              <p className="text-green-300 text-sm font-medium">Service Completed</p>
              <p className="text-zinc-500 text-xs">Awaiting guest confirmation (10-minute window).</p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "FULFILLED" && (
        <Card className="bg-zinc-900 border-emerald-500/30">
          <CardContent className="py-3 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-300 text-sm font-medium">Job Fulfilled</p>
              <p className="text-zinc-500 text-xs">Guest confirmed service delivery. This job is fully closed.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "DISPUTED" && (
        <Card className="bg-zinc-900 border-orange-500/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-orange-300 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4" /> Dispute Raised
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="text-zinc-400 text-xs">
              The guest reported an issue with this service. The Front Office team is handling the resolution.
            </p>
            {request.statusReason && (
              <div className="bg-orange-950/40 border border-orange-500/20 rounded px-3 py-2">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Guest's reason:</p>
                <p className="text-orange-200 text-xs italic">"{request.statusReason}"</p>
              </div>
            )}
            <p className="text-zinc-600 text-xs">No action required from you at this time.</p>
          </CardContent>
        </Card>
      )}

      {status === "RESOLVED" && (
        <Card className="bg-zinc-900 border-purple-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-300 flex items-center gap-2">
              <Scale className="w-4 h-4" /> Dispute Resolved
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="text-zinc-400 text-xs">
              The dispute raised by the guest has been reviewed and resolved by the Front Office.
            </p>
            {request.statusReason && (
              <div className="bg-purple-950/40 border border-purple-500/20 rounded px-3 py-2">
                <p className="text-zinc-500 text-xs font-medium mb-0.5">Resolution note:</p>
                <p className="text-purple-200 text-xs italic">"{request.statusReason}"</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Assignment info */}
      {assignment && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <User className="w-4 h-4" /> Assignment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {assignment.estimatedArrival && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> ETA</span>
                <span className="text-zinc-300 font-mono">{new Date(assignment.estimatedArrival).toLocaleString()}</span>
              </div>
            )}
            {assignment.assignedStaffName && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500 flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Staff</span>
                <span className="text-zinc-300">{assignment.assignedStaffName}</span>
              </div>
            )}
            {assignment.deliveryNotes && (
              <div className="space-y-1">
                <span className="text-zinc-500 text-xs flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> Notes</span>
                <p className="text-zinc-400 text-xs bg-zinc-800 rounded px-2 py-1.5">{assignment.deliveryNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Package className="w-4 h-4" /> Job Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.length === 0 ? (
            <p className="text-zinc-500 text-xs">No items listed.</p>
          ) : (
            items.map((item, i) => (
              <div key={item.id}>
                {i > 0 && <Separator className="bg-zinc-800 my-2" />}
                <div className="flex justify-between items-start py-1">
                  <div>
                    <p className="text-zinc-200 text-sm font-medium">{item.itemName}</p>
                    <p className="text-zinc-500 text-xs">{item.quantity}× · {item.itemCategory}</p>
                    {item.guestNotes && (
                      <p className="text-zinc-400 text-xs mt-0.5 italic">"{item.guestNotes}"</p>
                    )}
                  </div>
                  <p className="text-zinc-300 text-xs font-mono">
                    {parseFloat(item.lineTotal) > 0
                      ? `฿${parseFloat(item.lineTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                      : "Free"}
                  </p>
                </div>
              </div>
            ))
          )}
          {request.totalAmount && parseFloat(request.totalAmount) > 0 && (
            <>
              <Separator className="bg-zinc-700 mt-2" />
              <div className="flex justify-between text-sm font-semibold pt-1">
                <span className="text-zinc-300">Total</span>
                <span className="text-zinc-100">
                  ฿{parseFloat(request.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment status (read-only) */}
      {payment && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Amount</span>
              <span className="text-zinc-300 font-mono">
                ฿{parseFloat(payment.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Status</span>
              <Badge variant="outline" className={`text-xs ${
                payment.status === "PAID"
                  ? "bg-green-500/15 text-green-400 border-green-500/30"
                  : "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
              }`}>
                {payment.status}
              </Badge>
            </div>
            {payment.paidAt && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Paid at</span>
                <span className="text-teal-400 font-mono">{new Date(payment.paidAt).toLocaleString()}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Guest info (read-only) */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Phone className="w-4 h-4" /> Guest &amp; Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {request.guestName && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Guest</span>
              <span className="text-zinc-300">{request.guestName}</span>
            </div>
          )}
          {request.guestPhone && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Phone</span>
              <span className="text-zinc-300 font-mono">{request.guestPhone}</span>
            </div>
          )}
          {request.roomId && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Room</span>
              <span className="text-zinc-300 font-mono">{request.roomId}</span>
            </div>
          )}
          {request.guestNotes && (
            <div className="space-y-1">
              <span className="text-zinc-500 text-xs">Guest Notes</span>
              <p className="text-zinc-400 text-xs bg-zinc-800 rounded px-2 py-1.5">{request.guestNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-zinc-500">Submitted</span>
            <span className="text-zinc-400 font-mono">{new Date(request.createdAt).toLocaleString()}</span>
          </div>
          {request.confirmedAt && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Confirmed</span>
              <span className="text-zinc-400 font-mono">{new Date(request.confirmedAt).toLocaleString()}</span>
            </div>
          )}
          {payment?.paidAt && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Paid</span>
              <span className="text-teal-400 font-mono">{new Date(payment.paidAt).toLocaleString()}</span>
            </div>
          )}
          {request.completedAt && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Completed</span>
              <span className="text-zinc-400 font-mono">{new Date(request.completedAt).toLocaleString()}</span>
            </div>
          )}
          {request.cancelledAt && (
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Cancelled</span>
              <span className="text-red-400 font-mono">{new Date(request.cancelledAt).toLocaleString()}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit log (SP-visible events only) */}
      {events.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Job History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 text-xs">
                  <span className="text-zinc-600 font-mono shrink-0 mt-0.5">
                    {new Date(ev.createdAt).toLocaleTimeString()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-zinc-400">
                      {ev.fromState && <><span className="text-zinc-600">{ev.fromState}</span> → </>}
                      <span className="text-zinc-200 font-medium">{ev.toState}</span>
                    </span>
                    {ev.note && <p className="text-zinc-500 mt-0.5 truncate">{ev.note}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs bg-zinc-800 text-zinc-500 border-zinc-700 shrink-0">
                    {ev.actorType}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      {assignment && (
        <>
          <AcceptDialog assignmentId={assignment.id} open={acceptOpen} onClose={() => setAcceptOpen(false)} />
          <RejectDialog assignmentId={assignment.id} open={rejectOpen} onClose={() => setRejectOpen(false)} />
        </>
      )}
    </div>
  );
}
