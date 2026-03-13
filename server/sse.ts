/**
 * SSE (Server-Sent Events) — Real-time notification channel for Front Office.
 *
 * Intent: Push live service request updates to the admin dashboard without polling.
 * The Express server acts as an SSE hub that:
 *   1. Accepts SSE connections from the frontend (/api/sse/front-office/:propertyId)
 *   2. Polls the FastAPI backend for new events (or receives webhooks)
 *   3. Pushes events to all connected clients for that property
 *
 * Event types:
 *   - request.created   → New service request submitted by a guest
 *   - request.updated   → Request status changed (confirmed, in_progress, completed, etc.)
 *   - session.created   → New guest session started (QR scanned)
 *   - session.expired   → Guest session expired
 *
 * Architecture:
 *   Browser ←SSE← Express ←poll← FastAPI
 *   Each property has its own event stream to scope notifications.
 */
import type { Express, Request, Response } from "express";
import axios from "axios";

const FASTAPI_BASE_URL = process.env.PEPPR_API_URL || "http://localhost:8000";

// In-memory client registry: propertyId → Set of Response objects
const clients = new Map<string, Set<Response>>();

// Track the last known state per property for change detection
const lastKnownState = new Map<string, { requestCount: number; sessionCount: number }>();

/**
 * Register SSE routes on the Express app.
 */
export function registerSSE(app: Express): void {
  // SSE endpoint: client connects and receives real-time events
  app.get("/api/sse/front-office/:propertyId", (req: Request, res: Response) => {
    const { propertyId } = req.params;

    // Set SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    });

    // Send initial connection event
    sendEvent(res, "connected", {
      propertyId,
      message: "Connected to Front Office live feed",
      timestamp: new Date().toISOString(),
    });

    // Register client
    if (!clients.has(propertyId)) {
      clients.set(propertyId, new Set());
    }
    clients.get(propertyId)!.add(res);

    console.log(
      `[SSE] Client connected for property ${propertyId} (${clients.get(propertyId)!.size} total)`
    );

    // Send heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => {
      sendEvent(res, "heartbeat", { timestamp: new Date().toISOString() });
    }, 30_000);

    // Cleanup on disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      clients.get(propertyId)?.delete(res);
      if (clients.get(propertyId)?.size === 0) {
        clients.delete(propertyId);
        lastKnownState.delete(propertyId);
      }
      console.log(
        `[SSE] Client disconnected from property ${propertyId} (${clients.get(propertyId)?.size ?? 0} remaining)`
      );
    });
  });

  // Internal endpoint: FastAPI can POST events here (webhook-style)
  app.post("/api/sse/emit", (req: Request, res: Response) => {
    const { propertyId, eventType, data } = req.body;
    if (!propertyId || !eventType) {
      res.status(400).json({ error: "propertyId and eventType required" });
      return;
    }
    broadcastToProperty(propertyId, eventType, data);
    res.json({ delivered: clients.get(propertyId)?.size ?? 0 });
  });

  // ─── Resource-scoped presence ─────────────────────────────────────────────
  // presenceByResource: "resourceType:resourceId" → Map<userId, viewer info>
  const presenceByResource = new Map<string, Map<string, {
    userId: string; name: string; initials: string; color: string; lastSeen: number;
  }>>();

  // Prune stale viewers (> 45s without heartbeat)
  setInterval(() => {
    const now = Date.now();
    for (const [key, viewers] of Array.from(presenceByResource.entries())) {
      for (const [uid, v] of Array.from(viewers.entries())) {
        if (now - v.lastSeen > 45_000) viewers.delete(uid);
      }
      if (viewers.size === 0) presenceByResource.delete(key);
    }
  }, 15_000);

  // POST /api/sse/presence — heartbeat: register/refresh viewer on a resource
  app.post("/api/sse/presence", (req: Request, res: Response) => {
    const { userId, name, initials, color, resourceType, resourceId, page, propertyId } = req.body;
    if (!userId || (!resourceId && !page)) {
      res.status(400).json({ error: "userId and (resourceId or page) required" });
      return;
    }

    // Support both legacy (page) and new (resourceType:resourceId) modes
    const key = resourceId ? `${resourceType ?? "page"}:${resourceId}` : `page:${page}`;
    if (!presenceByResource.has(key)) presenceByResource.set(key, new Map());
    const viewers = presenceByResource.get(key)!;
    const isNew = !viewers.has(userId);
    viewers.set(userId, { userId, name: name ?? "Unknown", initials: initials ?? "?", color: color ?? "#6366f1", lastSeen: Date.now() });

    // Broadcast presence:join ONLY to the specific property's SSE clients
    if (isNew) {
      const joinData = { event: "presence:join", key, userId, name, initials, color, viewerCount: viewers.size };
      const targetClients = propertyId ? clients.get(propertyId) : null;
      if (targetClients) {
        Array.from(targetClients).forEach(client => sendEvent(client, "presence", joinData));
      } else {
        // Fallback: broadcast to all properties if propertyId not provided
        for (const propertyClients of Array.from(clients.values())) {
          Array.from(propertyClients).forEach(client => sendEvent(client, "presence", joinData));
        }
      }
    }

    res.json({ ok: true, viewerCount: viewers.size, viewers: Array.from(viewers.values()) });
  });

  // DELETE /api/sse/presence — explicit leave when navigating away
  app.delete("/api/sse/presence", (req: Request, res: Response) => {
    const { userId, resourceType, resourceId, propertyId } = req.body;
    if (!userId || !resourceId) { res.status(400).json({ error: "userId and resourceId required" }); return; }
    const key = `${resourceType ?? "page"}:${resourceId}`;
    const viewers = presenceByResource.get(key);
    if (viewers) {
      viewers.delete(userId);
      if (viewers.size === 0) presenceByResource.delete(key);
      // Broadcast leave ONLY to the specific property's SSE clients
      const leaveData = { event: "presence:leave", key, userId, viewerCount: viewers.size };
      const targetClients = propertyId ? clients.get(propertyId) : null;
      if (targetClients) {
        Array.from(targetClients).forEach(client => sendEvent(client, "presence", leaveData));
      } else {
        for (const propertyClients of Array.from(clients.values())) {
          Array.from(propertyClients).forEach(client => sendEvent(client, "presence", leaveData));
        }
      }
    }
    res.json({ ok: true });
  });

  // GET /api/sse/presence/:resourceType/:resourceId — get current viewers
  app.get("/api/sse/presence/:resourceType/:resourceId", (req: Request, res: Response) => {
    const { resourceType, resourceId } = req.params;
    const key = `${resourceType}:${resourceId}`;
    const viewers = presenceByResource.get(key);
    const now = Date.now();
    const active = viewers
      ? Array.from(viewers.values()).filter(v => now - v.lastSeen < 45_000)
      : [];
    res.json({ key, viewerCount: active.length, viewers: active });
  });

  // Start polling loop for properties with active connections
  startPollingLoop();

  console.log("[SSE] Real-time notification system registered");
}

/**
 * Send a single SSE event to a client.
 */
function sendEvent(res: Response, event: string, data: unknown): void {
  try {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Client may have disconnected
  }
}

/**
 * Broadcast an event to all clients connected to a property.
 */
function broadcastToProperty(propertyId: string, event: string, data: unknown): void {
  const propertyClients = clients.get(propertyId);
  if (!propertyClients || propertyClients.size === 0) return;

  Array.from(propertyClients).forEach((client) => {
    sendEvent(client, event, {
      ...((typeof data === "object" && data !== null) ? data : { value: data }),
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Poll FastAPI for changes and broadcast events.
 * Only polls properties that have active SSE connections.
 */
async function startPollingLoop(): Promise<void> {
  setInterval(async () => {
    for (const [propertyId, propertyClients] of Array.from(clients.entries())) {
      if (propertyClients.size === 0) continue;

      try {
        // Poll for current request counts
        const [requestsRes, sessionsRes] = await Promise.allSettled([
          axios.get(`${FASTAPI_BASE_URL}/v1/front-office/${propertyId}/requests`, {
            params: { page_size: 1 },
            timeout: 5000,
            validateStatus: () => true,
          }),
          axios.get(`${FASTAPI_BASE_URL}/v1/front-office/${propertyId}/sessions`, {
            params: { page_size: 1 },
            timeout: 5000,
            validateStatus: () => true,
          }),
        ]);

        const requestCount =
          requestsRes.status === "fulfilled" && requestsRes.value.status === 200
            ? requestsRes.value.data?.total ?? 0
            : 0;
        const sessionCount =
          sessionsRes.status === "fulfilled" && sessionsRes.value.status === 200
            ? sessionsRes.value.data?.total ?? 0
            : 0;

        const prev = lastKnownState.get(propertyId);

        if (prev) {
          if (requestCount > prev.requestCount) {
            broadcastToProperty(propertyId, "request.created", {
              newCount: requestCount,
              previousCount: prev.requestCount,
              delta: requestCount - prev.requestCount,
            });
          }
          if (sessionCount > prev.sessionCount) {
            broadcastToProperty(propertyId, "session.created", {
              newCount: sessionCount,
              previousCount: prev.sessionCount,
              delta: sessionCount - prev.sessionCount,
            });
          }
        }

        lastKnownState.set(propertyId, { requestCount, sessionCount });
      } catch {
        // Silently skip — backend may be temporarily unavailable
      }
    }
  }, 10_000); // Poll every 10 seconds
}
