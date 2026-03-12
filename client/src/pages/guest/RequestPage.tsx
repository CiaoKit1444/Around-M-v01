/**
 * RequestPage — Guest reviews and submits their service request.
 *
 * Design: Mobile-first, clean summary with item list, total, notes, and submit.
 * After submission, shows confirmation with request number.
 *
 * Route: /guest/request/:qrCodeId
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, TextField, Button, Divider,
  IconButton, CircularProgress,
} from "@mui/material";
import { ArrowLeft, Minus, Plus, Trash2, CheckCircle, Send, Clock } from "lucide-react";
import { useLocation, useParams } from "wouter";
import GuestLayout from "@/layouts/GuestLayout";

interface CartItem {
  id: string;
  name: string;
  provider: string;
  price: number;
  currency: string;
  qty: number;
}

const DEMO_CART: CartItem[] = [
  { id: "1", name: "Thai Massage (60 min)", provider: "Siam Spa & Wellness", price: 1500, currency: "THB", qty: 2 },
  { id: "3", name: "Room Service - Set Menu", provider: "Gourmet Kitchen Co.", price: 2200, currency: "THB", qty: 1 },
];

type PageState = "review" | "submitting" | "confirmed";

export default function RequestPage() {
  const [, navigate] = useLocation();
  const params = useParams<{ qrCodeId: string }>();
  const [state, setState] = useState<PageState>("review");
  const [cart, setCart] = useState<CartItem[]>(DEMO_CART);
  const [note, setNote] = useState("");
  const [requestNumber] = useState("SR-" + Math.random().toString(36).slice(2, 8).toUpperCase());

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const updateQty = (id: string, delta: number) => {
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const newQty = Math.max(0, item.qty + delta);
      return { ...item, qty: newQty };
    }).filter((item) => item.qty > 0));
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = async () => {
    setState("submitting");
    await new Promise((r) => setTimeout(r, 1500));
    setState("confirmed");
  };

  // Confirmed state
  if (state === "confirmed") {
    return (
      <GuestLayout propertyName="Grand Hyatt Bangkok">
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Box sx={{ width: 80, height: 80, borderRadius: "50%", bgcolor: "#F0FDF4", mx: "auto", mb: 3, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircle size={40} color="#16A34A" />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717", mb: 1 }}>
            Request Submitted
          </Typography>
          <Typography variant="body1" sx={{ color: "#737373", mb: 3 }}>
            Your request has been sent to the team.
          </Typography>

          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 3, textAlign: "left" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1 }}>Request Number</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>{requestNumber}</Typography>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1 }}>Status</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Clock size={14} color="#D97706" />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: "#D97706" }}>Pending Confirmation</Typography>
                </Box>
              </Box>
              <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1 }}>Total</Typography>
                <Typography variant="body1" sx={{ fontWeight: 700, fontFamily: '"Geist Mono", monospace' }}>THB {total.toLocaleString()}</Typography>
              </Box>
            </CardContent>
          </Card>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button
              variant="contained" fullWidth size="large"
              onClick={() => navigate(`/guest/track/${requestNumber}`)}
              sx={{
                bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1.5, py: 1.5,
                textTransform: "none", fontWeight: 600,
                "&:hover": { bgcolor: "#262626" },
              }}
            >
              Track Request
            </Button>
            <Button
              variant="outlined" fullWidth size="large"
              onClick={() => navigate(`/guest/menu/${params.qrCodeId}`)}
              sx={{
                borderColor: "#D4D4D4", color: "#404040", borderRadius: 1.5, py: 1.5,
                textTransform: "none", fontWeight: 600,
                "&:hover": { borderColor: "#171717" },
              }}
            >
              Browse More Services
            </Button>
          </Box>
        </Box>
      </GuestLayout>
    );
  }

  return (
    <GuestLayout propertyName="Grand Hyatt Bangkok">
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <IconButton size="small" onClick={() => navigate(`/guest/menu/${params.qrCodeId}`)} sx={{ color: "#404040" }}>
          <ArrowLeft size={20} />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#171717" }}>
          Review Request
        </Typography>
      </Box>

      {/* Cart Items */}
      <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          {cart.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#A3A3A3", textAlign: "center", py: 3 }}>
              Your cart is empty
            </Typography>
          ) : (
            cart.map((item, i) => (
              <Box key={item.id}>
                <Box sx={{ display: "flex", gap: 1.5, py: 1.5 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: "#171717", fontSize: "0.875rem" }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "#A3A3A3" }}>
                      {item.provider}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: "#171717", fontFamily: '"Geist Mono", monospace', mt: 0.5, fontSize: "0.8125rem" }}>
                      {item.currency} {(item.price * item.qty).toLocaleString()}
                    </Typography>
                  </Box>

                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5 }}>
                    <IconButton size="small" onClick={() => removeItem(item.id)} sx={{ color: "#D4D4D4", "&:hover": { color: "#EF4444" } }}>
                      <Trash2 size={14} />
                    </IconButton>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, border: "1px solid #E5E5E5", borderRadius: 1 }}>
                      <IconButton size="small" onClick={() => updateQty(item.id, -1)} sx={{ p: 0.5 }}>
                        <Minus size={14} />
                      </IconButton>
                      <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>
                        {item.qty}
                      </Typography>
                      <IconButton size="small" onClick={() => updateQty(item.id, 1)} sx={{ p: 0.5 }}>
                        <Plus size={14} />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
                {i < cart.length - 1 && <Divider />}
              </Box>
            ))
          )}
        </CardContent>
      </Card>

      {/* Note */}
      <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          <Typography variant="overline" sx={{ color: "#A3A3A3", letterSpacing: 1, fontSize: "0.65rem" }}>
            Special Instructions (Optional)
          </Typography>
          <TextField
            fullWidth size="small" multiline rows={2}
            placeholder="e.g., Please schedule for 3 PM..."
            value={note} onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 0.5, "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
          />
        </CardContent>
      </Card>

      {/* Summary */}
      <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", mb: 2 }}>
        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
          {cart.map((item) => (
            <Box key={item.id} sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
              <Typography variant="body2" sx={{ color: "#737373" }}>
                {item.name} x{item.qty}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', color: "#404040" }}>
                {item.currency} {(item.price * item.qty).toLocaleString()}
              </Typography>
            </Box>
          ))}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body1" sx={{ fontWeight: 700, color: "#171717" }}>Total</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700, color: "#171717", fontFamily: '"Geist Mono", monospace' }}>
              THB {total.toLocaleString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        variant="contained" fullWidth size="large"
        onClick={handleSubmit}
        disabled={cart.length === 0 || state === "submitting"}
        startIcon={state === "submitting" ? <CircularProgress size={18} color="inherit" /> : <Send size={18} />}
        sx={{
          bgcolor: "#171717", color: "#FFFFFF", borderRadius: 1.5, py: 1.5,
          textTransform: "none", fontWeight: 700, fontSize: "0.9375rem",
          "&:hover": { bgcolor: "#262626" },
          "&:disabled": { bgcolor: "#A3A3A3" },
        }}
      >
        {state === "submitting" ? "Submitting..." : "Submit Request"}
      </Button>

      <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 1.5, color: "#A3A3A3" }}>
        Your request will be reviewed by the front desk team.
      </Typography>
    </GuestLayout>
  );
}
