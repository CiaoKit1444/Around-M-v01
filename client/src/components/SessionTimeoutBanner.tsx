/**
 * SessionTimeoutBanner
 *
 * A dismissible amber warning bar that appears at the top of the admin layout
 * when the user's session is within 5 minutes of expiring.
 *
 * - Shows the exact minutes remaining
 * - "Refresh Session" button triggers a silent token refresh via the API client
 * - "Dismiss" hides the banner until the next warning window
 */
import { AlertTriangle, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { tokenStore } from "@/lib/api/client";

async function triggerSilentRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return false;
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    const newAccess = data.tokens?.access_token ?? data.access_token ?? null;
    const newRefresh = data.tokens?.refresh_token ?? data.refresh_token ?? null;
    if (newAccess) tokenStore.set(newAccess);
    if (newRefresh) tokenStore.setRefresh(newRefresh);
    return true;
  } catch {
    return false;
  }
}

export function SessionTimeoutBanner() {
  const { warningVisible, minutesLeft, dismiss } = useSessionTimeout();

  if (!warningVisible) return null;

  const handleRefresh = async () => {
    const ok = await triggerSilentRefresh();
    if (ok) {
      dismiss(); // banner will hide because exp changed on next poll
    }
  };

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 text-amber-400 min-w-0">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span className="truncate">
          Your session expires in{" "}
          <strong>{minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}</strong>.
          Save your work or refresh to stay logged in.
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-500/40 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300 bg-transparent"
          onClick={handleRefresh}
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Refresh Session
        </Button>
        <button
          onClick={dismiss}
          className="text-amber-500/60 hover:text-amber-400 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
