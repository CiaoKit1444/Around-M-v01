/**
 * PendingRequestsBanner — sticky amber banner shown at the top of the content
 * area when there are pending service requests and the user is NOT already on
 * the Front Office page.
 *
 * Clicking "View Requests" navigates to /admin/front-office?status=pending.
 * The banner can be dismissed for the current session (sessionStorage).
 * It reappears if the pending count increases after dismissal.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Box, Typography, Button, IconButton } from "@mui/material";
import { ConciergeBell, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useActiveProperty } from "@/hooks/useActiveProperty";

const DISMISS_KEY = "peppr_pending_banner_dismissed_at";

export function PendingRequestsBanner() {
  const [location, navigate] = useLocation();
  const { propertyId } = useActiveProperty();
  const [dismissed, setDismissed] = useState(false);
  const [lastDismissedCount, setLastDismissedCount] = useState(0);

  // Don't show on Front Office pages
  const isFrontOfficePage = location.startsWith("/admin/front-office");

  const pendingQ = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId!, status: "PENDING", limit: 100 },
    { enabled: !!propertyId && !isFrontOfficePage, staleTime: 15_000, refetchInterval: 30_000 }
  );

  const pendingCount = Array.isArray(pendingQ.data) ? pendingQ.data.length : 0;

  // Re-show the banner if new requests arrive after dismissal
  useEffect(() => {
    if (pendingCount > lastDismissedCount && dismissed) {
      setDismissed(false);
    }
  }, [pendingCount, lastDismissedCount, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setLastDismissedCount(pendingCount);
    try {
      sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch { /* ignore */ }
  };

  const handleView = () => {
    navigate("/admin/front-office?status=pending");
  };

  if (isFrontOfficePage || dismissed || pendingCount === 0) return null;

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
      }}
    >
      <ConciergeBell size={16} style={{ flexShrink: 0 }} />
      <Typography
        variant="body2"
        sx={{ fontWeight: 600, fontSize: "0.8125rem", flex: 1, lineHeight: 1.4 }}
      >
        {pendingCount === 1
          ? "1 pending service request is waiting for action."
          : `${pendingCount} pending service requests are waiting for action.`}
      </Typography>
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
          flexShrink: 0,
          "&:hover": { bgcolor: "rgba(0,0,0,0.35)" },
          boxShadow: "none",
        }}
      >
        View Requests
      </Button>
      <IconButton
        size="small"
        onClick={handleDismiss}
        aria-label="Dismiss banner"
        sx={{ color: "#fff", opacity: 0.8, "&:hover": { opacity: 1 }, p: 0.25, flexShrink: 0 }}
      >
        <X size={14} />
      </IconButton>
    </Box>
  );
}
