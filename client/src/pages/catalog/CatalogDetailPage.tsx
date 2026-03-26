/**
 * CatalogDetailPage — Create/Edit catalog item wired to FastAPI.
 * Tabs: General, Pricing, Terms & Conditions.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert,
} from "@mui/material";
import { ArrowLeft, Save, Package, DollarSign, FileText, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { catalogApi, providersApi } from "@/lib/api/endpoints";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import type { CatalogItem, ServiceProvider } from "@/lib/api/types";

interface CatalogForm {
  name: string;
  sku: string;
  provider_id: string;
  category: string;
  description: string;
  price: string;
  currency: string;
  unit: string;
  duration_minutes: string;
  terms: string;
}

const EMPTY_FORM: CatalogForm = {
  name: "", sku: "", provider_id: "", category: "spa_wellness", description: "",
  price: "", currency: "THB", unit: "session", duration_minutes: "", terms: "",
};

const CATEGORIES = [
  "food_beverage", "spa_wellness", "transportation", "laundry",
  "concierge", "entertainment", "tour_activity", "retail", "other",
];
const UNITS = ["session", "hour", "piece", "set", "trip", "kg", "item", "person"];
const CURRENCIES = ["THB", "USD", "EUR", "GBP", "JPY", "SGD"];

export default function CatalogDetailPage() {
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const isEdit = pathname.endsWith("/edit");

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState("");
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Load providers for dropdown
  useEffect(() => {
    providersApi.list({ page_size: 100 }).then((res) => setProviders(res.items)).catch(() => {});
  }, []);

  // Load catalog item on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const ci = await catalogApi.get(params.id!);
        if (cancelled) return;
        setItem(ci);
        setForm({
          name: ci.name, sku: ci.sku, provider_id: ci.provider_id, category: ci.category,
          description: ci.description || "", price: String(ci.price), currency: ci.currency,
          unit: ci.unit, duration_minutes: ci.duration_minutes ? String(ci.duration_minutes) : "",
          terms: ci.terms || "",
        });
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.status === 404 ? "Item not found." : "Failed to load catalog item.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  const handleChange = (field: keyof CatalogForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (!form.price.trim() || isNaN(Number(form.price))) { toast.error("Valid unit price is required"); return; }
    if (!form.provider_id) { toast.error("Please select a provider"); return; }
    // Guard price changes on existing items — price edits affect all active templates
    if (!isNew && item && Number(form.price) !== item.price) {
      const confirmed = await guardConfirm({
        action: "Update Catalog Item Price",
        description: `You are changing the price of "${form.name}" from ${item.currency} ${item.price.toLocaleString()} to ${form.currency} ${Number(form.price).toLocaleString()}. This will affect all templates and future orders using this item.`,
        severity: "warning",
        confirmLabel: "Save Price Change",
        audit: {
          entityType: "catalog",
          entityId: params.id!,
          entityName: form.name,
          details: `Price changed from ${item.price} to ${Number(form.price)} ${form.currency}`,
        },
      });
      if (!confirmed) return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await catalogApi.create({
          name: form.name, sku: form.sku, provider_id: form.provider_id, category: form.category,
          description: form.description || undefined, price: Number(form.price),
          currency: form.currency || undefined, unit: form.unit || undefined,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
          terms: form.terms || undefined,
        });
        toast.success("Catalog item created successfully");
        navigate("/admin/catalog");
      } else {
        const updated = await catalogApi.update(params.id!, {
          name: form.name, sku: form.sku, provider_id: form.provider_id, category: form.category,
          description: form.description || undefined, price: Number(form.price),
          currency: form.currency || undefined, unit: form.unit || undefined,
          duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : undefined,
          terms: form.terms || undefined,
        });
        setItem(updated);
        toast.success("Catalog item updated successfully");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save catalog item.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    const confirmed = await guardConfirm({
      action: "Deactivate Catalog Item",
      description: `Deactivating "${form.name}" will remove it from all service menus. Templates that include this item will no longer display it to guests.`,
      severity: "warning",
      confirmLabel: "Deactivate Item",
      audit: {
        entityType: "catalog",
        entityId: params.id!,
        entityName: form.name,
        details: `Catalog item deactivated via admin UI`,
      },
    });
    if (!confirmed) return;
    setDeactivating(true);
    try {
      const updated = await catalogApi.deactivate(params.id!);
      setItem(updated);
      toast.success("Catalog item deactivated");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to deactivate catalog item.");
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  return (
    <Box>
      <Breadcrumbs
        crumbs={[
          { label: "Service Catalog", href: "/admin/catalog" },
          { label: isNew ? "New Item" : form.name || "Catalog Item" },
        ]}
      />
      <PageHeader
        title={isNew ? "New Catalog Item" : form.name || "Catalog Item"}
	        subtitle={isNew ? "Add a new service item (SKU)" : `SKU: ${form.sku || params.id}`}
	        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
	        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/admin/catalog")}>Back</Button>
	            {isEdit && !isNew && (
	              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
	                Cancel
	              </Button>
	            )}
            {!isNew && item && item.status === "active" && (
              <Button
                variant="outlined" size="small" color="error"
                startIcon={deactivating ? <CircularProgress size={14} /> : undefined}
                onClick={handleDeactivate} disabled={deactivating}
              >
                {deactivating ? "Deactivating..." : "Deactivate"}
              </Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Item" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && item && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={item.status} />
          <Chip label={item.category.replace(/_/g, " ")} size="small" variant="outlined" />
          <Chip
            label={`${item.currency} ${item.price.toLocaleString()} / ${item.unit}`}
            size="small" variant="outlined"
            icon={<DollarSign size={12} />}
          />
          {item.duration_minutes && (
            <Chip label={`${item.duration_minutes} min`} size="small" variant="outlined" />
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
          <Tab label="General" icon={<Package size={14} />} iconPosition="start" />
          <Tab label="Pricing" icon={<DollarSign size={14} />} iconPosition="start" />
          <Tab label="Terms & Conditions" icon={<FileText size={14} />} iconPosition="start" />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Item Name" required fullWidth size="small" value={form.name} onChange={handleChange("name")} />
              <TextField
                label="SKU Code" fullWidth size="small" value={form.sku} onChange={handleChange("sku")}
                helperText="Auto-generated if left blank"
                sx={{ "& input": { fontFamily: '"Geist Mono", monospace' } }}
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
                label="Provider" required fullWidth size="small" select
                value={form.provider_id} onChange={handleChange("provider_id")}
              >
                {providers.length === 0
                  ? <MenuItem value="" disabled>Loading providers...</MenuItem>
                  : providers.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)
                }
              </TextField>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="Description" fullWidth size="small" multiline rows={3}
                  value={form.description} onChange={handleChange("description")}
                />
              </Box>
              <TextField
                label="Duration (minutes)" fullWidth size="small" type="number"
                value={form.duration_minutes} onChange={handleChange("duration_minutes")}
                helperText="Leave blank if not applicable"
              />
            </Box>
          )}

          {/* Pricing */}
          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Unit Price" required fullWidth size="small" type="number"
                value={form.price} onChange={handleChange("price")}
                slotProps={{ input: { startAdornment: <DollarSign size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Currency" fullWidth size="small" select
                value={form.currency} onChange={handleChange("currency")}
              >
                {CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField
                label="Unit" fullWidth size="small" select
                value={form.unit} onChange={handleChange("unit")}
              >
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>)}
              </TextField>
            </Box>
          )}

          {/* Terms & Conditions */}
          {tab === 2 && (
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Terms and conditions displayed to guests before they request this service.
              </Typography>
              <TextField
                label="Terms & Conditions" fullWidth size="small" multiline rows={8}
                value={form.terms} onChange={handleChange("terms")}
                placeholder="Enter the terms and conditions for this service item..."
              />
            </Box>
          )}
        </CardContent>
      </Card>
      {/* Role Context Guard */}
      {guardDialog}
    </Box>
  );
}
