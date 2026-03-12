/**
 * EmptyState — Displayed when a data table or list has no items.
 *
 * Uses the generated empty-state illustration.
 * Provides a title, description, and optional action button.
 */
import { Box, Typography, Button, type SxProps } from "@mui/material";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  sx?: SxProps;
}

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
  sx,
}: EmptyStateProps) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 8,
        px: 3,
        textAlign: "center",
        ...sx,
      }}
    >
      {icon || (
        <Box
          component="img"
          src="https://d2xsxph8kpxj0f.cloudfront.net/310519663252506440/jKkhr27mS3Co8cU4bKqLWb/pa-empty-state-AxrEu9u6SYT7kouE59DoqL.webp"
          alt=""
          sx={{ width: 120, height: 120, opacity: 0.6, mb: 2 }}
        />
      )}
      <Typography variant="h5" sx={{ mb: 0.5, color: "text.primary" }}>
        {title}
      </Typography>
      {description && (
        <Typography variant="body1" sx={{ color: "text.secondary", maxWidth: 360, mb: 3 }}>
          {description}
        </Typography>
      )}
      {actionLabel && onAction && (
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={onAction}
          size="small"
        >
          {actionLabel}
        </Button>
      )}
    </Box>
  );
}
