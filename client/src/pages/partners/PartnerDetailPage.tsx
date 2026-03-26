/**
 * PartnerDetailPage — Create/Edit partner wired to FastAPI.
 *
 * Supports both create (/partners/new) and edit (/partners/:id) modes.
 * Tabs: General, Contact, Properties (read-only list), Settings.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Alert, Chip, Switch, FormControlLabel, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { ArrowLeft, Save, Building2, Phone, MapPin, Globe, Mail, Trash2, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Partner, Property } from "@/lib/api/types";
import { useRoleContextGuard } from "@/components/RoleContextGuard";

interface PartnerForm {
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
}

const EMPTY_FORM: PartnerForm = {
  name: "", contact_person: "", email: "", phone: "", address: "",
};

export default function PartnerDetailPage() {
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const isEdit = pathname.endsWith("/edit");

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState("");
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Load partner on edit mode via tRPC
  const partnerQuery = trpc.crud.partners.get.useQuery({ id: params.id! }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  const linkedPropsQuery = trpc.crud.properties.list.useQuery({ page: 1, pageSize: 50 }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  useEffect(() => {
    if (isNew || partnerQuery.isLoading) return;
    if (partnerQuery.data) {
      const p = partnerQuery.data as any;
      setPartner(p);
      setForm({ name: p.name, contact_person: p.contact_person || "", email: p.email, phone: p.phone || "", address: p.address || "" });
    } else if (partnerQuery.error) {
      setError("Failed to load partner.");
    }
    setLoading(false);
  }, [isNew, partnerQuery.data, partnerQuery.error, partnerQuery.isLoading, params.id]);
  useEffect(() => {
    if (linkedPropsQuery.data?.items) setProperties(linkedPropsQuery.data.items as any[]);
  }, [linkedPropsQuery.data]);

  const handleChange = (field: keyof PartnerForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const utils = trpc.useUtils();
  const createPartnerMutation = trpc.crud.partners.create.useMutation({
    onSuccess: () => { toast.success("Partner created successfully"); navigate("/admin/partners"); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to create partner."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const updatePartnerMutation = trpc.crud.partners.update.useMutation({
    onSuccess: (updated: any) => { setPartner(updated); toast.success("Partner updated successfully"); utils.crud.partners.get.invalidate({ id: params.id! }); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to update partner."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Partner name is required"); return; }
    if (!form.email.trim()) { toast.error("Contact email is required"); return; }
    setSaving(true);
    if (isNew) {
      createPartnerMutation.mutate({ name: form.name, email: form.email, phone: form.phone || undefined, address: form.address || undefined, contact_person: form.contact_person || undefined });
    } else {
      updatePartnerMutation.mutate({ id: params.id!, name: form.name, email: form.email, phone: form.phone || undefined, address: form.address || undefined, contact_person: form.contact_person || undefined });
    }
  };

  const handleDeactivate = async () => {
    setConfirmDeactivate(false);
    const confirmed = await guardConfirm({
      action: "Deactivate Partner",
      description: `This will suspend ${form.name} and prevent them from accessing the platform. All associated properties will be affected.`,
      severity: "destructive",
      confirmPhrase: form.name,
      confirmLabel: "Deactivate Partner",
      audit: {
        entityType: "partner",
        entityId: params.id!,
        entityName: form.name,
        details: `Partner deactivated via admin UI`,
      },
    });
    if (!confirmed) return;
    setDeactivating(true);
    deactivatePartnerMutation.mutate({ id: params.id! });
  };
  const deactivatePartnerMutation = trpc.crud.partners.deactivate.useMutation({
    onSuccess: () => { toast.success("Partner deactivated"); navigate("/admin/partners"); setDeactivating(false); },
    onError: (err: any) => { toast.error(err?.message || "Failed to deactivate partner."); setDeactivating(false); },
  });

  if (loading) return <DetailSkeleton sections={2} />;

  return (
    <Box>
      <Breadcrumbs
        crumbs={[
          { label: "Onboarding", href: "/admin/onboarding" },
          { label: "Partners", href: "/admin/onboarding" },
          { label: isNew ? "New Partner" : form.name || "Partner Details" },
        ]}
      />
      <PageHeader
        title={isNew ? "New Partner" : form.name || "Partner Details"}
        subtitle={isNew ? "Register a new partner organization" : `Partner ID: ${params.id}`}
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/admin/partners")}>
              Back
            </Button>
            {isEdit && !isNew && (
              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
                Cancel
              </Button>
            )}
            {!isNew && partner?.status === "active" && (
              <Button
                variant="outlined" size="small" color="error"
                startIcon={deactivating ? <CircularProgress size={14} /> : <Trash2 size={14} />}
                onClick={() => setConfirmDeactivate(true)}
                disabled={deactivating}
              >
                Deactivate
              </Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Partner" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && partner && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={partner.status} />
          <Chip label={`${partner.properties_count} Properties`} size="small" variant="outlined" />
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
          <Tab label="General" />
          <Tab label="Contact" />
          {!isNew && <Tab label={`Properties (${properties.length})`} />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* Tab 0: General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Partner Name" required fullWidth size="small"
                value={form.name} onChange={handleChange("name")}
                slotProps={{ input: { startAdornment: <Building2 size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="Address" fullWidth size="small" multiline rows={2}
                  value={form.address} onChange={handleChange("address")}
                  slotProps={{ input: { startAdornment: <MapPin size={16} color="#A3A3A3" style={{ marginRight: 8, alignSelf: "flex-start", marginTop: 8 }} /> } }}
                />
              </Box>
            </Box>
          )}

          {/* Tab 1: Contact */}
          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Contact Person" fullWidth size="small" value={form.contact_person} onChange={handleChange("contact_person")} />
              <TextField
                label="Contact Email" required fullWidth size="small" type="email"
                value={form.email} onChange={handleChange("email")}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Contact Phone" fullWidth size="small"
                value={form.phone} onChange={handleChange("phone")}
                slotProps={{ input: { startAdornment: <Phone size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
            </Box>
          )}

          {/* Tab 2: Properties (edit mode only) */}
          {tab === 2 && !isNew && (
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Properties associated with this partner. Manage properties from the Properties page.
              </Typography>
              {properties.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  No properties linked to this partner yet.
                </Typography>
              ) : (
                properties.map((prop, i) => (
                  <Box
                    key={prop.id}
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      py: 1.5,
                      borderBottom: i < properties.length - 1 ? "1px solid" : "none",
                      borderColor: "divider",
                    }}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{prop.name}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>
                        {prop.city}, {prop.country} · {prop.rooms_count} rooms
                      </Typography>
                    </Box>
                    <StatusChip status={prop.status} />
                  </Box>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Deactivate Confirmation Dialog — first step asks user to confirm intent */}
      <Dialog open={confirmDeactivate} onClose={() => setConfirmDeactivate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Partner</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Are you sure you want to deactivate <strong>{form.name}</strong>? You will be asked to confirm your active role context in the next step.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeactivate(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeactivate}>Proceed</Button>
        </DialogActions>
      </Dialog>

      {/* Role Context Guard — second confirmation with active role display */}
      {guardDialog}
    </Box>
  );
}
