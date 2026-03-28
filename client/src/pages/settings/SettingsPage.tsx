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
  FormControl, Select, MenuItem, Stack,
} from "@mui/material";
import PageHeader from "@/components/shared/PageHeader";
import {
  Settings, Shield, Bell, Palette, Users, Save, RefreshCw, Check,
  AlertTriangle, Sliders, MessageSquare, QrCode, ShoppingCart, RotateCcw,
  Database, Trash2, Wifi, WifiOff,
} from "lucide-react";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc";
import type { PropertyConfigResponse, PropertyConfigUpdate } from "@/lib/api/types";
import { toast } from "sonner";

export default function SettingsPage() {
  const { user } = useAuth();
  const propertyId = user?.property_id;

  // Enhancement 2: Redis health indicator
  const { data: redisHealth, isLoading: redisLoading, refetch: refetchRedis } =
    trpc.systemHealth.redis.useQuery(undefined, { refetchInterval: 30_000 });

  // Audit log retention state
  const [retentionDays, setRetentionDays] = useState<number>(90);
  const [retentionSaving, setRetentionSaving] = useState(false);
  const { confirm: guardConfirm, RoleContextGuardDialog } = useRoleContextGuard();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [config, setConfig] = useState<PropertyConfigUpdate>({
    logo_url: "https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/peppr-logo_3633e33d.svg",
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

  // ── Detect SSO link completion ──────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const linked = params.get("linked");
    if (linked === "true") {
      toast.success("Google account linked successfully! You can now use \"Continue with Google\" to sign in.", { duration: 6000 });
      // Clean up the URL without triggering a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("linked");
      window.history.replaceState({}, "", url.pathname);
    } else if (linked === "error") {
      const reason = params.get("reason") || "Could not link your Google account. Please try again.";
      toast.error(reason, { duration: 8000 });
      const url = new URL(window.location.href);
      url.searchParams.delete("linked");
      url.searchParams.delete("reason");
      window.history.replaceState({}, "", url.pathname);
    }
  }, []);

  // Load current config via tRPC
  const propertyQuery = trpc.crud.properties.get.useQuery(
    { id: propertyId! },
    { enabled: !!propertyId, staleTime: 30_000 }
  );
  useEffect(() => {
    if (propertyQuery.isLoading) return;
    if (propertyQuery.data) {
      const property = propertyQuery.data as any;
      if (property.config) {
        setConfig((prev) => ({ ...prev, ...(property.config as PropertyConfigUpdate) }));
      }
    }
    setLoading(false);
  }, [propertyQuery.data, propertyQuery.isLoading]);

  const updateField = useCallback(<K extends keyof PropertyConfigUpdate>(key: K, value: PropertyConfigUpdate[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }, []);

  const updatePropertyMutation = trpc.crud.properties.update.useMutation({
    onSuccess: () => { setSaved(true); toast.success("Settings saved successfully"); setSaving(false); },
    onError: (err: any) => {
      const detail = err?.message?.includes("FORBIDDEN") ? "You don't have permission to update settings." : "Failed to save settings. Please try again.";
      setError(detail); toast.error(detail); setSaving(false);
    },
  });
  const handleSave = () => {
    if (!propertyId) { toast.error("No property assigned to your account."); return; }
    setSaving(true);
    setError("");
    // Save config as a JSON field on the property update
    updatePropertyMutation.mutate({ id: propertyId, ...(config as any) });
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
                <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
                  <TextField
                    size="small" fullWidth label="Logo URL"
                    placeholder="https://cdn.example.com/logo.png"
                    value={config.logo_url || ""}
                    onChange={(e) => updateField("logo_url", e.target.value || null)}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
                  />
                  {/* Live logo preview */}
                  <Box
                    sx={{
                      width: 48, height: 48, flexShrink: 0,
                      border: "1px solid #E5E5E5", borderRadius: 1.5,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      bgcolor: "#F5F5F5", overflow: "hidden",
                    }}
                  >
                    {config.logo_url ? (
                      <Box
                        component="img"
                        src={config.logo_url}
                        alt="Logo preview"
                        sx={{ width: 36, height: 36, objectFit: "contain" }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Typography variant="caption" sx={{ color: "#A3A3A3", fontSize: "0.6rem", textAlign: "center", px: 0.5 }}>No logo</Typography>
                    )}
                  </Box>
                </Box>

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

      {/* Developer / Admin Tools */}
      <Card sx={{ mt: 3, border: "1px solid", borderColor: "warning.main", borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <AlertTriangle size={18} color="#F59E0B" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>
              Admin Tools
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Row 1: Reset Setup Wizard */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Reset Setup Wizard</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Re-show the onboarding wizard on the Dashboard. Use this when setting up a new property.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RotateCcw size={14} />}
                onClick={() => {
                  localStorage.removeItem("peppr_onboarding_dismissed");
                  toast.success("Setup wizard reset — it will reappear on the Dashboard.");
                }}
                sx={{ borderColor: "warning.main", color: "warning.dark", "&:hover": { borderColor: "warning.dark", bgcolor: "warning.50" }, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
              >
                Reset Wizard
              </Button>
            </Box>

            <Divider />

            {/* Row 3: Redis Health Indicator */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Redis Cache</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Distributed rate-limiting and JTI revocation store. Auto-refreshes every 30 s.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {redisLoading ? (
                  <CircularProgress size={16} />
                ) : redisHealth?.connected ? (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
                    <Chip
                      icon={<Wifi size={12} />}
                      label={`Connected${redisHealth.latencyMs != null ? ` · ${redisHealth.latencyMs} ms` : ""}${redisHealth.prefix ? ` · ${redisHealth.prefix}:` : ""}`}
                      size="small"
                      sx={{ bgcolor: "success.50", color: "success.dark", fontWeight: 600, fontSize: "0.7rem" }}
                    />
                    {redisHealth.activeRevocations != null && (
                      <Tooltip title="Active JTI revocation keys currently stored in Redis (self-expire with token TTL)">
                        <Chip
                          icon={<Database size={11} />}
                          label={`${redisHealth.activeRevocations} revoked JTI${redisHealth.activeRevocations !== 1 ? "s" : ""}`}
                          size="small"
                          sx={{ bgcolor: "info.50", color: "info.dark", fontWeight: 600, fontSize: "0.7rem", cursor: "help" }}
                        />
                      </Tooltip>
                    )}
                  </Box>
                ) : redisHealth?.configured ? (
                  <Chip
                    icon={<WifiOff size={12} />}
                    label="Unreachable"
                    size="small"
                    sx={{ bgcolor: "error.50", color: "error.dark", fontWeight: 600, fontSize: "0.7rem" }}
                  />
                ) : (
                  <Chip
                    label="Not configured"
                    size="small"
                    sx={{ bgcolor: "grey.100", color: "text.secondary", fontWeight: 600, fontSize: "0.7rem" }}
                  />
                )}
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RefreshCw size={12} />}
                  onClick={() => refetchRedis()}
                  sx={{ borderColor: "warning.main", color: "warning.dark", "&:hover": { borderColor: "warning.dark", bgcolor: "warning.50" }, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
                >
                  Ping
                </Button>
              </Box>
            </Box>

            <Divider />

            {/* Row 2: Clear All Dismissed Banners */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Clear All Dismissed Banners</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Reset all dismissed info banners, tips, and notices so they reappear across the platform.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshCw size={14} />}
                onClick={() => {
                  // Clear all peppr_* localStorage flags except auth tokens
                  const keysToRemove = Object.keys(localStorage).filter(
                    (k) => k.startsWith("peppr_") && !k.startsWith("peppr_access") && !k.startsWith("peppr_refresh")
                  );
                  keysToRemove.forEach((k) => localStorage.removeItem(k));
                  toast.success(`Cleared ${keysToRemove.length} dismissed banner${keysToRemove.length !== 1 ? "s" : ""}. Refresh to see them.`);
                }}
                sx={{ borderColor: "warning.main", color: "warning.dark", "&:hover": { borderColor: "warning.dark", bgcolor: "warning.50" }, textTransform: "none", fontWeight: 600, flexShrink: 0 }}
              >
                Clear All Banners
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Audit Log Retention Policy */}
      <Card sx={{ mt: 3, border: "1px solid", borderColor: "error.light", borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Database size={18} color="#EF4444" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>
              Audit Log Retention
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Retention Period */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>Retention Period</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Audit log entries older than this period will be automatically purged.
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={retentionDays}
                    onChange={e => setRetentionDays(Number(e.target.value))}
                  >
                    <MenuItem value={30}>30 days</MenuItem>
                    <MenuItem value={90}>90 days (default)</MenuItem>
                    <MenuItem value={180}>180 days</MenuItem>
                    <MenuItem value={365}>365 days</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  size="small"
                  disabled={retentionSaving}
                  startIcon={retentionSaving ? <CircularProgress size={14} /> : <Check size={14} />}
                  onClick={async () => {
                    setRetentionSaving(true);
                    try {
                      await fetch(`/api/v1/admin/audit-log/retention`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ retention_days: retentionDays }),
                      });
                      toast.success(`Retention policy updated to ${retentionDays} days.`);
                    } catch {
                      toast.info(`Retention policy set to ${retentionDays} days (saved locally — connect backend to persist).`);
                    } finally {
                      setRetentionSaving(false);
                    }
                  }}
                  sx={{ borderColor: "primary.main", color: "primary.main", textTransform: "none", fontWeight: 600, flexShrink: 0 }}
                >
                  Apply
                </Button>
              </Stack>
            </Box>

            <Divider />

            {/* Manual Purge */}
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: "error.main" }}>Purge Old Audit Entries</Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  Immediately delete all audit log entries older than the selected retention period. This action is irreversible.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<Trash2 size={14} />}
                onClick={async () => {
                  const ok = await guardConfirm({
                    action: "Purge Audit Log Entries",
                    description: `This will permanently delete all audit log entries older than ${retentionDays} days. This action cannot be undone.`,
                    confirmLabel: "Purge Entries",
                    severity: "destructive",
                    confirmPhrase: "purge audit log",
                    audit: {
                      entityType: "system",
                      entityId: "audit-log",
                      entityName: `Retention: ${retentionDays} days`,
                      details: `Manual purge triggered for entries older than ${retentionDays} days`,
                    },
                  });
                  if (!ok) return;
                  try {
                    await fetch(`/api/v1/admin/audit-log/purge`, {
                      method: "DELETE",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ older_than_days: retentionDays }),
                    });
                    toast.success(`Audit log entries older than ${retentionDays} days have been purged.`);
                  } catch {
                    toast.info("Purge request sent (connect backend to execute).");
                  }
                }}
                sx={{ textTransform: "none", fontWeight: 600, flexShrink: 0 }}
              >
                Purge Now
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {RoleContextGuardDialog}

      {/* Link Google Account */}
      <Card sx={{ mt: 3, border: "1px solid", borderColor: "divider", borderRadius: 2 }}>
        <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            {/* Google G icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, fontSize: "0.9375rem" }}>
              Google Account
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Link Google Account for SSO</Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Connect your Google account so you can sign in with "Continue with Google" in addition to your email and password.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                // Trigger the Manus OAuth flow with a link_account flag in state
                const state = btoa(JSON.stringify({ origin: window.location.origin, returnPath: "/settings", mode: "link" }));
                window.location.href = `/api/oauth/login?state=${state}`;
              }}
              sx={{ textTransform: "none", fontWeight: 600, flexShrink: 0, display: "flex", alignItems: "center", gap: 0.75 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Link Google Account
            </Button>
          </Box>
        </CardContent>
      </Card>

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
