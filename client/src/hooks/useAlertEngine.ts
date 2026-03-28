/**
 * useAlertEngine — Burst-safe alert dispatcher for Front Office events.
 *
 * Problem: When multiple service requests arrive in rapid succession (e.g. a
 * group check-in triggers 5 requests within 2 seconds), naive implementations
 * fire one chime + one toast + one browser notification per event, creating
 * noise that disrupts hotel staff.
 *
 * Solution:
 *  - Chime: debounced with a 600ms window. Only ONE chime fires per burst,
 *    regardless of how many events arrive. A separate softer tone plays for
 *    session.created events.
 *  - Toast: events are batched within a 600ms window. A single grouped toast
 *    shows "3 new service requests" instead of 3 separate toasts.
 *  - Browser notification: uses a fixed `tag` so the OS replaces (not stacks)
 *    the notification. `renotify: true` re-rings the OS alert for each burst.
 *  - Mute: all audio + browser notifications are suppressed when muted.
 *    Toasts always fire (visual-only fallback).
 */
import { useRef, useCallback } from "react";
import { toast } from "sonner";
import { useAlertMute } from "@/hooks/useAlertMute";
import { useChime } from "@/hooks/useChime";

const BURST_WINDOW_MS = 600;
const BROWSER_NOTIF_TAG_REQUESTS = "peppr-fo-requests";
const BROWSER_NOTIF_TAG_SESSIONS = "peppr-fo-sessions";
const BROWSER_NOTIF_TAG_STATUS = "peppr-fo-status";

function showBrowserNotification(
  title: string,
  body: string,
  tag: string
) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (document.visibilityState === "visible") return; // tab focused → use toast
  try {
    new Notification(title, {
      body,
      icon: "/favicon.ico",
      tag,
      renotify: true, // re-ring OS even if same tag is already shown
    } as NotificationOptions & { renotify: boolean });
  } catch { /* ignore */ }
}

interface PendingBurst {
  count: number;
  rooms: string[];
  timer: ReturnType<typeof setTimeout> | null;
}

export function useAlertEngine() {
  const { muted } = useAlertMute();
  const { play: playChime } = useChime();
  const mutedRef = useRef(muted);
  // Keep mutedRef in sync without re-creating callbacks
  mutedRef.current = muted;

  // Burst accumulators per event category
  const requestBurst = useRef<PendingBurst>({ count: 0, rooms: [], timer: null });
  const sessionBurst = useRef<PendingBurst>({ count: 0, rooms: [], timer: null });

  /** Flush accumulated request events as a single grouped toast + notification */
  const flushRequestBurst = useCallback(() => {
    const burst = requestBurst.current;
    if (burst.count === 0) return;

    const count = burst.count;
    const rooms = Array.from(new Set(burst.rooms)); // deduplicate room numbers
    burst.count = 0;
    burst.rooms = [];
    burst.timer = null;

    // Grouped toast (always fires, even when muted)
    const roomLabel =
      rooms.length === 1
        ? `Room ${rooms[0]}`
        : rooms.length <= 3
        ? rooms.map((r) => `Room ${r}`).join(", ")
        : `${rooms.slice(0, 2).map((r) => `Room ${r}`).join(", ")} +${rooms.length - 2} more`;

    const msg =
      count === 1
        ? `🔔 New request — ${roomLabel}`
        : `🔔 ${count} new requests — ${roomLabel}`;

    toast.info(msg, { duration: 7000, id: "fo-request-burst" });

    // Audio + browser notification only when not muted
    if (!mutedRef.current) {
      playChime(); // C5 → E5 two-tone
      showBrowserNotification(
        count === 1 ? "New Service Request" : `${count} New Service Requests`,
        count === 1
          ? `${roomLabel} is waiting`
          : `${roomLabel} are waiting`,
        BROWSER_NOTIF_TAG_REQUESTS
      );
    }
  }, [playChime]);

  /** Flush accumulated session events */
  const flushSessionBurst = useCallback(() => {
    const burst = sessionBurst.current;
    if (burst.count === 0) return;

    const count = burst.count;
    const rooms = Array.from(new Set(burst.rooms));
    burst.count = 0;
    burst.rooms = [];
    burst.timer = null;

    const roomLabel =
      rooms.length === 1
        ? `Guest checked in`
        : rooms.length <= 3
        ? rooms.map((r) => `Room ${r}`).join(", ")
        : `${rooms.slice(0, 2).map((r) => `Room ${r}`).join(", ")} +${rooms.length - 2} more`;

    const msg =
      count === 1
        ? `✅ Guest checked in — ${roomLabel}`
        : `✅ ${count} guests checked in — ${roomLabel}`;

    toast.success(msg, { duration: 5000, id: "fo-session-burst" });

    if (!mutedRef.current) {
      // Softer single A4 tone — distinct from request chime
      playSessionChime();
      showBrowserNotification(
        count === 1 ? "Guest Check-in" : `${count} Guest Check-ins`,
        count === 1 ? `${roomLabel} is now active` : `${roomLabel} are now active`,
        BROWSER_NOTIF_TAG_SESSIONS
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /** Dispatch a request.created event into the burst accumulator */
  const dispatchRequestCreated = useCallback(
    (room: string) => {
      const burst = requestBurst.current;
      burst.count += 1;
      if (room) burst.rooms.push(room);

      if (burst.timer !== null) {
        clearTimeout(burst.timer);
      }
      burst.timer = setTimeout(flushRequestBurst, BURST_WINDOW_MS);
    },
    [flushRequestBurst]
  );

  /** Dispatch a session.created event into the burst accumulator */
  const dispatchSessionCreated = useCallback(
    (room: string) => {
      const burst = sessionBurst.current;
      burst.count += 1;
      if (room) burst.rooms.push(room);

      if (burst.timer !== null) {
        clearTimeout(burst.timer);
      }
      burst.timer = setTimeout(flushSessionBurst, BURST_WINDOW_MS);
    },
    [flushSessionBurst]
  );

  /** Dispatch a request.updated status-change event — plays G4 tone */
  const dispatchStatusChange = useCallback(
    (requestNumber: string, status: string) => {
      const label = status.toLowerCase().replace(/_/g, " ");
      toast.info(`Request #${requestNumber} -> ${label}`, { duration: 5000 });
      if (!mutedRef.current) {
        playStatusChime();
        showBrowserNotification(
          `Request #${requestNumber} Updated`,
          `Status changed to ${label}`,
          BROWSER_NOTIF_TAG_STATUS
        );
      }
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { dispatchRequestCreated, dispatchSessionCreated, dispatchStatusChange };
}

/** Soft single A4 tone for session check-ins (played outside React hook context) */
function playSessionChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  } catch { /* ignore */ }
}

/** G4 single tone for status-change events (DISPATCHED, COMPLETED, etc.) */
function playStatusChime() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "triangle"; // softer timbre than sine
    osc.frequency.setValueAtTime(392, ctx.currentTime); // G4
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.32);
  } catch { /* ignore */ }
}
