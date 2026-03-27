/**
 * GuestPreviewPage — Shareable, public guest greeting preview.
 *
 * URL: /guest/preview?propertyId=…&locale=en&guestName=James+Wilson&room=301
 *
 * Accessible without admin login. Renders a full-screen phone-frame preview of
 * the property's greeting panel and banner carousel with resolved personalisation
 * tokens, so property managers can share a live preview link with colleagues or
 * clients for sign-off.
 *
 * Query params:
 *   propertyId  — required; the property whose CMS content to preview
 *   locale      — optional; defaults to "en"
 *   guestName   — optional; resolves {{guest_name}} token
 *   room        — optional; resolves {{room_number}} token
 *   propertyName — optional; display name override for {{property_name}} token
 */
import { useState, useEffect, useMemo } from "react";
import { Box, Typography, Chip, CircularProgress, Alert, Tooltip, IconButton } from "@mui/material";
import { Smartphone, Eye, Copy, Check, Globe, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import GuestBannerCarousel, { BannerSlide } from "@/components/guest/GuestBannerCarousel";
import GuestGreetingPanel from "@/components/guest/GuestGreetingPanel";

// ── Locale metadata ───────────────────────────────────────────────────────────

const LOCALES: { value: string; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "th", label: "ภาษาไทย", flag: "🇹🇭" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getParam(search: string, key: string): string {
  const params = new URLSearchParams(search);
  return params.get(key) ?? "";
}

// ── Phone frame ───────────────────────────────────────────────────────────────

interface PhoneFrameProps {
  banners: BannerSlide[];
  greeting: Record<string, { title: string; body: string }> | null;
  locale: string;
  propertyName: string;
  logoUrl?: string | null;
  primaryColor: string;
  guestName?: string;
  roomNumber?: string;
}

function PhoneFrame({
  banners, greeting, locale, propertyName, logoUrl, primaryColor, guestName, roomNumber,
}: PhoneFrameProps) {
  return (
    <Box sx={{
      width: 320,
      borderRadius: "36px",
      border: "10px solid #1F2937",
      bgcolor: "#F9FAFB",
      overflow: "hidden",
      boxShadow: "0 32px 80px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.08)",
      position: "relative",
      flexShrink: 0,
    }}>
      {/* Notch */}
      <Box sx={{
        position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 90, height: 22, bgcolor: "#1F2937", borderRadius: "0 0 14px 14px", zIndex: 10,
      }} />

      {/* Screen */}
      <Box sx={{ pt: 3.5, pb: 3, px: 1.75, minHeight: 560, bgcolor: "#FFFFFF", overflowY: "auto" }}>
        {/* Status bar */}
        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, px: 0.5 }}>
          <Typography sx={{ fontSize: "0.6rem", color: "#374151", fontWeight: 700 }}>9:41</Typography>
          <Typography sx={{ fontSize: "0.6rem", color: "#374151" }}>●●●</Typography>
        </Box>

        {/* Banner carousel */}
        <GuestBannerCarousel
          banners={banners}
          locale={locale}
          propertyName={propertyName}
          primaryColor={primaryColor}
        />

        {/* Greeting panel with resolved tokens */}
        <GuestGreetingPanel
          greeting={greeting}
          locale={locale}
          propertyName={propertyName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          guestName={guestName || undefined}
          roomNumber={roomNumber || undefined}
        />

        {/* Stub service menu */}
        <Box sx={{
          borderRadius: 2, bgcolor: "#F3F4F6", p: 2,
          border: "1px dashed #D1D5DB",
        }}>
          <Typography sx={{ color: "#9CA3AF", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: 0.5, mb: 1 }}>
            Service Menu
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {["Room Service", "Housekeeping", "Concierge", "Spa & Wellness"].map(s => (
              <Box key={s} sx={{
                display: "flex", alignItems: "center", gap: 1,
                p: 1, borderRadius: 1.5, bgcolor: "#FFFFFF", border: "1px solid #E5E7EB",
              }}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: "#E5E7EB", flexShrink: 0 }} />
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ height: 8, width: "60%", bgcolor: "#E5E7EB", borderRadius: 1, mb: 0.5 }} />
                  <Box sx={{ height: 6, width: "40%", bgcolor: "#F3F4F6", borderRadius: 1 }} />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Home indicator */}
      <Box sx={{
        height: 28, bgcolor: "#FFFFFF",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Box sx={{ width: 48, height: 4, borderRadius: 2, bgcolor: "#D1D5DB" }} />
      </Box>
    </Box>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement("textarea");
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Tooltip title={copied ? "Copied!" : "Copy link"}>
      <IconButton
        size="small"
        onClick={handleCopy}
        sx={{
          bgcolor: copied ? "#D1FAE5" : "#F3F4F6",
          color: copied ? "#059669" : "#374151",
          borderRadius: 1.5,
          px: 1.5, py: 0.75,
          gap: 0.75,
          display: "flex", alignItems: "center",
          "&:hover": { bgcolor: copied ? "#A7F3D0" : "#E5E7EB" },
          transition: "all 0.2s ease",
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        <Typography variant="caption" sx={{ fontWeight: 600, fontSize: "0.75rem" }}>
          {copied ? "Copied!" : "Copy link"}
        </Typography>
      </IconButton>
    </Tooltip>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GuestPreviewPage() {
  const search = typeof window !== "undefined" ? window.location.search : "";

  const propertyId = getParam(search, "propertyId");
  const [locale, setLocale] = useState(getParam(search, "locale") || "en");
  const guestName = getParam(search, "guestName");
  const roomNumber = getParam(search, "room");
  const propertyNameOverride = getParam(search, "propertyName");

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  const previewQ = trpc.cmsPublic.getPublicPreview.useQuery(
    { propertyId },
    {
      enabled: !!propertyId,
      retry: 1,
      staleTime: 30_000,
    },
  );

  const propertyName = propertyNameOverride || "Peppr Property";

  const localeInfo = LOCALES.find(l => l.value === locale) ?? LOCALES[0];

  // Build locale-switched URL
  const buildLocaleUrl = (newLocale: string) => {
    const params = new URLSearchParams(search);
    params.set("locale", newLocale);
    return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
  };

  if (!propertyId) {
    return (
      <Box sx={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        bgcolor: "#F9FAFB", p: 3,
      }}>
        <Alert severity="error" sx={{ maxWidth: 480 }}>
          <strong>Missing propertyId.</strong> This preview link is incomplete. Please generate a new link from the property's Guest CMS tab.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{
      minHeight: "100vh",
      bgcolor: "#F1F5F9",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Top banner ────────────────────────────────────────────────────── */}
      <Box sx={{
        bgcolor: "#1E293B",
        px: { xs: 2, sm: 4 },
        py: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        flexWrap: "wrap",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{
            display: "flex", alignItems: "center", gap: 0.75,
            px: 1.25, py: 0.5, borderRadius: 10,
            bgcolor: "#334155",
          }}>
            <Eye size={12} color="#94A3B8" />
            <Typography sx={{ color: "#94A3B8", fontWeight: 700, fontSize: "0.65rem", letterSpacing: 0.5 }}>
              PREVIEW MODE
            </Typography>
          </Box>
          <Typography sx={{ color: "#CBD5E1", fontSize: "0.8rem" }}>
            This is a preview — not visible to guests
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          {/* Session context chips */}
          {guestName && (
            <Chip
              label={`Guest: ${guestName}`}
              size="small"
              sx={{ bgcolor: "#334155", color: "#94A3B8", fontSize: "0.7rem", height: 22 }}
            />
          )}
          {roomNumber && (
            <Chip
              label={`Room: ${roomNumber}`}
              size="small"
              sx={{ bgcolor: "#334155", color: "#94A3B8", fontSize: "0.7rem", height: 22 }}
            />
          )}
          <CopyButton url={currentUrl} />
        </Box>
      </Box>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <Box sx={{
        flex: 1,
        display: "flex",
        flexDirection: { xs: "column", lg: "row" },
        gap: 4,
        px: { xs: 2, sm: 4, lg: 6 },
        py: 4,
        maxWidth: 1100,
        mx: "auto",
        width: "100%",
      }}>
        {/* Left: Phone frame */}
        <Box sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          flex: "0 0 auto",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
            <Smartphone size={16} color="#64748B" />
            <Typography sx={{ color: "#64748B", fontWeight: 700, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Guest Experience
            </Typography>
          </Box>

          {previewQ.isLoading ? (
            <Box sx={{
              width: 320, height: 560, borderRadius: "36px",
              border: "10px solid #1F2937",
              display: "flex", alignItems: "center", justifyContent: "center",
              bgcolor: "#FFFFFF",
            }}>
              <CircularProgress size={32} sx={{ color: "#6366F1" }} />
            </Box>
          ) : previewQ.error ? (
            <Box sx={{
              width: 320, p: 3, borderRadius: 3,
              border: "2px dashed #FCA5A5", bgcolor: "#FEF2F2",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5,
            }}>
              <Typography sx={{ color: "#DC2626", fontWeight: 700, fontSize: "0.875rem" }}>
                Preview unavailable
              </Typography>
              <Typography sx={{ color: "#EF4444", fontSize: "0.8rem", textAlign: "center" }}>
                Could not load property data. The property may not exist or the link may be outdated.
              </Typography>
              <IconButton size="small" onClick={() => previewQ.refetch()} sx={{ color: "#DC2626" }}>
                <RefreshCw size={16} />
              </IconButton>
            </Box>
          ) : (
            <PhoneFrame
              banners={(previewQ.data?.banners ?? []) as BannerSlide[]}
              greeting={previewQ.data?.greeting ?? null}
              locale={locale}
              propertyName={propertyName}
              logoUrl={previewQ.data?.branding.logoUrl}
              primaryColor={previewQ.data?.branding.primaryColor ?? "#171717"}
              guestName={guestName}
              roomNumber={roomNumber}
            />
          )}

          <Typography sx={{ color: "#94A3B8", fontSize: "0.7rem", textAlign: "center" }}>
            Tokens resolved with sample session data
          </Typography>
        </Box>

        {/* Right: Info panel */}
        <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Preview info card */}
          <Box sx={{
            p: 3, borderRadius: 3,
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Eye size={16} color="#6366F1" />
              <Typography sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.95rem" }}>
                Preview Details
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {[
                { label: "Property ID", value: propertyId },
                { label: "Locale", value: `${localeInfo.flag} ${localeInfo.label}` },
                ...(guestName ? [{ label: "Guest Name", value: guestName }] : []),
                ...(roomNumber ? [{ label: "Room Number", value: roomNumber }] : []),
                ...(propertyNameOverride ? [{ label: "Property Name", value: propertyNameOverride }] : []),
              ].map(({ label, value }) => (
                <Box key={label} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                  <Typography sx={{ color: "#94A3B8", fontSize: "0.78rem", fontWeight: 600, minWidth: 110, flexShrink: 0 }}>
                    {label}
                  </Typography>
                  <Typography sx={{ color: "#334155", fontSize: "0.78rem", wordBreak: "break-all" }}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Locale switcher */}
          <Box sx={{
            p: 3, borderRadius: 3,
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Globe size={16} color="#6366F1" />
              <Typography sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.95rem" }}>
                Switch Language
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {LOCALES.map(l => (
                <Chip
                  key={l.value}
                  label={`${l.flag} ${l.label}`}
                  onClick={() => {
                    setLocale(l.value);
                    // Update URL without reload so the link stays shareable
                    const params = new URLSearchParams(window.location.search);
                    params.set("locale", l.value);
                    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
                  }}
                  variant={locale === l.value ? "filled" : "outlined"}
                  size="small"
                  sx={{
                    cursor: "pointer",
                    bgcolor: locale === l.value ? "#6366F1" : "transparent",
                    color: locale === l.value ? "#FFFFFF" : "#374151",
                    borderColor: locale === l.value ? "#6366F1" : "#E2E8F0",
                    fontWeight: locale === l.value ? 700 : 400,
                    "&:hover": { bgcolor: locale === l.value ? "#4F46E5" : "#F8FAFC" },
                    "& .MuiChip-label": { px: 1.25 },
                  }}
                />
              ))}
            </Box>
            <Typography sx={{ color: "#94A3B8", fontSize: "0.72rem", mt: 1.5 }}>
              Switching language updates the preview and the shareable URL.
            </Typography>
          </Box>

          {/* Share this link */}
          <Box sx={{
            p: 3, borderRadius: 3,
            bgcolor: "#FFFFFF",
            border: "1px solid #E2E8F0",
            boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Copy size={16} color="#6366F1" />
              <Typography sx={{ fontWeight: 700, color: "#1E293B", fontSize: "0.95rem" }}>
                Share This Preview
              </Typography>
            </Box>
            <Box sx={{
              p: 1.5, borderRadius: 1.5,
              bgcolor: "#F8FAFC", border: "1px solid #E2E8F0",
              mb: 1.5,
            }}>
              <Typography sx={{
                fontSize: "0.72rem", color: "#475569",
                wordBreak: "break-all", fontFamily: "monospace", lineHeight: 1.6,
              }}>
                {currentUrl}
              </Typography>
            </Box>
            <CopyButton url={currentUrl} />
            <Typography sx={{ color: "#94A3B8", fontSize: "0.72rem", mt: 1.5 }}>
              Anyone with this link can view the preview — no login required.
            </Typography>
          </Box>

          {/* Disclaimer */}
          <Alert severity="info" sx={{ borderRadius: 2, fontSize: "0.8rem" }}>
            This is a <strong>read-only preview</strong>. Guests cannot interact with the service menu from this page. To test the full guest flow, scan a QR code from the property.
          </Alert>
        </Box>
      </Box>
    </Box>
  );
}
