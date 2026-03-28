/**
 * PendingRequestsBanner — sticky amber banner shown at the top of the content
 * area when there are pending service requests and the user is NOT already on
 * the Front Office page.
 *
 * Behaviours:
 *  - Dismiss (✕): hides for the current session. Reappears if pending count
 *    increases after dismissal (new requests arrived).
 *  - Snooze (15 min): hides the banner for 15 minutes. A countdown is shown
 *    in the button while snoozed. Reappears automatically when snooze expires
 *    OR if new requests arrive before snooze ends.
 *  - View Requests: navigates to /admin/front-office?status=pending.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Box, Typography, Button, IconButton, Tooltip } from "@mui/material";
import { ConciergeBell, X, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useActiveProperty } from "@/hooks/useActiveProperty";

const SNOOZE_DURATION_MS = 15 * 60 * 1000; // 15 minutes
const SNOOZE_KEY = "peppr_pending_banner_snoozed_until";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec.toString().padStart(2, "0")}s` : `${sec}s`;
}

function readSnoozeExpiry(): number {
  try {
    return Number(sessionStorage.getItem(SNOOZE_KEY) ?? "0");
  } catch {
    return 0;
  }
}

export function PendingRequestsBanner() {
  const [location, navigate] = useLocation();
  const { propertyId } = useActiveProperty();

  // Dismiss state — hides until pending count increases
  const [dismissed, setDismissed] = useState(false);
  const [dismissedAtCount, setDismissedAtCount] = useState(0);

  // Snooze state
  const [snoozeUntil, setSnoozeUntil] = useState<number>(() => {
    const expiry = readSnoozeExpiry();
    return expiry > Date.now() ? expiry : 0;
  });
  const [snoozeCountdown, setSnoozeCountdown] = useState("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Don't show on Front Office pages
  const isFrontOfficePage = location.startsWith("/admin/front-office");

  const pendingQ = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId!, status: "PENDING", limit: 100 },
    { enabled: !!propertyId && !isFrontOfficePage, staleTime: 15_000, refetchInterval: 30_000 }
  );

  const pendingCount = Array.isArray(pendingQ.data) ? pendingQ.data.length : 0;

  // Re-show if new requests arrive after dismiss or snooze
  useEffect(() => {
    if (pendingCount > dismissedAtCount) {
      setDismissed(false);
      // Also clear snooze if new requests arrive
      if (snoozeUntil > 0 && pendingCount > dismissedAtCount) {
        setSnoozeUntil(0);
        try { sessionStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
      }
    }
  }, [pendingCount, dismissedAtCount, snoozeUntil]);

  // Snooze countdown ticker
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!snoozeUntil) {
      setSnoozeCountdown("");
      return;
    }

    const tick = () => {
      const remaining = snoozeUntil - Date.now();
      if (remaining <= 0) {
        setSnoozeUntil(0);
        setSnoozeCountdown("");
        try { sessionStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
        if (tickRef.current) clearInterval(tickRef.current);
      } else {
        setSnoozeCountdown(formatCountdown(remaining));
      }
    };

    tick();
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [snoozeUntil]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    setDismissedAtCount(pendingCount);
  }, [pendingCount]);

  const handleSnooze = useCallback(() => {
    const expiry = Date.now() + SNOOZE_DURATION_MS;
    setSnoozeUntil(expiry);
    setDismissedAtCount(pendingCount);
    try { sessionStorage.setItem(SNOOZE_KEY, String(expiry)); } catch { /* ignore */ }
  }, [pendingCount]);

  const handleView = useCallback(() => {
    navigate("/admin/front-office?status=pending");
  }, [navigate]);

  const isSnoozed = snoozeUntil > Date.now();

  if (isFrontOfficePage || dismissed || isSnoozed || pendingCount === 0) return null;

  return (
    <Box
      role="alert"
      sx={{
        position: "sticky",
        top: 56, // below the 56px TopBar
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: { xs: 2, md: 3 },
        py: 0.75,
        bgcolor: "#F59E0B",
        color: "#fff",
        boxShadow: "0 2px 8px rgba(245,158,11,0.35)",
        flexWrap: { xs: "wrap", sm: "nowrap" },
      }}
    >
      <ConciergeBell size={16} style={{ flexShrink: 0 }} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, fontSize: "0.8125rem", flex: 1, lineHeight: 1.4, minWidth: 0 }}
      >
        {pendingCount === 1
          ? "1 pending service request is waiting for action."
          : `${pendingCount} pending service requests are waiting for action.`}
      </Typography>

      {/* Action buttons */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0 }}>
        <Button
          size="small"
          variant="contained"
          onClick={handleView}
          sx={{
            bgcolor: "rgba(0,0,0,0.2)",
            color: "#fff",
            fontWeight: 700,
            fontSize: "0.75rem",
            px: 1.5,
            py: 0.25,
            minWidth: 0,
            "&:hover": { bgcolor: "rgba(0,0,0,0.35)" },
            boxShadow: "none",
          }}
        >
          View Requests
        </Button>

        <Tooltip title="Snooze for 15 minutes">
          <Button
            size="small"
            variant="contained"
            onClick={handleSnooze}
            startIcon={<Clock size={12} />}
            sx={{
              bgcolor: "rgba(0,0,0,0.15)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "0.75rem",
              px: 1.25,
              py: 0.25,
              minWidth: 0,
              "&:hover": { bgcolor: "rgba(0,0,0,0.28)" },
              boxShadow: "none",
            }}
          >
            Snooze 15m
          </Button>
        </Tooltip>

        <IconButton
          size="small"
          onClick={handleDismiss}
          aria-label="Dismiss banner"
          sx={{ color: "#fff", opacity: 0.8, "&:hover": { opacity: 1 }, p: 0.25, flexShrink: 0 }}
        >
          <X size={14} />
        </IconButton>
      </Box>

      {/* Snooze countdown shown when snoozed (shouldn't render but kept for future use) */}
      {snoozeCountdown && (
        <Typography variant="caption" sx={{ fontSize: "0.7rem", opacity: 0.85, flexShrink: 0 }}>
          Snoozed — {snoozeCountdown}
        </Typography>
      )}
    </Box>
  );
}
