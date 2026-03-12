/**
 * ServiceMenuPage — Guest-facing service catalog grouped by category.
 *
 * Flow: Session created → lands here → browses categories/items → adds to cart → proceeds to request.
 * Route: /guest/menu/:sessionId
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Card, CardContent, Button, Chip, Badge,
  CircularProgress, Alert, IconButton, Collapse, Divider, TextField,
} from "@mui/material";
import {
  ShoppingCart, Plus, Minus, ArrowRight, Search, X,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { guestApi } from "@/lib/api/endpoints";
import type { GuestSessionFull, ServiceMenuResponse, ServiceMenuItem } from "@/lib/api/types";

interface CartItem {
  item: ServiceMenuItem;
  quantity: number;
}

export default function ServiceMenuPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<GuestSessionFull | null>(null);
  const [menu, setMenu] = useState<ServiceMenuResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<Map<string, CartItem>>(new Map());
  const [showCart, setShowCart] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load session + menu
  useEffect(() => {
    if (!params.sessionId) {
      setError("No session ID provided.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        // Try to restore session from storage first
        const stored = sessionStorage.getItem("pa_guest_session");
        let sess: GuestSessionFull;
        if (stored) {
          sess = JSON.parse(stored);
          if (sess.session_id !== params.sessionId) {
            sess = await guestApi.getSession(params.sessionId);
          }
        } else {
          sess = await guestApi.getSession(params.sessionId);
        }
        if (cancelled) return;
        setSession(sess);
        sessionStorage.setItem("pa_guest_session", JSON.stringify(sess));

        // Load menu
        const menuData = await guestApi.getMenu(params.sessionId);
        if (cancelled) return;
        setMenu(menuData);
        if (menuData.categories.length > 0) {
          setActiveCategory(menuData.categories[0].category_name);
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          setError("Session not found or expired. Please scan the QR code again.");
        } else {
          setError("Could not load the service menu. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [params.sessionId]);

  // Cart helpers
  const addToCart = (item: ServiceMenuItem) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(item.item_id);
      const newQty = (existing?.quantity || 0) + 1;
      if (newQty <= item.max_quantity) {
        next.set(item.item_id, { item, quantity: newQty });
      }
      return next;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing && existing.quantity > 1) {
        next.set(itemId, { ...existing, quantity: existing.quantity - 1 });
      } else {
        next.delete(itemId);
      }
      return next;
    });
  };

  const cartTotal = useMemo(() => {
    let total = 0;
    cart.forEach(({ item, quantity }) => {
      const billable = Math.max(0, quantity - item.included_quantity);
      total += billable * parseFloat(item.unit_price);
    });
    return total;
  }, [cart]);

  const cartCount = useMemo(() => {
    let count = 0;
    cart.forEach(({ quantity }) => { count += quantity; });
    return count;
  }, [cart]);

  const currency = menu?.categories?.[0]?.items?.[0]?.currency || "THB";

  // Filtered items
  const filteredCategories = useMemo(() => {
    if (!menu) return [];
    if (!searchQuery.trim()) return menu.categories;
    const q = searchQuery.toLowerCase();
    return menu.categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.item_name.toLowerCase().includes(q) ||
            (item.description?.toLowerCase().includes(q))
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [menu, searchQuery]);

  // Navigate to request page
  const proceedToRequest = () => {
    const cartData = Array.from(cart.entries()).map(([id, { item, quantity }]) => ({
      item_id: id,
      template_item_id: item.template_item_id,
      item_name: item.item_name,
      unit_price: item.unit_price,
      currency: item.currency,
      quantity,
      included_quantity: item.included_quantity,
    }));
    sessionStorage.setItem("pa_guest_cart", JSON.stringify(cartData));
    navigate(`/guest/request/${params.sessionId}`);
  };

  if (loading) {
    return (
      <GuestLayout propertyName="Loading...">
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress size={40} thickness={3} sx={{ color: "#404040", mb: 2 }} />
          <Typography variant="body2" sx={{ color: "#737373" }}>Loading service menu...</Typography>
        </Box>
      </GuestLayout>
    );
  }

  if (error) {
    return (
      <GuestLayout propertyName="Peppr Around">
        <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>{error}</Alert>
        <Button variant="outlined" size="small" onClick={() => window.history.back()} sx={{ textTransform: "none" }}>
          Go Back
        </Button>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout propertyName={session?.property_name || "Services"}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#171717" }}>
              Services
            </Typography>
            <Typography variant="caption" sx={{ color: "#737373" }}>
              {session?.room_number ? `Room ${session.room_number}` : ""} · {menu?.total_items || 0} items available
            </Typography>
          </Box>
          <Badge badgeContent={cartCount} color="primary">
            <IconButton
              onClick={() => setShowCart(!showCart)}
              sx={{ border: "1px solid #E5E5E5", borderRadius: 1.5, p: 1 }}
            >
              <ShoppingCart size={20} />
            </IconButton>
          </Badge>
        </Box>

        {/* Search */}
        <TextField
          size="small" fullWidth placeholder="Search services..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          slotProps={{
            input: {
              startAdornment: <Search size={16} style={{ marginRight: 8, color: "#A3A3A3" }} />,
              endAdornment: searchQuery ? (
                <IconButton size="small" onClick={() => setSearchQuery("")}><X size={14} /></IconButton>
              ) : null,
            },
          }}
          sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5, bgcolor: "#FAFAFA" } }}
        />
      </Box>

      {/* Cart Summary (collapsible) */}
      <Collapse in={showCart && cartCount > 0}>
        <Card sx={{ mb: 2, borderRadius: 1.5, border: "1px solid #E5E5E5" }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Your Cart</Typography>
            {Array.from(cart.entries()).map(([id, { item, quantity }]) => {
              const billable = Math.max(0, quantity - item.included_quantity);
              const lineTotal = billable * parseFloat(item.unit_price);
              return (
                <Box key={id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.75 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.item_name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#737373" }}>
                      {quantity}x · {item.included_quantity > 0 && `${Math.min(quantity, item.included_quantity)} included · `}
                      {lineTotal > 0 ? `${currency} ${lineTotal.toFixed(2)}` : "Free"}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton size="small" onClick={() => removeFromCart(id)}><Minus size={14} /></IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>{quantity}</Typography>
                    <IconButton size="small" onClick={() => addToCart(item)} disabled={quantity >= item.max_quantity}><Plus size={14} /></IconButton>
                  </Box>
                </Box>
              );
            })}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Estimated Total</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {cartTotal > 0 ? `${currency} ${cartTotal.toFixed(2)}` : "Free"}
              </Typography>
            </Box>
            <Button
              variant="contained" fullWidth size="medium"
              onClick={proceedToRequest}
              endIcon={<ArrowRight size={16} />}
              sx={{
                bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1.5,
                textTransform: "none", fontWeight: 600,
                "&:hover": { bgcolor: "#262626" },
              }}
            >
              Proceed to Request
            </Button>
          </CardContent>
        </Card>
      </Collapse>

      {/* Category Tabs */}
      {filteredCategories.length > 1 && (
        <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 1, mb: 2, "&::-webkit-scrollbar": { display: "none" } }}>
          {filteredCategories.map((cat) => (
            <Chip
              key={cat.category_name}
              label={cat.category_name}
              size="small"
              onClick={() => setActiveCategory(cat.category_name)}
              sx={{
                borderRadius: 1,
                fontWeight: activeCategory === cat.category_name ? 600 : 400,
                bgcolor: activeCategory === cat.category_name ? "#171717" : "#F5F5F5",
                color: activeCategory === cat.category_name ? "#FFFFFF" : "#525252",
                "&:hover": { bgcolor: activeCategory === cat.category_name ? "#262626" : "#E5E5E5" },
                flexShrink: 0,
              }}
            />
          ))}
        </Box>
      )}

      {/* Items */}
      {filteredCategories.length === 0 && (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="body2" sx={{ color: "#737373" }}>
            {searchQuery ? "No services match your search." : "No services available."}
          </Typography>
        </Box>
      )}

      {filteredCategories
        .filter((cat) => !activeCategory || cat.category_name === activeCategory)
        .map((cat) => (
          <Box key={cat.category_name} sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#404040", mb: 1, textTransform: "uppercase", fontSize: "0.6875rem", letterSpacing: "0.05em" }}>
              {cat.category_name} ({cat.items.length})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {cat.items.map((item) => {
                const inCart = cart.get(item.item_id);
                const price = parseFloat(item.unit_price);
                return (
                  <Card
                    key={item.item_id}
                    sx={{
                      borderRadius: 1.5,
                      border: inCart ? "1px solid #171717" : "1px solid #E5E5E5",
                      boxShadow: "none",
                      opacity: item.is_available ? 1 : 0.5,
                      transition: "border-color 0.15s",
                    }}
                  >
                    <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Box sx={{ flex: 1, minWidth: 0, mr: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: "#171717" }}>
                            {item.item_name}
                          </Typography>
                          {item.description && (
                            <Typography variant="caption" sx={{ color: "#737373", display: "block", mt: 0.25 }}>
                              {item.description}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75 }}>
                            {item.included_quantity > 0 && (
                              <Chip label={`${item.included_quantity} included`} size="small" sx={{ height: 20, fontSize: "0.625rem", bgcolor: "#F0FDF4", color: "#16A34A" }} />
                            )}
                            {price > 0 && (
                              <Typography variant="caption" sx={{ fontWeight: 600, color: "#171717" }}>
                                {item.currency} {price.toFixed(2)}
                              </Typography>
                            )}
                            {price === 0 && (
                              <Chip label="Free" size="small" sx={{ height: 20, fontSize: "0.625rem", bgcolor: "#EFF6FF", color: "#2563EB" }} />
                            )}
                          </Box>
                        </Box>

                        {item.is_available ? (
                          inCart ? (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <IconButton size="small" onClick={() => removeFromCart(item.item_id)} sx={{ border: "1px solid #E5E5E5", borderRadius: 1, p: 0.5 }}>
                                <Minus size={14} />
                              </IconButton>
                              <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                                {inCart.quantity}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => addToCart(item)}
                                disabled={inCart.quantity >= item.max_quantity}
                                sx={{ border: "1px solid #E5E5E5", borderRadius: 1, p: 0.5 }}
                              >
                                <Plus size={14} />
                              </IconButton>
                            </Box>
                          ) : (
                            <IconButton
                              size="small"
                              onClick={() => addToCart(item)}
                              sx={{ bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1, p: 0.75, "&:hover": { bgcolor: "#262626" } }}
                            >
                              <Plus size={16} />
                            </IconButton>
                          )
                        ) : (
                          <Chip label="Unavailable" size="small" sx={{ height: 22, fontSize: "0.625rem", bgcolor: "#FEF2F2", color: "#DC2626" }} />
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          </Box>
        ))}

      {/* Floating Cart Button */}
      {cartCount > 0 && !showCart && (
        <Box sx={{ position: "fixed", bottom: 16, left: 16, right: 16, maxWidth: 480, mx: "auto", zIndex: 50 }}>
          <Button
            variant="contained" fullWidth size="large"
            onClick={proceedToRequest}
            sx={{
              bgcolor: "#171717", color: "#FFFFFF", borderRadius: 2, py: 1.5,
              textTransform: "none", fontWeight: 600, fontSize: "0.9375rem",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              "&:hover": { bgcolor: "#262626" },
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span>View Cart ({cartCount} items)</span>
              <span>{cartTotal > 0 ? `${currency} ${cartTotal.toFixed(2)}` : "Free"}</span>
            </Box>
          </Button>
        </Box>
      )}
    </GuestLayout>
  );
}
