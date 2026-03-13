/**
 * StaffPositionDetailPage — Create or edit a staff position.
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button,
  CircularProgress, Alert,
} from "@mui/material";
import { ArrowLeft, Save, Briefcase, Building2 } from "lucide-react";
import { useLocation, useParams } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import { DetailSkeleton } from "@/components/ui/DataStates";
import { toast } from "sonner";
import { staffApi } from "@/lib/api/endpoints";
import { getDemoPositions } from "@/lib/api/demo-data";
import type { StaffPosition } from "@/lib/api/types";

interface PositionForm {
  title: string;
  department: string;
}

const EMPTY_FORM: PositionForm = { title: "", department: "" };

export default function StaffPositionDetailPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";

  const [form, setForm] = useState<PositionForm>(EMPTY_FORM);
  const [position, setPosition] = useState<StaffPosition | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Load position on edit mode
  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await staffApi.listPositions();
        const found = res.items.find((p: StaffPosition) => p.id === params.id);
        if (cancelled) return;
        if (found) {
          setPosition(found);
          setForm({ title: found.title, department: found.department });
        } else {
          const demoPositions = getDemoPositions();
          const demoPos = demoPositions.items.find((p: StaffPosition) => p.id === params.id);
          if (demoPos) {
            setPosition(demoPos);
            setForm({ title: demoPos.title, department: demoPos.department });
          } else {
            setError("Position not found.");
          }
        }
      } catch {
        if (cancelled) return;
        const demoPositions = getDemoPositions();
        const demoPos = demoPositions.items.find((p: StaffPosition) => p.id === params.id);
        if (demoPos) {
          setPosition(demoPos);
          setForm({ title: demoPos.title, department: demoPos.department });
        } else {
          setError("Failed to load position.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isNew, params.id]);

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    if (!form.department.trim()) { toast.error("Department is required"); return; }
    setSaving(true);
    try {
      if (isNew) {
        await staffApi.createPosition({ title: form.title, department: form.department });
        toast.success("Position created successfully");
        navigate("/staff");
      } else {
        const updated = await staffApi.updatePosition(params.id!, {
          title: form.title,
          department: form.department,
        });
        setPosition(updated);
        toast.success("Position updated successfully");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "Failed to save position.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DetailSkeleton sections={1} />;
  }

  return (
    <Box>
      <PageHeader
        title={isNew ? "Add Position" : position?.title || "Position Details"}
        subtitle={isNew ? "Create a new staff position" : `Department: ${position?.department}`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" size="small" startIcon={<ArrowLeft size={14} />} onClick={() => navigate("/staff")}>
              Back
            </Button>
            <Button
              variant="contained" size="small"
              startIcon={saving ? <CircularProgress size={14} sx={{ color: "#FFF" }} /> : <Save size={14} />}
              onClick={handleSave} disabled={saving}
            >
              {saving ? "Saving..." : isNew ? "Create Position" : "Save Changes"}
            </Button>
          </Box>
        }
      />

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ fontSize: "0.875rem", fontWeight: 600, mb: 2.5 }}>
            Position Details
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2.5 }}>
            <TextField
              label="Title" required fullWidth size="small"
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="e.g. Front Desk Agent"
              slotProps={{ input: { startAdornment: <Briefcase size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
            />
            <TextField
              label="Department" required fullWidth size="small"
              value={form.department}
              onChange={(e) => setForm((prev) => ({ ...prev, department: e.target.value }))}
              placeholder="e.g. Front Office"
              slotProps={{ input: { startAdornment: <Building2 size={16} color="#A3A3A3" style={{ marginRight: 8 }} /> } }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
