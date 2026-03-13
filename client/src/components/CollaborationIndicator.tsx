/**
 * CollaborationIndicator — Real-time presence indicators backed by SSE server.
 *
 * Feature #49 (upgraded): Uses the Express SSE server's resource-scoped presence
 * endpoints so presence is shared across all browser sessions, not just in-memory.
 *
 * Flow:
 *   1. On mount: POST /api/sse/presence to register as a viewer (heartbeat every 15s)
 *   2. On mount: GET /api/sse/presence/:type/:id to fetch current viewers
 *   3. On unmount: DELETE /api/sse/presence to broadcast leave event
 *   4. SSE stream pushes presence:join / presence:leave events to update UI in real-time
 *
 * Usage:
 *   <CollaborationIndicator resourceId="request-123" resourceType="request" />
 */
import { useEffect, useState, useCallback, useRef } from "react";
import { Box, Avatar, Tooltip, AvatarGroup, Typography } from "@mui/material";
import { Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Viewer {
  userId: string;
  name: string;
  initials: string;
  color: string;
  lastSeen: number;
}

interface CollaborationIndicatorProps {
  resourceId: string;
  resourceType: "request" | "property" | "room" | "template" | "partner";
  pollInterval?: number;
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
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export default function CollaborationIndicator({
  resourceId,
  resourceType,
  pollInterval = 15_000,
  maxAvatars = 3,
}: CollaborationIndicatorProps) {
  const { user } = useAuth();
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const myId = user?.id ?? user?.email ?? "";
  const displayName = user
    ? (user.full_name || `${user.first_name} ${user.last_name}`.trim() || user.email || "Staff")
    : "";
  const myInitials = getInitials(displayName);
  const myColor = stringToColor(myId);

  // Fetch current viewers from server
  const fetchViewers = useCallback(async () => {
    try {
      const res = await fetch(`/api/sse/presence/${resourceType}/${resourceId}`);
      if (!res.ok) return;
      const data = await res.json() as { viewers: Viewer[] };
      setViewers(data.viewers.filter((v) => v.userId !== myId));
    } catch {
      // Server unavailable — silently degrade
    }
  }, [resourceId, resourceType, myId]);

  // POST heartbeat to register/refresh presence
  const heartbeat = useCallback(async () => {
    if (!myId) return;
    try {
      await fetch("/api/sse/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: myId,
          name: displayName,
          initials: myInitials,
          color: myColor,
          resourceType,
          resourceId,
        }),
      });
      await fetchViewers();
    } catch {
      // Silently degrade
    }
  }, [myId, displayName, myInitials, myColor, resourceType, resourceId, fetchViewers]);

  useEffect(() => {
    if (!myId) return;

    // Initial heartbeat + fetch
    heartbeat();

    // Periodic heartbeat
    heartbeatRef.current = setInterval(heartbeat, pollInterval);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      // Explicit leave on unmount
      fetch("/api/sse/presence", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: myId, resourceType, resourceId }),
      }).catch(() => {});
    };
  }, [myId, heartbeat, pollInterval, resourceType, resourceId]);

  // Listen to SSE presence events to update viewers in real-time
  useEffect(() => {
    // Find the property from user context (fallback to generic stream)
    const propertyId = user?.property_id ?? "default";
    const es = new EventSource(`/api/sse/front-office/${propertyId}`);

    es.addEventListener("presence", (e) => {
      try {
        const data = JSON.parse(e.data) as {
          event: string; key: string; userId: string;
          name: string; initials: string; color: string; viewerCount: number;
        };
        const key = `${resourceType}:${resourceId}`;
        if (data.key !== key) return;

        if (data.event === "presence:join" && data.userId !== myId) {
          setViewers((prev) => {
            if (prev.find((v) => v.userId === data.userId)) return prev;
            return [...prev, {
              userId: data.userId,
              name: data.name,
              initials: data.initials,
              color: data.color,
              lastSeen: Date.now(),
            }];
          });
        } else if (data.event === "presence:leave") {
          setViewers((prev) => prev.filter((v) => v.userId !== data.userId));
        }
      } catch { /* ignore parse errors */ }
    });

    return () => es.close();
  }, [resourceId, resourceType, myId, user?.property_id]);

  if (viewers.length === 0) return null;

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
        {viewers.map((v) => (
          <Tooltip key={v.userId} title={`${v.name} is viewing this`} placement="top">
            <Avatar sx={{ bgcolor: v.color }}>{v.initials}</Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>

      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.6875rem", whiteSpace: "nowrap" }}>
        {viewers.length === 1
          ? `${viewers[0].name.split(" ")[0]} is here`
          : `${viewers.length} others viewing`}
      </Typography>
    </Box>
  );
}
