/**
 * useInboxSeed — Seeds the Inbox with recent live data on first mount.
 *
 * The NotificationCenter is populated by SSE events, which means on a fresh
 * session (or when the Front Office page has not been visited) the inbox is
 * empty even though real requests and sessions exist in the database.
 *
 * This hook fetches:
 *  - The 20 most recent pending/in-progress service requests for the active property
 *  - The 10 most recent active guest sessions for the active property
 *
 * Each item is converted to a Notification and passed to addNotification.
 * A sessionStorage flag prevents re-seeding on every re-render or navigation.
 *
 * Usage: call once inside AdminLayout (always mounted for admin pages).
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useActiveProperty } from "@/hooks/useActiveProperty";

const SEED_KEY = "peppr_inbox_seeded_v2";

export function useInboxSeed() {
  const { propertyId } = useActiveProperty();
  const { addNotification, notifications } = useNotificationContext();
  const seeded = useRef(false);

  // Fetch recent pending/in-progress requests
  const requestsQuery = trpc.requests.listByProperty.useQuery(
    { propertyId: propertyId ?? "", limit: 20 },
    {
      enabled: !!propertyId && !seeded.current,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    }
  );

  // Fetch active guest sessions
  const sessionsQuery = trpc.crud.sessions.listActive.useQuery(
    { propertyId: propertyId ?? "", limit: 10 },
    {
      enabled: !!propertyId && !seeded.current,
      staleTime: 2 * 60 * 1000,
      retry: 1,
    }
  );

  useEffect(() => {
    // Only seed once per browser session
    if (sessionStorage.getItem(SEED_KEY)) {
      seeded.current = true;
      return;
    }
    if (!propertyId) return;
    // Wait for both queries to resolve
    if (!requestsQuery.data && !sessionsQuery.data) return;
    if (seeded.current) return;

    seeded.current = true;
    sessionStorage.setItem(SEED_KEY, "1");

    const existing = new Set(notifications.map(n => n.id));

    // ── Seed requests ─────────────────────────────────────────────────────
    const actionableStatuses = new Set(["PENDING", "CONFIRMED", "IN_PROGRESS", "ASSIGNED", "SUBMITTED", "DISPATCHED"]);

    for (const req of requestsQuery.data ?? []) {
      const status: string = (req.status ?? "").toUpperCase();
      if (!actionableStatuses.has(status)) continue;

      const notifId = `seed-req-${req.id}`;
      if (existing.has(notifId)) continue;

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

    // ── Seed sessions ─────────────────────────────────────────────────────
    for (const session of sessionsQuery.data ?? []) {
      const notifId = `seed-session-${session.id}`;
      if (existing.has(notifId)) continue;

      const guestLabel = session.guestName ? session.guestName : "Guest";
      const accessLabel = session.accessType === "ROOM" ? "Room access" :
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
  }, [propertyId, requestsQuery.data, sessionsQuery.data, addNotification, notifications]);
}
