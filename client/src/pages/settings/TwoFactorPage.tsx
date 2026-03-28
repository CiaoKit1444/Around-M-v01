/**
 * TwoFactorPage — Two-Factor Authentication setup.
 *
 * Fully wired to tRPC backend procedures:
 *   - twoFa.status              → check if 2FA is enabled
 *   - twoFa.setupInit           → generate secret + QR code (server-side)
 *   - twoFa.setupVerifyAndEnable → verify TOTP code and enable 2FA, returns backup codes
 *   - twoFa.disable             → disable 2FA (requires password confirmation)
 *   - twoFa.regenerateBackupCodes → regenerate backup codes (requires TOTP)
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
} from "@mui/material";
import {
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Key,
  CheckCircle,
  RefreshCw,
  Copy,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import { trpc } from "@/lib/trpc";

const STEPS = ["Install Authenticator", "Scan QR Code", "Verify Code"];

export default function TwoFactorPage() {
  const utils = trpc.useUtils();

  // Status
  const { data: statusData, isLoading: statusLoading } = trpc.twoFa.status.useQuery();
  const isEnabled = statusData?.enabled ?? false;

  // Setup flow state
  const [activeStep, setActiveStep] = useState(0);
  const [setupData, setSetupData] = useState<{ secret: string; qrDataUrl: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [setupError, setSetupError] = useState("");

  // Disable flow state
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableError, setDisableError] = useState("");

  // Regenerate backup codes state
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerateCode, setRegenerateCode] = useState("");
  const [regenerateError, setRegenerateError] = useState("");
  const [newBackupCodes, setNewBackupCodes] = useState<string[] | null>(null);

  // tRPC mutations
  const setupInit = trpc.twoFa.setupInit.useMutation({
    onSuccess: (data) => {
      setSetupData({ secret: data.secret, qrDataUrl: data.qrDataUrl });
      setActiveStep(1);
      setSetupError("");
    },
    onError: (err) => setSetupError(err.message),
  });

  const setupVerify = trpc.twoFa.setupVerifyAndEnable.useMutation({
    onSuccess: (data) => {
      setBackupCodes(data.backupCodes);
      setActiveStep(2);
      utils.twoFa.status.invalidate();
      toast.success("Two-factor authentication enabled!");
    },
    onError: (err) => setSetupError(err.message),
  });

  const disable = trpc.twoFa.disable.useMutation({
    onSuccess: () => {
      setShowDisable(false);
      setDisablePassword("");
      setDisableError("");
      setSetupData(null);
      setBackupCodes(null);
      setActiveStep(0);
      utils.twoFa.status.invalidate();
      toast.success("Two-factor authentication disabled.");
    },
    onError: (err) => setDisableError(err.message),
  });

  const regenerate = trpc.twoFa.regenerateBackupCodes.useMutation({
    onSuccess: (data) => {
      setNewBackupCodes(data.backupCodes);
      setRegenerateCode("");
      setRegenerateError("");
      toast.success("Backup codes regenerated.");
    },
    onError: (err) => setRegenerateError(err.message),
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  if (statusLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <PageHeader title="Two-Factor Authentication" subtitle="Loading..." />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 720 }}>
      <PageHeader
        title="Two-Factor Authentication"
        subtitle="Add an extra layer of security to your account using a TOTP authenticator app."
      />

      {/* Status Banner */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          {isEnabled ? (
            <ShieldCheck size={40} color="#22c55e" />
          ) : (
            <Shield size={40} color="#94a3b8" />
          )}
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {isEnabled ? "2FA is Enabled" : "2FA is Disabled"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {isEnabled
                ? "Your account is protected with TOTP-based two-factor authentication."
                : "Enable 2FA to protect your account with a time-based one-time password."}
            </Typography>
          </Box>
          <Chip
            label={isEnabled ? "Active" : "Inactive"}
            color={isEnabled ? "success" : "default"}
            size="small"
          />
        </CardContent>
      </Card>

      {/* Setup Flow (when not enabled and setup not complete) */}
      {!isEnabled && backupCodes === null && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Step 0: Install authenticator */}
            {activeStep === 0 && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Install an authenticator app on your phone. We recommend:
                </Typography>
                <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                  {["Google Authenticator", "Authy", "Microsoft Authenticator", "1Password"].map(
                    (app) => (
                      <Chip key={app} icon={<Smartphone size={14} />} label={app} variant="outlined" />
                    )
                  )}
                </Box>
                {setupError && <Alert severity="error" sx={{ mb: 2 }}>{setupError}</Alert>}
                <Button
                  variant="contained"
                  onClick={() => setupInit.mutate()}
                  disabled={setupInit.isPending}
                  startIcon={<Shield size={16} />}
                >
                  {setupInit.isPending ? "Generating..." : "Set Up 2FA"}
                </Button>
              </Box>
            )}

            {/* Step 1: Scan QR code */}
            {activeStep === 1 && setupData && (
              <Box>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Scan this QR code with your authenticator app:
                </Typography>
                <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start", flexWrap: "wrap", mb: 3 }}>
                  <Box
                    component="img"
                    src={setupData.qrDataUrl}
                    alt="TOTP QR Code"
                    sx={{ width: 180, height: 180, border: "1px solid", borderColor: "divider", borderRadius: 1 }}
                  />
                  <Box>
                    <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                      Or enter this key manually:
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontFamily: "monospace",
                          bgcolor: "action.hover",
                          px: 1.5,
                          py: 0.5,
                          borderRadius: 1,
                          letterSpacing: 2,
                          fontSize: "0.875rem",
                        }}
                      >
                        {setupData.secret.match(/.{1,4}/g)?.join(" ")}
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<Copy size={12} />}
                        onClick={() => copyToClipboard(setupData.secret)}
                      >
                        Copy
                      </Button>
                    </Box>
                  </Box>
                </Box>
                {setupError && <Alert severity="error" sx={{ mb: 2 }}>{setupError}</Alert>}
                <Typography variant="body2" sx={{ mb: 1.5 }}>
                  Once scanned, enter the 6-digit code from your app:
                </Typography>
                <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                  <TextField
                    label="6-digit code"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputProps={{ maxLength: 6, inputMode: "numeric" }}
                    sx={{ width: 160 }}
                  />
                  <Button
                    variant="contained"
                    onClick={() => setupVerify.mutate({ code: verifyCode })}
                    disabled={verifyCode.length !== 6 || setupVerify.isPending}
                    startIcon={<CheckCircle size={16} />}
                  >
                    {setupVerify.isPending ? "Verifying..." : "Verify & Enable"}
                  </Button>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Backup Codes shown after successful setup */}
      {backupCodes && (
        <Card sx={{ mb: 3, border: "1px solid", borderColor: "warning.main" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Key size={20} color="#f59e0b" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Save Your Backup Codes
              </Typography>
            </Box>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Store these codes in a safe place. Each code can only be used once. You will not be
              able to see them again.
            </Alert>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                mb: 2,
                fontFamily: "monospace",
              }}
            >
              {backupCodes.map((code) => (
                <Typography
                  key={code}
                  sx={{
                    bgcolor: "action.hover",
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1,
                    textAlign: "center",
                    fontSize: "0.875rem",
                    letterSpacing: 1,
                  }}
                >
                  {code}
                </Typography>
              ))}
            </Box>
            <Button
              variant="outlined"
              startIcon={<Copy size={14} />}
              onClick={() => copyToClipboard(backupCodes.join("\n"))}
            >
              Copy All Codes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Management Actions when 2FA is enabled */}
      {isEnabled && (
        <>
          {/* Regenerate backup codes */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Backup Codes
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Regenerate your backup codes if you have lost them or used them all.
              </Typography>
              {!showRegenerate ? (
                <Button
                  variant="outlined"
                  startIcon={<RefreshCw size={14} />}
                  onClick={() => setShowRegenerate(true)}
                >
                  Regenerate Backup Codes
                </Button>
              ) : (
                <Box>
                  {regenerateError && <Alert severity="error" sx={{ mb: 2 }}>{regenerateError}</Alert>}
                  {newBackupCodes ? (
                    <>
                      <Alert severity="success" sx={{ mb: 2 }}>New backup codes generated. Save them now.</Alert>
                      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, mb: 2, fontFamily: "monospace" }}>
                        {newBackupCodes.map((code) => (
                          <Typography key={code} sx={{ bgcolor: "action.hover", px: 1.5, py: 0.75, borderRadius: 1, textAlign: "center", fontSize: "0.875rem", letterSpacing: 1 }}>
                            {code}
                          </Typography>
                        ))}
                      </Box>
                      <Button variant="outlined" startIcon={<Copy size={14} />} onClick={() => copyToClipboard(newBackupCodes.join("\n"))}>
                        Copy All
                      </Button>
                    </>
                  ) : (
                    <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                      <TextField
                        label="Current TOTP code"
                        value={regenerateCode}
                        onChange={(e) => setRegenerateCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        inputProps={{ maxLength: 6, inputMode: "numeric" }}
                        sx={{ width: 160 }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => regenerate.mutate({ code: regenerateCode })}
                        disabled={regenerateCode.length !== 6 || regenerate.isPending}
                      >
                        {regenerate.isPending ? "Regenerating..." : "Confirm"}
                      </Button>
                      <Button variant="text" onClick={() => { setShowRegenerate(false); setRegenerateCode(""); setRegenerateError(""); }}>
                        Cancel
                      </Button>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>

          <Divider sx={{ mb: 3 }} />

          {/* Disable 2FA */}
          <Card sx={{ border: "1px solid", borderColor: "error.light" }}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <ShieldOff size={20} color="#ef4444" />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "error.main" }}>
                  Disable Two-Factor Authentication
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Disabling 2FA will make your account less secure. You will need to confirm your
                password.
              </Typography>
              {!showDisable ? (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<ShieldOff size={14} />}
                  onClick={() => setShowDisable(true)}
                >
                  Disable 2FA
                </Button>
              ) : (
                <Box>
                  {disableError && <Alert severity="error" sx={{ mb: 2 }}>{disableError}</Alert>}
                  <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
                    <TextField
                      label="Confirm password"
                      type="password"
                      value={disablePassword}
                      onChange={(e) => setDisablePassword(e.target.value)}
                      sx={{ width: 240 }}
                    />
                    <Button
                      variant="contained"
                      color="error"
                      onClick={() => disable.mutate({ password: disablePassword })}
                      disabled={!disablePassword || disable.isPending}
                    >
                      {disable.isPending ? "Disabling..." : "Confirm Disable"}
                    </Button>
                    <Button variant="text" onClick={() => { setShowDisable(false); setDisablePassword(""); setDisableError(""); }}>
                      Cancel
                    </Button>
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
