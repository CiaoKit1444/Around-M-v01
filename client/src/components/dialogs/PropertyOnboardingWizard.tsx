/**
 * PropertyOnboardingWizard — Step-by-step guided setup for new properties.
 *
 * Steps:
 * 1. Create property (name, partner, timezone, currency)
 * 2. Add rooms (bulk range or manual)
 * 3. Assign service template
 * 4. Generate QR codes
 * 5. Test scan (show QR + instructions)
 */
import { useState } from "react";
import {
  Dialog, DialogContent, DialogTitle, DialogActions,
  Box, Button, Stepper, Step, StepLabel, Typography,
  TextField, MenuItem, Select, FormControl, InputLabel,
  LinearProgress, Alert, CircularProgress,
  Card, CardContent,
} from "@mui/material";
import {
  Building2, DoorOpen, Layers, QrCode, CheckCircle2,
  ChevronRight, ChevronLeft, X,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { propertiesApi, roomsApi, qrApi, partnersApi, templatesApi } from "@/lib/api/endpoints";
import { toast } from "sonner";

const STEPS = [
  { label: "Property", icon: Building2 },
  { label: "Rooms", icon: DoorOpen },
  { label: "Template", icon: Layers },
  { label: "QR Codes", icon: QrCode },
  { label: "Done", icon: CheckCircle2 },
];

const TIMEZONES = [
  "Asia/Bangkok", "Asia/Singapore", "Asia/Tokyo", "Asia/Shanghai",
  "Asia/Dubai", "Europe/London", "Europe/Paris", "America/New_York",
  "America/Los_Angeles", "Australia/Sydney",
];

const CURRENCIES = ["THB", "USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CNY"];

interface WizardState {
  // Step 1
  propertyName: string;
  partnerId: string;
  timezone: string;
  currency: string;
  // Step 2
  roomPrefix: string;
  roomStart: number;
  roomEnd: number;
  // Step 3
  templateId: string;
  // Step 4
  accessType: "public" | "restricted";
  // Results
  createdPropertyId: string;
  createdRoomIds: string[];
  createdQRIds: string[];
}

interface PropertyOnboardingWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (propertyId: string) => void;
}

export function PropertyOnboardingWizard({ open, onClose, onComplete }: PropertyOnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<WizardState>({
    propertyName: "",
    partnerId: "",
    timezone: "Asia/Bangkok",
    currency: "THB",
    roomPrefix: "Room",
    roomStart: 101,
    roomEnd: 110,
    templateId: "",
    accessType: "public",
    createdPropertyId: "",
    createdRoomIds: [],
    createdQRIds: [],
  });

  const queryClient = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ["partners-list"],
    queryFn: () => partnersApi.list({ page: 1, page_size: 100 }),
    enabled: open,
  });

  const { data: templates } = useQuery({
    queryKey: ["templates-list"],
    queryFn: () => templatesApi.list({ page: 1, page_size: 100 }),
    enabled: open && step >= 2,
  });

  const update = (patch: Partial<WizardState>) => setState(prev => ({ ...prev, ...patch }));

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 0) {
        // Create property
        const prop = await propertiesApi.create({
          name: state.propertyName,
          partner_id: state.partnerId,
          type: "hotel",
          address: "-",
          city: "-",
          country: "-",
          timezone: state.timezone,
          currency: state.currency,
        });
        update({ createdPropertyId: prop.id });
        setStep(1);
      } else if (step === 1) {
        // Create rooms in bulk
        const roomNumbers: string[] = [];
        for (let i = state.roomStart; i <= state.roomEnd; i++) {
          roomNumbers.push(`${state.roomPrefix} ${i}`);
        }
        const created: string[] = [];
        for (const name of roomNumbers) {
          try {
            const room = await roomsApi.create({
              property_id: state.createdPropertyId,
              room_number: name,
              room_type: "standard",
              floor: String(Math.floor((parseInt(name.replace(/\D/g, "")) - 100) / 10) + 1),
            });
            created.push(room.id);
          } catch {
            // Skip individual failures
          }
        }
        update({ createdRoomIds: created });
        setStep(2);
      } else if (step === 2) {
        // Assign template to all rooms
        if (state.templateId) {
          for (const roomId of state.createdRoomIds) {
            try {
              await roomsApi.assignTemplate(roomId, state.templateId);
            } catch {
              // Skip individual failures
            }
          }
        }
        setStep(3);
      } else if (step === 3) {
        // Generate QR codes for all rooms
        const created: string[] = [];
        for (const roomId of state.createdRoomIds) {
          try {
            const qrResult = await qrApi.generate({
              property_id: state.createdPropertyId,
              room_ids: [roomId],
              access_type: state.accessType,
            });
            const qrArr = Array.isArray(qrResult) ? qrResult : [qrResult];
            for (const q of qrArr) { if (q.qr_code_id) created.push(q.qr_code_id); }
          } catch {
            // Skip individual failures
          }
        }
        update({ createdQRIds: created });
        queryClient.invalidateQueries({ queryKey: ["properties"] });
        queryClient.invalidateQueries({ queryKey: ["rooms"] });
        queryClient.invalidateQueries({ queryKey: ["qr-codes"] });
        toast.success(`Property setup complete! Created ${created.length} QR codes.`);
        setStep(4);
      } else if (step === 4) {
        onComplete?.(state.createdPropertyId);
        handleClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Operation failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(0);
    setState({
      propertyName: "", partnerId: "", timezone: "Asia/Bangkok", currency: "THB",
      roomPrefix: "Room", roomStart: 101, roomEnd: 110, templateId: "",
      accessType: "public", createdPropertyId: "", createdRoomIds: [], createdQRIds: [],
    });
    onClose();
  };

  const canProceed = () => {
    if (step === 0) return state.propertyName.trim() && state.partnerId;
    if (step === 1) return state.roomEnd >= state.roomStart && state.roomStart > 0;
    return true;
  };

  const roomCount = Math.max(0, state.roomEnd - state.roomStart + 1);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography variant="h6" fontWeight={600}>Property Setup Wizard</Typography>
        <Button size="small" onClick={handleClose} startIcon={<X size={14} />} color="inherit">
          Cancel
        </Button>
      </DialogTitle>

      <DialogContent dividers>
        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map((s, i) => (
            <Step key={s.label} completed={i < step}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Step 0: Create Property */}
        {step === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Enter the basic details for the new property.
            </Typography>
            <TextField
              label="Property Name"
              value={state.propertyName}
              onChange={e => update({ propertyName: e.target.value })}
              fullWidth required
              placeholder="e.g. The Grand Bangkok Hotel"
            />
            <FormControl fullWidth required>
              <InputLabel>Partner</InputLabel>
              <Select
                value={state.partnerId}
                label="Partner"
                onChange={e => update({ partnerId: e.target.value })}
              >
                {(partners?.items || []).map((p: { id: string; name: string }) => (
                  <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ display: "flex", gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Timezone</InputLabel>
                <Select value={state.timezone} label="Timezone" onChange={e => update({ timezone: e.target.value })}>
                  {TIMEZONES.map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select value={state.currency} label="Currency" onChange={e => update({ currency: e.target.value })}>
                  {CURRENCIES.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                </Select>
              </FormControl>
            </Box>
          </Box>
        )}

        {/* Step 1: Add Rooms */}
        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="success">
              Property <strong>{state.propertyName}</strong> created successfully.
            </Alert>
            <Typography variant="subtitle2" color="text.secondary">
              Configure the room range to create in bulk.
            </Typography>
            <TextField
              label="Room Name Prefix"
              value={state.roomPrefix}
              onChange={e => update({ roomPrefix: e.target.value })}
              fullWidth
              placeholder="e.g. Room, Suite, Unit"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="Start Number"
                type="number"
                value={state.roomStart}
                onChange={e => update({ roomStart: parseInt(e.target.value) || 1 })}
                fullWidth
              />
              <TextField
                label="End Number"
                type="number"
                value={state.roomEnd}
                onChange={e => update({ roomEnd: parseInt(e.target.value) || 1 })}
                fullWidth
              />
            </Box>
            {roomCount > 0 && (
              <Alert severity="info">
                Will create <strong>{roomCount} rooms</strong>: {state.roomPrefix} {state.roomStart} → {state.roomPrefix} {state.roomEnd}
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: Assign Template */}
        {step === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="success">
              Created <strong>{state.createdRoomIds.length} rooms</strong> successfully.
            </Alert>
            <Typography variant="subtitle2" color="text.secondary">
              Select a service template to assign to all rooms (optional).
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Service Template</InputLabel>
              <Select
                value={state.templateId}
                label="Service Template"
                onChange={e => update({ templateId: e.target.value })}
              >
                <MenuItem value="">None (skip)</MenuItem>
                {(templates?.items || []).map((t: { id: string; name: string }) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        {/* Step 3: Generate QR Codes */}
        {step === 3 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Generate QR codes for all {state.createdRoomIds.length} rooms.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Access Type</InputLabel>
              <Select
                value={state.accessType}
                label="Access Type"
                onChange={e => update({ accessType: e.target.value as "public" | "restricted" })}
              >
                <MenuItem value="public">Public (no expiry)</MenuItem>
                <MenuItem value="restricted">Restricted (per stay)</MenuItem>
              </Select>
            </FormControl>
            <Alert severity="info">
              Will generate <strong>{state.createdRoomIds.length} QR codes</strong> — one per room.
            </Alert>
          </Box>
        )}

        {/* Step 4: Done */}
        {step === 4 && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 2 }}>
            <CheckCircle2 size={64} color="#4caf50" />
            <Typography variant="h6" fontWeight={600}>Setup Complete!</Typography>
            <Typography color="text.secondary" textAlign="center">
              Your property is ready. Here's a summary of what was created:
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">1</Typography>
                  <Typography variant="caption" color="text.secondary">Property</Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">{state.createdRoomIds.length}</Typography>
                  <Typography variant="caption" color="text.secondary">Rooms</Typography>
                </CardContent>
              </Card>
              <Card variant="outlined" sx={{ flex: 1 }}>
                <CardContent sx={{ textAlign: "center", py: 1.5 }}>
                  <Typography variant="h4" fontWeight={700} color="primary.main">{state.createdQRIds.length}</Typography>
                  <Typography variant="caption" color="text.secondary">QR Codes</Typography>
                </CardContent>
              </Card>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        {step > 0 && step < 4 && (
          <Button
            startIcon={<ChevronLeft size={16} />}
            onClick={() => setStep(s => s - 1)}
            disabled={loading}
          >
            Back
          </Button>
        )}
        <Box sx={{ flex: 1 }} />
        <Button
          variant="contained"
          endIcon={step < 4 ? <ChevronRight size={16} /> : undefined}
          onClick={handleNext}
          disabled={loading || !canProceed()}
        >
          {loading ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
          {step === 3 ? "Generate QR Codes" : step === 4 ? "Go to Property" : "Next"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
