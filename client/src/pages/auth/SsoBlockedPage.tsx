/**
 * SsoBlockedPage — Shown when a user's email is not on the SSO allowlist.
 *
 * Design: Precision Studio — clean error state with clear CTA.
 */
import { useLocation } from "wouter";
import { ShieldOff, ArrowLeft, Mail } from "lucide-react";

export default function SsoBlockedPage() {
  const [, navigate] = useLocation();

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const reason = params.get("reason") ?? "Your account is not authorized to access this platform.";
  const returnTo = params.get("returnTo") ?? "/";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldOff className="w-10 h-10 text-destructive" />
          </div>
        </div>

        {/* Heading */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {reason}
          </p>
        </div>

        {/* Detail box */}
        <div className="bg-muted/50 border border-border rounded-lg p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            What to do next
          </p>
          <ul className="text-sm text-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <Mail className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <span>
                Contact your Peppr Around administrator and ask them to add your email to the SSO allowlist.
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => navigate(returnTo as string)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground">
          Peppr Around Platform &mdash; Access controlled by SSO Allowlist
        </p>
      </div>
    </div>
  );
}
