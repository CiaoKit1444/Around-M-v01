/**
 * useGuestSession — Manages guest session persistence across page refreshes.
 *
 * Strategy: localStorage (survives refresh + tab close/reopen) with a TTL
 * matching the session expiry. Falls back to sessionStorage for compatibility.
 * Provides helpers to save, load, clear, and check if a session is still valid.
 */
import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "pa_guest_session";
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours default

export interface StoredGuestSession {
  session_id: string;
  qr_code_id: string;
  property_id: string;
  property_name: string;
  room_number: string;
  status: string;
  created_at: string;
  expires_at?: string;
  // Metadata added by this hook
  _stored_at: number;
}

function readSession(): StoredGuestSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data: StoredGuestSession = JSON.parse(raw);
    // Check TTL
    const age = Date.now() - (data._stored_at || 0);
    if (age > SESSION_TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    // Check explicit expiry from server
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function writeSession(session: Omit<StoredGuestSession, "_stored_at">): StoredGuestSession {
  const stored: StoredGuestSession = { ...session, _stored_at: Date.now() };
  const raw = JSON.stringify(stored);
  try {
    localStorage.setItem(STORAGE_KEY, raw);
  } catch {
    // localStorage quota exceeded — fall back to sessionStorage
  }
  sessionStorage.setItem(STORAGE_KEY, raw);
  return stored;
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
}

export function useGuestSession() {
  const [session, setSession] = useState<StoredGuestSession | null>(() => readSession());

  // Sync across tabs via storage event
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSession(readSession());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const saveSession = useCallback((data: Omit<StoredGuestSession, "_stored_at">) => {
    const stored = writeSession(data);
    setSession(stored);
    return stored;
  }, []);

  const clearGuestSession = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const isValid = session !== null && (
    !session.expires_at || new Date(session.expires_at).getTime() > Date.now()
  );

  return {
    session,
    isValid,
    saveSession,
    clearSession: clearGuestSession,
    hasSession: isValid,
  };
}
