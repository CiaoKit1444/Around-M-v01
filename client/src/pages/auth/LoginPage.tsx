/**
 * LoginPage — Authentication entry point.
 *
 * Design: Full-screen split layout. Left: dark geometric background.
 * Right: clean white login form with Google SSO + email/password options.
 *
 * SSO Flow:
 *   1. User clicks "Continue with Google"
 *   2. Redirected to Manus OAuth portal → Google OAuth
 *   3. Express callback (/api/oauth/callback) exchanges identity for Peppr JWT
 *   4. Redirected to /auth/sso-complete which stores tokens and goes to /role-switch
 */
import { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
} from "@mui/material";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

/** Inline Google "G" logo SVG — no external dependency needed */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const { login, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(email, password);
      // Always redirect to role-switch after login so the user selects their active role.
      localStorage.removeItem("peppr_active_role");
      navigate("/admin/role-switch");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
    }
  };

  const handleGoogleSSO = () => {
    // Redirect to Manus OAuth portal which handles Google OAuth.
    // The callback at /api/oauth/callback will exchange the identity for
    // Peppr JWT tokens and redirect to /auth/sso-complete.
    window.location.href = getLoginUrl();
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
            Service experience platform — manage partners, properties, and guest services from a single control plane.
          </Typography>
        </Box>
      </Box>

      {/* Right: Login Form */}
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
              src="https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/peppr-logo_a913a03a.png"
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

          {/* Title */}
          <Typography variant="h3" sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
            Sign in to your account to continue
          </Typography>

          {/* ── Google SSO Button ─────────────────────────────────────── */}
          <Button
            variant="outlined"
            fullWidth
            size="large"
            onClick={handleGoogleSSO}
            startIcon={<GoogleIcon />}
            sx={{
              mb: 3,
              borderColor: "divider",
              color: "text.primary",
              bgcolor: "background.paper",
              fontWeight: 500,
              textTransform: "none",
              fontSize: "0.9375rem",
              "&:hover": {
                bgcolor: "action.hover",
                borderColor: "text.secondary",
              },
            }}
          >
            Continue with Google
          </Button>

          {/* ── Divider ──────────────────────────────────────────────── */}
          <Divider sx={{ mb: 3 }}>
            <Typography variant="caption" sx={{ color: "text.disabled", px: 1 }}>
              or sign in with email
            </Typography>
          </Divider>

          {/* ── Email / Password Form ─────────────────────────────────── */}
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
              sx={{ mb: 2 }}
              autoComplete="email"
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 1.5 }}
              autoComplete="current-password"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
              <Typography
                component="a"
                href="/admin/forgot-password"
                variant="body2"
                sx={{
                  color: "primary.main",
                  textDecoration: "none",
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={(e: React.MouseEvent) => {
                  e.preventDefault();
                  navigate("/admin/forgot-password");
                }}
              >
                Forgot password?
              </Typography>
            </Box>
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading || !email || !password}
              startIcon={
                isLoading ? <CircularProgress size={16} color="inherit" /> : <LogIn size={16} />
              }
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </Box>

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
