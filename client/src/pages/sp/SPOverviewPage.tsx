/**
 * SPOverviewPage — Service Provider Portal Overview
 * Shows summary stats: pending jobs, active jobs, completed today
 */
import { useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Briefcase, Clock, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SPOverviewPage() {
  const { user } = useAuth();
  const providerId = (user as any)?.id ?? "";

  const { data: pageData, isLoading } = trpc.requests.listSpJobs.useQuery(
    { providerId },
    { enabled: !!providerId, refetchInterval: 15_000 }
  );
  const allJobs = pageData?.items ?? [];

  const stats = useMemo(() => {
    const pending = allJobs.filter((j: any) => j.status === "DISPATCHED").length;
    const active = allJobs.filter((j: any) => ["SP_ACCEPTED", "PENDING_PAYMENT", "PAYMENT_CONFIRMED", "IN_PROGRESS"].includes(j.status)).length;
    const today = allJobs.filter((j: any) => {
      if (!["COMPLETED", "FULFILLED"].includes(j.status)) return false;
      const d = new Date(j.updatedAt ?? j.createdAt);
      const now = new Date();
      return d.toDateString() === now.toDateString();
    }).length;
    return { pending, active, today };
  }, [allJobs]);

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Provider Overview</h1>
        <p className="text-zinc-400 text-sm mt-0.5">Welcome back, {(user as any)?.name ?? "Provider"}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center">
              <Briefcase className="w-6 h-6 text-amber-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-zinc-100">{stats.pending}</p>
              <p className="text-zinc-400 text-xs mt-1">Pending Jobs</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-zinc-100">{stats.active}</p>
              <p className="text-zinc-400 text-xs mt-1">Active Jobs</p>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <p className="text-3xl font-bold text-zinc-100">{stats.today}</p>
              <p className="text-zinc-400 text-xs mt-1">Completed Today</p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats.pending > 0 && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-amber-400 font-semibold text-sm">
                {stats.pending} job{stats.pending !== 1 ? "s" : ""} awaiting your response
              </p>
              <p className="text-zinc-400 text-xs mt-0.5">Review and accept or reject incoming dispatches</p>
            </div>
            <Link href="/sp/jobs">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-400 text-black font-semibold gap-1">
                View Jobs <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
