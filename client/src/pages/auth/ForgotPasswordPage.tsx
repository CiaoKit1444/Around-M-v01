/**
 * ForgotPasswordPage — Self-service password reset request.
 *
 * Flow:
 *   1. User enters their email address
 *   2. POST /api/v1/auth/forgot-password
 *   3. Backend generates a reset token, notifies the project owner (admin)
 *   4. User sees a confirmation message instructing them to contact their admin
 *
 * Design: Same split layout as LoginPage for visual consistency.
 */
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import axios from "axios";

export default function ForgotPasswordPage() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await axios.post("/api/v1/auth/forgot-password", {
        email: email.trim().toLowerCase(),
        origin: window.location.origin,
      });
      setSubmitted(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429) {
        setError(detail || "Too many requests. Please wait a moment and try again.");
      } else {
        setError(detail || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* Left: Background */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          flex: 1,
          backgroundImage:
            "url(https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/pa-login-bg-N7sesracCLcbJZMSzzHDsH.webp)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          alignItems: "flex-end",
          p: 5,
        }}
      >
        <Box>
          <Typography
            variant="h2"
            sx={{ color: "rgba(255,255,255,0.9)", fontWeight: 700, mb: 1 }}
          >
            Peppr Around
          </Typography>
          <Typography
            variant="body1"
            sx={{ color: "rgba(255,255,255,0.6)", maxWidth: 400 }}
          >
            Service experience platform — manage partners, properties, and guest
            services from a single control plane.
          </Typography>
        </Box>
      </Box>

      {/* Right: Form */}
      <Box
        sx={{
          width: { xs: "100%", md: 480 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          p: 4,
          bgcolor: "background.paper",
        }}
      >
        <Box sx={{ width: "100%", maxWidth: 360 }}>
          {/* Brand */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 5 }}>
            <Box
              component="img"
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/pa-brand-icon-nei7rkLNRiRHEnAFboJMs8.webp"
              alt="PA"
              sx={{ width: 40, height: 40, borderRadius: 1 }}
            />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Peppr Around
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Admin Console
              </Typography>
            </Box>
          </Box>

          {submitted ? (
            /* ── Success State ──────────────────────────────────────── */
            <Box sx={{ textAlign: "center" }}>
              <CheckCircle
                size={48}
                style={{ color: "#4caf50", marginBottom: 16 }}
              />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                Check with your administrator
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 3, lineHeight: 1.6 }}
              >
                If an account exists for <strong>{email}</strong>, a password
                reset link has been generated and sent to your system
                administrator. Please contact them to receive the link.
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "text.disabled", display: "block", mb: 3 }}
              >
                The reset link expires in 15 minutes.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ArrowLeft size={16} />}
                onClick={() => navigate("/admin/login")}
                sx={{ textTransform: "none" }}
              >
                Back to sign in
              </Button>
            </Box>
          ) : (
            /* ── Form State ─────────────────────────────────────────── */
            <>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                Forgot password?
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6 }}
              >
                Enter your email address and we'll generate a password reset
                link. Your administrator will receive the link and can share it
                with you.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, fontSize: "0.8125rem" }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="Email address"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  sx={{ mb: 3 }}
                  autoComplete="email"
                  autoFocus
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || !email}
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Mail size={16} />
                    )
                  }
                  sx={{ mb: 2 }}
                >
                  {loading ? "Sending..." : "Request password reset"}
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  startIcon={<ArrowLeft size={16} />}
                  onClick={() => navigate("/admin/login")}
                  sx={{ textTransform: "none", color: "text.secondary" }}
                >
                  Back to sign in
                </Button>
              </Box>
            </>
          )}

          <Typography
            variant="body2"
            sx={{ color: "text.disabled", textAlign: "center", mt: 4 }}
          >
            Peppr Around v2.0 &middot; Admin Console
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
