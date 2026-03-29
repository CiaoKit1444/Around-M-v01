/**
 * ProviderDetailPage — Create/Edit service provider.
 * Tabs: General, Contact, Catalog Items (edit mode only).
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import { ArrowLeft, Save, Truck, Mail, Phone, Package, Trash2, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { trpc } from "@/lib/trpc";
import type { ServiceProvider, CatalogItem } from "@/lib/api/types";

interface ProviderForm {
  name: string;
  category: string;
  service_area: string;
  contact_person: string;
  email: string;
  phone: string;
}

const EMPTY_FORM: ProviderForm = {
  name: "", category: "food_beverage", service_area: "", contact_person: "", email: "", phone: "",
};

const CATEGORIES = [
  "food_beverage", "spa_wellness", "transportation", "laundry",
  "concierge", "entertainment", "tour_activity", "retail", "other",
];

export default function ProviderDetailPage() {
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const isEdit = pathname.endsWith("/edit");

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState("");
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Load provider on edit mode via tRPC
  const providerQuery = trpc.crud.providers.get.useQuery({ id: params.id! }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  const catalogItemsQuery = trpc.crud.catalog.list.useQuery({ page: 1, pageSize: 100 }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  useEffect(() => {
    if (isNew || providerQuery.isLoading) return;
    if (providerQuery.data) {
      const p = providerQuery.data as any;
      setProvider(p);
      setForm({ name: p.name, category: p.category, service_area: p.service_area, contact_person: p.contact_person || "", email: p.email, phone: p.phone || "" });
    } else if (providerQuery.error) {
      setError("Failed to load provider.");
    }
    setLoading(false);
  }, [isNew, providerQuery.data, providerQuery.error, providerQuery.isLoading, params.id]);
  useEffect(() => {
    if (catalogItemsQuery.data?.items) setCatalogItems((catalogItemsQuery.data.items as any[]).filter((i: any) => i.provider_id === params.id));
  }, [catalogItemsQuery.data, params.id]);

  const handleChange = (field: keyof ProviderForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const utils = trpc.useUtils();
  const createProviderMutation = trpc.crud.providers.create.useMutation({
    onSuccess: () => { toast.success("Provider created successfully"); navigate("/admin/providers"); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to create provider."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const updateProviderMutation = trpc.crud.providers.update.useMutation({
    onSuccess: (updated: any) => { setProvider(updated); toast.success("Provider updated successfully"); utils.crud.providers.get.invalidate({ id: params.id! }); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to update provider."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Provider name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    setSaving(true);
    const payload = { name: form.name, category: form.category, service_area: form.service_area, email: form.email, phone: form.phone || undefined, contact_person: form.contact_person || undefined };
    if (isNew) { createProviderMutation.mutate(payload); } else { updateProviderMutation.mutate({ id: params.id!, ...payload }); }
  };

  const handleDeactivate = async () => {
    const confirmed = await guardConfirm({
      action: "Deactivate Service Provider",
      description: `Deactivating "${form.name}" will remove all their catalog items from active service menus. Rooms using their items will no longer offer those services to guests.`,
      severity: "warning",
      confirmLabel: "Deactivate Provider",
      audit: {
        entityType: "provider",
        entityId: params.id!,
        entityName: form.name,
        details: `Service provider deactivated via admin UI`,
      },
    });
    if (!confirmed) return;
    setDeactivating(true);
    deactivateProviderMutation.mutate({ id: params.id! });
  };
  const deactivateProviderMutation = trpc.crud.providers.deactivate.useMutation({
    onSuccess: () => { toast.success("Provider deactivated"); navigate("/admin/providers"); setDeactivating(false); },
    onError: (err: any) => { toast.error(err?.message || "Failed to deactivate provider."); setDeactivating(false); },
  });

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  return (
    <Box>
      <Breadcrumbs
        crumbs={[
          { label: "Service Providers", href: "/admin/providers" },
          { label: isNew ? "New Provider" : form.name || "Provider Details" },
        ]}
      />
      <PageHeader
        title={isNew ? "New Service Provider" : form.name || "Provider Details"}
        subtitle={isNew ? "Onboard a new service provider" : `Provider ID: ${params.id}`}
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/admin/providers")}>Back</Button>
            {isEdit && !isNew && (
              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
                Cancel
              </Button>
            )}
            {!isNew && provider?.status === "active" && (
              <Button
                variant="outlined" size="small" color="error"
                startIcon={deactivating ? <CircularProgress size={14} /> : <Trash2 size={14} />}
                onClick={handleDeactivate} disabled={deactivating}
              >Deactivate</Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Provider" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && provider && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={provider.status} />
          <Chip label={provider.category.replace(/_/g, " ")} size="small" variant="outlined" />
          <Chip label={`${provider.catalog_items_count} items`} size="small" variant="outlined" icon={<Package size={12} />} />
          {provider.rating && <Chip label={`★ ${provider.rating.toFixed(1)}`} size="small" variant="outlined" />}
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
          <Tab label="General" />
          <Tab label="Contact" />
          {!isNew && <Tab label={`Catalog Items (${catalogItems.length})`} />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Provider Name" required fullWidth size="small"
                value={form.name} onChange={handleChange("name")}
                slotProps={{ input: { startAdornment: <Truck size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Category" fullWidth size="small" select
                value={form.category} onChange={handleChange("category")}
              >
                {CATEGORIES.map((c) => (
                  <MenuItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Service Area" fullWidth size="small"
                value={form.service_area} onChange={handleChange("service_area")}
                helperText="e.g., Bangkok, Phuket, Nationwide"
              />
            </Box>
          )}

          {/* Contact */}
          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Contact Person" fullWidth size="small" value={form.contact_person} onChange={handleChange("contact_person")} />
              <TextField
                label="Email" required fullWidth size="small" type="email"
                value={form.email} onChange={handleChange("email")}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Phone" fullWidth size="small"
                value={form.phone} onChange={handleChange("phone")}
                slotProps={{ input: { startAdornment: <Phone size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
            </Box>
          )}

          {/* Catalog Items */}
          {tab === 2 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Catalog items offered by this provider.
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Package size={14} />} onClick={() => navigate("/admin/catalog/new")}>
                  Add Item
                </Button>
              </Box>
              {catalogItems.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Package size={40} strokeWidth={0.8} color="#A3A3A3" />
                  <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>No catalog items yet</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>Add items to define what services this provider offers.</Typography>
                </Box>
              ) : (
                catalogItems.map((item, i) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      py: 1.5, borderBottom: i < catalogItems.length - 1 ? "1px solid" : "none", borderColor: "divider",
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, px: 1, borderRadius: 1,
                    }}
                    onClick={() => navigate(`/admin/catalog/${item.id}`)}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{item.name}</Typography>
                      <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary" }}>
                        {item.currency} {item.price.toLocaleString()} · {item.unit} · {item.category}
                      </Typography>
                    </Box>
                    <StatusChip status={item.status} />
                  </Box>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Role Context Guard */}
      {guardDialog}
    </Box>
  );
}
