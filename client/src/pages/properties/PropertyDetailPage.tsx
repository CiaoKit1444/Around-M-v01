/**
 * PropertyDetailPage — Create/Edit property wired to FastAPI.
 * Tabs: General, Location, Configuration, Rooms (edit mode only).
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import { ArrowLeft, Save, Building, MapPin, Clock, DoorOpen, Trash2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { propertiesApi, partnersApi, roomsApi } from "@/lib/api/endpoints";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import type { Property, Partner, Room } from "@/lib/api/types";

interface PropertyForm {
  name: string;
  partner_id: string;
  type: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  phone: string;
  email: string;
}

const EMPTY_FORM: PropertyForm = {
  name: "", partner_id: "", type: "hotel", address: "", city: "", country: "Thailand",
  timezone: "Asia/Bangkok", currency: "THB", phone: "", email: "",
};

const PROPERTY_TYPES = ["hotel", "resort", "serviced_apartment", "hostel", "villa", "restaurant", "cafe", "co_working"];
const TIMEZONES = ["Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Asia/Dubai", "Europe/London", "America/New_York"];
const CURRENCIES = ["THB", "USD", "EUR", "SGD", "JPY", "AED", "GBP"];

export default function PropertyDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<PropertyForm>(EMPTY_FORM);
  const [property, setProperty] = useState<Property | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [error, setError] = useState("");
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Load partners for the dropdown
  useEffect(() => {
    partnersApi.list({ page_size: 100 })
      .then((res) => setPartners(res.items))
      .catch(() => {});
  }, []);

  // Load property on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const p = await propertiesApi.get(params.id!);
        if (cancelled) return;
        setProperty(p);
        setForm({
          name: p.name, partner_id: p.partner_id, type: p.type,
          address: p.address, city: p.city, country: p.country,
          timezone: p.timezone || "Asia/Bangkok", currency: p.currency || "THB",
          phone: p.phone || "", email: p.email || "",
        });
        // Load linked rooms
        try {
          const roomsRes = await roomsApi.list({ property_id: params.id!, page_size: 100 });
          if (!cancelled) setRooms(roomsRes.items);
        } catch { /* ignore */ }
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.status === 404 ? "Property not found." : "Failed to load property.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  const handleChange = (field: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Property name is required"); return; }
    if (!form.partner_id) { toast.error("Please select a partner"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await propertiesApi.create({
          name: form.name, partner_id: form.partner_id, type: form.type,
          address: form.address, city: form.city, country: form.country,
          timezone: form.timezone || undefined, currency: form.currency || undefined,
          phone: form.phone || undefined, email: form.email || undefined,
        });
        toast.success("Property created successfully");
        navigate("/properties");
      } else {
        const updated = await propertiesApi.update(params.id!, {
          name: form.name, partner_id: form.partner_id, type: form.type,
          address: form.address, city: form.city, country: form.country,
          timezone: form.timezone || undefined, currency: form.currency || undefined,
          phone: form.phone || undefined, email: form.email || undefined,
        });
        setProperty(updated);
        toast.success("Property updated successfully");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save property.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    setConfirmDeactivate(false);
    const confirmed = await guardConfirm({
      action: "Deactivate Property",
      description: `Deactivating ${form.name} will suspend all active QR codes and hide the property from guests. This action can be reversed by a super-admin.`,
      severity: "warning",
      confirmLabel: "Deactivate Property",
      audit: {
        entityType: "property",
        entityId: params.id!,
        entityName: form.name,
        details: `Property deactivated via admin UI`,
      },
    });
    if (!confirmed) return;
    setDeactivating(true);
    try {
      await propertiesApi.deactivate(params.id!);
      toast.success("Property deactivated");
      navigate("/properties");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to deactivate property.");
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Property" : form.name || "Property Details"}
        subtitle={isNew ? "Register a new property" : `Property ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/properties")}>Back</Button>
            {!isNew && property?.status === "active" && (
              <Button
                variant="outlined" size="small" color="error"
                startIcon={deactivating ? <CircularProgress size={14} /> : <Trash2 size={14} />}
                onClick={() => setConfirmDeactivate(true)} disabled={deactivating}
              >Deactivate</Button>
            )}
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Property" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && property && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={property.status} />
          <Chip label={`${property.rooms_count} rooms`} size="small" variant="outlined" icon={<DoorOpen size={12} />} />
          <Chip label={property.type.replace(/_/g, " ")} size="small" variant="outlined" />
          <Chip label={property.currency} size="small" variant="outlined" />
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
          <Tab label="Location" />
          <Tab label="Configuration" />
          {!isNew && <Tab label={`Rooms (${rooms.length})`} />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Property Name" required fullWidth size="small"
                value={form.name} onChange={handleChange("name")}
                slotProps={{ input: { startAdornment: <Building size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              />
              <TextField
                label="Property Type" fullWidth size="small" select
                value={form.type} onChange={handleChange("type")}
              >
                {PROPERTY_TYPES.map((t) => (
                  <MenuItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="Partner" required fullWidth size="small" select
                value={form.partner_id} onChange={handleChange("partner_id")}
                helperText="Select the partner organization"
              >
                {partners.length === 0
                  ? <MenuItem value="" disabled>Loading partners...</MenuItem>
                  : partners.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)
                }
              </TextField>
              <TextField label="Phone" fullWidth size="small" value={form.phone} onChange={handleChange("phone")} />
              <TextField label="Email" fullWidth size="small" type="email" value={form.email} onChange={handleChange("email")} />
            </Box>
          )}

          {/* Location */}
          {tab === 1 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField
                  label="Address" fullWidth size="small" multiline rows={2}
                  value={form.address} onChange={handleChange("address")}
                  slotProps={{ input: { startAdornment: <MapPin size={16} color="#A3A3A3" style={{ marginRight: 8, alignSelf: "flex-start", marginTop: 4 }} /> } }}
                />
              </Box>
              <TextField label="City" fullWidth size="small" value={form.city} onChange={handleChange("city")} />
              <TextField label="Country" fullWidth size="small" value={form.country} onChange={handleChange("country")} />
            </Box>
          )}

          {/* Configuration */}
          {tab === 2 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField
                label="Timezone" fullWidth size="small" select
                value={form.timezone} onChange={handleChange("timezone")}
                slotProps={{ input: { startAdornment: <Clock size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
              >
                {TIMEZONES.map((tz) => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </TextField>
              <TextField
                label="Currency" fullWidth size="small" select
                value={form.currency} onChange={handleChange("currency")}
              >
                {CURRENCIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Box>
          )}

          {/* Rooms (edit mode only) */}
          {tab === 3 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Rooms in this property. Manage rooms from the Rooms page.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => navigate("/rooms")}>View All Rooms</Button>
              </Box>
              {rooms.length === 0 ? (
                <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center", py: 4 }}>
                  No rooms found for this property.
                </Typography>
              ) : (
                rooms.map((room, i) => (
                  <Box
                    key={room.id}
                    sx={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      py: 1.5, borderBottom: i < rooms.length - 1 ? "1px solid" : "none", borderColor: "divider",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace', minWidth: 48 }}>
                        {room.room_number}
                      </Typography>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.room_type}</Typography>
                        <Typography variant="body2" sx={{ color: "text.secondary" }}>
                          {room.floor ? `Floor ${room.floor}` : "No floor"}
                          {room.template_name ? ` · ${room.template_name}` : ""}
                        </Typography>
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

      {/* Deactivate Confirmation */}
      <Dialog open={confirmDeactivate} onClose={() => setConfirmDeactivate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Property</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Deactivating <strong>{form.name}</strong> will suspend all active QR codes and hide the property from guests. This action can be reversed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeactivate(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={handleDeactivate}>Deactivate</Button>
        </DialogActions>
      </Dialog>
      {/* Role Context Guard */}
      {guardDialog}
    </Box>
  );
}
