/**
 * PartnerDetailPage — Create/Edit partner with tabbed form.
 *
 * Design: Precision Studio — FusePageCarded-inspired layout with header + tabbed content.
 * Tabs: General, Contact, Properties (read-only list), Settings.
 * Supports both create (/partners/new) and edit (/partners/:id) modes.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab, Divider,
  Alert, Chip, Switch, FormControlLabel, Skeleton,
} from "@mui/material";
import { ArrowLeft, Save, Building2, Phone, MapPin, Globe, Mail } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface PartnerForm {
  name: string;
  business_registration_number: string;
  tax_id: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  city: string;
  country: string;
  website: string;
  is_active: boolean;
}

const EMPTY_FORM: PartnerForm = {
  name: "", business_registration_number: "", tax_id: "",
  contact_person: "", contact_email: "", contact_phone: "",
  address: "", city: "", country: "Thailand", website: "", is_active: true,
};

const DEMO_PARTNER: PartnerForm = {
  name: "Grand Hyatt Hotels", business_registration_number: "BRN-2024-001234", tax_id: "TAX-TH-9876543",
  contact_person: "Somchai Kaewmanee", contact_email: "somchai@grandhyatt.com", contact_phone: "+66-2-254-1234",
  address: "494 Rajdamri Road, Lumpini", city: "Bangkok", country: "Thailand",
  website: "https://www.hyatt.com", is_active: true,
};

export default function PartnerDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<PartnerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) {
      // In production: fetch from API. For now, use demo data.
      setForm(DEMO_PARTNER);
    }
  }, [isNew]);

  const handleChange = (field: keyof PartnerForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Partner name is required"); return; }
    if (!form.contact_email.trim()) { toast.error("Contact email is required"); return; }
    setSaving(true);
    // In production: call API
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Partner created successfully" : "Partner updated successfully");
    if (isNew) navigate("/partners");
  };

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Partner" : form.name || "Partner Details"}
        subtitle={isNew ? "Register a new partner organization" : `Partner ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/partners")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Partner" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={form.is_active ? "active" : "inactive"} />
          <Chip label="2 Properties" size="small" variant="outlined" />
        </Box>
      )}

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
          {!isNew && <Tab label="Properties" />}
          <Tab label="Settings" />
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
              <TextField label="Business Registration Number" fullWidth size="small" value={form.business_registration_number} onChange={handleChange("business_registration_number")} />
              <TextField label="Tax ID" fullWidth size="small" value={form.tax_id} onChange={handleChange("tax_id")} />
              <TextField
                label="Website" fullWidth size="small"
                value={form.website} onChange={handleChange("website")}
                slotProps={{ input: { startAdornment: <Globe size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField label="Address" fullWidth size="small" multiline rows={2} value={form.address} onChange={handleChange("address")} />
              </Box>
              <TextField
                label="City" fullWidth size="small" value={form.city} onChange={handleChange("city")}
                slotProps={{ input: { startAdornment: <MapPin size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField label="Country" fullWidth size="small" value={form.country} onChange={handleChange("country")} />
            </Box>
          )}

          {/* Tab 1: Contact */}
          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Contact Person" required fullWidth size="small" value={form.contact_person} onChange={handleChange("contact_person")} />
              <TextField
                label="Contact Email" required fullWidth size="small" type="email"
                value={form.contact_email} onChange={handleChange("contact_email")}
                slotProps={{ input: { startAdornment: <Mail size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Contact Phone" fullWidth size="small"
                value={form.contact_phone} onChange={handleChange("contact_phone")}
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
              {["Grand Hyatt Bangkok", "Grand Hyatt Erawan"].map((name, i) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, borderBottom: i === 0 ? "1px solid" : "none", borderColor: "divider" }}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>{name}</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>Bangkok, Thailand</Typography>
                  </Box>
                  <StatusChip status="active" />
                </Box>
              ))}
            </Box>
          )}

          {/* Tab 3 (or 2 in create mode): Settings */}
          {((isNew && tab === 2) || (!isNew && tab === 3)) && (
            <Box>
              <FormControlLabel
                control={<Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />}
                label="Active"
              />
              <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, ml: 5.5 }}>
                Inactive partners cannot manage properties or access the platform.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
