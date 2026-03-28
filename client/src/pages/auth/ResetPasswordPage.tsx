/**
 * ResetPasswordPage — Set a new password using a reset token.
 *
 * Flow:
 *   1. User clicks the reset link (from admin) → /auth/reset-password?token=...
 *   2. User enters new password + confirmation
 *   3. POST /api/v1/auth/reset-password with { token, new_password }
 *   4. On success, redirect to login page
 *
 * Security:
 *   - Token is a short-lived JWT (15 min for self-service, 1 hr for admin-generated)
 *   - Single-use: backend invalidates the token hash after successful reset
 *   - Password must be at least 8 characters
 */
import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  LinearProgress,
} from "@mui/material";
import {
  Eye,
  EyeOff,
  Lock,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import axios from "axios";

/** Simple password strength meter */
function getPasswordStrength(pw: string): {
  score: number;
  label: string;
  color: string;
} {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 20, label: "Weak", color: "#f44336" };
  if (score <= 2) return { score: 40, label: "Fair", color: "#ff9800" };
  if (score <= 3) return { score: 60, label: "Good", color: "#ffc107" };
  if (score <= 4) return { score: 80, label: "Strong", color: "#4caf50" };
  return { score: 100, label: "Very strong", color: "#2e7d32" };
}

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Validate token presence
  const [tokenMissing, setTokenMissing] = useState(false);
  useEffect(() => {
    if (!token) setTokenMissing(true);
  }, [token]);

  const strength = getPasswordStrength(password);
  const passwordsMatch = password === confirmPassword;
  const canSubmit =
    password.length >= 8 &&
    passwordsMatch &&
    confirmPassword.length > 0 &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!passwordsMatch) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await axios.post("/api/v1/auth/reset-password", {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 429) {
        setError(
          detail || "Too many attempts. Please wait a moment and try again."
        );
      } else {
        setError(detail || "Failed to reset password. The link may have expired.");
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
            <picture>
                <source
                  srcSet="https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/peppr-logo-white_60dd5e67.svg"
                  media="(prefers-color-scheme: dark)"
                />
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/peppr-logo_3633e33d.svg"
                  alt="Peppr Around"
                  style={{ width: 40, height: 40, borderRadius: 4 }}
                />
              </picture>
            <Box>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700, lineHeight: 1.2 }}
              >
                Peppr Around
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Admin Console
              </Typography>
            </Box>
          </Box>

          {tokenMissing ? (
            /* ── No Token State ─────────────────────────────────────── */
            <Box sx={{ textAlign: "center" }}>
              <AlertTriangle
                size={48}
                style={{ color: "#ff9800", marginBottom: 16 }}
              />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                Invalid reset link
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 3 }}
              >
                This password reset link is invalid or missing. Please request a
                new one.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ArrowLeft size={16} />}
                onClick={() => navigate("/admin/forgot-password")}
                sx={{ textTransform: "none" }}
              >
                Request new reset link
              </Button>
            </Box>
          ) : success ? (
            /* ── Success State ──────────────────────────────────────── */
            <Box sx={{ textAlign: "center" }}>
              <CheckCircle
                size={48}
                style={{ color: "#4caf50", marginBottom: 16 }}
              />
              <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                Password reset successful
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 3 }}
              >
                Your password has been updated. You can now sign in with your
                new password.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Lock size={16} />}
                onClick={() => navigate("/admin/login")}
                sx={{ textTransform: "none" }}
              >
                Sign in
              </Button>
            </Box>
          ) : (
            /* ── Form State ─────────────────────────────────────────── */
            <>
              <Typography variant="h4" sx={{ mb: 0.5 }}>
                Set new password
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", mb: 4, lineHeight: 1.6 }}
              >
                Choose a strong password for your account. It must be at least 8
                characters long.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, fontSize: "0.8125rem" }}>
                  {error}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  label="New password"
                  type={showPassword ? "text" : "password"}
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  sx={{ mb: 1 }}
                  autoComplete="new-password"
                  autoFocus
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                {/* Password strength meter */}
                {password.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <LinearProgress
                      variant="determinate"
                      value={strength.score}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: "action.hover",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: strength.color,
                          borderRadius: 2,
                        },
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: strength.color, mt: 0.5, display: "block" }}
                    >
                      {strength.label}
                    </Typography>
                  </Box>
                )}

                <TextField
                  label="Confirm new password"
                  type={showConfirm ? "text" : "password"}
                  fullWidth
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  sx={{ mb: 3 }}
                  autoComplete="new-password"
                  error={
                    confirmPassword.length > 0 && !passwordsMatch
                  }
                  helperText={
                    confirmPassword.length > 0 && !passwordsMatch
                      ? "Passwords do not match"
                      : ""
                  }
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            size="small"
                            onClick={() => setShowConfirm(!showConfirm)}
                            edge="end"
                          >
                            {showConfirm ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={!canSubmit}
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <Lock size={16} />
                    )
                  }
                  sx={{ mb: 2 }}
                >
                  {loading ? "Resetting..." : "Reset password"}
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
