/**
 * NotificationContext — Global notification state shared across all consumers.
 *
 * Persistence strategy (Phase 74b):
 *  - Notifications are kept in sessionStorage (tab-scoped, auto-cleared on close).
 *  - The "last read at" timestamp is persisted to the DB via trpc.inbox.markAllRead.
 *  - On mount, trpc.inbox.getLastRead syncs the unread badge across devices.
 *  - dismiss() now SOFT-ARCHIVES: the full notification payload is written to
 *    peppr_archived_notifications via trpc.inbox.archiveNotification, then removed
 *    from the active list. Staff can recover items from the Archived tab.
 *  - archivedNotifications is exposed so the NotificationCenter can render the
 *    Archived tab and call restoreArchived() to move items back to active.
 *
 * Usage:
 *   const { notifications, archivedNotifications, addNotification, markRead,
 *           markAllRead, dismiss, restoreArchived, clearAll } = useNotificationContext();
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

interface ArchivedNotification extends Notification {
  archivedAt: string; // ISO string
}

interface NotificationContextValue {
  notifications: Notification[];
  archivedNotifications: ArchivedNotification[];
  addNotification: (n: Omit<Notification, "id" | "read" | "timestamp">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  /** Soft-archive: removes from active list and persists to DB */
  dismiss: (id: string) => void;
  /** Restore an archived notification back to the active list */
  restoreArchived: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromSession());
  const syncedRef = useRef(false);

  // ── DB queries / mutations ─────────────────────────────────────────────────
  const { data: lastReadData } = trpc.inbox.getLastRead.useQuery(undefined, {
    retry: false,
    staleTime: Infinity,
  });

  const { data: archivedData = [], refetch: refetchArchived } = trpc.inbox.listArchived.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const markAllReadMutation = trpc.inbox.markAllRead.useMutation({
    onSuccess: (data) => {
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      try { sessionStorage.setItem("peppr_inbox_last_read", data.lastReadAt); } catch { /* ignore */ }
    },
  });

  const archiveMutation = trpc.inbox.archiveNotification.useMutation({
    onSuccess: () => { refetchArchived(); },
  });

  const restoreMutation = trpc.inbox.restoreArchived.useMutation({
    onSuccess: () => { refetchArchived(); },
  });

  // ── Sync unread badge from DB on mount ────────────────────────────────────
  useEffect(() => {
    if (syncedRef.current || !lastReadData?.lastReadAt) return;
    syncedRef.current = true;
    const lastRead = new Date(lastReadData.lastReadAt);
    setNotifications(prev =>
      prev.map(n => ({ ...n, read: n.read || n.timestamp <= lastRead }))
    );
  }, [lastReadData]);

  // ── Persist active list to sessionStorage on every change ─────────────────
  useEffect(() => { saveToSession(notifications); }, [notifications]);

  // ── Context actions ────────────────────────────────────────────────────────
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
    markAllReadMutation.mutate();
  }, [markAllReadMutation]);

  /**
   * Soft-archive: persist to DB then remove from active list.
   * Falls back to local-only removal if the archive mutation fails.
   */
  const dismiss = useCallback((id: string) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === id);
      if (target) {
        // Fire-and-forget archive — UI removes immediately for responsiveness
        archiveMutation.mutate({
          id: target.id,
          type: target.type,
          title: target.title,
          message: target.message,
          path: target.path,
          requestId: target.requestId,
          requestStatus: target.requestStatus,
          propertyId: target.propertyId,
          propertyName: target.propertyName,
          originalTimestamp: target.timestamp.toISOString(),
        });
      }
      return prev.filter(n => n.id !== id);
    });
  }, [archiveMutation]);

  /**
   * Restore an archived notification: delete from archive DB and re-add to
   * the active list so it appears in the main inbox tabs.
   */
  const restoreArchived = useCallback((id: string) => {
    const archived = archivedData.find(r => r.id === id);
    if (!archived) return;
    restoreMutation.mutate({ id });
    // Re-add to active list
    setNotifications(prev => {
      if (prev.some(n => n.id === id)) return prev; // already present
      return [
        {
          id: archived.id,
          type: archived.type as Notification["type"],
          title: archived.title,
          message: archived.message ?? undefined,
          path: archived.path ?? undefined,
          requestId: archived.requestId ?? undefined,
          requestStatus: archived.requestStatus ?? undefined,
          propertyId: archived.propertyId ?? undefined,
          propertyName: archived.propertyName ?? undefined,
          timestamp: new Date(archived.originalTimestamp),
          read: true,
        },
        ...prev.slice(0, MAX_NOTIFICATIONS - 1),
      ];
    });
  }, [archivedData, restoreMutation]);

  const clearAll = useCallback(() => {
    // Archive all active notifications before clearing
    for (const n of notifications) {
      archiveMutation.mutate({
        id: n.id,
        type: n.type,
        title: n.title,
        message: n.message,
        path: n.path,
        requestId: n.requestId,
        requestStatus: n.requestStatus,
        propertyId: n.propertyId,
        propertyName: n.propertyName,
        originalTimestamp: n.timestamp.toISOString(),
      });
    }
    setNotifications([]);
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }, [notifications, archiveMutation]);

  // Map DB archived rows to ArchivedNotification shape
  const archivedNotifications: ArchivedNotification[] = archivedData.map(r => ({
    id: r.id,
    type: r.type as Notification["type"],
    title: r.title,
    message: r.message ?? undefined,
    path: r.path ?? undefined,
    requestId: r.requestId ?? undefined,
    requestStatus: r.requestStatus ?? undefined,
    propertyId: r.propertyId ?? undefined,
    propertyName: r.propertyName ?? undefined,
    timestamp: new Date(r.originalTimestamp),
    read: true,
    archivedAt: r.archivedAt,
  }));

  return (
    <NotificationContext.Provider value={{
      notifications,
      archivedNotifications,
      addNotification,
      markRead,
      markAllRead,
      dismiss,
      restoreArchived,
      clearAll,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used inside <NotificationProvider>");
  return ctx;
}
