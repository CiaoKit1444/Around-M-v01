import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Briefcase,
  ChevronRight,
  Loader2,
  RefreshCw,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

const STAGE_COLORS: Record<string, string> = {
  OPEN:       "bg-amber-500/20 text-amber-400 border-amber-500/30",
  CONFIRMED:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  DISPATCHED: "bg-violet-500/20 text-violet-400 border-violet-500/30",
  RUNNING:    "bg-teal-500/20 text-teal-400 border-teal-500/30",
  PENDING:    "bg-orange-500/20 text-orange-400 border-orange-500/30",
  CLOSED:     "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
  CANCELLED:  "bg-red-500/20 text-red-400 border-red-500/30",
};

const NEXT_STAGE: Record<string, string> = {
  DISPATCHED: "RUNNING",
  RUNNING:    "CLOSED",
};

export default function SOJobsPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const operatorId = (user as any)?.id ?? "";
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.spTickets.listSoJobs.useQuery(
    { operatorId },
    { enabled: Boolean(operatorId), refetchInterval: 20_000 }
  );

  const advanceMutation = trpc.spTickets.advanceSoJobStage.useMutation({
    onSuccess: (result) => {
      toast.success(`Job moved to ${result.newStage}`);
      utils.spTickets.listSoJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const jobs = (data?.items ?? []).filter(
    (j) => j.status !== "CLOSED" && j.status !== "CANCELLED"
  );

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-400" />
            My Jobs
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Active service jobs assigned to you</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : jobs.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Briefcase className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No active jobs</p>
            <p className="text-zinc-600 text-sm mt-1">Jobs dispatched to you will appear here</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => {
            const nextStage = NEXT_STAGE[job.status];
            return (
              <Card
                key={job.id}
                className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          className={`text-xs ${STAGE_COLORS[job.status] ?? "bg-zinc-500/20 text-zinc-400"}`}
                        >
                          {job.status}
                        </Badge>
                        <span className="text-zinc-500 text-xs">
                          #{job.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <p className="text-zinc-100 font-medium text-sm">
                        Ticket: {job.ticketId.slice(0, 8).toUpperCase()}
                      </p>
                      {job.stageNotes && (
                        <p className="text-zinc-400 text-xs mt-1">{job.stageNotes}</p>
                      )}
                      <p className="text-zinc-600 text-xs mt-2">
                        {formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {nextStage && (
                        <Button
                          size="sm"
                          className={`gap-1.5 ${
                            nextStage === "RUNNING"
                              ? "bg-teal-500 hover:bg-teal-600 text-black"
                              : "bg-zinc-600 hover:bg-zinc-500 text-white"
                          }`}
                          disabled={advanceMutation.isPending}
                          onClick={() =>
                            advanceMutation.mutate({ jobId: job.id, newStage: nextStage })
                          }
                        >
                          {nextStage === "RUNNING" ? (
                            <PlayCircle className="w-3.5 h-3.5" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          {nextStage === "RUNNING" ? "Start" : "Complete"}
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-zinc-400 hover:text-zinc-100"
                        onClick={() => navigate(`/so/jobs/${job.id}`)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
