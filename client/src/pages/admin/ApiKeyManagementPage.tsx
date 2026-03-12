/**
 * ApiKeyManagementPage — Feature #50
 * Manage API keys for partner integrations (PMS, OTA, channel managers, etc.)
 *
 * Features:
 * - Create, view, rotate, and revoke API keys
 * - Assign scopes/permissions per key
 * - View last-used timestamps and usage statistics
 * - Copy key to clipboard (one-time reveal on creation)
 */
import { useState } from "react";
import {
  Box, Typography, Card, CardContent, Button, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Checkbox, FormControlLabel, FormGroup, Divider, CircularProgress, Avatar,
} from "@mui/material";
import {
  Key, Plus, Trash2, RotateCcw, Copy, Eye, EyeOff, Shield, CheckCircle,
  AlertTriangle, Clock, Activity,
} from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";

// ─── Types ────────────────────────────────────────────────────────────────────
type ApiKeyScope =
  | "requests:read"
  | "requests:write"
  | "sessions:read"
  | "sessions:write"
  | "catalog:read"
  | "catalog:write"
  | "reports:read"
  | "webhooks:write";

const SCOPE_DESCRIPTIONS: Record<ApiKeyScope, { label: string; description: string; group: string }> = {
  "requests:read": { label: "Read Requests", description: "View service requests and their status", group: "Requests" },
  "requests:write": { label: "Write Requests", description: "Create and update service requests", group: "Requests" },
  "sessions:read": { label: "Read Sessions", description: "View guest sessions", group: "Sessions" },
  "sessions:write": { label: "Write Sessions", description: "Create and manage guest sessions", group: "Sessions" },
  "catalog:read": { label: "Read Catalog", description: "View service catalog items", group: "Catalog" },
  "catalog:write": { label: "Write Catalog", description: "Manage catalog items and pricing", group: "Catalog" },
  "reports:read": { label: "Read Reports", description: "Access analytics and reports", group: "Reports" },
  "webhooks:write": { label: "Manage Webhooks", description: "Register and manage webhook endpoints", group: "Webhooks" },
};

interface ApiKey {
  id: string;
  name: string;
  partner: string;
  prefix: string; // e.g. "pa_live_xxxx"
  scopes: ApiKeyScope[];
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  status: "active" | "revoked" | "expired";
  requests_count: number;
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_KEYS: ApiKey[] = [
  {
    id: "k1", name: "Opera PMS Integration", partner: "Oracle Hospitality",
    prefix: "pa_live_Op3r", scopes: ["requests:read", "requests:write", "sessions:read"],
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    last_used_at: new Date(Date.now() - 3600000).toISOString(),
    status: "active", requests_count: 14823,
  },
  {
    id: "k2", name: "Booking.com Channel Manager", partner: "Booking.com",
    prefix: "pa_live_B00k", scopes: ["catalog:read", "sessions:write"],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    last_used_at: new Date(Date.now() - 86400000).toISOString(),
    status: "active", requests_count: 2341,
  },
  {
    id: "k3", name: "Old PMS Key (Deprecated)", partner: "Legacy System",
    prefix: "pa_live_L3g4", scopes: ["requests:read"],
    created_at: new Date(Date.now() - 180 * 86400000).toISOString(),
    last_used_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    status: "revoked", requests_count: 5012,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return "pa_live_" + Array.from({ length: 40 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

// ─── Scope Selector ───────────────────────────────────────────────────────────
function ScopeSelector({ selected, onChange }: { selected: ApiKeyScope[]; onChange: (s: ApiKeyScope[]) => void }) {
  const groups = Array.from(new Set(Object.values(SCOPE_DESCRIPTIONS).map(s => s.group)));
  return (
    <Box>
      {groups.map(group => (
        <Box key={group} sx={{ mb: 2 }}>
          <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
            {group}
          </Typography>
          <FormGroup>
            {(Object.entries(SCOPE_DESCRIPTIONS) as [ApiKeyScope, typeof SCOPE_DESCRIPTIONS[ApiKeyScope]][])
              .filter(([, v]) => v.group === group)
              .map(([scope, cfg]) => (
                <FormControlLabel
                  key={scope}
                  control={
                    <Checkbox
                      size="small"
                      checked={selected.includes(scope)}
                      onChange={e => {
                        if (e.target.checked) onChange([...selected, scope]);
                        else onChange(selected.filter(s => s !== scope));
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{cfg.label}</Typography>
                      <Typography variant="caption" color="text.secondary">{cfg.description}</Typography>
                    </Box>
                  }
                />
              ))}
          </FormGroup>
        </Box>
      ))}
    </Box>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApiKeyManagementPage() {
  const [keys, setKeys] = useState<ApiKey[]>(DEMO_KEYS);
  const [createDialog, setCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPartner, setNewKeyPartner] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<ApiKeyScope[]>(["requests:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const activeKeys = keys.filter(k => k.status === "active");
  const revokedKeys = keys.filter(k => k.status !== "active");

  const handleCreate = async () => {
    if (!newKeyName.trim() || newKeyScopes.length === 0) return;
    setCreating(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate API call
    const rawKey = generateApiKey();
    const newKey: ApiKey = {
      id: `k${Date.now()}`,
      name: newKeyName.trim(),
      partner: newKeyPartner.trim() || "Custom Integration",
      prefix: rawKey.slice(0, 12),
      scopes: newKeyScopes,
      created_at: new Date().toISOString(),
      status: "active",
      requests_count: 0,
    };
    setKeys(prev => [newKey, ...prev]);
    setCreatedKey(rawKey);
    setCreating(false);
    setNewKeyName("");
    setNewKeyPartner("");
    setNewKeyScopes(["requests:read"]);
  };

  const handleRevoke = (keyId: string) => {
    setKeys(prev => prev.map(k => k.id === keyId ? { ...k, status: "revoked" as const } : k));
    toast.success("API key revoked");
    setRevokeConfirm(null);
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success("Copied to clipboard"));
  };

  const StatusBadge = ({ status }: { status: ApiKey["status"] }) => {
    const config = {
      active: { label: "Active", color: "success" as const, icon: <CheckCircle size={10} /> },
      revoked: { label: "Revoked", color: "error" as const, icon: <AlertTriangle size={10} /> },
      expired: { label: "Expired", color: "warning" as const, icon: <Clock size={10} /> },
    }[status];
    return <Chip label={config.label} color={config.color} size="small" icon={config.icon} />;
  };

  const KeyRow = ({ apiKey }: { apiKey: ApiKey }) => (
    <TableRow sx={{ opacity: apiKey.status !== "active" ? 0.6 : 1 }}>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: "0.75rem" }}>
            <Key size={14} />
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{apiKey.name}</Typography>
            <Typography variant="caption" color="text.secondary">{apiKey.partner}</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Typography variant="body2" sx={{ fontFamily: '"Geist Mono", monospace', fontSize: "0.75rem" }}>
            {apiKey.prefix}••••••••••••••••••••••••••••
          </Typography>
          <Tooltip title="Copy prefix">
            <IconButton size="small" onClick={() => handleCopy(apiKey.prefix)}>
              <Copy size={12} />
            </IconButton>
          </Tooltip>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {apiKey.scopes.map(scope => (
            <Chip key={scope} label={scope} size="small" variant="outlined" sx={{ fontSize: "0.625rem", height: 20 }} />
          ))}
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Activity size={12} color="#A3A3A3" />
          <Typography variant="body2">{apiKey.requests_count.toLocaleString()}</Typography>
        </Box>
      </TableCell>
      <TableCell>
        {apiKey.last_used_at ? (
          <Typography variant="body2">{timeAgo(apiKey.last_used_at)}</Typography>
        ) : (
          <Typography variant="body2" color="text.disabled">Never</Typography>
        )}
      </TableCell>
      <TableCell><StatusBadge status={apiKey.status} /></TableCell>
      <TableCell>
        {apiKey.status === "active" && (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <Tooltip title="Rotate key">
              <IconButton size="small" onClick={() => toast.info("Key rotation coming soon")}>
                <RotateCcw size={14} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Revoke key">
              <IconButton size="small" color="error" onClick={() => setRevokeConfirm(apiKey.id)}>
                <Trash2 size={14} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </TableCell>
    </TableRow>
  );

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="API Key Management"
        subtitle="Manage partner integrations and API access credentials"
        actions={
          <Button variant="contained" startIcon={<Plus size={16} />} onClick={() => setCreateDialog(true)}>
            New API Key
          </Button>
        }
      />

      {/* Stats */}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 }}>
        {[
          { label: "Active Keys", value: activeKeys.length, color: "#10B981", icon: <CheckCircle size={16} /> },
          { label: "Total Requests", value: keys.reduce((s, k) => s + k.requests_count, 0).toLocaleString(), color: "#3b82f6", icon: <Activity size={16} /> },
          { label: "Revoked Keys", value: revokedKeys.length, color: "#ef4444", icon: <AlertTriangle size={16} /> },
          { label: "Scopes Used", value: Array.from(new Set(keys.flatMap(k => k.scopes))).length, color: "#8b5cf6", icon: <Shield size={16} /> },
        ].map(s => (
          <Card key={s.label} sx={{ borderLeft: `4px solid ${s.color}` }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                <Box sx={{ color: s.color }}>{s.icon}</Box>
                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
              </Box>
              <Typography variant="h5" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      {/* Active Keys Table */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>Active API Keys</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name / Partner</TableCell>
                  <TableCell>Key Prefix</TableCell>
                  <TableCell>Scopes</TableCell>
                  <TableCell>Requests</TableCell>
                  <TableCell>Last Used</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activeKeys.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                      No active API keys. Create one to enable partner integrations.
                    </TableCell>
                  </TableRow>
                ) : (
                  activeKeys.map(k => <KeyRow key={k.id} apiKey={k} />)
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }} color="text.secondary">
              Revoked / Expired Keys
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Name / Partner</TableCell>
                    <TableCell>Key Prefix</TableCell>
                    <TableCell>Scopes</TableCell>
                    <TableCell>Requests</TableCell>
                    <TableCell>Last Used</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {revokedKeys.map(k => <KeyRow key={k.id} apiKey={k} />)}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Create Key Dialog */}
      <Dialog open={createDialog} onClose={() => { if (!createdKey) setCreateDialog(false); }} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Key size={18} />
            {createdKey ? "API Key Created" : "Create New API Key"}
          </Box>
        </DialogTitle>
        <DialogContent>
          {createdKey ? (
            <Box>
              <Alert severity="warning" sx={{ mb: 2 }}>
                <strong>Copy this key now.</strong> It will not be shown again for security reasons.
              </Alert>
              <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: '"Geist Mono", monospace', flex: 1, wordBreak: "break-all", fontSize: "0.75rem" }}
                >
                  {showKey ? createdKey : createdKey.slice(0, 12) + "•".repeat(28)}
                </Typography>
                <IconButton size="small" onClick={() => setShowKey(v => !v)}>
                  {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                </IconButton>
                <IconButton size="small" onClick={() => handleCopy(createdKey)}>
                  <Copy size={14} />
                </IconButton>
              </Box>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              <TextField
                label="Key Name" fullWidth size="small" required
                placeholder="e.g., Opera PMS Integration"
                value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
              />
              <TextField
                label="Partner / System" fullWidth size="small"
                placeholder="e.g., Oracle Hospitality"
                value={newKeyPartner} onChange={e => setNewKeyPartner(e.target.value)}
              />
              <Divider />
              <Typography variant="subtitle2" fontWeight={600}>Permissions (Scopes)</Typography>
              <ScopeSelector selected={newKeyScopes} onChange={setNewKeyScopes} />
              {newKeyScopes.length === 0 && (
                <Alert severity="error" sx={{ mt: -1 }}>At least one scope is required.</Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {createdKey ? (
            <Button variant="contained" onClick={() => { setCreatedKey(null); setShowKey(false); setCreateDialog(false); }}>
              Done
            </Button>
          ) : (
            <>
              <Button onClick={() => setCreateDialog(false)}>Cancel</Button>
              <Button
                variant="contained"
                onClick={handleCreate}
                disabled={!newKeyName.trim() || newKeyScopes.length === 0 || creating}
                startIcon={creating ? <CircularProgress size={14} /> : <Key size={14} />}
              >
                Create Key
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Revoke Confirm Dialog */}
      <Dialog open={!!revokeConfirm} onClose={() => setRevokeConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Revoke API Key</DialogTitle>
        <DialogContent>
          <Alert severity="error">
            This action cannot be undone. Any integrations using this key will immediately lose access.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeConfirm(null)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => revokeConfirm && handleRevoke(revokeConfirm)}>
            Revoke Key
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
