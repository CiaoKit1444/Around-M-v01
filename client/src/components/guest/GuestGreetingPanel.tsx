/**
 * GuestGreetingPanel — Personalised welcome panel in the guest QR experience.
 *
 * Displayed between the Banner carousel and the service body.
 *
 * Features:
 *   - Shows i18n-aware greeting (title + body) from property greetingConfig
 *   - Falls back to English if current locale has no greeting
 *   - Falls back to a generic welcome if no greeting config exists at all
 *   - Shows property logo (if available) alongside the message
 *   - Subtle card design that doesn't compete with the banner above
 *
 * Props:
 *   greeting      — Record<locale, { title, body }> from branding API (may be null)
 *   locale        — current i18n locale code
 *   propertyName  — displayed as fallback
 *   logoUrl       — optional property logo
 *   primaryColor  — accent color for the left border
 */
import { Box, Typography } from "@mui/material";
import { Sparkles } from "lucide-react";

export interface GreetingConfig {
  [locale: string]: {
    title: string;
    body: string;
  };
}

interface GuestGreetingPanelProps {
  greeting?: GreetingConfig | null;
  locale?: string;
  propertyName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

export default function GuestGreetingPanel({
  greeting,
  locale = "en",
  propertyName = "Peppr Around",
  logoUrl,
  primaryColor = "#171717",
}: GuestGreetingPanelProps) {
  // Resolve greeting: locale → English fallback → generic
  const resolved =
    (greeting && (greeting[locale] ?? greeting["en"])) ??
    null;

  const title = resolved?.title?.trim() || `Welcome to ${propertyName}`;
  const body = resolved?.body?.trim() || "";

  // If there's no custom greeting AND no logo, render a minimal strip
  const isMinimal = !resolved && !logoUrl;

  if (isMinimal) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          mb: 2,
          borderRadius: 1.5,
          bgcolor: "#F9FAFB",
          border: "1px solid #F3F4F6",
        }}
      >
        <Sparkles size={14} color={primaryColor} />
        <Typography variant="body2" sx={{ color: "#374151", fontWeight: 600, fontSize: "0.875rem" }}>
          {title}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        px: 2,
        py: 1.75,
        mb: 2,
        borderRadius: 2,
        bgcolor: "#FFFFFF",
        border: "1px solid #F3F4F6",
        borderLeft: `3px solid ${primaryColor}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Logo or sparkle icon */}
      {logoUrl ? (
        <Box
          component="img"
          src={logoUrl}
          alt={propertyName}
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            objectFit: "cover",
            flexShrink: 0,
            mt: 0.25,
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            bgcolor: primaryColor + "15",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            mt: 0.25,
          }}
        >
          <Sparkles size={16} color={primaryColor} />
        </Box>
      )}

      {/* Text */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 700,
            color: "#111827",
            fontSize: "0.9375rem",
            lineHeight: 1.3,
            mb: body ? 0.5 : 0,
          }}
        >
          {title}
        </Typography>
        {body && (
          <Typography
            variant="body2"
            sx={{
              color: "#6B7280",
              fontSize: "0.8125rem",
              lineHeight: 1.55,
            }}
          >
            {body}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
