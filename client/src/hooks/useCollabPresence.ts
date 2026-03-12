/**
 * useCollabPresence — Real-time collaboration presence tracking.
 *
 * Uses the SSE endpoint to broadcast page presence.
 * Shows which admin users are currently viewing the same page.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  page: string;
  lastSeen: number;
}

// Shared presence state across the app (module-level singleton)
const presenceMap = new Map<string, PresenceUser>();
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// Heartbeat interval in ms
const HEARTBEAT_MS = 10_000;
// Stale threshold — remove users not seen for 30s
const STALE_MS = 30_000;

export function useCollabPresence(page: string) {
  const { user } = useAuth();
  const [peers, setPeers] = useState<PresenceUser[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Register as a listener for presence updates
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const active = Array.from(presenceMap.values()).filter(
        p => p.page === page && p.userId !== user?.id && now - p.lastSeen < STALE_MS
      );
      setPeers(active);
    };
    listeners.add(update);
    update();
    return () => { listeners.delete(update); };
  }, [page, user?.id]);

  // Broadcast own presence via SSE presence channel
  useEffect(() => {
    if (!user) return;

    const broadcast = async () => {
      try {
        await fetch("/api/sse/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: user.id,
            name: user.full_name ?? user.email ?? "Admin",
            page,
          }),
        });
      } catch {
        // Silently ignore — presence is best-effort
      }
    };

    broadcast();
    heartbeatRef.current = setInterval(broadcast, HEARTBEAT_MS);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [user, page]);

  // Listen for presence events from SSE
  useEffect(() => {
    if (!user) return;

    const es = new EventSource("/api/sse/front-office", { withCredentials: true });
    esRef.current = es;

    es.addEventListener("presence", (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data) as PresenceUser;
        if (data.userId === user.id) return; // Skip own presence
        presenceMap.set(data.userId, { ...data, lastSeen: Date.now() });
        notifyListeners();
      } catch {
        // Ignore parse errors
      }
    });

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [user]);

  return { peers };
}
