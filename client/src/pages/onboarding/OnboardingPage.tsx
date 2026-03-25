/**
 * OnboardingPage — Unified drill-down: Partner → Service Area → Service Unit
 *
 * Design: Three-section progressive disclosure
 *   Section 1: Partner Carousel (always visible)
 *   Section 2: Service Area Grid (always rendered; shows empty state when no partner selected)
 *   Section 3: Service Unit DataTable (always rendered; shows empty state when no area selected)
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
import { useLocation, useSearchParams } from "wouter";
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
  // When selected: solid blue fill (#6366f1) with all text/icons in white
  const sel = isSelected;
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: "2px solid",
        borderColor: sel ? "#6366f1" : "divider",
        borderRadius: 2,
        bgcolor: sel ? "#6366f1" : "background.paper",
        transition: "all 0.18s ease",
        boxShadow: sel
          ? "0 4px 20px rgba(99,102,241,0.45)"
          : "none",
        "&:hover": {
          borderColor: sel ? "#4f46e5" : "rgba(99,102,241,0.55)",
          bgcolor: sel ? "#4f46e5" : "action.hover",
          boxShadow: sel
            ? "0 6px 24px rgba(99,102,241,0.5)"
            : "0 0 0 2px rgba(99,102,241,0.1)",
          transform: "translateY(-2px)",
        },
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Selected checkmark badge */}
      {sel && (
        <Box
          sx={{
            position: "absolute",
            top: -9, right: -9,
            width: 22, height: 22,
            borderRadius: "50%",
            bgcolor: "#22c55e",
            border: "2px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <CheckCircle2 size={12} color="white" />
        </Box>
      )}
      {/* Completion badge — only when not selected */}
      {!sel && qrTotal > 0 && qrBound === qrTotal && (
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
      {!sel && qrTotal === 0 && (
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
        {/* Header: icon + name + status */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 1.5,
              bgcolor: sel ? "rgba(255,255,255,0.2)" : "action.hover",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background-color 0.18s",
            }}
          >
            <Handshake size={20} color={sel ? "white" : "#6366f1"} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.3,
                mb: 0.25,
                color: sel ? "white" : "text.primary",
                letterSpacing: sel ? "0.01em" : "normal",
              }}
              noWrap
            >
              {partner.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              {/* Status dot: white when selected for contrast */}
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: 7, height: 7,
                  borderRadius: "50%",
                  bgcolor: sel ? "rgba(255,255,255,0.7)" : (
                    partner.status === "active" ? "#22c55e" :
                    partner.status === "pending" ? "#f59e0b" : "#94a3b8"
                  ),
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  color: sel ? "rgba(255,255,255,0.8)" : "text.secondary",
                  textTransform: "capitalize",
                }}
              >
                {partner.status}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 1.5, borderColor: sel ? "rgba(255,255,255,0.2)" : "divider" }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: qrTotal > 0 ? 1.5 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Building2 size={13} color={sel ? "rgba(255,255,255,0.7)" : "#94a3b8"} />
            <Typography variant="caption" sx={{ color: sel ? "rgba(255,255,255,0.85)" : "text.secondary" }}>
              {partner.properties_count ?? 0} Service Areas
            </Typography>
          </Box>
          {partner.contact_person && (
            <Typography
              variant="caption"
              sx={{ color: sel ? "rgba(255,255,255,0.7)" : "text.secondary" }}
              noWrap
            >
              {partner.contact_person}
            </Typography>
          )}
        </Box>

        {/* QR completion progress */}
        {qrTotal > 0 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <QrCode size={11} color={sel ? "rgba(255,255,255,0.7)" : "#94a3b8"} />
                <Typography variant="caption" sx={{ color: sel ? "rgba(255,255,255,0.75)" : "text.secondary", fontSize: "0.65rem" }}>
                  QR Setup
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: sel ? "white" : (qrBound === qrTotal ? "success.main" : "text.secondary"),
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
                bgcolor: sel ? "rgba(255,255,255,0.2)" : "action.hover",
                "& .MuiLinearProgress-bar": {
                  bgcolor: sel ? "white" : (qrBound === qrTotal ? "success.main" : "primary.main"),
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
  // When selected: solid purple fill (#8b5cf6) with all text/icons in white
  const sel = isSelected;
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: "pointer",
        border: "2px solid",
        borderColor: sel ? "#8b5cf6" : "divider",
        borderRadius: 2,
        bgcolor: sel ? "#8b5cf6" : "background.paper",
        transition: "all 0.18s ease",
        boxShadow: sel ? "0 4px 20px rgba(139,92,246,0.45)" : "none",
        "&:hover": {
          borderColor: sel ? "#7c3aed" : "rgba(139,92,246,0.55)",
          bgcolor: sel ? "#7c3aed" : "action.hover",
          boxShadow: sel ? "0 6px 24px rgba(139,92,246,0.5)" : "0 0 0 2px rgba(139,92,246,0.1)",
          transform: "translateY(-2px)",
        },
        position: "relative",
        overflow: "visible",
      }}
    >
      {/* Selected checkmark badge */}
      {sel && (
        <Box
          sx={{
            position: "absolute",
            top: -9, right: -9,
            width: 22, height: 22,
            borderRadius: "50%",
            bgcolor: "#22c55e",
            border: "2px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
          }}
        >
          <CheckCircle2 size={12} color="white" />
        </Box>
      )}

      <CardContent sx={{ p: 2.5 }}>
        {/* Header: icon + name + status */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1.5 }}>
          <Box
            sx={{
              width: 40, height: 40, borderRadius: 1.5,
              bgcolor: sel ? "rgba(255,255,255,0.2)" : "action.hover",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
              transition: "background-color 0.18s",
            }}
          >
            <Building2 size={20} color={sel ? "white" : "#8b5cf6"} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                lineHeight: 1.3,
                mb: 0.25,
                color: sel ? "white" : "text.primary",
                letterSpacing: sel ? "0.01em" : "normal",
              }}
              noWrap
            >
              {property.name}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                component="span"
                sx={{
                  display: "inline-block",
                  width: 7, height: 7,
                  borderRadius: "50%",
                  bgcolor: sel ? "rgba(255,255,255,0.7)" : (
                    property.status === "active" ? "#22c55e" :
                    property.status === "pending" ? "#f59e0b" : "#94a3b8"
                  ),
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{ color: sel ? "rgba(255,255,255,0.8)" : "text.secondary", textTransform: "capitalize" }}
              >
                {property.status}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* City + type tags */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
          {property.city && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MapPin size={11} color={sel ? "rgba(255,255,255,0.7)" : "#94a3b8"} />
              <Typography variant="caption" sx={{ color: sel ? "rgba(255,255,255,0.85)" : "text.secondary" }}>
                {property.city}
              </Typography>
            </Box>
          )}
          {property.type && (
            <Chip
              label={property.type}
              size="small"
              sx={{
                height: 18, fontSize: "0.65rem",
                bgcolor: sel ? "rgba(255,255,255,0.2)" : undefined,
                color: sel ? "white" : undefined,
                border: sel ? "1px solid rgba(255,255,255,0.3)" : undefined,
              }}
            />
          )}
        </Box>

        <Divider sx={{ my: 1, borderColor: sel ? "rgba(255,255,255,0.2)" : "divider" }} />

        <Box sx={{ display: "flex", justifyContent: "space-between", mb: qrTotal > 0 ? 1.5 : 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <DoorOpen size={13} color={sel ? "rgba(255,255,255,0.7)" : "#94a3b8"} />
            <Typography variant="caption" sx={{ color: sel ? "rgba(255,255,255,0.85)" : "text.secondary" }}>
              {property.rooms_count ?? 0} Units
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <QrCode size={13} color={sel ? "rgba(255,255,255,0.7)" : "#94a3b8"} />
            <Typography variant="caption" sx={{ color: sel ? "rgba(255,255,255,0.85)" : "text.secondary" }}>
              {property.active_qr_count ?? 0} QR
            </Typography>
          </Box>
        </Box>

        {/* QR completion progress */}
        {qrTotal > 0 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <QrCode size={11} color={sel ? "rgba(255,255,255,0.7)" : "#94a3b8"} />
                <Typography variant="caption" sx={{ color: sel ? "rgba(255,255,255,0.75)" : "text.secondary", fontSize: "0.65rem" }}>
                  QR Setup
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: sel ? "white" : (qrBound === qrTotal ? "success.main" : "text.secondary"),
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
                bgcolor: sel ? "rgba(255,255,255,0.2)" : "action.hover",
                "& .MuiLinearProgress-bar": {
                  bgcolor: sel ? "white" : (qrBound === qrTotal ? "success.main" : "secondary.main"),
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
              startIcon={<LayoutGrid size={13} />}
              onClick={(e) => { e.stopPropagation(); onQuickSetup(); }}
              sx={{
                fontSize: "0.7rem",
                borderColor: sel ? "rgba(255,255,255,0.5)" : undefined,
                color: sel ? "white" : undefined,
                "&:hover": sel ? { borderColor: "white", bgcolor: "rgba(255,255,255,0.1)" } : {},
              }}
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
  const [searchParams, setSearchParams] = useSearchParams();

  // ── URL-driven selection state ──
  // IDs are read from ?partner=X&area=Y on mount; resolved to objects once data loads
  const [pendingPartnerId, setPendingPartnerId] = useState<string | null>(
    () => searchParams.get("partner")
  );
  const [pendingAreaId, setPendingAreaId] = useState<string | null>(
    () => searchParams.get("area")
  );
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

  // Helper: scroll element into view using scrollIntoView (works with both window and overflow containers)
  const scrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    setTimeout(() => {
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }, 150);
  };

  useEffect(() => {
    if (selectedPartner) scrollToRef(serviceAreaSectionRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartner]);

  useEffect(() => {
    setRowSelection({});
    if (selectedServiceArea) scrollToRef(serviceUnitSectionRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceArea]);

  // ── Stable query params (MUST use useState/useMemo — never inline objects) ──
  // Inline object literals create new references every render, causing infinite re-fetches.
  // See: template Common Pitfalls > "Infinite loading loops from unstable references"
  const [partnersParams] = useState(() => ({ page_size: 100 }));
  const [propertiesParams] = useState(() => ({ page_size: 500 }));
  const [roomsParams] = useState(() => ({ page_size: 1000 }));

  // ── Partners ──
  const partnersQuery = usePartners(partnersParams);
  const { data: partnersData, isLoading: partnersLoading } = useDemoFallback(
    partnersQuery,
    getDemoPartners(1, 100),
  );
  const partners: Partner[] = partnersData?.items ?? [];

  // ── Service Areas — fetch ALL once, filter client-side ──
  const propertiesQuery = useProperties(propertiesParams);
  const { data: propertiesData, isLoading: propertiesLoading } = useDemoFallback(
    propertiesQuery,
    getDemoProperties(1, 500),
  );
  const allProperties: Property[] = propertiesData?.items ?? [];
  const serviceAreas: Property[] = useMemo(
    () => selectedPartner ? allProperties.filter((p) => p.partner_id === selectedPartner.id) : [],
    [allProperties, selectedPartner],
  );

  // ── Service Units — fetch ALL once, filter client-side ──
  const roomsQuery = useRooms(roomsParams);
  const { data: roomsData, isLoading: roomsLoading } = useDemoFallback(
    roomsQuery,
    getDemoRooms(1, 1000),
  );
  const allRooms: Room[] = roomsData?.items ?? [];
  const serviceUnits: Room[] = useMemo(
    () => selectedServiceArea ? allRooms.filter((r) => r.property_id === selectedServiceArea.id) : [],
    [allRooms, selectedServiceArea],
  );

  // ── QR stats per property ──
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

  // ── QR stats per partner ──
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

  // ── Restore selection from URL once data is loaded ──
  useEffect(() => {
    if (pendingPartnerId && partners.length > 0) {
      const found = partners.find((p) => p.id === pendingPartnerId);
      if (found) {
        setSelectedPartner(found);
        setPendingPartnerId(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPartnerId, partners]);

  useEffect(() => {
    if (pendingAreaId && allProperties.length > 0) {
      const found = allProperties.find((p) => p.id === pendingAreaId);
      if (found) {
        setSelectedServiceArea(found);
        setPendingAreaId(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAreaId, allProperties]);

  // ── Sync selection state → URL query params ──
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedPartner) params.set("partner", selectedPartner.id);
    if (selectedServiceArea) params.set("area", selectedServiceArea.id);
    setSearchParams(params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPartner, selectedServiceArea]);

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
        Cell: ({ cell }) => {
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
    const unboundRooms = serviceUnits.filter((r) => !r.qr_code_id && selectedIds.includes(r.id));
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
    state: { isLoading: roomsLoading && !!selectedServiceArea, rowSelection },
    initialState: { density: "compact", pagination: { pageSize: 25, pageIndex: 0 } },
  });

  // ── QR binding stats (current service area) ──
  const boundCount = serviceUnits.filter((r) => !!r.qr_code_id).length;
  const unboundCount = serviceUnits.length - boundCount;

  // ── Global onboarding health stats (across ALL rooms) ──
  const globalTotalRooms = allRooms.length;
  const globalBoundRooms = useMemo(() => allRooms.filter((r) => !!r.qr_code_id).length, [allRooms]);
  const globalHealthPct = globalTotalRooms > 0 ? Math.round((globalBoundRooms / globalTotalRooms) * 100) : 0;
  const healthColor = globalHealthPct >= 80 ? "#22c55e" : globalHealthPct >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <>
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: "auto" }}>
        {/* Page Header */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Setup Hierarchy
            </Typography>
            {globalTotalRooms > 0 && (
              <Box sx={{ textAlign: "right", minWidth: 120 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 0.25 }}>
                  {globalBoundRooms} / {globalTotalRooms} QR-bound
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: healthColor, lineHeight: 1 }}>
                  {globalHealthPct}%
                </Typography>
              </Box>
            )}
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: globalTotalRooms > 0 ? 1.5 : 0 }}>
            Set up Partners, Service Areas, and Service Units in one place.
          </Typography>
          {globalTotalRooms > 0 && (
            <Box>
              <LinearProgress
                variant="determinate"
                value={globalHealthPct}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "action.hover",
                  "& .MuiLinearProgress-bar": {
                    borderRadius: 3,
                    bgcolor: healthColor,
                    transition: "width 0.6s ease",
                  },
                }}
              />
              <Box sx={{ display: "flex", gap: 2, mt: 0.75 }}>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {partners.length} Partners
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {allProperties.length} Service Areas
                </Typography>
                <Typography variant="caption" sx={{ color: "text.secondary" }}>
                  {globalTotalRooms} Service Units
                </Typography>
                <Typography variant="caption" sx={{ color: healthColor, fontWeight: 600 }}>
                  {globalHealthPct >= 80 ? "✓ On track" : globalHealthPct >= 50 ? "⚠ In progress" : "✗ Needs attention"}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Breadcrumb */}
        <Breadcrumb
          partner={selectedPartner}
          serviceArea={selectedServiceArea}
          onPartnerClick={handleClearPartner}
          onServiceAreaClick={handleClearServiceArea}
        />

        {/* ── Section 1: Partners ── */}
        <Box sx={{ mb: 4 }}>
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

        {/* ── Section 2: Service Areas ── ALWAYS RENDERED */}
        <Box
          ref={serviceAreaSectionRef}
          sx={{
            mb: 4,
            borderTop: "1px solid",
            borderColor: selectedPartner ? "#6366f1" : "divider",
            scrollMarginTop: "80px",
            borderRadius: selectedPartner ? 2 : 0,
            overflow: "hidden",
            transition: "border-color 0.18s ease, background-color 0.18s ease",
          }}
        >
          {/* Section header — indigo tint when a partner is selected; sticky so it stays visible while scrolling */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: selectedPartner ? 2 : 0,
              py: selectedPartner ? 1.5 : 0,
              pt: selectedPartner ? 1.5 : 3,
              mb: 2,
              bgcolor: selectedPartner ? "rgba(99,102,241,0.08)" : "transparent",
              borderBottom: selectedPartner ? "1px solid rgba(99,102,241,0.15)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Building2 size={18} color={selectedPartner ? "#6366f1" : "#8b5cf6"} />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: selectedPartner ? "#4f46e5" : "text.primary",
                }}
              >
                Service Areas
              </Typography>
              {selectedPartner && (
                <>
                  <Chip
                    label={serviceAreas.length}
                    size="small"
                    sx={{
                      height: 20, fontSize: "0.7rem",
                      bgcolor: "rgba(99,102,241,0.15)",
                      color: "#4f46e5",
                      fontWeight: 700,
                    }}
                  />
                  <Typography variant="caption" sx={{ color: "#6366f1", fontWeight: 500 }}>
                    in {selectedPartner.name}
                  </Typography>
                </>
              )}
            </Box>
            {selectedPartner && (
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Eye size={13} />}
                  onClick={() => navigate(`/partners/${selectedPartner.id}`)}
                  sx={{
                    borderColor: "rgba(99,102,241,0.4)",
                    color: "#6366f1",
                    "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99,102,241,0.06)" },
                  }}
                >
                  Partner Detail
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Plus size={13} />}
                  onClick={() => navigate(`/properties/new?partner_id=${selectedPartner.id}`)}
                  sx={{
                    borderColor: "rgba(99,102,241,0.4)",
                    color: "#6366f1",
                    "&:hover": { borderColor: "#6366f1", bgcolor: "rgba(99,102,241,0.06)" },
                  }}
                >
                  New Service Area
                </Button>
              </Box>
            )}
          </Box>
          <Box sx={{ px: selectedPartner ? 2 : 0, pb: selectedPartner ? 2 : 0 }}>

          {!selectedPartner ? (
            /* Empty state: no partner selected */
            <Box
              sx={{
                p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider",
                borderRadius: 2, bgcolor: "action.hover",
              }}
            >
              <Handshake size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Select a Partner above to view its Service Areas
              </Typography>
            </Box>
          ) : propertiesLoading ? (
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
          </Box>{/* end inner padding Box */}
        </Box>

        {/* ── Section 3: Service Units ── ALWAYS RENDERED */}
        <Box
          ref={serviceUnitSectionRef}
          sx={{
            borderTop: "1px solid",
            borderColor: selectedServiceArea ? "#8b5cf6" : "divider",
            scrollMarginTop: "80px",
            borderRadius: selectedServiceArea ? 2 : 0,
            overflow: "hidden",
            transition: "border-color 0.18s ease",
          }}
        >
          {/* Section header — purple tint when a service area is selected; sticky so it stays visible while scrolling */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: selectedServiceArea ? 2 : 0,
              py: selectedServiceArea ? 1.5 : 0,
              pt: selectedServiceArea ? 1.5 : 3,
              mb: 2,
              bgcolor: selectedServiceArea ? "rgba(139,92,246,0.08)" : "transparent",
              borderBottom: selectedServiceArea ? "1px solid rgba(139,92,246,0.15)" : "none",
              transition: "all 0.18s ease",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <DoorOpen size={18} color={selectedServiceArea ? "#8b5cf6" : "#10b981"} />
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  color: selectedServiceArea ? "#7c3aed" : "text.primary",
                }}
              >
                Service Units
              </Typography>
              {selectedServiceArea && (
                <>
                  {/* Breadcrumb trail: Partner › Service Area */}
                  {selectedPartner && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#6366f1", fontWeight: 600, cursor: "pointer",
                          "&:hover": { textDecoration: "underline" },
                        }}
                        onClick={handleClearPartner}
                      >
                        {selectedPartner.name}
                      </Typography>
                      <ChevronRight size={12} color="#94a3b8" />
                      <Typography variant="caption" sx={{ color: "#8b5cf6", fontWeight: 600 }}>
                        {selectedServiceArea.name}
                      </Typography>
                    </Box>
                  )}
                  <Chip
                    label={serviceUnits.length}
                    size="small"
                    sx={{
                      height: 20, fontSize: "0.7rem",
                      bgcolor: "rgba(139,92,246,0.15)",
                      color: "#7c3aed",
                      fontWeight: 700,
                    }}
                  />

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
                </>
              )}
            </Box>
          </Box>
          <Box sx={{ px: selectedServiceArea ? 2 : 0, pb: selectedServiceArea ? 2 : 0 }}>

          {!selectedServiceArea ? (
            /* Empty state: no service area selected */
            <Box
              sx={{
                p: 4, textAlign: "center", border: "1px dashed", borderColor: "divider",
                borderRadius: 2, bgcolor: "action.hover",
              }}
            >
              <Building2 size={32} color="#94a3b8" style={{ marginBottom: 8 }} />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                Select a Service Area above to view its Service Units
              </Typography>
            </Box>
          ) : (
            <MaterialReactTable key={selectedServiceArea.id} table={table} />
          )}
          </Box>{/* end inner padding Box */}
        </Box>
      </Box>

      {/* ─── QR Assignment Drawer ─── (Portal — outside main Box) */}
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

      {/* ─── Bulk Seed Rooms Modal ─── (Portal — outside main Box) */}
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
    </>
  );
}
