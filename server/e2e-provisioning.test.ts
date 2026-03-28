/**
 * E2E — Provisioning Flow
 *
 * Covers: catalog item → service template → QR code generation →
 *         template assignment to room → provider → staff position
 *
 * Stubs bypassed: none
 * Auth: admin JWT
 *
 * IMPORTANT: PR-04 assigns an E2E template (1 item) to SIAM_ROOM_103.
 * The afterAll hook restores the original seed template ("Standard Room Package", 3 items)
 * so that subsequent test files (sellable.test.ts S05) which require ≥2 items still pass.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { makeJwt, postJson, fetchJson, SEED } from "./testHelpers";
import { getDb } from "./db";
import { pepprRooms, pepprRoomTemplateAssignments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const V1 = "/api/v1";

// Original seed template for Siam room 103 — "Standard Room Package" (3 items)
const ORIGINAL_SIAM_103_TEMPLATE_ID = "adbd3e43-bf13-43dc-8";

let token: string;
let catalogItemId: string;
let templateId: string;
let providerId: string;
let positionId: string;

beforeAll(async () => {
  token = await makeJwt({ role: "admin" });
});

afterAll(async () => {
  // Restore original seed template so later test files see ≥2 menu items on QR-SIAM-103
  try {
    const db = await getDb();
    if (db) {
      await db.update(pepprRooms)
        .set({ templateId: ORIGINAL_SIAM_103_TEMPLATE_ID })
        .where(eq(pepprRooms.id, SEED.SIAM_ROOM_103));
      // Insert a new assignment record (auto-increment PK — no upsert needed)
      await db.insert(pepprRoomTemplateAssignments)
        .values({ roomId: SEED.SIAM_ROOM_103, templateId: ORIGINAL_SIAM_103_TEMPLATE_ID });
    }
  } catch {
    // Non-fatal — test isolation best-effort
  }
});

describe("Provisioning Flow", () => {
  // PR-01: Create catalog item
  it("PR-01: POST /catalog creates a new catalog item", async () => {
    const ts = Date.now();
    const r = await postJson(`${V1}/catalog`, token, {
      provider_id: SEED.SEED_PROVIDER_ID,
      name: `E2E Towel Service ${ts}`,
      sku: `E2E-SKU-${ts}`,
      category: "Housekeeping",
      price: 150,
      currency: "THB",
      unit: "session",
      description: "E2E test catalog item",
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
    catalogItemId = r.body.id;
  });

  // PR-02: Create service template
  it("PR-02: POST /templates creates a service template", async () => {
    const ts = Date.now();
    const r = await postJson(`${V1}/templates`, token, {
      name: `E2E Standard Template ${ts}`,
      tier: "standard",
      description: "E2E test template",
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
    templateId = r.body.id;
  });

  // PR-03: Add catalog item to template
  it("PR-03: POST /templates/:id/items adds catalog item to template", async () => {
    if (!templateId || !catalogItemId) return;
    const r = await postJson(`${V1}/templates/${templateId}/items`, token, {
      catalog_item_id: catalogItemId,
      sort_order: 1,
    });
    expect([200, 201]).toContain(r.status);
  });

  // PR-04: Assign template to room
  it("PR-04: POST /rooms/:id/template assigns template to Siam room 103", async () => {
    if (!templateId) return;
    const r = await postJson(`${V1}/rooms/${SEED.SIAM_ROOM_103}/template`, token, {
      template_id: templateId,
    });
    expect([200, 201]).toContain(r.status);
  });

  // PR-05: Generate QR code for room
  it("PR-05: POST /qr-codes generates a QR code for a room", async () => {
    const r = await postJson(`${V1}/qr-codes`, token, {
      property_id: SEED.SIAM_PROPERTY_ID,
      room_id: SEED.SIAM_ROOM_103,
      access_type: "public",
      label: "E2E Test QR",
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
    expect(r.body).toHaveProperty("qr_code_id");
  });

  // PR-06: List QR codes for property
  it("PR-06: GET /qr-codes lists QR codes for Siam property", async () => {
    const r = await fetchJson(
      `${V1}/qr-codes?property_id=${SEED.SIAM_PROPERTY_ID}&page=1&page_size=5`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(r.body.items.length).toBeGreaterThan(0);
  });

  // PR-07: Create provider
  it("PR-07: POST /providers creates a service provider", async () => {
    const ts = Date.now();
    const r = await postJson(`${V1}/providers`, token, {
      name: `E2E Provider ${ts}`,
      email: `e2e-provider-${ts}@test.com`,
      category: "Housekeeping",
      service_area: "Bangkok",
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
    providerId = r.body.id;
  });

  // PR-08: Create staff position
  it("PR-08: POST /staff/positions creates a staff position", async () => {
    const ts = Date.now();
    const r = await postJson(`${V1}/staff/positions`, token, {
      property_id: SEED.SIAM_PROPERTY_ID,
      title: `E2E Housekeeper ${ts}`,
      department: "Housekeeping",
    });
    expect(r.status).toBe(201);
    expect(r.body).toHaveProperty("id");
    positionId = r.body.id;
  });

  // PR-09: List staff positions
  it("PR-09: GET /staff/positions lists positions for Siam property", async () => {
    const r = await fetchJson(
      `${V1}/staff/positions?property_id=${SEED.SIAM_PROPERTY_ID}`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
  });

  // PR-10: List templates
  it("PR-10: GET /templates returns paginated template list", async () => {
    const r = await fetchJson(`${V1}/templates?page=1&page_size=5`, token);
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(r.body.items.length).toBeGreaterThan(0);
  });
});
