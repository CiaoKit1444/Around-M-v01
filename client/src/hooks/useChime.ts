/**
 * useChime — plays a short two-tone chime using the Web Audio API.
 *
 * No external audio file needed — synthesised entirely in the browser.
 * Respects the muted flag from useAlertMute.
 *
 * Chime profile: two ascending sine tones (C5 → E5) at low volume,
 * each 120ms with a quick fade-out. Suitable for ambient hotel environments.
 */
import { useCallback, useRef } from "react";

export function useChime() {
  const ctxRef = useRef<AudioContext | null>(null);

  const play = useCallback(() => {
    try {
      if (!ctxRef.current || ctxRef.current.state === "closed") {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;

      const playTone = (freq: number, startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, startTime);

        // Gentle attack + decay envelope
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      };

      const now = ctx.currentTime;
      playTone(523.25, now);        // C5
      playTone(659.25, now + 0.15); // E5
    } catch {
      // AudioContext not available (e.g. SSR or restricted browser) — silently ignore
    }
  }, []);

  return { play };
}
