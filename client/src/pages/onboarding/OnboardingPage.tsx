/**
 * OnboardingPage — Unified drill-down: Partner → Service Area → Service Unit
 *
 * Design: Three-section progressive disclosure
 *   Section 1: Partner Carousel (always visible)
 *   Section 2: Service Area Grid (appears when a Partner is selected)
 *   Section 3: Service Unit DataTable (appears when a Service Area is selected)
 *
 * Terminology:
 *   Partner      = Partner (unchanged)
 *   Service Area = Property (renamed)
 *   Service Unit = Room (renamed)
 */
import { useState, useMemo, useRef, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Button, Chip, CircularProgress,
  Alert, Tooltip, IconButton, Divider, LinearProgress,
  Drawer, TextField, Select, MenuItem, FormControl, InputLabel,
  Dialog, DialogTitle, DialogContent, DialogActions, FormHelperText,
} from "@mui/material";
import {
  Plus, ChevronRight, Building2, DoorOpen, QrCode, CheckCircle2,
  AlertCircle, Settings, Eye, Edit, RefreshCw, Handshake,
  MapPin, Globe, Phone, Mail, Users, LayoutGrid, Layers,
} from "lucide-react";
import { MaterialReactTable, type MRT_ColumnDef, useMaterialReactTable } from "material-react-table";
import { useLocation } from "wouter";
import { usePartners, useProperties, useRooms, useGenerateQR, useBulkCreateRooms } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoPartners, getDemoProperties, getDemoRooms } from "@/lib/api/demo-data";
import StatusChip from "@/components/shared/StatusChip";
import { TableSkeleton } from "@/components/ui/DataStates";
import { toast } from "sonner";
import type { Partner, Property, Room } from "@/lib/api/types";

// ─── Status dot helper ────────────────────────────────────────
function StatusDot({ status }: { status: string }) {
  const color =
    status === "active" ? "#22c55e" :
    status === "pending" ? "#f59e0b" : "#94a3b8";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: 8, height: 8,
        borderRadius: "50%",
        backgroundColor: color,
        flexShrink: 0,
      }}
    />
  );
}

// ─── Breadcrumb ───────────────────────────────────────────────
function Breadcrumb({
  partner, serviceArea, onPartnerClick, onServiceAreaClick,
}: {
  partner?: Partner | null;
  serviceArea?: Property | null;
  onPartnerClick: () => void;
  onServiceAreaClick: () => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, flexWrap: "wrap", mb: 3 }}>
      <Typography
        variant="body2"
        sx={{ color: "text.secondary", cursor: "pointer", "&:hover": { color: "primary.main" } }}
        onClick={onPartnerClick}
      >
        All Partners
      </Typography>
      {partner && (
        <>
          <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          <Typography
            variant="body2"
            sx={{
              color: serviceArea ? "text.secondary" : "text.primary",
              fontWeight: serviceArea ? 400 : 600,
              cursor: serviceArea ? "pointer" : "default",
              "&:hover": serviceArea ? { color: "primary.main" } : {},
            }}
            onClick={serviceArea ? onServiceAreaClick : undefined}
          >
            {partner.name}
          </Typography>
        </>
      )}
      {serviceArea && (
        <>
          <ChevronRight size={14} style={{ color: "#94a3b8" }} />
          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
            {serviceArea.name}
          </Typography>
        </>
      )}
    </Box>
  );
}

// ─── Partner Card ─────────────────────────────────────────────
function PartnerCard({
  partner, isSelected, onClick, qrBound, qrTotal,
}: {
  partner: Partner;
  isSelected: boolean;
  onClick: () => void;
  qrBound: number;
  qrTotal: number;
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: "2px solid",
        borderColor: isSelected ? "primary.main" : "divider",
        borderRadius: 2,
        transition: "all 0.15s ease",
        boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.15)" : "none",
        "&:hover": {
          // Lighter tint on hover so it's visually distinct from the solid selected border
          borderColor: isSelected ? "primary.main" : "rgba(99,102,241,0.45)",
          boxShadow: isSelected ? "0 0 0 3px rgba(99,102,241,0.15)" : "0 0 0 2px rgba(99,102,241,0.08)",
          transform: "translateY(-1px)",
        },
        position: "relative",
        overflow: "visible",
      }}
    >
      {isSelected && (
        <Box
          sx={{
            position: "absolute",
            top: -8, right: -8,
            width: 20, height: 20,
            borderRadius: "50%",
            bgcolor: "primary.main",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <CheckCircle2 size={12} color="white" />
        </Box>
      )}
      {/* Completion badge — only when not selected (avoids overlap with check) */}
      {!isSelected && qrTotal > 0 && qrBound === qrTotal && (
        <Tooltip title="All units QR-bound — Ready!">
          <Box
            sx={{
              position: "absolute",
              top: -8, right: -8,
              width: 22, height: 22,
              borderRadius: "50%",
              bgcolor: "success.main",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 2px white",
            }}
          >
            <CheckCircle2 size={13} color="white" />
          </Box>
        </Tooltip>
      )}
      {!isSelected && qrTotal === 0 && (
        <Tooltip title="No service units yet">
          <Box
            sx={{
              position: "absolute",
              top: -8, right: -8,
              width: 22, height: 22,
              borderRadius: "50%",
              bgcolor: "warning.main",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 2px white",
            }}
          >
            <AlertCircle size={13} color="white" />
          </Box>
        </Tooltip>
      )}
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 1.5,
              bgcolor: isSelected ? "primary.main" : "action.hover",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background-color 0.15s",
            }}
          >
            <Handshake size={20} color={isSelected ? "white" : "#6366f1"} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.25 }}
              noWrap
            >
              {partner.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <StatusDot status={partner.status} />
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "capitalize" }}>
                {partner.status}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: qrTotal > 0 ? 1.5 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Building2 size={13} color="#94a3b8" />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {partner.properties_count ?? 0} Service Areas
            </Typography>
          </Box>
          {partner.contact_person && (
            <Typography variant="caption" sx={{ color: "text.secondary" }} noWrap>
              {partner.contact_person}
            </Typography>
          )}
        </Box>

        {/* QR completion progress */}
        {qrTotal > 0 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <QrCode size={11} color="#94a3b8" />
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                  QR Setup
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: qrBound === qrTotal ? "success.main" : "text.secondary",
                }}
              >
                {qrBound}/{qrTotal}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={qrTotal > 0 ? Math.round((qrBound / qrTotal) * 100) : 0}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  bgcolor: qrBound === qrTotal ? "success.main" : "primary.main",
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ─── New Partner Card ─────────────────────────────────────────
function NewPartnerCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: "2px dashed",
        borderColor: "divider",
        borderRadius: 2,
        transition: "all 0.15s ease",
        "&:hover": {
          borderColor: "primary.main",
          bgcolor: "action.hover",
        },
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 130,
      }}
    >
      <CardContent sx={{ textAlign: "center", p: 2 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: "50%",
            bgcolor: "action.hover",
            display: "flex", alignItems: "center", justifyContent: "center",
            mx: "auto", mb: 1,
          }}
        >
          <Plus size={20} color="#6366f1" />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "primary.main" }}>
          New Partner
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Add a new partner
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Service Area Card ────────────────────────────────────────
function ServiceAreaCard({
  property, isSelected, onClick, qrBound, qrTotal, onQuickSetup,
}: {
  property: Property;
  isSelected: boolean;
  onClick: () => void;
  qrBound: number;
  qrTotal: number;
  onQuickSetup?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: "2px solid",
        borderColor: isSelected ? "secondary.main" : "divider",
        borderRadius: 2,
        transition: "all 0.15s ease",
        boxShadow: isSelected ? "0 0 0 3px rgba(139,92,246,0.15)" : "none",
        "&:hover": {
          // Use a lighter tint on hover so it's visually distinct from the solid selected border
          borderColor: isSelected ? "secondary.main" : "rgba(139,92,246,0.45)",
          boxShadow: isSelected ? "0 0 0 3px rgba(139,92,246,0.15)" : "0 0 0 2px rgba(139,92,246,0.08)",
          transform: "translateY(-1px)",
        },
        position: "relative",
        overflow: "visible",
      }}
    >
      {isSelected && (
        <Box
          sx={{
            position: "absolute",
            top: -8, right: -8,
            width: 20, height: 20,
            borderRadius: "50%",
            bgcolor: "secondary.main",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <CheckCircle2 size={12} color="white" />
        </Box>
      )}
      <CardContent sx={{ p: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 1.5,
              bgcolor: isSelected ? "secondary.main" : "action.hover",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background-color 0.15s",
            }}
          >
            <Building2 size={20} color={isSelected ? "white" : "#8b5cf6"} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 600, lineHeight: 1.3, mb: 0.25 }}
              noWrap
            >
              {property.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <StatusDot status={property.status} />
              <Typography variant="caption" sx={{ color: "text.secondary", textTransform: "capitalize" }}>
                {property.status}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          {property.city && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MapPin size={11} color="#94a3b8" />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                {property.city}
              </Typography>
            </Box>
          )}
          {property.type && (
            <Chip label={property.type} size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: qrTotal > 0 ? 1.5 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <DoorOpen size={13} color="#94a3b8" />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {property.rooms_count ?? 0} Units
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <QrCode size={13} color="#94a3b8" />
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {property.active_qr_count ?? 0} QR
            </Typography>
          </Box>
        </Box>

        {/* QR completion progress */}
        {qrTotal > 0 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <QrCode size={11} color="#94a3b8" />
                <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.65rem" }}>
                  QR Setup
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  color: qrBound === qrTotal ? "success.main" : "text.secondary",
                }}
              >
                {qrBound}/{qrTotal}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={qrTotal > 0 ? Math.round((qrBound / qrTotal) * 100) : 0}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: "action.hover",
                "& .MuiLinearProgress-bar": {
                  bgcolor: qrBound === qrTotal ? "success.main" : "secondary.main",
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}

        {/* Quick Setup button — only when no rooms and handler provided */}
        {onQuickSetup && (property.rooms_count ?? 0) === 0 && (
          <Box sx={{ mt: 1.5 }} onClick={(e) => e.stopPropagation()}>
            <Button
              fullWidth
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<LayoutGrid size={13} />}
              onClick={(e) => {
                e.stopPropagation();
                onQuickSetup();
              }}
              sx={{ fontSize: "0.7rem" }}
            >
              Quick Setup
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

// ─── New Service Area Card ────────────────────────────────────
function NewServiceAreaCard({ onClick }: { onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: "2px dashed",
        borderColor: "divider",
        borderRadius: 2,
        transition: "all 0.15s ease",
        "&:hover": {
          borderColor: "secondary.main",
          bgcolor: "action.hover",
        },
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 150,
      }}
    >
      <CardContent sx={{ textAlign: "center", p: 2 }}>
        <Box
          sx={{
            width: 40, height: 40, borderRadius: "50%",
            bgcolor: "action.hover",
            display: "flex", alignItems: "center", justifyContent: "center",
            mx: "auto", mb: 1,
          }}
        >
          <Plus size={20} color="#8b5cf6" />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600, color: "secondary.main" }}>
          New Service Area
        </Typography>
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          Add a property
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function OnboardingPage() {
  const [, navigate] = useLocation();
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedServiceArea, setSelectedServiceArea] = useState<Property | null>(null);

  // ── QR Assignment Drawer state ──
  const [qrDrawerRoom, setQrDrawerRoom] = useState<Room | null>(null);
  const [qrAccessType, setQrAccessType] = useState<"public" | "restricted">("public");
  const generateQR = useGenerateQR();

  const handleAssignQR = async () => {
    if (!qrDrawerRoom || !selectedServiceArea) return;
    try {
      await generateQR.mutateAsync({
        property_id: selectedServiceArea.id,
        room_ids: [qrDrawerRoom.id],
        access_type: qrAccessType,
      });
      toast.success(`QR code generated for Unit ${qrDrawerRoom.room_number}`);
      setQrDrawerRoom(null);
    } catch {
      toast.error("Failed to generate QR code. Please try again.");
    }
  };

  // ── Bulk Seed Rooms Modal state ──
  const [bulkSeedArea, setBulkSeedArea] = useState<Property | null>(null);
  const [bulkFloors, setBulkFloors] = useState("1");
  const [bulkRoomsPerFloor, setBulkRoomsPerFloor] = useState("10");
  const [bulkRoomType, setBulkRoomType] = useState("Standard");
  const [bulkZone, setBulkZone] = useState("");
  const bulkCreateRooms = useBulkCreateRooms();

  const handleBulkSeed = async () => {
    if (!bulkSeedArea) return;
    const floors = Math.max(1, Math.min(50, parseInt(bulkFloors) || 1));
    const perFloor = Math.max(1, Math.min(100, parseInt(bulkRoomsPerFloor) || 10));
    const rooms = [];
    for (let f = 1; f <= floors; f++) {
      for (let r = 1; r <= perFloor; r++) {
        const roomNum = `${f}${String(r).padStart(2, "0")}`;
        rooms.push({
          property_id: bulkSeedArea.id,
          room_number: roomNum,
          floor: String(f),
          zone: bulkZone || undefined,
          room_type: bulkRoomType,
        });
      }
    }
    try {
      await bulkCreateRooms.mutateAsync({ property_id: bulkSeedArea.id, rooms });
      toast.success(`Created ${rooms.length} service units in ${bulkSeedArea.name}`);
      setBulkSeedArea(null);
    } catch {
      toast.error("Failed to create rooms. Please try again.");
    }
  };

  // ── Scroll refs for smooth drill-down ──
  const serviceAreaSectionRef = useRef<HTMLDivElement>(null);
  const serviceUnitSectionRef = useRef<HTMLDivElement>(null);

  // Helper: scroll inside the overflow <main> container
  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      // Find the nearest scrollable ancestor
      let parent = el.parentElement;
      while (parent) {
        const style = window.getComputedStyle(parent);
        if (style.overflowY === "auto" || style.overflowY === "scroll") {
          parent.scrollTo({ top: el.offsetTop - 80, behavior: "smooth" });
          return;
        }
        parent = parent.parentElement;
      }
      // Fallback: scrollIntoView
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  useEffect(() => {
    if (selectedPartner) scrollToRef(serviceAreaSectionRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartner]);

  useEffect(() => {
    // Reset row selection when switching Service Areas
    setRowSelection({});
    if (selectedServiceArea) scrollToRef(serviceUnitSectionRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceArea]);

  // ── Partners ──
  const partnersQuery = usePartners({ page_size: 100 });
  const { data: partnersData, isLoading: partnersLoading, isDemo: partnersDemo } = useDemoFallback(
    partnersQuery,
    getDemoPartners(1, 100),
  );
  const partners: Partner[] = partnersData?.items ?? [];

  // ── Service Areas — fetch ALL once, filter client-side to avoid re-fetch on partner change ──
  const propertiesQuery = useProperties({ page_size: 500 });
  const { data: propertiesData, isLoading: propertiesLoading } = useDemoFallback(
    propertiesQuery,
    getDemoProperties(1, 500),
  );
  const allProperties: Property[] = propertiesData?.items ?? [];
  const serviceAreas: Property[] = selectedPartner
    ? allProperties.filter((p) => p.partner_id === selectedPartner.id)
    : [];

  // ── Service Units — fetch ALL once, filter client-side to avoid re-fetch on area change ──
  const roomsQuery = useRooms({ page_size: 1000 });
  const { data: roomsData, isLoading: roomsLoading } = useDemoFallback(
    roomsQuery,
    getDemoRooms(1, 1000),
  );
  const allRooms: Room[] = roomsData?.items ?? [];
  const serviceUnits: Room[] = selectedServiceArea
    ? allRooms.filter((r) => r.property_id === selectedServiceArea.id)
    : [];

  // ── QR stats per property (for Service Area cards) ──
  const qrStatsByProperty = useMemo(() => {
    const map = new Map<string, { bound: number; total: number }>();
    for (const room of allRooms) {
      const s = map.get(room.property_id) ?? { bound: 0, total: 0 };
      s.total += 1;
      if (room.qr_code_id) s.bound += 1;
      map.set(room.property_id, s);
    }
    return map;
  }, [allRooms]);

  // ── QR stats per partner (aggregate across all their properties) ──
  const qrStatsByPartner = useMemo(() => {
    const map = new Map<string, { bound: number; total: number }>();
    for (const prop of allProperties) {
      const propStats = qrStatsByProperty.get(prop.id) ?? { bound: 0, total: 0 };
      const s = map.get(prop.partner_id) ?? { bound: 0, total: 0 };
      s.total += propStats.total;
      s.bound += propStats.bound;
      map.set(prop.partner_id, s);
    }
    return map;
  }, [allProperties, qrStatsByProperty]);

  // ── Handlers ──
  const handlePartnerSelect = (partner: Partner) => {
    if (selectedPartner?.id === partner.id) {
      setSelectedPartner(null);
      setSelectedServiceArea(null);
    } else {
      setSelectedPartner(partner);
      setSelectedServiceArea(null);
    }
  };

  const handleServiceAreaSelect = (area: Property) => {
    if (selectedServiceArea?.id === area.id) {
      setSelectedServiceArea(null);
    } else {
      setSelectedServiceArea(area);
    }
  };

  const handleClearPartner = () => {
    setSelectedPartner(null);
    setSelectedServiceArea(null);
  };

  const handleClearServiceArea = () => {
    setSelectedServiceArea(null);
  };

  // Note: MRT table is keyed on selectedServiceArea?.id so it fully remounts on every
  // Service Area switch — this is the only reliable way to reset all internal MRT state
  // (pagination, filters, sorting) without circular update loops from controlled state.

  // ── Service Unit columns ──
  const columns = useMemo<MRT_ColumnDef<Room>[]>(
    () => [
      {
        accessorKey: "room_number",
        header: "Unit No.",
        size: 100,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ fontWeight: 600, fontFamily: '"Geist Mono", monospace' }}>
            {cell.getValue<string>()}
          </Typography>
        ),
      },
      {
        accessorKey: "floor",
        header: "Floor",
        size: 80,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {cell.getValue<string>() ?? "—"}
          </Typography>
        ),
      },
      {
        accessorKey: "zone",
        header: "Zone",
        size: 100,
        Cell: ({ cell }) => (
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {cell.getValue<string>() ?? "—"}
          </Typography>
        ),
      },
      {
        accessorKey: "room_type",
        header: "Type",
        size: 120,
        Cell: ({ cell }) => (
          <Chip label={cell.getValue<string>()} size="small" variant="outlined" />
        ),
      },
      {
        accessorKey: "template_name",
        header: "Service Template",
        size: 180,
        Cell: ({ cell, row }) => {
          const val = cell.getValue<string>();
          return val ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Layers size={13} color="#6366f1" />
              <Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500 }}>
                {val}
              </Typography>
            </Box>
          ) : (
            <Typography variant="body2" sx={{ color: "text.disabled", fontStyle: "italic" }}>
              No template
            </Typography>
          );
        },
      },
      {
        accessorKey: "qr_code_id",
        header: "QR Binding",
        size: 160,
        Cell: ({ cell }) => {
          const qrId = cell.getValue<string>();
          return qrId ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CheckCircle2 size={14} color="#22c55e" />
              <Typography
                variant="caption"
                sx={{ fontFamily: '"Geist Mono", monospace', color: "success.main", fontWeight: 500 }}
              >
                {qrId}
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AlertCircle size={14} color="#94a3b8" />
              <Typography variant="caption" sx={{ color: "text.disabled" }}>
                Not bound
              </Typography>
            </Box>
          );
        },
        filterVariant: "select",
        filterSelectOptions: [
          { label: "Bound", value: "bound" },
          { label: "Not Bound", value: "unbound" },
        ],
      },
      {
        accessorKey: "status",
        header: "Status",
        size: 110,
        Cell: ({ cell }) => <StatusChip status={cell.getValue<string>()} />,
        filterVariant: "select",
        filterSelectOptions: ["active", "maintenance", "inactive"],
      },
    ],
    [],
  );

  // ── Bulk QR generation state ──
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [bulkQrLoading, setBulkQrLoading] = useState(false);

  const handleBulkGenerateQR = async () => {
    if (!selectedServiceArea) return;
    const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);
    // Map row indices to room IDs (MRT uses row index as key by default)
    const unboundRooms = serviceUnits.filter((_, i) => rowSelection[String(i)] && !serviceUnits[i].qr_code_id);
    if (unboundRooms.length === 0) {
      toast.info("All selected units already have QR codes.");
      return;
    }
    setBulkQrLoading(true);
    try {
      await generateQR.mutateAsync({
        property_id: selectedServiceArea.id,
        room_ids: unboundRooms.map((r) => r.id),
        access_type: "public",
      });
      toast.success(`QR codes generated for ${unboundRooms.length} unit${unboundRooms.length > 1 ? "s" : ""}`);
      setRowSelection({});
    } catch {
      toast.error("Failed to generate QR codes. Please try again.");
    } finally {
      setBulkQrLoading(false);
    }
  };

  const selectedCount = Object.values(rowSelection).filter(Boolean).length;

  const table = useMaterialReactTable({
    columns,
    data: serviceUnits,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    enableRowActions: true,
    positionActionsColumn: "last",
    renderRowActions: ({ row }) => (
      <Box sx={{ display: "flex", gap: 0.5 }}>
        <Tooltip title="View / Edit">
          <IconButton
            size="small"
            onClick={() => navigate(`/rooms/${row.original.id}`)}
          >
            <Eye size={15} />
          </IconButton>
        </Tooltip>
        {!row.original.qr_code_id && (
          <Tooltip title="Assign QR Code">
            <IconButton
              size="small"
              color="primary"
              onClick={() => {
                setQrAccessType("public");
                setQrDrawerRoom(row.original);
              }}
            >
              <QrCode size={15} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    ),
    renderTopToolbarCustomActions: () => (
      <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={14} />}
          onClick={() =>
            navigate(`/rooms/new?property_id=${selectedServiceArea?.id ?? ""}`)
          }
        >
          New Service Unit
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Settings size={14} />}
          onClick={() => navigate(`/properties/${selectedServiceArea?.id}/edit`)}
        >
          Area Settings
        </Button>
        {selectedCount > 0 && (
          <Button
            variant="contained"
            color="secondary"
            size="small"
            startIcon={bulkQrLoading ? <CircularProgress size={13} color="inherit" /> : <QrCode size={14} />}
            onClick={handleBulkGenerateQR}
            disabled={bulkQrLoading}
          >
            Generate QR ({selectedCount})
          </Button>
        )}
      </Box>
    ),
    getRowId: (row) => row.id,
    muiTablePaperProps: { elevation: 0, sx: { border: "1px solid", borderColor: "divider", borderRadius: 2 } },
    state: { isLoading: roomsLoading, rowSelection },
    initialState: { density: "compact", pagination: { pageSize: 25, pageIndex: 0 } },
  });

  // ── QR binding stats ──
  const boundCount = serviceUnits.filter((r) => !!r.qr_code_id).length;
  const unboundCount = serviceUnits.length - boundCount;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Page Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
          Onboarding
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Set up Partners, Service Areas, and Service Units in one place.
        </Typography>
      </Box>

      {/* Breadcrumb */}
      <Breadcrumb
        partner={selectedPartner}
        serviceArea={selectedServiceArea}
        onPartnerClick={handleClearPartner}
        onServiceAreaClick={handleClearServiceArea}
      />

      {/* DEBUG — remove after fix confirmed */}
      <Box sx={{ mb: 1, p: 1, bgcolor: "warning.light", borderRadius: 1, fontSize: "0.75rem", fontFamily: "monospace" }}>
        DEBUG: selectedPartner={selectedPartner?.name ?? "null"} | selectedServiceArea={selectedServiceArea?.name ?? "null"}
      </Box>

      {/* ── Section 1: Partners ── */}
      <Box sx={{ mb: selectedPartner ? 4 : 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Handshake size={18} color="#6366f1" />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Partners
            </Typography>
            <Chip
              label={partners.length}
              size="small"
              sx={{ height: 20, fontSize: "0.7rem", bgcolor: "action.hover" }}
            />
          </Box>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Plus size={13} />}
            onClick={() => navigate("/partners/new")}
          >
            New Partner
          </Button>
        </Box>

        {partnersLoading ? (
          <Box sx={{ display: "flex", gap: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ flex: "0 0 200px", height: 130, bgcolor: "action.hover", borderRadius: 2 }} />
            ))}
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 2,
            }}
          >
            {partners.map((partner) => {
              const ps = qrStatsByPartner.get(partner.id) ?? { bound: 0, total: 0 };
              return (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  isSelected={selectedPartner?.id === partner.id}
                  onClick={() => handlePartnerSelect(partner)}
                  qrBound={ps.bound}
                  qrTotal={ps.total}
                />
              );
            })}
            <NewPartnerCard onClick={() => navigate("/partners/new")} />
          </Box>
        )}
      </Box>

      {/* ── Section 2: Service Areas ── */}
      {selectedPartner && (
        <Box
          ref={serviceAreaSectionRef}
          sx={{
            mb: selectedServiceArea ? 4 : 0,
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider",
            scrollMarginTop: "80px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Building2 size={18} color="#8b5cf6" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Service Areas
              </Typography>
              <Chip
                label={serviceAreas.length}
                size="small"
                sx={{ height: 20, fontSize: "0.7rem", bgcolor: "action.hover" }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                in {selectedPartner.name}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Eye size={13} />}
                onClick={() => navigate(`/partners/${selectedPartner.id}`)}
              >
                Partner Detail
              </Button>
              <Button
                size="small"
                variant="outlined"
                startIcon={<Plus size={13} />}
                onClick={() => navigate(`/properties/new?partner_id=${selectedPartner.id}`)}
              >
                New Service Area
              </Button>
            </Box>
          </Box>

          {propertiesLoading ? (
            <Box sx={{ display: "flex", gap: 2 }}>
              {[1, 2, 3].map((i) => (
                <Box key={i} sx={{ flex: "0 0 220px", height: 150, bgcolor: "action.hover", borderRadius: 2 }} />
              ))}
            </Box>
          ) : serviceAreas.length === 0 ? (
            <Box
              sx={{
                p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider",
                borderRadius: 2, bgcolor: "action.hover",
              }}
            >
              <Building2 size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
                No service areas yet for {selectedPartner.name}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<Plus size={13} />}
                onClick={() => navigate(`/properties/new?partner_id=${selectedPartner.id}`)}
              >
                Add First Service Area
              </Button>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 2,
              }}
            >
              {serviceAreas.map((area) => {
                const as_ = qrStatsByProperty.get(area.id) ?? { bound: 0, total: 0 };
                return (
                  <ServiceAreaCard
                    key={area.id}
                    property={area}
                    isSelected={selectedServiceArea?.id === area.id}
                    onClick={() => handleServiceAreaSelect(area)}
                    qrBound={as_.bound}
                    qrTotal={as_.total}
                    onQuickSetup={() => {
                      setBulkFloors("1");
                      setBulkRoomsPerFloor("10");
                      setBulkRoomType("Standard");
                      setBulkZone("");
                      setBulkSeedArea(area);
                    }}
                  />
                );
              })}
              <NewServiceAreaCard
                onClick={() => navigate(`/properties/new?partner_id=${selectedPartner.id}`)}
              />
            </Box>
          )}
        </Box>
      )}


      {/* ─── QR Assignment Drawer ─── */}
      <Drawer
        anchor="right"
        open={!!qrDrawerRoom}
        onClose={() => setQrDrawerRoom(null)}
        PaperProps={{ sx: { width: { xs: "100%", sm: 400 }, p: 3 } }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <QrCode size={20} color="#6366f1" />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Assign QR Code</Typography>
          </Box>
          <IconButton size="small" onClick={() => setQrDrawerRoom(null)}>
            <RefreshCw size={16} />
          </IconButton>
        </Box>

        {qrDrawerRoom && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            {/* Unit summary */}
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.5 }}>Service Unit</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{qrDrawerRoom.room_number}</Typography>
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                {qrDrawerRoom.floor && <Chip label={`Floor ${qrDrawerRoom.floor}`} size="small" />}
                {qrDrawerRoom.room_type && <Chip label={qrDrawerRoom.room_type} size="small" variant="outlined" />}
              </Box>
            </Box>

            {/* Access type */}
            <FormControl fullWidth size="small">
              <InputLabel>Access Type</InputLabel>
              <Select
                value={qrAccessType}
                label="Access Type"
                onChange={(e) => setQrAccessType(e.target.value as "public" | "restricted")}
              >
                <MenuItem value="public">Public — anyone can scan</MenuItem>
                <MenuItem value="restricted">Restricted — requires stay token</MenuItem>
              </Select>
              <FormHelperText>
                {qrAccessType === "public"
                  ? "Guests scan without authentication."
                  : "Guests must present a valid stay token."}
              </FormHelperText>
            </FormControl>

            <Divider />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={generateQR.isPending ? <CircularProgress size={14} color="inherit" /> : <QrCode size={16} />}
                disabled={generateQR.isPending}
                onClick={handleAssignQR}
              >
                {generateQR.isPending ? "Generating..." : "Generate & Assign QR Code"}
              </Button>
              <Button variant="outlined" fullWidth onClick={() => setQrDrawerRoom(null)}>
                Cancel
              </Button>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* ─── Bulk Seed Rooms Modal ─── */}
      <Dialog
        open={!!bulkSeedArea}
        onClose={() => setBulkSeedArea(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LayoutGrid size={20} color="#8b5cf6" />
          Quick Setup: Bulk Create Units
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: "16px !important" }}>
          {bulkSeedArea && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Creating rooms for <strong>{bulkSeedArea.name}</strong>. Room numbers will be generated as <code>FloorRoom</code> (e.g. 101, 102, 201).
            </Alert>
          )}
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Floors"
              type="number"
              size="small"
              value={bulkFloors}
              onChange={(e) => setBulkFloors(e.target.value)}
              inputProps={{ min: 1, max: 50 }}
              helperText="Max 50"
              fullWidth
            />
            <TextField
              label="Rooms / Floor"
              type="number"
              size="small"
              value={bulkRoomsPerFloor}
              onChange={(e) => setBulkRoomsPerFloor(e.target.value)}
              inputProps={{ min: 1, max: 100 }}
              helperText="Max 100"
              fullWidth
            />
          </Box>
          <TextField
            label="Room Type"
            size="small"
            value={bulkRoomType}
            onChange={(e) => setBulkRoomType(e.target.value)}
            placeholder="Standard, Deluxe, Suite..."
            fullWidth
          />
          <TextField
            label="Zone (optional)"
            size="small"
            value={bulkZone}
            onChange={(e) => setBulkZone(e.target.value)}
            placeholder="e.g. North Wing, Pool Side"
            fullWidth
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Total units to create: <strong>{Math.max(1, Math.min(50, parseInt(bulkFloors) || 1)) * Math.max(1, Math.min(100, parseInt(bulkRoomsPerFloor) || 10))}</strong>
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setBulkSeedArea(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleBulkSeed}
            disabled={bulkCreateRooms.isPending}
            startIcon={bulkCreateRooms.isPending ? <CircularProgress size={14} color="inherit" /> : <Plus size={14} />}
          >
            {bulkCreateRooms.isPending ? "Creating..." : "Create Units"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Section 3: Service Units ── */}
      {selectedServiceArea && (
        <Box
          ref={serviceUnitSectionRef}
          sx={{
            pt: 3,
            borderTop: "1px solid",
            borderColor: "divider",
            scrollMarginTop: "80px",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <DoorOpen size={18} color="#10b981" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Service Units
              </Typography>
              <Chip
                label={serviceUnits.length}
                size="small"
                sx={{ height: 20, fontSize: "0.7rem", bgcolor: "action.hover" }}
              />
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                in {selectedServiceArea.name}
              </Typography>

              {/* QR binding stats */}
              {serviceUnits.length > 0 && (
                <>
                  <Chip
                    icon={<CheckCircle2 size={11} />}
                    label={`${boundCount} QR bound`}
                    size="small"
                    sx={{
                      height: 20, fontSize: "0.65rem",
                      bgcolor: "success.light", color: "success.dark",
                      "& .MuiChip-icon": { color: "success.dark" },
                    }}
                  />
                  {unboundCount > 0 && (
                    <Chip
                      icon={<AlertCircle size={11} />}
                      label={`${unboundCount} unbound`}
                      size="small"
                      sx={{
                        height: 20, fontSize: "0.65rem",
                        bgcolor: "warning.light", color: "warning.dark",
                        "& .MuiChip-icon": { color: "warning.dark" },
                      }}
                    />
                  )}
                </>
              )}
            </Box>
          </Box>

          {roomsLoading ? (
            <TableSkeleton rows={6} />
          ) : (
            <MaterialReactTable key={selectedServiceArea?.id ?? "none"} table={table} />
          )}
        </Box>
      )}
    </Box>
  );
}
