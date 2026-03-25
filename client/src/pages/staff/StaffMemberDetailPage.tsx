/**
 * StaffMemberDetailPage — Create or edit a staff member assignment.
 *
 * New mode: assign a user to a position at a property.
 *   - Can select an existing user OR create a new user inline.
 * Edit mode: update position or status of an existing staff member.
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, MenuItem,
  CircularProgress, Alert, Avatar, Divider, Collapse, IconButton,
  Tooltip, InputAdornment,
} from "@mui/material";
import {
  ArrowLeft, Save, User as UserIcon, Briefcase, Building2,
  UserPlus, ChevronDown, ChevronUp, Mail, Phone, Eye, EyeOff, X,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { staffApi, usersApi, propertiesApi } from "@/lib/api/endpoints";
import { getDemoMembers } from "@/lib/api/demo-data";
import type { StaffMember, StaffPosition, Property, User as UserType } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";

interface MemberForm {
  user_id: string;
  position_id: string;
  property_id: string;
  status: "active" | "inactive" | "on_leave";
}

interface NewUserForm {
  full_name: string;
  email: string;
  mobile: string;
  password: string;
  role: string;
}

const EMPTY_FORM: MemberForm = { user_id: "", position_id: "", property_id: "", status: "active" };
const EMPTY_NEW_USER: NewUserForm = { full_name: "", email: "", mobile: "", password: "", role: "STAFF" };

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

const ROLE_OPTIONS = [
  { value: "STAFF", label: "Staff" },
  { value: "MANAGER", label: "Manager" },
  { value: "FRONT_DESK", label: "Front Desk" },
  { value: "ADMIN", label: "Admin" },
];

export default function StaffMemberDetailPage() {
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const isEdit = pathname.endsWith("/edit");

  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Inline user creation state
  const [createMode, setCreateMode] = useState(false);
  const [newUser, setNewUser] = useState<NewUserForm>(EMPTY_NEW_USER);
  const [showPassword, setShowPassword] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Load positions for dropdown
  const positionsQuery = useQuery({
    queryKey: ["staff", "positions"],
    queryFn: () => staffApi.listPositions(),
    staleTime: 30_000,
  });

  // Load properties for dropdown
  const propertiesQuery = useQuery({
    queryKey: ["properties", "all"],
    queryFn: () => propertiesApi.list({ page_size: 100 }),
    staleTime: 30_000,
  });

  // Load users for dropdown (new mode)
  const usersQuery = useQuery({
    queryKey: ["users", "all"],
    queryFn: () => usersApi.list({ page_size: 200 }),
    staleTime: 30_000,
    enabled: isNew,
  });

  const positions: StaffPosition[] = positionsQuery.data?.items ?? [];
  const properties: Property[] = propertiesQuery.data?.items ?? [];
  const users: UserType[] = usersQuery.data?.items ?? [];

  // Filter out users who already have staff assignments (optional enhancement)
  const availableUsers = useMemo(() => users, [users]);

  // Load member on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await staffApi.listMembers({ page_size: 200 });
        const found = res.items.find((m: StaffMember) => m.id === params.id);
        if (cancelled) return;
        if (found) {
          setMember(found);
          setForm({
            user_id: found.user_id,
            position_id: found.position_id,
            property_id: found.property_id,
            status: found.status,
          });
        } else {
          const demoMembers = getDemoMembers();
          const demoMember = demoMembers.items.find((m: StaffMember) => m.id === params.id);
          if (demoMember) {
            setMember(demoMember);
            setForm({
              user_id: demoMember.user_id,
              position_id: demoMember.position_id,
              property_id: demoMember.property_id,
              status: demoMember.status,
            });
          } else {
            setError("Staff member not found.");
          }
        }
      } catch {
        if (cancelled) return;
        const demoMembers = getDemoMembers();
        const demoMember = demoMembers.items.find((m: StaffMember) => m.id === params.id);
        if (demoMember) {
          setMember(demoMember);
          setForm({
            user_id: demoMember.user_id,
            position_id: demoMember.position_id,
            property_id: demoMember.property_id,
            status: demoMember.status,
          });
        } else {
          setError("Failed to load staff member.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  // ── Create new user inline ──────────────────────────────────────────────────
  const handleCreateUser = async () => {
    if (!newUser.full_name.trim()) { toast.error("Full name is required"); return; }
    if (!newUser.email.trim() || !newUser.email.includes("@")) { toast.error("Valid email is required"); return; }
    if (!newUser.password || newUser.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }

    setCreatingUser(true);
    try {
      const res = await api.post("v1/auth/register", {
        json: {
          email: newUser.email.trim(),
          password: newUser.password,
          full_name: newUser.full_name.trim(),
          mobile: newUser.mobile.trim() || undefined,
          role: newUser.role,
        },
      }).json<{ user_id: string; email: string; full_name: string }>();

      toast.success(`User "${newUser.full_name}" created successfully`);

      // Set the new user as selected
      setForm((prev) => ({ ...prev, user_id: res.user_id }));

      // Refresh users list
      usersQuery.refetch();

      // Collapse the create form
      setCreateMode(false);
      setNewUser(EMPTY_NEW_USER);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || "Failed to create user";
      toast.error(detail);
    } finally {
      setCreatingUser(false);
    }
  };

  // ── Save staff member assignment ────────────────────────────────────────────
  const handleSave = async () => {
    if (isNew) {
      if (!form.user_id) { toast.error("Please select a user"); return; }
      if (!form.position_id) { toast.error("Please select a position"); return; }
      if (!form.property_id) { toast.error("Please select a property"); return; }
    }
    setSaving(true);
    try {
      if (isNew) {
        await staffApi.assignMember({
          user_id: form.user_id,
          position_id: form.position_id,
          property_id: form.property_id,
        });
        toast.success("Staff member assigned successfully");
        navigate("/admin/staff");
      } else {
        await staffApi.updateMember(params.id!, {
          position_id: form.position_id,
          status: form.status,
        });
        toast.success("Staff member updated successfully");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save staff member.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  const initials = member?.name
    ? member.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  // Find the selected user for display
  const selectedUser = availableUsers.find((u) => u.id === form.user_id);

  return (
    <Box>
      <PageHeader
        title={isNew ? "Add Staff Member" : member?.name || "Staff Member Details"}
        subtitle={isNew ? "Assign a user to a staff position" : member?.email}
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/admin/staff")}>
              Back
            </Button>
            {isEdit && !isNew && (
              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
                Cancel
              </Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Assign Member" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && member && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, alignItems: "center" }}>
          <Avatar sx={{ width: 32, height: 32, fontSize: "0.75rem", fontWeight: 600, bgcolor: "primary.main" }}>
            {initials}
          </Avatar>
          <StatusChip status={member.status} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {member.position_title} · {member.property_name}
          </Typography>
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 600, mb: 2.5 }}>
            {isNew ? "Assignment Details" : "Member Details"}
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
            {/* User selector — only in new mode */}
            {isNew && (
              <Box sx={{ gridColumn: { xs: "1", md: "1 / -1" } }}>
                <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <TextField
                    label="User" required fullWidth size="small" select
                    value={form.user_id}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, user_id: e.target.value }));
                      if (e.target.value) setCreateMode(false);
                    }}
                    helperText={selectedUser ? `${selectedUser.email}` : "Select an existing user or create a new one"}
                    slotProps={{ input: { startAdornment: <UserIcon size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
                    disabled={createMode}
                    sx={{ flex: 1 }}
                  >
                    <MenuItem value="">— Select User —</MenuItem>
                    {availableUsers.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </MenuItem>
                    ))}
                  </TextField>

                  <Tooltip title={createMode ? "Cancel new user" : "Create new user"}>
                    <Button
                      variant={createMode ? "contained" : "outlined"}
                      size="small"
                      onClick={() => {
                        setCreateMode(!createMode);
                        if (!createMode) setForm((prev) => ({ ...prev, user_id: "" }));
                      }}
                      startIcon={<UserPlus size={14} />}
                      sx={{ mt: 0.25, whiteSpace: "nowrap", minWidth: 140, height: 40 }}
                    >
                      {createMode ? "Cancel" : "New User"}
                    </Button>
                  </Tooltip>
                </Box>

                {/* ── Inline New User Form ──────────────────────────────────── */}
                <Collapse in={createMode} timeout={300}>
                  <Card
                    variant="outlined"
                    sx={{
                      mt: 2, p: 2.5,
                      borderColor: "primary.main",
                      borderStyle: "dashed",
                      bgcolor: "action.hover",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <UserPlus size={18} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Create New User
                      </Typography>
                    </Box>

                    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                      <TextField
                        label="Full Name" required fullWidth size="small"
                        value={newUser.full_name}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, full_name: e.target.value }))}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><UserIcon size={16} color="#A3A3A3" /></InputAdornment> } }}
                      />
                      <TextField
                        label="Email" required fullWidth size="small" type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Mail size={16} color="#A3A3A3" /></InputAdornment> } }}
                      />
                      <TextField
                        label="Mobile" fullWidth size="small"
                        value={newUser.mobile}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, mobile: e.target.value }))}
                        slotProps={{ input: { startAdornment: <InputAdornment position="start"><Phone size={16} color="#A3A3A3" /></InputAdornment> } }}
                      />
                      <TextField
                        label="Password" required fullWidth size="small"
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                        helperText="Minimum 8 characters"
                        slotProps={{
                          input: {
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </IconButton>
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                      <TextField
                        label="Role" fullWidth size="small" select
                        value={newUser.role}
                        onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                      >
                        {ROLE_OPTIONS.map((r) => (
                          <MenuItem key={r.value} value={r.value}>
                            {r.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>

                    <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                      <Button
                        variant="contained" size="small"
                        startIcon={creatingUser ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <UserPlus size={14} />}
                        onClick={handleCreateUser}
                        disabled={creatingUser}
                      >
                        {creatingUser ? "Creating..." : "Create & Select User"}
                      </Button>
                    </Box>
                  </Card>
                </Collapse>
              </Box>
            )}

            {/* Position selector */}
            <TextField
              label="Position" required fullWidth size="small" select
              value={form.position_id}
              onChange={(e) => setForm((prev) => ({ ...prev, position_id: e.target.value }))}
              helperText="Assign to a staff position"
              slotProps={{ input: { startAdornment: <Briefcase size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
            >
              <MenuItem value="">— Select Position —</MenuItem>
              {positions.map((p) => (
                <MenuItem key={p.id} value={p.id}>
                  {p.title} ({p.department})
                </MenuItem>
              ))}
            </TextField>

            {/* Property selector */}
            {isNew && (
              <TextField
                label="Property" required fullWidth size="small" select
                value={form.property_id}
                onChange={(e) => setForm((prev) => ({ ...prev, property_id: e.target.value }))}
                helperText="Assign to a property"
                slotProps={{ input: { startAdornment: <Building2 size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              >
                <MenuItem value="">— Select Property —</MenuItem>
                {properties.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {/* Status — only in edit mode */}
            {!isNew && (
              <TextField
                label="Status" fullWidth size="small" select
                value={form.status}
                onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as MemberForm["status"] }))}
              >
                {STATUS_OPTIONS.map((s) => (
                  <MenuItem key={s.value} value={s.value}>
                    {s.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
