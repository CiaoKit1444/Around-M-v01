/**
 * ScanLandingPage — The first page guests see after scanning a QR code.
 *
 * Flow: Guest scans QR → lands here → session is created → redirected to service menu.
 * If QR is restricted, guest must enter a stay token first.
 *
 * Route: /guest/scan/:qrCodeId
 */
import { useState, useEffect } from "react";
import { Box, Typography, Card, CardContent, TextField, Button, CircularProgress, Alert } from "@mui/material";
import { QrCode, CheckCircle, Lock, ArrowRight } from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";

type ScanState = "loading" | "public" | "restricted" | "error" | "expired" | "ready";

export default function ScanLandingPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ qrCodeId: string }>();
  const [state, setState] = useState<ScanState>("loading");
  const [stayToken, setStayToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [propertyName] = useState("Grand Hyatt Bangkok");
  const [roomNumber] = useState("101");

  useEffect(() => {
    // Simulate API call to check QR status
    const timer = setTimeout(() => {
      // Demo: randomly show public or restricted
      const isPublic = (params.qrCodeId?.charCodeAt(0) || 0) % 2 === 0;
      setState(isPublic ? "public" : "restricted");
    }, 1200);
    return () => clearTimeout(timer);
  }, [params.qrCodeId]);

  const handlePublicContinue = () => {
    navigate(`/guest/menu/${params.qrCodeId}`);
  };

  const handleTokenSubmit = () => {
    if (!stayToken.trim()) {
      setTokenError("Please enter your stay token");
      return;
    }
    if (stayToken.length < 6) {
      setTokenError("Invalid token format");
      return;
    }
    setTokenError("");
    navigate(`/guest/menu/${params.qrCodeId}`);
  };

  return (
    <GuestLayout propertyName={propertyName}>
      {/* Loading */}
      {state === "loading" && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={40} thickness={3} sx={{ color: "#404040", mb: 2 }} />
          <Typography variant="body1" sx={{ color: "#737373", fontWeight: 500 }}>
            Verifying your QR code...
          </Typography>
        </Box>
      )}

      {/* Public QR — Direct Access */}
      {state === "public" && (
        <Box>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#F0FDF4", mx: "auto", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={32} color="#16A34A" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
              Welcome
            </Typography>
            <Typography variant="body2" sx={{ color: "#737373" }}>
              Room {roomNumber} &middot; {propertyName}
            </Typography>
          </Box>

          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", bgcolor: "#FFFFFF" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body1" sx={{ color: "#525252", mb: 2, lineHeight: 1.6 }}>
                Browse available services for your room. You can request spa treatments, room service, transportation, and more — all from your phone.
              </Typography>
              <Button
                variant="contained" fullWidth size="large"
                onClick={handlePublicContinue}
                endIcon={<ArrowRight size={18} />}
                sx={{
                  bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1.5, py: 1.5,
                  textTransform: "none", fontWeight: 600, fontSize: "0.9375rem",
                  "&:hover": { bgcolor: "#262626" },
                }}
              >
                View Services
              </Button>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Restricted QR — Requires Stay Token */}
      {state === "restricted" && (
        <Box>
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#FEF3C7", mx: "auto", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Lock size={32} color="#D97706" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
              Verification Required
            </Typography>
            <Typography variant="body2" sx={{ color: "#737373" }}>
              Room {roomNumber} &middot; {propertyName}
            </Typography>
          </Box>

          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
            <CardContent sx={{ p: 3 }}>
              <Typography variant="body2" sx={{ color: "#737373", mb: 2 }}>
                This room requires a stay token for access. You received your token at check-in.
              </Typography>
              <TextField
                label="Stay Token" fullWidth size="small"
                placeholder="e.g., stk_a1b2c3d4"
                value={stayToken} onChange={(e) => { setStayToken(e.target.value); setTokenError(""); }}
                error={!!tokenError} helperText={tokenError}
                sx={{ mb: 2, "& .MuiInputBase-root": { fontFamily: '"Geist Mono", monospace' } }}
              />
              <Button
                variant="contained" fullWidth size="large"
                onClick={handleTokenSubmit}
                endIcon={<ArrowRight size={18} />}
                sx={{
                  bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1.5, py: 1.5,
                  textTransform: "none", fontWeight: 600, fontSize: "0.9375rem",
                  "&:hover": { bgcolor: "#262626" },
                }}
              >
                Verify & Continue
              </Button>
            </CardContent>
          </Card>

          <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2, color: "#A3A3A3" }}>
            Don't have a token? Please contact the front desk.
          </Typography>
        </Box>
      )}

      {/* Expired / Error */}
      {state === "expired" && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Alert severity="warning" sx={{ borderRadius: 1.5, mb: 2 }}>
            This QR code has expired or is no longer active. Please contact the front desk for assistance.
          </Alert>
        </Box>
      )}

      {state === "error" && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>
            Something went wrong. Please try scanning the QR code again.
          </Alert>
        </Box>
      )}
    </GuestLayout>
  );
}
