/**
 * LoginPage — Authentication entry point.
 *
 * Design: Full-screen split layout. Left: dark geometric background.
 * Right: clean white login form. Fuse-inspired but simplified.
 */
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

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
      // AdminGuard will redirect back here if /role-switch is skipped somehow.
      localStorage.removeItem("peppr_active_role");
      navigate("/role-switch");
    } catch (err: any) {
      setError(err?.message || "Invalid credentials. Please try again.");
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

          {/* Title */}
          <Typography variant="h3" sx={{ mb: 0.5 }}>
            Welcome back
          </Typography>
          <Typography variant="body1" sx={{ color: "text.secondary", mb: 4 }}>
            Sign in to your account to continue
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
              sx={{ mb: 2 }}
              autoComplete="email"
              autoFocus
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
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
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={isLoading || !email || !password}
              startIcon={
                isLoading ? <CircularProgress size={16} color="inherit" /> : <LogIn size={16} />
              }
              sx={{ mb: 2 }}
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
