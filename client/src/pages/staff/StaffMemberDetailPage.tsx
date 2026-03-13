/**
 * StaffMemberDetailPage — Create or edit a staff member assignment.
 *
 * New mode: assign a user to a position at a property.
 * Edit mode: update position or status of an existing staff member.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, MenuItem,
  CircularProgress, Alert, Avatar,
} from "@mui/material";
import { ArrowLeft, Save, User as UserIcon, Briefcase, Building2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { staffApi, usersApi, propertiesApi } from "@/lib/api/endpoints";
import { getDemoMembers } from "@/lib/api/demo-data";
import type { StaffMember, StaffPosition, Property, User as UserType } from "@/lib/api/types";
import { useQuery } from "@tanstack/react-query";

interface MemberForm {
  user_id: string;
  position_id: string;
  property_id: string;
  status: "active" | "inactive" | "on_leave";
}

const EMPTY_FORM: MemberForm = { user_id: "", position_id: "", property_id: "", status: "active" };

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "on_leave", label: "On Leave" },
];

export default function StaffMemberDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";

  const [form, setForm] = useState<MemberForm>(EMPTY_FORM);
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  // Load member on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Try to find the member from the list (no individual GET endpoint)
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
          // Demo fallback
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
        // Demo fallback
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
        navigate("/staff");
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

  return (
    <Box>
      <PageHeader
        title={isNew ? "Add Staff Member" : member?.name || "Staff Member Details"}
        subtitle={isNew ? "Assign a user to a staff position" : member?.email}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/staff")}>
              Back
            </Button>
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
              <TextField
                label="User" required fullWidth size="small" select
                value={form.user_id}
                onChange={(e) => setForm((prev) => ({ ...prev, user_id: e.target.value }))}
                helperText="Select the user to assign as staff"
                slotProps={{ input: { startAdornment: <UserIcon size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              >
                <MenuItem value="">— Select User —</MenuItem>
                {users.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} ({u.email})
                  </MenuItem>
                ))}
              </TextField>
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
