/**
 * FOOverviewPage — Reception Desk Dashboard
 *
 * At-a-glance KPIs: pending, SLA breached, in-progress, completed today.
 * Quick links to the request queue.
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useActiveRole } from "@/hooks/useActiveRole";
import {
  ClipboardList, Clock, CheckCircle2, AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_GROUPS = {
  pending: ["SUBMITTED", "PENDING_MATCH", "SP_REJECTED"],
  dispatched: ["DISPATCHED", "SP_ACCEPTED"],
  inProgress: ["PENDING_PAYMENT", "PAYMENT_CONFIRMED", "IN_PROGRESS"],
  completed: ["COMPLETED", "FULFILLED"],
};

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: string;
  href?: string;
}) {
  const content = (
    <Card className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color.replace("text-", "bg-").replace("-400", "-500/15")}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

export default function FOOverviewPage() {
  const { activeRole } = useActiveRole();
  const propertyId = activeRole?.scopeId ?? "";

  const { data: allRequests = [], isLoading } = trpc.requests.listByProperty.useQuery(
    { propertyId, limit: 200 },
    { enabled: !!propertyId, refetchInterval: 15_000 }
  );

  const stats = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return {
      pending: allRequests.filter(r => STATUS_GROUPS.pending.includes(r.status)).length,
      dispatched: allRequests.filter(r => STATUS_GROUPS.dispatched.includes(r.status)).length,
      inProgress: allRequests.filter(r => STATUS_GROUPS.inProgress.includes(r.status)).length,
      completedToday: allRequests.filter(r =>
        STATUS_GROUPS.completed.includes(r.status) &&
        r.completedAt && new Date(r.completedAt) >= todayStart
      ).length,
      slaBreached: allRequests.filter(r =>
        !["COMPLETED", "FULFILLED", "CANCELLED", "DISPUTED"].includes(r.status) &&
        r.slaDeadline && new Date(r.slaDeadline) < now
      ).length,
    };
  }, [allRequests]);

  // Recent requests (last 5)
  const recentRequests = useMemo(() =>
    [...allRequests]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [allRequests]
  );

  const statusColor: Record<string, string> = {
    SUBMITTED: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    PENDING_MATCH: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    DISPATCHED: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    SP_ACCEPTED: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
    SP_REJECTED: "bg-red-500/15 text-red-400 border-red-500/30",
    IN_PROGRESS: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
    COMPLETED: "bg-green-500/15 text-green-400 border-green-500/30",
    FULFILLED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    CANCELLED: "bg-zinc-500/15 text-zinc-400 border-zinc-500/30",
    DISPUTED: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Reception Desk</h1>
          <p className="text-zinc-400 text-sm mt-0.5">
            {activeRole?.scopeLabel ?? "Property"} · Reception Desk · Live request status
          </p>
        </div>
        <Link href="/fo/queue">
          <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-2">
            <ClipboardList className="w-4 h-4" />
            Open Queue
          </Button>
        </Link>
      </div>

      {/* SLA breach alert */}
      {stats.slaBreached > 0 && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm font-medium">
            {stats.slaBreached} request{stats.slaBreached > 1 ? "s have" : " has"} breached SLA — immediate attention required
          </p>
          <Link href="/fo/queue?filter=sla_breached" className="ml-auto">
            <Button variant="outline" size="sm" className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs gap-1">
              View <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Pending" value={stats.pending} color="text-amber-400" href="/fo/queue?filter=pending" />
        <StatCard icon={AlertTriangle} label="SLA Breached" value={stats.slaBreached} color={stats.slaBreached > 0 ? "text-red-400" : "text-zinc-500"} href="/fo/queue?filter=sla_breached" />
        <StatCard icon={Clock} label="In Progress" value={stats.inProgress} color="text-cyan-400" href="/fo/queue?filter=in_progress" />
        <StatCard icon={CheckCircle2} label="Completed Today" value={stats.completedToday} color="text-green-400" />
      </div>

      {/* Recent requests */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-zinc-100 text-base font-semibold">Recent Requests</CardTitle>
            <Link href="/fo/queue">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200 text-xs gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">Loading...</div>
          ) : recentRequests.length === 0 ? (
            <div className="px-6 py-8 text-center text-zinc-500 text-sm">No requests yet</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recentRequests.map((req) => (
                <Link key={req.id} href={`/fo/queue/${req.id}`}>
                  <div className="flex items-center gap-4 px-6 py-3 hover:bg-zinc-800/50 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 text-sm font-medium">{req.requestNumber}</p>
                      <p className="text-zinc-500 text-xs truncate">
                        Room {req.roomId.slice(-6)} · {req.guestName ?? "Guest"} · ฿{Number(req.totalAmount).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${statusColor[req.status] ?? "bg-zinc-700 text-zinc-300"}`}
                    >
                      {req.status.replace(/_/g, " ")}
                    </Badge>
                    <p className="text-zinc-600 text-xs shrink-0">
                      {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
