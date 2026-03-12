/**
 * ProviderDetailPage — Create/Edit service provider.
 *
 * Design: Precision Studio — header + tabs (General, Contact, Catalog Items).
 * Supports both create (/providers/new) and edit (/providers/:id) modes.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Switch, FormControlLabel, Chip, MenuItem,
} from "@mui/material";
import { ArrowLeft, Save, Truck, Mail, Phone, Globe, Package } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface ProviderForm {
  name: string;
  category: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  description: string;
  commission_rate: string;
  is_active: boolean;
}

const EMPTY_FORM: ProviderForm = {
  name: "", category: "food_beverage", contact_person: "", contact_email: "",
  contact_phone: "", website: "", description: "", commission_rate: "15", is_active: true,
};

const DEMO_PROVIDER: ProviderForm = {
  name: "Siam Spa & Wellness", category: "spa_wellness", contact_person: "Nattaya Pongsakorn",
  contact_email: "nattaya@siamspa.com", contact_phone: "+66-2-111-2222",
  website: "https://siamspa.com", description: "Premium spa and wellness services for luxury hotels",
  commission_rate: "20", is_active: true,
};

const CATEGORIES = ["food_beverage", "spa_wellness", "transportation", "laundry", "concierge", "entertainment", "tour_activity", "retail", "other"];

export default function ProviderDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<ProviderForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isNew) setForm(DEMO_PROVIDER); }, [isNew]);

  const handleChange = (field: keyof ProviderForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Provider name is required"); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Provider created" : "Provider updated");
    if (isNew) navigate("/providers");
  };

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Service Provider" : form.name}
        subtitle={isNew ? "Onboard a new service provider" : `Provider ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/providers")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Provider" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={form.is_active ? "active" : "inactive"} />
          <Chip label={form.category.replace(/_/g, " ")} size="small" variant="outlined" />
          <Chip label={`${form.commission_rate}% commission`} size="small" variant="outlined" />
        </Box>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
          <Tab label="General" />
          <Tab label="Contact" />
          {!isNew && <Tab label="Catalog Items" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Provider Name" required fullWidth size="small" value={form.name} onChange={handleChange("name")}
                slotProps={{ input: { startAdornment: <Truck size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }} />
              <TextField label="Category" fullWidth size="small" select value={form.category} onChange={handleChange("category")}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())}</MenuItem>)}
              </TextField>
              <TextField label="Commission Rate (%)" fullWidth size="small" type="number" value={form.commission_rate} onChange={handleChange("commission_rate")} />
              <TextField label="Website" fullWidth size="small" value={form.website} onChange={handleChange("website")}
                slotProps={{ input: { startAdornment: <Globe size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }} />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField label="Description" fullWidth size="small" multiline rows={3} value={form.description} onChange={handleChange("description")} />
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />} label="Active" />
              </Box>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Contact Person" fullWidth size="small" value={form.contact_person} onChange={handleChange("contact_person")} />
              <TextField label="Contact Email" fullWidth size="small" type="email" value={form.contact_email} onChange={handleChange("contact_email")}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }} />
              <TextField label="Contact Phone" fullWidth size="small" value={form.contact_phone} onChange={handleChange("contact_phone")}
                slotProps={{ input: { startAdornment: <Phone size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }} />
            </Box>
          )}

          {tab === 2 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>Catalog items offered by this provider.</Typography>
                <Button variant="outlined" size="small" startIcon={<Package size={14} />} onClick={() => navigate("/catalog")}>View Catalog</Button>
              </Box>
              {[
                { name: "Thai Massage (60 min)", price: "1,500", currency: "THB", status: "active" },
                { name: "Aromatherapy (90 min)", price: "2,800", currency: "THB", status: "active" },
                { name: "Hot Stone Therapy", price: "3,200", currency: "THB", status: "draft" },
              ].map((item, i, arr) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{item.name}</Typography>
                    <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "text.secondary" }}>{item.currency} {item.price}</Typography>
                  </Box>
                  <StatusChip status={item.status} />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
