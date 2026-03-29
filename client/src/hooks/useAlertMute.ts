/**
 * useAlertMute — persists the alert mute preference in localStorage.
 *
 * When muted:
 *  - No chime is played on new pending requests.
 *  - Browser Notification API calls are suppressed.
 *  - Toast alerts still fire (visual-only feedback).
 *
 * Auto-expiry: mute automatically lifts after 30 minutes. The hook
 * exposes `muteExpiresAt` (Date | null) and `muteRemainingLabel` (string)
 * so the TopBar tooltip can show a live countdown.
 *
 * The mute state survives page reloads and is shared across all
 * components that call this hook via the storage event.
 */
import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "peppr_alerts_muted";
const EXPIRY_KEY = "peppr_alerts_mute_expires";
const MUTE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export function readMuted(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) !== "true") return false;
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? "0");
    if (expiry && Date.now() > expiry) {
      // Auto-expired — clear storage
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(EXPIRY_KEY);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function readExpiry(): Date | null {
  try {
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? "0");
    return expiry ? new Date(expiry) : null;
  } catch {
    return null;
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min > 0) return `${min}m ${sec.toString().padStart(2, "0")}s`;
  return `${sec}s`;
}

export function useAlertMute() {
  const [muted, setMuted] = useState<boolean>(readMuted);
  const [expiresAt, setExpiresAt] = useState<Date | null>(readExpiry);
  const [remainingLabel, setRemainingLabel] = useState<string>("");
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown ticker — updates every second while muted
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (!muted || !expiresAt) {
      setRemainingLabel("");
      return;
    }

    const tick = () => {
      const remaining = expiresAt.getTime() - Date.now();
      if (remaining <= 0) {
        // Auto-unmute
        setMuted(false);
        setExpiresAt(null);
        setRemainingLabel("");
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(EXPIRY_KEY);
        } catch { /* ignore */ }
        if (tickRef.current) clearInterval(tickRef.current);
      } else {
        setRemainingLabel(formatCountdown(remaining));
      }
    };

    tick(); // immediate first render
    tickRef.current = setInterval(tick, 1000);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [muted, expiresAt]);

  // Keep in sync across tabs / other hook instances
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === EXPIRY_KEY) {
        const newMuted = readMuted();
        const newExpiry = readExpiry();
        setMuted(newMuted);
        setExpiresAt(newExpiry);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        if (next) {
          const expiry = Date.now() + MUTE_DURATION_MS;
          localStorage.setItem(STORAGE_KEY, "true");
          localStorage.setItem(EXPIRY_KEY, String(expiry));
          setExpiresAt(new Date(expiry));
        } else {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(EXPIRY_KEY);
          setExpiresAt(null);
        }
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setMute = useCallback((value: boolean) => {
    setMuted(value);
    try {
      if (value) {
        const expiry = Date.now() + MUTE_DURATION_MS;
        localStorage.setItem(STORAGE_KEY, "true");
        localStorage.setItem(EXPIRY_KEY, String(expiry));
        setExpiresAt(new Date(expiry));
      } else {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(EXPIRY_KEY);
        setExpiresAt(null);
      }
    } catch { /* ignore */ }
  }, []);

  return { muted, toggleMute, setMute, muteExpiresAt: expiresAt, muteRemainingLabel: remainingLabel };
}
