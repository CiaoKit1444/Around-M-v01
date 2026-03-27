/**
 * GuestCMSTab — Mini-CMS panel embedded inside PropertyDetailPage.
 *
 * Sections:
 *   1. Banner Manager  — carousel slides (add / edit / delete / drag-reorder)
 *      • Image upload via S3 (file picker → base64 → cms.uploadBannerImage)
 *   2. Live Mobile Preview — real-time phone-frame preview of carousel + greeting
 *      • "Preview as Guest" toggle — shows resolved tokens with sample session data
 *   3. Greeting Editor — i18n welcome message per locale with token hints
 *      • "Preview as Guest" toggle inline in editor
 *
 * Uses tRPC cms.* procedures.
 */
import { useState, useRef, useCallback } from "react";
import {
  Box, Typography, Button, Card, CardContent, Chip, Divider,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Switch, FormControlLabel, Dialog, DialogTitle, DialogContent,
  DialogActions, IconButton, Tooltip, Alert, LinearProgress,
  Tabs, Tab, Collapse,
} from "@mui/material";
import {
  Plus, Pencil, Trash2, Image, Link, Globe,
  Megaphone, Tag, Star, ChevronUp, ChevronDown, Save, X,
  Languages, Upload, Smartphone, Eye, Info, EyeOff, User,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import GuestBannerCarousel, { BannerSlide } from "@/components/guest/GuestBannerCarousel";
import GuestGreetingPanel from "@/components/guest/GuestGreetingPanel";

// ── Types ─────────────────────────────────────────────────────────────────────

type BannerType = "default" | "announcement" | "promotion";
type Locale = "en" | "th" | "ja" | "zh" | "ko" | "fr" | "de" | "ar";

interface Banner {
  id: string;
  propertyId: string;
  type: string;
  title: string;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  locale: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface GreetingEntry {
  title: string;
  body: string;
}

const BANNER_TYPES: { value: BannerType; label: string; color: string }[] = [
  { value: "default", label: "Default", color: "#6366F1" },
  { value: "announcement", label: "Announcement", color: "#F59E0B" },
  { value: "promotion", label: "Promotion", color: "#10B981" },
];

const LOCALES: { value: Locale; label: string; flag: string }[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "th", label: "ภาษาไทย", flag: "🇹🇭" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
];

/** Supported personalisation tokens for greeting body */
const GREETING_TOKENS = [
  { token: "{{guest_name}}", hint: "Guest's name (if known)" },
  { token: "{{room_number}}", hint: "Room number from session" },
  { token: "{{property_name}}", hint: "Property display name" },
];

const EMPTY_BANNER_FORM = {
  type: "announcement" as BannerType,
  title: "",
  body: "",
  imageUrl: "",
  linkUrl: "",
  linkLabel: "",
  locale: "" as Locale | "",
  sortOrder: 0,
  isActive: true,
  startsAt: "",
  endsAt: "",
};

// ── Sample session defaults per locale ───────────────────────────────────────

const SAMPLE_GUESTS: Record<Locale, { name: string; room: string }> = {
  en: { name: "James Wilson", room: "301" },
  th: { name: "สมชาย ใจดี", room: "205" },
  ja: { name: "田中 太郎", room: "412" },
  zh: { name: "李明", room: "518" },
  ko: { name: "김민준", room: "103" },
  fr: { name: "Jean Dupont", room: "207" },
  de: { name: "Hans Müller", room: "315" },
  ar: { name: "محمد العلي", room: "601" },
};

// ── Banner type badge ─────────────────────────────────────────────────────────

function BannerTypeBadge({ type }: { type: string }) {
  const t = BANNER_TYPES.find(b => b.value === type) ?? BANNER_TYPES[1];
  return (
    <Chip
      label={t.label}
      size="small"
      sx={{ bgcolor: t.color + "20", color: t.color, fontWeight: 600, fontSize: "0.7rem", height: 20 }}
    />
  );
}

// ── Image upload button ───────────────────────────────────────────────────────

interface ImageUploadButtonProps {
  propertyId: string;
  onUploaded: (url: string) => void;
}

function ImageUploadButton({ propertyId, onUploaded }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadMutation = trpc.cms.uploadBannerImage.useMutation({
    onSuccess: (data) => {
      onUploaded(data.url);
      toast.success("Image uploaded");
      setUploading(false);
      setProgress(0);
    },
    onError: (e) => {
      toast.error(`Upload failed: ${e.message}`);
      setUploading(false);
      setProgress(0);
    },
  });

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5 MB");
      return;
    }

    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Only JPEG, PNG, WebP, or GIF images are supported");
      return;
    }

    setUploading(true);
    setProgress(30);

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setProgress(60);
      uploadMutation.mutate({
        propertyId,
        fileName: file.name.replace(/\.[^.]+$/, ""),
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
        base64Data: base64,
      });
    };
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  }, [propertyId, uploadMutation]);

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <Button
        size="small"
        variant="outlined"
        startIcon={<Upload size={13} />}
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        sx={{
          textTransform: "none",
          fontSize: "0.75rem",
          borderColor: "#D1D5DB",
          color: "#374151",
          "&:hover": { borderColor: "#9CA3AF", bgcolor: "#F9FAFB" },
        }}
      >
        {uploading ? "Uploading…" : "Upload Image"}
      </Button>
      {uploading && (
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{ mt: 0.5, height: 2, borderRadius: 1 }}
        />
      )}
    </Box>
  );
}

// ── Banner form dialog ────────────────────────────────────────────────────────

interface BannerDialogProps {
  open: boolean;
  initial?: Partial<typeof EMPTY_BANNER_FORM> & { id?: string };
  propertyId: string;
  onClose: () => void;
  onSaved: () => void;
}

function BannerDialog({ open, initial, propertyId, onClose, onSaved }: BannerDialogProps) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({ ...EMPTY_BANNER_FORM, ...initial });

  const createBanner = trpc.cms.createBanner.useMutation({
    onSuccess: () => { toast.success("Banner created"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });
  const updateBanner = trpc.cms.updateBanner.useMutation({
    onSuccess: () => { toast.success("Banner updated"); onSaved(); onClose(); },
    onError: (e) => toast.error(e.message),
  });

  const saving = createBanner.isPending || updateBanner.isPending;

  const handleSave = () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    const payload = {
      propertyId,
      type: form.type,
      title: form.title.trim(),
      body: form.body || undefined,
      imageUrl: form.imageUrl || undefined,
      linkUrl: form.linkUrl || undefined,
      linkLabel: form.linkLabel || undefined,
      locale: (form.locale || undefined) as Locale | undefined,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      startsAt: form.startsAt || undefined,
      endsAt: form.endsAt || undefined,
    };
    if (isEdit && initial?.id) {
      updateBanner.mutate({ ...payload, id: initial.id });
    } else {
      createBanner.mutate(payload);
    }
  };

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {isEdit ? "Edit Banner" : "Add Banner"}
        </Typography>
        <IconButton size="small" onClick={onClose}><X size={16} /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* Type */}
          <FormControl size="small" fullWidth>
            <InputLabel>Type</InputLabel>
            <Select value={form.type} label="Type" onChange={e => set("type", e.target.value)}>
              {BANNER_TYPES.map(t => (
                <MenuItem key={t.value} value={t.value}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.color }} />
                    {t.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Title */}
          <TextField
            label="Title *" size="small" fullWidth
            value={form.title} onChange={e => set("title", e.target.value)}
            placeholder="e.g. Weekend Pool Party 🎉"
          />

          {/* Body */}
          <TextField
            label="Body text" size="small" fullWidth multiline rows={2}
            value={form.body} onChange={e => set("body", e.target.value)}
            placeholder="Optional sub-headline or description"
          />

          {/* Image — upload OR paste URL */}
          <Box>
            <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 600, mb: 0.75, display: "block" }}>
              Background Image
            </Typography>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start", flexWrap: "wrap" }}>
              <ImageUploadButton
                propertyId={propertyId}
                onUploaded={(url) => set("imageUrl", url)}
              />
              <Typography variant="caption" sx={{ color: "#9CA3AF", alignSelf: "center" }}>or</Typography>
              <TextField
                size="small"
                placeholder="Paste image URL"
                value={form.imageUrl}
                onChange={e => set("imageUrl", e.target.value)}
                sx={{ flex: 1, minWidth: 160, "& .MuiInputBase-input": { fontSize: "0.75rem" } }}
              />
            </Box>
            {form.imageUrl && (
              <Box
                component="img"
                src={form.imageUrl}
                alt="Preview"
                sx={{ mt: 1, width: "100%", maxHeight: 120, objectFit: "cover", borderRadius: 1.5, border: "1px solid #E5E7EB" }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }}
              />
            )}
          </Box>

          {/* CTA */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="CTA link URL" size="small" sx={{ flex: 2 }}
              value={form.linkUrl} onChange={e => set("linkUrl", e.target.value)}
              placeholder="https://…"
            />
            <TextField
              label="CTA label" size="small" sx={{ flex: 1 }}
              value={form.linkLabel} onChange={e => set("linkLabel", e.target.value)}
              placeholder="Learn more"
            />
          </Box>

          {/* Locale */}
          <FormControl size="small" fullWidth>
            <InputLabel>Target locale (optional)</InputLabel>
            <Select
              value={form.locale}
              label="Target locale (optional)"
              onChange={e => set("locale", e.target.value)}
            >
              <MenuItem value=""><em>All locales</em></MenuItem>
              {LOCALES.map(l => (
                <MenuItem key={l.value} value={l.value}>{l.flag} {l.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Schedule */}
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="Starts at" type="datetime-local" size="small" sx={{ flex: 1 }}
              value={form.startsAt} onChange={e => set("startsAt", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Ends at" type="datetime-local" size="small" sx={{ flex: 1 }}
              value={form.endsAt} onChange={e => set("endsAt", e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          {/* Active toggle */}
          <FormControlLabel
            control={<Switch checked={form.isActive} onChange={e => set("isActive", e.target.checked)} size="small" />}
            label={<Typography variant="body2">Active</Typography>}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small">Cancel</Button>
        <Button
          onClick={handleSave} variant="contained" size="small"
          disabled={saving}
          sx={{ bgcolor: "#171717", "&:hover": { bgcolor: "#262626" } }}
        >
          {saving ? "Saving…" : isEdit ? "Update Banner" : "Create Banner"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Banner row ────────────────────────────────────────────────────────────────

interface BannerRowProps {
  banner: Banner;
  index: number;
  total: number;
  propertyId: string;
  onEdit: (b: Banner) => void;
  onDelete: (b: Banner) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function BannerRow({ banner, index, total, onEdit, onDelete, onMoveUp, onMoveDown }: BannerRowProps) {
  const now = new Date();
  const isScheduled = !!(banner.startsAt && banner.startsAt > now);
  const isExpired = !!(banner.endsAt && banner.endsAt < now);

  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 1.5, p: 1.5,
      borderRadius: 1.5, border: "1px solid #E5E7EB",
      bgcolor: banner.isActive && !isExpired ? "#FFFFFF" : "#F9FAFB",
      opacity: !banner.isActive || isExpired ? 0.6 : 1,
    }}>
      {/* Thumbnail */}
      <Box sx={{
        width: 48, height: 36, borderRadius: 1, overflow: "hidden",
        bgcolor: "#F3F4F6", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {banner.imageUrl ? (
          <Box component="img" src={banner.imageUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <Image size={16} color="#D1D5DB" />
        )}
      </Box>

      {/* Info */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: "#111827", fontSize: "0.8rem" }} noWrap>
            {banner.title}
          </Typography>
          <BannerTypeBadge type={banner.type} />
          {banner.locale && (
            <Chip label={banner.locale.toUpperCase()} size="small"
              sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#F0F9FF", color: "#0284C7" }} />
          )}
          {isScheduled && <Chip label="Scheduled" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#FFF7ED", color: "#C2410C" }} />}
          {isExpired && <Chip label="Expired" size="small" sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#FEF2F2", color: "#DC2626" }} />}
        </Box>
        {banner.body && (
          <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }} noWrap>
            {banner.body}
          </Typography>
        )}
      </Box>

      {/* Actions */}
      <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
        <Tooltip title="Move up"><span>
          <IconButton size="small" onClick={onMoveUp} disabled={index === 0} sx={{ p: 0.5 }}>
            <ChevronUp size={14} />
          </IconButton>
        </span></Tooltip>
        <Tooltip title="Move down"><span>
          <IconButton size="small" onClick={onMoveDown} disabled={index === total - 1} sx={{ p: 0.5 }}>
            <ChevronDown size={14} />
          </IconButton>
        </span></Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => onEdit(banner)} sx={{ p: 0.5 }}>
            <Pencil size={14} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" onClick={() => onDelete(banner)} sx={{ p: 0.5, color: "#EF4444" }}>
            <Trash2 size={14} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ── Mobile preview frame ──────────────────────────────────────────────────────

interface MobilePreviewFrameProps {
  banners: Banner[];
  greeting: Record<string, GreetingEntry> | null;
  propertyName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  locale?: string;
  previewAsGuest?: boolean;
  guestName?: string;
  roomNumber?: string;
}

function MobilePreviewFrame({
  banners,
  greeting,
  propertyName,
  logoUrl,
  primaryColor = "#171717",
  locale = "en",
  previewAsGuest = false,
  guestName,
  roomNumber,
}: MobilePreviewFrameProps) {
  const now = new Date();
  const activeBanners: BannerSlide[] = banners
    .filter(b => {
      if (!b.isActive) return false;
      if (b.startsAt && b.startsAt > now) return false;
      if (b.endsAt && b.endsAt < now) return false;
      return true;
    })
    .map(b => ({
      id: b.id,
      type: b.type,
      title: b.title,
      body: b.body,
      imageUrl: b.imageUrl,
      linkUrl: b.linkUrl,
      linkLabel: b.linkLabel,
      locale: b.locale,
    }));

  return (
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Preview mode badge */}
      {previewAsGuest && (
        <Box sx={{
          display: "flex", alignItems: "center", gap: 0.75,
          px: 1.5, py: 0.5, mb: 1.5,
          borderRadius: 10,
          bgcolor: "#EFF6FF",
          border: "1px solid #BFDBFE",
        }}>
          <User size={11} color="#3B82F6" />
          <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: "0.65rem", letterSpacing: 0.3 }}>
            GUEST VIEW
          </Typography>
          {guestName && (
            <Typography variant="caption" sx={{ color: "#3B82F6", fontSize: "0.65rem" }}>
              · {guestName}
            </Typography>
          )}
          {roomNumber && (
            <Typography variant="caption" sx={{ color: "#3B82F6", fontSize: "0.65rem" }}>
              · Room {roomNumber}
            </Typography>
          )}
        </Box>
      )}

      {/* Phone shell */}
      <Box sx={{
        width: 280,
        borderRadius: "32px",
        border: previewAsGuest ? "8px solid #2563EB" : "8px solid #1F2937",
        bgcolor: "#F9FAFB",
        overflow: "hidden",
        boxShadow: previewAsGuest
          ? "0 20px 60px rgba(37,99,235,0.2), inset 0 0 0 1px rgba(255,255,255,0.1)"
          : "0 20px 60px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.1)",
        position: "relative",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      }}>
        {/* Notch */}
        <Box sx={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: 80, height: 20,
          bgcolor: previewAsGuest ? "#2563EB" : "#1F2937",
          borderRadius: "0 0 12px 12px", zIndex: 10,
          transition: "background-color 0.2s ease",
        }} />

        {/* Screen content */}
        <Box sx={{ pt: 3, pb: 2, px: 1.5, minHeight: 480, bgcolor: "#FFFFFF" }}>
          {/* Status bar */}
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1.5, px: 0.5 }}>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#374151", fontWeight: 700 }}>9:41</Typography>
            <Typography variant="caption" sx={{ fontSize: "0.6rem", color: "#374151" }}>●●●</Typography>
          </Box>

          {/* Banner carousel */}
          <GuestBannerCarousel
            banners={activeBanners}
            locale={locale}
            propertyName={propertyName}
            primaryColor={primaryColor}
          />

          {/* Greeting panel — with resolved tokens in preview mode */}
          <GuestGreetingPanel
            greeting={greeting}
            locale={locale}
            propertyName={propertyName}
            logoUrl={logoUrl}
            primaryColor={primaryColor}
            guestName={previewAsGuest ? (guestName || undefined) : undefined}
            roomNumber={previewAsGuest ? (roomNumber || undefined) : undefined}
          />

          {/* Stub service menu hint */}
          <Box sx={{
            borderRadius: 1.5, bgcolor: "#F3F4F6", p: 1.5,
            border: "1px dashed #D1D5DB",
          }}>
            <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600, fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
              Service Menu
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 0.75 }}>
              {["Room Service", "Housekeeping", "Concierge"].map(s => (
                <Box key={s} sx={{ height: 24, bgcolor: "#E5E7EB", borderRadius: 1 }} />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ mt: 1.5, color: "#9CA3AF", fontSize: "0.7rem" }}>
        {previewAsGuest ? "Tokens resolved with sample session data" : "Live preview — updates as you edit"}
      </Typography>
    </Box>
  );
}

// ── Greeting editor ───────────────────────────────────────────────────────────

interface GreetingEditorProps {
  propertyId: string;
  propertyName: string;
  logoUrl?: string | null;
  primaryColor?: string;
  onGreetingChange?: (g: Record<string, GreetingEntry>) => void;
  /** Preview as Guest state lifted from parent */
  previewAsGuest: boolean;
  onTogglePreview: () => void;
  previewGuestName: string;
  previewRoomNumber: string;
  onPreviewGuestNameChange: (v: string) => void;
  onPreviewRoomNumberChange: (v: string) => void;
}

function GreetingEditor({
  propertyId, propertyName, logoUrl, primaryColor, onGreetingChange,
  previewAsGuest, onTogglePreview,
  previewGuestName, previewRoomNumber,
  onPreviewGuestNameChange, onPreviewRoomNumberChange,
}: GreetingEditorProps) {
  const [activeLocale, setActiveLocale] = useState<Locale>("en");
  const [greetings, setGreetings] = useState<Record<string, GreetingEntry>>({});

  const greetingQ = trpc.cms.getGreeting.useQuery(
    { propertyId },
    {
      enabled: !!propertyId,
      onSuccess: (data: Record<string, GreetingEntry> | null) => {
        if (data) {
          setGreetings(data);
          onGreetingChange?.(data);
        }
      },
    } as any,
  );

  const setGreeting = trpc.cms.setGreeting.useMutation({
    onSuccess: () => toast.success("Greeting saved"),
    onError: (e) => toast.error(e.message),
  });

  const current = greetings[activeLocale] ?? { title: "", body: "" };
  const setField = (k: "title" | "body", v: string) => {
    const updated = { ...greetings, [activeLocale]: { ...current, [k]: v } };
    setGreetings(updated);
    onGreetingChange?.(updated);
  };

  const handleSave = () => {
    const clean: Record<string, GreetingEntry> = {};
    for (const [k, v] of Object.entries(greetings)) {
      if (v.title.trim() || v.body.trim()) clean[k] = v;
    }
    setGreeting.mutate({ propertyId, greetingConfig: clean as any });
  };

  const insertToken = (token: string) => {
    setField("body", (current.body ? current.body + " " : "") + token);
  };

  // Resolve tokens for inline preview
  function resolveForPreview(text: string): string {
    if (!previewAsGuest) return text;
    return text
      .replace(/\{\{guest_name\}\}/g, previewGuestName || "")
      .replace(/\{\{room_number\}\}/g, previewRoomNumber || "")
      .replace(/\{\{property_name\}\}/g, propertyName)
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  const previewTitle = resolveForPreview(current.title);
  const previewBody = resolveForPreview(current.body);

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Languages size={16} color="#6366F1" />
          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "#171717" }}>
            Greeting Message
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          {/* Preview as Guest toggle */}
          <Tooltip title={previewAsGuest ? "Exit guest preview" : "Preview with resolved tokens"}>
            <Button
              size="small"
              variant={previewAsGuest ? "contained" : "outlined"}
              onClick={onTogglePreview}
              startIcon={previewAsGuest ? <EyeOff size={13} /> : <Eye size={13} />}
              sx={{
                textTransform: "none",
                fontSize: "0.78rem",
                fontWeight: 600,
                ...(previewAsGuest
                  ? { bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" }, color: "#fff" }
                  : { borderColor: "#BFDBFE", color: "#2563EB", "&:hover": { bgcolor: "#EFF6FF", borderColor: "#93C5FD" } }
                ),
              }}
            >
              {previewAsGuest ? "Exit Preview" : "Preview as Guest"}
            </Button>
          </Tooltip>
          <Button
            size="small" variant="contained"
            onClick={handleSave} disabled={setGreeting.isPending}
            startIcon={<Save size={13} />}
            sx={{ bgcolor: "#171717", "&:hover": { bgcolor: "#262626" }, textTransform: "none", fontSize: "0.8rem" }}
          >
            {setGreeting.isPending ? "Saving…" : "Save Greetings"}
          </Button>
        </Box>
      </Box>

      {/* Sample session panel — shown when preview mode is ON */}
      <Collapse in={previewAsGuest}>
        <Box sx={{
          mb: 2, p: 2, borderRadius: 2,
          bgcolor: "#EFF6FF",
          border: "1px solid #BFDBFE",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5 }}>
            <User size={13} color="#2563EB" />
            <Typography variant="caption" sx={{ fontWeight: 700, color: "#1D4ED8", fontSize: "0.75rem" }}>
              Sample Guest Session
            </Typography>
            <Typography variant="caption" sx={{ color: "#60A5FA", fontSize: "0.7rem" }}>
              — tokens will be resolved with these values
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              label="Guest Name"
              size="small"
              value={previewGuestName}
              onChange={e => onPreviewGuestNameChange(e.target.value)}
              placeholder={`e.g. ${SAMPLE_GUESTS[activeLocale]?.name || "James Wilson"}`}
              sx={{
                flex: 1, minWidth: 140,
                "& .MuiOutlinedInput-root": { bgcolor: "#fff", fontSize: "0.82rem" },
                "& .MuiInputLabel-root": { fontSize: "0.82rem" },
              }}
            />
            <TextField
              label="Room Number"
              size="small"
              value={previewRoomNumber}
              onChange={e => onPreviewRoomNumberChange(e.target.value)}
              placeholder={`e.g. ${SAMPLE_GUESTS[activeLocale]?.room || "301"}`}
              sx={{
                width: 130,
                "& .MuiOutlinedInput-root": { bgcolor: "#fff", fontSize: "0.82rem" },
                "& .MuiInputLabel-root": { fontSize: "0.82rem" },
              }}
            />
            <Button
              size="small"
              variant="text"
              onClick={() => {
                const sample = SAMPLE_GUESTS[activeLocale];
                if (sample) {
                  onPreviewGuestNameChange(sample.name);
                  onPreviewRoomNumberChange(sample.room);
                }
              }}
              sx={{ textTransform: "none", fontSize: "0.75rem", color: "#3B82F6", alignSelf: "center" }}
            >
              Use sample
            </Button>
          </Box>
        </Box>
      </Collapse>

      <Alert severity="info" sx={{ mb: 2, fontSize: "0.8rem" }}>
        Personalise the welcome message shown to guests in their language. Leave a locale empty to use the English fallback.
      </Alert>

      {/* Locale tabs */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 2 }}>
        {LOCALES.map(l => {
          const hasContent = !!(greetings[l.value]?.title || greetings[l.value]?.body);
          return (
            <Chip
              key={l.value}
              label={`${l.flag} ${l.label}`}
              onClick={() => setActiveLocale(l.value)}
              variant={activeLocale === l.value ? "filled" : "outlined"}
              size="small"
              sx={{
                cursor: "pointer",
                bgcolor: activeLocale === l.value ? "#171717" : "transparent",
                color: activeLocale === l.value ? "#FFFFFF" : "#374151",
                borderColor: hasContent ? "#6366F1" : "#E5E7EB",
                fontWeight: activeLocale === l.value ? 700 : 400,
                "& .MuiChip-label": { px: 1.25 },
              }}
            />
          );
        })}
      </Box>

      {/* Editor */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <TextField
          label={`Greeting title (${activeLocale.toUpperCase()})`}
          size="small" fullWidth
          value={current.title}
          onChange={e => setField("title", e.target.value)}
          placeholder={activeLocale === "en" ? "Welcome to {{property_name}}!" : ""}
        />
        <TextField
          label={`Greeting body (${activeLocale.toUpperCase()})`}
          size="small" fullWidth multiline rows={3}
          value={current.body}
          onChange={e => setField("body", e.target.value)}
          placeholder={activeLocale === "en" ? "Hi {{guest_name}}, your room {{room_number}} is ready. Browse our services below." : ""}
        />

        {/* Token chips */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
            <Info size={12} color="#9CA3AF" />
            <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>
              Personalisation tokens — click to insert into body:
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {GREETING_TOKENS.map(({ token, hint }) => (
              <Tooltip key={token} title={hint} placement="top">
                <Chip
                  label={token}
                  size="small"
                  onClick={() => insertToken(token)}
                  sx={{
                    cursor: "pointer",
                    bgcolor: "#F0F0FF",
                    color: "#6366F1",
                    fontWeight: 600,
                    fontSize: "0.68rem",
                    height: 22,
                    fontFamily: "monospace",
                    border: "1px solid #C7D2FE",
                    "&:hover": { bgcolor: "#E0E7FF" },
                    "& .MuiChip-label": { px: 1 },
                  }}
                />
              </Tooltip>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Inline preview card */}
      {(current.title || current.body) && (
        <Box sx={{
          mt: 2.5, borderRadius: 2,
          border: previewAsGuest ? "1px solid #BFDBFE" : "1px dashed #E5E7EB",
          overflow: "hidden",
          transition: "border-color 0.2s ease",
        }}>
          {/* Preview header */}
          <Box sx={{
            px: 2, py: 1,
            bgcolor: previewAsGuest ? "#EFF6FF" : "#F9FAFB",
            borderBottom: "1px solid",
            borderColor: previewAsGuest ? "#BFDBFE" : "#E5E7EB",
            display: "flex", alignItems: "center", gap: 0.75,
          }}>
            {previewAsGuest ? (
              <>
                <User size={11} color="#3B82F6" />
                <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: "0.65rem", letterSpacing: 0.3 }}>
                  GUEST VIEW — TOKENS RESOLVED
                </Typography>
              </>
            ) : (
              <>
                <Eye size={11} color="#9CA3AF" />
                <Typography variant="caption" sx={{ color: "#9CA3AF", fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase", fontSize: "0.65rem" }}>
                  Text Preview
                </Typography>
                <Typography variant="caption" sx={{ color: "#D1D5DB", fontSize: "0.65rem" }}>
                  — tokens shown as-is; resolved at render time for guests
                </Typography>
              </>
            )}
          </Box>

          {/* Preview content */}
          <Box sx={{ px: 2, py: 1.5, bgcolor: "#FFFFFF" }}>
            {(previewTitle || current.title) && (
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#171717", mb: 0.25, fontSize: "0.875rem" }}>
                {previewAsGuest ? previewTitle : current.title}
              </Typography>
            )}
            {(previewBody || current.body) && (
              <Typography variant="body2" sx={{ color: "#6B7280", lineHeight: 1.55, fontSize: "0.8125rem" }}>
                {previewAsGuest ? previewBody : current.body}
              </Typography>
            )}
            {previewAsGuest && !previewGuestName && !previewRoomNumber && (
              <Typography variant="caption" sx={{ color: "#93C5FD", fontSize: "0.7rem", display: "block", mt: 0.75 }}>
                Fill in Guest Name and Room Number above to see fully resolved tokens.
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface GuestCMSTabProps {
  propertyId: string;
  propertyName?: string;
  logoUrl?: string | null;
  primaryColor?: string;
}

export default function GuestCMSTab({
  propertyId,
  propertyName = "My Property",
  logoUrl,
  primaryColor = "#171717",
}: GuestCMSTabProps) {
  const [bannerDialogOpen, setBannerDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [deletingBanner, setDeletingBanner] = useState<Banner | null>(null);
  const [greeting, setGreeting] = useState<Record<string, GreetingEntry> | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [previewLocale, setPreviewLocale] = useState<string>("en");

  // ── Preview as Guest state ─────────────────────────────────────────────────
  const [previewAsGuest, setPreviewAsGuest] = useState(false);
  const [previewGuestName, setPreviewGuestName] = useState("");
  const [previewRoomNumber, setPreviewRoomNumber] = useState("");

  const handleTogglePreview = () => {
    const next = !previewAsGuest;
    setPreviewAsGuest(next);
    // Auto-fill sample data when turning preview on for the first time
    if (next && !previewGuestName && !previewRoomNumber) {
      const sample = SAMPLE_GUESTS[previewLocale as Locale] ?? SAMPLE_GUESTS.en;
      setPreviewGuestName(sample.name);
      setPreviewRoomNumber(sample.room);
    }
  };

  const utils = trpc.useUtils();

  const bannersQ = trpc.cms.listBanners.useQuery(
    { propertyId },
    { enabled: !!propertyId },
  );

  const deleteBanner = trpc.cms.deleteBanner.useMutation({
    onSuccess: () => {
      toast.success("Banner deleted");
      utils.cms.listBanners.invalidate({ propertyId });
      setDeletingBanner(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderBanners = trpc.cms.reorderBanners.useMutation({
    onSuccess: () => utils.cms.listBanners.invalidate({ propertyId }),
  });

  const banners: Banner[] = bannersQ.data ?? [];

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const next = [...banners];
    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
    reorderBanners.mutate({ propertyId, orderedIds: next.map(b => b.id) });
  };

  const handleMoveDown = (idx: number) => {
    if (idx === banners.length - 1) return;
    const next = [...banners];
    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
    reorderBanners.mutate({ propertyId, orderedIds: next.map(b => b.id) });
  };

  const handleSaved = () => {
    utils.cms.listBanners.invalidate({ propertyId });
    setEditingBanner(null);
  };

  return (
    <Box sx={{ display: "flex", gap: 3 }}>
      {/* ── Left: Editor panels ─────────────────────────────────────────────── */}
      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>

        {/* Tab switcher */}
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ borderBottom: "1px solid #E5E7EB", minHeight: 40 }}
          TabIndicatorProps={{ style: { backgroundColor: "#171717" } }}
        >
          <Tab
            label={<Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}><Megaphone size={14} />Banners</Box>}
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.85rem", minHeight: 40, color: "#374151", "&.Mui-selected": { color: "#171717" } }}
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Languages size={14} />
                Greeting
                {previewAsGuest && (
                  <Chip
                    label="Preview ON"
                    size="small"
                    sx={{ height: 16, fontSize: "0.6rem", bgcolor: "#DBEAFE", color: "#2563EB", fontWeight: 700, ml: 0.5 }}
                  />
                )}
              </Box>
            }
            sx={{ textTransform: "none", fontWeight: 600, fontSize: "0.85rem", minHeight: 40, color: "#374151", "&.Mui-selected": { color: "#171717" } }}
          />
        </Tabs>

        {/* ── Banner Manager ─────────────────────────────────────────────────── */}
        {activeTab === 0 && (
          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", boxShadow: "none" }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Megaphone size={16} color="#F59E0B" />
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "#171717" }}>
                    Hero Banners
                  </Typography>
                  <Chip
                    label={`${banners.length} banner${banners.length !== 1 ? "s" : ""}`}
                    size="small"
                    sx={{ bgcolor: "#F3F4F6", color: "#6B7280", height: 20, fontSize: "0.7rem" }}
                  />
                </Box>
                <Button
                  size="small" variant="contained"
                  onClick={() => { setEditingBanner(null); setBannerDialogOpen(true); }}
                  startIcon={<Plus size={13} />}
                  sx={{ bgcolor: "#171717", "&:hover": { bgcolor: "#262626" }, textTransform: "none", fontSize: "0.8rem" }}
                >
                  Add Banner
                </Button>
              </Box>

              <Typography variant="body2" sx={{ color: "#6B7280", mb: 2, fontSize: "0.8rem" }}>
                Banners appear as a carousel at the top of the guest QR experience. The first active banner is shown by default; guests swipe through the rest. Supports scheduled publish windows, locale targeting, and image upload.
              </Typography>

              {bannersQ.isLoading ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {[1, 2].map(i => (
                    <Box key={i} sx={{ height: 64, borderRadius: 1.5, bgcolor: "#F9FAFB", animation: "pulse 1.5s infinite" }} />
                  ))}
                </Box>
              ) : banners.length === 0 ? (
                <Box sx={{
                  py: 4, textAlign: "center", borderRadius: 2,
                  border: "2px dashed #E5E7EB", bgcolor: "#FAFAFA",
                }}>
                  <Image size={28} color="#D1D5DB" style={{ marginBottom: 8 }} />
                  <Typography variant="body2" sx={{ color: "#9CA3AF", fontWeight: 600 }}>
                    No banners yet
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#D1D5DB" }}>
                    Add a banner to display in the guest hero carousel
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  {banners.map((banner, idx) => (
                    <BannerRow
                      key={banner.id}
                      banner={banner}
                      index={idx}
                      total={banners.length}
                      propertyId={propertyId}
                      onEdit={b => { setEditingBanner(b); setBannerDialogOpen(true); }}
                      onDelete={b => setDeletingBanner(b)}
                      onMoveUp={() => handleMoveUp(idx)}
                      onMoveDown={() => handleMoveDown(idx)}
                    />
                  ))}
                </Box>
              )}

              <Box sx={{ display: "flex", gap: 1.5, mt: 2, flexWrap: "wrap" }}>
                {BANNER_TYPES.map(t => (
                  <Box key={t.value} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: t.color }} />
                    <Typography variant="caption" sx={{ color: "#9CA3AF", fontSize: "0.7rem" }}>{t.label}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── Greeting Editor ────────────────────────────────────────────────── */}
        {activeTab === 1 && (
          <Card sx={{ borderRadius: 2, border: "1px solid #E5E5E5", boxShadow: "none" }}>
            <CardContent sx={{ p: 3 }}>
              <GreetingEditor
                propertyId={propertyId}
                propertyName={propertyName}
                logoUrl={logoUrl}
                primaryColor={primaryColor}
                onGreetingChange={setGreeting}
                previewAsGuest={previewAsGuest}
                onTogglePreview={handleTogglePreview}
                previewGuestName={previewGuestName}
                previewRoomNumber={previewRoomNumber}
                onPreviewGuestNameChange={setPreviewGuestName}
                onPreviewRoomNumberChange={setPreviewRoomNumber}
              />
            </CardContent>
          </Card>
        )}
      </Box>

      {/* ── Right: Mobile preview ───────────────────────────────────────────── */}
      <Box sx={{
        width: 320, flexShrink: 0,
        display: { xs: "none", lg: "flex" },
        flexDirection: "column",
        alignItems: "center",
        pt: 6,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 2 }}>
          <Smartphone size={14} color="#6B7280" />
          <Typography variant="caption" sx={{ color: "#6B7280", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.7rem" }}>
            Live Preview
          </Typography>
        </Box>

        {/* Preview controls row */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2, width: "100%", px: 2 }}>
          {/* Locale selector */}
          <FormControl size="small" fullWidth>
            <InputLabel sx={{ fontSize: "0.75rem" }}>Preview locale</InputLabel>
            <Select
              value={previewLocale}
              label="Preview locale"
              onChange={e => {
                setPreviewLocale(e.target.value);
                // Auto-update sample data when locale changes in preview mode
                if (previewAsGuest) {
                  const sample = SAMPLE_GUESTS[e.target.value as Locale] ?? SAMPLE_GUESTS.en;
                  setPreviewGuestName(sample.name);
                  setPreviewRoomNumber(sample.room);
                }
              }}
              sx={{ fontSize: "0.8rem" }}
            >
              {LOCALES.map(l => (
                <MenuItem key={l.value} value={l.value} sx={{ fontSize: "0.8rem" }}>
                  {l.flag} {l.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Preview as Guest toggle in preview panel */}
          <Button
            size="small"
            fullWidth
            variant={previewAsGuest ? "contained" : "outlined"}
            onClick={handleTogglePreview}
            startIcon={previewAsGuest ? <EyeOff size={13} /> : <Eye size={13} />}
            sx={{
              textTransform: "none",
              fontSize: "0.78rem",
              fontWeight: 600,
              ...(previewAsGuest
                ? { bgcolor: "#2563EB", "&:hover": { bgcolor: "#1D4ED8" }, color: "#fff" }
                : { borderColor: "#BFDBFE", color: "#2563EB", "&:hover": { bgcolor: "#EFF6FF", borderColor: "#93C5FD" } }
              ),
            }}
          >
            {previewAsGuest ? "Exit Guest Preview" : "Preview as Guest"}
          </Button>

          {/* Sample session fields in preview panel */}
          <Collapse in={previewAsGuest}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 0.5 }}>
              <TextField
                label="Guest Name"
                size="small"
                fullWidth
                value={previewGuestName}
                onChange={e => setPreviewGuestName(e.target.value)}
                placeholder="e.g. James Wilson"
                sx={{ "& .MuiInputBase-input": { fontSize: "0.8rem" }, "& .MuiInputLabel-root": { fontSize: "0.8rem" } }}
              />
              <TextField
                label="Room Number"
                size="small"
                fullWidth
                value={previewRoomNumber}
                onChange={e => setPreviewRoomNumber(e.target.value)}
                placeholder="e.g. 301"
                sx={{ "& .MuiInputBase-input": { fontSize: "0.8rem" }, "& .MuiInputLabel-root": { fontSize: "0.8rem" } }}
              />
            </Box>
          </Collapse>
        </Box>

        <MobilePreviewFrame
          banners={banners}
          greeting={greeting}
          propertyName={propertyName}
          logoUrl={logoUrl}
          primaryColor={primaryColor}
          locale={previewLocale}
          previewAsGuest={previewAsGuest}
          guestName={previewGuestName}
          roomNumber={previewRoomNumber}
        />
      </Box>

      {/* ── Banner add/edit dialog ─────────────────────────────────────────── */}
      <BannerDialog
        open={bannerDialogOpen}
        initial={editingBanner ? {
          id: editingBanner.id,
          type: editingBanner.type as BannerType,
          title: editingBanner.title,
          body: editingBanner.body ?? "",
          imageUrl: editingBanner.imageUrl ?? "",
          linkUrl: editingBanner.linkUrl ?? "",
          linkLabel: editingBanner.linkLabel ?? "",
          locale: (editingBanner.locale ?? "") as Locale | "",
          sortOrder: editingBanner.sortOrder,
          isActive: editingBanner.isActive,
          startsAt: editingBanner.startsAt ? new Date(editingBanner.startsAt).toISOString().slice(0, 16) : "",
          endsAt: editingBanner.endsAt ? new Date(editingBanner.endsAt).toISOString().slice(0, 16) : "",
        } : undefined}
        propertyId={propertyId}
        onClose={() => { setBannerDialogOpen(false); setEditingBanner(null); }}
        onSaved={handleSaved}
      />

      {/* ── Delete confirm dialog ──────────────────────────────────────────── */}
      <Dialog open={!!deletingBanner} onClose={() => setDeletingBanner(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Banner</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "#6B7280" }}>
            Are you sure you want to delete <strong>"{deletingBanner?.title}"</strong>? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDeletingBanner(null)} variant="outlined" size="small">Cancel</Button>
          <Button
            onClick={() => deletingBanner && deleteBanner.mutate({ id: deletingBanner.id, propertyId })}
            variant="contained" size="small" color="error"
            disabled={deleteBanner.isPending}
          >
            {deleteBanner.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
