/**
 * UserDetailPage — View/Edit user profile and role assignments.
 *
 * Design: Precision Studio — header + tabs (Profile, Roles & Permissions, Activity).
 * Supports both invite (/users/new) and edit (/users/:id) modes.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Switch, FormControlLabel, Chip, MenuItem, Avatar, Checkbox, FormGroup,
} from "@mui/material";
import { ArrowLeft, Save, User, Mail, Shield, Clock } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface UserForm {
  name: string;
  email: string;
  role: string;
  status: string;
  property_ids: string[];
}

const EMPTY_FORM: UserForm = { name: "", email: "", role: "staff", status: "active", property_ids: [] };

const DEMO_USER: UserForm = {
  name: "Somchai Kaewmanee", email: "somchai@peppr.io", role: "property_admin",
  status: "active", property_ids: ["pr-001"],
};

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
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isNew) setForm(DEMO_USER); }, [isNew]);

  const handleSave = async () => {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Invitation sent" : "User updated");
    if (isNew) navigate("/users");
  };

  return (
    <Box>
      <PageHeader
        title={isNew ? "Invite User" : form.name}
        subtitle={isNew ? "Send an invitation to join the platform" : form.email}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/users")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Send Invitation" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 600, bgcolor: "primary.main" }}>
            {form.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </Avatar>
          <StatusChip status={form.status} />
          <Chip label={form.role.replace(/_/g, " ")} size="small" variant="outlined" icon={<Shield size={12} />} sx={{ textTransform: "capitalize" }} />
        </Box>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
          <Tab label="Profile" icon={<User size={14} />} iconPosition="start" />
          <Tab label="Roles & Access" icon={<Shield size={14} />} iconPosition="start" />
          {!isNew && <Tab label="Activity" icon={<Clock size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Full Name" fullWidth size="small" value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                slotProps={{ input: { startAdornment: <User size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField label="Email" required fullWidth size="small" type="email" value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
                disabled={!isNew}
              />
              {!isNew && (
                <FormControlLabel
                  control={<Switch checked={form.status === "active"} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.checked ? "active" : "inactive" }))} />}
                  label="Active"
                />
              )}
            </Box>
          )}

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
                  <Checkbox checked={form.role === role.value} size="small" sx={{ color: form.role === role.value ? "primary.contrastText" : undefined, "&.Mui-checked": { color: form.role === role.value ? "primary.contrastText" : undefined } }} />
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>{role.label}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>{role.desc}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {tab === 2 && !isNew && (
            <Box>
              {[
                { action: "Logged in", time: "2026-03-12 09:00", ip: "203.150.xxx.xxx" },
                { action: "Updated Room 101 template", time: "2026-03-11 16:30", ip: "203.150.xxx.xxx" },
                { action: "Created Service Request #SR-002", time: "2026-03-11 15:00", ip: "203.150.xxx.xxx" },
                { action: "Logged in", time: "2026-03-11 08:45", ip: "203.150.xxx.xxx" },
                { action: "Invited by admin@peppr.io", time: "2026-03-01 10:00", ip: "—" },
              ].map((event, i, arr) => (
                <Box key={i} sx={{ display: "flex", gap: 2, py: 1.5, borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                  <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary", minWidth: 130, flexShrink: 0 }}>{event.time}</Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{event.action}</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary" }}>{event.ip}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
