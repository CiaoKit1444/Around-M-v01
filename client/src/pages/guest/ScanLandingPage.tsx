/**
 * ScanLandingPage — The first page guests see after scanning a QR code.
 *
 * Flow: Guest scans QR → lands here → checks QR status via API →
 *   PUBLIC: creates session → redirects to service menu
 *   RESTRICTED: asks for stay token → validates → creates session → redirects
 *
 * Route: /guest/scan/:qrCodeId
 */
import { useState, useEffect, useCallback } from "react";
import { Box, Typography, Card, CardContent, TextField, Button, CircularProgress, Alert } from "@mui/material";
import { QrCode, CheckCircle, Lock, ArrowRight, AlertTriangle, RefreshCw } from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout, { type GuestBranding } from "@/layouts/GuestLayout";
import { qrPublicApi, guestApi } from "@/lib/api/endpoints";
import { useGuestSession } from "@/hooks/useGuestSession";
import apiClient from "@/lib/api/client";

type ScanState = "loading" | "public" | "restricted" | "error" | "expired" | "creating";

export default function ScanLandingPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ qrCodeId: string }>();
  const [state, setState] = useState<ScanState>("loading");
  const [stayToken, setStayToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const { session: existingSession, saveSession } = useGuestSession();
  const [branding, setBranding] = useState<GuestBranding | undefined>(undefined);

  // If guest already has a valid session for this QR code, redirect directly to menu
  useEffect(() => {
    if (existingSession?.qr_code_id === params.qrCodeId && existingSession.status === "active") {
      navigate(`/guest/menu/${existingSession.session_id}`, { replace: true });
    }
  }, [existingSession, params.qrCodeId, navigate]);

  // Check QR status on mount
  useEffect(() => {
    if (!params.qrCodeId) {
      setState("error");
      setErrorMessage("No QR code ID provided.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const status = await qrPublicApi.getStatus(params.qrCodeId);
        if (cancelled) return;

        setPropertyName(status.property_name || "");
        setRoomNumber(status.room_number || "");
        // Fetch branding config for this property
        const propertyId = (status as any).property_id;
        if (propertyId) {
          apiClient.get(`public/guest/properties/${propertyId}/branding`)
            .json<GuestBranding>()
            .then(setBranding)
            .catch(() => { /* use defaults */ });
        }

        if (status.status !== "active") {
          setState("expired");
          return;
        }

        if (status.access_type === "restricted") {
          setState("restricted");
        } else {
          setState("public");
        }
      } catch (err: any) {
        if (cancelled) return;
        const msg = err?.response?.status === 404
          ? "This QR code was not found. It may have been removed."
          : "Something went wrong verifying this QR code.";
        setErrorMessage(msg);
        setState("error");
      }
    })();
    return () => { cancelled = true; };
  }, [params.qrCodeId]);

  // Create session and navigate to menu
  const createSessionAndGo = useCallback(async (token?: string) => {
    setState("creating");
    try {
      const session = await guestApi.createSession({
        qr_code_id: params.qrCodeId!,
        ...(token ? { stay_token: token } : {}),
      });
      // Persist session across page refreshes using the hook
      saveSession({
        session_id: session.session_id,
        qr_code_id: params.qrCodeId!,
        property_id: session.property_id || "",
        property_name: propertyName,
        room_number: roomNumber,
        status: session.status || "active",
        created_at: session.created_at || new Date().toISOString(),
        expires_at: session.expires_at,
      });
      navigate(`/guest/menu/${session.session_id}`);
    } catch (err: any) {
      const detail = err?.response?.status === 422
        ? "Invalid QR code or token."
        : err?.response?.status === 403
          ? "Access denied. Please check your stay token."
          : "Could not start your session. Please try again.";
      setErrorMessage(detail);
      setState("error");
    }
  }, [params.qrCodeId, navigate]);

  const handlePublicContinue = () => createSessionAndGo();

  const handleTokenSubmit = async () => {
    if (!stayToken.trim()) {
      setTokenError("Please enter your stay token");
      return;
    }
    if (stayToken.length < 4) {
      setTokenError("Token is too short");
      return;
    }
    setTokenError("");

    // Validate token first
    try {
      const result = await qrPublicApi.validateToken({
        qr_code_id: params.qrCodeId!,
        stay_token: stayToken.trim(),
      });
      if (!result.valid) {
        setTokenError("Invalid stay token. Please check and try again.");
        return;
      }
    } catch {
      setTokenError("Could not verify token. Please try again.");
      return;
    }

    // Token valid — create session
    await createSessionAndGo(stayToken.trim());
  };

  return (
    <GuestLayout propertyName={propertyName || "Peppr Around"} branding={branding}>
      {/* Loading — skeleton shimmer instead of blank spinner */}
      {(state === "loading" || state === "creating") && (
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2.5, py: 4 }}>
          <Box sx={{
            width: 72, height: 72, borderRadius: "50%",
            background: "linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.4s infinite",
            "@keyframes shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
          }} />
          <Box sx={{ width: "100%", maxWidth: 280, display: "flex", flexDirection: "column", gap: 1 }}>
            {["80%", "60%", "70%"].map((w, i) => (
              <Box key={i} sx={{
                height: 14, borderRadius: 1, width: w, mx: "auto",
                background: "linear-gradient(90deg, #e0e0e0 25%, #f5f5f5 50%, #e0e0e0 75%)",
                backgroundSize: "200% 100%",
                animation: `shimmer 1.4s infinite ${i * 0.15}s`,
              }} />
            ))}
          </Box>
          <Typography variant="caption" sx={{ color: "#9e9e9e", mt: 1 }}>
            {state === "creating" ? "Starting your session..." : "Verifying your QR code..."}
          </Typography>
          {/* Skeleton service cards */}
          <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 1.5, mt: 1 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{
                display: "flex", alignItems: "center", gap: 1.5, p: 2,
                borderRadius: 2, border: "1px solid #f0f0f0",
                background: "linear-gradient(90deg, #fafafa 25%, #f0f0f0 50%, #fafafa 75%)",
                backgroundSize: "200% 100%",
                animation: `shimmer 1.4s infinite ${i * 0.1}s`,
              }}>
                <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "#e8e8e8", flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ height: 12, borderRadius: 1, bgcolor: "#e0e0e0", width: "60%", mb: 0.75 }} />
                  <Box sx={{ height: 10, borderRadius: 1, bgcolor: "#ebebeb", width: "80%" }} />
                </Box>
              </Box>
            ))}
          </Box>
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
              {roomNumber ? `Room ${roomNumber}` : ""}{roomNumber && propertyName ? " · " : ""}{propertyName}
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
              {roomNumber ? `Room ${roomNumber}` : ""}{roomNumber && propertyName ? " · " : ""}{propertyName}
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

      {/* Expired */}
      {state === "expired" && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Box sx={{ width: 64, height: 64, borderRadius: "50%", bgcolor: "#FEF3C7", mx: "auto", mb: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={32} color="#D97706" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#171717", mb: 1 }}>
            QR Code Inactive
          </Typography>
          <Alert severity="warning" sx={{ borderRadius: 1.5, mb: 2, textAlign: "left" }}>
            This QR code has expired or is no longer active. Please contact the front desk for assistance.
          </Alert>
        </Box>
      )}

      {/* Error */}
      {state === "error" && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2, textAlign: "left" }}>
            {errorMessage || "Something went wrong. Please try scanning the QR code again."}
          </Alert>
          <Button
            variant="outlined" size="small"
            startIcon={<RefreshCw size={14} />}
            onClick={() => window.location.reload()}
            sx={{ textTransform: "none", borderColor: "#D4D4D4", color: "#404040" }}
          >
            Try Again
          </Button>
        </Box>
      )}
    </GuestLayout>
  );
}
