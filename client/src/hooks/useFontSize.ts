/**
 * useFontSize — Global S / M / L typographic scale preference.
 *
 * Strategy: set `font-size` on the `<html>` element.
 * Because Tailwind uses `rem` units throughout, every text-* class,
 * spacing, and component scales proportionally with a single variable.
 *
 * Sizes:
 *   S → 87.5%  (14px base — compact, information-dense)
 *   M → 100%   (16px base — default)
 *   L → 112.5% (18px base — comfortable reading)
 *
 * Persisted in localStorage under key "peppr_font_size".
 */
import { useState, useEffect, useCallback } from "react";

export type FontSize = "S" | "M" | "L";

const STORAGE_KEY = "peppr_font_size";
const DEFAULT_SIZE: FontSize = "M";

const SCALE_MAP: Record<FontSize, string> = {
  S: "87.5%",
  M: "100%",
  L: "112.5%",
};

function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = SCALE_MAP[size];
}

function readStoredSize(): FontSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "S" || stored === "M" || stored === "L") return stored;
  } catch {
    // localStorage unavailable (private browsing, etc.)
  }
  return DEFAULT_SIZE;
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>(readStoredSize);

  // Apply on first mount
  useEffect(() => {
    applyFontSize(fontSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size);
    applyFontSize(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // ignore
    }
  }, []);

  return { fontSize, setFontSize, sizes: ["S", "M", "L"] as FontSize[] };
}
