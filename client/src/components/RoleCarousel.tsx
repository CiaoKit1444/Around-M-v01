/**
 * RoleCarousel — Multi-Role Picker
 *
 * Shown after login when a user has multiple role assignments.
 * Displays role cards in a carousel (swipe/arrow navigation).
 * User selects a role to proceed into the platform.
 *
 * Design: dark card-based carousel with role icons, scope labels,
 * and permission preview. Each card has a distinct accent color.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Building2, Globe, Hotel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type RoleAssignment, ROLE_ICONS, ROLE_COLORS } from "@/hooks/useActiveRole";

const REMEMBER_ROLE_KEY = "peppr_remember_role";

interface RoleCarouselProps {
  roles: RoleAssignment[];
  onSelect: (role: RoleAssignment, remember: boolean) => Promise<void>;
  isLoading?: boolean;
  userName?: string;
}

const SCOPE_ICONS = {
  GLOBAL:   <Globe className="w-3.5 h-3.5" />,
  PARTNER:  <Building2 className="w-3.5 h-3.5" />,
  PROPERTY: <Hotel className="w-3.5 h-3.5" />,
};

const SCOPE_LABELS = {
  GLOBAL:   "All Platform",
  PARTNER:  "Partner",
  PROPERTY: "Property",
};

// Key permission labels to show on card
const PERMISSION_LABELS: Record<string, string> = {
  "partners:write":     "Manage Partners",
  "properties:write":   "Manage Properties",
  "rooms:write":        "Manage Rooms",
  "qr:write":           "Manage QR Codes",
  "templates:write":    "Manage Templates",
  "users:write":        "Manage Users",
  "reports:read":       "View Reports",
  "front_office:write": "Front Office Ops",
  "system:write":       "System Config",
  "staff:write":        "Manage Staff",
};

export function RoleCarousel({ roles, onSelect, isLoading, userName }: RoleCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [selecting, setSelecting] = useState(false);
  const [remember, setRemember] = useState(false);

  const sorted = [...roles].sort((a, b) => a.sortOrder - b.sortOrder);
  const current = sorted[currentIndex];
  const colors = ROLE_COLORS[current?.roleId] ?? ROLE_COLORS["FRONT_DESK"];
  const icon = ROLE_ICONS[current?.roleId] ?? "👤";

  const go = (dir: number) => {
    setDirection(dir);
    setCurrentIndex((i) => (i + dir + sorted.length) % sorted.length);
  };

  const handleSelect = async () => {
    if (!current || selecting) return;
    setSelecting(true);
    try {
      await onSelect(current, remember);
    } finally {
      setSelecting(false);
    }
  };

  // Key permissions to highlight (top 4)
  const keyPerms = (current?.permissions ?? [])
    .filter((p) => PERMISSION_LABELS[p])
    .slice(0, 4);

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-sm font-bold text-black">P</div>
          <span className="text-white font-semibold text-lg">Peppr Around</span>
        </div>
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h1>
        <p className="text-zinc-400 text-sm">
          You have <span className="text-white font-medium">{sorted.length} role{sorted.length > 1 ? "s" : ""}</span> assigned.
          Select how you'd like to proceed.
        </p>
      </div>

      {/* Carousel */}
      <div className="relative w-full max-w-sm">
        {/* Navigation arrows */}
        {sorted.length > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 z-10 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => go(1)}
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 z-10 w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Card */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${current?.roleId}-${current?.scopeId}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className={`relative rounded-2xl border ${colors.border} bg-gradient-to-br ${colors.bg} p-6 overflow-hidden`}
          >
            {/* Background glow */}
            <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 blur-3xl ${colors.badge}`} />

            {/* Role icon + name */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="text-4xl mb-2">{icon}</div>
                <h2 className="text-xl font-bold text-white">{current?.roleName}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-zinc-400">{SCOPE_ICONS[current?.scopeType]}</span>
                  <span className="text-zinc-400 text-xs">{SCOPE_LABELS[current?.scopeType]}</span>
                </div>
              </div>
              <Badge className={`${colors.badge} text-white border-0 text-xs`}>
                {current?.scopeType}
              </Badge>
            </div>

            {/* Display label */}
            <p className="text-zinc-300 text-sm mb-4 leading-relaxed">
              {current?.displayLabel}
            </p>

            {/* Key permissions */}
            {keyPerms.length > 0 && (
              <div className="mb-5">
                <p className="text-zinc-500 text-xs uppercase tracking-wider mb-2">Capabilities</p>
                <div className="flex flex-wrap gap-1.5">
                  {keyPerms.map((p) => (
                    <span
                      key={p}
                      className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-zinc-300"
                    >
                      {PERMISSION_LABELS[p]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Select button */}
            <Button
              onClick={handleSelect}
              disabled={selecting || isLoading}
              className={`w-full ${colors.badge} hover:opacity-90 text-white border-0 font-medium`}
            >
              {selecting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Switching...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Enter as {current?.roleName}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Dot indicators */}
      {sorted.length > 1 && (
        <div className="flex gap-1.5 mt-6">
          {sorted.map((_, i) => (
            <button
              key={i}
              onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === currentIndex ? "w-6 bg-white" : "w-1.5 bg-zinc-600 hover:bg-zinc-500"
              }`}
            />
          ))}
        </div>
      )}

      {/* Remember my role checkbox */}
      <label className="flex items-center gap-2 mt-5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-amber-500 cursor-pointer"
        />
        <span className="text-zinc-400 text-sm">Remember my role on this device</span>
      </label>

      {/* Keyboard hint */}
      {sorted.length > 1 && (
        <p className="text-zinc-600 text-xs mt-3">
          Use ← → arrow keys or swipe to browse roles
        </p>
      )}
    </div>
  );
}

export { REMEMBER_ROLE_KEY };
