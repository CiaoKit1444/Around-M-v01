/**
 * PresenceAvatars — Shows avatars of other admins currently on the same page.
 *
 * Usage: <PresenceAvatars page="/partners" />
 * Place in page headers to show real-time collaboration indicators.
 */
import { Avatar, AvatarGroup, Tooltip, Box, Typography } from "@mui/material";
import { useCollabPresence } from "@/hooks/useCollabPresence";

interface PresenceAvatarsProps {
  page: string;
  max?: number;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export function PresenceAvatars({ page, max = 4 }: PresenceAvatarsProps) {
  const { peers } = useCollabPresence(page);

  if (peers.length === 0) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ fontSize: "0.7rem" }}>
        Also viewing:
      </Typography>
      <AvatarGroup
        max={max}
        sx={{
          "& .MuiAvatar-root": {
            width: 28,
            height: 28,
            fontSize: "0.65rem",
            fontWeight: 600,
            border: "2px solid",
            borderColor: "background.paper",
          },
        }}
      >
        {peers.map(peer => (
          <Tooltip key={peer.userId} title={peer.name} arrow>
            <Avatar
              src={peer.avatar}
              sx={{ bgcolor: stringToColor(peer.name) }}
            >
              {getInitials(peer.name)}
            </Avatar>
          </Tooltip>
        ))}
      </AvatarGroup>
    </Box>
  );
}
