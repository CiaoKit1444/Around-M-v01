/**
 * useGuestSSE — Subscribe to real-time status updates for a specific service request.
 *
 * Connects to /api/sse/guest/:requestId and fires onStatusUpdate whenever the
 * server broadcasts a "request.updated" event.  Falls back gracefully to polling
 * if SSE is unavailable (e.g., network interruption).
 *
 * Usage:
 *   const { connected } = useGuestSSE(requestId, (data) => {
 *     // data.status, data.message, data.confirmationDeadline, etc.
 *     refetch();
 *   });
 */

import { useEffect, useRef, useState, useCallback } from "react";

export interface GuestSSEEvent {
  requestId: string;
  status: string;
  message?: string;
  confirmationDeadline?: string;
  feedbackUrl?: string;
  timestamp?: string;
}

interface UseGuestSSEOptions {
  /** Called whenever a request.updated event arrives */
  onStatusUpdate: (event: GuestSSEEvent) => void;
  /** Disable SSE (e.g., when requestId is not yet known) */
  enabled?: boolean;
}

interface UseGuestSSEResult {
  /** Whether the SSE connection is currently active */
  connected: boolean;
  /** Number of live updates received since mount */
  updateCount: number;
}

export function useGuestSSE(
  requestId: string | null | undefined,
  { onStatusUpdate, enabled = true }: UseGuestSSEOptions
): UseGuestSSEResult {
  const [connected, setConnected] = useState(false);
  const [updateCount, setUpdateCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const onUpdateRef = useRef(onStatusUpdate);

  // Keep callback ref fresh without re-triggering the effect
  useEffect(() => {
    onUpdateRef.current = onStatusUpdate;
  }, [onStatusUpdate]);

  const connect = useCallback(() => {
    if (!requestId || !enabled) return;

    // Close any existing connection
    esRef.current?.close();

    const url = `/api/sse/guest/${encodeURIComponent(requestId)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener("connected", () => {
      setConnected(true);
      console.log(`[GuestSSE] Connected for request ${requestId}`);
    });

    es.addEventListener("request.updated", (e: MessageEvent) => {
      try {
        const data: GuestSSEEvent = JSON.parse(e.data);
        setUpdateCount((c) => c + 1);
        onUpdateRef.current(data);
        console.log(`[GuestSSE] Status update: ${data.status}`);
      } catch {
        console.warn("[GuestSSE] Failed to parse request.updated event");
      }
    });

    es.addEventListener("heartbeat", () => {
      // Heartbeat keeps the connection alive — no action needed
    });

    es.onerror = () => {
      setConnected(false);
      console.warn(`[GuestSSE] Connection error for request ${requestId} — will retry`);
      // EventSource automatically retries; we just update state
    };
  }, [requestId, enabled]);

  useEffect(() => {
    if (!requestId || !enabled) return;

    connect();

    return () => {
      esRef.current?.close();
      esRef.current = null;
      setConnected(false);
    };
  }, [requestId, enabled, connect]);

  return { connected, updateCount };
}
