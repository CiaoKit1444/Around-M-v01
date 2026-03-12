/**
 * StatusChip — Consistent status indicator across all domain pages.
 *
 * Maps status strings to color variants.
 * Uses MUI Chip with Precision Studio sizing (24px height, 4px radius).
 */
import { Chip, type ChipProps } from "@mui/material";

type StatusVariant = "success" | "warning" | "error" | "info" | "default";

const STATUS_MAP: Record<string, StatusVariant> = {
  active: "success",
  enabled: "success",
  completed: "success",
  confirmed: "success",
  fulfilled: "success",
  available: "success",
  pending: "warning",
  in_progress: "warning",
  processing: "warning",
  draft: "warning",
  inactive: "default",
  disabled: "default",
  suspended: "default",
  cancelled: "error",
  rejected: "error",
  revoked: "error",
  expired: "error",
  deactivated: "error",
  public: "info",
  restricted: "warning",
};

const VARIANT_COLORS: Record<StatusVariant, { bg: string; color: string }> = {
  success: { bg: "rgba(16,185,129,0.1)", color: "#059669" },
  warning: { bg: "rgba(245,158,11,0.1)", color: "#D97706" },
  error: { bg: "rgba(239,68,68,0.1)", color: "#DC2626" },
  info: { bg: "rgba(14,165,233,0.1)", color: "#0284C7" },
  default: { bg: "rgba(115,115,115,0.1)", color: "#737373" },
};

interface StatusChipProps {
  status: string;
  size?: ChipProps["size"];
}

export default function StatusChip({ status, size = "small" }: StatusChipProps) {
  const variant = STATUS_MAP[status.toLowerCase()] || "default";
  const colors = VARIANT_COLORS[variant];
  const label = status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Chip
      label={label}
      size={size}
      sx={{
        bgcolor: colors.bg,
        color: colors.color,
        fontWeight: 500,
        fontSize: size === "small" ? "0.625rem" : "0.6875rem",
        letterSpacing: "0.02em",
      }}
    />
  );
}
