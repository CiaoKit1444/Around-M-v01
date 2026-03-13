/**
 * OverseerPage — Port Overseer Admin Panel
 *
 * Displays the live status of all registered services, port allocation table,
 * environment config validation, and the raw YAML configuration.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Activity,
  Server,
  Database,
  Globe,
  Cpu,
  Layers,
  FileCode2,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

// ── Types (mirror server types) ───────────────────────────────────────────────

interface ServiceHealth {
  id: string;
  name: string;
  role: string;
  url: string;
  status: "healthy" | "degraded" | "unreachable" | "unknown";
  latencyMs?: number;
  lastChecked: Date | string;
  error?: string;
  responseData?: unknown;
}

interface ConfigIssue {
  severity: "error" | "warning" | "info";
  service?: string;
  key: string;
  message: string;
  expected?: string;
  actual?: string;
}

interface OverseerSnapshot {
  timestamp: string;
  configVersion: string;
  services: ServiceHealth[];
  configIssues: ConfigIssue[];
  portMap: Record<string, number>;
  overallStatus: "healthy" | "degraded" | "unreachable" | "unknown";
  criticalServicesHealthy: boolean;
  environment: string;
  version: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function statusColor(status: ServiceHealth["status"]): string {
  switch (status) {
    case "healthy":    return "text-emerald-600";
    case "degraded":   return "text-amber-500";
    case "unreachable": return "text-red-500";
    default:           return "text-slate-400";
  }
}

function statusBadge(status: ServiceHealth["status"]) {
  const variants: Record<string, string> = {
    healthy:     "bg-emerald-100 text-emerald-700 border-emerald-200",
    degraded:    "bg-amber-100 text-amber-700 border-amber-200",
    unreachable: "bg-red-100 text-red-700 border-red-200",
    unknown:     "bg-slate-100 text-slate-500 border-slate-200",
  };
  return variants[status] ?? variants.unknown;
}

function StatusIcon({ status }: { status: ServiceHealth["status"] }) {
  const cls = `w-4 h-4 ${statusColor(status)}`;
  switch (status) {
    case "healthy":    return <CheckCircle2 className={cls} />;
    case "degraded":   return <AlertTriangle className={cls} />;
    case "unreachable": return <XCircle className={cls} />;
    default:           return <HelpCircle className={cls} />;
  }
}

function roleIcon(role: string) {
  const cls = "w-4 h-4 text-slate-500";
  switch (role) {
    case "bff":      return <Layers className={cls} />;
    case "core-api": return <Server className={cls} />;
    case "database": return <Database className={cls} />;
    case "cache":    return <Cpu className={cls} />;
    case "external": return <Globe className={cls} />;
    default:         return <Activity className={cls} />;
  }
}

function overallBadge(status: OverseerSnapshot["overallStatus"]) {
  const map: Record<string, { label: string; cls: string }> = {
    healthy:     { label: "All Systems Operational", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    degraded:    { label: "Degraded Performance",    cls: "bg-amber-100 text-amber-700 border-amber-200" },
    unreachable: { label: "Critical Services Down",  cls: "bg-red-100 text-red-700 border-red-200" },
    unknown:     { label: "Status Unknown",          cls: "bg-slate-100 text-slate-500 border-slate-200" },
  };
  return map[status] ?? map.unknown;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function OverseerPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: snapshot, isLoading, refetch } = trpc.system.overseerStatus.useQuery(undefined, {
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const { data: configData } = trpc.system.overseerConfig.useQuery(undefined, {
    staleTime: 60_000,
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      setRefreshKey((k) => k + 1);
      toast.success("Overseer snapshot updated");
    } finally {
      setIsRefreshing(false);
    }
  };

  const overall = overallBadge(snapshot?.overallStatus ?? "unknown");

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-indigo-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Port Overseer</h1>
          </div>
          <p className="text-sm text-slate-500">
            Global configuration checkpoint — service registry, port governance,
            health monitoring, and environment validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {snapshot && (
            <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${overall.cls}`}>
              {overall.label}
            </span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Meta bar ── */}
      {snapshot && (
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5 border border-slate-200">
          <span><span className="font-medium text-slate-700">Config:</span> v{snapshot.configVersion}</span>
          <span><span className="font-medium text-slate-700">App:</span> v{snapshot.version}</span>
          <span><span className="font-medium text-slate-700">Env:</span> {snapshot.environment}</span>
          <span><span className="font-medium text-slate-700">Last check:</span> {new Date(snapshot.timestamp).toLocaleTimeString()}</span>
          <span>
            <span className="font-medium text-slate-700">Critical services:</span>{" "}
            {snapshot.criticalServicesHealthy
              ? <span className="text-emerald-600">All healthy</span>
              : <span className="text-red-500">Issues detected</span>}
          </span>
        </div>
      )}

      <Tabs defaultValue="services">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="services" className="gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Services
          </TabsTrigger>
          <TabsTrigger value="ports" className="gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Port Map
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Config{" "}
            {(snapshot?.configIssues?.filter((i: ConfigIssue) => i.severity === "error").length ?? 0) > 0
              ? <span className="ml-1 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">
                  {snapshot!.configIssues.filter((i: ConfigIssue) => i.severity === "error").length}
                </span>
              : null}
          </TabsTrigger>
          <TabsTrigger value="yaml" className="gap-1.5">
            <FileCode2 className="w-3.5 h-3.5" /> YAML
          </TabsTrigger>
        </TabsList>

        {/* ── Services Tab ── */}
        <TabsContent value="services" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {snapshot?.services.map((svc: ServiceHealth) => (
                <Card key={svc.id} className="border border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {roleIcon(svc.role)}
                        <CardTitle className="text-sm font-semibold text-slate-800">
                          {svc.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <StatusIcon status={svc.status} />
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusBadge(svc.status)}`}>
                          {svc.status}
                        </span>
                      </div>
                    </div>
                    <CardDescription className="text-xs mt-0.5">
                      <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {svc.url}
                      </code>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-1.5">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        <span className="font-medium text-slate-600">Role:</span>{" "}
                        <Badge variant="outline" className="text-[10px] py-0 h-4">{svc.role}</Badge>
                      </span>
                      {svc.latencyMs !== undefined && (
                        <span>
                          <span className="font-medium text-slate-600">Latency:</span>{" "}
                          <span className={svc.latencyMs > 500 ? "text-amber-600" : "text-emerald-600"}>
                            {svc.latencyMs}ms
                          </span>
                        </span>
                      )}
                      <span>
                        <span className="font-medium text-slate-600">Checked:</span>{" "}
                        {new Date(svc.lastChecked).toLocaleTimeString()}
                      </span>
                    </div>
                    {svc.error && (
                      <p className="text-xs text-slate-500 bg-slate-50 rounded px-2 py-1.5 border border-slate-200 mt-1">
                        {svc.error}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Port Map Tab ── */}
        <TabsContent value="ports" className="mt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Port Allocation Table</CardTitle>
              <CardDescription className="text-xs">
                Authoritative port assignments from <code className="bg-slate-100 px-1 rounded">overseer.config.yaml</code>.
                No other module may hardcode these values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Service</th>
                    <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Port</th>
                    <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(snapshot?.portMap ?? {}).map(([name, port]: [string, number]) => {
                    const svc = snapshot?.services.find((s) => s.id === name);
                    return (
                      <tr key={name} className="border-b border-slate-100 last:border-0">
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-700">{name}</td>
                        <td className="py-2.5 pr-4">
                          <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-mono px-2 py-0.5 rounded">
                            :{port}
                          </span>
                        </td>
                        <td className="py-2.5">
                          {svc ? (
                            <div className="flex items-center gap-1.5">
                              <StatusIcon status={svc.status} />
                              <span className={`text-xs ${statusColor(svc.status)}`}>{svc.status}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">not probed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Config Validation Tab ── */}
        <TabsContent value="config" className="mt-4 space-y-4">
          {/* Issues summary */}
          {snapshot?.configIssues && snapshot.configIssues.length > 0 ? (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Environment Issues</CardTitle>
                <CardDescription className="text-xs">
                  {snapshot.configIssues.filter((i: ConfigIssue) => i.severity === "error").length} errors,{" "}
                  {snapshot.configIssues.filter((i: ConfigIssue) => i.severity === "warning").length} warnings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                  {snapshot.configIssues.map((issue: ConfigIssue, i: number) => (
                  <div
                    key={i}
                    className={`rounded-lg px-3 py-2.5 border text-xs ${
                      issue.severity === "error"
                        ? "bg-red-50 border-red-200 text-red-800"
                        : issue.severity === "warning"
                        ? "bg-amber-50 border-amber-200 text-amber-800"
                        : "bg-blue-50 border-blue-200 text-blue-800"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {issue.severity === "error" ? (
                        <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      )}
                      <div className="space-y-0.5">
                        <p className="font-semibold">
                          <code>{issue.key}</code>
                          {issue.service && (
                            <span className="font-normal ml-1.5 opacity-70">({issue.service})</span>
                          )}
                        </p>
                        <p>{issue.message}</p>
                        {issue.expected && (
                          <p className="opacity-70">Expected: {issue.expected}</p>
                        )}
                        {issue.actual && (
                          <p className="opacity-70">Actual: {issue.actual}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3">
              <CheckCircle2 className="w-4 h-4" />
              All required environment variables are set and valid.
            </div>
          )}

          {/* Env var table */}
          {configData && (
            <Card className="border border-slate-200 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Environment Variables</CardTitle>
                <CardDescription className="text-xs">
                  Configured services and their env var status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Service</th>
                      <th className="text-left py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Env Var</th>
                      <th className="text-left py-2 pr-4 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">URL</th>
                      <th className="text-left py-2 font-semibold text-slate-500 uppercase tracking-wide text-[10px]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
                    (configData.configuredServices as any[]).map((s: { id: string; name: string; url: string; envVar?: string; envValue: string }) => (
                      <tr key={s.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-2 pr-4 text-slate-700 font-medium">{s.name}</td>
                        <td className="py-2 pr-4 font-mono text-slate-600">{s.envVar ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono text-slate-500 max-w-[200px] truncate">{s.url || "—"}</td>
                        <td className="py-2">
                          {s.envValue === "set" ? (
                            <span className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> set
                            </span>
                          ) : s.envValue === "missing" ? (
                            <span className="text-amber-500 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> missing
                            </span>
                          ) : (
                            <span className="text-slate-400">n/a</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── YAML Config Tab ── */}
        <TabsContent value="yaml" className="mt-4">
          <Card className="border border-slate-200 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">overseer.config.yaml</CardTitle>
                  <CardDescription className="text-xs">
                    Canonical YAML configuration — single source of truth for all service definitions.
                    Edit this file to register new services or change port assignments.
                  </CardDescription>
                </div>
                {configData?.configVersion && (
                  <Badge variant="outline" className="text-xs">v{configData.configVersion}</Badge>
                )}
              </div>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 p-0">
                  {(configData as { rawYaml?: string } | undefined)?.rawYaml ? (
                <pre className="text-xs font-mono text-slate-700 bg-slate-50 p-4 overflow-auto max-h-[600px] leading-relaxed rounded-b-xl">
                  {(configData as { rawYaml?: string }).rawYaml}
                </pre>
              ) : (
                <div className="p-4 text-sm text-slate-500">Loading YAML configuration…</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
