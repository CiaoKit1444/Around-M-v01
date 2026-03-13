/**
 * RoomDetailPage — Create/Edit room wired to FastAPI.
 * Tabs: General, Service Template (edit mode), QR Code (edit mode).
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import { ArrowLeft, Save, DoorOpen, QrCode, Layers, X } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { roomsApi, propertiesApi, templatesApi } from "@/lib/api/endpoints";
import type { Room, Property, ServiceTemplate } from "@/lib/api/types";

interface RoomForm {
  room_number: string;
  floor: string;
  zone: string;
  room_type: string;
  property_id: string;
}

const EMPTY_FORM: RoomForm = {
  room_number: "", floor: "", zone: "", room_type: "standard", property_id: "",
};

const ROOM_TYPES = ["standard", "deluxe", "suite", "presidential_suite", "villa", "table", "booth", "workspace"];

export default function RoomDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = params.id === "new";

  const [tab, setTab] = useState(0);
  const [form, setForm] = useState<RoomForm>(EMPTY_FORM);
  const [room, setRoom] = useState<Room | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [assigningTemplate, setAssigningTemplate] = useState(false);
  const [removingTemplate, setRemovingTemplate] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [error, setError] = useState("");

  // Load properties and templates for dropdowns
  useEffect(() => {
    propertiesApi.list({ page_size: 100 }).then((res) => setProperties(res.items)).catch(() => {});
    templatesApi.list({ page_size: 100 }).then((res) => setTemplates(res.items)).catch(() => {});
  }, []);

  // Load room on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const r = await roomsApi.get(params.id!);
        if (cancelled) return;
        setRoom(r);
        setForm({
          room_number: r.room_number, floor: r.floor || "", zone: r.zone || "",
          room_type: r.room_type, property_id: r.property_id,
        });
      } catch (err: any) {
        if (!cancelled) setError(err?.response?.status === 404 ? "Room not found." : "Failed to load room.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  const handleChange = (field: keyof RoomForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSave = async () => {
    if (!form.room_number.trim()) { toast.error("Room number is required"); return; }
    if (!form.property_id) { toast.error("Please select a property"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await roomsApi.create({
          room_number: form.room_number, property_id: form.property_id, room_type: form.room_type,
          floor: form.floor || undefined, zone: form.zone || undefined,
        });
        toast.success("Room created successfully");
        navigate("/rooms");
      } else {
        const updated = await roomsApi.update(params.id!, {
          room_number: form.room_number, room_type: form.room_type,
          floor: form.floor || undefined, zone: form.zone || undefined,
        });
        setRoom(updated);
        toast.success("Room updated successfully");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save room.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAssignTemplate = async () => {
    if (!selectedTemplateId) return;
    setAssigningTemplate(true);
    try {
      const updated = await roomsApi.assignTemplate(params.id!, selectedTemplateId);
      setRoom(updated);
      setShowTemplateDialog(false);
      toast.success("Template assigned successfully");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to assign template.");
    } finally {
      setAssigningTemplate(false);
    }
  };

  const handleRemoveTemplate = async () => {
    setRemovingTemplate(true);
    try {
      const updated = await roomsApi.removeTemplate(params.id!);
      setRoom(updated);
      toast.success("Template removed");
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Failed to remove template.");
    } finally {
      setRemovingTemplate(false);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  return (
    <Box>
      <PageHeader
        title={isNew ? "New Room" : `Room ${form.room_number}`}
        subtitle={isNew ? "Add a new room or service spot" : `Room ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/rooms")}>Back</Button>
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Room" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {!isNew && room && (
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <StatusChip status={room.status} />
          <Chip label={room.room_type.replace(/_/g, " ")} size="small" variant="outlined" />
          {room.floor && <Chip label={`Floor ${room.floor}`} size="small" variant="outlined" />}
          {room.template_name && <Chip label={room.template_name} size="small" variant="outlined" icon={<Layers size={12} />} />}
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
          <Tab label="General" icon={<DoorOpen size={14} />} iconPosition="start" />
          {!isNew && <Tab label="Service Template" icon={<Layers size={14} />} iconPosition="start" />}
          {!isNew && <Tab label="QR Code" icon={<QrCode size={14} />} iconPosition="start" />}
        </Tabs>

        <CardContent sx={{ p: 3 }}>
          {/* General */}
          {tab === 0 && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
              <TextField label="Room Number" required fullWidth size="small" value={form.room_number} onChange={handleChange("room_number")} />
              <TextField
                label="Room Type" fullWidth size="small" select
                value={form.room_type} onChange={handleChange("room_type")}
              >
                {ROOM_TYPES.map((t) => <MenuItem key={t} value={t}>{t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</MenuItem>)}
              </TextField>
              <TextField label="Floor" fullWidth size="small" value={form.floor} onChange={handleChange("floor")} />
              <TextField label="Zone" fullWidth size="small" value={form.zone} onChange={handleChange("zone")} helperText="e.g., North Wing, Pool Area" />
              <TextField
                label="Property" required fullWidth size="small" select
                value={form.property_id} onChange={handleChange("property_id")}
                helperText="Select the property this room belongs to"
              >
                {properties.length === 0
                  ? <MenuItem value="" disabled>Loading properties...</MenuItem>
                  : properties.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)
                }
              </TextField>
            </Box>
          )}

          {/* Service Template */}
          {tab === 1 && !isNew && (
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                The service template determines what services are available to guests scanning this room's QR code.
              </Alert>
              {room?.template_id ? (
                <Card variant="outlined" sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box>
                      <Typography variant="h5">{room.template_name}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>Template ID: {room.template_id}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button variant="outlined" size="small" onClick={() => setShowTemplateDialog(true)}>Change Template</Button>
                      <Button
                        variant="text" size="small" color="error"
                        startIcon={removingTemplate ? <CircularProgress size={12} /> : <X size={12} />}
                        onClick={handleRemoveTemplate} disabled={removingTemplate}
                      >
                        Remove
                      </Button>
                    </Box>
                  </Box>
                </Card>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <Layers size={40} strokeWidth={0.8} color="#A3A3A3" />
                  <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>No template assigned</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Assign a service template to define what services guests can order from this room.
                  </Typography>
                  <Button variant="contained" size="small" onClick={() => setShowTemplateDialog(true)}>Assign Template</Button>
                </Box>
              )}
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
              {room?.qr_code_id ? (
                <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                  <Box sx={{ width: 160, height: 160, mx: "auto", mb: 2, bgcolor: "action.hover", borderRadius: 2, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <QrCode size={80} strokeWidth={0.8} color="#404040" />
                  </Box>
                  <Typography variant="body1" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500 }}>
                    {room.qr_code_id}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, justifyContent: "center", mt: 1.5 }}>
                    <Button variant="outlined" size="small" onClick={() => navigate(`/qr/${room.qr_code_id}`)}>View QR Detail</Button>
                  </Box>
                </Card>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <QrCode size={40} strokeWidth={0.8} color="#A3A3A3" />
                  <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>No QR code generated</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Generate a QR code for this room from the QR Management page.
                  </Typography>
                  <Button variant="contained" size="small" onClick={() => navigate("/qr")}>Go to QR Management</Button>
                </Box>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Template Assignment Dialog */}
      <Dialog open={showTemplateDialog} onClose={() => setShowTemplateDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Service Template</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Select a service template to assign to Room {form.room_number}.
          </Typography>
          <TextField
            label="Service Template" fullWidth size="small" select
            value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {templates.length === 0
              ? <MenuItem value="" disabled>Loading templates...</MenuItem>
              : templates.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name} — {t.tier} · {t.items.length} items
                </MenuItem>
              ))
            }
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
          <Button
            variant="contained" onClick={handleAssignTemplate}
            disabled={!selectedTemplateId || assigningTemplate}
            startIcon={assigningTemplate ? <CircularProgress size={14} /> : undefined}
          >
            {assigningTemplate ? "Assigning..." : "Assign Template"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
