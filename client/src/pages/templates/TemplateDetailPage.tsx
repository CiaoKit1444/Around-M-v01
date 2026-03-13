/**
 * TemplateDetailPage — Create/Edit service template wired to FastAPI.
 * Tabs: General, Items (add/remove catalog items), Assigned Rooms.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, IconButton, Alert, MenuItem, CircularProgress, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import { ArrowLeft, Save, Layers, Plus, Trash2, GripVertical, DoorOpen } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { templatesApi, catalogApi, assignmentsApi } from "@/lib/api/endpoints";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import type { ServiceTemplate, CatalogItem, Room } from "@/lib/api/types";

interface TemplateForm {
  name: string;
  description: string;
  tier: string;
}

const EMPTY_FORM: TemplateForm = { name: "", description: "", tier: "standard" };
const TIERS = ["basic", "standard", "premium", "luxury"];

export default function TemplateDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const [template, setTemplate] = useState<ServiceTemplate | null>(null);
  const [assignedRooms, setAssignedRooms] = useState<Room[]>([]);
  const [allCatalogItems, setAllCatalogItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState("");
  const [error, setError] = useState("");
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Load catalog items for add-item dialog
  useEffect(() => {
    catalogApi.list({ page_size: 200 }).then((res) => setAllCatalogItems(res.items)).catch(() => {});
  }, []);

  // Load template on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const t = await templatesApi.get(params.id!);
        if (cancelled) return;
        setTemplate(t);
        setForm({ name: t.name, description: t.description || "", tier: t.tier });
        // Load assigned rooms
        try {
          const rooms = await assignmentsApi.listByTemplate(params.id!, { page_size: 100 });
          if (!cancelled) setAssignedRooms(rooms.items);
        } catch { /* ignore */ }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.status === 404 ? "Template not found." : "Failed to load template.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  const handleChange = (field: keyof TemplateForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Template name is required"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await templatesApi.create({ name: form.name, description: form.description || undefined, tier: form.tier });
        toast.success("Template created successfully");
        navigate("/templates");
      } else {
        const updated = await templatesApi.update(params.id!, {
          name: form.name, description: form.description || undefined, tier: form.tier,
        });
        setTemplate(updated);
        toast.success("Template updated successfully");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save template.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedCatalogItemId) return;
    setAddingItem(true);
    try {
      const updated = await templatesApi.addItem(params.id!, selectedCatalogItemId);
      setTemplate(updated);
      setShowAddItemDialog(false);
      setSelectedCatalogItemId("");
      toast.success("Item added to template");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to add item.");
    } finally {
      setAddingItem(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const item = template?.items?.find((i) => i.id === itemId);
    const itemName = item?.catalog_item_name ?? itemId;
    const confirmed = await guardConfirm({
      action: "Remove Item from Template",
      description: `Remove "${itemName}" from the ${form.name} template? Rooms using this template will no longer offer this service item.`,
      severity: "warning",
      confirmLabel: "Remove Item",
      audit: {
        entityType: "template",
        entityId: params.id!,
        entityName: form.name,
        details: `Item "${itemName}" removed from template via admin UI`,
      },
    });
    if (!confirmed) return;
    setRemovingItemId(itemId);
    try {
      const updated = await templatesApi.removeItem(params.id!, itemId);
      setTemplate(updated);
      toast.success("Item removed from template");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to remove item.");
    } finally {
      setRemovingItemId(null);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  const items = template?.items || [];
  const totalPrice = items.reduce((sum, i) => sum + i.price, 0);

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Service Template" : form.name || "Template Details"}
        subtitle={isNew ? "Create a service package template" : `Template ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/templates")}>Back</Button>
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Template" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && template && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={template.status} />
          <Chip label={template.tier} size="small" variant="outlined" sx={{ textTransform: "capitalize" }} />
          <Chip label={`${items.length} items`} size="small" variant="outlined" />
          <Chip label={`${template.assigned_rooms_count} rooms`} size="small" variant="outlined" icon={<DoorOpen size={12} />} />
          {totalPrice > 0 && (
            <Chip label={`Total: ${items[0]?.currency || "THB"} ${totalPrice.toLocaleString()}`} size="small" variant="outlined" />
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
          <Tab label="General" icon={<Layers size={14} />} iconPosition="start" />
          <Tab label={`Items (${items.length})`} />
          {!isNew && <Tab label={`Assigned Rooms (${assignedRooms.length})`} icon={<DoorOpen size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Template Name" required fullWidth size="small" value={form.name} onChange={handleChange("name")} />
              <TextField
                label="Tier" fullWidth size="small" select
                value={form.tier} onChange={handleChange("tier")}
              >
                {TIERS.map((t) => <MenuItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</MenuItem>)}
              </TextField>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="Description" fullWidth size="small" multiline rows={3}
                  value={form.description} onChange={handleChange("description")}
                />
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
                {!isNew && (
                  <Button variant="outlined" size="small" startIcon={<Plus size={14} />} onClick={() => setShowAddItemDialog(true)}>
                    Add Item
                  </Button>
                )}
              </Box>

              {isNew ? (
                <Alert severity="info" sx={{ borderRadius: 1.5 }}>
                  Save the template first, then add catalog items to it.
                </Alert>
              ) : items.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Layers size={40} strokeWidth={0.8} color="#A3A3A3" />
                  <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>No items added yet</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Add catalog items to define what services are included in this template.
                  </Typography>
                  <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setShowAddItemDialog(true)}>
                    Add First Item
                  </Button>
                </Box>
              ) : (
                items.map((item, i) => (
                  <Box
                    key={item.id}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.5,
                      py: 1.5, borderBottom: i < items.length - 1 ? "1px solid" : "none", borderColor: "divider",
                    }}
                  >
                    <GripVertical size={14} color="#A3A3A3" style={{ cursor: "grab" }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{item.catalog_item_name}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>{item.provider_name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>
                      {item.currency} {item.price.toLocaleString()}
                    </Typography>
                    <IconButton
                      size="small" color="error"
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={removingItemId === item.id}
                    >
                      {removingItemId === item.id ? <CircularProgress size={14} /> : <Trash2 size={14} />}
                    </IconButton>
                  </Box>
                ))
              )}

              {items.length > 0 && (
                <Box sx={{ display: "flex", justifyContent: "flex-end", pt: 2, borderTop: "1px solid", borderColor: "divider", mt: 1 }}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Total: {items[0]?.currency || "THB"} {totalPrice.toLocaleString()}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Assigned Rooms */}
          {tab === 2 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Rooms currently assigned to this template.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => navigate("/rooms")}>Manage Assignments</Button>
              </Box>
              {assignedRooms.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <DoorOpen size={40} strokeWidth={0.8} color="#A3A3A3" />
                  <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>No rooms assigned</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Assign this template to rooms from the Rooms page.
                  </Typography>
                </Box>
              ) : (
                assignedRooms.map((room, i) => (
                  <Box
                    key={room.id}
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      py: 1.5, borderBottom: i < assignedRooms.length - 1 ? "1px solid" : "none", borderColor: "divider",
                      cursor: "pointer", "&:hover": { bgcolor: "action.hover" }, px: 1, borderRadius: 1,
                    }}
                    onClick={() => navigate(`/rooms/${room.id}`)}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace', minWidth: 48 }}>
                        {room.room_number}
                      </Typography>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.property_name || "—"}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>{room.room_type}</Typography>
                      </Box>
                    </Box>
                    <StatusChip status={room.status} />
                  </Box>
                ))
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <Dialog open={showAddItemDialog} onClose={() => setShowAddItemDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Catalog Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Select a catalog item to add to this template.
          </Typography>
          <TextField
            label="Catalog Item" fullWidth size="small" select
            value={selectedCatalogItemId} onChange={(e) => setSelectedCatalogItemId(e.target.value)}
          >
            {allCatalogItems.length === 0
              ? <MenuItem value="" disabled>Loading items...</MenuItem>
              : allCatalogItems
                  .filter((ci) => !items.some((ti) => ti.catalog_item_id === ci.id))
                  .map((ci) => (
                    <MenuItem key={ci.id} value={ci.id}>
                      {ci.name} — {ci.currency} {ci.price.toLocaleString()} / {ci.unit}
                    </MenuItem>
                  ))
            }
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAddItemDialog(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleAddItem}
            disabled={!selectedCatalogItemId || addingItem}
            startIcon={addingItem ? <CircularProgress size={14} /> : undefined}
          >
            {addingItem ? "Adding..." : "Add Item"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Role Context Guard */}
      {guardDialog}
    </Box>
  );
}
