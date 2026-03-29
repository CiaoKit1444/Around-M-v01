/**
 * SecretChamberPage — SUPER_ADMIN only bootstrap / purge console.
 *
 * Five operations are grouped into two panels:
 *   Partner Side  — P1 (tx only), P2 (master+tx), P3 (full purge + seed)
 *   SP Side       — S1 (all SP), S2 (services only)
 *
 * Each operation card shows:
 *   • What will be deleted / seeded (live preview counts)
 *   • A colour-coded danger level badge
 *   • A confirmation code the admin must type before the button activates
 *   • A result summary accordion after execution
 */

import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

// ── Environment detection ─────────────────────────────────────────────────────
// Production is detected by the absence of localhost/127.0.0.1/staging in the hostname.
// P2 and P3 are blocked in production to prevent accidental data loss.
function useEnvironment() {
  return useMemo(() => {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
    const isStaging = host.includes("staging") || host.includes("dev.") || host.includes(".manus.computer") || host.includes(".manus.space");
    const isProduction = !isLocal && !isStaging;
    return { isLocal, isStaging, isProduction, host };
  }, []);
}
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  AlertTriangle,
  Trash2,
  RefreshCw,
  Sprout,
  Shield,
  Package,
  ChevronDown,
  ChevronRight,
  Eye,
  Lock,
  Loader2,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
type DangerLevel = "medium" | "high" | "critical";

interface OperationDef {
  id: string;
  code: string;
  label: string;
  shortLabel: string;
  dangerLevel: DangerLevel;
  icon: React.ReactNode;
  description: string;
  deletes: string[];
  preserves: string[];
  seeds?: string[];
  group: "partner" | "sp";
  mutationKey: "purgeTransactions" | "purgeMasterAndTx" | "purgeAllAndSeed" | "purgeSpAll" | "purgeSpServicesOnly";
}

const OPERATIONS: OperationDef[] = [
  {
    id: "P1",
    code: "PURGE-TX",
    label: "Purge Transactions Only",
    shortLabel: "TX Purge",
    dangerLevel: "medium",
    icon: <Trash2 className="h-5 w-5" />,
    group: "partner",
    mutationKey: "purgeTransactions",
    description:
      "Deletes all transaction-layer data. Partners, properties, rooms, QR codes, staff, SP, and catalog are fully preserved.",
    deletes: [
      "Service requests + items",
      "Request events + notes",
      "SP assignments, tickets, SO jobs",
      "Payments",
      "Guest sessions + stay tokens",
      "Audit events",
      "JWT revocations + 2FA tokens",
    ],
    preserves: [
      "Partners",
      "Properties + rooms + QR codes",
      "Staff accounts",
      "Service providers + catalog",
    ],
  },
  {
    id: "P2",
    code: "PURGE-ALL",
    label: "Purge Master + Transactions",
    shortLabel: "Master Purge",
    dangerLevel: "high",
    icon: <RefreshCw className="h-5 w-5" />,
    group: "partner",
    mutationKey: "purgeMasterAndTx",
    description:
      "Deletes all transaction AND master data. Resets running counters. SUPER_ADMIN / SYSTEM_ADMIN accounts are preserved. SP layer is untouched.",
    deletes: [
      "Everything in P1",
      "Partners + properties + rooms",
      "QR codes + room templates",
      "Staff positions + members",
      "Property-scoped user roles",
      "Non-admin peppr_users",
    ],
    preserves: [
      "SUPER_ADMIN + SYSTEM_ADMIN roles",
      "Service providers + catalog",
    ],
  },
  {
    id: "P3",
    code: "SEED-NOW",
    label: "Full Purge + Seed 10 Hotels",
    shortLabel: "Full Reset + Seed",
    dangerLevel: "critical",
    icon: <Sprout className="h-5 w-5" />,
    group: "partner",
    mutationKey: "purgeAllAndSeed",
    description:
      "Wipes EVERYTHING (including SP layer), then seeds a complete demo dataset: 3 partners, 10 hotels, 100 rooms, 100 QR codes, 5 SPs, 15 catalog items, 5 templates.",
    deletes: ["Everything in P2", "Service providers + catalog + templates"],
    preserves: ["SUPER_ADMIN + SYSTEM_ADMIN roles"],
    seeds: [
      "3 partners (Lanna, Bangkok, Andaman)",
      "10 properties across Chiang Mai, Bangkok, Phuket",
      "10 rooms + QR codes per property (100 total)",
      "5 service providers (housekeeping, F&B, spa, maintenance, concierge)",
      "15 catalog items (3 per SP)",
      "5 service templates",
    ],
  },
  {
    id: "S1",
    code: "PURGE-SP",
    label: "Purge All SP + Services",
    shortLabel: "SP Full Purge",
    dangerLevel: "high",
    icon: <Shield className="h-5 w-5" />,
    group: "sp",
    mutationKey: "purgeSpAll",
    description:
      "Deletes all service providers, operators, catalog items, templates, and SP-related transaction rows (tickets, assignments, SO jobs). Partner data is untouched.",
    deletes: [
      "Service providers + operators",
      "Catalog items",
      "Service templates + template items",
      "SP assignments, tickets, SO jobs",
    ],
    preserves: [
      "Partners + properties + rooms",
      "Service requests (SP fields nulled)",
      "Payments + guest sessions",
    ],
  },
  {
    id: "S2",
    code: "PURGE-SVC",
    label: "Purge Services Only",
    shortLabel: "Services Purge",
    dangerLevel: "medium",
    icon: <Package className="h-5 w-5" />,
    group: "sp",
    mutationKey: "purgeSpServicesOnly",
    description:
      "Deletes catalog items, service templates, and template items only. Service providers and operators are preserved.",
    deletes: ["Catalog items", "Service templates", "Template items"],
    preserves: [
      "Service providers",
      "Service operators",
      "All transaction data",
    ],
  },
];

// ── Danger badge ─────────────────────────────────────────────────────────────
function DangerBadge({ level }: { level: DangerLevel }) {
  const map: Record<DangerLevel, { label: string; className: string }> = {
    medium: { label: "MEDIUM RISK", className: "bg-amber-500/20 text-amber-400 border-amber-500/40" },
    high: { label: "HIGH RISK", className: "bg-orange-500/20 text-orange-400 border-orange-500/40" },
    critical: { label: "CRITICAL", className: "bg-red-500/20 text-red-400 border-red-500/40" },
  };
  const { label, className } = map[level];
  return (
    <Badge variant="outline" className={`text-xs font-mono ${className}`}>
      {label}
    </Badge>
  );
}

// ── Summary display ───────────────────────────────────────────────────────────
function SummaryPanel({ result }: { result: any }) {
  const [open, setOpen] = useState(true);
  if (!result) return null;

  const renderCounts = (obj: Record<string, number>, title: string) => (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        {Object.entries(obj).map(([k, v]) => (
          <div key={k} className="flex justify-between text-xs">
            <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
            <span className={`font-mono font-semibold ${v > 0 ? "text-red-400" : "text-muted-foreground"}`}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-between text-green-400 hover:text-green-300 hover:bg-green-500/10 mt-3">
          <span className="text-xs font-mono">Operation complete — view summary</span>
          {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 rounded-md border border-green-500/20 bg-green-500/5 p-3 space-y-3">
          {result.summary?.deleted && renderCounts(result.summary.deleted, "Deleted")}
          {result.summary?.seeded && renderCounts(result.summary.seeded, "Seeded")}
          {!result.summary?.deleted && !result.summary?.seeded && renderCounts(result.summary ?? {}, "Rows affected")}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ── Production-blocked operations ────────────────────────────────────────────
// P2 and P3 are blocked in production — they wipe master data and cannot be undone.
const PRODUCTION_BLOCKED_OPS = new Set(["P2", "P3"]);

// ── Operation card ────────────────────────────────────────────────────────────
function OperationCard({ op, previewData, isProduction }: { op: OperationDef; previewData: any; isProduction: boolean }) {
  const [code, setCode] = useState("");
  const [result, setResult] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isBlocked = isProduction && PRODUCTION_BLOCKED_OPS.has(op.id);

  const mutation = trpc.bootstrap[op.mutationKey].useMutation({
    onSuccess: (data) => {
      setResult(data);
      setCode("");
      toast.success(`${op.shortLabel} completed successfully`);
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const isValid = code === op.code;
  const isRunning = mutation.isPending;

  const borderColor: Record<DangerLevel, string> = {
    medium: "border-amber-500/30",
    high: "border-orange-500/30",
    critical: "border-red-500/30",
  };

  const previewCounts = previewData
    ? op.group === "partner"
      ? { ...previewData.transactions, ...previewData.master }
      : previewData.sp
    : null;

  return (
    <Card className={`bg-card/50 border ${isBlocked ? "border-slate-700/50 opacity-60" : borderColor[op.dangerLevel]} transition-all relative overflow-hidden`}>
      {/* Production blocked overlay */}
      {isBlocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-sm rounded-lg">
          <Shield className="h-8 w-8 text-slate-400" />
          <p className="text-sm font-semibold text-slate-300">Blocked in Production</p>
          <p className="text-xs text-muted-foreground text-center px-4">
            {op.id} wipes master data. Only available in staging/local environments.
          </p>
          <Badge variant="outline" className="border-slate-600 text-slate-400 font-mono text-xs mt-1">
            PRODUCTION LOCK
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-md ${
              op.dangerLevel === "critical" ? "bg-red-500/10 text-red-400" :
              op.dangerLevel === "high" ? "bg-orange-500/10 text-orange-400" :
              "bg-amber-500/10 text-amber-400"
            }`}>
              {op.icon}
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">{op.label}</CardTitle>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">Code: <span className="text-foreground">{op.code}</span></p>
            </div>
          </div>
          <DangerBadge level={op.dangerLevel} />
        </div>
        <CardDescription className="text-xs mt-2">{op.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Preview counts */}
        {previewCounts && (
          <div className="rounded-md bg-muted/30 p-2 grid grid-cols-2 gap-x-3 gap-y-0.5">
            {Object.entries(previewCounts).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-muted-foreground truncate">{k.replace(/_/g, " ")}</span>
                <span className={`font-mono font-semibold ml-2 ${Number(v) > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {/* What gets deleted / seeded */}
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground w-full justify-start gap-1">
              <Eye className="h-3 w-3" />
              {detailsOpen ? "Hide details" : "Show what changes"}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-2 text-xs">
              <div>
                <p className="text-red-400/80 font-semibold mb-1">Deletes:</p>
                <ul className="space-y-0.5 text-muted-foreground">
                  {op.deletes.map((d) => <li key={d} className="flex gap-1.5"><span className="text-red-400/60 mt-0.5">✕</span>{d}</li>)}
                </ul>
              </div>
              {op.preserves.length > 0 && (
                <div>
                  <p className="text-green-400/80 font-semibold mb-1">Preserves:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {op.preserves.map((p) => <li key={p} className="flex gap-1.5"><span className="text-green-400/60 mt-0.5">✓</span>{p}</li>)}
                  </ul>
                </div>
              )}
              {op.seeds && (
                <div>
                  <p className="text-blue-400/80 font-semibold mb-1">Seeds:</p>
                  <ul className="space-y-0.5 text-muted-foreground">
                    {op.seeds.map((s) => <li key={s} className="flex gap-1.5"><span className="text-blue-400/60 mt-0.5">+</span>{s}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>

        <Separator className="opacity-30" />

        {/* Confirmation gate */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Lock className="h-3 w-3" />
            Type <span className="font-mono text-foreground bg-muted px-1 rounded">{op.code}</span> to unlock
          </p>
          <div className="flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={op.code}
              className={`font-mono text-sm h-8 ${isValid ? "border-green-500/50 bg-green-500/5" : ""}`}
              disabled={isRunning}
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={!isValid || isRunning || isBlocked}
              onClick={() => mutation.mutate({ confirmCode: code })}
              className="shrink-0 h-8"
            >
              {isRunning ? (
                <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Running</>
              ) : isBlocked ? (
                <><Lock className="h-3 w-3 mr-1" /> Locked</>
              ) : (
                "Execute"
              )}
            </Button>
          </div>
        </div>

        {/* Result summary */}
        <SummaryPanel result={result} />
      </CardContent>
    </Card>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function SecretChamberPage() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const env = useEnvironment();

  // Set tab title
  useEffect(() => {
    const prev = document.title;
    document.title = "Secret Chamber | Peppr Around";
    return () => { document.title = prev; };
  }, []);

  const previewQuery = trpc.bootstrap.preview.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const partnerOps = OPERATIONS.filter((o) => o.group === "partner");
  const spOps = OPERATIONS.filter((o) => o.group === "sp");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-foreground">
      {/* Header */}
      <div className="border-b border-red-900/30 bg-red-950/10">
        <div className="max-w-5xl mx-auto px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Secret Chamber</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Super Admin Bootstrap Console — destructive operations only. Every action is audit-logged.
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant="outline" className="border-red-500/30 text-red-400 font-mono text-xs">
                SUPER_ADMIN ONLY
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Access error */}
        {previewQuery.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {previewQuery.error.message}. This page is restricted to SUPER_ADMIN role holders.
            </AlertDescription>
          </Alert>
        )}

        {/* Environment banner */}
        <Alert className={env.isProduction
          ? "border-red-600/50 bg-red-950/30"
          : env.isStaging
          ? "border-blue-500/30 bg-blue-500/5"
          : "border-green-500/30 bg-green-500/5"
        }>
          <Shield className={`h-4 w-4 ${env.isProduction ? "text-red-400" : env.isStaging ? "text-blue-400" : "text-green-400"}`} />
          <AlertDescription className={`text-sm ${env.isProduction ? "text-red-200/80" : env.isStaging ? "text-blue-200/80" : "text-green-200/80"}`}>
            <strong>Environment:</strong>{" "}
            {env.isProduction ? (
              <span>🔴 <strong>PRODUCTION</strong> — P2 and P3 are locked. Only P1, S1, S2 are available. Proceed with extreme caution.</span>
            ) : env.isStaging ? (
              <span>🔵 <strong>STAGING / PREVIEW</strong> ({env.host}) — All operations are available.</span>
            ) : (
              <span>🟢 <strong>LOCAL</strong> ({env.host}) — All operations are available.</span>
            )}
          </AlertDescription>
        </Alert>

        {/* Warning banner */}
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertDescription className="text-amber-200/80 text-sm">
            <strong>Warning:</strong> All operations below are irreversible. Data deleted here cannot be recovered.
            Each operation requires a confirmation code and is written to the audit log with your user ID.
            Use only in staging / demo environments unless explicitly authorised.
          </AlertDescription>
        </Alert>

        {/* Partner Side */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">Partner Side</h2>
            <Separator className="flex-1 opacity-20" />
            <Badge variant="outline" className="text-xs text-muted-foreground border-muted/30">
              Hotels · Properties · Rooms · Transactions
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {partnerOps.map((op) => (
              <OperationCard key={op.id} op={op} previewData={previewQuery.data} isProduction={env.isProduction} />
            ))}
          </div>
        </section>

        {/* SP Side */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">SP Side</h2>
            <Separator className="flex-1 opacity-20" />
            <Badge variant="outline" className="text-xs text-muted-foreground border-muted/30">
              Service Providers · Catalog · Templates
            </Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {spOps.map((op) => (
              <OperationCard key={op.id} op={op} previewData={previewQuery.data} isProduction={env.isProduction} />
            ))}
          </div>
        </section>

        {/* Live DB snapshot */}
        {previewQuery.data && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">Live Database Snapshot</h2>
              <Separator className="flex-1 opacity-20" />
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground"
                onClick={() => previewQuery.refetch()}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${previewQuery.isFetching ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Transactions", data: previewQuery.data.transactions, color: "border-red-500/20" },
                { title: "Master Data", data: previewQuery.data.master, color: "border-orange-500/20" },
                { title: "SP Layer", data: previewQuery.data.sp, color: "border-blue-500/20" },
              ].map(({ title, data, color }) => (
                <Card key={title} className={`bg-card/30 border ${color}`}>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-mono uppercase text-muted-foreground">{title}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-1">
                    {Object.entries(data).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-muted-foreground">{k.replace(/_/g, " ")}</span>
                        <span className={`font-mono font-semibold ${Number(v) > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>{String(v)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Seed preview */}
        {previewQuery.data && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">Seed Preview (P3)</h2>
              <Separator className="flex-1 opacity-20" />
            </div>
            <Card className="bg-card/30 border border-blue-500/20">
              <CardContent className="px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(previewQuery.data.seedPreview).map(([k, v]) => (
                  <div key={k} className="text-center p-3 rounded-md bg-blue-500/5 border border-blue-500/10">
                    <p className="text-2xl font-bold font-mono text-blue-400">{v}</p>
                    <p className="text-xs text-muted-foreground mt-1">{k.replace(/_/g, " ")}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>
        )}
      </div>
    </div>
  );
}
