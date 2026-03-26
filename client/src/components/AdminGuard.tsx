/**
 * AdminGuard — Auth + Role Enforcement Gate (Manus OAuth)
 *
 * Wraps all admin routes. Uses tRPC auth.me (cookie-based Manus OAuth session)
 * to determine authentication state. Falls back to the OAuth login portal if
 * the session is missing, preserving the original URL as a returnPath so the
 * user lands back on the right page after login.
 *
 * If auth check fails → redirect to Manus OAuth login (with returnPath)
 * If role check fails → redirect to /admin/role-switch
 *
 * Shows a minimal loading spinner while the auth query is in-flight.
 */
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const [location, navigate] = useLocation();

  const { data: user, isLoading, error } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const isAuthenticated = !!user && !error;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      // Redirect to Manus OAuth login, preserving the current path so the
      // user returns here after authentication completes.
      window.location.href = getLoginUrl(location);
      return;
    }

    // Enforce role selection: if no active role is stored, redirect to /role-switch
    const storedRole = localStorage.getItem("peppr_active_role");
    if (!storedRole) {
      navigate("/admin/role-switch");
    }
  }, [isAuthenticated, isLoading, location, navigate]);

  // While auth state is resolving, show a minimal spinner
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0f",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #6366f1",
              borderTopColor: "transparent",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "#888", fontSize: 14 }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not authenticated — render nothing while redirect fires
  if (!isAuthenticated) return null;

  // No active role — render nothing while redirect fires
  const storedRole = localStorage.getItem("peppr_active_role");
  if (!storedRole) return null;

  return <>{children}</>;
}
