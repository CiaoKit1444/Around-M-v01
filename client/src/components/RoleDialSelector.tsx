/**
 * RoleDialSelector — Dial-style Role Picker
 *
 * Uses the CSS orbit pattern:
 *   rotate(angleDeg) translateX(R) rotate(-angleDeg)
 * so each role button is always exactly R pixels from the centre,
 * regardless of parent layout or canvas size.
 *
 * The centre circle uses position:absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
 * on a position:relative square container, which is always correct.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  Settings,
  Briefcase,
  Building,
  ClipboardList,
  User,
  Wrench,
  Headphones,
  ShieldCheck,
  LucideIcon,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { type RoleAssignment } from "@/hooks/useActiveRole";

// ── Role visual config ────────────────────────────────────────────────────────

interface RoleVisual {
  icon: LucideIcon;
  color: string;
}

const ROLE_VISUALS: Record<string, RoleVisual> = {
  SUPER_ADMIN:       { icon: Crown,         color: "#FF6B6B" },
  SYSTEM_ADMIN:      { icon: ShieldCheck,   color: "#4ECDC4" },
  PARTNER_ADMIN:     { icon: Briefcase,     color: "#FFE66D" },
  PROPERTY_ADMIN:    { icon: Building,      color: "#95E1D3" },
  FRONT_OFFICE:      { icon: ClipboardList, color: "#F38181" },
  FRONT_DESK:        { icon: ClipboardList, color: "#F38181" },
  GUEST:             { icon: User,          color: "#AA96DA" },
  SP_ADMIN:          { icon: Wrench,        color: "#FCBAD3" },
  SERVICE_OPERATOR:  { icon: Headphones,    color: "#A8D8EA" },
  SERVICE_PROVIDER:  { icon: Wrench,        color: "#FCBAD3" },
  HOUSEKEEPING:      { icon: Settings,      color: "#B8E0D2" },
  MAINTENANCE:       { icon: Settings,      color: "#D6EADF" },
};

const DEFAULT_VISUAL: RoleVisual = { icon: User, color: "#9CA3AF" };

// ── Component ─────────────────────────────────────────────────────────────────

interface RoleDialSelectorProps {
  roles: RoleAssignment[];
  onSelect: (role: RoleAssignment, remember: boolean) => Promise<void>;
  isLoading?: boolean;
  userName?: string;
}

export function RoleDialSelector({
  roles,
  onSelect,
  isLoading,
  userName,
}: RoleDialSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<RoleAssignment | null>(null);
  const [hoveredRole, setHoveredRole] = useState<RoleAssignment | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [remember, setRemember] = useState(false);

  const displayRole = hoveredRole ?? selectedRole;
  const sorted = [...roles].sort((a, b) => a.sortOrder - b.sortOrder);
  const count = sorted.length;

  const handleRoleClick = (role: RoleAssignment) => {
    setSelectedRole((prev) =>
      prev?.roleId === role.roleId && prev?.scopeId === role.scopeId ? null : role
    );
  };

  const handleConfirm = async () => {
    if (!selectedRole || selecting) return;
    setSelecting(true);
    try {
      await onSelect(selectedRole, remember);
    } finally {
      setSelecting(false);
    }
  };

  // Orbit radius in px — grows with role count, capped at 220
  const R = Math.min(220, 90 + count * 20);
  // Canvas side = 2R + room for button (64px) + label (24px) + gap (16px) each side
  const SIDE = R * 2 + (64 + 24 + 16) * 2;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center overflow-hidden relative px-4">

      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 border border-zinc-800/30 rounded-full"
          style={{ width: SIDE + 80, height: SIDE + 80 }}
        />
      </div>

      {/* Header */}
      <div className="text-center mb-8 relative z-20">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Platform Role Selection
        </h1>
        <p className="text-zinc-400 text-sm">
          Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          {" — "}select your role to continue
        </p>
      </div>

      {/* ── Dial canvas ──────────────────────────────────────────────────────── */}
      {/* position:relative square; centre circle uses top-1/2 left-1/2 which is always correct */}
      <div
        className="relative z-20 flex-shrink-0"
        style={{ width: SIDE, height: SIDE }}
      >
        {/* SVG: dashed orbit track */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={SIDE}
          height={SIDE}
        >
          <circle
            cx={SIDE / 2}
            cy={SIDE / 2}
            r={R}
            fill="none"
            stroke="#3f3f46"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.5"
          />
        </svg>

        {/* Centre circle — always at 50% / 50% of the container */}
        {/* When a role is selected, clicking the centre confirms immediately */}
        <motion.button
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 flex flex-col items-center justify-center shadow-2xl z-10 focus:outline-none"
          style={{
            borderColor: selectedRole
              ? (ROLE_VISUALS[selectedRole.roleId] ?? DEFAULT_VISUAL).color
              : "#3f3f46",
            cursor: selectedRole && !selecting && !isLoading ? "pointer" : "default",
          }}
          animate={{
            scale: displayRole ? 1.05 : 1,
            boxShadow: selectedRole
              ? `0 0 24px ${(ROLE_VISUALS[selectedRole.roleId] ?? DEFAULT_VISUAL).color}60`
              : "0 8px 32px rgba(0,0,0,0.4)",
          }}
          transition={{ duration: 0.3 }}
          onClick={() => {
            if (selectedRole && !selecting && !isLoading) handleConfirm();
          }}
          disabled={!selectedRole || selecting || isLoading}
          title={selectedRole ? `Enter as ${selectedRole.roleName}` : "Select a role"}
        >
          {selecting || isLoading ? (
            <motion.div className="text-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-1" style={{ color: (ROLE_VISUALS[selectedRole?.roleId ?? ""] ?? DEFAULT_VISUAL).color }} />
              <p className="text-xs text-zinc-400">Switching...</p>
            </motion.div>
          ) : displayRole ? (() => {
            const visual = ROLE_VISUALS[displayRole.roleId] ?? DEFAULT_VISUAL;
            const Icon = visual.icon;
            const isConfirmable = selectedRole?.roleId === displayRole.roleId && selectedRole?.scopeId === displayRole.scopeId;
            return (
              <motion.div
                className="text-center px-5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={`${displayRole.roleId}-${displayRole.scopeId}`}
              >
                {isConfirmable ? (
                  // Show arrow-in-circle confirm hint when this role is selected
                  <div
                    className="w-11 h-11 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: visual.color + "30" }}
                  >
                    <ArrowRight className="w-5 h-5" style={{ color: visual.color }} />
                  </div>
                ) : (
                  <div
                    className="w-11 h-11 rounded-full mx-auto mb-2 flex items-center justify-center"
                    style={{ backgroundColor: visual.color + "20" }}
                  >
                    <Icon className="w-5 h-5" style={{ color: visual.color }} />
                  </div>
                )}
                <h3 className="font-semibold text-sm text-white mb-0.5 leading-tight">
                  {displayRole.roleName}
                </h3>
                <p className="text-xs" style={{ color: isConfirmable ? visual.color : "#71717a" }}>
                  {isConfirmable ? "Tap to enter" : displayRole.scopeType}
                </p>
              </motion.div>
            );
          })() : (
            <motion.div className="text-center px-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <h2 className="text-base font-bold text-white mb-1">Select Role</h2>
              <p className="text-xs text-zinc-400">Hover or click a role</p>
            </motion.div>
          )}
        </motion.button>

        {/* Role buttons — CSS orbit pattern */}
        {/* Each button wrapper is centred on the canvas (top-1/2 left-1/2),  */}
        {/* then rotated by `angle` degrees, translated R px along X, then counter-rotated */}
        {/* so the button itself stays upright. The label sits below the button. */}
        {sorted.map((role, index) => {
          const angleDeg = (index * 360) / count - 90;
          const visual = ROLE_VISUALS[role.roleId] ?? DEFAULT_VISUAL;
          const Icon = visual.icon;
          const isActive = selectedRole?.roleId === role.roleId && selectedRole?.scopeId === role.scopeId;
          const isHovered = hoveredRole?.roleId === role.roleId && hoveredRole?.scopeId === role.scopeId;
          const lit = isActive || isHovered;

          return (
            <div
              key={`${role.roleId}-${role.scopeId}`}
              // Positioned at exact centre of canvas
              className="absolute top-1/2 left-1/2"
              style={{
                // Orbit: rotate → translate → counter-rotate
                transform: `rotate(${angleDeg}deg) translateX(${R}px) rotate(${-angleDeg}deg)`,
              }}
              onMouseEnter={() => setHoveredRole(role)}
              onMouseLeave={() => setHoveredRole(null)}
            >
              {/* Inner wrapper centres the button on the orbit point */}
              <div className="flex flex-col items-center" style={{ transform: "translate(-50%, -50%)" }}>
                <motion.button
                  className="relative w-16 h-16 rounded-full flex items-center justify-center cursor-pointer border-2"
                  style={{
                    backgroundColor: lit ? visual.color : "#27272a",
                    borderColor: lit ? visual.color : "#3f3f46",
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.92 }}
                  animate={{
                    boxShadow: lit
                      ? `0 0 16px ${visual.color}, 0 0 32px ${visual.color}80`
                      : "0 4px 16px rgba(0,0,0,0.3)",
                  }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleRoleClick(role)}
                  title={role.roleName}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: lit ? "#ffffff" : visual.color }}
                  />
                  {lit && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 pointer-events-none"
                      style={{ borderColor: visual.color }}
                      initial={{ scale: 1, opacity: 1 }}
                      animate={{ scale: [1, 1.5, 1.5], opacity: [1, 0, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </motion.button>

                {/* Label below button */}
                <span
                  className="mt-2 text-xs font-medium whitespace-nowrap"
                  style={{ color: lit ? visual.color : "#71717a" }}
                >
                  {role.roleName}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirm button */}
      <div className="relative z-20 mt-8 flex flex-col items-center gap-3">
        <motion.button
          className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            backgroundColor: selectedRole
              ? (ROLE_VISUALS[selectedRole.roleId] ?? DEFAULT_VISUAL).color
              : "#3f3f46",
            color: selectedRole ? "#000" : "#71717a",
          }}
          animate={{ scale: selectedRole ? 1 : 0.95 }}
          whileHover={selectedRole ? { scale: 1.04 } : {}}
          whileTap={selectedRole ? { scale: 0.97 } : {}}
          disabled={!selectedRole || selecting || isLoading}
          onClick={handleConfirm}
        >
          {selecting || isLoading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Switching...</>
          ) : (
            <>
              {selectedRole ? `Enter as ${selectedRole.roleName}` : "Select a role above"}
              {selectedRole && <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </motion.button>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 accent-amber-500 cursor-pointer"
          />
          <span className="text-zinc-400 text-sm">Remember my role on this device</span>
        </label>
      </div>

      <p className="absolute bottom-6 text-zinc-600 text-xs z-20">
        Click a role to select, then confirm — or hover to preview
      </p>
    </div>
  );
}
