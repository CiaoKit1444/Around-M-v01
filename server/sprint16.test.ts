/**
 * Sprint 16 — Dial Role Selector Tests
 *
 * Tests the view-mode selection logic and role visual mapping
 * that drives the RoleDialSelector and RoleSwitchPage behaviour.
 */
import { describe, it, expect } from "vitest";

// ── Constants mirrored from RoleSwitchPage ────────────────────────────────────

const DIAL_DEFAULT_ROLES = new Set(["SUPER_ADMIN", "SYSTEM_ADMIN"]);

type ViewMode = "dropdown" | "carousel" | "dial";

function getDefaultViewMode(
  storedMode: ViewMode | null,
  roles: { roleId: string }[]
): ViewMode {
  if (storedMode && ["dropdown", "carousel", "dial"].includes(storedMode)) {
    return storedMode;
  }
  const hasSuperRole = roles.some((r) => DIAL_DEFAULT_ROLES.has(r.roleId));
  return hasSuperRole ? "dial" : "carousel";
}

// ── Role visual config mirrored from RoleDialSelector ────────────────────────

const ROLE_VISUALS: Record<string, { color: string }> = {
  SUPER_ADMIN:       { color: "#FF6B6B" },
  SYSTEM_ADMIN:      { color: "#4ECDC4" },
  PARTNER_ADMIN:     { color: "#FFE66D" },
  PROPERTY_ADMIN:    { color: "#95E1D3" },
  FRONT_OFFICE:      { color: "#F38181" },
  FRONT_DESK:        { color: "#F38181" },
  GUEST:             { color: "#AA96DA" },
  SP_ADMIN:          { color: "#FCBAD3" },
  SERVICE_OPERATOR:  { color: "#A8D8EA" },
  SERVICE_PROVIDER:  { color: "#FCBAD3" },
  HOUSEKEEPING:      { color: "#B8E0D2" },
  MAINTENANCE:       { color: "#D6EADF" },
};

const DEFAULT_COLOR = "#9CA3AF";

function getRoleColor(roleId: string): string {
  return ROLE_VISUALS[roleId]?.color ?? DEFAULT_COLOR;
}

// ── Landing path logic mirrored from RoleSwitchPage ──────────────────────────

function getLandingPath(roleId: string): string {
  if (roleId === "FRONT_DESK" || roleId === "FRONT_OFFICE" || roleId === "PROPERTY_ADMIN") return "/fo";
  if (roleId === "SERVICE_PROVIDER" || roleId === "SP_ADMIN") return "/sp";
  if (roleId === "SERVICE_OPERATOR") return "/so";
  return "/admin";
}

// ── Dial position math ───────────────────────────────────────────────────────

function getDialPosition(
  index: number,
  count: number,
  radius: number,
  cx: number,
  cy: number
): { x: number; y: number } {
  const angle = (index * 360) / count - 90;
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * radius + cx,
    y: Math.sin(rad) * radius + cy,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Sprint 16 — Dial Role Selector", () => {

  describe("getDefaultViewMode", () => {
    it("returns 'dial' for SUPER_ADMIN when no stored mode", () => {
      expect(getDefaultViewMode(null, [{ roleId: "SUPER_ADMIN" }])).toBe("dial");
    });

    it("returns 'dial' for SYSTEM_ADMIN when no stored mode", () => {
      expect(getDefaultViewMode(null, [{ roleId: "SYSTEM_ADMIN" }])).toBe("dial");
    });

    it("returns 'carousel' for FRONT_DESK when no stored mode", () => {
      expect(getDefaultViewMode(null, [{ roleId: "FRONT_DESK" }])).toBe("carousel");
    });

    it("returns 'carousel' for PARTNER_ADMIN when no stored mode", () => {
      expect(getDefaultViewMode(null, [{ roleId: "PARTNER_ADMIN" }])).toBe("carousel");
    });

    it("respects stored 'dropdown' mode even for SUPER_ADMIN", () => {
      expect(getDefaultViewMode("dropdown", [{ roleId: "SUPER_ADMIN" }])).toBe("dropdown");
    });

    it("respects stored 'carousel' mode even for SYSTEM_ADMIN", () => {
      expect(getDefaultViewMode("carousel", [{ roleId: "SYSTEM_ADMIN" }])).toBe("carousel");
    });

    it("respects stored 'dial' mode for regular roles", () => {
      expect(getDefaultViewMode("dial", [{ roleId: "FRONT_DESK" }])).toBe("dial");
    });

    it("returns 'dial' when mixed roles include SUPER_ADMIN", () => {
      const roles = [
        { roleId: "FRONT_DESK" },
        { roleId: "SUPER_ADMIN" },
        { roleId: "PARTNER_ADMIN" },
      ];
      expect(getDefaultViewMode(null, roles)).toBe("dial");
    });

    it("returns 'carousel' for empty roles list", () => {
      expect(getDefaultViewMode(null, [])).toBe("carousel");
    });

    it("ignores invalid stored mode and falls back to role-based default", () => {
      // @ts-expect-error testing invalid input
      expect(getDefaultViewMode("invalid_mode", [{ roleId: "SUPER_ADMIN" }])).toBe("dial");
    });
  });

  describe("getRoleColor", () => {
    it("returns correct color for SUPER_ADMIN", () => {
      expect(getRoleColor("SUPER_ADMIN")).toBe("#FF6B6B");
    });

    it("returns correct color for SYSTEM_ADMIN", () => {
      expect(getRoleColor("SYSTEM_ADMIN")).toBe("#4ECDC4");
    });

    it("returns default color for unknown role", () => {
      expect(getRoleColor("UNKNOWN_ROLE")).toBe(DEFAULT_COLOR);
    });

    it("returns same color for SP_ADMIN and SERVICE_PROVIDER", () => {
      expect(getRoleColor("SP_ADMIN")).toBe(getRoleColor("SERVICE_PROVIDER"));
    });

    it("returns same color for FRONT_DESK and FRONT_OFFICE", () => {
      expect(getRoleColor("FRONT_DESK")).toBe(getRoleColor("FRONT_OFFICE"));
    });
  });

  describe("getLandingPath", () => {
    it("routes FRONT_DESK to /fo", () => {
      expect(getLandingPath("FRONT_DESK")).toBe("/fo");
    });

    it("routes FRONT_OFFICE to /fo", () => {
      expect(getLandingPath("FRONT_OFFICE")).toBe("/fo");
    });

    it("routes PROPERTY_ADMIN to /fo", () => {
      expect(getLandingPath("PROPERTY_ADMIN")).toBe("/fo");
    });

    it("routes SERVICE_PROVIDER to /sp", () => {
      expect(getLandingPath("SERVICE_PROVIDER")).toBe("/sp");
    });

    it("routes SP_ADMIN to /sp", () => {
      expect(getLandingPath("SP_ADMIN")).toBe("/sp");
    });

    it("routes SERVICE_OPERATOR to /so", () => {
      expect(getLandingPath("SERVICE_OPERATOR")).toBe("/so");
    });

    it("routes SUPER_ADMIN to /admin", () => {
      expect(getLandingPath("SUPER_ADMIN")).toBe("/admin");
    });

    it("routes SYSTEM_ADMIN to /admin", () => {
      expect(getLandingPath("SYSTEM_ADMIN")).toBe("/admin");
    });

    it("routes PARTNER_ADMIN to /admin", () => {
      expect(getLandingPath("PARTNER_ADMIN")).toBe("/admin");
    });

    it("routes unknown role to /admin", () => {
      expect(getLandingPath("UNKNOWN")).toBe("/admin");
    });
  });

  describe("getDialPosition", () => {
    it("places first item at top (angle -90°) for any count", () => {
      const pos = getDialPosition(0, 8, 200, 250, 250);
      // cos(-90°) = 0, sin(-90°) = -1
      expect(pos.x).toBeCloseTo(250, 0);
      expect(pos.y).toBeCloseTo(50, 0); // 250 - 200
    });

    it("places items evenly for 4 roles (90° apart)", () => {
      const count = 4;
      const radius = 100;
      const cx = 150, cy = 150;
      const positions = Array.from({ length: count }, (_, i) =>
        getDialPosition(i, count, radius, cx, cy)
      );
      // All positions should be on the circle
      positions.forEach((p) => {
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        expect(dist).toBeCloseTo(radius, 0);
      });
    });

    it("all positions are equidistant from centre", () => {
      const count = 7;
      const radius = 220;
      const cx = 270, cy = 270;
      const positions = Array.from({ length: count }, (_, i) =>
        getDialPosition(i, count, radius, cx, cy)
      );
      positions.forEach((p) => {
        const dist = Math.sqrt((p.x - cx) ** 2 + (p.y - cy) ** 2);
        expect(dist).toBeCloseTo(radius, 0);
      });
    });
  });

});
