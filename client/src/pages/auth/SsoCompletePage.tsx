/**
 * SsoCompletePage — OAuth SSO handoff landing page.
 *
 * Flow:
 *   1. Express OAuth callback POSTs to FastAPI /v1/auth/sso-login
 *   2. On success, redirects here with ?access_token=...&refresh_token=...
 *   3. This page stores the tokens, fetches the user profile (/v1/auth/me),
 *      stores pa_user so AuthContext picks it up, then redirects to /role-switch.
 *
 * Security note: tokens are in the URL query string only for the brief moment
 * it takes this page to load. The URL is immediately replaced via
 * history.replaceState to prevent tokens appearing in browser history.
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Box, CircularProgress, Typography, Alert } from "@mui/material";
import { CheckCircle } from "lucide-react";
import ky from "ky";

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

    // Store tokens first
    localStorage.setItem("pa_access_token", accessToken);
    localStorage.setItem("pa_refresh_token", refreshToken);

    // Clear any stale active role so the user is taken to role selection
    localStorage.removeItem("peppr_active_role");

    // Fetch user profile so AuthContext.isAuthenticated becomes true immediately
    // (AuthContext reads pa_user from localStorage on mount; we must populate it
    //  before navigating so AdminGuard doesn't bounce us back to /auth/login)
    ky.get("/api/v1/auth/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 8000,
    })
      .json<any>()
      .then((resp) => {
        // FastAPI /v1/auth/me returns { success: true, data: { ... } }
        const profile = resp?.data ?? resp;
        const parts = (profile.full_name || "").split(" ");
        const appUser = {
          id: profile.user_id,
          email: profile.email,
          first_name: parts[0] || "",
          last_name: parts.slice(1).join(" ") || "",
          full_name: profile.full_name,
          role: profile.role || (profile.roles && profile.roles[0]) || "user",
          status: profile.status || "ACTIVE",
          partner_id: profile.partner_id ?? null,
          property_id: profile.property_id ?? null,
        };
        localStorage.setItem("pa_user", JSON.stringify(appUser));

        // Small delay so the success state is visible, then reload to /role-switch
        // We use window.location.href instead of navigate() so AuthProvider
        // re-mounts fresh and reads the newly stored pa_user from localStorage.
        setTimeout(() => {
          window.location.href = "/role-switch";
        }, 600);
      })
      .catch((err) => {
        console.error("[SSO] Failed to fetch user profile:", err);
        setError("Signed in but could not load your profile. Please try again.");
        // Clean up on failure
        localStorage.removeItem("pa_access_token");
        localStorage.removeItem("pa_refresh_token");
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
            onClick={() => (window.location.href = "/auth/login")}
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
            Loading your profile…
          </Typography>
          <CircularProgress size={20} sx={{ mt: 1 }} />
        </>
      )}
    </Box>
  );
}
