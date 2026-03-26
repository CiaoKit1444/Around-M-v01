/**
 * Breadcrumbs — Lightweight breadcrumb trail for detail pages.
 *
 * Design: Precision Studio — small, muted trail above the page header.
 * Renders a "/" separated list of crumbs; the last crumb is non-clickable.
 */
import { Box, Typography } from "@mui/material";
import { ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export interface Crumb {
  label: string;
  /** If omitted, the crumb is rendered as plain text (current page). */
  href?: string;
}

interface BreadcrumbsProps {
  crumbs: Crumb[];
}

export default function Breadcrumbs({ crumbs }: BreadcrumbsProps) {
  const [, navigate] = useLocation();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        mb: 1.5,
        flexWrap: "wrap",
      }}
    >
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {i > 0 && (
              <ChevronRight
                size={13}
                style={{ color: "var(--mui-palette-text-disabled, #9e9e9e)", flexShrink: 0 }}
              />
            )}
            {!isLast && crumb.href ? (
              <Typography
                component="span"
                variant="caption"
                onClick={() => navigate(crumb.href!)}
                sx={{
                  color: "text.secondary",
                  cursor: "pointer",
                  fontWeight: 500,
                  fontSize: "0.75rem",
                  "&:hover": { color: "primary.main", textDecoration: "underline" },
                  transition: "color 0.15s",
                }}
              >
                {crumb.label}
              </Typography>
            ) : (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  color: isLast ? "text.primary" : "text.secondary",
                  fontWeight: isLast ? 600 : 500,
                  fontSize: "0.75rem",
                }}
              >
                {crumb.label}
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
