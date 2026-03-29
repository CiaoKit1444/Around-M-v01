/**
 * useInboxSeed — Seeds the Inbox with recent live data on first mount,
 * then silently refreshes every 60 seconds to keep the badge count accurate
 * even when the Front Office page is not open and SSE is not active.
 *
 * Strategy:
 *  - Initial seed: on first mount, fetch up to 20 pending/in-progress requests
 *    and 10 active sessions and add them to the NotificationContext.
 *  - Auto-refresh: refetchInterval:60_000 re-fetches both queries every minute.
 *    On each refresh, only NEW items (not already in the inbox by their seed ID)
 *    are added — existing notifications are never duplicated or overwritten.
 *  - The sessionStorage flag is removed so the hook can merge new arrivals on
 *    every refetch cycle, not just on the first mount.
 *
 * Usage: call once inside AdminLayout (always mounted for admin pages).
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useActiveProperty } from "@/hooks/useActiveProperty";

/** Statuses that warrant an inbox entry */
const ACTIONABLE_STATUSES = new Set([
  "PENDING", "CONFIRMED", "IN_PROGRESS", "ASSIGNED", "SUBMITTED", "DISPATCHED",
]);

/** How often (ms) to silently re-fetch and merge new items */
const REFRESH_INTERVAL_MS = 60_000;

export function useInboxSeed() {
  const { propertyId } = useActiveProperty();
  const { addNotification, notifications } = useNotificationContext();
  // Track which seed IDs have already been added so we never duplicate
  const addedIds = useRef<Set<string>>(new Set());

  // Fetch recent pending/in-progress requests — refetch every 60 s
  const requestsQuery = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId ?? "", limit: 20 },
    {
      enabled: !!propertyId,
      staleTime: REFRESH_INTERVAL_MS,
      refetchInterval: REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: false, // pause when tab is hidden
      retry: 1,
    }
  );

  // Fetch active guest sessions — refetch every 60 s
  const sessionsQuery = trpc.crud.sessions.listActive.useQuery(
    { propertyId: propertyId ?? "", limit: 10 },
    {
      enabled: !!propertyId,
      staleTime: REFRESH_INTERVAL_MS,
      refetchInterval: REFRESH_INTERVAL_MS,
      refetchIntervalInBackground: false,
      retry: 1,
    }
  );

  // Initialise addedIds from notifications already in context (e.g. after page refresh)
  useEffect(() => {
    for (const n of notifications) {
      if (n.id.startsWith("seed-")) addedIds.current.add(n.id);
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Merge new requests into the inbox whenever the query data changes
  useEffect(() => {
    if (!propertyId || !requestsQuery.data) return;

    for (const req of requestsQuery.data) {
      const status: string = (req.status ?? "").toUpperCase();
      if (!ACTIONABLE_STATUSES.has(status)) continue;

      const notifId = `seed-req-${req.id}`;
      if (addedIds.current.has(notifId)) continue;
      addedIds.current.add(notifId);

      const roomLabel = req.room_number ? `Room ${req.room_number}` : "Unknown room";
      const itemLabel = req.catalog_item_name ?? "Service request";
      const statusLabel =
        status === "PENDING" ? "Pending" :
        status === "SUBMITTED" ? "Submitted" :
        status === "CONFIRMED" ? "Confirmed" :
        status === "IN_PROGRESS" ? "In Progress" :
        status === "ASSIGNED" ? "Assigned" :
        status === "DISPATCHED" ? "Dispatched" : status;

      addNotification({
        type: "request",
        title: `${itemLabel} — ${statusLabel}`,
        message: `${roomLabel} · Ref: ${req.request_number ?? req.id.slice(0, 8)}`,
        path: `/admin/front-office`,
        requestId: req.id,
        requestStatus: req.status ?? undefined,
        propertyId: req.propertyId ?? propertyId,
        propertyName: undefined,
      });
    }
  }, [propertyId, requestsQuery.data, addNotification]);

  // Merge new sessions into the inbox whenever the query data changes
  useEffect(() => {
    if (!propertyId || !sessionsQuery.data) return;

    for (const session of sessionsQuery.data) {
      const notifId = `seed-session-${session.id}`;
      if (addedIds.current.has(notifId)) continue;
      addedIds.current.add(notifId);

      const guestLabel = session.guestName ? session.guestName : "Guest";
      const accessLabel =
        session.accessType === "ROOM" ? "Room access" :
        session.accessType === "STAY_TOKEN" ? "Stay token" : session.accessType;

      addNotification({
        type: "session",
        title: `${guestLabel} — Active Session`,
        message: `${accessLabel} · Session ${session.id.slice(0, 8)}`,
        path: `/admin/front-office`,
        propertyId: session.propertyId,
        propertyName: undefined,
      });
    }
  }, [propertyId, sessionsQuery.data, addNotification]);
}
