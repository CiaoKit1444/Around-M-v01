/**
 * CatalogDetailPage — Create/Edit service catalog item (SKU).
 *
 * Design: Precision Studio — header + tabs (General, Pricing, Terms & Conditions).
 * Supports both create (/catalog/new) and edit (/catalog/:id) modes.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Switch, FormControlLabel, Chip, MenuItem,
} from "@mui/material";
import { ArrowLeft, Save, Package, DollarSign, FileText } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface CatalogForm {
  name: string;
  sku: string;
  provider_id: string;
  category: string;
  description: string;
  unit_price: string;
  currency: string;
  unit: string;
  min_quantity: string;
  max_quantity: string;
  preparation_time_minutes: string;
  terms_and_conditions: string;
  is_active: boolean;
}

const EMPTY_FORM: CatalogForm = {
  name: "", sku: "", provider_id: "", category: "spa_wellness", description: "",
  unit_price: "", currency: "THB", unit: "session", min_quantity: "1", max_quantity: "10",
  preparation_time_minutes: "30", terms_and_conditions: "", is_active: true,
};

const DEMO_ITEM: CatalogForm = {
  name: "Thai Massage (60 min)", sku: "SPA-TM-60", provider_id: "sp-001",
  category: "spa_wellness", description: "Traditional Thai massage performed by certified therapists. Includes aromatherapy oils.",
  unit_price: "1500", currency: "THB", unit: "session", min_quantity: "1", max_quantity: "5",
  preparation_time_minutes: "15", terms_and_conditions: "Cancellation must be made at least 2 hours before the scheduled time. No-show will be charged at full price. Guests with medical conditions should consult with the therapist before the session.",
  is_active: true,
};

const CATEGORIES = ["food_beverage", "spa_wellness", "transportation", "laundry", "concierge", "entertainment", "tour_activity", "retail", "other"];
const UNITS = ["session", "hour", "piece", "set", "trip", "kg", "item", "person"];

export default function CatalogDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<CatalogForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isNew) setForm(DEMO_ITEM); }, [isNew]);

  const handleChange = (field: keyof CatalogForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Item name is required"); return; }
    if (!form.unit_price.trim()) { toast.error("Unit price is required"); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Catalog item created" : "Catalog item updated");
    if (isNew) navigate("/catalog");
  };

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Catalog Item" : form.name}
        subtitle={isNew ? "Add a new service item (SKU)" : `SKU: ${form.sku}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/catalog")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Item" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={form.is_active ? "active" : "inactive"} />
          <Chip label={form.category.replace(/_/g, " ")} size="small" variant="outlined" />
          <Chip label={`${form.currency} ${Number(form.unit_price).toLocaleString()} / ${form.unit}`} size="small" variant="outlined" icon={<DollarSign size={12} />} />
        </Box>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
          <Tab label="General" icon={<Package size={14} />} iconPosition="start" />
          <Tab label="Pricing" icon={<DollarSign size={14} />} iconPosition="start" />
          <Tab label="Terms & Conditions" icon={<FileText size={14} />} iconPosition="start" />
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Item Name" required fullWidth size="small" value={form.name} onChange={handleChange("name")} />
              <TextField label="SKU Code" fullWidth size="small" value={form.sku} onChange={handleChange("sku")} helperText="Auto-generated if left blank" sx={{ "& input": { fontFamily: '"Geist Mono", monospace' } }} />
              <TextField label="Category" fullWidth size="small" select value={form.category} onChange={handleChange("category")}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}</MenuItem>)}
              </TextField>
              <TextField label="Provider" fullWidth size="small" value={form.provider_id} onChange={handleChange("provider_id")} helperText="Select the service provider" />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField label="Description" fullWidth size="small" multiline rows={3} value={form.description} onChange={handleChange("description")} />
              </Box>
              <TextField label="Preparation Time (minutes)" fullWidth size="small" type="number" value={form.preparation_time_minutes} onChange={handleChange("preparation_time_minutes")} />
              <Box>
                <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />} label="Active" />
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Unit Price" required fullWidth size="small" type="number" value={form.unit_price} onChange={handleChange("unit_price")}
                slotProps={{ input: { startAdornment: <DollarSign size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }} />
              <TextField label="Currency" fullWidth size="small" select value={form.currency} onChange={handleChange("currency")}>
                {["THB", "USD", "EUR", "GBP", "JPY", "SGD"].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
              <TextField label="Unit" fullWidth size="small" select value={form.unit} onChange={handleChange("unit")}>
                {UNITS.map((u) => <MenuItem key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</MenuItem>)}
              </TextField>
              <Box />
              <TextField label="Minimum Quantity" fullWidth size="small" type="number" value={form.min_quantity} onChange={handleChange("min_quantity")} />
              <TextField label="Maximum Quantity" fullWidth size="small" type="number" value={form.max_quantity} onChange={handleChange("max_quantity")} />
            </Box>
          )}

          {tab === 2 && (
            <Box>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                Terms and conditions that will be displayed to guests before they request this service.
              </Typography>
              <TextField
                label="Terms & Conditions" fullWidth size="small" multiline rows={8}
                value={form.terms_and_conditions} onChange={handleChange("terms_and_conditions")}
                placeholder="Enter the terms and conditions for this service item..."
              />
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
