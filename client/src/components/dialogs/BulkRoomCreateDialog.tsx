/**
 * BulkRoomCreateDialog — Dialog for creating multiple rooms at once.
 *
 * Supports two modes:
 * 1. Range mode: Generate rooms by floor range + room range (e.g., floors 1-5, rooms 01-20)
 * 2. CSV mode: Paste room data in CSV format
 *
 * Design: Clean form with preview of rooms to be created.
 */
import { useState, useMemo, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  Box, Typography, Chip, Alert, CircularProgress, Tabs, Tab,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, InputLabel, FormControl, IconButton,
} from "@mui/material";
import { Plus, Trash2, Download, Upload } from "lucide-react";
import { roomsApi } from "@/lib/api/endpoints";
import { toast } from "sonner";
import type { RoomCreate } from "@/lib/api/types";

interface BulkRoomCreateDialogProps {
  open: boolean;
  onClose: () => void;
  propertyId: string;
  propertyName: string;
  onSuccess?: () => void;
}

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Penthouse", "Villa", "Studio", "Cabana", "Service Spot"];

export default function BulkRoomCreateDialog({
  open,
  onClose,
  propertyId,
  propertyName,
  onSuccess,
}: BulkRoomCreateDialogProps) {
  const [tab, setTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Range mode state
  const [floorStart, setFloorStart] = useState("1");
  const [floorEnd, setFloorEnd] = useState("3");
  const [roomStart, setRoomStart] = useState("01");
  const [roomEnd, setRoomEnd] = useState("10");
  const [roomType, setRoomType] = useState("Standard");
  const [zone, setZone] = useState("");
  const [prefix, setPrefix] = useState("");

  // CSV mode state
  const [csvText, setCsvText] = useState("");

  // Generate preview for range mode
  const rangePreview = useMemo(() => {
    const rooms: RoomCreate[] = [];
    const fs = parseInt(floorStart);
    const fe = parseInt(floorEnd);
    const rs = parseInt(roomStart);
    const re = parseInt(roomEnd);

    if (isNaN(fs) || isNaN(fe) || isNaN(rs) || isNaN(re)) return [];
    if (fe < fs || re < rs) return [];
    if ((fe - fs + 1) * (re - rs + 1) > 500) return []; // Safety limit

    for (let floor = fs; floor <= fe; floor++) {
      for (let room = rs; room <= re; room++) {
        const roomNum = `${prefix}${floor}${String(room).padStart(roomStart.length, "0")}`;
        rooms.push({
          property_id: propertyId,
          room_number: roomNum,
          floor: String(floor),
          zone: zone || undefined,
          room_type: roomType,
        });
      }
    }
    return rooms;
  }, [floorStart, floorEnd, roomStart, roomEnd, roomType, zone, prefix, propertyId]);

  // Parse CSV preview
  const csvPreview = useMemo(() => {
    if (!csvText.trim()) return [];
    const lines = csvText.trim().split("\n");
    const rooms: RoomCreate[] = [];

    for (const line of lines) {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 1 || !parts[0]) continue;
      rooms.push({
        property_id: propertyId,
        room_number: parts[0],
        floor: parts[1] || undefined,
        zone: parts[2] || undefined,
        room_type: parts[3] || "Standard",
      });
    }
    return rooms;
  }, [csvText, propertyId]);

  const preview = tab === 0 ? rangePreview : csvPreview;

  const handleSubmit = useCallback(async () => {
    if (preview.length === 0) {
      setError("No rooms to create. Check your configuration.");
      return;
    }
    if (preview.length > 500) {
      setError("Maximum 500 rooms per batch. Reduce the range.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await roomsApi.bulkCreate({
        property_id: propertyId,
        rooms: preview,
      });
      toast.success(`${preview.length} rooms created successfully`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to create rooms";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [preview, propertyId, onSuccess, onClose]);

  const handleDownloadTemplate = useCallback(() => {
    const csv = "room_number,floor,zone,room_type\n101,1,Tower A,Standard\n102,1,Tower A,Deluxe\n201,2,Tower A,Suite";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rooms_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        Bulk Create Rooms
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {propertyName}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ mb: 2, "& .MuiTab-root": { textTransform: "none", fontWeight: 500 } }}
        >
          <Tab label="Range Generator" />
          <Tab label="CSV Import" />
        </Tabs>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {tab === 0 ? (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
              Generate rooms by floor and room number range
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, mb: 2 }}>
              <TextField
                label="Room Prefix"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="e.g., A-"
                size="small"
              />
              <FormControl size="small">
                <InputLabel>Room Type</InputLabel>
                <Select value={roomType} label="Room Type" onChange={(e) => setRoomType(e.target.value)}>
                  {ROOM_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                label="Zone"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="e.g., Tower A"
                size="small"
              />
            </Box>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 2, mb: 2 }}>
              <TextField
                label="Floor Start"
                value={floorStart}
                onChange={(e) => setFloorStart(e.target.value)}
                size="small"
                type="number"
              />
              <TextField
                label="Floor End"
                value={floorEnd}
                onChange={(e) => setFloorEnd(e.target.value)}
                size="small"
                type="number"
              />
              <TextField
                label="Room Start"
                value={roomStart}
                onChange={(e) => setRoomStart(e.target.value)}
                size="small"
              />
              <TextField
                label="Room End"
                value={roomEnd}
                onChange={(e) => setRoomEnd(e.target.value)}
                size="small"
              />
            </Box>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
              <Typography variant="subtitle2">
                Paste CSV data (room_number, floor, zone, room_type)
              </Typography>
              <Button
                size="small"
                startIcon={<Download size={14} />}
                onClick={handleDownloadTemplate}
                sx={{ textTransform: "none" }}
              >
                Download Template
              </Button>
            </Box>
            <TextField
              multiline
              rows={6}
              fullWidth
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"101,1,Tower A,Standard\n102,1,Tower A,Deluxe\n201,2,Tower A,Suite"}
              sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}
            />
          </Box>
        )}

        {/* Preview */}
        <Box sx={{ mt: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="subtitle2">
              Preview
            </Typography>
            <Chip
              label={`${preview.length} rooms`}
              size="small"
              color={preview.length > 0 ? "primary" : "default"}
              sx={{ fontWeight: 600 }}
            />
          </Box>

          {preview.length > 0 ? (
            <TableContainer sx={{ maxHeight: 200, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Room</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Floor</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Zone</TableCell>
                    <TableCell sx={{ fontWeight: 600, fontSize: "0.6875rem" }}>Type</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.slice(0, 20).map((room, i) => (
                    <TableRow key={i}>
                      <TableCell sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>{room.room_number}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{room.floor || "—"}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{room.zone || "—"}</TableCell>
                      <TableCell sx={{ fontSize: "0.75rem" }}>{room.room_type}</TableCell>
                    </TableRow>
                  ))}
                  {preview.length > 20 && (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: "center", color: "text.secondary", fontSize: "0.75rem" }}>
                        ... and {preview.length - 20} more
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography sx={{ color: "text.secondary", fontSize: "0.75rem", textAlign: "center", py: 3 }}>
              Configure the range above to preview rooms
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || preview.length === 0}
          startIcon={isSubmitting ? <CircularProgress size={16} color="inherit" /> : <Plus size={16} />}
        >
          {isSubmitting ? "Creating..." : `Create ${preview.length} Rooms`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
