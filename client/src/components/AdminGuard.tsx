/**
 * AdminGuard — Auth + Role Enforcement Gate
 *
 * Wraps all admin routes. Enforces two conditions before rendering children:
 *   1. User must be authenticated (has valid token + user in AuthContext)
 *   2. User must have an active role selected (peppr_active_role in localStorage)
 *
 * If auth check fails → redirect to /admin/login
 * If role check fails → redirect to /role-switch
 *
 * Shows a minimal loading spinner while auth state is resolving.
 */
import { useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      navigate("/admin/login");
      return;
    }

    // Enforce role selection: if no active role is stored, redirect to /role-switch
    const storedRole = localStorage.getItem("peppr_active_role");
    if (!storedRole) {
      navigate("/admin/role-switch");
    }
  }, [isAuthenticated, isLoading, navigate]);

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
