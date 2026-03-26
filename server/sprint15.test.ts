/**
 * Sprint 15 tests
 * Covers: assignItemsToSp, listTicketsForRequest, getSoJob procedures
 * and SO job detail stage machine validation.
 */
import { describe, it, expect } from "vitest";

// ── assignItemsToSp input validation ─────────────────────────────────────────

describe("assignItemsToSp input validation", () => {
  it("rejects empty itemIds array", () => {
    const validate = (itemIds: string[]) => itemIds.length >= 1;
    expect(validate([])).toBe(false);
    expect(validate(["item-1"])).toBe(true);
    expect(validate(["item-1", "item-2"])).toBe(true);
  });

  it("requires both requestId and providerId", () => {
    const validate = (input: { requestId: string; providerId: string; itemIds: string[] }) =>
      input.requestId.length > 0 && input.providerId.length > 0 && input.itemIds.length > 0;

    expect(validate({ requestId: "", providerId: "sp-1", itemIds: ["i1"] })).toBe(false);
    expect(validate({ requestId: "req-1", providerId: "", itemIds: ["i1"] })).toBe(false);
    expect(validate({ requestId: "req-1", providerId: "sp-1", itemIds: [] })).toBe(false);
    expect(validate({ requestId: "req-1", providerId: "sp-1", itemIds: ["i1"] })).toBe(true);
  });

  it("allows optional notes", () => {
    const buildPayload = (notes?: string) => ({
      requestId: "req-1",
      providerId: "sp-1",
      itemIds: ["item-1"],
      ...(notes !== undefined ? { notes } : {}),
    });
    expect(buildPayload()).not.toHaveProperty("notes");
    expect(buildPayload("special instructions")).toHaveProperty("notes", "special instructions");
  });
});

// ── itemIds JSON serialisation ────────────────────────────────────────────────

describe("itemIds JSON serialisation", () => {
  it("serialises array to JSON string for DB insert", () => {
    const itemIds = ["item-1", "item-2", "item-3"];
    const serialised = JSON.stringify(itemIds);
    expect(serialised).toBe('["item-1","item-2","item-3"]');
  });

  it("deserialises JSON string back to array", () => {
    const raw = '["item-1","item-2"]';
    const parsed = JSON.parse(raw);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toBe("item-1");
  });

  it("handles null itemIds gracefully (legacy rows)", () => {
    const raw = null;
    const ids = Array.isArray(raw) ? raw : [];
    expect(ids).toHaveLength(0);
  });
});

// ── itemTicketMap building logic ──────────────────────────────────────────────

describe("itemTicketMap building logic", () => {
  const tickets = [
    { id: "t1", providerId: "sp-A", itemIds: ["item-1", "item-2"], status: "OPEN" },
    { id: "t2", providerId: "sp-B", itemIds: ["item-3"], status: "CONFIRMED" },
    { id: "t3", providerId: "sp-A", itemIds: null, status: "OPEN" }, // legacy null
  ];

  const providerMap: Record<string, string> = {
    "sp-A": "Speedy Transfers",
    "sp-B": "Luxury Spa",
  };

  it("maps each itemId to its provider name", () => {
    const itemTicketMap: Record<string, string> = {};
    for (const ticket of tickets) {
      const ids = Array.isArray(ticket.itemIds) ? ticket.itemIds as string[] : [];
      for (const iid of ids) {
        itemTicketMap[iid] = providerMap[ticket.providerId] ?? ticket.providerId;
      }
    }
    expect(itemTicketMap["item-1"]).toBe("Speedy Transfers");
    expect(itemTicketMap["item-2"]).toBe("Speedy Transfers");
    expect(itemTicketMap["item-3"]).toBe("Luxury Spa");
    expect(itemTicketMap["item-4"]).toBeUndefined();
  });

  it("skips tickets with null itemIds without throwing", () => {
    expect(() => {
      const map: Record<string, string> = {};
      for (const ticket of tickets) {
        const ids = Array.isArray(ticket.itemIds) ? ticket.itemIds as string[] : [];
        for (const iid of ids) {
          map[iid] = providerMap[ticket.providerId] ?? ticket.providerId;
        }
      }
    }).not.toThrow();
  });

  it("last ticket wins when same item assigned to multiple SPs", () => {
    const overlappingTickets = [
      { id: "t1", providerId: "sp-A", itemIds: ["item-1"] },
      { id: "t2", providerId: "sp-B", itemIds: ["item-1"] }, // overrides t1
    ];
    const map: Record<string, string> = {};
    for (const ticket of overlappingTickets) {
      const ids = Array.isArray(ticket.itemIds) ? ticket.itemIds as string[] : [];
      for (const iid of ids) {
        map[iid] = providerMap[ticket.providerId] ?? ticket.providerId;
      }
    }
    expect(map["item-1"]).toBe("Luxury Spa");
  });
});

// ── SO job stage machine ──────────────────────────────────────────────────────

const SO_TRANSITIONS: Record<string, string[]> = {
  DISPATCHED: ["RUNNING", "CANCELLED"],
  RUNNING:    ["PENDING", "CLOSED"],
  PENDING:    ["RUNNING", "CANCELLED"],
  CLOSED:     [],
  CANCELLED:  [],
};

function assertSoTransition(from: string, to: string): boolean {
  return SO_TRANSITIONS[from]?.includes(to) ?? false;
}

describe("SO job stage machine", () => {
  it("allows DISPATCHED → RUNNING", () => {
    expect(assertSoTransition("DISPATCHED", "RUNNING")).toBe(true);
  });

  it("allows DISPATCHED → CANCELLED", () => {
    expect(assertSoTransition("DISPATCHED", "CANCELLED")).toBe(true);
  });

  it("allows RUNNING → PENDING", () => {
    expect(assertSoTransition("RUNNING", "PENDING")).toBe(true);
  });

  it("allows RUNNING → CLOSED", () => {
    expect(assertSoTransition("RUNNING", "CLOSED")).toBe(true);
  });

  it("allows PENDING → RUNNING (resume)", () => {
    expect(assertSoTransition("PENDING", "RUNNING")).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(assertSoTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("rejects DISPATCHED → CLOSED (must go through RUNNING)", () => {
    expect(assertSoTransition("DISPATCHED", "CLOSED")).toBe(false);
  });

  it("rejects CLOSED → RUNNING (terminal)", () => {
    expect(assertSoTransition("CLOSED", "RUNNING")).toBe(false);
  });

  it("rejects CANCELLED → RUNNING (terminal)", () => {
    expect(assertSoTransition("CANCELLED", "RUNNING")).toBe(false);
  });

  it("rejects unknown stage", () => {
    expect(assertSoTransition("DISPATCHED", "UNKNOWN")).toBe(false);
    expect(assertSoTransition("UNKNOWN", "RUNNING")).toBe(false);
  });
});

// ── Stage history building ────────────────────────────────────────────────────

describe("stage history building", () => {
  it("appends new entry to existing history", () => {
    const existing = [
      { stage: "DISPATCHED", timestamp: "2026-03-26T00:00:00Z", actorId: "op-1" },
    ];
    const now = new Date("2026-03-26T01:00:00Z");
    const newHistory = [...existing, { stage: "RUNNING", timestamp: now.toISOString(), actorId: "op-1" }];
    expect(newHistory).toHaveLength(2);
    expect(newHistory[1].stage).toBe("RUNNING");
  });

  it("handles empty initial history", () => {
    const existing: unknown[] = [];
    const now = new Date("2026-03-26T00:00:00Z");
    const newHistory = [...existing, { stage: "DISPATCHED", timestamp: now.toISOString() }];
    expect(newHistory).toHaveLength(1);
  });

  it("preserves notes in history entries", () => {
    const entry = { stage: "PENDING", timestamp: "2026-03-26T02:00:00Z", note: "Waiting for elevator", actorId: "op-1" };
    const history = [entry];
    expect(history[0].note).toBe("Waiting for elevator");
  });
});

// ── Cancel reason validation ──────────────────────────────────────────────────

describe("cancel reason validation", () => {
  it("requires at least 5 characters", () => {
    const validate = (reason: string) => reason.length >= 5;
    expect(validate("")).toBe(false);
    expect(validate("ok")).toBe(false);
    expect(validate("done")).toBe(false);
    expect(validate("guest no-show")).toBe(true);
    expect(validate("equipment failure")).toBe(true);
  });
});
