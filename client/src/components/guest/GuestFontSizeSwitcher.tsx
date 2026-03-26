/**
 * GuestFontSizeSwitcher — Accessible A- / A / A+ font size toggle for the guest microsite.
 *
 * Strategy:
 * 1. On mount: read localStorage first (instant, no flash), then check if a guest
 *    session exists in localStorage. If so, fetch the session's font_size_pref from
 *    the server and apply it (server wins — preference follows the guest across devices).
 * 2. On change: update localStorage + apply CSS immediately, then persist to server
 *    via PATCH /api/public/guest/sessions/:id/font-size (fire-and-forget).
 *
 * Falls back to localStorage-only for guests without an active session (pre-scan).
 */
import { useState, useCallback, useEffect } from "react";
import { applyFontSize, readStoredSize, type FontSize } from "@/hooks/useFontSize";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";

const STORAGE_KEY = "peppr_font_size";
const SESSION_KEY = "pa_guest_session";
const SIZES: FontSize[] = ["S", "M", "L", "XL"];
const LABELS: Record<FontSize, string> = { S: "A−", M: "A", L: "A+", XL: "A²" };
const TITLES: Record<FontSize, string> = {
  S: "Small — compact text",
  M: "Default — standard text",
  L: "Large — comfortable reading",
  XL: "Extra large — maximum accessibility",
};

function getSessionId(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.session_id ?? null;
  } catch {
    return null;
  }
}

async function fetchSessionFontSize(sessionId: string): Promise<FontSize | null> {
  try {
    const res = await fetch(`/api/public/guest/sessions/${sessionId}`);
    if (!res.ok) return null;
    const data = await res.json();
    const size = data?.font_size_pref;
    if (size && SIZES.includes(size as FontSize)) return size as FontSize;
    return null;
  } catch {
    return null;
  }
}

async function persistFontSize(sessionId: string, size: FontSize): Promise<void> {
  try {
    await fetch(`/api/public/guest/sessions/${sessionId}/font-size`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ font_size: size }),
    });
  } catch {
    // fire-and-forget — localStorage already updated
  }
}

export default function GuestFontSizeSwitcher() {
  const [current, setCurrent] = useState<FontSize>(readStoredSize);

  // On mount: sync from server if a session exists
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    fetchSessionFontSize(sessionId).then((serverSize) => {
      if (serverSize && serverSize !== readStoredSize()) {
        setCurrent(serverSize);
        applyFontSize(serverSize);
        try { localStorage.setItem(STORAGE_KEY, serverSize); } catch { /* ignore */ }
      }
    });
  }, []);

  const cycle = useCallback(() => {
    const idx = SIZES.indexOf(current);
    const next = SIZES[(idx + 1) % SIZES.length];
    setCurrent(next);
    applyFontSize(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    // Persist to server if session exists
    const sessionId = getSessionId();
    if (sessionId) persistFontSize(sessionId, next);
  }, [current]);

  return (
    <Tooltip title={`Text size: ${TITLES[current]} — tap to change`} placement="bottom">
      <IconButton
        onClick={cycle}
        size="small"
        aria-label={`Text size: ${TITLES[current]}, tap to change`}
        sx={{
          width: 36,
          height: 36,
          borderRadius: 1.5,
          border: "1px solid",
          borderColor: "rgba(0,0,0,0.12)",
          bgcolor: "rgba(0,0,0,0.04)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.08)" },
          flexShrink: 0,
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: current === "S" ? "0.65rem" : current === "L" ? "0.85rem" : "0.75rem",
            fontWeight: 700,
            color: "text.primary",
            lineHeight: 1,
            userSelect: "none",
          }}
        >
          {LABELS[current]}
        </Typography>
      </IconButton>
    </Tooltip>
  );
}
