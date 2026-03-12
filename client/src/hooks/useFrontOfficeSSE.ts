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

  const clearUnread = useCallback(() => {
    setUnreadCount(0);
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
      }

      // Invalidate relevant queries to refresh data
      if (type === "request.created" || type === "request.updated") {
        queryClient.invalidateQueries({ queryKey: ["front-office", "requests"] });
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
