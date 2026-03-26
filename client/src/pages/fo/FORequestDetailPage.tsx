/**
 * FORequestDetailPage — Front Office: full detail view for a single service request.
 *
 * Route: /fo/queue/:id
 *
 * Key features:
 *  - Full request info (items, guest, timeline, audit log)
 *  - "Send Payment Link" action for SP_ACCEPTED / PENDING_PAYMENT requests
 *    → copies the guest payment URL to clipboard + shows a QR for the FO agent to share
 *  - Assign / Cancel actions mirrored from the queue card
 */

import { useState, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  ArrowLeft, CreditCard, Copy, CheckCircle, Clock,
  Package, Phone, MessageSquare, UserCheck, XCircle,
  Loader2, AlertTriangle, ExternalLink, QrCode,
  PlayCircle, MessageCircle, Send, Flag, Star,
  ShieldCheck, AlertOctagon, Scale, ListChecks, Plus,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; description: string }> = {
  SUBMITTED:         { label: "Submitted",         color: "bg-blue-500/15 text-blue-400 border-blue-500/30",       description: "Awaiting assignment" },
  PENDING_MATCH:     { label: "Pending Match",     color: "bg-amber-500/15 text-amber-400 border-amber-500/30",    description: "Looking for a provider" },
  AUTO_MATCHING:     { label: "Auto-Matching",     color: "bg-amber-500/15 text-amber-400 border-amber-500/30",    description: "System is matching" },
  MATCHED:           { label: "Matched",           color: "bg-purple-500/15 text-purple-400 border-purple-500/30", description: "Provider matched" },
  DISPATCHED:        { label: "Dispatched",        color: "bg-purple-500/15 text-purple-400 border-purple-500/30", description: "Sent to provider" },
  SP_ACCEPTED:       { label: "SP Accepted",       color: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30", description: "Provider accepted — awaiting payment" },
  SP_REJECTED:       { label: "SP Rejected",       color: "bg-red-500/15 text-red-400 border-red-500/30",          description: "Provider declined" },
  PENDING_PAYMENT:   { label: "Pending Payment",   color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30", description: "Payment link sent to guest" },
  PAYMENT_CONFIRMED: { label: "Paid",              color: "bg-teal-500/15 text-teal-400 border-teal-500/30",       description: "Payment received" },
  IN_PROGRESS:       { label: "In Progress",       color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",       description: "Service being delivered" },
  COMPLETED:         { label: "Completed",         color: "bg-green-500/15 text-green-400 border-green-500/30",    description: "Service complete" },
  FULFILLED:         { label: "Fulfilled",         color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", description: "Fully fulfilled" },
  CANCELLED:         { label: "Cancelled",         color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",       description: "Request cancelled" },
  AUTO_CANCELLED:    { label: "Auto-Cancelled",    color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",       description: "Auto-cancelled by system" },
  DISPUTED:          { label: "Disputed",          color: "bg-orange-500/15 text-orange-400 border-orange-500/30", description: "Under dispute" },
  EXPIRED:           { label: "Expired",           color: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",       description: "SLA expired" },
};

// ── Assign Dialog ─────────────────────────────────────────────────────────────

function AssignDialog({
  requestId, propertyId, open, onClose,
}: { requestId: string; propertyId: string; open: boolean; onClose: () => void }) {
  const [providerId, setProviderId] = useState("");
  const utils = trpc.useUtils();

  const { data: providers = [] } = trpc.requests.listProviders.useQuery(
    { propertyId },
    { enabled: open && !!propertyId }
  );

  const assign = trpc.requests.assignProvider.useMutation({
    onSuccess: () => {
      toast.success("Provider assigned");
      utils.requests.getRequest.invalidate({ requestId });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Assign Service Provider</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Select Provider</Label>
            <Select value={providerId} onValueChange={setProviderId}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                <SelectValue placeholder="Choose a provider…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-zinc-100">
                    {p.name} — {p.category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Cancel</Button>
          <Button
            onClick={() => assign.mutate({ requestId, providerId })}
            disabled={!providerId || assign.isPending}
            className="bg-amber-500 hover:bg-amber-400 text-black"
          >
            {assign.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Cancel Dialog ─────────────────────────────────────────────────────────────

function CancelDialog({
  requestId, open, onClose,
}: { requestId: string; open: boolean; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const cancel = trpc.requests.cancelRequest.useMutation({
    onSuccess: () => {
      toast.success("Request cancelled");
      utils.requests.getRequest.invalidate({ requestId });
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100">Cancel Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-zinc-400 text-sm">This will cancel the request and notify the guest.</p>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for cancellation…"
            className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400">Back</Button>
          <Button
            onClick={() => cancel.mutate({ requestId, reason })}
            disabled={cancel.isPending}
            variant="destructive"
          >
            {cancel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel Request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Payment Link Panel ────────────────────────────────────────────────────────

function PaymentLinkPanel({
  requestId, refNo, guestPhone,
}: { requestId: string; refNo: string; guestPhone?: string | null }) {
  const [copied, setCopied] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [whatsappSent, setWhatsappSent] = useState(false);
  const paymentUrl = `${window.location.origin}/guest/payment/${requestId}`;

  const sendSms = trpc.requests.sendPaymentSms.useMutation({
    onSuccess: (data) => {
      if (data.channel === "sms") {
        setSmsSent(true);
        toast.success(`[Stub] SMS sent to ${data.phone}`);
        setTimeout(() => setSmsSent(false), 4000);
      } else {
        setWhatsappSent(true);
        toast.success(`[Stub] WhatsApp sent to ${data.phone}`);
        setTimeout(() => setWhatsappSent(false), 4000);
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(paymentUrl).then(() => {
      setCopied(true);
      toast.success("Payment link copied to clipboard!");
      setTimeout(() => setCopied(false), 3000);
    }).catch(() => {
      toast.error("Could not copy — please copy manually");
    });
  }, [paymentUrl]);

  const handleSend = useCallback((channel: "sms" | "whatsapp") => {
    if (!guestPhone) {
      toast.error("No guest phone number on record");
      return;
    }
    sendSms.mutate({
      requestId,
      phone: guestPhone,
      channel,
      origin: window.location.origin,
    });
  }, [guestPhone, requestId, sendSms]);

  return (
    <Card className="bg-zinc-900 border-yellow-500/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-yellow-400 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Payment Required — Share Link with Guest
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-zinc-400 text-xs">
          The service provider has accepted this request. Share the payment link below with the guest
          to complete PromptPay QR payment.
        </p>

        {/* URL display */}
        <div className="flex items-center gap-2 bg-zinc-800 rounded-lg px-3 py-2 border border-zinc-700">
          <span className="text-zinc-300 text-xs font-mono flex-1 truncate">{paymentUrl}</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className={`h-7 px-2 gap-1 text-xs shrink-0 ${copied ? "text-green-400" : "text-zinc-400 hover:text-zinc-200"}`}
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>

        {/* Primary action row */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleCopy}
            className="flex-1 bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-400 border border-yellow-500/30 gap-1.5 text-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Link
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => window.open(paymentUrl, "_blank")}
            className="text-zinc-400 hover:text-zinc-200 gap-1.5 text-xs px-3"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Preview
          </Button>
        </div>

        {/* SMS / WhatsApp send row */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={sendSms.isPending || smsSent || !guestPhone}
            onClick={() => handleSend("sms")}
            className={`flex-1 gap-1.5 text-xs border-zinc-700 ${
              smsSent ? "text-green-400 border-green-500/30" : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            {sendSms.isPending && sendSms.variables?.channel === "sms"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : smsSent
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <Send className="w-3.5 h-3.5" />}
            {smsSent ? "SMS Sent" : "Send SMS"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={sendSms.isPending || whatsappSent || !guestPhone}
            onClick={() => handleSend("whatsapp")}
            className={`flex-1 gap-1.5 text-xs border-zinc-700 ${
              whatsappSent ? "text-green-400 border-green-500/30" : "text-zinc-300 hover:text-zinc-100"
            }`}
          >
            {sendSms.isPending && sendSms.variables?.channel === "whatsapp"
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : whatsappSent
              ? <CheckCircle className="w-3.5 h-3.5" />
              : <MessageCircle className="w-3.5 h-3.5" />}
            {whatsappSent ? "Sent!" : "WhatsApp"}
          </Button>
        </div>

        {!guestPhone && (
          <p className="text-zinc-600 text-xs">
            No phone number on record — use Copy Link to share manually.
          </p>
        )}

        <p className="text-zinc-600 text-xs">
          Ref: {refNo} · Guest can also scan QR from the payment page
          {" "}<span className="text-amber-600">[SMS/WhatsApp: stub mode]</span>
        </p>
      </CardContent>
    </Card>
  );
}

// ── Item-Level Assignment Dialog ─────────────────────────────────────────────

type ItemAssignDialogProps = {
  requestId: string;
  propertyId: string;
  items: Array<{ id: string; itemName: string; itemCategory: string; quantity: number }>;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

function ItemAssignDialog({ requestId, propertyId, items, open, onClose, onSuccess }: ItemAssignDialogProps) {
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [notes, setNotes] = useState("");

  const { data: providers = [] } = trpc.requests.listProviders.useQuery(
    { propertyId },
    { enabled: !!propertyId && open }
  );

  const assignItems = trpc.spTickets.assignItemsToSp.useMutation({
    onSuccess: () => {
      toast.success("Items assigned to SP — ticket created");
      setSelectedItems([]);
      setSelectedProvider("");
      setNotes("");
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleItem = (id: string) =>
    setSelectedItems((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const handleSubmit = () => {
    if (!selectedProvider || selectedItems.length === 0) return;
    assignItems.mutate({ requestId, providerId: selectedProvider, itemIds: selectedItems, notes: notes || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-zinc-900 border-zinc-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-400" />
            Assign Items to Service Provider
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Item selection */}
          <div className="space-y-2">
            <Label className="text-zinc-300 text-sm">Select Items</Label>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800 border border-zinc-700 cursor-pointer hover:border-indigo-500/40 transition-colors"
                  onClick={() => toggleItem(item.id)}>
                  <Checkbox
                    checked={selectedItems.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                    className="border-zinc-600"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-200 text-sm font-medium truncate">{item.itemName}</p>
                    <p className="text-zinc-500 text-xs">{item.quantity}× · {item.itemCategory}</p>
                  </div>
                </div>
              ))}
            </div>
            {selectedItems.length > 0 && (
              <p className="text-indigo-400 text-xs">{selectedItems.length} item(s) selected</p>
            )}
          </div>

          {/* Provider selection */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Service Provider</Label>
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-200">
                <SelectValue placeholder="Select a provider…" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-zinc-200 focus:bg-zinc-700">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Optional notes */}
          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Notes (optional)</Label>
            <Textarea
              placeholder="Any special instructions for the SP…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="text-zinc-400 hover:text-zinc-200">
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={assignItems.isPending || !selectedProvider || selectedItems.length === 0}
            className="bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 gap-1.5"
            onClick={handleSubmit}
          >
            {assignItems.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <Plus className="w-3.5 h-3.5" />}
            Create Ticket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FORequestDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const { activeRole } = useActiveRole();
  const propertyId = activeRole?.scopeId ?? "";

  const [assignOpen, setAssignOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolutionNote, setResolutionNote] = useState("");
  const [itemAssignOpen, setItemAssignOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = trpc.requests.getRequest.useQuery(
    { requestId: params.id },
    { enabled: !!params.id, refetchInterval: 15_000 }
  );

  const utils = trpc.useUtils();

  const markInProgress = trpc.requests.markInProgress.useMutation({
    onSuccess: () => {
      toast.success("Request marked as In Progress");
      void utils.requests.getRequest.invalidate({ requestId: params.id });
      void utils.requests.listByProperty.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const markCompleted = trpc.requests.markCompleted.useMutation({
    onSuccess: (data) => {
      toast.success(`Service completed! Guest has 10 min to confirm. Ref: ${data.requestNumber}`);
      void utils.requests.getRequest.invalidate({ requestId: params.id });
      void utils.requests.listByProperty.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const resolveDispute = trpc.requests.resolveDispute.useMutation({
    onSuccess: () => {
      toast.success("Dispute resolved successfully");
      setResolveOpen(false);
      setResolutionNote("");
      void utils.requests.getRequest.invalidate({ requestId: params.id });
      void utils.requests.listByProperty.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const request    = data?.request ?? null;
  const items      = data?.items ?? [];
  const payment    = data?.payment ?? null;
  const events     = data?.events ?? [];
  const assignment = data?.activeAssignment ?? null;

  // Load existing tickets for this request to show assignment badges
  const { data: ticketsData } = trpc.spTickets.listTicketsForRequest.useQuery(
    { requestId: params.id },
    { enabled: !!params.id }
  );
  const existingTickets = ticketsData?.items ?? [];

  // Build a map: itemId → providerName (from tickets)
  const { data: providersData } = trpc.requests.listProviders.useQuery(
    { propertyId },
    { enabled: !!propertyId }
  );
  const providerMap = Object.fromEntries(
    (providersData ?? []).map((p) => [p.id, p.name])
  );
  const itemTicketMap: Record<string, string> = {};
  for (const ticket of existingTickets) {
    const ids = Array.isArray(ticket.itemIds) ? ticket.itemIds as string[] : [];
    for (const iid of ids) {
      itemTicketMap[iid] = providerMap[ticket.providerId] ?? ticket.providerId;
    }
  }

  const status    = request?.status ?? "SUBMITTED";
  const cfg       = STATUS_CONFIG[status] ?? { label: status, color: "bg-zinc-700 text-zinc-300", description: "" };
  const isTerminal = ["COMPLETED", "FULFILLED", "CANCELLED", "AUTO_CANCELLED", "DISPUTED", "RESOLVED", "EXPIRED"].includes(status);
  const canAssign  = ["SUBMITTED", "PENDING_MATCH", "AUTO_MATCHING", "SP_REJECTED"].includes(status);
  const canItemAssign = !isTerminal && items.length > 0;
  const canCancel  = !isTerminal;
  const needsPayment = ["SP_ACCEPTED", "PENDING_PAYMENT"].includes(status);
  const canMarkInProgress = status === "PAYMENT_CONFIRMED";
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
        <Button variant="ghost" size="sm" onClick={() => navigate("/fo/queue")}
          className="text-zinc-400 hover:text-zinc-200 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back to Queue
        </Button>
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-5 h-5" />
          <span>{(error as any)?.message ?? "Request not found"}</span>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5 max-w-3xl">

      {/* Back + header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/fo/queue")}
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

        {/* Quick actions */}
        <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
          {canComplete && (
            <Button size="sm"
              disabled={markCompleted.isPending}
              className="h-8 text-xs bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 gap-1"
              onClick={() => markCompleted.mutate({ requestId: request.id })}>
              {markCompleted.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Flag className="w-3.5 h-3.5" />}
              Complete Service
            </Button>
          )}
          {canMarkInProgress && (
            <Button size="sm"
              disabled={markInProgress.isPending}
              className="h-8 text-xs bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 gap-1"
              onClick={() => markInProgress.mutate({ requestId: request.id })}>
              {markInProgress.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <PlayCircle className="w-3.5 h-3.5" />}
              Mark In Progress
            </Button>
          )}
          {canAssign && (
            <Button size="sm"
              className="h-8 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 gap-1"
              onClick={() => setAssignOpen(true)}>
              <UserCheck className="w-3.5 h-3.5" /> Assign
            </Button>
          )}
          {canItemAssign && (
            <Button size="sm"
              className="h-8 text-xs bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 gap-1"
              onClick={() => setItemAssignOpen(true)}>
              <ListChecks className="w-3.5 h-3.5" /> Assign Items
            </Button>
          )}
          {canCancel && (
            <Button size="sm" variant="ghost"
              className="h-8 text-xs text-red-400 hover:bg-red-500/10 gap-1"
              onClick={() => setCancelOpen(true)}>
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Payment link panel — shown when SP has accepted */}
      {needsPayment && (
        <PaymentLinkPanel
          requestId={request.id}
          refNo={request.requestNumber}
          guestPhone={request.guestPhone}
        />
      )}

      {/* Payment confirmed banner */}
      {status === "PAYMENT_CONFIRMED" && (
        <Card className="bg-zinc-900 border-teal-500/30">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-teal-400 shrink-0" />
              <div>
                <p className="text-teal-300 text-sm font-medium">Payment Confirmed</p>
                <p className="text-zinc-500 text-xs">Click “Mark In Progress” above to start service delivery.</p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={markInProgress.isPending}
              className="bg-teal-500/15 hover:bg-teal-500/25 text-teal-400 border border-teal-500/30 gap-1.5 text-xs shrink-0"
              onClick={() => markInProgress.mutate({ requestId: request.id })}
            >
              {markInProgress.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <PlayCircle className="w-3.5 h-3.5" />}
              Start Service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* In Progress banner */}
      {status === "IN_PROGRESS" && (
        <Card className="bg-zinc-900 border-cyan-500/30">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <div>
                <p className="text-cyan-300 text-sm font-medium">Service In Progress</p>
                <p className="text-zinc-500 text-xs">Click "Complete Service" above when service delivery is done.</p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={markCompleted.isPending}
              className="bg-green-500/15 hover:bg-green-500/25 text-green-400 border border-green-500/30 gap-1.5 text-xs shrink-0"
              onClick={() => markCompleted.mutate({ requestId: request.id })}
            >
              {markCompleted.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Flag className="w-3.5 h-3.5" />}
              Complete Service
            </Button>
          </CardContent>
        </Card>
      )}

      {/* FULFILLED banner — guest confirmed service */}
      {status === "FULFILLED" && (
        <Card className="bg-zinc-900 border-emerald-500/30">
          <CardContent className="py-3 flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-300 text-sm font-medium">Service Fulfilled</p>
              <p className="text-zinc-500 text-xs">The guest confirmed service delivery. This request is fully closed.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* DISPUTED banner — guest raised a dispute */}
      {status === "DISPUTED" && (
        <Card className="bg-zinc-900 border-orange-500/40">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <p className="text-orange-300 text-sm font-medium">Dispute Raised by Guest</p>
                <p className="text-zinc-500 text-xs">
                  {request.statusReason
                    ? `Reason: ${request.statusReason}`
                    : "Guest reported an issue with this service."}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              disabled={resolveDispute.isPending}
              className="bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 gap-1.5 text-xs shrink-0"
              onClick={() => setResolveOpen(true)}
            >
              <Scale className="w-3.5 h-3.5" />
              Resolve Dispute
            </Button>
          </CardContent>
        </Card>
      )}

      {/* RESOLVED banner — dispute resolved */}
      {status === "RESOLVED" && (
        <Card className="bg-zinc-900 border-purple-500/30">
          <CardContent className="py-3 flex items-center gap-3">
            <Scale className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <p className="text-purple-300 text-sm font-medium">Dispute Resolved</p>
              {request.statusReason && (
                <p className="text-zinc-500 text-xs">Resolution: {request.statusReason}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed banner — guest confirmation window */}
      {status === "COMPLETED" && (
        <Card className="bg-zinc-900 border-green-500/30">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              <div>
                <p className="text-green-300 text-sm font-medium">Service Completed</p>
                <p className="text-zinc-500 text-xs">
                  Awaiting guest confirmation (10-min window).
                  {request.slaDeadline && (
                    <> Deadline: {new Date(request.slaDeadline).toLocaleTimeString()}</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-zinc-400 text-xs">Guest feedback pending</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items + totals */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
            <Package className="w-4 h-4" /> Request Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((item, i) => (
            <div key={item.id}>
              <div className="flex justify-between items-start py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-zinc-200 text-sm font-medium">{item.itemName}</p>
                  <p className="text-zinc-500 text-xs">{item.quantity}× · {item.itemCategory}</p>
                  {itemTicketMap[item.id] && (
                    <Badge variant="outline" className="text-xs bg-indigo-500/10 text-indigo-400 border-indigo-500/30 mt-1 gap-1">
                      <UserCheck className="w-2.5 h-2.5" /> {itemTicketMap[item.id]}
                    </Badge>
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  {item.includedQuantity > 0 && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30 mb-1">
                      {item.includedQuantity} incl.
                    </Badge>
                  )}
                  <p className="text-zinc-300 text-xs font-mono">
                    {parseFloat(item.lineTotal) > 0 ? `฿${parseFloat(item.lineTotal).toLocaleString("th-TH", { minimumFractionDigits: 2 })}` : "Free"}
                  </p>
                </div>
              </div>
              {i < items.length - 1 && <Separator className="bg-zinc-800" />}
            </div>
          ))}

          <Separator className="bg-zinc-700" />

          {parseFloat(request.discountAmount) > 0 && (
            <div className="flex justify-between text-xs">
              <span className="text-green-400">Included items discount</span>
              <span className="text-green-400 font-mono">-฿{parseFloat(request.discountAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-zinc-200 text-sm font-semibold">Total</span>
            <span className="text-zinc-100 text-sm font-bold font-mono">
              {parseFloat(request.totalAmount) > 0
                ? `฿${parseFloat(request.totalAmount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}`
                : "Free"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Guest info */}
      {(request.guestName || request.guestPhone || request.guestNotes || request.preferredDatetime) && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Guest Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {request.guestName && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Package className="w-3.5 h-3.5 text-zinc-500" />
                {request.guestName}
              </div>
            )}
            {request.guestPhone && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                {request.guestPhone}
              </div>
            )}
            {request.guestNotes && (
              <div className="flex items-start gap-2 text-zinc-300 text-sm">
                <MessageSquare className="w-3.5 h-3.5 text-zinc-500 mt-0.5 shrink-0" />
                <span>{request.guestNotes}</span>
              </div>
            )}
            {request.preferredDatetime && (
              <div className="flex items-center gap-2 text-zinc-300 text-sm">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                {new Date(request.preferredDatetime).toLocaleString()}
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
              <UserCheck className="w-4 h-4" /> Assigned Provider
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-zinc-200 text-sm font-medium">{assignment.assignedStaffName ?? assignment.providerId}</p>
            {assignment.acceptedAt && (
              <p className="text-zinc-500 text-xs">
                Accepted: {new Date(assignment.acceptedAt).toLocaleString()}
              </p>
            )}
            {assignment.estimatedArrival && (
              <p className="text-zinc-500 text-xs">
                ETA: {new Date(assignment.estimatedArrival).toLocaleString()}
              </p>
            )}
            {assignment.deliveryNotes && (
              <p className="text-zinc-400 text-xs italic">{assignment.deliveryNotes}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment info */}
      {payment && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Status</span>
              <Badge variant="outline" className={
                payment.status === "PAID"
                  ? "text-xs bg-teal-500/10 text-teal-400 border-teal-500/30"
                  : payment.status === "FAILED"
                  ? "text-xs bg-red-500/10 text-red-400 border-red-500/30"
                  : "text-xs bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
              }>
                {payment.status}
              </Badge>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-zinc-400">Amount</span>
              <span className="text-zinc-200 font-mono">฿{parseFloat(payment.amount).toLocaleString("th-TH", { minimumFractionDigits: 2 })}</span>
            </div>
            {payment.paidAt && (
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Paid at</span>
                <span className="text-teal-400 text-xs">{new Date(payment.paidAt).toLocaleString()}</span>
              </div>
            )}
            {payment.gatewayChargeId && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Charge ID</span>
                <span className="text-zinc-400 font-mono">{payment.gatewayChargeId}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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

      {/* Audit log */}
      {events.length > 0 && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-zinc-300">Audit Log</CardTitle>
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
      <AssignDialog
        requestId={request.id}
        propertyId={propertyId}
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
      />
      <CancelDialog
        requestId={request.id}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />

      {/* Resolve Dispute Dialog */}
      <Dialog open={resolveOpen} onOpenChange={setResolveOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-orange-400" />
              Resolve Dispute
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-zinc-400 text-sm">
              Provide a resolution note explaining how the dispute was resolved.
              This will be logged in the audit trail and the guest will be notified.
            </p>
            {request.statusReason && (
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <p className="text-orange-300 text-xs font-medium mb-1">Guest dispute reason:</p>
                <p className="text-zinc-400 text-xs">{request.statusReason}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-zinc-300 text-sm">Resolution Note</Label>
              <Textarea
                placeholder="Describe how the dispute was resolved (min. 10 characters)…"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-200 placeholder:text-zinc-600 resize-none"
                rows={4}
              />
              {resolutionNote.length > 0 && resolutionNote.length < 10 && (
                <p className="text-red-400 text-xs">At least 10 characters required ({resolutionNote.length}/10)</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setResolveOpen(false)}
              className="text-zinc-400 hover:text-zinc-200">
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={resolveDispute.isPending || resolutionNote.length < 10}
              className="bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 gap-1.5"
              onClick={() => resolveDispute.mutate({ requestId: request.id, resolutionNote })}
            >
              {resolveDispute.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Scale className="w-3.5 h-3.5" />}
              Confirm Resolution
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Item-level assignment dialog */}
      {request && (
        <ItemAssignDialog
          requestId={request.id}
          propertyId={propertyId}
          items={items}
          open={itemAssignOpen}
          onClose={() => setItemAssignOpen(false)}
          onSuccess={() => {
            void utils.requests.getRequest.invalidate({ requestId: params.id });
            void trpc.useUtils().spTickets.listTicketsForRequest.invalidate({ requestId: params.id });
          }}
        />
      )}
    </div>
  );
}
