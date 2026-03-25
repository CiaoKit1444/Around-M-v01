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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { SendHorizonal, ChevronRight, Loader2, RefreshCw, Users } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DISPATCHED: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  RUNNING:    "bg-teal-500/20 text-teal-400 border-teal-500/30",
  PENDING:    "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CLOSED:     "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  CANCELLED:  "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function SPOutboundPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const providerId = (user as any)?.id ?? "";
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.spTickets.listByProvider.useQuery(
    { providerId },
    { enabled: Boolean(providerId), refetchInterval: 30_000 }
  );

  const { data: operatorsData } = trpc.serviceOperators.listByProvider.useQuery(
    { providerId },
    { enabled: Boolean(providerId) }
  );
  const operators = operatorsData ?? [];

  const [dispatchTicketId, setDispatchTicketId] = useState<string | null>(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState("");
  const [dispatchNotes, setDispatchNotes] = useState("");
  const dispatchMutation = trpc.spTickets.dispatchTicket.useMutation({
    onSuccess: () => {
      toast.success("Ticket dispatched — SO job created");
      setDispatchTicketId(null);
      setSelectedOperatorId("");
      setDispatchNotes("");
      utils.spTickets.listByProvider.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const tickets = data?.items ?? [];
  const activeTickets = tickets.filter(
    (t) => t.status !== "CLOSED" && t.status !== "CANCELLED" && t.status !== "OPEN"
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <SendHorizonal className="w-6 h-6 text-teal-400" />
            Outbound Queue
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Accepted tickets — dispatch to your Service Operators
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
      ) : activeTickets.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <SendHorizonal className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No active tickets</p>
            <p className="text-zinc-600 text-sm mt-1">
              Accepted tickets will appear here for dispatch
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeTickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={`text-xs ${STATUS_COLORS[ticket.status] ?? "bg-zinc-500/20 text-zinc-400"}`}
                      >
                        {ticket.status}
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
                      Updated {formatDistanceToNow(new Date(ticket.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {ticket.status === "CONFIRMED" && (
                      <Button
                        size="sm"
                        className="gap-1.5 bg-violet-500 hover:bg-violet-600 text-white"
                        onClick={() => setDispatchTicketId(ticket.id)}
                      >
                        <Users className="w-3.5 h-3.5" /> Dispatch
                      </Button>
                    )}
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

      {/* Dispatch dialog */}
      <Dialog
        open={dispatchTicketId !== null}
        onOpenChange={() => setDispatchTicketId(null)}
      >
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Dispatch Ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Select a Service Operator</p>
              <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue placeholder="Choose operator..." />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {operators
                    .filter((op) => op.status === "ACTIVE" || op.status === "ON_DUTY")
                    .map((op) => (
                      <SelectItem key={op.id} value={op.id} className="text-zinc-100">
                        {op.displayName} — {op.specialisation}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Optional dispatch notes..."
              value={dispatchNotes}
              onChange={(e) => setDispatchNotes(e.target.value)}
              className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDispatchTicketId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-violet-500 hover:bg-violet-600 text-white"
              disabled={selectedOperatorId.length === 0 || dispatchMutation.isPending}
              onClick={() => {
                if (dispatchTicketId && selectedOperatorId.length > 0) {
                  dispatchMutation.mutate({
                    ticketId: dispatchTicketId,
                    operatorId: selectedOperatorId,
                    notes: dispatchNotes || undefined,
                  });
                }
              }}
            >
              {dispatchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Confirm Dispatch"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
