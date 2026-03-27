/**
 * GuestBannerCarousel — Hero banner carousel for the guest QR experience.
 *
 * Features:
 *   - Auto-plays through slides every 4 seconds (pauses on hover/touch)
 *   - Dot navigation indicator
 *   - Supports background image (with overlay) or gradient fallback
 *   - Badge for banner type (announcement / promotion / default)
 *   - Optional CTA button
 *   - Filters banners by current locale (shows locale-specific + all-locale banners)
 *   - Falls back to a built-in default banner if no banners are configured
 *
 * Props:
 *   banners   — array from the branding API (may be empty → shows default)
 *   locale    — current i18n locale code (e.g. "en", "th")
 *   propertyName — used in the default fallback banner
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Box, Typography, Chip, Button, IconButton } from "@mui/material";
import { ChevronLeft, ChevronRight, ExternalLink, Megaphone, Tag, Star } from "lucide-react";

export interface BannerSlide {
  id: string;
  type: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  locale?: string | null;
}

interface GuestBannerCarouselProps {
  banners?: BannerSlide[];
  locale?: string;
  propertyName?: string;
  primaryColor?: string;
}

// ── Type config ────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<string, { label: string; color: string; gradient: string; icon: React.ReactNode }> = {
  default: {
    label: "Welcome",
    color: "#6366F1",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    icon: <Star size={12} />,
  },
  announcement: {
    label: "Announcement",
    color: "#F59E0B",
    gradient: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    icon: <Megaphone size={12} />,
  },
  promotion: {
    label: "Promotion",
    color: "#10B981",
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    icon: <Tag size={12} />,
  },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] ?? TYPE_CONFIG.default;
}

// ── Default fallback banner ────────────────────────────────────────────────────

function buildDefaultBanner(propertyName: string): BannerSlide {
  return {
    id: "__default__",
    type: "default",
    title: `Welcome to ${propertyName}`,
    body: "Browse our services and make your stay exceptional.",
    imageUrl: null,
    linkUrl: null,
    linkLabel: null,
    locale: null,
  };
}

// ── Single slide ───────────────────────────────────────────────────────────────

function BannerSlideView({ slide }: { slide: BannerSlide }) {
  const cfg = getTypeConfig(slide.type);
  const hasImage = !!slide.imageUrl;

  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: 2,
        overflow: "hidden",
        background: hasImage ? "#000" : cfg.gradient,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        p: 2.5,
        cursor: slide.linkUrl ? "pointer" : "default",
      }}
      onClick={() => {
        if (slide.linkUrl) {
          try { window.open(slide.linkUrl, "_blank", "noopener"); } catch { /* ignore */ }
        }
      }}
    >
      {/* Background image */}
      {hasImage && (
        <Box
          component="img"
          src={slide.imageUrl!}
          alt={slide.title}
          sx={{
            position: "absolute", inset: 0, width: "100%", height: "100%",
            objectFit: "cover", zIndex: 0,
          }}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      {/* Gradient overlay (always present to ensure text legibility) */}
      <Box sx={{
        position: "absolute", inset: 0, zIndex: 1,
        background: hasImage
          ? "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 60%, transparent 100%)"
          : "linear-gradient(to top, rgba(0,0,0,0.25) 0%, transparent 100%)",
      }} />

      {/* Content */}
      <Box sx={{ position: "relative", zIndex: 2 }}>
        {/* Type badge */}
        <Chip
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              {cfg.icon}
              {cfg.label}
            </Box>
          }
          size="small"
          sx={{
            mb: 1,
            bgcolor: "rgba(255,255,255,0.2)",
            backdropFilter: "blur(4px)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.65rem",
            height: 20,
            border: "1px solid rgba(255,255,255,0.3)",
            "& .MuiChip-label": { px: 1 },
          }}
        />

        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: "#FFFFFF",
            lineHeight: 1.25,
            fontSize: "1.0625rem",
            textShadow: "0 1px 4px rgba(0,0,0,0.4)",
            mb: slide.body ? 0.5 : 0,
          }}
        >
          {slide.title}
        </Typography>

        {slide.body && (
          <Typography
            variant="body2"
            sx={{
              color: "rgba(255,255,255,0.88)",
              lineHeight: 1.45,
              fontSize: "0.8125rem",
              textShadow: "0 1px 3px rgba(0,0,0,0.3)",
              mb: slide.linkUrl ? 1 : 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {slide.body}
          </Typography>
        )}

        {slide.linkUrl && slide.linkLabel && (
          <Button
            size="small"
            endIcon={<ExternalLink size={12} />}
            sx={{
              bgcolor: "rgba(255,255,255,0.2)",
              backdropFilter: "blur(4px)",
              color: "#FFFFFF",
              border: "1px solid rgba(255,255,255,0.4)",
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.75rem",
              py: 0.4,
              px: 1.25,
              borderRadius: 1,
              "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
            }}
          >
            {slide.linkLabel}
          </Button>
        )}
      </Box>
    </Box>
  );
}

// ── Main carousel ──────────────────────────────────────────────────────────────

export default function GuestBannerCarousel({
  banners = [],
  locale = "en",
  propertyName = "Peppr Around",
  primaryColor = "#171717",
}: GuestBannerCarouselProps) {
  // Filter banners: show all-locale banners + locale-specific banners for current locale
  const now = new Date();
  const filtered = banners.filter(b => {
    if (b.locale && b.locale !== locale) return false;
    return true;
  });

  // Use default banner if nothing to show
  const slides: BannerSlide[] = filtered.length > 0 ? filtered : [buildDefaultBanner(propertyName)];

  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const goTo = useCallback((idx: number) => {
    setCurrent((idx + slides.length) % slides.length);
  }, [slides.length]);

  const goNext = useCallback(() => goTo(current + 1), [current, goTo]);
  const goPrev = useCallback(() => goTo(current - 1), [current, goTo]);

  // Auto-play
  useEffect(() => {
    if (slides.length <= 1 || paused) return;
    intervalRef.current = setInterval(goNext, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [slides.length, paused, goNext]);

  // Reset to first slide when banners change
  useEffect(() => { setCurrent(0); }, [banners.length]);

  if (slides.length === 0) return null;

  return (
    <Box
      sx={{ mb: 2 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      {/* Slide container */}
      <Box sx={{ position: "relative", height: 160, borderRadius: 2, overflow: "hidden" }}>
        {/* Slides */}
        {slides.map((slide, idx) => (
          <Box
            key={slide.id}
            sx={{
              position: "absolute", inset: 0,
              opacity: idx === current ? 1 : 0,
              transition: "opacity 0.45s ease",
              pointerEvents: idx === current ? "auto" : "none",
            }}
          >
            <BannerSlideView slide={slide} />
          </Box>
        ))}

        {/* Prev/Next arrows (only when multiple slides) */}
        {slides.length > 1 && (
          <>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              sx={{
                position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)",
                bgcolor: "rgba(0,0,0,0.35)", color: "#FFFFFF", zIndex: 10,
                width: 28, height: 28,
                "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
              }}
            >
              <ChevronLeft size={16} />
            </IconButton>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              sx={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                bgcolor: "rgba(0,0,0,0.35)", color: "#FFFFFF", zIndex: 10,
                width: 28, height: 28,
                "&:hover": { bgcolor: "rgba(0,0,0,0.55)" },
              }}
            >
              <ChevronRight size={16} />
            </IconButton>
          </>
        )}
      </Box>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 1 }}>
          {slides.map((_, idx) => (
            <Box
              key={idx}
              onClick={() => goTo(idx)}
              sx={{
                width: idx === current ? 18 : 6,
                height: 6,
                borderRadius: 3,
                bgcolor: idx === current ? primaryColor : "#D1D5DB",
                cursor: "pointer",
                transition: "all 0.25s ease",
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}
