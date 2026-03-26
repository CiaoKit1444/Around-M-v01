/**
 * RoleDialSelector — Dial-style Role Picker
 *
 * A circular dial UI where each role is a glowing button on the orbit.
 * The centre circle shows role details on hover/select.
 * Designed for SUPER_ADMIN and SYSTEM_ADMIN who have access to all roles.
 *
 * Ported from the Peppr Around design prototype (RoleSelectionLandingPage.zip)
 * and adapted to consume live RoleAssignment data from useActiveRole.
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

  const handleRoleClick = (role: RoleAssignment) => {
    setSelectedRole((prev) => (prev?.roleId === role.roleId && prev?.scopeId === role.scopeId ? null : role));
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

  // Distribute roles evenly around a landscape oval
  // RX > RY so the orbit is wider than tall, reducing canvas height
  const count = sorted.length;
  const BASE = Math.min(220, 80 + count * 22);
  const RX = BASE;          // horizontal radius (unchanged)
  const RY = Math.round(BASE * 0.55); // vertical radius — 55% of RX gives a clear oval

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center overflow-hidden relative px-4">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border border-zinc-800/30 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[820px] border border-zinc-800/20 rounded-full" />
      </div>

      {/* Header — no logo, just title + subtitle */}
      <div className="text-center mb-8 relative z-20">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
          Platform Role Selection
        </h1>
        <p className="text-zinc-400 text-sm">
          Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
          {" — "}select your role to continue
        </p>
      </div>

      {/* Dial — landscape oval canvas */}
      <div
        className="relative z-20"
        style={{ width: RX * 2 + 100, height: RY * 2 + 100 }}
      >
        {/* SVG connecting lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={RX * 2 + 100}
          height={RY * 2 + 100}
        >
          <defs>
            <radialGradient id="lineGrad">
              <stop offset="0%" stopColor="#3f3f46" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#3f3f46" stopOpacity="0.1" />
            </radialGradient>
          </defs>
          {sorted.map((role, index) => {
            const angle = (index * 360) / count - 90;
            const rad = (angle * Math.PI) / 180;
            const cx = RX + 50;
            const cy = RY + 50;
            const x = Math.cos(rad) * RX + cx;
            const y = Math.sin(rad) * RY + cy;
            return (
              <motion.line
                key={`line-${role.roleId}-${role.scopeId}`}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="url(#lineGrad)"
                strokeWidth="1"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.5 }}
                transition={{ duration: 0.8, delay: index * 0.08 }}
              />
            );
          })}
        </svg>

        {/* Centre circle — positioned at exact oval centre (RX+50, RY+50) */}
        <motion.div
          className="absolute w-44 h-44 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex flex-col items-center justify-center shadow-2xl z-10"
          style={{ left: RX + 50, top: RY + 50, transform: "translate(-50%, -50%)" }}
          animate={{ scale: displayRole ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {displayRole ? (() => {
            const visual = ROLE_VISUALS[displayRole.roleId] ?? DEFAULT_VISUAL;
            const Icon = visual.icon;
            return (
              <motion.div
                className="text-center px-6"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={`${displayRole.roleId}-${displayRole.scopeId}`}
              >
                <div
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: visual.color + "20" }}
                >
                  <Icon className="w-6 h-6" style={{ color: visual.color }} />
                </div>
                <h3 className="font-semibold text-sm text-white mb-0.5 leading-tight">
                  {displayRole.roleName}
                </h3>
                <p className="text-xs text-zinc-400 mb-1">{displayRole.scopeType}</p>
                {displayRole.displayLabel && displayRole.displayLabel !== displayRole.roleName && (
                  <p className="text-xs text-zinc-500 leading-relaxed truncate max-w-[160px]">
                    {displayRole.displayLabel}
                  </p>
                )}
              </motion.div>
            );
          })() : (
            <motion.div
              className="text-center px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-lg font-bold text-white mb-1">Select Role</h2>
              <p className="text-xs text-zinc-400">Hover or click a role</p>
            </motion.div>
          )}
        </motion.div>

        {/* Role buttons on oval orbit */}
        {sorted.map((role, index) => {
          const angle = (index * 360) / count - 90;
          const rad = (angle * Math.PI) / 180;
          const cx = RX + 50;
          const cy = RY + 50;
          const x = Math.cos(rad) * RX + cx;
          const y = Math.sin(rad) * RY + cy;

          const visual = ROLE_VISUALS[role.roleId] ?? DEFAULT_VISUAL;
          const Icon = visual.icon;
          const isActive = selectedRole?.roleId === role.roleId && selectedRole?.scopeId === role.scopeId;
          const isHovered = hoveredRole?.roleId === role.roleId && hoveredRole?.scopeId === role.scopeId;
          const lit = isActive || isHovered;

          return (
            <div
              key={`${role.roleId}-${role.scopeId}`}
              className="absolute"
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
              }}
              onMouseEnter={() => setHoveredRole(role)}
              onMouseLeave={() => setHoveredRole(null)}
            >
              <motion.button
                className="relative w-16 h-16 rounded-full flex flex-col items-center justify-center cursor-pointer border-2 gap-0.5"
                style={{
                  backgroundColor: lit ? visual.color : "#27272a",
                  borderColor: lit ? visual.color : "#3f3f46",
                }}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.92 }}
                animate={{
                  boxShadow: lit
                    ? `0 0 16px ${visual.color}, 0 0 32px ${visual.color}80, inset 0 0 12px ${visual.color}30`
                    : "0 4px 16px rgba(0,0,0,0.3)",
                }}
                transition={{ duration: 0.2 }}
                onClick={() => handleRoleClick(role)}
                title={role.roleName}
              >
                <motion.div
                  animate={{ filter: lit ? `drop-shadow(0 0 6px ${visual.color})` : "none" }}
                >
                  <Icon
                    className="w-6 h-6"
                    style={{ color: lit ? "#ffffff" : visual.color }}
                  />
                </motion.div>

                {/* Neon pulse ring */}
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

              {/* Role label below button */}
              <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 text-center pointer-events-none">
                <span
                  className="text-xs font-medium whitespace-nowrap"
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
      <div className="relative z-20 mt-10 flex flex-col items-center gap-3">
        <motion.button
          className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Switching...
            </>
          ) : (
            <>
              {selectedRole ? `Enter as ${selectedRole.roleName}` : "Select a role above"}
              {selectedRole && <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </motion.button>

        {/* Remember checkbox */}
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

      {/* Footer hint */}
      <p className="absolute bottom-6 text-zinc-600 text-xs z-20">
        Click a role to select, then confirm — or hover to preview
      </p>
    </div>
  );
}
