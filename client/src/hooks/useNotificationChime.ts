/**
 * useNotificationChime
 *
 * Plays a subtle two-tone chime via Web Audio API whenever a new unread
 * "request" notification arrives. Respects the global mute state from
 * useAlertMute — completely silent when muted.
 *
 * Usage: call `playChime()` from NotificationContext whenever a new
 * request notification is added and the user is not muted.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

/**
 * Synthesise a soft two-tone "ding" using a sine oscillator.
 * Total duration ≈ 400 ms, peak volume 0.18 (non-intrusive).
 */
export function playNotificationChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (browser autoplay policy)
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {/* ignore */});
  }

  const now = ctx.currentTime;

  // First tone: 880 Hz (A5) — 200 ms
  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.type = "sine";
  osc1.frequency.setValueAtTime(880, now);
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(0.18, now + 0.02);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.start(now);
  osc1.stop(now + 0.22);

  // Second tone: 1100 Hz (C#6) — offset 180 ms, 220 ms duration
  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(1100, now + 0.18);
  gain2.gain.setValueAtTime(0, now + 0.18);
  gain2.gain.linearRampToValueAtTime(0.14, now + 0.20);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.start(now + 0.18);
  osc2.stop(now + 0.40);
}
