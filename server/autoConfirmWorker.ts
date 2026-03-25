/**
 * autoConfirmWorker.ts
 *
 * Background worker that auto-transitions COMPLETED → FULFILLED
 * when the 10-minute guest opt-in window has elapsed without a
 * confirmFulfilled or raiseDispute action.
 *
 * Runs every 60 seconds. Safe to call multiple times (idempotent).
 */
import { getDb } from "./db";
import {
  pepprServiceRequests,
  pepprRequestEvents,
} from "../drizzle/schema";
import { eq, and, lt, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { broadcastToProperty, broadcastToRequest } from "./sse";

const OPT_IN_MINUTES = 10;
const POLL_INTERVAL_MS = 60_000; // 1 minute

let workerTimer: ReturnType<typeof setInterval> | null = null;

async function runAutoConfirm(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const cutoff = new Date(Date.now() - OPT_IN_MINUTES * 60 * 1000);

  // Find all COMPLETED requests whose completedAt is older than the opt-in window
  const stale = await db
    .select()
    .from(pepprServiceRequests)
    .where(
      and(
        eq(pepprServiceRequests.status, "COMPLETED"),
        lt(pepprServiceRequests.completedAt, cutoff)
      )
    );

  if (stale.length === 0) return;

  const now = new Date();

  for (const req of stale) {
    try {
      // Transition to FULFILLED
      await db
        .update(pepprServiceRequests)
        .set({
          status: "FULFILLED",
          confirmedAt: now,
          autoConfirmed: true,
          updatedAt: now,
        })
        .where(eq(pepprServiceRequests.id, req.id));

      // Audit log
      await db.insert(pepprRequestEvents).values({
        id: nanoid(),
        requestId: req.id,
        fromState: "COMPLETED",
        toState: "FULFILLED",
        actorType: "system",
        actorId: "auto-confirm-worker",
        note: `Auto-confirmed after ${OPT_IN_MINUTES}-minute opt-in window elapsed`,
        createdAt: now,
      });

      // SSE broadcast to FO property channel
      if (req.propertyId) {
        broadcastToProperty(req.propertyId, "request.updated", {
          requestId: req.id,
          status: "FULFILLED",
          autoConfirmed: true,
        });
      }

      // SSE broadcast to guest tracking channel
      broadcastToRequest(req.id, "request.updated", {
        requestId: req.id,
        status: "FULFILLED",
        autoConfirmed: true,
        message: "Your request has been automatically confirmed.",
      });

      console.log(`[AutoConfirm] ${req.requestNumber} → FULFILLED (auto)`);
    } catch (err) {
      console.error(`[AutoConfirm] Failed to auto-confirm ${req.id}:`, err);
    }
  }
}

/**
 * Start the auto-confirm background worker.
 * Call once from server startup.
 */
export function startAutoConfirmWorker(): void {
  if (workerTimer) return; // already running
  console.log(`[AutoConfirm] Worker started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  // Run immediately on startup, then on interval
  void runAutoConfirm();
  workerTimer = setInterval(() => void runAutoConfirm(), POLL_INTERVAL_MS);
}

/**
 * Stop the worker (for clean shutdown / testing).
 */
export function stopAutoConfirmWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
    console.log("[AutoConfirm] Worker stopped");
  }
}

// Export for testing
export { runAutoConfirm, OPT_IN_MINUTES };
