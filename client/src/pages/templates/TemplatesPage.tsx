/**
 * TemplatesPage — Service Template management with card-based layout.
 *
 * Templates are displayed as cards (not table) since they are composites
 * with nested items — cards better represent the hierarchical nature.
 */
import { Box, Button, Card, CardContent, Typography, Grid, Chip, IconButton, Tooltip, Divider } from "@mui/material";
import { Plus, Edit, Copy, Layers, Package, DoorOpen } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatusChip from "@/components/shared/StatusChip";
import { toast } from "sonner";

interface TemplateItem {
  name: string;
  provider: string;
  price: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  tier: string;
  items: TemplateItem[];
  rooms_assigned: number;
  status: string;
}

const DEMO: Template[] = [
  {
    id: "t-001", name: "Basic", description: "Essential services for standard rooms", tier: "standard",
    items: [
      { name: "Express Laundry 5kg", provider: "Siam Laundry", price: 450 },
      { name: "Breakfast Buffet", provider: "BKK Gourmet", price: 890 },
    ],
    rooms_assigned: 480, status: "active",
  },
  {
    id: "t-002", name: "VIP Package", description: "Premium services for deluxe rooms and suites", tier: "premium",
    items: [
      { name: "Thai Massage 60 min", provider: "Thai Wellness", price: 2500 },
      { name: "Afternoon Tea Set", provider: "BKK Gourmet", price: 1200 },
      { name: "Express Laundry 5kg", provider: "Siam Laundry", price: 450 },
      { name: "Airport Transfer (Sedan)", provider: "Royal Limo", price: 1800 },
    ],
    rooms_assigned: 320, status: "active",
  },
  {
    id: "t-003", name: "Premium Suite", description: "Full luxury experience for presidential suites", tier: "luxury",
    items: [
      { name: "Aromatherapy 90 min", provider: "Thai Wellness", price: 3800 },
      { name: "Afternoon Tea Set", provider: "BKK Gourmet", price: 1200 },
      { name: "Premium Flower Arrangement", provider: "Artisan Florist", price: 2200 },
      { name: "Airport Transfer (Sedan)", provider: "Royal Limo", price: 1800 },
      { name: "Express Laundry 5kg", provider: "Siam Laundry", price: 450 },
    ],
    rooms_assigned: 48, status: "active",
  },
  {
    id: "t-004", name: "Pool Service", description: "Poolside and cabana services", tier: "specialty",
    items: [
      { name: "Afternoon Tea Set", provider: "BKK Gourmet", price: 1200 },
    ],
    rooms_assigned: 24, status: "draft",
  },
];

const TIER_COLORS: Record<string, string> = {
  standard: "#737373",
  premium: "#2563EB",
  luxury: "#8B5CF6",
  specialty: "#0EA5E9",
};

export default function TemplatesPage() {
  return (
    <Box>
      <PageHeader
        title="Service Templates"
        subtitle='Compose service bundles like "Basic" and "VIP" from catalog items'
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} size="small" onClick={() => toast.info("Feature coming soon")}>
            Create Template
          </Button>
        }
      />
      <Grid container spacing={2}>
        {DEMO.map((template) => {
          const totalPrice = template.items.reduce((sum, i) => sum + i.price, 0);
          const tierColor = TIER_COLORS[template.tier] || "#737373";
          return (
            <Grid key={template.id} size={{ xs: 12, sm: 6, xl: 4 }}>
              <Card sx={{ height: "100%", display: "flex", flexDirection: "column", borderTop: `3px solid ${tierColor}` }}>
                <CardContent sx={{ p: 2.5, flex: 1, display: "flex", flexDirection: "column" }}>
                  {/* Header */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1.5 }}>
                    <Box>
                      <Typography variant="h5" sx={{ mb: 0.25 }}>{template.name}</Typography>
                      <Typography variant="body2" sx={{ color: "text.secondary" }}>{template.description}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 0.5 }}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => toast.info("Edit — coming soon")}><Edit size={14} /></IconButton></Tooltip>
                      <Tooltip title="Duplicate"><IconButton size="small" onClick={() => toast.info("Duplicate — coming soon")}><Copy size={14} /></IconButton></Tooltip>
                    </Box>
                  </Box>

                  {/* Meta */}
                  <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
                    <Chip label={template.tier.charAt(0).toUpperCase() + template.tier.slice(1)} size="small" sx={{ bgcolor: `${tierColor}15`, color: tierColor, fontWeight: 500 }} />
                    <StatusChip status={template.status} />
                  </Box>

                  {/* Items */}
                  <Box sx={{ flex: 1, mb: 2 }}>
                    <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
                      <Package size={11} style={{ marginRight: 4, verticalAlign: "middle" }} />
                      {template.items.length} items
                    </Typography>
                    {template.items.map((item, i) => (
                      <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, borderBottom: i < template.items.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 500, fontSize: "0.75rem" }}>{item.name}</Typography>
                          <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.6875rem" }}>{item.provider}</Typography>
                        </Box>
                        <Typography variant="body1" sx={{ fontVariantNumeric: "tabular-nums", fontWeight: 500, fontSize: "0.75rem", flexShrink: 0 }}>
                          {item.price.toLocaleString()} THB
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* Footer */}
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "text.secondary" }}>
                      <DoorOpen size={13} />
                      <Typography variant="body2">{template.rooms_assigned} rooms</Typography>
                    </Box>
                    <Typography variant="body1" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      {totalPrice.toLocaleString()} THB
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
