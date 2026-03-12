/**
 * DataStates — Reusable loading skeletons and empty state components.
 *
 * Feature #28: Replaces spinner-only loading with content-aware skeletons
 * and illustrated empty states with CTAs.
 */
import { Skeleton } from "@mui/material";
import { Box, Typography, Button } from "@mui/material";
import type { LucideIcon } from "lucide-react";
import { SearchX, FolderOpen, Wifi } from "lucide-react";

// ─── Table Row Skeleton ───────────────────────────────────────────────────────
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 6, columns = 5 }: TableSkeletonProps) {
  return (
    <Box sx={{ px: 0 }}>
      {/* Header row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 2,
          px: 2,
          py: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width="60%" height={16} />
        ))}
      </Box>
      {/* Data rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <Box
          key={rowIdx}
          sx={{
            display: "grid",
            gridTemplateColumns: `repeat(${columns}, 1fr)`,
            gap: 2,
            px: 2,
            py: 1.75,
            borderBottom: "1px solid",
            borderColor: "divider",
            alignItems: "center",
          }}
        >
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton
              key={colIdx}
              variant={colIdx === 0 ? "rounded" : "text"}
              width={colIdx === 0 ? 32 : `${60 + Math.random() * 30}%`}
              height={colIdx === 0 ? 32 : 14}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

// ─── Card Grid Skeleton ───────────────────────────────────────────────────────
interface CardSkeletonProps {
  count?: number;
  columns?: number;
}

export function CardSkeleton({ count = 6, columns = 3 }: CardSkeletonProps) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: `repeat(${columns}, 1fr)` },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
            <Skeleton variant="rounded" width={40} height={40} />
            <Box sx={{ flex: 1 }}>
              <Skeleton variant="text" width="70%" height={18} />
              <Skeleton variant="text" width="50%" height={14} sx={{ mt: 0.5 }} />
            </Box>
          </Box>
          <Skeleton variant="text" width="90%" height={14} />
          <Skeleton variant="text" width="75%" height={14} sx={{ mt: 0.5 }} />
          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Skeleton variant="rounded" width={60} height={24} />
            <Skeleton variant="rounded" width={80} height={24} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

// ─── Stat Card Skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr 1fr", md: `repeat(${count}, 1fr)` },
        gap: 2,
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Box
          key={i}
          sx={{
            p: 2.5,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}>
            <Skeleton variant="text" width="60%" height={14} />
            <Skeleton variant="circular" width={20} height={20} />
          </Box>
          <Skeleton variant="text" width="40%" height={32} />
          <Skeleton variant="text" width="55%" height={12} sx={{ mt: 0.5 }} />
        </Box>
      ))}
    </Box>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  variant?: "default" | "search" | "error";
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
}: EmptyStateProps) {
  const DefaultIcon =
    variant === "search" ? SearchX : variant === "error" ? Wifi : FolderOpen;
  const FinalIcon = Icon ?? DefaultIcon;

  const iconColor =
    variant === "error" ? "error.main" : variant === "search" ? "text.secondary" : "primary.main";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 4,
        textAlign: "center",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          bgcolor: variant === "error" ? "error.main" : "primary.main",
          opacity: 0.1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          mb: 1,
          position: "relative",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            opacity: 10,
          }}
        >
          <FinalIcon size={28} color={iconColor as string} />
        </Box>
      </Box>

      <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem" }}>
        {title}
      </Typography>

      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ maxWidth: 360, lineHeight: 1.6 }}
        >
          {description}
        </Typography>
      )}

      {(action || secondaryAction) && (
        <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
          {action && (
            <Button variant="contained" size="small" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="outlined" size="small" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
}

// ─── Inline Loading Row ───────────────────────────────────────────────────────
export function LoadingRow({ message = "Loading..." }: { message?: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        py: 4,
        justifyContent: "center",
      }}
    >
      <Skeleton variant="circular" width={20} height={20} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
}
