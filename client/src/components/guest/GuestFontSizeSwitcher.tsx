/**
 * GuestFontSizeSwitcher — Accessible A- / A / A+ font size toggle for the guest microsite.
 *
 * Uses the same localStorage key as the admin switcher so the preference is shared.
 * Guest pages are unauthenticated, so no server sync — localStorage only.
 * Designed for mobile-first use: large tap targets, clear visual feedback.
 */
import { useState, useCallback } from "react";
import { applyFontSize, readStoredSize, type FontSize } from "@/hooks/useFontSize";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";

const STORAGE_KEY = "peppr_font_size";
const SIZES: FontSize[] = ["S", "M", "L"];
const LABELS: Record<FontSize, string> = { S: "A−", M: "A", L: "A+" };
const TITLES: Record<FontSize, string> = {
  S: "Small text",
  M: "Default text",
  L: "Large text",
};

export default function GuestFontSizeSwitcher() {
  const [current, setCurrent] = useState<FontSize>(readStoredSize);

  const cycle = useCallback(() => {
    const idx = SIZES.indexOf(current);
    const next = SIZES[(idx + 1) % SIZES.length];
    setCurrent(next);
    applyFontSize(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
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
