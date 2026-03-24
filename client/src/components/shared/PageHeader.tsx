/**
 * PageHeader — Consistent page header with title, optional badge, and action buttons.
 *
 * Design: Precision Studio — type-driven header at 32px with -0.02em tracking.
 * Actions slot on the right for primary CTA buttons.
 * Mobile: actions wrap below the title on xs screens to prevent overflow.
 */
import { Box, Chip, Typography, type SxProps } from "@mui/material";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Optional badge displayed next to the title (e.g. "Editing", "Draft") */
  badge?: { label: string; color?: "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" };
  actions?: ReactNode;
  sx?: SxProps;
}

export default function PageHeader({ title, subtitle, badge, actions, sx }: PageHeaderProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        mb: 3,
        gap: 2,
        flexWrap: "wrap",
        ...sx,
      }}
    >
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: "1.5rem", md: "2rem" },
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
          {badge && (
            <Chip
              label={badge.label}
              color={badge.color || "warning"}
              size="small"
              sx={{ fontWeight: 600, fontSize: "0.75rem", height: 24 }}
            />
          )}
        </Box>
        {subtitle && (
          <Typography
            variant="body1"
            sx={{ color: "text.secondary", mt: 0.5 }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: { xs: "flex-start", sm: "flex-end" },
            maxWidth: "100%",
          }}
        >
          {actions}
        </Box>
      )}
    </Box>
  );
}
