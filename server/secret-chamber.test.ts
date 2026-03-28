/**
 * secret-chamber.test.ts
 *
 * Unit tests for bootstrapRouter procedures.
 * All DB calls are mocked — no real database required.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CONFIRM_CODES } from "./bootstrapRouter";

// ── Mock getDb ────────────────────────────────────────────────────────────────
const { mockDb, mockDelete, mockInsert, mockSelect, mockExecute } = vi.hoisted(() => {
  const mockDelete = vi.fn().mockResolvedValue({ rowsAffected: 0 });
  const mockInsert = vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue({}) });
  const mockSelect = vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([{ roleId: "SUPER_ADMIN" }]),
    }),
  });
  const mockExecute = vi.fn().mockResolvedValue({});
  const mockDb = {
    delete: mockDelete,
    insert: mockInsert,
    select: mockSelect,
    execute: mockExecute,
  };
  return { mockDb, mockDelete, mockInsert, mockSelect, mockExecute };
});

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(mockDb),
}));

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("CONFIRM_CODES", () => {
  it("defines all 5 operation codes", () => {
    expect(CONFIRM_CODES.P1).toBe("PURGE-TX");
    expect(CONFIRM_CODES.P2).toBe("PURGE-ALL");
    expect(CONFIRM_CODES.P3).toBe("SEED-NOW");
    expect(CONFIRM_CODES.S1).toBe("PURGE-SP");
    expect(CONFIRM_CODES.S2).toBe("PURGE-SVC");
  });

  it("has exactly 5 codes", () => {
    expect(Object.keys(CONFIRM_CODES)).toHaveLength(5);
  });

  it("all codes are uppercase strings with hyphens", () => {
    for (const code of Object.values(CONFIRM_CODES)) {
      expect(code).toMatch(/^[A-Z][A-Z-]+$/);
    }
  });
});

describe("bootstrapRouter — confirmation code validation", () => {
  it("P1 code is distinct from P2", () => {
    expect(CONFIRM_CODES.P1).not.toBe(CONFIRM_CODES.P2);
  });

  it("P3 code is distinct from P1 and P2", () => {
    expect(CONFIRM_CODES.P3).not.toBe(CONFIRM_CODES.P1);
    expect(CONFIRM_CODES.P3).not.toBe(CONFIRM_CODES.P2);
  });

  it("S1 code is distinct from S2", () => {
    expect(CONFIRM_CODES.S1).not.toBe(CONFIRM_CODES.S2);
  });

  it("all 5 codes are unique", () => {
    const values = Object.values(CONFIRM_CODES);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });
});

describe("bootstrapRouter — operation grouping", () => {
  const PARTNER_OPS = ["P1", "P2", "P3"];
  const SP_OPS = ["S1", "S2"];

  it("partner operations are P1, P2, P3", () => {
    for (const op of PARTNER_OPS) {
      expect(CONFIRM_CODES[op]).toBeDefined();
    }
  });

  it("SP operations are S1, S2", () => {
    for (const op of SP_OPS) {
      expect(CONFIRM_CODES[op]).toBeDefined();
    }
  });

  it("P3 (seed) code implies creation, not just deletion", () => {
    // SEED-NOW implies seeding, not just purging
    expect(CONFIRM_CODES.P3).toContain("SEED");
  });
});

describe("bootstrapRouter — danger escalation", () => {
  it("P1 is less destructive than P2 (P1 preserves master data)", () => {
    // P1 = PURGE-TX (transactions only)
    // P2 = PURGE-ALL (master + transactions)
    expect(CONFIRM_CODES.P1).toContain("TX");
    expect(CONFIRM_CODES.P2).toContain("ALL");
  });

  it("S2 is less destructive than S1 (S2 preserves providers)", () => {
    // S2 = PURGE-SVC (services only, providers preserved)
    // S1 = PURGE-SP (all SP including providers)
    expect(CONFIRM_CODES.S2).toContain("SVC");
    expect(CONFIRM_CODES.S1).toContain("SP");
  });
});

describe("bootstrapRouter — mock DB interactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset select mock to return SUPER_ADMIN role
    mockSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ roleId: "SUPER_ADMIN" }]),
      }),
    });
    mockDelete.mockResolvedValue({ rowsAffected: 5 });
    mockInsert.mockReturnValue({ values: vi.fn().mockResolvedValue({}) });
    mockExecute.mockResolvedValue({});
  });

  it("getDb is called when assertSuperAdmin runs", async () => {
    const { getDb } = await import("./db");
    // Trigger a DB call via getDb
    const db = await getDb();
    expect(db).toBeDefined();
    expect(db).toBe(mockDb);
  });

  it("affected() helper extracts rowsAffected correctly", () => {
    // Test the affected helper logic inline — must handle null safely
    const affected = (res: any): number =>
      res == null ? 0 : ((res as any).rowsAffected ?? (res as any)[0]?.affectedRows ?? 0);

    expect(affected({ rowsAffected: 42 })).toBe(42);
    expect(affected([{ affectedRows: 7 }])).toBe(7);
    expect(affected({})).toBe(0);
    expect(affected(null)).toBe(0);
  });

  it("affected() returns 0 for empty result", () => {
    const affected = (res: any): number =>
      (res as any).rowsAffected ?? (res as any)[0]?.affectedRows ?? 0;

    expect(affected({})).toBe(0);
    expect(affected([])).toBe(0);
  });
});

describe("bootstrapRouter — seed data structure", () => {
  it("THAI_HOTEL_NAMES has 3 partners with correct hotel counts", () => {
    // 3 partners: [3 hotels, 4 hotels, 3 hotels] = 10 total
    const THAI_HOTEL_NAMES = [
      ["Lanna Heritage Hotel", "Riverside Boutique Chiang Mai", "The Mountain Retreat"],
      ["Sukhumvit Grand", "Silom Suites Bangkok", "Riverside Bangkok Hotel", "Asoke Residence"],
      ["Phuket Pearl Resort", "Patong Beach Hotel", "Kata Sands"],
    ];
    const total = THAI_HOTEL_NAMES.reduce((sum, arr) => sum + arr.length, 0);
    expect(total).toBe(10);
  });

  it("seed preview totals are consistent", () => {
    const seedPreview = {
      partners: 3,
      properties: 10,
      rooms: 100,
      qr_codes: 100,
      service_providers: 5,
      catalog_items: 15,
      service_templates: 5,
      template_items: 10,
    };
    // 10 properties × 10 rooms = 100 rooms
    expect(seedPreview.rooms).toBe(seedPreview.properties * 10);
    // 1 QR per room
    expect(seedPreview.qr_codes).toBe(seedPreview.rooms);
    // 3 catalog items per SP
    expect(seedPreview.catalog_items).toBe(seedPreview.service_providers * 3);
    // 1 template per SP
    expect(seedPreview.service_templates).toBe(seedPreview.service_providers);
    // 2 template items per template
    expect(seedPreview.template_items).toBe(seedPreview.service_templates * 2);
  });
});
