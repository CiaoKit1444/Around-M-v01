/**
 * RoomDetailPage — Create/Edit room wired to FastAPI.
 * Tabs: General, Service Template (edit mode), QR Code (edit mode).
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, Tabs, Tab,
  Chip, MenuItem, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, Divider, Skeleton, Tooltip,
} from "@mui/material";
import { ArrowLeft, Save, DoorOpen, QrCode, Layers, X, Package, Tag, Clock, Star, ChevronRight } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import Breadcrumbs from "@/components/shared/Breadcrumbs";
import { DetailSkeleton } from "@/components/ui/DataStates";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";
import { useRoleContextGuard } from "@/components/RoleContextGuard";
import { trpc } from "@/lib/trpc";
import type { Room, Property, ServiceTemplate } from "@/lib/api/types";
import { TabErrorBoundary } from "@/components/TabErrorBoundary";
import QRBatchGenerateDialog from "@/components/dialogs/QRBatchGenerateDialog";
import { QRCodeImage } from "@/components/QRCodeImage";

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
  const [pathname, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const isEdit = pathname.endsWith("/edit");

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
  const [deactivating, setDeactivating] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const { confirm: guardConfirm, RoleContextGuardDialog: guardDialog } = useRoleContextGuard();

  // Load properties and templates for dropdowns via tRPC
  const propertiesQuery = trpc.crud.properties.list.useQuery({ page: 1, pageSize: 100 }, { staleTime: 60_000 });
  const templatesQuery = trpc.crud.templates.list.useQuery({ page: 1, pageSize: 100 }, { staleTime: 60_000 });

  // Load full template details for the preview card
  const templateId = room?.template_id ?? null;
  const templateDetailsQuery = trpc.crud.templates.get.useQuery(
    { id: templateId! },
    { enabled: !!templateId, staleTime: 60_000 }
  );
  useEffect(() => {
    if (propertiesQuery.data?.items) setProperties(propertiesQuery.data.items as any[]);
  }, [propertiesQuery.data]);
  useEffect(() => {
    if (templatesQuery.data?.items) setTemplates(templatesQuery.data.items as any[]);
  }, [templatesQuery.data]);

  // Load room on edit mode via tRPC
  const roomQuery = trpc.crud.rooms.get.useQuery({ id: params.id! }, { enabled: !isNew && !!params.id, staleTime: 30_000 });
  useEffect(() => {
    if (isNew || roomQuery.isLoading) return;
    if (roomQuery.data) {
      const r = roomQuery.data as any;
      setRoom(r);
      setForm({ room_number: r.room_number, floor: r.floor || "", zone: r.zone || "", room_type: r.room_type, property_id: r.property_id });
    } else if (roomQuery.error) {
      setError("Failed to load room.");
    }
    setLoading(false);
  }, [isNew, roomQuery.data, roomQuery.error, roomQuery.isLoading, params.id]);

  const handleChange = (field: keyof RoomForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  // Group template items by category for the preview card
  const templateDetails = templateDetailsQuery.data as any;
  const categorisedItems = useMemo(() => {
    if (!templateDetails?.items) return [];
    const map = new Map<string, any[]>();
    for (const item of templateDetails.items) {
      const cat = (item as any).category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(item);
    }
    return Array.from(map.entries()).map(([category, items]) => ({ category, items }));
  }, [templateDetails]);

  const utils = trpc.useUtils();
  const createRoomMutation = trpc.crud.rooms.create.useMutation({
    onSuccess: () => { toast.success("Room created successfully"); navigate("/admin/onboarding"); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to create room."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const updateRoomMutation = trpc.crud.rooms.update.useMutation({
    onSuccess: (updated: any) => { setRoom(updated); toast.success("Room updated successfully"); utils.crud.rooms.get.invalidate({ id: params.id! }); setSaving(false); },
    onError: (err: any) => { const msg = err?.message || "Failed to update room."; setError(msg); toast.error(msg); setSaving(false); },
  });
  const handleSave = () => {
    if (!form.room_number.trim()) { toast.error("Room number is required"); return; }
    if (!form.property_id) { toast.error("Please select a property"); return; }
    setSaving(true);
    if (isNew) {
      createRoomMutation.mutate({ room_number: form.room_number, property_id: form.property_id, room_type: form.room_type, floor: form.floor || undefined, zone: form.zone || undefined });
    } else {
      updateRoomMutation.mutate({ id: params.id!, room_number: form.room_number, room_type: form.room_type, floor: form.floor || undefined, zone: form.zone || undefined });
    }
  };

  const assignTemplateMutation = trpc.crud.rooms.assignTemplate.useMutation({
    onSuccess: (updated: any) => { setRoom(updated); setShowTemplateDialog(false); toast.success("Template assigned successfully"); utils.crud.rooms.get.invalidate({ id: params.id! }); setAssigningTemplate(false); },
    onError: (err: any) => { toast.error(err?.message || "Failed to assign template."); setAssigningTemplate(false); },
  });
  const handleAssignTemplate = () => {
    if (!selectedTemplateId) return;
    setAssigningTemplate(true);
    assignTemplateMutation.mutate({ roomId: params.id!, templateId: selectedTemplateId });
  };
  const removeTemplateMutation = trpc.crud.rooms.removeTemplate.useMutation({
    onSuccess: (updated: any) => { setRoom(updated); toast.success("Template removed"); setRemovingTemplate(false); utils.crud.rooms.get.invalidate({ id: params.id! }); },
    onError: (err: any) => { toast.error(err?.message || "Failed to remove template."); setRemovingTemplate(false); },
  });
  const handleRemoveTemplate = () => {
    setRemovingTemplate(true);
    removeTemplateMutation.mutate({ roomId: params.id! });
  };

  const handleDeactivate = async () => {
    const confirmed = await guardConfirm({
      action: "Deactivate Room",
      description: `Deactivating Room ${form.room_number} will take it offline. Guests will no longer be able to scan its QR code or submit service requests until it is reactivated.`,
      severity: "warning",
      confirmLabel: "Deactivate Room",
      audit: {
        entityType: "room",
        entityId: params.id!,
        entityName: `Room ${form.room_number}`,
        details: `Room deactivated via admin UI`,
      },
    });
    if (!confirmed) return;
    setDeactivating(true);
    deactivateRoomMutation.mutate({ id: params.id! });
  };
  const deactivateRoomMutation = trpc.crud.rooms.update.useMutation({
    onSuccess: (updated: any) => { setRoom(updated); toast.success(`Room ${form.room_number} deactivated`); setDeactivating(false); },
    onError: (err: any) => { toast.error(err?.message || "Failed to deactivate room."); setDeactivating(false); },
  });

  if (loading) {
    return <DetailSkeleton sections={2} />;
  }

  return (
    <Box>
      <Breadcrumbs
        crumbs={[
          { label: "Onboarding", href: "/admin/onboarding" },
          { label: "Rooms", href: "/admin/onboarding" },
          { label: isNew ? "New Room" : `Room ${form.room_number}` },
        ]}
      />
      <PageHeader
        badge={!isNew && isEdit ? { label: "Editing", color: "warning" } : undefined}
        title={isNew ? "New Room" : `Room ${form.room_number}`}
        subtitle={isNew ? "Add a new room or service spot" : `Room ID: ${params.id}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/admin/onboarding")}>Back</Button>
            {isEdit && !isNew && (
              <Button variant="outlined" size="small" color="error" startIcon={<X size={14} />} onClick={() => navigate(pathname.replace(/\/edit$/, ""))}>
                Cancel
              </Button>
            )}
            {!isNew && room && room.status === "active" && (
              <Button
                variant="outlined" size="small" color="error"
                startIcon={deactivating ? <CircularProgress size={14} /> : undefined}
                onClick={handleDeactivate} disabled={deactivating}
              >
                {deactivating ? "Deactivating..." : "Deactivate"}
              </Button>
            )}
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
          <Chip label={(room.room_type || "standard").replace(/_/g, " ")} size="small" variant="outlined" />
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
            <TabErrorBoundary tabName="General">
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
            </TabErrorBoundary>
          )}

          {/* Service Template */}
          {tab === 1 && !isNew && (
            <TabErrorBoundary tabName="Service Template">
            <Box>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
                The service template determines what services are available to guests scanning this room's QR code.
              </Alert>
              {room?.template_id ? (
                <Box>
                  {/* Header card: name, tier, actions */}
                  <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2 }}>
                        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                          <Box sx={{ mt: 0.25, flexShrink: 0, width: 36, height: 36, borderRadius: 1.5, bgcolor: "primary.main", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Layers size={18} color="#fff" />
                          </Box>
                          <Box sx={{ minWidth: 0 }}>
                            {templateDetailsQuery.isLoading ? (
                              <>
                                <Skeleton width={200} height={28} />
                                <Skeleton width={120} height={20} sx={{ mt: 0.5 }} />
                              </>
                            ) : (
                              <>
                                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                                  {templateDetails?.name || room.template_name || "Service Template"}
                                </Typography>
                                <Box sx={{ display: "flex", gap: 1, mt: 0.75, flexWrap: "wrap", alignItems: "center" }}>
                                  {templateDetails?.tier && (
                                    <Chip label={templateDetails.tier} size="small" color="primary" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                                  )}
                                  <Chip label={templateDetails?.status || "active"} size="small"
                                    color={templateDetails?.status === "active" ? "success" : "default"}
                                    variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
                                  <Typography variant="caption" sx={{ color: "text.disabled", fontFamily: "monospace" }}>
                                    {room.template_id}
                                  </Typography>
                                </Box>
                                {templateDetails?.description && (
                                  <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", lineHeight: 1.5 }}>
                                    {templateDetails.description}
                                  </Typography>
                                )}
                              </>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
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
                    </CardContent>
                  </Card>

                  {/* Services preview: grouped by category */}
                  {templateDetailsQuery.isLoading ? (
                    <Card variant="outlined">
                      <CardContent sx={{ p: 2.5, "&:last-child": { pb: 2.5 } }}>
                        {[1, 2, 3].map((i) => (
                          <Box key={i} sx={{ mb: 2 }}>
                            <Skeleton width={100} height={20} sx={{ mb: 1 }} />
                            {[1, 2].map((j) => <Skeleton key={j} height={40} sx={{ mb: 0.5 }} />)}
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  ) : categorisedItems.length > 0 ? (
                    <Card variant="outlined">
                      <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
                        <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
                          <Package size={15} />
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            Included Services
                          </Typography>
                          <Chip label={`${templateDetails?.items?.length ?? 0} items`} size="small"
                            sx={{ ml: "auto", fontSize: "0.7rem", height: 20 }} />
                        </Box>
                        {categorisedItems.map(({ category, items }, catIdx) => (
                          <Box key={category}>
                            {/* Category header */}
                            <Box sx={{ px: 2.5, py: 1, bgcolor: "action.hover", display: "flex", alignItems: "center", gap: 1 }}>
                              <Tag size={12} />
                              <Typography variant="caption" sx={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, color: "text.secondary" }}>
                                {category}
                              </Typography>
                              <Chip label={items.length} size="small" sx={{ ml: "auto", height: 16, fontSize: "0.65rem", "& .MuiChip-label": { px: 0.75 } }} />
                            </Box>
                            {/* Service items */}
                            {items.map((item: any, itemIdx: number) => (
                              <Box key={item.id}>
                                <Box sx={{ px: 2.5, py: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}>
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
                                      {item.catalog_item_name}
                                    </Typography>
                                    <Box sx={{ display: "flex", gap: 1.5, mt: 0.25, alignItems: "center" }}>
                                      {item.duration_minutes && (
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                                          <Clock size={10} color="#9E9E9E" />
                                          <Typography variant="caption" sx={{ color: "text.disabled" }}>{item.duration_minutes} min</Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Box>
                                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: "primary.main" }}>
                                      {item.currency} {Number(item.price).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem" }}>
                                      per {item.unit || "each"}
                                    </Typography>
                                  </Box>
                                </Box>
                                {itemIdx < items.length - 1 && <Divider sx={{ mx: 2.5 }} />}
                              </Box>
                            ))}
                            {catIdx < categorisedItems.length - 1 && <Divider />}
                          </Box>
                        ))}
                        {/* Footer: link to full template */}
                        <Box sx={{ px: 2.5, py: 1.25, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            size="small" variant="text" endIcon={<ChevronRight size={14} />}
                            onClick={() => navigate(`/admin/templates/${room.template_id}`)}
                          >
                            View Full Template
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card variant="outlined">
                      <CardContent sx={{ py: 3, textAlign: "center" }}>
                        <Package size={32} strokeWidth={0.8} color="#BDBDBD" />
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
                          This template has no service items yet.
                        </Typography>
                        <Button size="small" variant="text" sx={{ mt: 1 }} endIcon={<ChevronRight size={14} />}
                          onClick={() => navigate(`/admin/templates/${room.template_id}`)}
                        >
                          Add items in Template Editor
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </Box>
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
            </TabErrorBoundary>
          )}
          {/* QR Code */}
          {tab === 2 && !isNew && (
            <TabErrorBoundary tabName="QR Code">
            <Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Box>
                  <Typography variant="h5">QR Code</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    QR code for this room. Guests scan this to access services.
                  </Typography>
                </Box>
                <Button
                  variant="outlined" size="small"
                  onClick={() => room?.qr_code_id
                    ? navigate(`/admin/qr/${(room as any).qr_db_id || room.qr_code_id}`)
                    : setQrDialogOpen(true)
                  }
                >
                  {room?.qr_code_id ? "View QR Detail" : "Assign QR"}
                </Button>
              </Box>
              {room?.qr_code_id ? (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "auto 1fr" }, gap: 3, alignItems: "start" }}>
                  {/* Left — real QR image */}
                  <Card variant="outlined" sx={{ p: 2.5, textAlign: "center", minWidth: 200 }}>
                    <Box sx={{ mx: "auto", mb: 1.5, display: "inline-block" }}>
                      <QRCodeImage
                        url={`${window.location.origin}/guest/scan/${room.qr_code_id}`}
                        size={160}
                        errorCorrectionLevel="M"
                      />
                    </Box>
                    <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontWeight: 500, fontSize: "0.7rem", wordBreak: "break-all" }}>
                      {room.qr_code_id}
                    </Typography>
                    {(room as any).qr_access_type && (
                      <Chip
                        label={(room as any).qr_access_type === "restricted" ? "Restricted" : "Public"}
                        size="small"
                        color={(room as any).qr_access_type === "restricted" ? "warning" : "success"}
                        sx={{ mt: 1 }}
                      />
                    )}
                    <Box sx={{ mt: 1.5 }}>
                      <Button
                        variant="outlined" size="small" fullWidth
                        onClick={() => navigate(`/admin/qr/${(room as any).qr_db_id || room.qr_code_id}`)}
                      >
                        View QR Detail
                      </Button>
                    </Box>
                  </Card>

                  {/* Right — inline template assignment */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>Service Template</Typography>
                    <Alert severity="info" sx={{ mb: 1.5, borderRadius: 1.5, py: 0.5 }}>
                      The service template determines what services guests see after scanning.
                    </Alert>
                    {room?.template_id ? (
                      <Card variant="outlined" sx={{ p: 2 }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>{(room as any).template_name || room.template_id}</Typography>
                            <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.75rem" }}>ID: {room.template_id}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <Button variant="outlined" size="small" onClick={() => setShowTemplateDialog(true)}>Change</Button>
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
                      <Box sx={{ py: 2, textAlign: "center", border: "1px dashed", borderColor: "divider", borderRadius: 1.5 }}>
                        <Layers size={28} strokeWidth={0.8} color="#A3A3A3" />
                        <Typography variant="body2" sx={{ mt: 1, color: "text.secondary", mb: 1.5 }}>
                          No template assigned — guests won't see any services.
                        </Typography>
                        <Button variant="contained" size="small" startIcon={<Layers size={13} />} onClick={() => setShowTemplateDialog(true)}>
                          Assign Template
                        </Button>
                      </Box>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 4 }}>
                  <QrCode size={40} strokeWidth={0.8} color="#A3A3A3" />
                  <Typography variant="body1" sx={{ mt: 1.5, fontWeight: 500 }}>No QR code assigned</Typography>
                  <Typography variant="body2" sx={{ color: "text.secondary", mb: 2 }}>
                    Generate a QR code for this room to let guests scan and access services.
                  </Typography>
                  <Button
                    variant="contained" size="small"
                    startIcon={<QrCode size={14} />}
                    onClick={() => setQrDialogOpen(true)}
                  >
                    Generate QR Code
                  </Button>
                </Box>
              )}
            </Box>
            </TabErrorBoundary>
          )}
        </CardContent>
      </Card>

      {/* QR Batch Generate Dialog — pre-seeded with this room */}
      {room && (
        <QRBatchGenerateDialog
          open={qrDialogOpen}
          onClose={() => setQrDialogOpen(false)}
          propertyId={(room as any).property_id}
          propertyName={(room as any).property_name || ""}
          preSelectedRoomIds={[room.id]}
          onSuccess={() => {
            setQrDialogOpen(false);
            // Invalidate the room query so qr_code_id refreshes without a full reload
            utils.crud.rooms.get.invalidate({ id: params.id! });
          }}
        />
      )}

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
                  {t.name} — {t.tier || "standard"} · {(t.items || []).length} items
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
      {/* Role Context Guard */}
      {guardDialog}
    </Box>
  );
}
