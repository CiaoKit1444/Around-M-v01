/**
 * RouteTransitionBar — Thin shimmer bar at the top of the viewport
 * that appears during route transitions and data fetches.
 *
 * Uses wouter's useLocation to detect navigation events and
 * @tanstack/react-query's useIsFetching to show during background fetches.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useIsFetching } from "@tanstack/react-query";

export default function RouteTransitionBar() {
  const [location] = useLocation();
  const isFetching = useIsFetching();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLocation = useRef(location);

  // Show bar on route change
  useEffect(() => {
    if (location !== prevLocation.current) {
      prevLocation.current = location;
      setProgress(0);
      setVisible(true);
      // Animate to 80% quickly, then wait for fetch to complete
      const t1 = setTimeout(() => setProgress(30), 50);
      const t2 = setTimeout(() => setProgress(60), 200);
      const t3 = setTimeout(() => setProgress(80), 500);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [location]);

  // Complete bar when fetching stops
  useEffect(() => {
    if (isFetching === 0 && visible) {
      setProgress(100);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isFetching, visible]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 9999,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #2563EB, #7C3AED)",
          transition: progress === 100
            ? "width 0.3s ease-out"
            : "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          borderRadius: "0 2px 2px 0",
          boxShadow: "0 0 8px rgba(37, 99, 235, 0.6)",
        }}
      />
    </div>
  );
}
