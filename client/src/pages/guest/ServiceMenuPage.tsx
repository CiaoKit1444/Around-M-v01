/**
 * ServiceMenuPage — Guest browses available services for their room.
 *
 * Design: Mobile-first card layout grouped by category.
 * Each service shows name, provider, price, and an "Add" button.
 *
 * Route: /guest/menu/:qrCodeId
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, Chip, Button, Badge, IconButton,
  Tabs, Tab, Divider,
} from "@mui/material";
import { ShoppingCart, Plus, Minus, ArrowRight, Sparkles, UtensilsCrossed, Car, Shirt, Heart } from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";

interface ServiceItem {
  id: string;
  name: string;
  provider: string;
  price: number;
  currency: string;
  description: string;
  category: string;
  is_optional: boolean;
  image_emoji: string;
}

const DEMO_SERVICES: ServiceItem[] = [
  { id: "1", name: "Thai Massage (60 min)", provider: "Siam Spa & Wellness", price: 1500, currency: "THB", description: "Traditional Thai massage by certified therapist", category: "Spa & Wellness", is_optional: false, image_emoji: "💆" },
  { id: "2", name: "Aromatherapy Massage (90 min)", provider: "Siam Spa & Wellness", price: 2200, currency: "THB", description: "Relaxing aromatherapy with essential oils", category: "Spa & Wellness", is_optional: true, image_emoji: "🧴" },
  { id: "3", name: "Room Service - Set Menu", provider: "Gourmet Kitchen Co.", price: 2200, currency: "THB", description: "Chef's selection of Thai and international cuisine", category: "Dining", is_optional: false, image_emoji: "🍽️" },
  { id: "4", name: "Breakfast In-Room", provider: "Gourmet Kitchen Co.", price: 850, currency: "THB", description: "Continental or Asian breakfast delivered to your room", category: "Dining", is_optional: true, image_emoji: "🥐" },
  { id: "5", name: "Minibar Refresh", provider: "Gourmet Kitchen Co.", price: 500, currency: "THB", description: "Restock minibar with premium beverages and snacks", category: "Dining", is_optional: false, image_emoji: "🍷" },
  { id: "6", name: "Airport Transfer (Sedan)", provider: "Bangkok Limousine", price: 1800, currency: "THB", description: "Private sedan transfer to/from BKK airport", category: "Transportation", is_optional: true, image_emoji: "🚗" },
  { id: "7", name: "City Tour (Half Day)", provider: "Bangkok Limousine", price: 3500, currency: "THB", description: "4-hour guided city tour with private vehicle", category: "Transportation", is_optional: true, image_emoji: "🗺️" },
  { id: "8", name: "Express Laundry", provider: "CleanPro Services", price: 350, currency: "THB", description: "Same-day laundry service, returned by 6 PM", category: "Laundry", is_optional: true, image_emoji: "👔" },
  { id: "9", name: "Dry Cleaning (Per Item)", provider: "CleanPro Services", price: 200, currency: "THB", description: "Professional dry cleaning, 24-hour turnaround", category: "Laundry", is_optional: true, image_emoji: "👗" },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Spa & Wellness": <Heart size={14} />,
  "Dining": <UtensilsCrossed size={14} />,
  "Transportation": <Car size={14} />,
  "Laundry": <Shirt size={14} />,
};

export default function ServiceMenuPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ qrCodeId: string }>();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState(0);

  const categories = Array.from(new Set(DEMO_SERVICES.map((s) => s.category)));
  const filteredServices = DEMO_SERVICES.filter((s) => s.category === categories[activeCategory]);

  const cartCount = Object.values(cart).reduce((sum, qty) => sum + qty, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, qty]) => {
    const item = DEMO_SERVICES.find((s) => s.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const addToCart = (id: string) => {
    setCart((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => {
      const newCart = { ...prev };
      if (newCart[id] > 1) newCart[id]--;
      else delete newCart[id];
      return newCart;
    });
  };

  return (
    <GuestLayout propertyName="Grand Hyatt Bangkok">
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
          Services
        </Typography>
        <Typography variant="body2" sx={{ color: "#737373" }}>
          Room 101 &middot; Browse and request services
        </Typography>
      </Box>

      {/* Category Tabs */}
      <Tabs
        value={activeCategory}
        onChange={(_, v) => setActiveCategory(v)}
        variant="scrollable"
        scrollButtons={false}
        sx={{
          mb: 2, minHeight: 36,
          "& .MuiTab-root": {
            minHeight: 36, textTransform: "none", fontWeight: 500, fontSize: "0.8125rem",
            px: 1.5, minWidth: "auto",
          },
          "& .MuiTabs-indicator": { height: 2, borderRadius: 1 },
        }}
      >
        {categories.map((cat) => (
          <Tab key={cat} label={cat} icon={(CATEGORY_ICONS[cat] || <Sparkles size={14} />) as React.ReactElement} iconPosition="start" />
        ))}
      </Tabs>

      {/* Service Cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: cartCount > 0 ? 10 : 2 }}>
        {filteredServices.map((service) => {
          const qty = cart[service.id] || 0;
          return (
            <Card
              key={service.id}
              sx={{
                borderRadius: 2, border: "1px solid",
                borderColor: qty > 0 ? "#171717" : "#E5E5E5",
                boxShadow: qty > 0 ? "0 2px 8px rgba(0,0,0,0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                transition: "all 0.2s ease",
                bgcolor: "#FFFFFF",
              }}
            >
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  {/* Emoji Icon */}
                  <Box sx={{ width: 48, height: 48, borderRadius: 1.5, bgcolor: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", flexShrink: 0 }}>
                    {service.image_emoji}
                  </Box>

                  {/* Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: "#171717", fontSize: "0.875rem", lineHeight: 1.3 }}>
                        {service.name}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: "#A3A3A3", display: "block", mb: 0.5 }}>
                      {service.provider}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#737373", fontSize: "0.75rem", lineHeight: 1.4, mb: 1 }}>
                      {service.description}
                    </Typography>

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body1" sx={{ fontWeight: 700, color: "#171717", fontFamily: '"Geist Mono", monospace', fontSize: "0.875rem" }}>
                        {service.currency} {service.price.toLocaleString()}
                      </Typography>

                      {qty === 0 ? (
                        <Button
                          variant="outlined" size="small"
                          startIcon={<Plus size={14} />}
                          onClick={() => addToCart(service.id)}
                          sx={{
                            borderColor: "#D4D4D4", color: "#404040", borderRadius: 1.5,
                            textTransform: "none", fontWeight: 600, fontSize: "0.75rem", py: 0.5, px: 1.5,
                            "&:hover": { borderColor: "#171717", bgcolor: "#F5F5F5" },
                          }}
                        >
                          Add
                        </Button>
                      ) : (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, bgcolor: "#171717", borderRadius: 1.5, px: 0.5 }}>
                          <IconButton size="small" onClick={() => removeFromCart(service.id)} sx={{ color: "#FFFFFF", p: 0.5 }}>
                            <Minus size={14} />
                          </IconButton>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: "#FFFFFF", minWidth: 16, textAlign: "center" }}>
                            {qty}
                          </Typography>
                          <IconButton size="small" onClick={() => addToCart(service.id)} sx={{ color: "#FFFFFF", p: 0.5 }}>
                            <Plus size={14} />
                          </IconButton>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Box>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <Box
          sx={{
            position: "fixed", bottom: 0, left: 0, right: 0,
            bgcolor: "#171717", color: "#FFFFFF", py: 1.5, px: 2,
            zIndex: 20, boxShadow: "0 -4px 12px rgba(0,0,0,0.15)",
          }}
        >
          <Box sx={{ maxWidth: 600, mx: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Badge badgeContent={cartCount} color="primary" sx={{ "& .MuiBadge-badge": { bgcolor: "#FFFFFF", color: "#171717", fontWeight: 700 } }}>
                <ShoppingCart size={20} />
              </Badge>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: "0.875rem" }}>
                  {cartCount} {cartCount === 1 ? "item" : "items"}
                </Typography>
                <Typography variant="caption" sx={{ color: "#A3A3A3", fontFamily: '"Geist Mono", monospace' }}>
                  THB {cartTotal.toLocaleString()}
                </Typography>
              </Box>
            </Box>
            <Button
              variant="contained" size="small"
              endIcon={<ArrowRight size={16} />}
              onClick={() => navigate(`/guest/request/${params.qrCodeId}`)}
              sx={{
                bgcolor: "#FFFFFF", color: "#171717", borderRadius: 1.5,
                textTransform: "none", fontWeight: 700, fontSize: "0.8125rem",
                "&:hover": { bgcolor: "#F5F5F5" },
              }}
            >
              Review Request
            </Button>
          </Box>
        </Box>
      )}
    </GuestLayout>
  );
}
