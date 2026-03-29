/**
 * CommandPalette — Global search and navigation via Cmd+K / Ctrl+K.
 *
 * Features:
 *  - Static navigation shortcuts (pages / actions)
 *  - Live cross-entity search via tRPC crud.globalSearch.search
 *    (partners, properties, rooms — up to 4 results each)
 *  - Token highlighting using HighlightText
 *  - Results grouped by entity type with status chips
 *  - Full keyboard navigation (↑↓ Enter Esc)
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, TextField, List, ListItemButton,
  ListItemIcon, ListItemText, Typography, Divider, Chip, Box, CircularProgress,
} from "@mui/material";
import {
  LayoutDashboard, Handshake, Building2, DoorOpen, Truck,
  ShoppingBag, Layers, QrCode, ConciergeBell, Users, UserCog,
  Settings, TrendingUp, Star, Shield, ScrollText, KeyRound, Search,
} from "lucide-react";
import { useLocation } from "wouter";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { trpc } from "@/lib/trpc";
import { keepPreviousData } from "@tanstack/react-query";
import { HighlightText } from "@/components/shared/HighlightText";

// ── Static navigation commands ──────────────────────────────────────────────
interface CommandItem {
  id: string;
  label: string;
  description?: string;
  path: string;
  icon: React.ElementType;
  group: string;
  keywords?: string[];
}

const ALL_COMMANDS: CommandItem[] = [
  { id: "dashboard", label: "Dashboard", path: "/admin", icon: LayoutDashboard, group: "Navigation", keywords: ["home", "overview"] },
  { id: "hierarchy", label: "Setup Hierarchy", path: "/admin/onboarding", icon: Handshake, group: "Navigation", keywords: ["partners", "properties", "rooms", "setup"] },
  { id: "providers", label: "Service Providers", path: "/admin/providers", icon: Truck, group: "Navigation", keywords: ["vendors", "suppliers"] },
  { id: "catalog", label: "Service Catalog", path: "/admin/catalog", icon: ShoppingBag, group: "Navigation", keywords: ["items", "services", "menu"] },
  { id: "templates", label: "Service Templates", path: "/admin/templates", icon: Layers, group: "Navigation", keywords: ["bundles", "packages"] },
  { id: "qr", label: "QR Management", path: "/admin/qr", icon: QrCode, group: "Operations", keywords: ["codes", "scan"] },
  { id: "qr-access-log", label: "QR Access Log", path: "/admin/qr/access-log", icon: ScrollText, group: "Operations", keywords: ["scan history", "log"] },
  { id: "qr-tokens", label: "Stay Tokens", path: "/admin/qr/tokens", icon: KeyRound, group: "Operations", keywords: ["active sessions", "tokens"] },
  { id: "front-office", label: "Front Office", path: "/admin/front-office", icon: ConciergeBell, group: "Operations", keywords: ["requests", "concierge", "live"] },
  { id: "revenue-report", label: "Revenue Report", path: "/admin/reports/revenue", icon: TrendingUp, group: "Reports", keywords: ["income", "earnings", "analytics"] },
  { id: "satisfaction-report", label: "Satisfaction Report", path: "/admin/reports/satisfaction", icon: Star, group: "Reports", keywords: ["ratings", "feedback", "nps"] },
  { id: "audit-log", label: "Audit Log", path: "/admin/reports/audit", icon: Shield, group: "Reports", keywords: ["history", "changes", "activity"] },
  { id: "users", label: "Users", path: "/admin/users", icon: UserCog, group: "Admin", keywords: ["accounts", "team"] },
  { id: "staff", label: "Staff", path: "/admin/staff", icon: Users, group: "Admin", keywords: ["employees", "positions"] },
  { id: "settings", label: "Settings", path: "/admin/settings", icon: Settings, group: "Admin", keywords: ["config", "preferences"] },
];

// ── Status chip colours ──────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  active: "#22c55e",
  inactive: "#94a3b8",
  pending: "#f59e0b",
  suspended: "#ef4444",
};

function StatusDot({ status }: { status?: string | null }) {
  const color = STATUS_COLORS[(status ?? "").toLowerCase()] ?? "#94a3b8";
  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        width: 7, height: 7,
        borderRadius: "50%",
        bgcolor: color,
        flexShrink: 0,
        mr: 0.5,
      }}
    />
  );
}

// ── Flat list item for keyboard navigation ───────────────────────────────────
interface FlatItem {
  id: string;
  label: string;
  subtitle?: string;
  status?: string | null;
  path: string;
  icon: React.ElementType;
  group: string;
  isLive?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────
interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced tRPC query — only fires when query >= 2 chars
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value.trim()), 300);
  }, []);

  const { data: liveData, isFetching: liveLoading } = trpc.crud.globalSearch.search.useQuery(
    { query: debouncedQuery },
    {
      enabled: debouncedQuery.length >= 2,
      staleTime: 10_000,
      placeholderData: keepPreviousData,
    }
  );

  // Build flat list of live results
  const liveItems: FlatItem[] = useMemo(() => {
    if (!liveData) return [];
    const items: FlatItem[] = [];
    liveData.partners.forEach(p => items.push({
      id: `partner-${p.id}`,
      label: p.name,
      subtitle: p.subtitle || "Partner",
      status: p.status,
      path: `/admin/partners/${p.id}`,
      icon: Handshake,
      group: "Partners",
      isLive: true,
    }));
    liveData.properties.forEach(p => items.push({
      id: `property-${p.id}`,
      label: p.name,
      subtitle: p.subtitle || "Property",
      status: p.status,
      path: `/admin/properties/${p.id}`,
      icon: Building2,
      group: "Properties",
      isLive: true,
    }));
    liveData.rooms.forEach(r => items.push({
      id: `room-${r.id}`,
      label: r.name,
      subtitle: r.subtitle || "Room",
      status: r.status,
      path: `/admin/rooms/${r.id}`,
      icon: DoorOpen,
      group: "Rooms",
      isLive: true,
    }));
    return items;
  }, [liveData]);

  // Static commands filtered by query
  const filteredCommands: FlatItem[] = useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS.slice(0, 8).map(c => ({ ...c, subtitle: c.description }));
    const q = query.toLowerCase();
    return ALL_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.includes(q))
    ).slice(0, 6).map(c => ({ ...c, subtitle: c.description }));
  }, [query]);

  // Combined flat list for keyboard navigation
  const allItems: FlatItem[] = useMemo(() => {
    if (debouncedQuery.length >= 2 && liveItems.length > 0) {
      return [...liveItems, ...filteredCommands];
    }
    return filteredCommands;
  }, [liveItems, filteredCommands, debouncedQuery]);

  // Reset selection when results change
  useEffect(() => { setSelectedIdx(0); }, [allItems]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setDebouncedQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = useCallback((item: FlatItem) => {
    navigate(item.path);
    onClose();
  }, [navigate, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIdx]) handleSelect(allItems[selectedIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Group items for display
  const groupedLive = useMemo(() => {
    const groups: Record<string, FlatItem[]> = {};
    for (const item of liveItems) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [liveItems]);

  const groupedCommands = useMemo(() => {
    const groups: Record<string, FlatItem[]> = {};
    for (const item of filteredCommands) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filteredCommands]);

  const showLive = debouncedQuery.length >= 2;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          overflow: "hidden",
          mt: "10vh",
          verticalAlign: "top",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search input */}
        <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
          <Search size={16} style={{ opacity: 0.45, flexShrink: 0 }} />
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Search pages, partners, properties, rooms…"
            value={query}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{ disableUnderline: true, sx: { fontSize: "0.95rem" } }}
          />
          {liveLoading && <CircularProgress size={14} sx={{ flexShrink: 0 }} />}
          <Chip label="Esc" size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem", flexShrink: 0 }} />
        </Box>

        <List dense sx={{ maxHeight: 420, overflow: "auto", py: 0.5 }}>
          {/* ── Live entity results ── */}
          {showLive && liveItems.length > 0 && (
            <Box>
              {Object.entries(groupedLive).map(([group, items], gIdx) => {
                const GroupIcon = items[0]?.icon ?? Handshake;
                return (
                  <Box key={group}>
                    {gIdx > 0 && <Divider sx={{ my: 0.25 }} />}
                    <Typography
                      variant="caption"
                      sx={{ px: 2, py: 0.5, display: "flex", alignItems: "center", gap: 0.75, color: "text.disabled", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.65rem" }}
                    >
                      <GroupIcon size={11} />
                      {group}
                    </Typography>
                    {items.map(item => {
                      const globalIdx = allItems.indexOf(item);
                      const Icon = item.icon;
                      return (
                        <ListItemButton
                          key={item.id}
                          selected={globalIdx === selectedIdx}
                          onClick={() => handleSelect(item)}
                          sx={{ px: 2, py: 0.6, borderRadius: 1, mx: 0.5 }}
                        >
                          <ListItemIcon sx={{ minWidth: 30 }}>
                            <Icon size={15} style={{ opacity: 0.7 }} />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                <StatusDot status={item.status} />
                                <HighlightText text={item.label} query={debouncedQuery} />
                              </Box>
                            }
                            secondary={
                              item.subtitle
                                ? <HighlightText text={item.subtitle} query={debouncedQuery} />
                                : undefined
                            }
                            primaryTypographyProps={{ fontSize: "0.855rem", fontWeight: 500 }}
                            secondaryTypographyProps={{ fontSize: "0.72rem" }}
                          />
                          {globalIdx === selectedIdx && (
                            <Chip label="↵" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                          )}
                        </ListItemButton>
                      );
                    })}
                  </Box>
                );
              })}
              <Divider sx={{ my: 0.5 }} />
            </Box>
          )}

          {/* Loading state — no results yet */}
          {showLive && liveLoading && liveItems.length === 0 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={18} />
            </Box>
          )}

          {/* No live results message */}
          {showLive && !liveLoading && liveItems.length === 0 && (
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.disabled">
                No partners, properties, or rooms match "{debouncedQuery}"
              </Typography>
            </Box>
          )}

          {/* ── Static navigation commands ── */}
          {filteredCommands.length === 0 && !showLive ? (
            <Box sx={{ px: 2, py: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">No results found</Typography>
            </Box>
          ) : (
            Object.entries(groupedCommands).map(([group, items], gIdx) => (
              <Box key={group}>
                {(gIdx > 0 || (showLive && liveItems.length > 0)) && <Divider sx={{ my: 0.25 }} />}
                <Typography
                  variant="caption"
                  sx={{ px: 2, py: 0.5, display: "block", color: "text.disabled", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontSize: "0.65rem" }}
                >
                  {group}
                </Typography>
                {items.map(item => {
                  const globalIdx = allItems.indexOf(item);
                  const Icon = item.icon;
                  return (
                    <ListItemButton
                      key={item.id}
                      selected={globalIdx === selectedIdx}
                      onClick={() => handleSelect(item)}
                      sx={{ px: 2, py: 0.6, borderRadius: 1, mx: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <Icon size={15} style={{ opacity: 0.7 }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: "0.855rem" }}
                      />
                      {globalIdx === selectedIdx && (
                        <Chip label="↵" size="small" sx={{ height: 18, fontSize: "0.65rem" }} />
                      )}
                    </ListItemButton>
                  );
                })}
              </Box>
            ))
          )}
        </List>

        {/* Footer */}
        <Box sx={{ px: 2, py: 0.75, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 2, alignItems: "center" }}>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>↑↓ navigate</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>↵ select</Typography>
          <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>Esc close</Typography>
          <Box sx={{ ml: "auto" }}>
            <Typography variant="caption" color="text.disabled" sx={{ fontSize: "0.68rem" }}>
              ⌘K / Ctrl+K to open
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

/**
 * useCommandPalette — Hook to manage command palette open state.
 * Registers Cmd/Ctrl+K shortcut globally.
 */
export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useKeyboardShortcuts([
    {
      key: "k",
      ctrl: true,
      handler: () => setOpen(true),
      description: "Open command palette",
    },
  ]);

  return { open, setOpen };
}
