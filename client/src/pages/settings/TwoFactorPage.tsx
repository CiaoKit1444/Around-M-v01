/**
 * TwoFactorPage — Two-Factor Authentication setup.
 *
 * Provides TOTP-based 2FA setup with QR code display.
 * Currently UI-only (placeholder for future FastAPI backend integration).
 */
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Shield, ShieldCheck, ShieldOff, Smartphone, Key, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

const STEPS = ["Install Authenticator", "Scan QR Code", "Verify Code"];

// Generate a mock TOTP secret for demo purposes
function generateMockSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  return Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// Generate a TOTP QR code URL (otpauth:// format)
function generateOtpAuthUrl(secret: string, email: string, issuer = "Peppr Around"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export default function TwoFactorPage() {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [secret] = useState(() => generateMockSecret());
  const [verificationCode, setVerificationCode] = useState("");
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [backupCodes] = useState(() =>
    Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase() + "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase()
    )
  );

  const email = user?.email ?? "admin@peppr.com";
  const otpAuthUrl = generateOtpAuthUrl(secret, email);

  // Generate QR code using Google Charts API (no library needed)
  const qrCodeUrl = `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`;

  const handleVerify = () => {
    // In production, this would call FastAPI to verify the TOTP code
    if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
      toast.error("Please enter a valid 6-digit code");
      return;
    }
    // Mock verification — accept any 6-digit code for demo
    toast.success("2FA enabled successfully!");
    setIs2FAEnabled(true);
    setActiveStep(3);
  };

  const handleDisable = () => {
    toast.info("2FA disabled. Your account is less secure.");
    setIs2FAEnabled(false);
    setActiveStep(0);
    setVerificationCode("");
  };

  if (is2FAEnabled) {
    return (
      <Box>
        <PageHeader
          title="Two-Factor Authentication"
          subtitle="Manage your account security settings"
        />
        <Card sx={{ maxWidth: 600 }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
              <ShieldCheck size={40} color="#22c55e" />
              <Box>
                <Typography variant="h6" fontWeight={600}>2FA is Enabled</Typography>
                <Chip label="Active" color="success" size="small" sx={{ mt: 0.5 }} />
              </Box>
            </Box>
            <Alert severity="success" sx={{ mb: 3 }}>
              Your account is protected with two-factor authentication. Each login requires your authenticator app.
            </Alert>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Backup Codes</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Store these backup codes in a safe place. Each can only be used once.
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1,
                p: 2,
                bgcolor: "action.hover",
                borderRadius: 1,
                fontFamily: "monospace",
                fontSize: "0.85rem",
                mb: 3,
              }}
            >
              {backupCodes.map(code => (
                <Typography key={code} variant="body2" fontFamily="monospace">{code}</Typography>
              ))}
            </Box>
            <Divider sx={{ my: 2 }} />
            <Button
              variant="outlined"
              color="error"
              startIcon={<ShieldOff size={16} />}
              onClick={handleDisable}
            >
              Disable 2FA
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Two-Factor Authentication"
        subtitle="Add an extra layer of security to your account"
      />

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
        {/* Setup wizard */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
              <Shield size={24} />
              <Typography variant="h6" fontWeight={600}>Setup 2FA</Typography>
            </Box>

            <Stepper activeStep={activeStep} orientation="vertical">
              {/* Step 1: Install app */}
              <Step>
                <StepLabel>Install Authenticator App</StepLabel>
                {activeStep === 0 && (
                  <Box sx={{ ml: 2, mt: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Install one of these authenticator apps on your phone:
                    </Typography>
                    <List dense>
                      {["Google Authenticator", "Microsoft Authenticator", "Authy", "1Password"].map(app => (
                        <ListItem key={app} sx={{ px: 0 }}>
                          <ListItemIcon sx={{ minWidth: 32 }}>
                            <Smartphone size={16} />
                          </ListItemIcon>
                          <ListItemText primary={app} primaryTypographyProps={{ variant: "body2" }} />
                        </ListItem>
                      ))}
                    </List>
                    <Button variant="contained" size="small" onClick={() => setActiveStep(1)} sx={{ mt: 1 }}>
                      I have an app installed
                    </Button>
                  </Box>
                )}
              </Step>

              {/* Step 2: Scan QR code */}
              <Step>
                <StepLabel>Scan QR Code</StepLabel>
                {activeStep === 1 && (
                  <Box sx={{ ml: 2, mt: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Scan this QR code with your authenticator app:
                    </Typography>
                    <Box
                      component="img"
                      src={qrCodeUrl}
                      alt="TOTP QR Code"
                      sx={{ width: 180, height: 180, display: "block", mb: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1 }}>
                      Or enter this key manually:
                    </Typography>
                    <Typography
                      variant="body2"
                      fontFamily="monospace"
                      sx={{ bgcolor: "action.hover", p: 1, borderRadius: 1, letterSpacing: 2, mb: 2 }}
                    >
                      {secret.match(/.{1,4}/g)?.join(" ")}
                    </Typography>
                    <Button variant="contained" size="small" onClick={() => setActiveStep(2)}>
                      QR Code scanned
                    </Button>
                  </Box>
                )}
              </Step>

              {/* Step 3: Verify code */}
              <Step>
                <StepLabel>Verify Code</StepLabel>
                {activeStep === 2 && (
                  <Box sx={{ ml: 2, mt: 1, mb: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Enter the 6-digit code from your authenticator app:
                    </Typography>
                    <TextField
                      value={verificationCode}
                      onChange={e => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      inputProps={{ maxLength: 6, style: { letterSpacing: 8, fontSize: "1.5rem", textAlign: "center" } }}
                      size="small"
                      sx={{ width: 160, mb: 2 }}
                    />
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button variant="contained" size="small" startIcon={<Key size={14} />} onClick={handleVerify}>
                        Enable 2FA
                      </Button>
                      <Button variant="text" size="small" onClick={() => setActiveStep(1)}>
                        Back
                      </Button>
                    </Box>
                  </Box>
                )}
              </Step>
            </Stepper>
          </CardContent>
        </Card>

        {/* Info panel */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>Why use 2FA?</Typography>
            <List dense>
              {[
                "Protects your account even if your password is compromised",
                "Required for admin-level operations in high-security environments",
                "Generates a new code every 30 seconds — impossible to reuse",
                "Works offline — no internet connection needed for the code",
              ].map((benefit, i) => (
                <ListItem key={i} sx={{ px: 0, alignItems: "flex-start" }}>
                  <ListItemIcon sx={{ minWidth: 28, mt: 0.5 }}>
                    <CheckCircle size={16} color="#22c55e" />
                  </ListItemIcon>
                  <ListItemText primary={benefit} primaryTypographyProps={{ variant: "body2" }} />
                </ListItem>
              ))}
            </List>
            <Divider sx={{ my: 2 }} />
            <Alert severity="info" icon={<Shield size={16} />}>
              <Typography variant="body2">
                <strong>Note:</strong> 2FA backend integration is coming soon. This setup flow will be fully functional once the FastAPI auth endpoints are available.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
