/**
 * PropertySwitcher — Top-bar property context switcher.
 *
 * Visible only to SUPER_ADMIN and SYSTEM_ADMIN users.
 * Renders a compact chip that opens a searchable dropdown listing all
 * properties. Selecting one persists the choice to localStorage via
 * useActiveProperty.setActiveProperty() and triggers a query invalidation
 * so every property-scoped page updates without a full page reload.
 *
 * Design: Precision Studio — matches the ActiveRoleBadge dark-chip aesthetic.
 */
import { useState, useRef, useEffect, useMemo } from "react";
import { Building2, ChevronDown, Search, Check, RefreshCw, MapPin } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { propertiesApi } from "@/lib/api/endpoints";
import { useAuth } from "@/contexts/AuthContext";
import { useActiveProperty } from "@/hooks/useActiveProperty";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/api/types";

const GLOBAL_ROLES = ["SUPER_ADMIN", "SYSTEM_ADMIN"];

/** Returns the two-letter abbreviation for a property name */
function abbrev(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Status dot color */
function statusColor(status: Property["status"]): string {
  if (status === "active") return "bg-emerald-400";
  if (status === "inactive") return "bg-zinc-500";
  return "bg-amber-400"; // pending
}

export function PropertySwitcher() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { propertyId, setActiveProperty } = useActiveProperty();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Only render for global-scope admins
  const isGlobalAdmin = GLOBAL_ROLES.includes(user?.role ?? "");
  if (!isGlobalAdmin) return null;

  // Fetch all properties (up to 200 — enough for any realistic tenant count)
  const propertiesQuery = useQuery({
    queryKey: ["properties", "switcher"],
    queryFn: () => propertiesApi.list({ page: 1, page_size: 200 }),
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });

  const properties = propertiesQuery.data?.items ?? [];

  // Active property object
  const activeProperty = properties.find((p) => p.id === propertyId);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return properties;
    return properties.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.city?.toLowerCase().includes(q) ||
        p.country?.toLowerCase().includes(q)
    );
  }, [properties, search]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard: close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSelect = (property: Property) => {
    if (property.id === propertyId) {
      setOpen(false);
      setSearch("");
      return;
    }
    // Persist to localStorage
    setActiveProperty(property.id);
    // Invalidate all property-scoped queries so pages refresh automatically
    queryClient.invalidateQueries({ queryKey: ["qr"] });
    queryClient.invalidateQueries({ queryKey: ["rooms"] });
    queryClient.invalidateQueries({ queryKey: ["stay-tokens"] });
    queryClient.invalidateQueries({ queryKey: ["front-office"] });
    queryClient.invalidateQueries({ queryKey: ["access-log"] });
    queryClient.invalidateQueries({ queryKey: ["properties", "first"] });
    setOpen(false);
    setSearch("");
  };

  const isLoading = propertiesQuery.isLoading || propertiesQuery.isFetching;

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger chip */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
          "border-violet-500/40 bg-zinc-900 text-zinc-200",
          "hover:bg-zinc-800 hover:border-violet-400/60 transition-colors cursor-pointer",
          open && "bg-zinc-800 border-violet-400/60"
        )}
        aria-label={`Active property: ${activeProperty?.name ?? "Select property"}. Click to switch.`}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <Building2 className="w-3 h-3 text-violet-400 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[180px]">
          {isLoading && !activeProperty
            ? "Loading…"
            : activeProperty?.name ?? "Select property"}
        </span>
        {activeProperty && (
          <span
            className={cn(
              "w-1.5 h-1.5 rounded-full flex-shrink-0",
              statusColor(activeProperty.status)
            )}
          />
        )}
        <ChevronDown
          className={cn(
            "w-3 h-3 text-zinc-500 flex-shrink-0 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-[1200]",
            "w-80 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60",
            "overflow-hidden"
          )}
          role="listbox"
          aria-label="Select property"
        >
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-zinc-800">
            <div className="flex items-center gap-1.5 mb-2">
              <Building2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wide">
                Switch Property
              </span>
              {isLoading && (
                <RefreshCw className="w-3 h-3 text-zinc-500 animate-spin ml-auto" />
              )}
            </div>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search properties…"
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 text-xs rounded-lg",
                  "bg-zinc-900 border border-zinc-800 text-zinc-200 placeholder-zinc-600",
                  "focus:outline-none focus:border-violet-500/60 focus:ring-1 focus:ring-violet-500/30",
                  "transition-colors"
                )}
              />
            </div>
          </div>

          {/* Property list */}
          <div className="max-h-72 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <div className="px-3 py-4 text-center text-xs text-zinc-500">
                {search ? "No properties match your search" : "No properties found"}
              </div>
            )}
            {filtered.map((property) => {
              const isActive = property.id === propertyId;
              return (
                <button
                  key={property.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => handleSelect(property)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-left",
                    "transition-colors",
                    isActive
                      ? "bg-violet-950/40 text-zinc-100"
                      : "text-zinc-300 hover:bg-zinc-800/60"
                  )}
                >
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                      "text-[10px] font-bold",
                      isActive
                        ? "bg-violet-700 text-white"
                        : "bg-zinc-800 text-zinc-400"
                    )}
                  >
                    {abbrev(property.name)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium truncate leading-tight">
                        {property.name}
                      </span>
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          statusColor(property.status)
                        )}
                      />
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5 text-zinc-600 flex-shrink-0" />
                      <span className="text-[10px] text-zinc-500 truncate">
                        {[property.city, property.country].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Active check */}
                  {isActive && (
                    <Check className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          {properties.length > 0 && (
            <div className="px-3 py-2 border-t border-zinc-800">
              <span className="text-[10px] text-zinc-600">
                {properties.length} propert{properties.length === 1 ? "y" : "ies"} available
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
