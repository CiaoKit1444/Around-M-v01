/**
 * TemplateDetailPage — Create/Edit service template with item composition.
 *
 * Design: Precision Studio — header + tabs (General, Items, Assigned Rooms).
 * Templates compose catalog items from multiple providers into a named package (e.g., "Basic", "VIP").
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Switch, FormControlLabel, Chip, IconButton, Alert, MenuItem,
} from "@mui/material";
import { ArrowLeft, Save, Layers, Plus, Trash2, GripVertical, DoorOpen } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface TemplateItem {
  id: string;
  catalog_item_name: string;
  provider_name: string;
  price: string;
  currency: string;
  is_optional: boolean;
}

interface TemplateForm {
  name: string;
  description: string;
  tier: string;
  is_active: boolean;
  items: TemplateItem[];
}

const EMPTY_FORM: TemplateForm = {
  name: "", description: "", tier: "standard", is_active: true, items: [],
};

const DEMO_TEMPLATE: TemplateForm = {
  name: "VIP Experience", description: "Premium service package for VIP guests including spa, dining, and transportation.",
  tier: "premium", is_active: true,
  items: [
    { id: "1", catalog_item_name: "Thai Massage (60 min)", provider_name: "Siam Spa & Wellness", price: "1,500", currency: "THB", is_optional: false },
    { id: "2", catalog_item_name: "Room Service - Set Menu", provider_name: "Gourmet Kitchen Co.", price: "2,200", currency: "THB", is_optional: false },
    { id: "3", catalog_item_name: "Airport Transfer (Sedan)", provider_name: "Bangkok Limousine", price: "1,800", currency: "THB", is_optional: true },
    { id: "4", catalog_item_name: "Minibar Refresh", provider_name: "Gourmet Kitchen Co.", price: "500", currency: "THB", is_optional: false },
    { id: "5", catalog_item_name: "Express Laundry", provider_name: "CleanPro Services", price: "350", currency: "THB", is_optional: true },
  ],
};

const TIERS = ["basic", "standard", "premium", "luxury"];

export default function TemplateDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isNew) setForm(DEMO_TEMPLATE); }, [isNew]);

  const handleChange = (field: keyof TemplateForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleRemoveItem = (id: string) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((item) => item.id !== id) }));
  };

  const handleToggleOptional = (id: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item) => item.id === id ? { ...item, is_optional: !item.is_optional } : item),
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Template created" : "Template updated");
    if (isNew) navigate("/templates");
  };

  const requiredItems = form.items.filter((i) => !i.is_optional);
  const optionalItems = form.items.filter((i) => i.is_optional);

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Service Template" : form.name}
        subtitle={isNew ? "Create a service package template" : `Template ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/templates")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={form.is_active ? "active" : "inactive"} />
          <Chip label={form.tier} size="small" variant="outlined" sx={{ textTransform: "capitalize" }} />
          <Chip label={`${form.items.length} items`} size="small" variant="outlined" />
          <Chip label={`${new Set(form.items.map((i) => i.provider_name)).size} providers`} size="small" variant="outlined" />
        </Box>
      )}

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2.5, borderBottom: "1px solid", borderColor: "divider", minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem" } }}>
          <Tab label="General" icon={<Layers size={14} />} iconPosition="start" />
          <Tab label={`Items (${form.items.length})`} />
          {!isNew && <Tab label="Assigned Rooms" icon={<DoorOpen size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Template Name" required fullWidth size="small" value={form.name} onChange={handleChange("name")} />
              <TextField label="Tier" fullWidth size="small" select value={form.tier} onChange={handleChange("tier")}>
                {TIERS.map((t) => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
              </TextField>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField label="Description" fullWidth size="small" multiline rows={3} value={form.description} onChange={handleChange("description")} />
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <FormControlLabel control={<Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />} label="Active" />
              </Box>
            </Box>
          )}

          {/* Items */}
          {tab === 1 && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Compose this template by adding catalog items from different providers.
                </Typography>
                <Button variant="outlined" size="small" startIcon={<Plus size={14} />} onClick={() => toast.info("Feature: Select from catalog items")}>
                  Add Item
                </Button>
              </Box>

              {form.items.length === 0 ? (
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>No items added yet. Click "Add Item" to compose this template.</Alert>
              ) : (
                <>
                  {/* Required Items */}
                  {requiredItems.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1 }}>Required Services</Typography>
                      {requiredItems.map((item) => (
                        <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                          <GripVertical size={14} color="#A3A3A3" style={{ cursor: "grab" }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{item.catalog_item_name}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>{item.provider_name}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>
                            {item.currency} {item.price}
                          </Typography>
                          <IconButton size="small" onClick={() => handleToggleOptional(item.id)} title="Make optional">
                            <Chip label="Required" size="small" color="primary" variant="outlined" sx={{ cursor: "pointer", fontSize: "0.7rem" }} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)}><Trash2 size={14} /></IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Optional Items */}
                  {optionalItems.length > 0 && (
                    <Box>
                      <Typography variant="overline" sx={{ color: "text.secondary", fontWeight: 600, letterSpacing: 1 }}>Optional Add-ons</Typography>
                      {optionalItems.map((item) => (
                        <Box key={item.id} sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider" }}>
                          <GripVertical size={14} color="#A3A3A3" style={{ cursor: "grab" }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>{item.catalog_item_name}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary" }}>{item.provider_name}</Typography>
                          </Box>
                          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>
                            {item.currency} {item.price}
                          </Typography>
                          <IconButton size="small" onClick={() => handleToggleOptional(item.id)} title="Make required">
                            <Chip label="Optional" size="small" variant="outlined" sx={{ cursor: "pointer", fontSize: "0.7rem" }} />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(item.id)}><Trash2 size={14} /></IconButton>
                        </Box>
                      ))}
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Assigned Rooms */}
          {tab === 2 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>Rooms currently assigned to this template.</Typography>
                <Button variant="outlined" size="small" onClick={() => navigate("/rooms")}>Manage Assignments</Button>
              </Box>
              {[
                { number: "101", property: "Grand Hyatt Bangkok", type: "Deluxe" },
                { number: "201", property: "Grand Hyatt Bangkok", type: "Suite" },
                { number: "305", property: "Grand Hyatt Erawan", type: "Presidential Suite" },
              ].map((room, i, arr) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace', minWidth: 48 }}>{room.number}</Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.property}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>{room.type}</Typography>
                    </Box>
                  </Box>
                  <StatusChip status="active" />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
