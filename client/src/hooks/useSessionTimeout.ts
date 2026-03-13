/**
 * useSessionTimeout
 *
 * Decodes the JWT access token stored in localStorage, reads the `exp` claim,
 * and returns:
 *   - `warningVisible`: true when < 5 minutes remain
 *   - `minutesLeft`: rounded minutes remaining (0 when expired)
 *   - `dismiss()`: hides the warning for the rest of the session
 *
 * The hook polls every 30 seconds so it stays accurate without hammering the
 * browser. It automatically hides when the token is refreshed (exp changes).
 */
import { useState, useEffect, useCallback, useRef } from "react";

const WARN_BEFORE_MS = 5 * 60 * 1000; // 5 minutes
const POLL_INTERVAL_MS = 30_000;       // 30 seconds

function getTokenExp(token: string | null): number | null {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof decoded.exp === "number" ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function useSessionTimeout() {
  const [warningVisible, setWarningVisible] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const dismissedForExpRef = useRef<number | null>(null);

  const check = useCallback(() => {
    const token = localStorage.getItem("pa_access_token");
    const exp = getTokenExp(token);
    if (!exp) {
      setWarningVisible(false);
      setMinutesLeft(null);
      return;
    }

    const now = Date.now();
    const remaining = exp - now;
    const mins = Math.max(0, Math.ceil(remaining / 60_000));
    setMinutesLeft(mins);

    if (remaining <= 0) {
      // Token already expired — let the API client handle the redirect
      setWarningVisible(false);
      return;
    }

    if (remaining <= WARN_BEFORE_MS) {
      // Only show if user hasn't dismissed this specific expiry window
      if (dismissedForExpRef.current !== exp) {
        setWarningVisible(true);
      }
    } else {
      // Token refreshed (new exp) — reset dismissed state
      if (dismissedForExpRef.current !== null && dismissedForExpRef.current !== exp) {
        dismissedForExpRef.current = null;
      }
      setWarningVisible(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    const token = localStorage.getItem("pa_access_token");
    const exp = getTokenExp(token);
    dismissedForExpRef.current = exp;
    setWarningVisible(false);
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [check]);

  return { warningVisible, minutesLeft, dismiss };
}
