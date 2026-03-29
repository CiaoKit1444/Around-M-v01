/**
 * HierarchyToolbar — Reusable toolbar for Setup Hierarchy pages.
 *
 * Features:
 *  - Debounced search input (300 ms)
 *  - Sort-by selector (ID / Name / Last Update)
 *  - Asc/Desc toggle button
 *  - Optional right-side slot for extra actions (e.g. Export, Add)
 */
import { useEffect, useRef, useState } from "react";
import {
  Box,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { ArrowDownAZ, ArrowUpAZ, Search } from "lucide-react";

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
}

const DEFAULT_SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "name", label: "Name" },
  { value: "updated_at", label: "Last Update" },
];

const DEBOUNCE_MS = 300;

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
}: HierarchyToolbarProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external reset (e.g. parent clears search)
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearchInput = (value: string) => {
    setLocalSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearchChange(value);
    }, DEBOUNCE_MS);
  };

  return (
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
      {/* Search input */}
      <TextField
        size="small"
        placeholder={searchPlaceholder}
        value={localSearch}
        onChange={(e) => handleSearchInput(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Search size={14} style={{ opacity: 0.5 }} />
            </InputAdornment>
          ),
        }}
        sx={{
          flex: "1 1 200px",
          maxWidth: 320,
          "& .MuiOutlinedInput-root": { fontSize: "0.82rem", height: 34 },
        }}
      />

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
  );
}
