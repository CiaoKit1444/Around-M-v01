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
 * Persistence strategy (layered):
 *   1. localStorage — instant, no-flash on load (applied by inline script in index.html)
 *   2. Server (DB) — synced when user is authenticated, follows them across devices
 *
 * On load: localStorage wins (fast). Server value is fetched in background and
 * reconciled — if different, the server value wins and localStorage is updated.
 * On change: localStorage updated immediately; server updated via debounced mutation.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";

export type FontSize = "S" | "M" | "L";

const STORAGE_KEY = "peppr_font_size";
const DEFAULT_SIZE: FontSize = "M";

const SCALE_MAP: Record<FontSize, string> = {
  S: "87.5%",
  M: "100%",
  L: "112.5%",
};

export function applyFontSize(size: FontSize) {
  document.documentElement.style.fontSize = SCALE_MAP[size];
}

export function readStoredSize(): FontSize {
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

  // Server sync: fetch stored preference from DB
  const { data: serverSize } = trpc.preferences.getFontSize.useQuery(undefined, {
    retry: false,
    staleTime: Infinity, // Don't re-fetch unless invalidated
  });

  const setFontSizeMutation = trpc.preferences.setFontSize.useMutation();

  // Debounce ref for server writes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Apply on first mount from localStorage (fast path)
  useEffect(() => {
    applyFontSize(fontSize);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // When server value arrives, reconcile: server wins if different from localStorage
  useEffect(() => {
    if (!serverSize) return;
    if (serverSize !== fontSize) {
      setFontSizeState(serverSize);
      applyFontSize(serverSize);
      try {
        localStorage.setItem(STORAGE_KEY, serverSize);
      } catch { /* ignore */ }
    }
  }, [serverSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFontSize = useCallback((size: FontSize) => {
    // Immediate local update
    setFontSizeState(size);
    applyFontSize(size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch { /* ignore */ }

    // Debounced server write (300ms)
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFontSizeMutation.mutate({ size });
    }, 300);
  }, [setFontSizeMutation]);

  return { fontSize, setFontSize, sizes: ["S", "M", "L"] as FontSize[] };
}
