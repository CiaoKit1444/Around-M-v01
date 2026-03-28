/**
 * NotificationContext — Global notification state shared across all consumers.
 *
 * Persistence: notifications are saved to sessionStorage on every change so they
 * survive page refreshes. sessionStorage is tab-scoped and cleared automatically
 * when the browser tab is closed — no manual cleanup needed.
 *
 * Usage:
 *   const { notifications, addNotification, markRead, markAllRead, dismiss } = useNotificationContext();
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import type { Notification } from "@/components/NotificationCenter";

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
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

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
