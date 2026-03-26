import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useActiveRole } from "@/hooks/useActiveRole";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus, Pencil, UserX, Loader2 } from "lucide-react";

const SPECIALISATIONS = ["GENERAL", "TRANSPORT", "IN_ROOM", "MAINTENANCE"] as const;
const STATUSES = ["ACTIVE", "INACTIVE", "ON_DUTY", "OFF_DUTY"] as const;

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:   "bg-teal-500/20 text-teal-400 border-teal-500/30",
  ON_DUTY:  "bg-blue-500/20 text-blue-400 border-blue-500/30",
  OFF_DUTY: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  INACTIVE: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

type Spec = typeof SPECIALISATIONS[number];
type Status = typeof STATUSES[number];

export default function SPOperatorsPage() {
  const { user } = useAuth();
  const { activeRole } = useActiveRole();
  const providerId = activeRole?.scopeId ?? undefined;
  const utils = trpc.useUtils();

  const { data: operators = [], isLoading } = trpc.serviceOperators.listByProvider.useQuery(
    { providerId }
  );

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newSpec, setNewSpec] = useState<Spec>("GENERAL");
  const createMutation = trpc.serviceOperators.createOperator.useMutation({
    onSuccess: () => {
      toast.success("Service Operator added");
      setShowCreate(false);
      setNewName("");
      setNewUserId("");
      setNewSpec("GENERAL");
      utils.serviceOperators.listByProvider.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const [editOperator, setEditOperator] = useState<(typeof operators)[0] | null>(null);
  const [editName, setEditName] = useState("");
  const [editSpec, setEditSpec] = useState<Spec>("GENERAL");
  const [editStatus, setEditStatus] = useState<Status>("ACTIVE");
  const updateMutation = trpc.serviceOperators.updateOperator.useMutation({
    onSuccess: () => {
      toast.success("Operator updated");
      setEditOperator(null);
      utils.serviceOperators.listByProvider.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deactivateMutation = trpc.serviceOperators.deleteOperator.useMutation({
    onSuccess: () => {
      toast.success("Operator deactivated");
      utils.serviceOperators.listByProvider.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const activeOperators = operators.filter((op) => op.status !== "INACTIVE");

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-teal-400" />
            Service Operators
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Manage your field staff who execute service jobs
          </p>
        </div>
        <Button
          size="sm"
          className="gap-2 bg-teal-500 hover:bg-teal-600 text-black"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="w-4 h-4" /> Add Operator
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        </div>
      ) : activeOperators.length === 0 ? (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-400 font-medium">No operators yet</p>
            <p className="text-zinc-600 text-sm mt-1">
              Add your first Service Operator to start dispatching jobs
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {activeOperators.map((op) => (
            <Card
              key={op.id}
              className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        className={`text-xs ${STATUS_COLORS[op.status] ?? "bg-zinc-500/20 text-zinc-400"}`}
                      >
                        {op.status}
                      </Badge>
                      <span className="text-zinc-500 text-xs">{op.specialisation}</span>
                    </div>
                    <p className="text-zinc-100 font-medium">{op.displayName}</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      User: {op.userId.slice(0, 12)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-zinc-400 hover:text-zinc-100"
                      onClick={() => {
                        setEditOperator(op);
                        setEditName(op.displayName);
                        setEditSpec(op.specialisation as Spec);
                        setEditStatus(op.status as Status);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-zinc-400 hover:text-red-400"
                      disabled={deactivateMutation.isPending}
                      onClick={() => deactivateMutation.mutate({ operatorId: op.id })}
                    >
                      <UserX className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Add Service Operator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Display Name</p>
              <Input
                placeholder="e.g. Mr. Somchai (Driver)"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">User ID</p>
              <Input
                placeholder="Platform user ID..."
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
              />
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Specialisation</p>
              <Select value={newSpec} onValueChange={(v) => setNewSpec(v as Spec)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {SPECIALISATIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-zinc-100">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-500 hover:bg-teal-600 text-black"
              disabled={
                newName.trim().length === 0 ||
                newUserId.trim().length === 0 ||
                createMutation.isPending
              }
              onClick={() => {
                if (newName.trim().length > 0 && newUserId.trim().length > 0 && providerId) {
                  createMutation.mutate({
                    providerId,
                    userId: newUserId.trim(),
                    displayName: newName.trim(),
                    specialisation: newSpec,
                  });
                } else if (!providerId) {
                  toast.error("Cannot create operator without a provider scope. Please switch to a provider-scoped role.");
                }
              }}
            >
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Operator"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOperator !== null} onOpenChange={() => setEditOperator(null)}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Edit Operator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 text-xs mb-1">Display Name</p>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-zinc-800 border-zinc-700 text-zinc-100"
              />
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Specialisation</p>
              <Select value={editSpec} onValueChange={(v) => setEditSpec(v as Spec)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {SPECIALISATIONS.map((s) => (
                    <SelectItem key={s} value={s} className="text-zinc-100">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-zinc-400 text-xs mb-1">Status</p>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as Status)}>
                <SelectTrigger className="bg-zinc-800 border-zinc-700 text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-800 border-zinc-700">
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="text-zinc-100">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOperator(null)}>
              Cancel
            </Button>
            <Button
              className="bg-teal-500 hover:bg-teal-600 text-black"
              disabled={editName.trim().length === 0 || updateMutation.isPending}
              onClick={() => {
                if (editOperator && editName.trim().length > 0) {
                  updateMutation.mutate({
                    operatorId: editOperator.id,
                    displayName: editName.trim(),
                    specialisation: editSpec,
                    status: editStatus,
                  });
                }
              }}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
