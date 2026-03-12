/**
 * RoomDetailPage — Create/Edit room with template assignment.
 *
 * Design: Precision Studio — header + tabs (General, Template, QR Code).
 * Supports both create (/rooms/new) and edit (/rooms/:id) modes.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Switch, FormControlLabel, Chip, MenuItem, Alert,
} from "@mui/material";
import { ArrowLeft, Save, DoorOpen, QrCode, Layers } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface RoomForm {
  room_number: string;
  floor: string;
  room_type: string;
  property_id: string;
  description: string;
  is_active: boolean;
}

const EMPTY_FORM: RoomForm = {
  room_number: "", floor: "", room_type: "standard", property_id: "", description: "", is_active: true,
};

const DEMO_ROOM: RoomForm = {
  room_number: "101", floor: "1", room_type: "deluxe", property_id: "pr-001", description: "Deluxe room with city view", is_active: true,
};

const ROOM_TYPES = ["standard", "deluxe", "suite", "presidential_suite", "villa", "table", "booth", "workspace"];

export default function RoomDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) setForm(DEMO_ROOM);
  }, [isNew]);

  const handleChange = (field: keyof RoomForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = async () => {
    if (!form.room_number.trim()) { toast.error("Room number is required"); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    toast.success(isNew ? "Room created successfully" : "Room updated successfully");
    if (isNew) navigate("/rooms");
  };

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Room" : `Room ${form.room_number}`}
        subtitle={isNew ? "Add a new room or service spot" : `Room ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/rooms")}>Back</Button>
            <Button variant="contained" size="small" startIcon={<Save size={14} />} onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : isNew ? "Create Room" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={form.is_active ? "active" : "inactive"} />
          <Chip label={form.room_type.replace(/_/g, " ")} size="small" variant="outlined" />
          <Chip label={`Floor ${form.floor}`} size="small" variant="outlined" />
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
          <Tab label="General" icon={<DoorOpen size={14} />} iconPosition="start" />
          {!isNew && <Tab label="Service Template" icon={<Layers size={14} />} iconPosition="start" />}
          {!isNew && <Tab label="QR Code" icon={<QrCode size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Room Number" required fullWidth size="small" value={form.room_number} onChange={handleChange("room_number")} />
              <TextField label="Floor" fullWidth size="small" value={form.floor} onChange={handleChange("floor")} />
              <TextField label="Room Type" fullWidth size="small" select value={form.room_type} onChange={handleChange("room_type")}>
                {ROOM_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>)}
              </TextField>
              <TextField label="Property" fullWidth size="small" value={form.property_id} onChange={handleChange("property_id")} helperText="Select the property this room belongs to" />
              <Box sx={{ gridColumn: "1 / -1" }}>
                <TextField label="Description" fullWidth size="small" multiline rows={3} value={form.description} onChange={handleChange("description")} />
              </Box>
              <Box sx={{ gridColumn: "1 / -1" }}>
                <FormControlLabel
                  control={<Switch checked={form.is_active} onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))} />}
                  label="Active"
                />
              </Box>
            </Box>
          )}

          {/* Service Template */}
          {tab === 1 && !isNew && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                The service template determines what services are available to guests scanning this room's QR code.
              </Alert>
              <Card variant="outlined" sx={{ p: 2.5 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography variant="h5">VIP Experience</Typography>
                    <Typography variant="body2" sx={{ color: "text.secondary" }}>5 services from 3 providers</Typography>
                  </Box>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button variant="outlined" size="small" onClick={() => navigate("/templates")}>Change Template</Button>
                    <Button variant="text" size="small" color="error">Remove</Button>
                  </Box>
                </Box>
                <Box sx={{ mt: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {["Room Service", "Spa Treatment", "Airport Transfer", "Minibar", "Laundry"].map((s) => (
                    <Chip key={s} label={s} size="small" variant="outlined" />
                  ))}
                </Box>
              </Card>
            </Box>
          )}

          {/* QR Code */}
          {tab === 2 && !isNew && (
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h5">QR Code</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    QR code for this room. Guests scan this to access services.
                  </Typography>
                </Box>
                <Button variant="outlined" size="small" onClick={() => navigate("/qr")}>Manage QR</Button>
              </Box>
              <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                <Box sx={{ width: 160, height: 160, mx: "auto", mb: 2, bgcolor: "action.hover", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <QrCode size={80} strokeWidth={0.8} color="#404040" />
                </Box>
                <Typography variant="body1" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>PA-QR-20260312-a1b2c3d4</Typography>
                <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 1.5 }}>
                  <StatusChip status="active" />
                  <Chip label="PUBLIC" size="small" variant="outlined" />
                </Box>
              </Card>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
