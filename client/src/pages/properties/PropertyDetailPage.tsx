/**
 * PropertyDetailPage — Create/Edit property with tabbed form.
 *
 * Design: Precision Studio — header + tabs (General, Location, Configuration, Rooms).
 * Supports both create (/properties/new) and edit (/properties/:id) modes.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Switch, FormControlLabel, Chip, MenuItem,
} from "@mui/material";
import { ArrowLeft, Save, Building, MapPin, Clock, DoorOpen } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface PropertyForm {
  name: string;
  partner_id: string;
  property_type: string;
  address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  timezone: string;
  default_checkin_time: string;
  default_checkout_time: string;
  total_rooms: number;
  is_active: boolean;
}

const EMPTY_FORM: PropertyForm = {
  name: "", partner_id: "", property_type: "hotel", address: "", city: "", country: "Thailand",
  latitude: "", longitude: "", timezone: "Asia/Bangkok",
  default_checkin_time: "14:00", default_checkout_time: "12:00", total_rooms: 0, is_active: true,
};

const DEMO_PROPERTY: PropertyForm = {
  name: "Grand Hyatt Bangkok", partner_id: "p-001", property_type: "hotel",
  address: "494 Rajdamri Road, Lumpini, Pathumwan", city: "Bangkok", country: "Thailand",
  latitude: "13.7437", longitude: "100.5412", timezone: "Asia/Bangkok",
  default_checkin_time: "14:00", default_checkout_time: "12:00", total_rooms: 380, is_active: true,
};

const PROPERTY_TYPES = ["hotel", "resort", "serviced_apartment", "hostel", "villa", "restaurant", "cafe", "co_working"];

export default function PropertyDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<PropertyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) setForm(DEMO_PROPERTY);
  }, [isNew]);

  const handleChange = (field: keyof PropertyForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Property name is required"); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Property created successfully" : "Property updated successfully");
    if (isNew) navigate("/properties");
  };

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Property" : form.name || "Property Details"}
        subtitle={isNew ? "Register a new property" : `Property ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/properties")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Property" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={form.is_active ? "active" : "inactive"} />
          <Chip label={`${form.total_rooms} rooms`} size="small" variant="outlined" icon={<DoorOpen size={12} />} />
          <Chip label={form.property_type.replace(/_/g, " ")} size="small" variant="outlined" />
        </Box>
      )}

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
          {!isNew && <Tab label="Rooms" />}
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
                value={form.property_type} onChange={handleChange("property_type")}
              >
                {PROPERTY_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>)}
              </TextField>
              <TextField label="Partner" fullWidth size="small" value={form.partner_id} onChange={handleChange("partner_id")} helperText="Select the partner organization" />
              <TextField label="Total Rooms" fullWidth size="small" type="number" value={form.total_rooms} onChange={handleChange("total_rooms")} />
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
              <TextField label="Latitude" fullWidth size="small" value={form.latitude} onChange={handleChange("latitude")} />
              <TextField label="Longitude" fullWidth size="small" value={form.longitude} onChange={handleChange("longitude")} />
            </Box>
          )}

          {/* Configuration */}
          {tab === 2 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Timezone" fullWidth size="small" value={form.timezone} onChange={handleChange("timezone")} />
              <Box />
              <TextField
                label="Default Check-in Time" fullWidth size="small" type="time"
                value={form.default_checkin_time} onChange={handleChange("default_checkin_time")}
                slotProps={{ input: { startAdornment: <Clock size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> }, inputLabel: { shrink: true } }}
              />
              <TextField
                label="Default Check-out Time" fullWidth size="small" type="time"
                value={form.default_checkout_time} onChange={handleChange("default_checkout_time")}
                slotProps={{ input: { startAdornment: <Clock size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> }, inputLabel: { shrink: true } }}
              />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <FormControlLabel
                  control={<Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />}
                  label="Active"
                />
                <Typography variant="body2" sx={{ color: "text.secondary", ml: 5.5 }}>
                  Inactive properties are hidden from guests and QR codes are suspended.
                </Typography>
              </Box>
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
              {[
                { number: "101", floor: "1", type: "Deluxe", status: "active" },
                { number: "102", floor: "1", type: "Deluxe", status: "active" },
                { number: "201", floor: "2", type: "Suite", status: "active" },
                { number: "301", floor: "3", type: "Presidential Suite", status: "maintenance" },
              ].map((room, i, arr) => (
                <Box key={i} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", py: 1.5, borderBottom: i < arr.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace', minWidth: 48 }}>{room.number}</Typography>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>{room.type}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Floor {room.floor}</Typography>
                    </Box>
                  </Box>
                  <StatusChip status={room.status} />
                </Box>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
