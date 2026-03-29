/**
 * SsoAllowlistPage — Manage which email addresses are permitted to use Google SSO.
 *
 * Super Admin only. Lists current allowlist entries, allows adding new ones,
 * and deactivating existing ones.
 *
 * Backend: /v1/admin/sso-allowlist (GET, POST, DELETE /{entry_id})
 */
import { useState } from "react";
import {
  Box, Card, CardContent, Typography, TextField, Button, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Alert, CircularProgress, Tooltip, Dialog, DialogTitle,
  DialogContent, DialogActions,
} from "@mui/material";
import { Plus, Trash2, ShieldCheck, RefreshCw, Info } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { toast } from "sonner";

interface AllowlistEntry {
  entry_id: string;
  email: string;
  note: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

interface AllowlistResponse {
  items: AllowlistEntry[];
  total: number;
}

export default function SsoAllowlistPage() {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AllowlistEntry | null>(null);

  const { data, isLoading, error, refetch } = useQuery<AllowlistResponse>({
    queryKey: ["sso-allowlist"],
    queryFn: () => api.get("v1/admin/sso-allowlist").json<AllowlistResponse>(),
    retry: 1,
  });

  const addMutation = useMutation({
    mutationFn: (body: { email: string; note?: string }) =>
      api.post("v1/admin/sso-allowlist", { json: body }).json<any>(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sso-allowlist"] });
      toast.success(`${newEmail} added to SSO allowlist`);
      setNewEmail("");
      setNewNote("");
      setAddOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to add entry");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (entryId: string) =>
      api.delete(`v1/admin/sso-allowlist/${entryId}`).json<any>(),
    onSuccess: (_, entryId) => {
      queryClient.invalidateQueries({ queryKey: ["sso-allowlist"] });
      toast.success("Entry deactivated");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Failed to remove entry");
    },
  });

  const handleAdd = () => {
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }
    addMutation.mutate({ email: newEmail.trim(), note: newNote.trim() || undefined });
  };

  const activeEntries = data?.items.filter((e) => e.is_active) ?? [];
  const inactiveEntries = data?.items.filter((e) => !e.is_active) ?? [];

  return (
    <Box>
      <PageHeader
        title="SSO Allowlist"
        subtitle="Control which email addresses are permitted to sign in with Google SSO"
        actions={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshCw size={14} />}
              onClick={() => refetch()}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={14} />}
              onClick={() => setAddOpen(true)}
            >
              Add Email
            </Button>
          </Box>
        }
      />

      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>How it works:</strong> When the allowlist has at least one active entry, only
        emails on this list can sign in with Google SSO. If the list is empty, all users with
        a Peppr Around account can use Google SSO.
      </Alert>

      {isLoading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          Failed to load SSO allowlist. Make sure you have Super Admin access.
        </Alert>
      )}

      {!isLoading && !error && (
        <>
          {/* Active Entries */}
          <Card sx={{ mb: 3 }}>
            <CardContent sx={{ pb: "16px !important" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Active Entries
                </Typography>
                <Chip label={activeEntries.length} size="small" color="success" />
              </Box>

              {activeEntries.length === 0 ? (
                <Box sx={{ py: 4, textAlign: "center" }}>
                  <Typography color="text.secondary">
                    No active entries — all Peppr Around users can use Google SSO.
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Plus size={14} />}
                    sx={{ mt: 2 }}
                    onClick={() => setAddOpen(true)}
                  >
                    Add first entry
                  </Button>
                </Box>
              ) : (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Email</TableCell>
                        <TableCell>Note</TableCell>
                        <TableCell>Added by</TableCell>
                        <TableCell>Added at</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {activeEntries.map((entry) => (
                        <TableRow key={entry.entry_id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {entry.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {entry.note || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {entry.created_by || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {new Date(entry.created_at).toLocaleDateString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Tooltip title="Remove from allowlist">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => setDeleteTarget(entry)}
                              >
                                <Trash2 size={14} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Inactive / Removed Entries */}
          {inactiveEntries.length > 0 && (
            <Card>
              <CardContent sx={{ pb: "16px !important" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "text.secondary" }}>
                    Removed Entries
                  </Typography>
                  <Chip label={inactiveEntries.length} size="small" />
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Email</TableCell>
                        <TableCell>Note</TableCell>
                        <TableCell>Added by</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inactiveEntries.map((entry) => (
                        <TableRow key={entry.entry_id}>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ color: "text.disabled", textDecoration: "line-through" }}
                            >
                              {entry.email}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.disabled">
                              {entry.note || "—"}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.disabled">
                              {entry.created_by || "—"}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add to SSO Allowlist</DialogTitle>
        <DialogContent sx={{ pt: "16px !important" }}>
          <TextField
            label="Email address"
            type="email"
            fullWidth
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
            placeholder="user@example.com"
          />
          <TextField
            label="Note (optional)"
            fullWidth
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="e.g. Partner Admin — Siam Prestige"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleAdd}
            disabled={addMutation.isPending || !newEmail.trim()}
            startIcon={addMutation.isPending ? <CircularProgress size={14} /> : <Plus size={14} />}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Remove Dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Remove from SSO Allowlist</DialogTitle>
        <DialogContent>
          <Typography>
            Remove <strong>{deleteTarget?.email}</strong> from the SSO allowlist? They will no
            longer be able to sign in with Google SSO.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => deleteTarget && removeMutation.mutate(deleteTarget.entry_id)}
            disabled={removeMutation.isPending}
            startIcon={
              removeMutation.isPending ? <CircularProgress size={14} /> : <Trash2 size={14} />
            }
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
