/**
 * CommandPalette — Global search and navigation via Cmd+K.
 *
 * Provides quick navigation to any page, recent items, and actions.
 * Keyboard: Cmd/Ctrl+K to open, Escape to close, arrows to navigate, Enter to select.
 */
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Dialog, DialogContent, TextField, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, Typography, Divider, Chip, Box, CircularProgress,
} from "@mui/material";
import {
  LayoutDashboard, Handshake, Building2, DoorOpen, Truck,
  ShoppingBag, Layers, QrCode, ConciergeBell, Users, UserCog,
  Settings, TrendingUp, Star, Shield, ScrollText, KeyRound, Search,
} from "lucide-react";
import { useLocation } from "wouter";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import apiClient from "@/lib/api/client";

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
  { id: "dashboard", label: "Dashboard", path: "/", icon: LayoutDashboard, group: "Navigation", keywords: ["home", "overview"] },
  { id: "partners", label: "Partners", path: "/partners", icon: Handshake, group: "Navigation", keywords: ["organizations"] },
  { id: "properties", label: "Properties", path: "/properties", icon: Building2, group: "Navigation", keywords: ["hotels", "venues"] },
  { id: "rooms", label: "Rooms", path: "/rooms", icon: DoorOpen, group: "Navigation", keywords: ["units", "suites"] },
  { id: "providers", label: "Service Providers", path: "/providers", icon: Truck, group: "Navigation", keywords: ["vendors", "suppliers"] },
  { id: "catalog", label: "Service Catalog", path: "/catalog", icon: ShoppingBag, group: "Navigation", keywords: ["items", "services", "menu"] },
  { id: "templates", label: "Service Templates", path: "/templates", icon: Layers, group: "Navigation", keywords: ["bundles", "packages"] },
  { id: "qr", label: "QR Management", path: "/qr", icon: QrCode, group: "Operations", keywords: ["codes", "scan"] },
  { id: "qr-access-log", label: "QR Access Log", path: "/qr/access-log", icon: ScrollText, group: "Operations", keywords: ["scan history", "log"] },
  { id: "qr-tokens", label: "Stay Tokens", path: "/qr/tokens", icon: KeyRound, group: "Operations", keywords: ["active sessions", "tokens"] },
  { id: "front-office", label: "Front Office", path: "/front-office", icon: ConciergeBell, group: "Operations", keywords: ["requests", "concierge", "live"] },
  { id: "revenue-report", label: "Revenue Report", path: "/reports/revenue", icon: TrendingUp, group: "Reports", keywords: ["income", "earnings", "analytics"] },
  { id: "satisfaction-report", label: "Satisfaction Report", path: "/reports/satisfaction", icon: Star, group: "Reports", keywords: ["ratings", "feedback", "nps"] },
  { id: "audit-log", label: "Audit Log", path: "/reports/audit", icon: Shield, group: "Reports", keywords: ["history", "changes", "activity"] },
  { id: "users", label: "Users", path: "/users", icon: UserCog, group: "Admin", keywords: ["accounts", "team"] },
  { id: "staff", label: "Staff", path: "/staff", icon: Users, group: "Admin", keywords: ["employees", "positions"] },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings, group: "Admin", keywords: ["config", "preferences"] },
];

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface LiveResult {
  id: string;
  label: string;
  description: string;
  path: string;
  icon: React.ElementType;
  group: string;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [, navigate] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced live entity search
  const searchEntities = useCallback(async (q: string) => {
    if (q.length < 2) { setLiveResults([]); return; }
    setLiveLoading(true);
    try {
      const [partners, properties, rooms] = await Promise.allSettled([
        apiClient.get(`v1/partners?search=${encodeURIComponent(q)}&page_size=3`).json<{ items: Array<{ id: string; name: string }> }>(),
        apiClient.get(`v1/properties?search=${encodeURIComponent(q)}&page_size=3`).json<{ items: Array<{ id: string; name: string; partner_name?: string }> }>(),
        apiClient.get(`v1/rooms?search=${encodeURIComponent(q)}&page_size=3`).json<{ items: Array<{ id: string; room_number: string; property_name?: string }> }>(),
      ]);
      const results: LiveResult[] = [];
      if (partners.status === "fulfilled") {
        partners.value.items?.forEach(p => results.push({ id: `partner-${p.id}`, label: p.name, description: "Partner", path: `/partners/${p.id}`, icon: Handshake, group: "Partners" }));
      }
      if (properties.status === "fulfilled") {
        properties.value.items?.forEach(p => results.push({ id: `property-${p.id}`, label: p.name, description: p.partner_name ?? "Property", path: `/properties/${p.id}`, icon: Building2, group: "Properties" }));
      }
      if (rooms.status === "fulfilled") {
        rooms.value.items?.forEach(r => results.push({ id: `room-${r.id}`, label: `Room ${r.room_number}`, description: r.property_name ?? "Room", path: `/rooms/${r.id}`, icon: DoorOpen, group: "Rooms" }));
      }
      setLiveResults(results);
    } catch {
      setLiveResults([]);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchEntities(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchEntities]);

  const filtered = useMemo(() => {
    if (!query.trim()) return ALL_COMMANDS.slice(0, 8);
    const q = query.toLowerCase();
    return ALL_COMMANDS.filter(cmd =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.group.toLowerCase().includes(q) ||
      cmd.keywords?.some(k => k.includes(q))
    ).slice(0, 10);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  const handleSelect = (item: CommandItem) => {
    navigate(item.path);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIdx]) handleSelect(filtered[selectedIdx]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Group items
  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    }
    return groups;
  }, [filtered]);

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
        <Box sx={{ px: 2, pt: 1.5, pb: 1, borderBottom: "1px solid", borderColor: "divider" }}>
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder="Search pages, actions..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            variant="standard"
            InputProps={{
              startAdornment: <Search size={16} style={{ marginRight: 8, opacity: 0.5 }} />,
              disableUnderline: true,
              sx: { fontSize: "1rem" },
            }}
          />
        </Box>

        <List dense sx={{ maxHeight: 400, overflow: "auto", py: 0.5 }}>
          {/* Live entity search results */}
          {liveResults.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ px: 2, py: 0.5, display: "block", color: "text.disabled", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {liveLoading ? "Searching..." : "Live Results"}
              </Typography>
              {liveResults.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <ListItemButton
                    key={item.id}
                    onClick={() => { navigate(item.path); onClose(); }}
                    sx={{ px: 2, py: 0.75, borderRadius: 1, mx: 0.5 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}><Icon size={16} /></ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      secondary={item.description}
                      primaryTypographyProps={{ fontSize: "0.875rem" }}
                      secondaryTypographyProps={{ fontSize: "0.75rem" }}
                    />
                    <Chip label={item.group} size="small" variant="outlined" sx={{ height: 18, fontSize: "0.65rem" }} />
                  </ListItemButton>
                );
              })}
              <Divider />
            </Box>
          )}
          {liveLoading && liveResults.length === 0 && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={20} />
            </Box>
          )}
          {filtered.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="No results found"
                primaryTypographyProps={{ color: "text.secondary", fontSize: "0.875rem" }}
              />
            </ListItem>
          ) : (
            Object.entries(grouped).map(([group, items], gIdx) => (
              <Box key={group}>
                {gIdx > 0 && <Divider />}
                <Typography variant="caption" sx={{ px: 2, py: 0.5, display: "block", color: "text.disabled", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {group}
                </Typography>
                {items.map(item => {
                  const globalIdx = filtered.indexOf(item);
                  const Icon = item.icon;
                  return (
                    <ListItemButton
                      key={item.id}
                      selected={globalIdx === selectedIdx}
                      onClick={() => handleSelect(item)}
                      sx={{ px: 2, py: 0.75, borderRadius: 1, mx: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Icon size={16} />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: "0.875rem" }}
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

        <Box sx={{ px: 2, py: 1, borderTop: "1px solid", borderColor: "divider", display: "flex", gap: 2 }}>
          <Typography variant="caption" color="text.disabled">↑↓ navigate</Typography>
          <Typography variant="caption" color="text.disabled">↵ select</Typography>
          <Typography variant="caption" color="text.disabled">Esc close</Typography>
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
