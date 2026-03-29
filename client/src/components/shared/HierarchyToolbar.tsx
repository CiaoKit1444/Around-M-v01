/**
 * HierarchyToolbar — Reusable toolbar for Setup Hierarchy pages.
 *
 * Features:
 *  - Debounced search input (300 ms)
 *  - Recent searches dropdown (last 5, stored in localStorage, dismissible)
 *  - Sort-by selector (ID / Name / Last Update)
 *  - Asc/Desc toggle button
 *  - Optional right-side slot for extra actions (e.g. Export, Add)
 */
import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  ClickAwayListener,
  Divider,
  InputAdornment,
  MenuItem,
  Paper,
  Popper,
  Select,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
  IconButton,
} from "@mui/material";
import { ArrowDownAZ, ArrowUpAZ, Clock, Search, X } from "lucide-react";

export type SortField = "id" | "name" | "updated_at";
export type SortOrder = "asc" | "desc";

export interface HierarchyToolbarProps {
  /** Current search query (controlled) */
  search: string;
  /** Called after debounce when search text changes */
  onSearchChange: (value: string) => void;
  /** Current sort field */
  sortBy: SortField;
  onSortByChange: (field: SortField) => void;
  /** Current sort direction */
  sortOrder: SortOrder;
  onSortOrderToggle: () => void;
  /** Total items in current result set (for display) */
  total?: number;
  /** Optional extra actions rendered on the right */
  actions?: React.ReactNode;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Available sort fields — defaults to all three */
  sortFields?: { value: SortField; label: string }[];
  /**
   * localStorage key for persisting recent searches.
   * Pass a unique key per entity (e.g. "recent-searches-partners").
   * If omitted, recent searches are disabled.
   */
  recentSearchesKey?: string;
}

const DEFAULT_SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "updated_at", label: "Last Update" },
];

const DEBOUNCE_MS = 300;
const MAX_RECENT = 5;

function loadRecent(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecent(key: string, term: string, existing: string[]): string[] {
  const trimmed = term.trim();
  if (!trimmed) return existing;
  const deduped = [trimmed, ...existing.filter((t) => t !== trimmed)].slice(0, MAX_RECENT);
  try {
    localStorage.setItem(key, JSON.stringify(deduped));
  } catch {
    // localStorage quota exceeded — ignore
  }
  return deduped;
}

export function HierarchyToolbar({
  search,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderToggle,
  total,
  actions,
  searchPlaceholder = "Search…",
  sortFields = DEFAULT_SORT_FIELDS,
  recentSearchesKey,
}: HierarchyToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentTerms, setRecentTerms] = useState<string[]>(() =>
    recentSearchesKey ? loadRecent(recentSearchesKey) : []
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const anchorRef = useRef<HTMLDivElement>(null);

  // Sync external reset (e.g. parent clears search)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const commitSearch = useCallback(
    (value: string) => {
      onSearchChange(value);
      // Persist non-empty queries to recent searches
      if (recentSearchesKey && value.trim()) {
        setRecentTerms((prev) => saveRecent(recentSearchesKey, value, prev));
      }
    },
    [onSearchChange, recentSearchesKey]
  );

  const handleSearchInput = (value: string) => {
    setLocalSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commitSearch(value), DEBOUNCE_MS);
  };

  const handleFocus = () => {
    if (recentSearchesKey && recentTerms.length > 0) {
      setRecentOpen(true);
    }
  };

  const handleSelectRecent = (term: string) => {
    setLocalSearch(term);
    setRecentOpen(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    commitSearch(term);
    inputRef.current?.blur();
  };

  const handleRemoveRecent = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = recentTerms.filter((t) => t !== term);
    setRecentTerms(updated);
    if (recentSearchesKey) {
      try {
        localStorage.setItem(recentSearchesKey, JSON.stringify(updated));
      } catch {
        // ignore
      }
    }
    if (updated.length === 0) setRecentOpen(false);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentTerms([]);
    setRecentOpen(false);
    if (recentSearchesKey) {
      try {
        localStorage.removeItem(recentSearchesKey);
      } catch {
        // ignore
      }
    }
  };

  return (
    <ClickAwayListener onClickAway={() => setRecentOpen(false)}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          flexWrap: "wrap",
          px: 0,
          py: 1.25,
        }}
      >
        {/* Search input with recent-searches popper */}
        <Box ref={anchorRef} sx={{ flex: "1 1 200px", maxWidth: 320, position: "relative" }}>
          <TextField
            inputRef={inputRef}
            size="small"
            placeholder={searchPlaceholder}
            value={localSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={handleFocus}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={14} style={{ opacity: 0.5 }} />
                </InputAdornment>
              ),
              endAdornment: localSearch ? (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => {
                      setLocalSearch("");
                      if (timerRef.current) clearTimeout(timerRef.current);
                      commitSearch("");
                    }}
                    sx={{ p: 0.25 }}
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{
              width: "100%",
              "& .MuiOutlinedInput-root": { fontSize: "0.82rem", height: 34 },
            }}
          />

          {/* Recent searches dropdown */}
          <Popper
            open={recentOpen && recentTerms.length > 0}
            anchorEl={anchorRef.current}
            placement="bottom-start"
            style={{ zIndex: 1400, width: anchorRef.current?.offsetWidth }}
          >
            <Paper
              elevation={4}
              sx={{ borderRadius: 1.5, overflow: "hidden", mt: 0.5 }}
            >
              {/* Header */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  px: 1.5,
                  py: 0.75,
                  bgcolor: "action.hover",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Clock size={12} style={{ opacity: 0.5 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600} fontSize="0.7rem">
                    Recent searches
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="primary"
                  fontSize="0.7rem"
                  sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
                  onClick={handleClearAll}
                >
                  Clear all
                </Typography>
              </Box>
              <Divider />

              {/* Recent items */}
              {recentTerms.map((term) => (
                <Box
                  key={term}
                  onClick={() => handleSelectRecent(term)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    px: 1.5,
                    py: 0.75,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                    gap: 1,
                  }}
                >
                  <Clock size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
                  <Typography
                    variant="body2"
                    fontSize="0.82rem"
                    sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                  >
                    {term}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleRemoveRecent(term, e)}
                    sx={{ p: 0.25, opacity: 0.4, "&:hover": { opacity: 1 } }}
                    aria-label={`Remove "${term}" from recent searches`}
                  >
                    <X size={11} />
                  </IconButton>
                </Box>
              ))}
            </Paper>
          </Popper>
        </Box>

        {/* Sort group label */}
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", fontSize: "0.75rem", whiteSpace: "nowrap" }}
        >
          Sort by
        </Typography>

        {/* Sort-by select */}
        <Select
          size="small"
          value={sortBy}
          onChange={(e) => onSortByChange(e.target.value as SortField)}
          sx={{
            fontSize: "0.82rem",
            height: 34,
            minWidth: 130,
            "& .MuiSelect-select": { py: 0.5 },
          }}
        >
          {sortFields.map((f) => (
            <MenuItem key={f.value} value={f.value} sx={{ fontSize: "0.82rem" }}>
              {f.label}
            </MenuItem>
          ))}
        </Select>

        {/* Asc/Desc toggle */}
        <Tooltip title={sortOrder === "asc" ? "Ascending — click to switch to descending" : "Descending — click to switch to ascending"}>
          <ToggleButton
            value="order"
            selected={sortOrder === "desc"}
            onChange={onSortOrderToggle}
            size="small"
            sx={{
              height: 34,
              px: 1,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              "&.Mui-selected": {
                bgcolor: "primary.main",
                color: "#fff",
                borderColor: "primary.main",
                "&:hover": { bgcolor: "primary.dark" },
              },
            }}
          >
            {sortOrder === "asc" ? <ArrowUpAZ size={15} /> : <ArrowDownAZ size={15} />}
          </ToggleButton>
        </Tooltip>

        {/* Result count */}
        {total !== undefined && (
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontSize: "0.72rem", whiteSpace: "nowrap", ml: 0.5 }}
          >
            {total.toLocaleString()} result{total !== 1 ? "s" : ""}
          </Typography>
        )}

        {/* Right-side actions */}
        {actions && (
          <Box sx={{ ml: "auto", display: "flex", alignItems: "center", gap: 1 }}>
            {actions}
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
