/**
 * SessionManagementPage — View and revoke active admin sessions.
 *
 * Shows all active sessions for the current user with device info,
 * IP address, and last activity. Allows revoking individual sessions
 * or all sessions except the current one.
 */
import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Monitor, Smartphone, Tablet, Globe, Trash2, LogOut, Shield } from "lucide-react";
import { toast } from "sonner";
import PageHeader from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";

interface AdminSession {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile" | "tablet";
  browser: string;
  os: string;
  ipAddress: string;
  location: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
}

// Mock sessions data (placeholder until FastAPI session endpoint is available)
const mockSessions: AdminSession[] = [
  {
    id: "sess_current",
    device: "Chrome on macOS",
    deviceType: "desktop",
    browser: "Chrome 121",
    os: "macOS 14",
    ipAddress: "192.168.1.1",
    location: "Bangkok, Thailand",
    lastActive: new Date().toISOString(),
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isCurrent: true,
  },
  {
    id: "sess_mobile",
    device: "Safari on iPhone",
    deviceType: "mobile",
    browser: "Safari 17",
    os: "iOS 17",
    ipAddress: "10.0.0.5",
    location: "Bangkok, Thailand",
    lastActive: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
  {
    id: "sess_tablet",
    device: "Chrome on iPad",
    deviceType: "tablet",
    browser: "Chrome 121",
    os: "iPadOS 17",
    ipAddress: "172.16.0.10",
    location: "Chiang Mai, Thailand",
    lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    isCurrent: false,
  },
];

function DeviceIcon({ type }: { type: AdminSession["deviceType"] }) {
  if (type === "mobile") return <Smartphone size={18} />;
  if (type === "tablet") return <Tablet size={18} />;
  return <Monitor size={18} />;
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SessionManagementPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<AdminSession[]>(mockSessions);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);

  const handleRevokeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success("Session revoked successfully");
    // In production: call FastAPI DELETE /v1/auth/sessions/{sessionId}
  };

  const handleRevokeAll = () => {
    setSessions(prev => prev.filter(s => s.isCurrent));
    setRevokeAllOpen(false);
    toast.success("All other sessions have been revoked");
    // In production: call FastAPI DELETE /v1/auth/sessions (revoke all except current)
  };

  const otherSessions = sessions.filter(s => !s.isCurrent);
  const currentSession = sessions.find(s => s.isCurrent);

  return (
    <Box>
      <PageHeader
        title="Session Management"
        subtitle="View and manage your active login sessions"
        actions={
          otherSessions.length > 0 ? (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<LogOut size={14} />}
              onClick={() => setRevokeAllOpen(true)}
            >
              Revoke All Other Sessions
            </Button>
          ) : undefined
        }
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Current session */}
        {currentSession && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
                <Shield size={20} color="#22c55e" />
                <Typography variant="h6" fontWeight={600}>Current Session</Typography>
                <Chip label="Active" color="success" size="small" />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <DeviceIcon type={currentSession.deviceType} />
                  <Typography variant="body2" fontWeight={500}>{currentSession.device}</Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Globe size={14} />
                  <Typography variant="body2" color="text.secondary">{currentSession.ipAddress}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{currentSession.location}</Typography>
                <Typography variant="body2" color="text.secondary">
                  Signed in {formatRelativeTime(currentSession.createdAt)}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Other sessions */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Other Sessions ({otherSessions.length})
            </Typography>
            {otherSessions.length === 0 ? (
              <Alert severity="info" icon={<Shield size={16} />}>
                No other active sessions. You are only logged in from this device.
              </Alert>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Device</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>IP Address</TableCell>
                      <TableCell>Last Active</TableCell>
                      <TableCell>Signed In</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {otherSessions.map(session => (
                      <TableRow key={session.id} hover>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <DeviceIcon type={session.deviceType} />
                            <Box>
                              <Typography variant="body2" fontWeight={500}>{session.device}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {session.browser} · {session.os}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{session.location}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">{session.ipAddress}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatRelativeTime(session.lastActive)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{formatRelativeTime(session.createdAt)}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Revoke this session">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleRevokeSession(session.id)}
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

        {/* Security tips */}
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>Security Tips</Typography>
            <Alert severity="warning" sx={{ mb: 1 }}>
              If you see a session you don't recognize, revoke it immediately and change your password.
            </Alert>
            <Alert severity="info">
              Sessions automatically expire after 30 days of inactivity. Enable 2FA for additional security.
            </Alert>
          </CardContent>
        </Card>
      </Box>

      {/* Revoke all confirmation dialog */}
      <Dialog open={revokeAllOpen} onClose={() => setRevokeAllOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Revoke All Other Sessions?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will sign out {otherSessions.length} other session{otherSessions.length !== 1 ? "s" : ""}.
            Your current session will remain active.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeAllOpen(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleRevokeAll}>
            Revoke All
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
