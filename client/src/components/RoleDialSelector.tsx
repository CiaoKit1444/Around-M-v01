/**
 * RoleDialSelector — Dial-style Role Picker
 *
 * An oval orbit picker where each role sits on a glowing button.
 * The centre circle shows role details on hover/select.
 * Designed for SUPER_ADMIN and SYSTEM_ADMIN who have access to all roles.
 *
 * Refinements (Sprint 16b):
 *  - Tighter oval: RY = 45% of RX
 *  - Dynamic outward label offsets (labels always point away from centre)
 *  - Responsive scaling via useWindowSize (scales on small screens)
 */
import { useState, useEffect } from "react";
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

// ── useWindowSize hook ────────────────────────────────────────────────────────

function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return size;
}

// ── Label offset helper ───────────────────────────────────────────────────────
// Returns the CSS offset so the label always points outward from the oval centre.
// The label is positioned relative to the button div (which is centred on the orbit point).
// We push it in the direction of the outward normal from the oval at that angle.

function getLabelStyle(
  angle: number, // degrees, 0 = right, -90 = top
  buttonSize: number,
  labelGap: number
): React.CSSProperties {
  const rad = (angle * Math.PI) / 180;
  // Outward unit vector from centre
  const nx = Math.cos(rad);
  const ny = Math.sin(rad);
  const half = buttonSize / 2 + labelGap;
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    transform: `translate(calc(-50% + ${nx * half}px), calc(-50% + ${ny * half}px))`,
    textAlign: "center",
    pointerEvents: "none",
    whiteSpace: "nowrap",
  };
}

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

  const { width: vw } = useWindowSize();

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

  // ── Geometry ────────────────────────────────────────────────────────────────
  // BASE drives the horizontal radius; clamp to viewport so it never overflows.
  // RY = 45% of RX for a noticeably flat, landscape oval.
  const BUTTON_SIZE = 64; // px — w-16 h-16
  const LABEL_GAP = 28;   // px between button edge and label centre

  const rawBase = Math.min(220, 80 + count * 22);
  // Responsive: shrink if viewport is narrow (leave 160px padding each side)
  const maxRX = Math.max(120, (vw - 160) / 2);
  const BASE = Math.min(rawBase, maxRX);
  const RX = BASE;
  const RY = Math.round(BASE * 0.45); // 45% → noticeably flat oval

  // PADDING: extra space around the oval so buttons + labels don't clip.
  // The oval centre is always at (PADDING + RX, PADDING + RY).
  const PADDING = BUTTON_SIZE / 2 + LABEL_GAP + 20;
  const canvasW = RX * 2 + PADDING * 2;
  const canvasH = RY * 2 + PADDING * 2;
  // Centre of the oval within the canvas
  const cx = PADDING + RX;
  const cy = PADDING + RY;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col items-center justify-center overflow-hidden relative px-4">

      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] border border-zinc-800/30 rounded-[50%]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[820px] h-[600px] border border-zinc-800/20 rounded-[50%]" />
      </div>

      {/* Header — no logo, just title + subtitle */}
      <div className="text-center mb-6 relative z-20">
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
        style={{ width: canvasW, height: canvasH }}
      >
        {/* SVG connecting lines from centre to each role button */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasW}
          height={canvasH}
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

        {/* Centre circle — pinned to oval centre */}
        <motion.div
          className="absolute w-40 h-40 rounded-full bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-zinc-700 flex flex-col items-center justify-center shadow-2xl z-10"
          style={{ left: cx, top: cy, transform: "translate(-50%, -50%)" }}
          animate={{ scale: displayRole ? 1.05 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {displayRole ? (() => {
            const visual = ROLE_VISUALS[displayRole.roleId] ?? DEFAULT_VISUAL;
            const Icon = visual.icon;
            return (
              <motion.div
                className="text-center px-4"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                key={`${displayRole.roleId}-${displayRole.scopeId}`}
              >
                <div
                  className="w-10 h-10 rounded-full mx-auto mb-1.5 flex items-center justify-center"
                  style={{ backgroundColor: visual.color + "20" }}
                >
                  <Icon className="w-5 h-5" style={{ color: visual.color }} />
                </div>
                <h3 className="font-semibold text-xs text-white mb-0.5 leading-tight">
                  {displayRole.roleName}
                </h3>
                <p className="text-xs text-zinc-400">{displayRole.scopeType}</p>
                {displayRole.displayLabel && displayRole.displayLabel !== displayRole.roleName && (
                  <p className="text-xs text-zinc-500 leading-relaxed truncate max-w-[130px] mt-0.5">
                    {displayRole.displayLabel}
                  </p>
                )}
              </motion.div>
            );
          })() : (
            <motion.div
              className="text-center px-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <h2 className="text-base font-bold text-white mb-1">Select Role</h2>
              <p className="text-xs text-zinc-400">Hover or click</p>
            </motion.div>
          )}
        </motion.div>

        {/* Role buttons on oval orbit */}
        {sorted.map((role, index) => {
          const angle = (index * 360) / count - 90;
          const rad = (angle * Math.PI) / 180;
          const x = Math.cos(rad) * RX + cx;
          const y = Math.sin(rad) * RY + cy;

          const visual = ROLE_VISUALS[role.roleId] ?? DEFAULT_VISUAL;
          const Icon = visual.icon;
          const isActive = selectedRole?.roleId === role.roleId && selectedRole?.scopeId === role.scopeId;
          const isHovered = hoveredRole?.roleId === role.roleId && hoveredRole?.scopeId === role.scopeId;
          const lit = isActive || isHovered;

          // Dynamic outward label style — always points away from oval centre
          const labelStyle = getLabelStyle(angle, BUTTON_SIZE, LABEL_GAP);

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

              {/* Dynamic outward label */}
              <div style={labelStyle}>
                <span
                  className="text-xs font-medium"
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
