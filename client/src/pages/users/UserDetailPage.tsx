/**
 * UserDetailPage — Invite/Edit user wired to FastAPI.
 * Tabs: Profile, Roles & Access, Activity (edit mode only).
 * Role-scope binding: partner_admin → partner required; property_admin/staff → property required.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert, Avatar, Checkbox, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from "@mui/material";
import { ArrowLeft, Save, User as UserIcon, Mail, Shield, Clock, UserX, UserCheck, Copy, Check, KeyRound, Building2, MapPin, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { usersApi, partnersApi, propertiesApi } from "@/lib/api/endpoints";
import { getDemoUser } from "@/lib/api/demo-data";
import type { User as UserType, Partner, Property } from "@/lib/api/types";

interface UserForm {
  name: string;
  email: string;
  role: string;
  partner_id: string;
  property_id: string;
}

const EMPTY_FORM: UserForm = { name: "", email: "", role: "staff", partner_id: "", property_id: "" };

// ── Role definitions with scope requirements ─────────────────────────────────
const ROLES = [
  {
    value: "system_admin", label: "System Admin", desc: "Full platform access",
    requiresPartner: false, requiresProperty: false,
    scopeHint: "Platform-wide — no partner or property binding needed",
  },
  {
    value: "admin", label: "Admin", desc: "Manage partners and properties",
    requiresPartner: false, requiresProperty: false,
    scopeHint: "Platform-wide — no partner or property binding needed",
  },
  {
    value: "partner_admin", label: "Partner Admin", desc: "Manage own partner's properties",
    requiresPartner: true, requiresProperty: false,
    scopeHint: "Must be bound to a partner",
  },
  {
    value: "property_admin", label: "Property Admin", desc: "Manage assigned properties",
    requiresPartner: false, requiresProperty: true,
    scopeHint: "Must be bound to a property",
  },
  {
    value: "staff", label: "Staff", desc: "Front office operations",
    requiresPartner: false, requiresProperty: true,
    scopeHint: "Must be bound to a property",
  },
];

// ── Temp Password Copy Button ────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <Tooltip title={copied ? "Copied!" : "Copy to clipboard"}>
      <IconButton size="small" onClick={handleCopy} sx={{ ml: 0.5 }}>
        {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
      </IconButton>
    </Tooltip>
  );
}

export default function UserDetailPage() {
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new" || params.id === "invite";
  const isEdit = pathname.endsWith("/edit");

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [user, setUser] = useState<UserType | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState(false);
  const [error, setError] = useState("");

  // Invite success state — shows temp password dialog
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    name: string;
    tempPassword: string;
  } | null>(null);

  // Derive scope requirements from selected role
  const selectedRoleDef = ROLES.find((r) => r.value === form.role);
  const requiresPartner = selectedRoleDef?.requiresPartner ?? false;
  const requiresProperty = selectedRoleDef?.requiresProperty ?? false;
  const showPartnerField = requiresPartner || form.role === "partner_admin";
  const showPropertyField = requiresProperty || form.role === "property_admin" || form.role === "staff";

  // Load partners and properties for dropdowns
  useEffect(() => {
    partnersApi.list({ page_size: 100 }).then((res) => setPartners(res.items)).catch(() => {});
    propertiesApi.list({ page_size: 100 }).then((res) => setProperties(res.items)).catch(() => {});
  }, []);

  // Load user on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const u = await usersApi.get(params.id!) as UserType;
        if (cancelled) return;
        setUser(u);
        // Normalize role to lowercase so it matches the ROLES array values (e.g. "STAFF" → "staff")
        setForm({
          name: u.name, email: u.email,
          role: (u.role || "").toLowerCase(),
          partner_id: u.partner_id || "",
          property_id: (u as any).property_id || "",
        });
      } catch (err: any) {
        if (cancelled) return;
        // Fall back to demo data when backend is unavailable or returns 404
        const demoUser = getDemoUser(params.id!);
        if (demoUser) {
          setUser(demoUser);
          setForm({
            name: demoUser.name, email: demoUser.email,
            role: (demoUser.role || "").toLowerCase(),
            partner_id: demoUser.partner_id || "",
            property_id: (demoUser as any).property_id || "",
          });
        } else {
          setError(err?.response?.status === 404 ? "User not found." : "Failed to load user.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  // Clear scope fields when role changes and they're no longer required
  const handleRoleChange = (newRole: string) => {
    const roleDef = ROLES.find((r) => r.value === newRole);
    setForm((prev) => ({
      ...prev,
      role: newRole,
      partner_id: roleDef?.requiresPartner ? prev.partner_id : "",
      property_id: roleDef?.requiresProperty ? prev.property_id : "",
    }));
  };

  const handleSave = async () => {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (isNew && !form.name.trim()) { toast.error("Name is required"); return; }

    // Role-scope validation
    if (requiresPartner && !form.partner_id) {
      toast.error(`Role "${selectedRoleDef?.label}" requires a partner to be selected`);
      setTab(0); // Switch to Profile tab so user can fill in the field
      return;
    }
    if (requiresProperty && !form.property_id) {
      toast.error(`Role "${selectedRoleDef?.label}" requires a property to be selected`);
      setTab(0);
      return;
    }

    setSaving(true);
    try {
      if (isNew) {
        const result = await usersApi.invite({
          email: form.email, name: form.name, role: form.role,
          partner_id: form.partner_id || undefined,
          property_id: form.property_id || undefined,
        } as any) as UserType & { temp_password?: string };

        // Show success dialog with temp password if returned
        if (result.temp_password) {
          setInviteResult({
            email: form.email,
            name: form.name,
            tempPassword: result.temp_password,
          });
        } else {
          toast.success("Invitation sent successfully");
          navigate("/users");
        }
      } else {
        const prevRole = user?.role?.toLowerCase();
        const updated = await usersApi.update(params.id!, {
          name: form.name, role: form.role,
          partner_id: form.partner_id || undefined,
          property_id: form.property_id || undefined,
        } as any) as UserType;
        // Re-normalize role in the updated user object for consistent display
        const normalizedUpdated = { ...updated, role: (updated.role || "").toLowerCase() };
        setUser(normalizedUpdated);
        if (prevRole && prevRole !== form.role) {
          const roleLabel = ROLES.find((r) => r.value === form.role)?.label || form.role;
          toast.success(`Role changed to ${roleLabel}`);
        } else {
          toast.success("User updated successfully");
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save user.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async () => {
    setConfirmToggle(false);
    setToggling(true);
    try {
      let updated: UserType;
      if (user?.status === "active") {
        updated = await usersApi.deactivate(params.id!) as UserType;
        toast.success("User deactivated");
      } else {
        updated = await usersApi.reactivate(params.id!) as UserType;
        toast.success("User reactivated");
      }
      setUser(updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to update user status.");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  const initials = form.name ? form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";

  // Scope summary for display in header chip and Roles tab
  const scopeSummary = (() => {
    if (requiresPartner && form.partner_id) {
      const p = partners.find((x) => x.id === form.partner_id);
      return p ? `Partner: ${p.name}` : "Partner assigned";
    }
    if (requiresProperty && form.property_id) {
      const p = properties.find((x) => x.id === form.property_id);
      return p ? `Property: ${p.name}` : "Property assigned";
    }
    return null;
  })();

  return (
    <Box>
      <PageHeader
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        title={isNew ? "Invite User" : form.name || "User Details"}
        subtitle={isNew ? "Send an invitation to join the platform" : form.email}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/users")}>Back</Button>
            {isEdit && !isNew && (
              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
                Cancel
              </Button>
            )}
            {!isNew && user && (
              <Button
                variant="outlined" size="small"
                color={user.status === "active" ? "error" : "success"}
                startIcon={toggling ? <CircularProgress size={14} /> : user.status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
                onClick={() => setConfirmToggle(true)} disabled={toggling}
              >
                {user.status === "active" ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Send Invitation" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && user && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 600, bgcolor: "primary.main" }}>
            {initials}
          </Avatar>
          <StatusChip status={user.status} />
          <Chip label={(user.role || "").replace(/_/g, " ")} size="small" variant="outlined" icon={<Shield size={12} />} sx={{ textTransform: "capitalize" }} />
          {scopeSummary && (
            <Chip label={scopeSummary} size="small" variant="outlined" icon={<Building2 size={12} />} color="primary" />
          )}
          {user.last_login && (
            <Chip
              label={`Last login: ${new Date(user.last_login).toLocaleDateString()}`}
              size="small" variant="outlined" icon={<Clock size={12} />}
            />
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      <Card>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44,
            "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" },
          }}
        >
          <Tab label="Profile" icon={<UserIcon size={14} />} iconPosition="start" />
          <Tab label="Roles & Access" icon={<Shield size={14} />} iconPosition="start" />
          {!isNew && <Tab label="Activity" icon={<Clock size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* ── Profile Tab ── */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Full Name" required={isNew} fullWidth size="small" value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                slotProps={{ input: { startAdornment: <UserIcon size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Email" required fullWidth size="small" type="email" value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
                disabled={!isNew}
                helperText={!isNew ? "Email cannot be changed after invitation" : undefined}
              />

              {/* Partner field — shown when role requires it */}
              {showPartnerField && (
                <TextField
                  label="Partner"
                  fullWidth size="small" select
                  required={requiresPartner}
                  value={form.partner_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, partner_id: e.target.value }))}
                  helperText={requiresPartner ? "Required for this role" : "Optional"}
                  error={requiresPartner && !form.partner_id}
                  slotProps={{ input: { startAdornment: <Building2 size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
                >
                  <MenuItem value="">{requiresPartner ? "— Select a partner —" : "No partner"}</MenuItem>
                  {partners.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              )}

              {/* Property field — shown when role requires it */}
              {showPropertyField && (
                <TextField
                  label="Property"
                  fullWidth size="small" select
                  required={requiresProperty}
                  value={form.property_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, property_id: e.target.value }))}
                  helperText={requiresProperty ? "Required for this role" : "Optional"}
                  error={requiresProperty && !form.property_id}
                  slotProps={{ input: { startAdornment: <MapPin size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
                >
                  <MenuItem value="">{requiresProperty ? "— Select a property —" : "No property"}</MenuItem>
                  {properties.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              )}

              {/* Scope warning when required fields are empty */}
              {(requiresPartner && !form.partner_id) && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                    <strong>{selectedRoleDef?.label}</strong> requires a partner assignment. Please select a partner above.
                  </Alert>
                </Box>
              )}
              {(requiresProperty && !form.property_id) && (
                <Box sx={{ gridColumn: "1 / -1" }}>
                  <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                    <strong>{selectedRoleDef?.label}</strong> requires a property assignment. Please select a property above.
                  </Alert>
                </Box>
              )}
            </Box>
          )}

          {/* ── Roles & Access Tab ── */}
          {tab === 1 && (
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Select a role to determine what this user can access. Some roles require a partner or property binding — configure those in the <strong>Profile</strong> tab.
              </Typography>
              {ROLES.map((role) => {
                const isSelected = form.role === role.value;
                const isMissingScope =
                  isSelected && ((role.requiresPartner && !form.partner_id) || (role.requiresProperty && !form.property_id));
                return (
                  <Box
                    key={role.value}
                    onClick={() => handleRoleChange(role.value)}
                    sx={{
                      display: "flex", alignItems: "flex-start", gap: 2, p: 2, mb: 1, borderRadius: 1.5,
                      border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                      borderColor: isMissingScope ? "warning.main" : isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "primary.main" : "transparent",
                      color: isSelected ? "primary.contrastText" : "text.primary",
                      "&:hover": { borderColor: isMissingScope ? "warning.main" : "primary.main" },
                    }}
                  >
                    <Checkbox
                      checked={isSelected} size="small"
                      sx={{
                        mt: 0.25,
                        color: isSelected ? "primary.contrastText" : undefined,
                        "&.Mui-checked": { color: isSelected ? "primary.contrastText" : undefined },
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>{role.label}</Typography>
                        {(role.requiresPartner || role.requiresProperty) && (
                          <Chip
                            size="small"
                            label={role.requiresPartner ? "Requires Partner" : "Requires Property"}
                            icon={role.requiresPartner ? <Building2 size={10} /> : <MapPin size={10} />}
                            sx={{
                              height: 18, fontSize: "0.65rem",
                              bgcolor: isSelected ? "rgba(255,255,255,0.2)" : "action.hover",
                              color: isSelected ? "primary.contrastText" : "text.secondary",
                              "& .MuiChip-icon": { color: "inherit" },
                            }}
                          />
                        )}
                      </Box>
                      <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.25 }}>{role.desc}</Typography>
                      {isSelected && (
                        <Typography variant="caption" sx={{ opacity: 0.75, display: "block", mt: 0.5 }}>
                          {isMissingScope
                            ? `⚠ ${role.scopeHint} — go to Profile tab to assign`
                            : scopeSummary
                              ? `Bound to: ${scopeSummary.replace(/^(Partner|Property): /, "")}`
                              : role.scopeHint}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}

          {/* ── Activity Tab ── */}
          {tab === 2 && !isNew && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                Activity log is available in the audit trail. Showing last known login information.
              </Alert>
              {user?.last_login ? (
                <Box sx={{ display: "flex", gap: 2, py: 1.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary", minWidth: 130, flexShrink: 0 }}>
                    {new Date(user.last_login).toLocaleString()}
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>Last login</Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: "text.secondary" }}>No login activity recorded yet.</Typography>
              )}
              <Box sx={{ display: "flex", gap: 2, py: 1.5, borderTop: "1px solid", borderColor: "divider", mt: 1 }}>
                <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary", minWidth: 130, flexShrink: 0 }}>
                  {user?.created_at ? new Date(user.created_at).toLocaleString() : "—"}
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>Account created</Typography>
              </Box>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Toggle Status Confirmation */}
      <Dialog open={confirmToggle} onClose={() => setConfirmToggle(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{user?.status === "active" ? "Deactivate User" : "Reactivate User"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {user?.status === "active"
              ? `Deactivating ${form.name} will revoke their access to the platform immediately.`
              : `Reactivating ${form.name} will restore their access to the platform.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmToggle(false)}>Cancel</Button>
          <Button
            color={user?.status === "active" ? "error" : "success"}
            variant="contained" onClick={handleToggleStatus}
          >
            {user?.status === "active" ? "Deactivate" : "Reactivate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Invite Success — Temp Password Dialog */}
      <Dialog
        open={!!inviteResult}
        onClose={() => { setInviteResult(null); navigate("/users"); }}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <KeyRound size={20} color="#22c55e" />
          User Invited Successfully
        </DialogTitle>
        <DialogContent>
          <Alert severity="success" sx={{ mb: 2.5, borderRadius: 1.5 }}>
            <strong>{inviteResult?.name}</strong> has been invited. A welcome email has been sent to{" "}
            <strong>{inviteResult?.email}</strong> with their login credentials.
          </Alert>

          <Alert severity="warning" sx={{ mb: 2.5, borderRadius: 1.5 }}>
            If email delivery is not configured, share the temporary password below directly with the user.
            It will not be shown again.
          </Alert>

          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Temporary Password
          </Typography>
          <Box
            sx={{
              display: "flex", alignItems: "center", gap: 1,
              bgcolor: "action.hover", borderRadius: 1.5, px: 2, py: 1.5,
              border: "1px solid", borderColor: "divider",
            }}
          >
            <Typography
              variant="body1"
              sx={{ fontFamily: '"Geist Mono", "Courier New", monospace', letterSpacing: "0.08em", flexGrow: 1, userSelect: "all" }}
            >
              {inviteResult?.tempPassword}
            </Typography>
            {inviteResult && <CopyButton text={inviteResult.tempPassword} />}
          </Box>

          <Typography variant="body2" sx={{ color: "text.secondary", mt: 2, lineHeight: 1.6 }}>
            The user should sign in at the login page and change their password immediately. This temporary
            password will remain valid until they update it.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            variant="contained"
            onClick={() => { setInviteResult(null); navigate("/users"); }}
          >
            Done — Go to Users
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
