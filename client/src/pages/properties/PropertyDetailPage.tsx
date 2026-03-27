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
import { ArrowLeft, Save, Building, MapPin, Clock, DoorOpen, Trash2, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { trpc } from "@/lib/trpc";
import type { Property, Partner, Room } from "@/lib/api/types";
import GuestCMSTab from "@/components/cms/GuestCMSTab";

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
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const isEdit = pathname.endsWith("/edit");

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

  // Load partners for the dropdown via tRPC
  const partnersQuery = trpc.crud.partners.list.useQuery({ page: 1, pageSize: 100 }, { staleTime: 60_000 });
  useEffect(() => {
    if (partnersQuery.data?.items) setPartners(partnersQuery.data.items as any[]);
  }, [partnersQuery.data]);

  // Load property on edit mode via tRPC
  const propertyQuery = trpc.crud.properties.get.useQuery({ id: params.id! }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  const roomsQuery = trpc.crud.rooms.list.useQuery({ page: 1, pageSize: 100 }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  useEffect(() => {
    if (isNew || propertyQuery.isLoading) return;
    if (propertyQuery.data) {
      const p = propertyQuery.data as any;
      setProperty(p);
      setForm({
        name: p.name, partner_id: p.partner_id, type: p.type,
        address: p.address, city: p.city, country: p.country,
        timezone: p.timezone || "Asia/Bangkok", currency: p.currency || "THB",
        phone: p.phone || "", email: p.email || "",
      });
    } else if (propertyQuery.error) {
      setError("Failed to load property.");
    }
    setLoading(false);
  }, [isNew, propertyQuery.data, propertyQuery.error, propertyQuery.isLoading, params.id]);
  useEffect(() => {
    if (roomsQuery.data?.items) setRooms(roomsQuery.data.items as any[]);
  }, [roomsQuery.data]);

  const handleChange = (field: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const utils = trpc.useUtils();
  const createPropertyMutation = trpc.crud.properties.create.useMutation({
    onSuccess: () => { toast.success("Property created successfully"); navigate("/admin/properties"); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to create property."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const updatePropertyMutation = trpc.crud.properties.update.useMutation({
    onSuccess: (updated: any) => { setProperty(updated); toast.success("Property updated successfully"); utils.crud.properties.get.invalidate({ id: params.id! }); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to update property."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const handleSave = () => {
    if (!form.name.trim()) { toast.error("Property name is required"); return; }
    if (!form.partner_id) { toast.error("Please select a partner"); return; }
    setSaving(true);
    const payload = {
      name: form.name, partner_id: form.partner_id, type: form.type,
      address: form.address, city: form.city, country: form.country,
      timezone: form.timezone || undefined, currency: form.currency || undefined,
      phone: form.phone || undefined, email: form.email || undefined,
    };
    if (isNew) {
      createPropertyMutation.mutate(payload);
    } else {
      updatePropertyMutation.mutate({ id: params.id!, ...payload });
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
    deactivatePropertyMutation.mutate({ id: params.id! });
  };
  const deactivatePropertyMutation = trpc.crud.properties.deactivate.useMutation({
    onSuccess: () => { toast.success("Property deactivated"); navigate("/admin/properties"); setDeactivating(false); },
    onError: (err: any) => { toast.error(err?.message || "Failed to deactivate property."); setDeactivating(false); },
  });

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  return (
    <Box>
      <Breadcrumbs
        crumbs={[
          { label: "Onboarding", href: "/admin/onboarding" },
          { label: "Properties", href: "/admin/onboarding" },
          { label: isNew ? "New Property" : form.name || "Property Details" },
        ]}
      />
      <PageHeader
        title={isNew ? "New Property" : form.name || "Property Details"}
        subtitle={isNew ? "Register a new property" : `Property ID: ${params.id}`}
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/admin/properties")}>Back</Button>
            {isEdit && !isNew && (
              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
                Cancel
              </Button>
            )}
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
          {!isNew && <Tab label="Guest CMS" />}
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

          {/* Guest CMS (edit mode only) */}
          {tab === 4 && !isNew && (
            <GuestCMSTab
              propertyId={params.id!}
              propertyName={property?.name || "My Property"}
            />
          )}

          {/* Rooms (edit mode only) */}
          {tab === 3 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="body2" sx={{ color: "text.secondary" }}>
                  Rooms in this property. Manage rooms from the Rooms page.
                </Typography>
                <Button variant="outlined" size="small" onClick={() => navigate("/admin/rooms")}>View All Rooms</Button>
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
