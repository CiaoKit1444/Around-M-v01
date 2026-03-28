/**
 * useAlertMute — persists the alert mute preference in localStorage.
 *
 * When muted:
 *  - No chime is played on new pending requests.
 *  - Browser Notification API calls are suppressed.
 *  - Toast alerts still fire (visual-only feedback).
 *
 * The mute state survives page reloads and is shared across all
 * components that call this hook via the storage event.
 */
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "peppr_alerts_muted";

export function useAlertMute() {
  const [muted, setMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Keep in sync across tabs / other hook instances
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setMuted(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const setMute = useCallback((value: boolean) => {
    setMuted(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch { /* ignore */ }
  }, []);

  return { muted, toggleMute, setMute };
}
