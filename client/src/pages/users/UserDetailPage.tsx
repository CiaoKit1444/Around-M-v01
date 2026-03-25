/**
 * UserDetailPage — Invite/Edit user with multi-role binding support.
 * Tabs: Profile, Roles & Access, Activity (edit mode only).
 *
 * Multi-role model:
 *   - Global roles (SUPER_ADMIN, SYSTEM_ADMIN, ADMIN) need no scope binding.
 *   - PARTNER_ADMIN requires one or more Partner bindings.
 *   - PROPERTY_ADMIN / STAFF / FRONT_DESK / HOUSEKEEPING require one or more Property bindings.
 *   - A user can hold multiple roles simultaneously, each with its own scope.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, CircularProgress, Alert, Avatar, Checkbox, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
  Divider, Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import {
  ArrowLeft, Save, User as UserIcon, Mail, Shield, Clock, UserX, UserCheck,
  Copy, Check, KeyRound, Building2, MapPin, X, Plus, Trash2, RefreshCw,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { usersApi, partnersApi, propertiesApi } from "@/lib/api/endpoints";
import { getDemoUser } from "@/lib/api/demo-data";
import type { User as UserType, Partner, Property } from "@/lib/api/types";
import { trpc } from "@/lib/trpc";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RoleBinding {
  role: string;
  partner_id: string;
  property_id: string;
}

interface UserForm {
  name: string;
  email: string;
}

const EMPTY_FORM: UserForm = { name: "", email: "" };

// ── Role definitions ──────────────────────────────────────────────────────────

const ROLES = [
  {
    value: "SUPER_ADMIN",
    label: "Super Admin",
    desc: "Full platform access — all features, all properties",
    requiresPartner: false,
    requiresProperty: false,
    scopeHint: "Platform-wide — no partner or property binding needed",
    color: "#8b5cf6",
  },
  {
    value: "SYSTEM_ADMIN",
    label: "System Admin",
    desc: "Full platform access",
    requiresPartner: false,
    requiresProperty: false,
    scopeHint: "Platform-wide — no partner or property binding needed",
    color: "#6366f1",
  },
  {
    value: "ADMIN",
    label: "Admin",
    desc: "Manage partners and properties",
    requiresPartner: false,
    requiresProperty: false,
    scopeHint: "Platform-wide — no partner or property binding needed",
    color: "#3b82f6",
  },
  {
    value: "PARTNER_ADMIN",
    label: "Partner Admin",
    desc: "Manage own partner's properties",
    requiresPartner: true,
    requiresProperty: false,
    scopeHint: "Requires at least one Partner binding",
    color: "#0ea5e9",
  },
  {
    value: "PROPERTY_ADMIN",
    label: "Property Admin",
    desc: "Manage assigned properties",
    requiresPartner: false,
    requiresProperty: true,
    scopeHint: "Requires at least one Property binding",
    color: "#10b981",
  },
  {
    value: "STAFF",
    label: "Staff",
    desc: "Front office operations",
    requiresPartner: false,
    requiresProperty: true,
    scopeHint: "Requires at least one Property binding",
    color: "#f59e0b",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

// ── RoleBindingRow — one role card with optional scope selectors ──────────────

interface RoleBindingRowProps {
  binding: RoleBinding;
  index: number;
  partners: Partner[];
  properties: Property[];
  onChange: (index: number, updated: RoleBinding) => void;
  onRemove: (index: number) => void;
  /** True if this is the only binding for this role (can't remove last) */
  isOnly: boolean;
}

function RoleBindingRow({ binding, index, partners, properties, onChange, onRemove, isOnly }: RoleBindingRowProps) {
  const def = ROLES.find((r) => r.value === binding.role);
  if (!def) return null;

  const missingPartner = def.requiresPartner && !binding.partner_id;
  const missingProperty = def.requiresProperty && !binding.property_id;

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: (missingPartner || missingProperty) ? "warning.main" : "divider",
        borderRadius: 1.5,
        p: 2,
        mb: 1,
        bgcolor: "action.hover",
        position: "relative",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{
              width: 8, height: 8, borderRadius: "50%",
              bgcolor: def.color,
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{def.label}</Typography>
          {def.requiresPartner && (
            <Chip
              size="small"
              label="Requires Partner"
              icon={<Building2 size={10} />}
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          )}
          {def.requiresProperty && (
            <Chip
              size="small"
              label="Requires Property"
              icon={<MapPin size={10} />}
              sx={{ height: 18, fontSize: "0.65rem" }}
            />
          )}
        </Box>
        {!isOnly && (
          <Tooltip title="Remove this binding">
            <IconButton size="small" onClick={() => onRemove(index)} sx={{ color: "error.main" }}>
              <Trash2 size={14} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {def.requiresPartner && (
        <TextField
          label="Partner"
          fullWidth
          size="small"
          select
          required
          value={binding.partner_id}
          onChange={(e) => onChange(index, { ...binding, partner_id: e.target.value })}
          error={missingPartner}
          helperText={missingPartner ? "Select a partner for this role" : undefined}
          sx={{ mb: def.requiresProperty ? 1.5 : 0 }}
          slotProps={{ input: { startAdornment: <Building2 size={14} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
        >
          <option value="">— Select a partner —</option>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </TextField>
      )}

      {def.requiresProperty && (
        <TextField
          label="Property"
          fullWidth
          size="small"
          select
          required
          value={binding.property_id}
          onChange={(e) => onChange(index, { ...binding, property_id: e.target.value })}
          error={missingProperty}
          helperText={missingProperty ? "Select a property for this role" : undefined}
          slotProps={{ input: { startAdornment: <MapPin size={14} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
        >
          <option value="">— Select a property —</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </TextField>
      )}

      {!def.requiresPartner && !def.requiresProperty && (
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {def.scopeHint}
        </Typography>
      )}
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

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

  // Multi-role bindings state
  // Each entry: { role, partner_id, property_id }
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["STAFF"]);
  const [roleBindings, setRoleBindings] = useState<RoleBinding[]>([
    { role: "STAFF", partner_id: "", property_id: "" },
  ]);

  // Invite success state — shows temp password dialog
  const [inviteResult, setInviteResult] = useState<{
    email: string;
    name: string;
    tempPassword: string;
  } | null>(null);

  // ── View-mode inline role management ──────────────────────────────────────
  // tRPC query for existing user's bindings (view mode only)
  const getUserRolesQuery = trpc.rbac.getUserRoles.useQuery(
    { userId: params.id ?? "" },
    { enabled: !isNew && !!params.id }
  );
  const utils = trpc.useUtils();

  // Add role binding state
  const [addRoleOpen, setAddRoleOpen] = useState(false);
  const [addRoleId, setAddRoleId] = useState("STAFF");
  const [addPartnerId, setAddPartnerId] = useState("");
  const [addPropertyId, setAddPropertyId] = useState("");

  const assignRoleMutation = trpc.rbac.assignRole.useMutation({
    onSuccess: () => {
      toast.success("Role binding added");
      utils.rbac.getUserRoles.invalidate({ userId: params.id ?? "" });
      setAddRoleOpen(false);
      setAddRoleId("STAFF");
      setAddPartnerId("");
      setAddPropertyId("");
    },
    onError: (err) => toast.error(err.message || "Failed to add role"),
  });

  const revokeRoleMutation = trpc.rbac.revokeRole.useMutation({
    onSuccess: () => {
      toast.success("Role binding removed");
      utils.rbac.getUserRoles.invalidate({ userId: params.id ?? "" });
    },
    onError: (err) => toast.error(err.message || "Failed to remove role"),
  });

  // Derived: which role def is selected in the Add Role dialog
  const addRoleDef = useMemo(() => ROLES.find((r) => r.value === addRoleId), [addRoleId]);

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
        const u = await usersApi.get(params.id!) as UserType & { roles?: any[] };
        if (cancelled) return;
        setUser(u);
        setForm({ name: u.name, email: u.email });

        // Populate multi-role state from user.roles array
        if (u.roles && u.roles.length > 0) {
          const roles = u.roles.map((r: any) => r.role_id || r.roleId || r.role || "STAFF");
          const bindings: RoleBinding[] = u.roles.map((r: any) => ({
            role: (r.role_id || r.roleId || r.role || "STAFF").toUpperCase(),
            partner_id: r.partner_id || "",
            property_id: r.property_id || "",
          }));
          setSelectedRoles(roles.map((r: string) => r.toUpperCase()));
          setRoleBindings(bindings);
        } else {
          // Fallback to legacy single role
          const legacyRole = (u.role || "STAFF").toUpperCase();
          setSelectedRoles([legacyRole]);
          setRoleBindings([{
            role: legacyRole,
            partner_id: (u as any).partner_id || "",
            property_id: (u as any).property_id || "",
          }]);
        }
      } catch (err: any) {
        if (cancelled) return;
        const demoUser = getDemoUser(params.id!);
        if (demoUser) {
          setUser(demoUser);
          setForm({ name: demoUser.name, email: demoUser.email });
          const legacyRole = (demoUser.role || "STAFF").toUpperCase();
          setSelectedRoles([legacyRole]);
          setRoleBindings([{ role: legacyRole, partner_id: demoUser.partner_id || "", property_id: "" }]);
        } else {
          setError(err?.response?.status === 404 ? "User not found." : "Failed to load user.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  // ── Role selection helpers ──────────────────────────────────────────────────

  const toggleRole = (roleValue: string) => {
    if (selectedRoles.includes(roleValue)) {
      // Remove all bindings for this role
      if (selectedRoles.length === 1) {
        toast.error("At least one role must be selected");
        return;
      }
      setSelectedRoles((prev) => prev.filter((r) => r !== roleValue));
      setRoleBindings((prev) => prev.filter((b) => b.role !== roleValue));
    } else {
      // Add a new binding for this role
      setSelectedRoles((prev) => [...prev, roleValue]);
      setRoleBindings((prev) => [...prev, { role: roleValue, partner_id: "", property_id: "" }]);
    }
  };

  const addBindingForRole = (roleValue: string) => {
    setRoleBindings((prev) => [...prev, { role: roleValue, partner_id: "", property_id: "" }]);
  };

  const updateBinding = (index: number, updated: RoleBinding) => {
    setRoleBindings((prev) => prev.map((b, i) => (i === index ? updated : b)));
  };

  const removeBinding = (index: number) => {
    const removed = roleBindings[index];
    const remaining = roleBindings.filter((_, i) => i !== index);
    // If no more bindings for this role, deselect the role too
    const stillHasRole = remaining.some((b) => b.role === removed.role);
    if (!stillHasRole) {
      setSelectedRoles((prev) => prev.filter((r) => r !== removed.role));
    }
    setRoleBindings(remaining);
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  const validateBindings = (): boolean => {
    for (const b of roleBindings) {
      const def = ROLES.find((r) => r.value === b.role);
      if (!def) continue;
      if (def.requiresPartner && !b.partner_id) {
        toast.error(`${def.label} requires a Partner to be selected`);
        setTab(1);
        return false;
      }
      if (def.requiresProperty && !b.property_id) {
        toast.error(`${def.label} requires a Property to be selected`);
        setTab(1);
        return false;
      }
    }
    return true;
  };

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (isNew && !form.name.trim()) { toast.error("Name is required"); return; }
    if (!validateBindings()) return;

    setSaving(true);
    try {
      if (isNew) {
        const result = await usersApi.invite({
          email: form.email,
          name: form.name,
          role_bindings: roleBindings.map((b) => ({
            role: b.role,
            partner_id: b.partner_id || undefined,
            property_id: b.property_id || undefined,
          })),
        } as any) as UserType & { temp_password?: string };

        if (result.temp_password) {
          setInviteResult({ email: form.email, name: form.name, tempPassword: result.temp_password });
        } else {
          toast.success("Invitation sent successfully");
          navigate("/users");
        }
      } else {
        // Edit mode: update profile only (role changes handled via Role Management)
        const updated = await usersApi.update(params.id!, {
          name: form.name,
        } as any) as UserType;
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
      if (user?.status === "active" || user?.status === "ACTIVE") {
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

  if (loading) return <DetailSkeleton sections={2} />;

  const initials = form.name
    ? form.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const primaryRole = selectedRoles[0];
  const primaryRoleDef = ROLES.find((r) => r.value === primaryRole);

  return (
    <Box>
      <PageHeader
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        title={isNew ? "Invite User" : form.name || "User Details"}
        subtitle={isNew ? "Send an invitation to join the platform" : form.email}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined" size="small"
              startIcon={<ArrowLeft size={14} />}
              onClick={() => navigate("/users")}
            >
              Back
            </Button>
            {isEdit && !isNew && (
              <Button
                variant="outlined" size="small" color="error"
                startIcon={<X size={14} />}
                onClick={() => navigate(pathname.replace(/\/edit$/, ""))}
              >
                Cancel
              </Button>
            )}
            {!isNew && user && (
              <Button
                variant="outlined" size="small"
                color={(user.status === "active" || user.status === "ACTIVE") ? "error" : "success"}
                startIcon={toggling ? <CircularProgress size={14} /> : (user.status === "active" || user.status === "ACTIVE") ? <UserX size={14} /> : <UserCheck size={14} />}
                onClick={() => setConfirmToggle(true)}
                disabled={toggling}
              >
                {(user.status === "active" || user.status === "ACTIVE") ? "Deactivate" : "Reactivate"}
              </Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave}
              disabled={saving}
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
          {selectedRoles.map((r) => (
            <Chip
              key={r}
              label={ROLES.find((x) => x.value === r)?.label || r}
              size="small"
              variant="outlined"
              icon={<Shield size={12} />}
              sx={{ textTransform: "capitalize" }}
            />
          ))}
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
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44,
            "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" },
          }}
        >
          <Tab label="Profile" icon={<UserIcon size={14} />} iconPosition="start" />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                Roles & Access
                <Chip
                  label={roleBindings.length}
                  size="small"
                  sx={{ height: 16, fontSize: "0.6rem", minWidth: 20, bgcolor: "primary.main", color: "white" }}
                />
              </Box>
            }
            icon={<Shield size={14} />}
            iconPosition="start"
          />
          {!isNew && <Tab label="Activity" icon={<Clock size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* ── Profile Tab ── */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Full Name"
                required={isNew}
                fullWidth
                size="small"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                slotProps={{ input: { startAdornment: <UserIcon size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Email"
                required
                fullWidth
                size="small"
                type="email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
                disabled={!isNew}
                helperText={!isNew ? "Email cannot be changed after invitation" : undefined}
              />
            </Box>
          )}

          {/* ── Roles & Access Tab ── */}
          {tab === 1 && (
            <Box>
              {/* VIEW MODE: show live bindings with inline Add/Revoke */}
              {!isNew && (
                <>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>
                      Current role bindings for this user. Add or revoke bindings without leaving this page.
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <IconButton size="small" onClick={() => utils.rbac.getUserRoles.invalidate({ userId: params.id ?? "" })} title="Refresh">
                        <RefreshCw size={14} />
                      </IconButton>
                      <Button size="small" variant="contained" startIcon={<Plus size={12} />} onClick={() => setAddRoleOpen(true)}>
                        Add Role
                      </Button>
                    </Box>
                  </Box>

                  {getUserRolesQuery.isLoading && (
                    <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={24} /></Box>
                  )}

                  {!getUserRolesQuery.isLoading && getUserRolesQuery.data?.bindings.length === 0 && (
                    <Alert severity="warning" sx={{ borderRadius: 1.5, mb: 2 }}>
                      No role bindings found. Click "Add Role" to assign this user a role.
                    </Alert>
                  )}

                  {getUserRolesQuery.data?.bindings.map((binding) => {
                    const roleDef = ROLES.find((r) => r.value === binding.roleId);
                    const color = roleDef?.color ?? "#6b7280";
                    return (
                      <Box
                        key={binding.id}
                        sx={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          p: 1.5, mb: 1, borderRadius: 1.5, border: "1px solid",
                          borderColor: `${color}40`, bgcolor: `${color}08`,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0 }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{binding.roleName}</Typography>
                            {binding.scopeLabel && (
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                                {binding.scopeType === "PARTNER" ? <Building2 size={10} style={{ verticalAlign: "middle", marginRight: 4 }} /> : <MapPin size={10} style={{ verticalAlign: "middle", marginRight: 4 }} />}
                                {binding.scopeLabel}
                              </Typography>
                            )}
                            {!binding.scopeLabel && (
                              <Typography variant="caption" sx={{ color: "text.secondary" }}>Platform-wide</Typography>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {binding.grantedAt && (
                            <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                              {new Date(binding.grantedAt).toLocaleDateString()}
                            </Typography>
                          )}
                          <Tooltip title="Revoke this role binding">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => revokeRoleMutation.mutate({ userId: params.id!, roleId: binding.roleId, bindingId: binding.id })}
                              disabled={revokeRoleMutation.isPending}
                            >
                              <Trash2 size={13} />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    );
                  })}

                  <Divider sx={{ my: 2 }} />
                </>
              )}

              {/* INVITE MODE: multi-role selector */}
              {isNew && (
                <Box>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2.5 }}>
                    Select one or more roles for this user. Roles with a scope requirement (Partner or Property)
                    can be assigned multiple times — once per entity. The user will be able to <strong>switch
                    between roles</strong> after logging in.
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, display: "block" }}>
                      Select Roles
                    </Typography>
                    {ROLES.map((role) => {
                      const isSelected = selectedRoles.includes(role.value);
                      return (
                        <Box
                          key={role.value}
                          onClick={() => toggleRole(role.value)}
                          sx={{
                            display: "flex", alignItems: "flex-start", gap: 2, p: 1.75, mb: 1,
                            borderRadius: 1.5, border: "1px solid", cursor: "pointer",
                            transition: "all 0.15s",
                            borderColor: isSelected ? role.color : "divider",
                            bgcolor: isSelected ? `${role.color}18` : "transparent",
                            "&:hover": { borderColor: role.color, bgcolor: `${role.color}10` },
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            size="small"
                            sx={{ mt: 0.25, p: 0, "& .MuiSvgIcon-root": { color: isSelected ? role.color : undefined } }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleRole(role.value)}
                          />
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{role.label}</Typography>
                              {role.requiresPartner && (
                                <Chip size="small" label="Requires Partner" icon={<Building2 size={10} />}
                                  sx={{ height: 18, fontSize: "0.65rem" }} />
                              )}
                              {role.requiresProperty && (
                                <Chip size="small" label="Requires Property" icon={<MapPin size={10} />}
                                  sx={{ height: 18, fontSize: "0.65rem" }} />
                              )}
                            </Box>
                            <Typography variant="caption" sx={{ color: "text.secondary" }}>{role.desc}</Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>

                  {selectedRoles.length > 0 && (
                    <>
                      <Divider sx={{ mb: 2 }} />
                      <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", mb: 1.5, display: "block" }}>
                        Configure Scope Bindings
                      </Typography>

                      {ROLES.filter((r) => selectedRoles.includes(r.value)).map((roleDef) => {
                        const bindingsForRole = roleBindings
                          .map((b, i) => ({ binding: b, index: i }))
                          .filter(({ binding }) => binding.role === roleDef.value);

                        return (
                          <Box key={roleDef.value} sx={{ mb: 2.5 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: roleDef.color }} />
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{roleDef.label}</Typography>
                              </Box>
                              {(roleDef.requiresPartner || roleDef.requiresProperty) && (
                                <Button
                                  size="small"
                                  startIcon={<Plus size={12} />}
                                  onClick={() => addBindingForRole(roleDef.value)}
                                  sx={{ fontSize: "0.7rem", py: 0.25 }}
                                >
                                  Add another {roleDef.requiresPartner ? "partner" : "property"}
                                </Button>
                              )}
                            </Box>

                            {bindingsForRole.map(({ binding, index }) => (
                              <RoleBindingRow
                                key={index}
                                binding={binding}
                                index={index}
                                partners={partners}
                                properties={properties}
                                onChange={updateBinding}
                                onRemove={removeBinding}
                                isOnly={bindingsForRole.length === 1 && !roleDef.requiresPartner && !roleDef.requiresProperty}
                              />
                            ))}
                          </Box>
                        );
                      })}
                    </>
                  )}

                  {roleBindings.length === 0 && (
                    <Alert severity="warning" sx={{ borderRadius: 1.5 }}>
                      At least one role must be selected.
                    </Alert>
                  )}
                </Box>
              )}
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
        <DialogTitle>
          {(user?.status === "active" || user?.status === "ACTIVE") ? "Deactivate User" : "Reactivate User"}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {(user?.status === "active" || user?.status === "ACTIVE")
              ? `Deactivating ${form.name} will revoke their access to the platform immediately.`
              : `Reactivating ${form.name} will restore their access to the platform.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmToggle(false)}>Cancel</Button>
          <Button
            color={(user?.status === "active" || user?.status === "ACTIVE") ? "error" : "success"}
            variant="contained"
            onClick={handleToggleStatus}
          >
            {(user?.status === "active" || user?.status === "ACTIVE") ? "Deactivate" : "Reactivate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Role Dialog — view mode inline role management */}
      <Dialog open={addRoleOpen} onClose={() => setAddRoleOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Shield size={18} color="#6366f1" />
          Add Role Binding
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Role</InputLabel>
            <Select
              label="Role"
              value={addRoleId}
              onChange={(e) => { setAddRoleId(e.target.value); setAddPartnerId(""); setAddPropertyId(""); }}
            >
              {ROLES.map((r) => (
                <MenuItem key={r.value} value={r.value}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: r.color, flexShrink: 0 }} />
                    {r.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {addRoleDef?.requiresPartner && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Partner *</InputLabel>
              <Select
                label="Partner *"
                value={addPartnerId}
                onChange={(e) => setAddPartnerId(e.target.value)}
                required
              >
                {partners.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {addRoleDef?.requiresProperty && (
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Property *</InputLabel>
              <Select
                label="Property *"
                value={addPropertyId}
                onChange={(e) => setAddPropertyId(e.target.value)}
                required
              >
                {properties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {addRoleDef && (
            <Alert severity="info" sx={{ borderRadius: 1.5, fontSize: "0.8rem" }}>
              {addRoleDef.scopeHint}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setAddRoleOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={
              assignRoleMutation.isPending ||
              (addRoleDef?.requiresPartner === true && !addPartnerId) ||
              (addRoleDef?.requiresProperty === true && !addPropertyId)
            }
            onClick={() => assignRoleMutation.mutate({
              userId: params.id!,
              roleId: addRoleId,
              partnerId: addPartnerId || undefined,
              propertyId: addPropertyId || undefined,
            })}
          >
            {assignRoleMutation.isPending ? "Adding..." : "Add Binding"}
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
