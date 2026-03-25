/**
 * RequestPage — Guest reviews cart and submits a service request.
 *
 * Flow: Cart items from sessionStorage → review → add guest info → submit → redirect to tracking.
 * Route: /guest/request/:sessionId
 */
import { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Card, CardContent, TextField, Button, Divider,
  IconButton, CircularProgress, Alert, Chip,
} from "@mui/material";
import { ArrowLeft, Minus, Plus, Trash2, Send, Clock, User, Phone, MessageSquare } from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";
import { trpc } from "@/lib/trpc";
import type { GuestSessionFull } from "@/lib/api/types";

interface CartEntry {
  item_id: string;
  template_item_id?: string | null;
  item_name: string;
  unit_price: string;
  currency: string;
  quantity: number;
  included_quantity: number;
}

export default function RequestPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ sessionId: string }>();

  const [session, setSession] = useState<GuestSessionFull | null>(null);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestNotes, setGuestNotes] = useState("");
  const [preferredDatetime, setPreferredDatetime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load session + cart from storage
  useEffect(() => {
    const stored = sessionStorage.getItem("pa_guest_session");
    if (stored) {
      const sess = JSON.parse(stored) as GuestSessionFull;
      setSession(sess);
      if (sess.guest_name) setGuestName(sess.guest_name);
    }

    const cartStored = sessionStorage.getItem("pa_guest_cart");
    if (cartStored) {
      setCart(JSON.parse(cartStored));
    }
  }, []);

  const currency = cart[0]?.currency || "THB";

  const { subtotal, freeItems } = useMemo(() => {
    let sub = 0;
    let free = 0;
    cart.forEach((entry) => {
      const billable = Math.max(0, entry.quantity - entry.included_quantity);
      sub += billable * parseFloat(entry.unit_price);
      free += Math.min(entry.quantity, entry.included_quantity);
    });
    return { subtotal: sub, freeItems: free };
  }, [cart]);

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((entry) => {
          if (entry.item_id !== itemId) return entry;
          const newQty = entry.quantity + delta;
          return newQty > 0 ? { ...entry, quantity: newQty } : entry;
        })
        .filter((entry) => entry.quantity > 0)
    );
  };

  const removeItem = (itemId: string) => {
    setCart((prev) => prev.filter((entry) => entry.item_id !== itemId));
  };

  // tRPC mutation for submitting the cart
  const submitCartMutation = trpc.requests.submitCart.useMutation({
    onSuccess: (result) => {
      // Clear cart from session storage
      sessionStorage.removeItem("pa_guest_cart");
      // Navigate to tracking page using the generated ref number
      navigate(`/guest/track/${result.refNo}`);
    },
    onError: (err) => {
      const msg = err.message?.toLowerCase() ?? "";
      const detail = msg.includes("session")
        ? "This session has expired. Please scan the QR code again."
        : msg.includes("invalid")
          ? "Invalid request. Please check your items and try again."
          : "Could not submit your request. Please try again.";
      setError(detail);
      setSubmitting(false);
    },
  });

  const handleSubmit = async () => {
    if (cart.length === 0) return;
    if (!params.sessionId || !session) return;

    setSubmitting(true);
    setError("");

    submitCartMutation.mutate({
      propertyId: session.property_id,
      roomId: session.room_id,
      sessionId: params.sessionId,
      guestName: guestName.trim() || undefined,
      guestPhone: guestPhone.trim() || undefined,
      guestNotes: guestNotes.trim() || undefined,
      preferredDatetime: preferredDatetime || undefined,
      matchingMode: "auto",
      items: cart.map((entry) => ({
        itemId: entry.item_id,
        itemName: entry.item_name,
        itemCategory: "Service", // category from menu item
        unitPrice: parseFloat(entry.unit_price),
        quantity: entry.quantity,
        guestNotes: undefined,
      })),
    });
  };

  if (!session) {
    return (
      <GuestLayout propertyName="Peppr Around">
        <Alert severity="warning" sx={{ borderRadius: 1.5, mb: 2 }}>
          No active session found. Please scan the QR code to start.
        </Alert>
        <Button variant="outlined" size="small" onClick={() => window.history.back()} sx={{ textTransform: "none" }}>
          Go Back
        </Button>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout propertyName={session.property_name || "Review Request"}>
      {/* Back button */}
      <Button
        variant="text" size="small"
        startIcon={<ArrowLeft size={16} />}
        onClick={() => navigate(`/guest/menu/${params.sessionId}`)}
        sx={{ textTransform: "none", color: "#737373", mb: 1, ml: -1 }}
      >
        Back to Menu
      </Button>

      <Typography variant="h6" sx={{ fontWeight: 700, color: "#171717", mb: 0.5 }}>
        Review Request
      </Typography>
      <Typography variant="caption" sx={{ color: "#737373", display: "block", mb: 2 }}>
        {session.room_number ? `Room ${session.room_number}` : ""} · {cart.length} items
      </Typography>

      {error && (
        <Alert severity="error" sx={{ borderRadius: 1.5, mb: 2 }}>{error}</Alert>
      )}

      {/* Cart Items */}
      {cart.length === 0 ? (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
          <CardContent sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" sx={{ color: "#737373" }}>
              Your cart is empty. Go back to add services.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
          <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
            {cart.map((entry, i) => {
              const billable = Math.max(0, entry.quantity - entry.included_quantity);
              const lineTotal = billable * parseFloat(entry.unit_price);
              return (
                <Box key={entry.item_id}>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "#171717" }}>
                        {entry.item_name}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}>
                        {entry.included_quantity > 0 && (
                          <Chip label={`${Math.min(entry.quantity, entry.included_quantity)} included`} size="small" sx={{ height: 18, fontSize: "0.6rem", bgcolor: "#F0FDF4", color: "#16A34A" }} />
                        )}
                        <Typography variant="caption" sx={{ color: "#737373" }}>
                          {lineTotal > 0 ? `${currency} ${lineTotal.toFixed(2)}` : "Free"}
                        </Typography>
                      </Box>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => updateQuantity(entry.item_id, -1)} sx={{ border: "1px solid #E5E5E5", borderRadius: 1, p: 0.5 }}>
                        <Minus size={12} />
                      </IconButton>
                      <Typography variant="body2" sx={{ fontWeight: 600, minWidth: 20, textAlign: "center" }}>
                        {entry.quantity}
                      </Typography>
                      <IconButton size="small" onClick={() => updateQuantity(entry.item_id, 1)} sx={{ border: "1px solid #E5E5E5", borderRadius: 1, p: 0.5 }}>
                        <Plus size={12} />
                      </IconButton>
                      <IconButton size="small" onClick={() => removeItem(entry.item_id)} sx={{ color: "#DC2626", p: 0.5 }}>
                        <Trash2 size={14} />
                      </IconButton>
                    </Box>
                  </Box>
                  {i < cart.length - 1 && <Divider />}
                </Box>
              );
            })}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Estimated Total</Typography>
              <Box sx={{ textAlign: "right" }}>
                <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>
                  {subtotal > 0 ? `${currency} ${subtotal.toFixed(2)}` : "Free"}
                </Typography>
                {freeItems > 0 && (
                  <Typography variant="caption" sx={{ color: "#16A34A" }}>
                    {freeItems} item{freeItems > 1 ? "s" : ""} included in your stay
                  </Typography>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Guest Details */}
      <Card sx={{ borderRadius: 1.5, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>Your Details (Optional)</Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <TextField
              size="small" fullWidth label="Name" placeholder="e.g., John Smith"
              value={guestName} onChange={(e) => setGuestName(e.target.value)}
              slotProps={{ input: { startAdornment: <User size={16} style={{ marginRight: 8, color: "#A3A3A3" }} /> } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />
            <TextField
              size="small" fullWidth label="Phone" placeholder="e.g., +66 812 345 678"
              value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)}
              slotProps={{ input: { startAdornment: <Phone size={16} style={{ marginRight: 8, color: "#A3A3A3" }} /> } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />
            <TextField
              size="small" fullWidth label="Special Notes" placeholder="Any special requests..."
              multiline rows={2}
              value={guestNotes} onChange={(e) => setGuestNotes(e.target.value)}
              slotProps={{ input: { startAdornment: <MessageSquare size={16} style={{ marginRight: 8, marginTop: 4, color: "#A3A3A3", alignSelf: "flex-start" }} /> } }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />
            <TextField
              size="small" fullWidth label="Preferred Date & Time" type="datetime-local"
              value={preferredDatetime} onChange={(e) => setPreferredDatetime(e.target.value)}
              slotProps={{
                inputLabel: { shrink: true },
                input: { startAdornment: <Clock size={16} style={{ marginRight: 8, color: "#A3A3A3" }} /> },
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        variant="contained" fullWidth size="large"
        onClick={handleSubmit}
        disabled={cart.length === 0 || submitting}
        startIcon={submitting ? <CircularProgress size={18} sx={{ color: "#FFFFFF" }} /> : <Send size={18} />}
        sx={{
          bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1.5, py: 1.5,
          textTransform: "none", fontWeight: 600, fontSize: "0.9375rem",
          "&:hover": { bgcolor: "#262626" },
          "&:disabled": { bgcolor: "#A3A3A3", color: "#FFFFFF" },
        }}
      >
        {submitting ? "Submitting..." : "Submit Request"}
      </Button>

      <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 1.5, color: "#A3A3A3" }}>
        Your request will be reviewed by the front desk team.
      </Typography>
    </GuestLayout>
  );
}
