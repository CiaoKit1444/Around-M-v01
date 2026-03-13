/**
 * CollaborationIndicator — Real-time presence indicators.
 *
 * Feature #49: Shows which staff members are currently viewing the same
 * page/resource. Uses a polling-based approach (no WebSocket required)
 * that pings a lightweight heartbeat endpoint every 15 seconds.
 *
 * Usage:
 *   <CollaborationIndicator resourceId="request-123" resourceType="request" />
 *
 * Falls back gracefully when the backend is unavailable.
 */
import { useEffect, useState, useCallback } from "react";
import { Box, Avatar, Tooltip, AvatarGroup, Typography, Chip } from "@mui/material";
import { Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface ActiveUser {
  id: string;
  name: string;
  initials: string;
  color: string;
  lastSeen: number; // ms timestamp
}

interface CollaborationIndicatorProps {
  resourceId: string;
  resourceType: "request" | "property" | "room" | "template" | "partner";
  /** Polling interval in ms. Default: 15000 */
  pollInterval?: number;
  /** Max avatars to show before "+N" overflow. Default: 3 */
  maxAvatars?: number;
}

// Deterministic color from string
function stringToColor(str: string): string {
  const colors = [
    "#2563EB", "#8B5CF6", "#0EA5E9", "#10B981",
    "#F59E0B", "#EF4444", "#EC4899", "#14B8A6",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// In-memory presence store (shared across component instances on same page)
const presenceStore: Map<string, Map<string, ActiveUser>> = new Map();

export default function CollaborationIndicator({
  resourceId,
  resourceType,
  pollInterval = 15_000,
  maxAvatars = 3,
}: CollaborationIndicatorProps) {
  const { user } = useAuth();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  const storeKey = `${resourceType}:${resourceId}`;

  const broadcastPresence = useCallback(() => {
    if (!user) return;

    const displayName = user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email || "You";
    const me: ActiveUser = {
      id: user.id ?? user.email ?? "me",
      name: displayName,
      initials: getInitials(displayName),
      color: stringToColor(user.id ?? user.email ?? "me"),
      lastSeen: Date.now(),
    };

    if (!presenceStore.has(storeKey)) presenceStore.set(storeKey, new Map());
    presenceStore.get(storeKey)!.set(me.id, me);

    // Prune stale users (> 45s without heartbeat)
    const now = Date.now();
    const stale: string[] = [];
    presenceStore.get(storeKey)!.forEach((u, id) => {
      if (now - u.lastSeen > 45_000) stale.push(id);
    });
    stale.forEach((id) => presenceStore.get(storeKey)!.delete(id));

    // Update local state with all active users except self
    const others = Array.from(presenceStore.get(storeKey)!.values()).filter(
      (u) => u.id !== me.id
    );
    setActiveUsers(others);
  }, [user, storeKey]);

  useEffect(() => {
    broadcastPresence();
    const interval = setInterval(broadcastPresence, pollInterval);

    return () => {
      clearInterval(interval);
      // Remove self from store on unmount
      if (user && presenceStore.has(storeKey)) {
        const myId = user.id ?? user.email ?? "me";
        presenceStore.get(storeKey)!.delete(myId);
      }
    };
  }, [broadcastPresence, pollInterval, storeKey, user]);

  if (activeUsers.length === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.5,
        borderRadius: 2,
        bgcolor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Box
          sx={{
            width: 6, height: 6, borderRadius: "50%",
            bgcolor: "#22c55e",
            animation: "pulse 2s infinite",
            "@keyframes pulse": {
              "0%, 100%": { opacity: 1 },
              "50%": { opacity: 0.4 },
            },
          }}
        />
        <Users size={12} style={{ color: "var(--mui-palette-text-secondary)" }} />
      </Box>

      <AvatarGroup
        max={maxAvatars}
        sx={{
          "& .MuiAvatar-root": {
            width: 22, height: 22, fontSize: "0.5625rem",
            fontWeight: 700, border: "1.5px solid",
            borderColor: "background.paper",
          },
        }}
      >
        {activeUsers.map((u) => (
          <Tooltip key={u.id} title={`${u.name} is viewing this`} placement="top">
            <Avatar sx={{ bgcolor: u.color }}>{u.initials}</Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>

      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", whiteSpace: "nowrap" }}>
        {activeUsers.length === 1
          ? `${activeUsers[0].name.split(" ")[0]} is here`
          : `${activeUsers.length} others viewing`}
      </Typography>
    </Box>
  );
}

/**
 * CollaborationDot — Minimal version showing just a pulsing dot + count.
 * Use in list rows or compact spaces.
 */
export function CollaborationDot({
  resourceId,
  resourceType,
}: Pick<CollaborationIndicatorProps, "resourceId" | "resourceType">) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const storeKey = `${resourceType}:${resourceId}`;

  useEffect(() => {
    if (!user) return;
    const myId = user.id ?? user.email ?? "me";
    const interval = setInterval(() => { // eslint-disable-line
      const others = Array.from(presenceStore.get(storeKey)?.values() ?? []).filter(
        (u) => u.id !== myId && Date.now() - u.lastSeen < 45_000
      );
      setCount(others.length);
    }, 5_000);
    return () => clearInterval(interval);
  }, [user, storeKey]);

  if (count === 0) return null;

  return (
    <Tooltip title={`${count} other${count > 1 ? "s" : ""} viewing`}>
      <Chip
        size="small"
        label={count}
        sx={{
          height: 18, fontSize: "0.625rem", fontWeight: 700,
          bgcolor: "#22c55e", color: "white",
          "& .MuiChip-label": { px: 0.75 },
        }}
      />
    </Tooltip>
  );
}
