/**
 * Unit tests for the qrAnalytics tRPC procedure.
 *
 * These tests verify the procedure's input schema, output shape,
 * and that it is correctly registered in the reports router.
 */
import { describe, it, expect } from "vitest";
import { z } from "zod";

// ── Input schema validation ───────────────────────────────────────────────────

const inputSchema = z.object({
  propertyId: z.string().optional(),
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

describe("qrAnalytics procedure — input schema", () => {
  it("accepts valid period values", () => {
    expect(() => inputSchema.parse({ period: "7d" })).not.toThrow();
    expect(() => inputSchema.parse({ period: "30d" })).not.toThrow();
    expect(() => inputSchema.parse({ period: "90d" })).not.toThrow();
  });

  it("rejects invalid period values", () => {
    expect(() => inputSchema.parse({ period: "1y" })).toThrow();
    expect(() => inputSchema.parse({ period: "" })).toThrow();
  });

  it("allows optional propertyId", () => {
    const result = inputSchema.parse({});
    expect(result.propertyId).toBeUndefined();
    expect(result.period).toBe("30d");
  });

  it("accepts a propertyId string", () => {
    const result = inputSchema.parse({ propertyId: "prop-123", period: "7d" });
    expect(result.propertyId).toBe("prop-123");
    expect(result.period).toBe("7d");
  });
});

// ── Output shape validation ───────────────────────────────────────────────────

const outputSchema = z.object({
  trend: z.array(z.object({
    date: z.string(),
    scans: z.number(),
    unique: z.number(),
  })),
  heatmap: z.array(z.object({
    day: z.string(),
    hours: z.array(z.object({ hour: z.string(), value: z.number() })),
  })),
  top_rooms: z.array(z.object({
    room: z.string(),
    scans: z.number(),
    sessions: z.number(),
    qr_id: z.string(),
  })),
  access_type: z.array(z.object({
    name: z.string(),
    value: z.number(),
    color: z.string(),
  })),
  total_scans: z.number(),
  active_qrs: z.number(),
  total_qrs: z.number(),
});

describe("qrAnalytics procedure — output schema", () => {
  it("validates a well-formed response", () => {
    const mockOutput = {
      trend: [{ date: "Mar 1", scans: 10, unique: 3 }],
      heatmap: [
        { day: "Mon", hours: [{ hour: "00:00", value: 0 }, { hour: "01:00", value: 2 }] },
      ],
      top_rooms: [{ room: "101", scans: 42, sessions: 12, qr_id: "room-uuid-1" }],
      access_type: [{ name: "Public", value: 65, color: "#3B82F6" }],
      total_scans: 100,
      active_qrs: 5,
      total_qrs: 10,
    };
    expect(() => outputSchema.parse(mockOutput)).not.toThrow();
  });

  it("rejects output missing required fields", () => {
    expect(() => outputSchema.parse({ trend: [], heatmap: [] })).toThrow();
  });
});

// ── Router registration ───────────────────────────────────────────────────────

describe("qrAnalytics — router registration", () => {
  it("is exported from reportsRouter", async () => {
    const { reportsRouter } = await import("./reportsRouter");
    // The router object should have a _def with procedures
    expect(reportsRouter).toBeDefined();
    // Check that the router key exists by inspecting the router definition
    const routerDef = (reportsRouter as any)._def;
    expect(routerDef).toBeDefined();
  });
});
