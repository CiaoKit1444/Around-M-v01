/**
 * ServiceMenuPage — Guest-facing service catalog grouped by category.
 *
 * Features (updated):
 * - Service item images with fallback (Feature #47)
 * - Guest "favorites" / "order again" quick-reorder section (Feature #48)
 *
 * Flow: Session created → lands here → browses categories/items → adds to cart → proceeds to request.
 * Route: /guest/menu/:sessionId
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Card, CardContent, Button, Chip, Badge,
  CircularProgress, Alert, IconButton, Collapse, Divider, TextField,
  Tabs, Tab,
} from "@mui/material";
import {
  ShoppingCart, Plus, Minus, ArrowRight, Search, X, ClipboardList,
  Heart, RotateCcw, ImageOff,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { guestApi } from "@/lib/api/endpoints";
import type { GuestSessionFull, ServiceMenuResponse, ServiceMenuItem } from "@/lib/api/types";

interface CartItem {
  item: ServiceMenuItem;
  quantity: number;
}

// ─── Favorites persistence ────────────────────────────────────────────────────
const FAVORITES_KEY = "pa_guest_favorites";
const ORDER_HISTORY_KEY = "pa_guest_order_history";

function getFavorites(): string[] {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"); } catch { return []; }
}
function toggleFavorite(itemId: string): string[] {
  const favs = getFavorites();
  const next = favs.includes(itemId) ? favs.filter(f => f !== itemId) : [...favs, itemId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

interface OrderHistoryEntry {
  item_id: string;
  item_name: string;
  unit_price: string;
  currency: string;
  included_quantity: number;
  max_quantity: number;
  description?: string;
  image_url?: string;
  is_available: boolean;
  template_item_id: string;
  last_ordered: string;
  count: number;
}
function getOrderHistory(): OrderHistoryEntry[] {
  try { return JSON.parse(localStorage.getItem(ORDER_HISTORY_KEY) ?? "[]"); } catch { return []; }
}
function recordOrder(item: ServiceMenuItem) {
  const history = getOrderHistory();
  const existing = history.find(h => h.item_id === item.item_id);
  if (existing) {
    existing.count += 1;
    existing.last_ordered = new Date().toISOString();
  } else {
    history.unshift({ ...item, template_item_id: item.template_item_id ?? "", description: item.description ?? undefined, image_url: (item as any).image_url ?? undefined, last_ordered: new Date().toISOString(), count: 1 });
  }
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(history.slice(0, 10)));
}

// ─── Item Image Component ─────────────────────────────────────────────────────
function ItemImage({ src, alt }: { src?: string; alt: string }) {
  const [error, setError] = useState(false);
  if (!src || error) {
    return (
      <Box sx={{
        width: 72, height: 72, borderRadius: 1.5, bgcolor: "#F5F5F5",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        <ImageOff size={20} color="#A3A3A3" />
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={src}
      alt={alt}
      onError={() => setError(true)}
      sx={{ width: 72, height: 72, borderRadius: 1.5, objectFit: "cover", flexShrink: 0 }}
    />
  );
}

// ─── Service Item Card ────────────────────────────────────────────────────────
function ServiceItemCard({
  item, inCart, onAdd, onRemove, isFavorite, onToggleFavorite,
}: {
  item: ServiceMenuItem;
  inCart?: CartItem;
  onAdd: () => void;
  onRemove: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}) {
  const price = parseFloat(item.unit_price);
  return (
    <Card
      sx={{
        borderRadius: 1.5,
        border: inCart ? "1px solid #171717" : "1px solid #E5E5E5",
        boxShadow: "none",
        opacity: item.is_available ? 1 : 0.5,
        transition: "border-color 0.15s",
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          {/* Item Image */}
          <ItemImage src={(item as any).image_url} alt={item.item_name} />

          {/* Item Info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: "#171717", pr: 1 }}>
                {item.item_name}
              </Typography>
              <IconButton
                size="small"
                onClick={onToggleFavorite}
                sx={{ p: 0.25, flexShrink: 0 }}
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart size={14} fill={isFavorite ? "#ef4444" : "none"} color={isFavorite ? "#ef4444" : "#A3A3A3"} />
              </IconButton>
            </Box>
            {item.description && (
              <Typography variant="caption" sx={{ color: "#737373", display: "block", mt: 0.25, lineHeight: 1.4 }}>
                {item.description}
              </Typography>
            )}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.75, flexWrap: "wrap" }}>
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

          {/* Add/Remove Controls */}
          <Box sx={{ flexShrink: 0 }}>
            {!item.is_available ? (
              <Chip label="Unavailable" size="small" sx={{ height: 22, fontSize: "0.625rem", bgcolor: "#FEF2F2", color: "#DC2626" }} />
            ) : inCart ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <IconButton size="small" onClick={onRemove} sx={{ border: "1px solid #E5E5E5", borderRadius: 1, p: 0.5 }}>
                  <Minus size={14} />
                </IconButton>
                <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                  {inCart.quantity}
                </Typography>
                <IconButton
                  size="small" onClick={onAdd}
                  disabled={inCart.quantity >= item.max_quantity}
                  sx={{ border: "1px solid #E5E5E5", borderRadius: 1, p: 0.5 }}
                >
                  <Plus size={14} />
                </IconButton>
              </Box>
            ) : (
              <IconButton
                size="small" onClick={onAdd}
                sx={{ bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1, p: 0.75, "&:hover": { bgcolor: "#262626" } }}
              >
                <Plus size={16} />
              </IconButton>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
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
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const [orderHistory] = useState<OrderHistoryEntry[]>(getOrderHistory);
  const [activeTab, setActiveTab] = useState(0); // 0=All, 1=Favorites, 2=Order Again

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

  // All items flat list
  const allItems = useMemo(() => menu?.categories.flatMap(c => c.items) ?? [], [menu]);

  // Favorite items
  const favoriteItems = useMemo(() => allItems.filter(i => favorites.includes(i.item_id)), [allItems, favorites]);

  // Order again items (from history, matched against current menu)
  const orderAgainItems = useMemo(() => {
    const menuItemIds = new Set(allItems.map(i => i.item_id));
    return orderHistory
      .filter(h => menuItemIds.has(h.item_id))
      .map(h => allItems.find(i => i.item_id === h.item_id)!)
      .filter(Boolean)
      .slice(0, 5);
  }, [allItems, orderHistory]);

  const handleToggleFavorite = (itemId: string) => {
    setFavorites(toggleFavorite(itemId));
  };

  // Navigate to request page
  const proceedToRequest = () => {
    // Record order history
    cart.forEach(({ item }) => recordOrder(item));

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
      <GuestLayout propertyName="">
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* Category tab shimmer */}
          <Box sx={{ display: "flex", gap: 1, overflowX: "auto", pb: 0.5 }}>
            {[90, 70, 100, 80, 60].map((w, i) => (
              <Box key={i} sx={{
                height: 32, width: w, borderRadius: 4, flexShrink: 0,
                background: "linear-gradient(90deg, #e8e8e8 25%, #f2f2f2 50%, #e8e8e8 75%)",
                backgroundSize: "200% 100%",
                animation: `shimmer 1.4s infinite ${i * 0.1}s`,
                "@keyframes shimmer": { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
              }} />
            ))}
          </Box>
          {/* Item card shimmer */}
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Box key={i} sx={{
              display: "flex", gap: 2, p: 2, borderRadius: 2,
              border: "1px solid #f0f0f0",
              background: "linear-gradient(90deg, #fafafa 25%, #f4f4f4 50%, #fafafa 75%)",
              backgroundSize: "200% 100%",
              animation: `shimmer 1.4s infinite ${i * 0.08}s`,
            }}>
              <Box sx={{ width: 72, height: 72, borderRadius: 1.5, bgcolor: "#e8e8e8", flexShrink: 0 }} />
              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Box sx={{ height: 14, borderRadius: 1, bgcolor: "#e0e0e0", width: "60%" }} />
                <Box sx={{ height: 11, borderRadius: 1, bgcolor: "#ebebeb", width: "85%" }} />
                <Box sx={{ height: 11, borderRadius: 1, bgcolor: "#ebebeb", width: "70%" }} />
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 0.5 }}>
                  <Box sx={{ height: 16, borderRadius: 1, bgcolor: "#e0e0e0", width: "25%" }} />
                  <Box sx={{ height: 32, borderRadius: 2, bgcolor: "#e8e8e8", width: 100 }} />
                </Box>
              </Box>
            </Box>
          ))}
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
          <Box sx={{ display: "flex", gap: 1 }}>
            <IconButton
              onClick={() => navigate(`/guest/history/${params.sessionId}`)}
              title="My Requests"
              sx={{ border: "1px solid #E5E5E5", borderRadius: 1.5, p: 1 }}
            >
              <ClipboardList size={18} />
            </IconButton>
            <Badge badgeContent={cartCount} color="primary">
              <IconButton
                onClick={() => setShowCart(!showCart)}
                sx={{ border: "1px solid #E5E5E5", borderRadius: 1.5, p: 1 }}
              >
                <ShoppingCart size={20} />
              </IconButton>
            </Badge>
          </Box>
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

      {/* Tabs: All / Favorites / Order Again */}
      {(favoriteItems.length > 0 || orderAgainItems.length > 0) && (
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ mb: 2, "& .MuiTab-root": { textTransform: "none", minWidth: 0, px: 2, fontSize: "0.8125rem" } }}
          variant="scrollable"
          scrollButtons={false}
        >
          <Tab label="All Services" />
          {favoriteItems.length > 0 && (
            <Tab label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Heart size={12} fill="#ef4444" color="#ef4444" />
                Favorites ({favoriteItems.length})
              </Box>
            } />
          )}
          {orderAgainItems.length > 0 && (
            <Tab label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <RotateCcw size={12} />
                Order Again
              </Box>
            } />
          )}
        </Tabs>
      )}

      {/* Favorites Tab */}
      {activeTab === 1 && favoriteItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {favoriteItems.map(item => (
              <ServiceItemCard
                key={item.item_id}
                item={item}
                inCart={cart.get(item.item_id)}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.item_id)}
                isFavorite={favorites.includes(item.item_id)}
                onToggleFavorite={() => handleToggleFavorite(item.item_id)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Order Again Tab */}
      {activeTab === 2 && orderAgainItems.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="caption" sx={{ color: "#737373", mb: 1, display: "block" }}>
            Based on your previous orders
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {orderAgainItems.map(item => (
              <ServiceItemCard
                key={item.item_id}
                item={item}
                inCart={cart.get(item.item_id)}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.item_id)}
                isFavorite={favorites.includes(item.item_id)}
                onToggleFavorite={() => handleToggleFavorite(item.item_id)}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* All Services Tab */}
      {activeTab === 0 && (
        <>
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
                  {cat.items.map((item) => (
                    <ServiceItemCard
                      key={item.item_id}
                      item={item}
                      inCart={cart.get(item.item_id)}
                      onAdd={() => addToCart(item)}
                      onRemove={() => removeFromCart(item.item_id)}
                      isFavorite={favorites.includes(item.item_id)}
                      onToggleFavorite={() => handleToggleFavorite(item.item_id)}
                    />
                  ))}
                </Box>
              </Box>
            ))}
        </>
      )}

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
