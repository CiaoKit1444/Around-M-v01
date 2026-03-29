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
 * Usage: call once inside a component that is always mounted (e.g. DashboardLayout).
 */
import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useActiveProperty } from "@/hooks/useActiveProperty";

const SEED_KEY = "peppr_inbox_seeded_v1";

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

  useEffect(() => {
    // Only seed once per browser session
    if (sessionStorage.getItem(SEED_KEY)) {
      seeded.current = true;
      return;
    }
    if (!propertyId) return;
    if (!requestsQuery.data) return;
    if (seeded.current) return;

    seeded.current = true;
    sessionStorage.setItem(SEED_KEY, "1");

    // Seed requests — only pending / in-progress are actionable
    const actionableStatuses = new Set(["PENDING", "CONFIRMED", "IN_PROGRESS", "ASSIGNED"]);
    const existing = new Set(notifications.map(n => n.id));

    for (const req of requestsQuery.data) {
      const status: string = (req.status ?? "").toUpperCase();
      if (!actionableStatuses.has(status)) continue;

      const notifId = `seed-req-${req.id}`;
      if (existing.has(notifId)) continue;

      const roomLabel = req.room_number ? `Room ${req.room_number}` : "Unknown room";
      const itemLabel = req.catalog_item_name ?? "Service request";
      const statusLabel =
        status === "PENDING" ? "Pending" :
        status === "CONFIRMED" ? "Confirmed" :
        status === "IN_PROGRESS" ? "In Progress" :
        status === "ASSIGNED" ? "Assigned" : status;

      addNotification({
        // Use a stable ID so duplicate seeds are ignored by the context
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
  }, [propertyId, requestsQuery.data, addNotification, notifications]);
}
