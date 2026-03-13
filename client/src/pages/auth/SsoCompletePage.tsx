/**
 * SsoCompletePage — OAuth SSO handoff landing page.
 *
 * Flow:
 *   1. Express OAuth callback POSTs to FastAPI /v1/auth/sso-login
 *   2. On success, redirects here with ?access_token=...&refresh_token=...
 *   3. This page stores the tokens in localStorage (same keys as email/password login)
 *      and redirects to /role-switch so the user picks their active role.
 *
 * Security note: tokens are in the URL query string only for the brief moment
 * it takes this page to load and move them to localStorage. The URL is
 * immediately replaced via history.replaceState to prevent tokens appearing
 * in browser history or server logs.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";
import { CheckCircle } from "lucide-react";

export default function SsoCompletePage() {
  const [, navigate] = useLocation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");

    // Immediately scrub tokens from the URL bar
    window.history.replaceState({}, document.title, "/auth/sso-complete");

    if (!accessToken || !refreshToken) {
      setError("SSO handoff failed — missing tokens. Please try signing in again.");
      return;
    }

    // Store tokens using the same keys as the email/password login flow
    localStorage.setItem("pa_access_token", accessToken);
    localStorage.setItem("pa_refresh_token", refreshToken);

    // Clear any stale active role so the user is taken to role selection
    localStorage.removeItem("peppr_active_role");

    // Brief delay so the user sees the success state, then redirect
    const timer = setTimeout(() => {
      navigate("/role-switch");
    }, 800);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        gap: 2,
      }}
    >
      {error ? (
        <Box sx={{ maxWidth: 400, width: "100%", px: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", textAlign: "center", cursor: "pointer" }}
            onClick={() => navigate("/auth/login")}
          >
            ← Back to login
          </Typography>
        </Box>
      ) : (
        <>
          <CheckCircle size={48} color="#22c55e" />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Signed in successfully
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Redirecting to role selection…
          </Typography>
          <CircularProgress size={20} sx={{ mt: 1 }} />
        </>
      )}
    </Box>
  );
}
