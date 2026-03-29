/**
 * NotificationContext — Global notification state shared across all consumers.
 *
 * Persistence strategy (Phase 73):
 *  - Notifications themselves are kept in sessionStorage (tab-scoped, auto-cleared on close).
 *  - The "last read at" timestamp is persisted to the DB via trpc.inbox.markAllRead so the
 *    unread badge stays accurate across devices and browser restarts.
 *  - On mount, trpc.inbox.getLastRead is called; any notification whose timestamp is AFTER
 *    lastReadAt is considered unread, giving a correct initial badge count.
 *
 * Usage:
 *   const { notifications, addNotification, markRead, markAllRead, dismiss } = useNotificationContext();
 */
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react";
import type { Notification } from "@/components/NotificationCenter";
import { trpc } from "@/lib/trpc";

const SESSION_KEY = "peppr_notifications_v1";
const MAX_NOTIFICATIONS = 50;

/** Deserialise from sessionStorage — timestamps are stored as ISO strings */
function loadFromSession(): Notification[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Notification & { timestamp: string }>;
    return parsed.map(n => ({ ...n, timestamp: new Date(n.timestamp) }));
  } catch {
    return [];
  }
}

function saveToSession(notifications: Notification[]): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(notifications));
  } catch {
    // Quota exceeded or private browsing — silently skip
  }
}

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read" | "timestamp">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  // Initialise from sessionStorage so refreshes restore the inbox
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromSession());

  // Track whether we have synced the read state from the DB yet
  const syncedRef = useRef(false);

  // Fetch last-read timestamp from DB once on mount
  const { data: lastReadData } = trpc.inbox.getLastRead.useQuery(undefined, {
    retry: false,
    staleTime: Infinity, // Only fetch once per session
  });

  // Persist last-read to DB when markAllRead is called
  const markAllReadMutation = trpc.inbox.markAllRead.useMutation({
    onSuccess: (data) => {
      // Update all notifications as read in local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // Store the server timestamp in sessionStorage for cross-tab consistency
      try {
        sessionStorage.setItem("peppr_inbox_last_read", data.lastReadAt);
      } catch { /* ignore */ }
    },
  });

  // When lastReadData arrives, mark all notifications older than lastReadAt as read
  useEffect(() => {
    if (syncedRef.current) return;
    if (!lastReadData) return;
    const { lastReadAt } = lastReadData;
    if (!lastReadAt) return;

    syncedRef.current = true;
    const lastRead = new Date(lastReadAt);

    setNotifications(prev =>
      prev.map(n => ({
        ...n,
        read: n.read || n.timestamp <= lastRead,
      }))
    );
  }, [lastReadData]);

  // Persist every state change to sessionStorage
  useEffect(() => {
    saveToSession(notifications);
  }, [notifications]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "read" | "timestamp">) => {
    setNotifications(prev => {
      const next = [
        {
          ...n,
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          read: false,
          timestamp: new Date(),
        },
        ...prev.slice(0, MAX_NOTIFICATIONS - 1),
      ];
      return next;
    });
  }, []);

  const markRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    // Persist to DB (also updates local state in onSuccess)
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  const dismiss = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markRead, markAllRead, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used inside <NotificationProvider>");
  return ctx;
}
