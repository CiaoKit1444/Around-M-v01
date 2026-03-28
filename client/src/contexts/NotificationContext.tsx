/**
 * NotificationContext — Global notification state shared across all consumers.
 *
 * Lifts useNotifications state to a context so TopBar bell, FONotificationsPage,
 * and the SSE hook all operate on the same inbox.
 *
 * Usage:
 *   // Wrap at app root (already done in main.tsx via <NotificationProvider>)
 *   const { notifications, addNotification, markRead, markAllRead, dismiss } = useNotificationContext();
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { Notification } from "@/components/NotificationCenter";

interface NotificationContextValue {
  notifications: Notification[];
  addNotification: (n: Omit<Notification, "id" | "read" | "timestamp">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "read" | "timestamp">) => {
    setNotifications(prev => [
      {
        ...n,
        id: `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        read: false,
        timestamp: new Date(),
      },
      ...prev.slice(0, 49), // keep max 50
    ]);
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

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markRead, markAllRead, dismiss }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used inside <NotificationProvider>");
  return ctx;
}
