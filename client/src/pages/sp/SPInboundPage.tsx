import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Inbox,
  CheckCircle,
  XCircle,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SPInboundPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const providerId = (user as any)?.id ?? "";
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.spTickets.listInbound.useQuery(
    { providerId },
    { enabled: Boolean(providerId), refetchInterval: 30_000 }
  );

  const [acceptTicketId, setAcceptTicketId] = useState<string | null>(null);
  const [acceptNotes, setAcceptNotes] = useState("");
  const acceptMutation = trpc.spTickets.acceptTicket.useMutation({
    onSuccess: () => {
      toast.success("Ticket accepted — moved to Outbound Queue");
      setAcceptTicketId(null);
      setAcceptNotes("");
      utils.spTickets.listInbound.invalidate();
      utils.spTickets.listByProvider.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [declineTicketId, setDeclineTicketId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const declineMutation = trpc.spTickets.declineTicket.useMutation({
    onSuccess: () => {
      toast.success("Ticket declined — items returned to hotel for re-assignment");
      setDeclineTicketId(null);
      setDeclineReason("");
      utils.spTickets.listInbound.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const tickets = data?.items ?? [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Inbox className="w-6 h-6 text-teal-400" />
            Inbound Tickets
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            New service assignments from hotel staff awaiting your response
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Inbox className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No open tickets</p>
            <p className="text-zinc-600 text-sm mt-1">New assignments will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                        OPEN
                      </Badge>
                      <span className="text-zinc-500 text-xs">
                        #{ticket.id.slice(0, 8).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-zinc-100 font-medium text-sm">
                      Request: {ticket.requestId.slice(0, 8).toUpperCase()}
                    </p>
                    {ticket.spAdminNotes && (
                      <p className="text-zinc-400 text-xs mt-1">{ticket.spAdminNotes}</p>
                    )}
                    <p className="text-zinc-600 text-xs mt-2">
                      {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                      onClick={() => setDeclineTicketId(ticket.id)}
                    >
                      <XCircle className="w-3.5 h-3.5" /> Decline
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-teal-500 hover:bg-teal-600 text-black"
                      onClick={() => setAcceptTicketId(ticket.id)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" /> Accept
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-zinc-400 hover:text-zinc-100"
                      onClick={() => navigate(`/sp/tickets/${ticket.id}`)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Accept dialog */}
      <Dialog
        open={acceptTicketId !== null}
        onOpenChange={() => setAcceptTicketId(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Accept Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm">
              Accepting confirms you will provide the requested service.
            </p>
            <Textarea
              placeholder="Optional notes for your team..."
              value={acceptNotes}
              onChange={(e) => setAcceptNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptTicketId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-500 hover:bg-teal-600 text-black"
              disabled={acceptMutation.isPending}
              onClick={() => {
                if (acceptTicketId) {
                  acceptMutation.mutate({
                    ticketId: acceptTicketId,
                    notes: acceptNotes || undefined,
                  });
                }
              }}
            >
              {acceptMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Accept"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline dialog */}
      <Dialog
        open={declineTicketId !== null}
        onOpenChange={() => setDeclineTicketId(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Decline Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-zinc-400 text-sm">
              Declining returns the items to hotel staff for re-assignment. Please provide a reason.
            </p>
            <Textarea
              placeholder="Reason for declining (required)..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineTicketId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={declineReason.trim().length === 0 || declineMutation.isPending}
              onClick={() => {
                if (declineTicketId && declineReason.trim().length > 0) {
                  declineMutation.mutate({
                    ticketId: declineTicketId,
                    declineReason: declineReason.trim(),
                  });
                }
              }}
            >
              {declineMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Decline"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
