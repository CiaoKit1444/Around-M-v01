/**
 * QRBatchGenerateDialog — Dialog for generating QR codes for multiple rooms.
 *
 * Flow:
 * 1. Select rooms (from existing rooms without QR codes, or all rooms)
 * 2. Choose access type (public / restricted)
 * 3. Preview and confirm
 * 4. Generate and show results
 *
 * Design: Step-based dialog with room selection and access type configuration.
 */
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Chip, Alert, CircularProgress,
  Checkbox, FormControlLabel, RadioGroup, Radio, FormControl, FormLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment,
} from "@mui/material";
import { QrCode, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { qrApi, roomsApi } from "@/lib/api/endpoints";
import { toast } from "sonner";
import type { Room, QRCode as QRCodeType } from "@/lib/api/types";

interface QRBatchGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  preSelectedRoomIds?: string[];
  onSuccess?: () => void;
}

type Step = "select" | "configure" | "result";

export default function QRBatchGenerateDialog({
  open,
  onClose,
  propertyId,
  propertyName,
  preSelectedRoomIds,
  onSuccess,
}: QRBatchGenerateDialogProps) {
  const [step, setStep] = useState<Step>("select");
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  // Room selection
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomIds, setSelectedRoomIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  // Configuration
  const [accessType, setAccessType] = useState<"public" | "restricted">("public");

  // Results
  const [generatedCodes, setGeneratedCodes] = useState<QRCodeType[]>([]);

  // Load rooms when dialog opens
  useEffect(() => {
    if (!open) return;
    setStep("select");
    setError("");
    setGeneratedCodes([]);
    setSelectedRoomIds(new Set(preSelectedRoomIds || []));

    const loadRooms = async () => {
      setIsLoading(true);
      try {
        const res = await roomsApi.list({ property_id: propertyId, page_size: 200 });
        setRooms(res.items);
        if (preSelectedRoomIds?.length) {
          setSelectedRoomIds(new Set(preSelectedRoomIds));
        }
      } catch {
        // Use empty list if API fails
        setRooms([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadRooms();
  }, [open, propertyId, preSelectedRoomIds]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery) return rooms;
    const q = searchQuery.toLowerCase();
    return rooms.filter(
      (r) =>
        r.room_number.toLowerCase().includes(q) ||
        r.room_type.toLowerCase().includes(q) ||
        (r.zone || "").toLowerCase().includes(q)
    );
  }, [rooms, searchQuery]);

  const handleToggleRoom = useCallback((roomId: string) => {
    setSelectedRoomIds((prev) => {
      const next = new Set(prev);
      if (next.has(roomId)) {
        next.delete(roomId);
      } else {
        next.add(roomId);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedRoomIds.size === filteredRooms.length) {
      setSelectedRoomIds(new Set());
    } else {
      setSelectedRoomIds(new Set(filteredRooms.map((r) => r.id)));
    }
  }, [filteredRooms, selectedRoomIds.size]);

  const handleGenerate = useCallback(async () => {
    if (selectedRoomIds.size === 0) {
      setError("Select at least one room");
      return;
    }

    setIsGenerating(true);
    setError("");

    try {
      const codes = await qrApi.generate({
        property_id: propertyId,
        room_ids: Array.from(selectedRoomIds),
        access_type: accessType,
      });
      setGeneratedCodes(codes);
      setStep("result");
      toast.success(`${codes.length} QR codes generated`);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to generate QR codes";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedRoomIds, propertyId, accessType, onSuccess]);

  const handleClose = useCallback(() => {
    setStep("select");
    setSelectedRoomIds(new Set());
    setSearchQuery("");
    setError("");
    setGeneratedCodes([]);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <QrCode size={20} />
          {step === "result" ? "QR Codes Generated" : "Generate QR Batch"}
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {propertyName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {step === "select" && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Select rooms to generate QR codes for
            </Typography>

            <TextField
              fullWidth
              size="small"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ mb: 2 }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                },
              }}
            />

            {isLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={selectedRoomIds.size === filteredRooms.length && filteredRooms.length > 0}
                        indeterminate={selectedRoomIds.size > 0 && selectedRoomIds.size < filteredRooms.length}
                        onChange={handleSelectAll}
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">Select All</Typography>}
                  />
                  <Chip
                    label={`${selectedRoomIds.size} selected`}
                    size="small"
                    color={selectedRoomIds.size > 0 ? "primary" : "default"}
                  />
                </Box>

                <TableContainer sx={{ maxHeight: 300, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox" />
                        <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Room</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Floor</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Zone</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Has QR</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredRooms.map((room) => (
                        <TableRow
                          key={room.id}
                          hover
                          onClick={() => handleToggleRoom(room.id)}
                          sx={{ cursor: "pointer" }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox
                              checked={selectedRoomIds.has(room.id)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem", fontWeight: 600 }}>
                            {room.room_number}
                          </TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{room.floor || "—"}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{room.room_type}</TableCell>
                          <TableCell sx={{ fontSize: "0.75rem" }}>{room.zone || "—"}</TableCell>
                          <TableCell>
                            {room.qr_code_id ? (
                              <Chip label="Yes" size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: "0.625rem" }} />
                            ) : (
                              <Chip label="No" size="small" variant="outlined" sx={{ height: 20, fontSize: "0.625rem" }} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredRooms.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} sx={{ textAlign: "center", color: "text.secondary", py: 3 }}>
                            No rooms found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {step === "configure" && (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Configure QR code settings for {selectedRoomIds.size} rooms
            </Typography>

            <FormControl sx={{ mb: 3 }}>
              <FormLabel sx={{ fontWeight: 500, mb: 1 }}>Access Type</FormLabel>
              <RadioGroup
                value={accessType}
                onChange={(e) => setAccessType(e.target.value as "public" | "restricted")}
              >
                <FormControlLabel
                  value="public"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Public</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Anyone with the QR code can access the service menu
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  value="restricted"
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>Restricted</Typography>
                      <Typography variant="caption" sx={{ color: "text.secondary" }}>
                        Requires additional verification (e.g., room key, guest name)
                      </Typography>
                    </Box>
                  }
                />
              </RadioGroup>
            </FormControl>

            <Alert severity="info" icon={<AlertTriangle size={16} />}>
              This will generate {selectedRoomIds.size} new QR codes. Rooms that already have QR codes will get new ones (old codes remain active).
            </Alert>
          </Box>
        )}

        {step === "result" && (
          <Box>
            <Alert severity="success" icon={<CheckCircle size={16} />} sx={{ mb: 2 }}>
              Successfully generated {generatedCodes.length} QR codes
            </Alert>

            <TableContainer sx={{ maxHeight: 300, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>QR Code ID</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Room</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Access</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {generatedCodes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.6875rem" }}>
                        {code.qr_code_id}
                      </TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{code.room_number}</TableCell>
                      <TableCell>
                        <Chip
                          label={code.access_type.toUpperCase()}
                          size="small"
                          sx={{
                            height: 20, fontSize: "0.6rem", fontWeight: 700,
                            bgcolor: code.access_type === "public" ? "#f0fdf4" : "#fef2f2",
                            color: code.access_type === "public" ? "#166534" : "#991b1b",
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip label={code.status} size="small" color="success" variant="outlined" sx={{ height: 20, fontSize: "0.625rem" }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {step === "select" && (
          <>
            <Button onClick={handleClose}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => setStep("configure")}
              disabled={selectedRoomIds.size === 0}
            >
              Next: Configure ({selectedRoomIds.size})
            </Button>
          </>
        )}
        {step === "configure" && (
          <>
            <Button onClick={() => setStep("select")}>Back</Button>
            <Button
              variant="contained"
              onClick={handleGenerate}
              disabled={isGenerating}
              startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <QrCode size={16} />}
            >
              {isGenerating ? "Generating..." : `Generate ${selectedRoomIds.size} QR Codes`}
            </Button>
          </>
        )}
        {step === "result" && (
          <Button variant="contained" onClick={handleClose}>
            Done
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
