import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Clock } from "lucide-react";

export default function SOJobDetailPage() {
  const [, params] = useRoute("/so/jobs/:jobId");
  const [, navigate] = useLocation();
  const jobId = params?.jobId ?? "";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-400 hover:text-zinc-100"
          onClick={() => navigate("/so/jobs")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Job Detail</h1>
          <p className="text-zinc-500 text-xs">#{jobId.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <Card className="bg-zinc-900 border-zinc-800">
        <CardContent className="py-12 text-center">
          <Clock className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Job detail view</p>
          <p className="text-zinc-600 text-sm mt-1">
            Full job history and stage timeline will be available here.
          </p>
          <Button
            className="mt-4 bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={() => navigate("/so/jobs")}
          >
            Back to My Jobs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
