/**
 * BulkTemplateAssignDialog — Dialog for assigning a service template to multiple rooms.
 *
 * Flow:
 * 1. Select a template from available templates
 * 2. Preview the assignment
 * 3. Confirm and execute
 */
import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Chip, Alert, CircularProgress,
  List, ListItemButton, ListItemText, ListItemIcon, Radio,
} from "@mui/material";
import { Layers, CheckCircle } from "lucide-react";
import { assignmentsApi, templatesApi } from "@/lib/api/endpoints";
import { toast } from "sonner";
import type { ServiceTemplate } from "@/lib/api/types";

interface BulkTemplateAssignDialogProps {
  open: boolean;
  onClose: () => void;
  selectedRoomIds: string[];
  selectedRoomNumbers: string[];
  onSuccess?: () => void;
}

export default function BulkTemplateAssignDialog({
  open,
  onClose,
  selectedRoomIds,
  selectedRoomNumbers,
  onSuccess,
}: BulkTemplateAssignDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState("");
  const [templates, setTemplates] = useState<ServiceTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError("");
    setSelectedTemplateId(null);

    const loadTemplates = async () => {
      setIsLoading(true);
      try {
        const res = await templatesApi.list({ page_size: 50 });
        setTemplates(res.items.filter((t) => t.status === "active"));
      } catch {
        setTemplates([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadTemplates();
  }, [open]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  const handleAssign = useCallback(async () => {
    if (!selectedTemplateId) {
      setError("Select a template");
      return;
    }

    setIsAssigning(true);
    setError("");

    try {
      const result = await assignmentsApi.bulkAssign({
        room_ids: selectedRoomIds,
        template_id: selectedTemplateId,
      });
      toast.success(`Template assigned to ${result.assigned} rooms${result.skipped > 0 ? ` (${result.skipped} skipped)` : ""}`);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message || err?.message || "Failed to assign template";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsAssigning(false);
    }
  }, [selectedTemplateId, selectedRoomIds, onSuccess, onClose]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 600 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Layers size={20} />
          Assign Template
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {selectedRoomIds.length} rooms selected: {selectedRoomNumbers.slice(0, 5).join(", ")}
          {selectedRoomNumbers.length > 5 && ` +${selectedRoomNumbers.length - 5} more`}
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Select a service template to assign
        </Typography>

        {isLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={24} />
          </Box>
        ) : templates.length === 0 ? (
          <Alert severity="warning">
            No active templates available. Create a template first.
          </Alert>
        ) : (
          <List sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, maxHeight: 300, overflow: "auto" }}>
            {templates.map((template) => (
              <ListItemButton
                key={template.id}
                selected={selectedTemplateId === template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                sx={{ borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: "none" } }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Radio
                    checked={selectedTemplateId === template.id}
                    size="small"
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{template.name}</Typography>
                      <Chip label={template.tier} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {template.items.length} items · {template.assigned_rooms_count} rooms assigned
                    </Typography>
                  }
                />
              </ListItemButton>
            ))}
          </List>
        )}

        {selectedTemplate && (
          <Box sx={{ mt: 2, p: 1.5, bgcolor: "action.hover", borderRadius: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Template Items
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              {selectedTemplate.items.map((item) => (
                <Typography key={item.id} variant="body2" sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                  • {item.catalog_item_name} ({item.provider_name}) — {item.currency} {item.price}
                </Typography>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isAssigning}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={isAssigning || !selectedTemplateId}
          startIcon={isAssigning ? <CircularProgress size={16} color="inherit" /> : <CheckCircle size={16} />}
        >
          {isAssigning ? "Assigning..." : "Assign Template"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
