/**
 * TemplatesPage — Service Template management with card-based layout.
 *
 * Design: Precision Studio — card grid showing template tiers with item composition.
 * Data: TanStack Query → backend API, with demo data fallback.
 */
import { useState } from "react";
import {
  Box, Button, Card, CardContent, Typography, Chip, IconButton, Tooltip,
  Alert, Divider, Menu, MenuItem, LinearProgress,
} from "@mui/material";
import { Plus, Eye, Edit, MoreVertical, Package, Layers, DoorOpen, Copy, Trash2, Download } from "lucide-react";
import { useExportCSV } from "@/hooks/useExportCSV";
import type { CSVColumn } from "@/hooks/useExportCSV";
import { useLocation } from "wouter";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import EmptyState from "@/components/shared/EmptyState";
import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/DataStates";
import { useTemplates } from "@/hooks/useApi";
import { useDemoFallback } from "@/hooks/useDemoFallback";
import { getDemoTemplates } from "@/lib/api/demo-data";
import type { ServiceTemplate } from "@/lib/api/types";
import { useMemo } from "react";

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  basic: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
  vip: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
  premium: { bg: "#fefce8", text: "#854d0e", border: "#fde68a" },
};

function TemplateCard({ template, onView, onEdit }: { template: ServiceTemplate; onView: () => void; onEdit: () => void }) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const tier = TIER_COLORS[template.tier] || TIER_COLORS.basic;
  const totalPrice = template.total_price ?? template.items.reduce((s, i) => s + i.price, 0);

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderTop: `3px solid ${tier.text}`, transition: "box-shadow 0.2s", "&:hover": { boxShadow: "0 4px 20px rgba(0,0,0,0.08)" } }}>
      <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
        {/* Header */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 0.25 }}>{template.name}</Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>{template.description}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="View"><IconButton size="small" onClick={onView}><Eye size={14} /></IconButton></Tooltip>
            <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)}><MoreVertical size={14} /></IconButton>
            <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => { setAnchorEl(null); onEdit(); }}><Edit size={14} />&nbsp;Edit</MenuItem>
              <MenuItem onClick={() => setAnchorEl(null)}><Copy size={14} />&nbsp;Duplicate</MenuItem>
              <Divider />
              <MenuItem sx={{ color: "error.main" }} onClick={() => setAnchorEl(null)}><Trash2 size={14} />&nbsp;Deactivate</MenuItem>
            </Menu>
          </Box>
        </Box>

        {/* Meta */}
        <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
          <Chip label={template.tier.toUpperCase()} size="small" sx={{ bgcolor: tier.bg, color: tier.text, fontWeight: 600, border: `1px solid ${tier.border}`, height: 22, fontSize: "0.6875rem" }} />
          <StatusChip status={template.status} />
        </Box>

        {/* Items */}
        <Box sx={{ flex: 1, mb: 2 }}>
          <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
            <Package size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
            {template.items.length} items
          </Typography>
          {template.items.slice(0, 4).map((item, i) => (
            <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderBottom: i < Math.min(template.items.length, 4) - 1 ? "1px solid" : "none", borderColor: "divider" }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500, fontSize: "0.75rem" }}>{item.catalog_item_name}</Typography>
                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>{item.provider_name}</Typography>
              </Box>
              <Typography variant="body1" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: "0.75rem", flexShrink: 0 }}>
                {item.price > 0 ? `${item.price.toLocaleString()} THB` : "Free"}
              </Typography>
            </Box>
          ))}
          {template.items.length > 4 && (
            <Typography variant="body2" sx={{ fontSize: "0.6875rem", color: "text.secondary", mt: 0.5 }}>
              +{template.items.length - 4} more items
            </Typography>
          )}
        </Box>

        <Divider sx={{ mb: 1.5 }} />

        {/* Footer */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
            <DoorOpen size={13} />
            <Typography variant="body2">{template.assigned_rooms_count} rooms</Typography>
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
            {totalPrice.toLocaleString()} THB
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const [, navigate] = useLocation();
  // Stabilize params with useState — inline {} creates new ref each render → infinite re-fetches
  const [params] = useState(() => ({}));
  const [demoData] = useState(() => getDemoTemplates());
  const query = useTemplates(params);
  const { data, isLoading, isDemo } = useDemoFallback(query, demoData);

  // Hooks MUST be called before any early returns (Rules of Hooks)
  const csvColumns = useMemo<CSVColumn<ServiceTemplate>[]>(() => [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Tier", accessor: "tier" },
    { header: "Status", accessor: "status" },
    { header: "Items", accessor: (r) => r.items?.length ?? 0 },
    { header: "Assigned Rooms", accessor: "assigned_rooms_count" },
    { header: "Total Price", accessor: "total_price" },
  ], []);
  const { exportCSV, exporting } = useExportCSV<ServiceTemplate>("templates", csvColumns);

  if (isLoading) return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeaderSkeleton />
      <CardSkeleton count={6} columns={3} />
    </Box>
  );

  const templates = data?.items ?? [];

  return (
    <Box>
      <PageHeader
        title="Service Templates"
        subtitle={`${templates.length} templates configured`}
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button variant="outlined" startIcon={<Download size={16} />} size="small" onClick={() => exportCSV(templates)} disabled={exporting}>Export CSV</Button>
            <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => navigate("/admin/templates/new")}>
              Create Template
            </Button>
          </Box>
        }
      />
      {isDemo && <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>Showing demo data — connect the backend API to see live data.</Alert>}

      {templates.length === 0 ? (
        <EmptyState icon={<Layers size={40} />} title="No service templates yet" description="Create templates to bundle services for room assignment" actionLabel="Create Template" onAction={() => navigate("/admin/templates/new")} />
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 2.5 }}>
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onView={() => navigate(`/admin/templates/${t.id}`)} onEdit={() => navigate(`/admin/templates/${t.id}/edit`)} />
          ))}
        </Box>
      )}
    </Box>
  );
}
