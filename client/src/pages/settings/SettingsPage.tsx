/**
 * SettingsPage — Platform settings with real property configuration via FastAPI.
 *
 * Sections:
 * 1. Property Branding (logo, colors, welcome message) — wired to API
 * 2. Guest Experience (limits, feature toggles) — wired to API
 * 3. Security & Notifications — local settings (placeholder for future API)
 */
import { useState, useEffect, useCallback } from "react";
import {
  Box, Card, CardContent, Typography, Grid, Switch, Divider, TextField,
  Button, CircularProgress, Alert, Chip, IconButton, Slider, Tooltip,
} from "@mui/material";
import PageHeader from "@/components/shared/PageHeader";
import {
  Settings, Shield, Bell, Palette, Users, Save, RefreshCw, Check,
  AlertTriangle, Sliders, MessageSquare, QrCode, ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { propertyConfigApi, propertiesApi } from "@/lib/api/endpoints";
import type { PropertyConfigResponse, PropertyConfigUpdate } from "@/lib/api/types";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const propertyId = user?.property_id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<PropertyConfigUpdate>({
    logo_url: "",
    primary_color: "#171717",
    secondary_color: "#737373",
    welcome_message: "",
    qr_validation_limit: 100,
    service_catalog_limit: 200,
    request_submission_limit: 50,
    enable_guest_cancellation: true,
    enable_alternative_proposals: false,
    enable_direct_messaging: false,
  });

  // Load current config
  useEffect(() => {
    if (!propertyId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Try to load property details which may contain config
        const property = await propertiesApi.get(propertyId);
        if (cancelled) return;
        if (property.config) {
          setConfig((prev) => ({
            ...prev,
            ...(property.config as PropertyConfigUpdate),
          }));
        }
      } catch {
        // Config might not exist yet — use defaults
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [propertyId]);

  const updateField = useCallback(<K extends keyof PropertyConfigUpdate>(key: K, value: PropertyConfigUpdate[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (!propertyId) {
      toast.error("No property assigned to your account.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await propertyConfigApi.update(propertyId, config);
      setSaved(true);
      toast.success("Settings saved successfully");
    } catch (err: any) {
      const detail = err?.response?.status === 403
        ? "You don't have permission to update settings."
        : "Failed to save settings. Please try again.";
      setError(detail);
      toast.error(detail);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader title="Settings" subtitle="Platform configuration and property preferences" />

      {!propertyId && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          No property assigned to your account. Settings shown below use default values.
          Log in with a property-linked account to manage property-specific configuration.
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>
      )}

      <Grid container spacing={2}>
        {/* ─── Property Branding ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Palette size={16} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Branding</Typography>
                <Chip label="Property" size="small" sx={{ ml: "auto", height: 20, fontSize: "0.625rem" }} />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <TextField
                  size="small" fullWidth label="Logo URL"
                  placeholder="https://cdn.example.com/logo.png"
                  value={config.logo_url || ""}
                  onChange={(e) => updateField("logo_url", e.target.value || null)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
                />

                <Box sx={{ display: "flex", gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: "#737373", mb: 0.5, display: "block" }}>Primary Color</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <input
                        type="color"
                        value={config.primary_color || "#171717"}
                        onChange={(e) => updateField("primary_color", e.target.value)}
                        style={{ width: 36, height: 36, border: "1px solid #E5E5E5", borderRadius: 6, cursor: "pointer", padding: 0 }}
                      />
                      <TextField
                        size="small" value={config.primary_color || "#171717"}
                        onChange={(e) => updateField("primary_color", e.target.value)}
                        sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 1.5 }, "& input": { fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" } }}
                      />
                    </Box>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ color: "#737373", mb: 0.5, display: "block" }}>Secondary Color</Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <input
                        type="color"
                        value={config.secondary_color || "#737373"}
                        onChange={(e) => updateField("secondary_color", e.target.value)}
                        style={{ width: 36, height: 36, border: "1px solid #E5E5E5", borderRadius: 6, cursor: "pointer", padding: 0 }}
                      />
                      <TextField
                        size="small" value={config.secondary_color || "#737373"}
                        onChange={(e) => updateField("secondary_color", e.target.value)}
                        sx={{ flex: 1, "& .MuiOutlinedInput-root": { borderRadius: 1.5 }, "& input": { fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" } }}
                      />
                    </Box>
                  </Box>
                </Box>

                <TextField
                  size="small" fullWidth label="Welcome Message"
                  placeholder="Welcome to our property! Browse services from your room."
                  multiline rows={2}
                  value={config.welcome_message || ""}
                  onChange={(e) => updateField("welcome_message", e.target.value || null)}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Guest Experience ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Sliders size={16} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Guest Experience</Typography>
                <Chip label="Property" size="small" sx={{ ml: "auto", height: 20, fontSize: "0.625rem" }} />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {/* Limits */}
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <QrCode size={14} color="#737373" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>QR Validation Limit</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}>
                    <Slider
                      value={config.qr_validation_limit ?? 100}
                      onChange={(_, v) => updateField("qr_validation_limit", v as number)}
                      min={10} max={500} step={10}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', minWidth: 40, textAlign: "right" }}>
                      {config.qr_validation_limit ?? 100}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
                    <ShoppingCart size={14} color="#737373" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Request Submission Limit (per session)</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 1 }}>
                    <Slider
                      value={config.request_submission_limit ?? 50}
                      onChange={(_, v) => updateField("request_submission_limit", v as number)}
                      min={5} max={100} step={5}
                      sx={{ flex: 1 }}
                    />
                    <Typography variant="caption" sx={{ fontFamily: '"Geist Mono", monospace', minWidth: 40, textAlign: "right" }}>
                      {config.request_submission_limit ?? 50}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                {/* Feature Toggles */}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Guest Cancellation</Typography>
                    <Typography variant="caption" sx={{ color: "#737373" }}>Allow guests to cancel pending requests</Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={config.enable_guest_cancellation ?? true}
                    onChange={(e) => updateField("enable_guest_cancellation", e.target.checked)}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Alternative Proposals</Typography>
                    <Typography variant="caption" sx={{ color: "#737373" }}>Staff can propose alternatives when rejecting</Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={config.enable_alternative_proposals ?? false}
                    onChange={(e) => updateField("enable_alternative_proposals", e.target.checked)}
                  />
                </Box>

                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>Direct Messaging</Typography>
                    <Typography variant="caption" sx={{ color: "#737373" }}>Enable guest-to-staff messaging</Typography>
                  </Box>
                  <Switch
                    size="small"
                    checked={config.enable_direct_messaging ?? false}
                    onChange={(e) => updateField("enable_direct_messaging", e.target.checked)}
                  />
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Security ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Shield size={16} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Security</Typography>
                <Chip label="Platform" size="small" variant="outlined" sx={{ ml: "auto", height: 20, fontSize: "0.625rem" }} />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {[
                  { label: "Two-Factor Authentication", value: true },
                  { label: "Session Timeout (30 min)", value: true },
                  { label: "Max Login Attempts (5)", value: true },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                    <Switch size="small" defaultChecked={item.value} onChange={() => toast.info("Feature coming soon")} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* ─── Notifications ─── */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Bell size={16} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>Notifications</Typography>
                <Chip label="Platform" size="small" variant="outlined" sx={{ ml: "auto", height: 20, fontSize: "0.625rem" }} />
              </Box>

              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {[
                  { label: "Email Notifications", value: true },
                  { label: "New Service Request Alerts", value: true },
                  { label: "Partner Onboarding Alerts", value: false },
                  { label: "Daily Summary Report", value: false },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{item.label}</Typography>
                    <Switch size="small" defaultChecked={item.value} onChange={() => toast.info("Feature coming soon")} />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Save Button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5, mt: 3 }}>
        <Button
          variant="contained" size="medium"
          onClick={handleSave}
          disabled={saving || !propertyId}
          startIcon={saving ? <CircularProgress size={16} sx={{ color: "#FFF" }} /> : saved ? <Check size={16} /> : <Save size={16} />}
          sx={{
            bgcolor: saved ? "#16A34A" : "#171717",
            color: "#FFFFFF",
            borderRadius: 1.5,
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            "&:hover": { bgcolor: saved ? "#15803D" : "#262626" },
            "&:disabled": { bgcolor: "#A3A3A3", color: "#FFF" },
          }}
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save Settings"}
        </Button>
      </Box>
    </Box>
  );
}
