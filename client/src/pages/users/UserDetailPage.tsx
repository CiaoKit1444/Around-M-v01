/**
 * UserDetailPage — Invite/Edit user wired to FastAPI.
 * Tabs: Profile, Roles & Access, Activity (edit mode only).
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert, Avatar, Checkbox, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { ArrowLeft, Save, User as UserIcon, Mail, Shield, Clock, UserX, UserCheck } from "lucide-react";
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
}

const EMPTY_FORM: UserForm = { name: "", email: "", role: "staff", partner_id: "" };

const ROLES = [
  { value: "system_admin", label: "System Admin", desc: "Full platform access" },
  { value: "admin", label: "Admin", desc: "Manage partners and properties" },
  { value: "partner_admin", label: "Partner Admin", desc: "Manage own partner's properties" },
  { value: "property_admin", label: "Property Admin", desc: "Manage assigned properties" },
  { value: "staff", label: "Staff", desc: "Front office operations" },
];

export default function UserDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new" || params.id === "invite";

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
        setForm({ name: u.name, email: u.email, role: u.role, partner_id: u.partner_id || "" });
      } catch (err: any) {
        if (cancelled) return;
        // Fall back to demo data when backend is unavailable or returns 404
        const demoUser = getDemoUser(params.id!);
        if (demoUser) {
          setUser(demoUser);
          setForm({ name: demoUser.name, email: demoUser.email, role: demoUser.role, partner_id: demoUser.partner_id || "" });
        } else {
          setError(err?.response?.status === 404 ? "User not found." : "Failed to load user.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  const handleSave = async () => {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (isNew && !form.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await usersApi.invite({
          email: form.email, name: form.name, role: form.role,
          partner_id: form.partner_id || undefined,
        });
        toast.success("Invitation sent successfully");
        navigate("/users");
      } else {
        const updated = await usersApi.update(params.id!, { name: form.name, role: form.role }) as UserType;
        setUser(updated);
        toast.success("User updated successfully");
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

  return (
    <Box>
      <PageHeader
        title={isNew ? "Invite User" : form.name || "User Details"}
        subtitle={isNew ? "Send an invitation to join the platform" : form.email}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/users")}>Back</Button>
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
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 600, bgcolor: "primary.main" }}>
            {initials}
          </Avatar>
          <StatusChip status={user.status} />
          <Chip label={user.role.replace(/_/g, " ")} size="small" variant="outlined" icon={<Shield size={12} />} sx={{ textTransform: "capitalize" }} />
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
          {/* Profile */}
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
              {isNew && (
                <TextField
                  label="Partner" fullWidth size="small" select
                  value={form.partner_id} onChange={(e) => setForm((prev) => ({ ...prev, partner_id: e.target.value }))}
                  helperText="Optional — assign to a specific partner"
                >
                  <MenuItem value="">No partner (platform admin)</MenuItem>
                  {partners.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                </TextField>
              )}
            </Box>
          )}

          {/* Roles & Access */}
          {tab === 1 && (
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Assign a role to determine what this user can access.
              </Typography>
              {ROLES.map((role) => (
                <Box
                  key={role.value}
                  onClick={() => setForm((prev) => ({ ...prev, role: role.value }))}
                  sx={{
                    display: "flex", alignItems: "center", gap: 2, p: 2, mb: 1, borderRadius: 1.5,
                    border: "1px solid", cursor: "pointer", transition: "all 0.15s",
                    borderColor: form.role === role.value ? "primary.main" : "divider",
                    bgcolor: form.role === role.value ? "primary.main" : "transparent",
                    color: form.role === role.value ? "primary.contrastText" : "text.primary",
                    "&:hover": { borderColor: "primary.main" },
                  }}
                >
                  <Checkbox
                    checked={form.role === role.value} size="small"
                    sx={{
                      color: form.role === role.value ? "primary.contrastText" : undefined,
                      "&.Mui-checked": { color: form.role === role.value ? "primary.contrastText" : undefined },
                    }}
                  />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{role.label}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{role.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Activity */}
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
    </Box>
  );
}
