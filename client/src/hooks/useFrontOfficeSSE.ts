/**
 * useFrontOfficeSSE — Real-time event stream for Front Office.
 *
 * Intent: Subscribe to Server-Sent Events for a specific property,
 * receiving live updates about service requests and guest sessions.
 *
 * Events received:
 *   - connected        → Initial connection confirmation
 *   - heartbeat        → Keep-alive ping (every 30s)
 *   - request.created  → New service request submitted
 *   - request.updated  → Request status changed
 *   - session.created  → New guest session started
 *   - session.expired  → Guest session expired
 *
 * Usage:
 *   const { isConnected, lastEvent, events } = useFrontOfficeSSE(propertyId);
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useAlertEngine } from "@/hooks/useAlertEngine";
import { useNotificationContext } from "@/contexts/NotificationContext";

/** Request browser notification permission on first call */
function requestNotificationPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}

/** Show a browser-level notification if the tab is not focused */
function showBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // Tab is focused — use toast instead
  try {
    new Notification(title, { body, icon: "/favicon.ico", tag: "peppr-front-office" });
  } catch { /* ignore */ }
}

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
  receivedAt: Date;
}

interface UseFrontOfficeSSEReturn {
  isConnected: boolean;
  lastEvent: SSEEvent | null;
  events: SSEEvent[];
  unreadCount: number;
  clearUnread: () => void;
}

const MAX_EVENTS = 50; // Keep last 50 events in memory

export function useFrontOfficeSSE(
  propertyId: string | undefined
): UseFrontOfficeSSEReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const queryClient = useQueryClient();
  const { dispatchRequestCreated, dispatchSessionCreated, dispatchStatusChange } = useAlertEngine();
  // Keep dispatch refs so the addEvent closure always calls the latest version
  const dispatchRequestRef = useRef(dispatchRequestCreated);
  const dispatchSessionRef = useRef(dispatchSessionCreated);
  const dispatchStatusRef = useRef(dispatchStatusChange);
  useEffect(() => { dispatchRequestRef.current = dispatchRequestCreated; }, [dispatchRequestCreated]);
  useEffect(() => { dispatchSessionRef.current = dispatchSessionCreated; }, [dispatchSessionCreated]);
  useEffect(() => { dispatchStatusRef.current = dispatchStatusChange; }, [dispatchStatusChange]);

  const { addNotification } = useNotificationContext();
  const addNotifRef = useRef(addNotification);
  useEffect(() => { addNotifRef.current = addNotification; }, [addNotification]);

  const utils = trpc.useUtils();

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!propertyId) return;

    const url = `/api/sse/front-office/${propertyId}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    const addEvent = (type: string, data: Record<string, unknown>) => {
      const event: SSEEvent = {
        type,
        data,
        timestamp: (data.timestamp as string) || new Date().toISOString(),
        receivedAt: new Date(),
      };

      setEvents((prev) => {
        const next = [event, ...prev];
        return next.slice(0, MAX_EVENTS);
      });

      // Increment unread for actionable events
      if (type !== "connected" && type !== "heartbeat") {
        setUnreadCount((c) => c + 1);

        // Route events through the burst-safe alert engine
        if (type === "request.created") {
          const room = (data.room_number as string) || "";
          const service = (data.catalog_item_name as string) || "New request";
          const reqId = (data.requestId as string) || (data.request_id as string) || undefined;
          const propName = (data.property_name as string) || undefined;
          dispatchRequestRef.current(room);
          addNotifRef.current({
            type: "request",
            title: `New Request${room ? ` — Room ${room}` : ""}`,
            message: service,
            path: "/admin/front-office?status=pending",
            requestId: reqId,
            requestStatus: "SUBMITTED",
            propertyId: propertyId,
            propertyName: propName,
          });
        } else if (type === "request.updated") {
          const status = (data.status as string) || "";
          const num = (data.request_number as string) || "";
          const room = (data.room_number as string) || "";
          const reqId = (data.requestId as string) || (data.request_id as string) || undefined;
          const propName = (data.property_name as string) || undefined;
          // Only show lifecycle quick-actions for actionable statuses
          const actionableStatuses = ["DISPATCHED", "COMPLETED"];
          if (status && num) {
            // Play distinct G4 chime for status-change events
            dispatchStatusRef.current(num, status);
            addNotifRef.current({
              type: "request",
              title: `Request #${num} updated`,
              message: `Status changed to ${status.toLowerCase().replace("_", " ")}${room ? ` — Room ${room}` : ""}`,
              path: "/admin/front-office",
              propertyId: propertyId,
              propertyName: propName,
              ...(reqId && actionableStatuses.includes(status) ? { requestId: reqId, requestStatus: status as "DISPATCHED" | "COMPLETED" } : {}),
            });
          }
        } else if (type === "session.created") {
          const room = (data.room_number as string) || "";
          const propName = (data.property_name as string) || undefined;
          dispatchSessionRef.current(room);
          addNotifRef.current({
            type: "session",
            title: `Guest checked in${room ? ` — Room ${room}` : ""}`,
            message: "New guest session started",
            path: "/admin/front-office?tab=sessions",
            propertyId: propertyId,
            propertyName: propName,
          });
        } else if (type === "session.expired") {
          const room = (data.room_number as string) || "";
          const propName = (data.property_name as string) || undefined;
          toast.info(`Session expired${room ? ` — Room ${room}` : ""}`, { duration: 3000 });
          addNotifRef.current({
            type: "session",
            title: `Session expired${room ? ` — Room ${room}` : ""}`,
            message: "Guest session has ended",
            path: "/admin/front-office?tab=sessions",
            propertyId: propertyId,
            propertyName: propName,
          });
        }
      }

      // Invalidate relevant queries to refresh data
      if (type === "request.created" || type === "request.updated") {
        // Legacy FastAPI query key
        queryClient.invalidateQueries({ queryKey: ["front-office", "requests"] });
        // tRPC query keys — refresh the FO queue and any open detail view
        void utils.requests.listByProperty.invalidate();
        const requestId = data.requestId as string | undefined;
        if (requestId) {
          void utils.requests.getRequest.invalidate({ requestId });
        }
      }
      if (type === "session.created" || type === "session.expired") {
        queryClient.invalidateQueries({ queryKey: ["front-office", "sessions"] });
      }
    };

    // Connection events
    eventSource.addEventListener("connected", (e) => {
      setIsConnected(true);
      try {
        addEvent("connected", JSON.parse(e.data));
      } catch {
        addEvent("connected", { message: "Connected" });
      }
    });

    eventSource.addEventListener("heartbeat", () => {
      // Just keep connection alive, don't add to events
    });

    // Business events
    const businessEvents = [
      "request.created",
      "request.updated",
      "session.created",
      "session.expired",
    ];

    for (const eventName of businessEvents) {
      eventSource.addEventListener(eventName, (e) => {
        try {
          addEvent(eventName, JSON.parse(e.data));
        } catch {
          addEvent(eventName, { raw: e.data });
        }
      });
    }

    eventSource.onerror = () => {
      setIsConnected(false);
      // EventSource will auto-reconnect
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [propertyId, queryClient]);

  return {
    isConnected,
    lastEvent: events[0] ?? null,
    events,
    unreadCount,
    clearUnread,
  };
}
