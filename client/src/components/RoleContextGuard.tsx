/**
 * RoleContextGuard — Confirmation dialog for destructive actions.
 *
 * Shows the user which role/context they are currently operating under
 * before allowing a high-impact action (deactivate partner, revoke QR,
 * delete user, etc.). Prevents accidental cross-context operations.
 *
 * On confirmation, optionally fires a fire-and-forget audit log entry
 * to /v1/admin/audit-log via adminApi.logAuditAction().
 *
 * Usage:
 *   const { confirm, RoleContextGuardDialog } = useRoleContextGuard();
 *   // In a handler:
 *   const confirmed = await confirm({
 *     action: "Deactivate Partner",
 *     description: "This will suspend all properties under Grand Palace Hotel.",
 *     severity: "destructive",
 *     audit: {
 *       entityType: "partner",
 *       entityId: partnerId,
 *       entityName: partnerName,
 *       details: "Partner deactivated via admin UI",
 *     },
 *   });
 *   if (confirmed) { ... }
 */
import { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShieldAlert, Info, Building2, Globe, Hotel } from "lucide-react";
import { useActiveRole } from "@/hooks/useActiveRole";
import { adminApi, type AuditActionPayload } from "@/lib/api/endpoints";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type GuardSeverity = "destructive" | "warning" | "info";

/** Minimal audit payload — actorRole/actorRoleScope are injected automatically from activeRole. */
export type GuardAuditPayload = Omit<AuditActionPayload, "action" | "actorRole" | "actorRoleScope" | "severity">;

export interface GuardOptions {
  /** Short action label, e.g. "Deactivate Partner" */
  action: string;
  /** Longer description of what will happen */
  description: string;
  /** Visual severity level */
  severity?: GuardSeverity;
  /** Optional confirmation phrase the user must type */
  confirmPhrase?: string;
  /** Override the confirm button label */
  confirmLabel?: string;
  /**
   * If provided, a fire-and-forget audit log entry is written to
   * /v1/admin/audit-log when the user confirms the action.
   */
  audit?: GuardAuditPayload;
}

// ── Severity config ────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  GuardSeverity,
  { icon: React.ReactNode; iconBg: string; borderColor: string; confirmVariant: "destructive" | "default" | "outline"; auditSeverity: AuditActionPayload["severity"] }
> = {
  destructive: {
    icon: <ShieldAlert className="w-6 h-6 text-destructive" />,
    iconBg: "bg-destructive/10",
    borderColor: "border-destructive/30",
    confirmVariant: "destructive",
    auditSeverity: "critical",
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6 text-amber-500" />,
    iconBg: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    confirmVariant: "default",
    auditSeverity: "warning",
  },
  info: {
    icon: <Info className="w-6 h-6 text-primary" />,
    iconBg: "bg-primary/10",
    borderColor: "border-primary/20",
    confirmVariant: "default",
    auditSeverity: "info",
  },
};

// ── Role scope icon ────────────────────────────────────────────────────────────

function ScopeIcon({ scopeType }: { scopeType: string }) {
  if (scopeType === "GLOBAL") return <Globe className="w-3.5 h-3.5" />;
  if (scopeType === "PARTNER") return <Building2 className="w-3.5 h-3.5" />;
  return <Hotel className="w-3.5 h-3.5" />;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface GuardState {
  open: boolean;
  options: GuardOptions | null;
  resolve: ((confirmed: boolean) => void) | null;
  typedPhrase: string;
}

export function useRoleContextGuard() {
  const { activeRole } = useActiveRole();
  const [state, setState] = useState<GuardState>({
    open: false,
    options: null,
    resolve: null,
    typedPhrase: "",
  });

  const confirm = useCallback(
    (options: GuardOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setState({ open: true, options, resolve, typedPhrase: "" });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    // Fire-and-forget audit log if payload is provided
    if (state.options?.audit) {
      const severity = state.options.severity ?? "destructive";
      const cfg = SEVERITY_CONFIG[severity];
      adminApi.logAuditAction({
        ...state.options.audit,
        action: state.options.action,
        severity: cfg.auditSeverity,
        actorRole: activeRole?.roleName,
        actorRoleScope: activeRole?.scopeLabel ?? activeRole?.scopeType,
      });
    }
    state.resolve?.(true);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state, activeRole]);

  const handleCancel = useCallback(() => {
    // Fire-and-forget bypass audit entry when user cancels ("switch role" path)
    if (state.options?.audit) {
      adminApi.logAuditAction({
        ...state.options.audit,
        action: `GUARD_BYPASSED__${state.options.action.replace(/\s+/g, "_").toUpperCase()}`,
        severity: "info",
        actorRole: activeRole?.roleName,
        actorRoleScope: activeRole?.scopeLabel ?? activeRole?.scopeType,
        details: `User cancelled and chose to switch role before: ${state.options.action}`,
      });
    }
    state.resolve?.(false);
    setState((s) => ({ ...s, open: false, resolve: null }));
  }, [state, activeRole]);

  const phraseMatch =
    !state.options?.confirmPhrase ||
    state.typedPhrase === state.options.confirmPhrase;

  const RoleContextGuardDialog = (
    <Dialog open={state.open} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="max-w-md">
        {state.options && (() => {
          const severity = state.options.severity ?? "destructive";
          const cfg = SEVERITY_CONFIG[severity];
          return (
            <>
              <DialogHeader>
                <div className="flex items-start gap-3">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", cfg.iconBg)}>
                    {cfg.icon}
                  </div>
                  <div>
                    <DialogTitle className="text-base leading-tight">
                      {state.options.action}
                    </DialogTitle>
                    <DialogDescription className="mt-1 text-sm leading-relaxed">
                      {state.options.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Active Role Context */}
              <div className={cn("rounded-lg border p-3 space-y-1.5", cfg.borderColor)}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  You are acting as
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeRole ? (
                    <>
                      <Badge variant="secondary" className="gap-1.5 text-xs font-medium">
                        <ScopeIcon scopeType={activeRole.scopeType} />
                        {activeRole.roleName}
                      </Badge>
                      {activeRole.scopeLabel && (
                        <span className="text-sm text-foreground font-medium">
                          {activeRole.scopeLabel}
                        </span>
                      )}
                      {!activeRole.scopeLabel && activeRole.scopeType === "GLOBAL" && (
                        <span className="text-sm text-foreground font-medium">
                          All Platform
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">No active role selected</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  This action will be performed under the above role context. If this is not the intended role,{" "}
                  <button
                    className="text-primary underline underline-offset-2 hover:no-underline"
                    onClick={handleCancel}
                  >
                    cancel and switch role
                  </button>{" "}
                  first.
                </p>
              </div>

              {/* Optional confirmation phrase */}
              {state.options.confirmPhrase && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground">
                    Type{" "}
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {state.options.confirmPhrase}
                    </code>{" "}
                    to confirm:
                  </p>
                  <input
                    type="text"
                    value={state.typedPhrase}
                    onChange={(e) =>
                      setState((s) => ({ ...s, typedPhrase: e.target.value }))
                    }
                    placeholder={state.options.confirmPhrase}
                    className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                    autoFocus
                  />
                </div>
              )}

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  variant={cfg.confirmVariant}
                  onClick={handleConfirm}
                  disabled={!phraseMatch}
                >
                  {state.options.confirmLabel ?? "Confirm"}
                </Button>
              </DialogFooter>
            </>
          );
        })()}
      </DialogContent>
    </Dialog>
  );

  return { confirm, RoleContextGuardDialog };
}
