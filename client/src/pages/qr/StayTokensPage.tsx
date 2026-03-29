/**
 * StayTokensPage — Manage active stay tokens for restricted QR codes.
 *
 * Stay tokens are short-lived credentials that allow guests to access
 * restricted QR codes without scanning a public code.
 *
 * Features:
 * - List all active tokens with room, expiry, and status
 * - Validate a token manually (for front desk use)
 * - Copy token to clipboard
 * - Shows time remaining until expiry
 *
 * Route: /qr/tokens
 * Data: /v1/properties/{property_id}/qr/tokens/active
 */
import { useState, useEffect } from "react";
import {
  Box, Card, CardContent, Typography, Chip, Button, Alert,
  CircularProgress, Divider, TextField, InputAdornment, Tooltip,
  IconButton,
} from "@mui/material";
import { Key, DoorOpen, Clock, RefreshCw, Copy, Check, Shield, Search } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { TableSkeleton } from "@/components/ui/DataStates";
import { trpc } from "@/lib/trpc";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { toast } from "sonner";

/** Demo tokens for when API is unavailable */
const DEMO_TOKENS = [
  { token: "stk_a1b2c3d4e5f6", room_number: "101", expires_at: new Date(Date.now() + 2 * 3_600_000).toISOString() },
  { token: "stk_g7h8i9j0k1l2", room_number: "205", expires_at: new Date(Date.now() + 18 * 3_600_000).toISOString() },
  { token: "stk_m3n4o5p6q7r8", room_number: "312", expires_at: new Date(Date.now() + 44 * 3_600_000).toISOString() },
  { token: "stk_s9t0u1v2w3x4", room_number: "418", expires_at: new Date(Date.now() + 6 * 3_600_000).toISOString() },
  { token: "stk_y5z6a7b8c9d0", room_number: "520", expires_at: new Date(Date.now() + 70 * 3_600_000).toISOString() },
];

function useCountdown(expiresAt: string) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining("Expired"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setRemaining(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function TokenRow({ token, isDemo }: { token: typeof DEMO_TOKENS[0]; isDemo: boolean }) {
  const [copied, setCopied] = useState(false);
  const remaining = useCountdown(token.expires_at);
  const isExpiringSoon = new Date(token.expires_at).getTime() - Date.now() < 3 * 3_600_000;

  const handleCopy = () => {
    navigator.clipboard.writeText(token.token);
    setCopied(true);
    toast.success("Token copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2.5,
        py: 1.75,
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      {/* Token key icon */}
      <Key size={16} strokeWidth={1.5} style={{ color: "#A3A3A3", flexShrink: 0 }} />

      {/* Token value */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: "0.75rem",
              fontWeight: 600,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {token.token}
          </Typography>
          <Tooltip title={copied ? "Copied!" : "Copy token"}>
            <IconButton size="small" onClick={handleCopy} sx={{ p: 0.25 }}>
              {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Room */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 80 }}>
        <DoorOpen size={13} strokeWidth={1.5} style={{ color: "#737373" }} />
        <Typography sx={{ fontSize: "0.8125rem", fontWeight: 600 }}>
          Room {token.room_number}
        </Typography>
      </Box>

      {/* Expiry */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, minWidth: 120 }}>
        <Clock size={13} strokeWidth={1.5} style={{ color: isExpiringSoon ? "#F59E0B" : "#A3A3A3" }} />
        <Typography
          sx={{
            fontSize: "0.75rem",
            color: isExpiringSoon ? "warning.main" : "text.secondary",
            fontWeight: isExpiringSoon ? 600 : 400,
          }}
        >
          {remaining} left
        </Typography>
      </Box>

      {/* Status chip */}
      <Chip
        label={isExpiringSoon ? "Expiring Soon" : "Active"}
        size="small"
        sx={{
          height: 20,
          fontSize: "0.5625rem",
          fontWeight: 700,
          bgcolor: isExpiringSoon ? "#FFFBEB" : "#ECFDF5",
          color: isExpiringSoon ? "#B45309" : "#059669",
        }}
      />
    </Box>
  );
}

export default function StayTokensPage() {
  const { propertyId } = useActiveProperty();
  const [search, setSearch] = useState("");
  const [validateInput, setValidateInput] = useState("");
  const [validating, setValidating] = useState(false);

  const query = trpc.qr.activeTokens.useQuery(
    { property_id: propertyId! },
    { enabled: !!propertyId, staleTime: 30_000, retry: 1 }
  );

  const tokens = query.data?.tokens ?? DEMO_TOKENS;
  const isDemo = !query.data && !query.isLoading;

  const filtered = tokens.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return t.room_number.toLowerCase().includes(q) || t.token.toLowerCase().includes(q);
  });

  const handleValidate = async () => {
    if (!validateInput.trim()) return;
    setValidating(true);
    try {
      // Call validate-token endpoint
      const res = await fetch(`/api/v1/public/qr/validate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: validateInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        toast.success(`Token valid — Room ${data.room_number || "unknown"}`);
      } else {
        toast.error("Token invalid or expired");
      }
    } catch {
      if (isDemo) {
        const found = DEMO_TOKENS.find((t) => t.token === validateInput.trim());
        if (found) toast.success(`Token valid — Room ${found.room_number}`);
        else toast.error("Token not found");
      } else {
        toast.error("Validation failed — check connection");
      }
    } finally {
      setValidating(false);
      setValidateInput("");
    }
  };

  return (
    <Box>
      <PageHeader
        title="Stay Tokens"
        subtitle="Active restricted-access tokens for guest rooms"
        actions={
          <Button variant="outlined" size="small" startIcon={<RefreshCw size={14} />} onClick={() => query.refetch() as unknown as void}>
            Refresh
          </Button>
        }
      />

      {isDemo && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 1.5 }}>
          Showing demo tokens — connect the backend for real stay token data.
        </Alert>
      )}

      {/* Token Validator */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Shield size={16} strokeWidth={1.5} style={{ color: "#737373" }} />
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              Validate Token
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1.5, fontSize: "0.8125rem" }}>
            Enter a stay token to verify it's valid and see which room it belongs to.
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              placeholder="stk_..."
              value={validateInput}
              onChange={(e) => setValidateInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleValidate()}
              sx={{ flex: 1, fontFamily: '"Geist Mono", monospace' }}
              InputProps={{
                sx: { fontFamily: '"Geist Mono", monospace', fontSize: "0.8125rem" },
              }}
            />
            <Button
              variant="contained"
              size="small"
              onClick={handleValidate}
              disabled={!validateInput.trim() || validating}
              startIcon={validating ? <CircularProgress size={14} sx={{ color: "white" }} /> : <Shield size={14} />}
            >
              Validate
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Token List */}
      <Card>
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <TextField
              size="small"
              placeholder="Search room or token..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search size={14} /></InputAdornment> }}
              sx={{ minWidth: 220 }}
            />
            <Typography variant="body2" sx={{ color: "text.secondary", ml: "auto" }}>
              {filtered.length} active token{filtered.length !== 1 ? "s" : ""}
            </Typography>
          </Box>
        </CardContent>
        <Divider />

        {query.isLoading ? (
          <TableSkeleton rows={5} columns={4} />
        ) : filtered.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Key size={32} strokeWidth={1} style={{ color: "#D4D4D4", marginBottom: 8 }} />
            <Typography sx={{ color: "text.secondary", fontSize: "0.875rem" }}>
              No active stay tokens
            </Typography>
          </Box>
        ) : (
          filtered.map((token, i) => (
            <Box key={token.token}>
              <TokenRow token={token} isDemo={isDemo} />
              {i < filtered.length - 1 && <Divider />}
            </Box>
          ))
        )}
      </Card>
    </Box>
  );
}
