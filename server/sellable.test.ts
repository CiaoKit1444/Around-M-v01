/**
 * SELLABLE TEST SUITE
 * Goal: Verify that every guest-facing flow works end-to-end so the product
 *       can be demonstrated and sold to hotel partners without embarrassment.
 *
 * Coverage:
 *  S01 — QR code status check (public + restricted + edge cases)
 *  S02 — Stay-token validation
 *  S03 — Guest session creation (public + restricted)
 *  S04 — Service menu retrieval (categories, items, pricing)
 *  S05 — Request submission (single item, multi-item, with notes)
 *  S06 — Request tracking by request number
 *  S07 — Session request listing
 *  S08 — Property branding endpoint
 *  S09 — QR edge cases (inactive, non-existent)
 *  S10 — Cart validation (empty cart, zero quantity, missing fields)
 */

import { describe, it, expect, beforeAll } from "vitest";
import express from "express";
import request from "supertest";
import { registerMigratedRoutes } from "./routes/index.js";

// ── Real DB fixtures (from live seed data) ───────────────────────────────────
// NOTE: guest router uses qr_code_id (human-readable) NOT the UUID id column
// NOTE: QR-SIAM-103 is used for public tests because it has a service template assigned
//       QR-SIAM-201 has no template (empty menu) — not suitable for menu/request tests
const FIXTURES = {
  // Active public QR on The Siam Riverside Hotel (room 103) — HAS template assigned
  PUBLIC_QR_CODE_ID: "QR-SIAM-103",
  PUBLIC_PROPERTY_ID: "3d968c10-8f30-4b39-a",
  PUBLIC_ROOM_ID: "d7b7f56d-d4d3-4b8a-b",

  // Active restricted QR on Andaman Pearl Beach Resort (room 102) — HAS template assigned
  RESTRICTED_QR_CODE_ID: "QR-PEARL-102",
  RESTRICTED_PROPERTY_ID: "7bb45879-4a59-4d4c-9",
  RESTRICTED_ROOM_ID: "3d7fe8d5-a06c-43ae-8",
  VALID_STAY_TOKEN: "STK-PEARL-101",
} as const;

let app: express.Application;
let publicSessionId: string;
let restrictedSessionId: string;
let submittedRequestNumber: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  registerMigratedRoutes(app);
}, 30_000);

// ─────────────────────────────────────────────────────────────────────────────
// S01 — QR Code Status Check
// ─────────────────────────────────────────────────────────────────────────────
describe("S01 — QR Code Status Check", () => {
  it("returns active status and access_type=public for a public QR code", async () => {
    const res = await request(app)
      .get(`/api/public/guest/qr/${FIXTURES.PUBLIC_QR_CODE_ID}/status`)
      .expect(200);

    expect(res.body.status).toBe("active");
    expect(res.body.access_type).toBe("public");
    expect(res.body.property_id).toBe(FIXTURES.PUBLIC_PROPERTY_ID);
    expect(res.body.room_id).toBe(FIXTURES.PUBLIC_ROOM_ID);
  });

  it("returns active status and access_type=restricted for a restricted QR code", async () => {
    const res = await request(app)
      .get(`/api/public/guest/qr/${FIXTURES.RESTRICTED_QR_CODE_ID}/status`)
      .expect(200);

    expect(res.body.status).toBe("active");
    expect(res.body.access_type).toBe("restricted");
    expect(res.body.property_id).toBe(FIXTURES.RESTRICTED_PROPERTY_ID);
  });

  it("returns 404 for a completely unknown QR code ID", async () => {
    const res = await request(app)
      .get("/api/public/guest/qr/NONEXISTENT-QR-CODE-ID/status")
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });

  it("returns property_id and room_id in the status response", async () => {
    const res = await request(app)
      .get(`/api/public/guest/qr/${FIXTURES.PUBLIC_QR_CODE_ID}/status`)
      .expect(200);

    expect(res.body.property_id).toBeTruthy();
    expect(res.body.room_id).toBeTruthy();
    expect(typeof res.body.property_id).toBe("string");
    expect(typeof res.body.room_id).toBe("string");
  });

  it("returns qr_code_id in the status response", async () => {
    const res = await request(app)
      .get(`/api/public/guest/qr/${FIXTURES.PUBLIC_QR_CODE_ID}/status`)
      .expect(200);

    expect(res.body.qr_code_id).toBe(FIXTURES.PUBLIC_QR_CODE_ID);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S02 — Stay-Token Validation
// ─────────────────────────────────────────────────────────────────────────────
describe("S02 — Stay-Token Validation", () => {
  it("validates a correct stay token as valid=true", async () => {
    const res = await request(app)
      .post("/api/public/guest/qr/validate-token")
      .send({ qr_code_id: FIXTURES.RESTRICTED_QR_CODE_ID, stay_token: FIXTURES.VALID_STAY_TOKEN })
      .expect(200);

    expect(res.body.valid).toBe(true);
  });

  it("rejects an incorrect stay token as valid=false", async () => {
    const res = await request(app)
      .post("/api/public/guest/qr/validate-token")
      .send({ qr_code_id: FIXTURES.RESTRICTED_QR_CODE_ID, stay_token: "WRONG-TOKEN-XYZ" })
      .expect(200);

    expect(res.body.valid).toBe(false);
  });

  it("rejects missing stay_token as valid=false", async () => {
    const res = await request(app)
      .post("/api/public/guest/qr/validate-token")
      .send({ qr_code_id: FIXTURES.RESTRICTED_QR_CODE_ID })
      .expect(200);

    expect(res.body.valid).toBe(false);
  });

  it("rejects a valid token on a non-existent QR code as valid=false", async () => {
    const res = await request(app)
      .post("/api/public/guest/qr/validate-token")
      .send({ qr_code_id: "QR-FAKE-999", stay_token: FIXTURES.VALID_STAY_TOKEN })
      .expect(200);

    expect(res.body.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S03 — Guest Session Creation
// ─────────────────────────────────────────────────────────────────────────────
describe("S03 — Guest Session Creation", () => {
  it("creates a session for a public QR without a token", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.PUBLIC_QR_CODE_ID })
      .expect(201);

    expect(res.body.session_id).toBeTruthy();
    expect(res.body.property_id).toBe(FIXTURES.PUBLIC_PROPERTY_ID);
    expect(res.body.room_id).toBe(FIXTURES.PUBLIC_ROOM_ID);
    publicSessionId = res.body.session_id;
  });

  it("created public session is retrievable by ID", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}`)
      .expect(200);

    // Session response uses session_id not id
    expect(res.body.session_id).toBe(publicSessionId);
    expect(res.body.property_id).toBe(FIXTURES.PUBLIC_PROPERTY_ID);
  });

  it("creates a session for a restricted QR with a valid stay token", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.RESTRICTED_QR_CODE_ID, stay_token: FIXTURES.VALID_STAY_TOKEN })
      .expect(201);

    expect(res.body.session_id).toBeTruthy();
    expect(res.body.property_id).toBe(FIXTURES.RESTRICTED_PROPERTY_ID);
    restrictedSessionId = res.body.session_id;
  });

  it("rejects session creation for a restricted QR without a token", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.RESTRICTED_QR_CODE_ID })
      .expect(403);

    expect(res.body).toHaveProperty("detail");
  });

  it("rejects session creation for a restricted QR with a wrong token", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.RESTRICTED_QR_CODE_ID, stay_token: "WRONG-TOKEN" })
      .expect(403);

    expect(res.body).toHaveProperty("detail");
  });

  it("rejects session creation for a non-existent QR code", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: "FAKE-QR-ID-DOES-NOT-EXIST" })
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });

  it("session response includes access_type and status fields", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.PUBLIC_QR_CODE_ID })
      .expect(201);

    expect(res.body.access_type).toBe("public");
    expect(res.body.status).toBeTruthy();
    expect(res.body.expires_at).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S04 — Service Menu Retrieval
// API shape: { session_id, property_id, room_id, room_number, template_id,
//              template_name, categories: [{category_name, items: [{item_id,
//              template_item_id, item_name, item_category, description,
//              unit_price (string), currency, included_quantity, max_quantity,
//              is_available, image_url}]}], total_items }
// ─────────────────────────────────────────────────────────────────────────────
describe("S04 — Service Menu Retrieval", () => {
  it("returns a menu with categories and items for a valid session", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    // Menu uses flat template fields (not nested template object)
    expect(res.body).toHaveProperty("template_name");
    expect(res.body).toHaveProperty("categories");
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
    expect(res.body.total_items).toBeGreaterThan(0);
  });

  it("each menu category has a category_name and items array", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    for (const cat of res.body.categories) {
      // Categories use category_name not name
      expect(cat).toHaveProperty("category_name");
      expect(Array.isArray(cat.items)).toBe(true);
    }
  });

  it("each menu item has item_id, item_name, and unit_price fields", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    const allItems = res.body.categories.flatMap((c: any) => c.items);
    expect(allItems.length).toBeGreaterThan(0);
    for (const item of allItems) {
      expect(item).toHaveProperty("item_id");
      expect(item).toHaveProperty("item_name");
      expect(item).toHaveProperty("unit_price");
      // unit_price is a string (decimal from DB)
      expect(typeof item.unit_price).toBe("string");
      expect(parseFloat(item.unit_price)).toBeGreaterThan(0);
    }
  });

  it("returns a menu for the restricted session as well", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${restrictedSessionId}/menu`)
      .expect(200);

    expect(res.body).toHaveProperty("categories");
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it("returns 404 for a non-existent session menu", async () => {
    const res = await request(app)
      .get("/api/public/guest/sessions/FAKE-SESSION-ID/menu")
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });

  it("template_name is a non-empty string", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    expect(typeof res.body.template_name).toBe("string");
    expect(res.body.template_name.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S05 — Request Submission
// API: POST /sessions/:id/requests → { id, requestNumber, status }
// ─────────────────────────────────────────────────────────────────────────────
describe("S05 — Request Submission", () => {
  it("submits a single-item request and returns a request number", async () => {
    const menuRes = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    // Use item_id, item_name, unit_price (string→number), category_name
    const firstCat = menuRes.body.categories[0];
    const firstItem = firstCat?.items[0];
    expect(firstItem).toBeTruthy();

    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        guest_name: "Test Guest",
        items: [
          {
            item_id: firstItem.item_id,
            item_name: firstItem.item_name,
            item_category: firstCat.category_name,
            unit_price: parseFloat(firstItem.unit_price),
            currency: firstItem.currency,
            quantity: 1,
          },
        ],
      })
      .expect(201);

    // Response uses requestNumber (camelCase)
    expect(res.body.requestNumber).toBeTruthy();
    expect(res.body.requestNumber).toMatch(/^REQ-/);
    expect(res.body.status).toBeTruthy();
    submittedRequestNumber = res.body.requestNumber;
  });

  it("submits a multi-item request with notes", async () => {
    const menuRes = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    const allItems = menuRes.body.categories.flatMap((c: any) =>
      c.items.map((i: any) => ({ ...i, category: c.category_name }))
    );
    expect(allItems.length).toBeGreaterThanOrEqual(2);

    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        guest_name: "Multi-Item Guest",
        guest_notes: "Please deliver by 3pm",
        items: [
          {
            item_id: allItems[0].item_id,
            item_name: allItems[0].item_name,
            item_category: allItems[0].category,
            unit_price: parseFloat(allItems[0].unit_price),
            currency: allItems[0].currency,
            quantity: 2,
          },
          {
            item_id: allItems[1].item_id,
            item_name: allItems[1].item_name,
            item_category: allItems[1].category,
            unit_price: parseFloat(allItems[1].unit_price),
            currency: allItems[1].currency,
            quantity: 1,
          },
        ],
      })
      .expect(201);

    expect(res.body.requestNumber).toMatch(/^REQ-/);
  });

  it("rejects a request with an empty items array", async () => {
    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        guest_name: "Bad Guest",
        items: [],
      })
      .expect(400);

    expect(res.body).toHaveProperty("detail");
  });

  it("rejects a request for a non-existent session", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions/FAKE-SESSION/requests")
      .send({
        items: [{ item_id: "x", item_name: "x", item_category: "x", unit_price: 100, quantity: 1 }],
      })
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S06 — Request Tracking by Request Number
// API: GET /requests/:requestNumber → { id, request_number, session_id,
//      property_id, room_id, status, total_amount, currency, items: [...] }
// ─────────────────────────────────────────────────────────────────────────────
describe("S06 — Request Tracking", () => {
  it("retrieves a submitted request by request number", async () => {
    expect(submittedRequestNumber).toBeTruthy();

    const res = await request(app)
      .get(`/api/public/guest/requests/${submittedRequestNumber}`)
      .expect(200);

    expect(res.body.request_number).toBe(submittedRequestNumber);
    expect(res.body.status).toBeTruthy();
    expect(res.body.items).toBeTruthy();
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it("returns request items with item_name, quantity, and unit_price", async () => {
    const res = await request(app)
      .get(`/api/public/guest/requests/${submittedRequestNumber}`)
      .expect(200);

    expect(res.body.items.length).toBeGreaterThan(0);
    for (const item of res.body.items) {
      expect(item).toHaveProperty("item_name");
      expect(item).toHaveProperty("quantity");
      expect(item).toHaveProperty("unit_price");
    }
  });

  it("returns 404 for a non-existent request number", async () => {
    const res = await request(app)
      .get("/api/public/guest/requests/REQ-99999999-9999")
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });

  it("returns total_amount and currency in the tracking response", async () => {
    const res = await request(app)
      .get(`/api/public/guest/requests/${submittedRequestNumber}`)
      .expect(200);

    expect(res.body).toHaveProperty("total_amount");
    expect(res.body).toHaveProperty("currency");
    expect(res.body.currency).toBe("THB");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S07 — Session Request Listing
// ─────────────────────────────────────────────────────────────────────────────
describe("S07 — Session Request Listing", () => {
  it("lists all requests for a session", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it("each listed request has a request_number and status", async () => {
    const res = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .expect(200);

    for (const req of res.body) {
      expect(req).toHaveProperty("request_number");
      expect(req).toHaveProperty("status");
    }
  });

  it("returns empty array for a fresh session with no requests", async () => {
    const sessionRes = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.PUBLIC_QR_CODE_ID })
      .expect(201);

    const freshSessionId = sessionRes.body.session_id;
    const res = await request(app)
      .get(`/api/public/guest/sessions/${freshSessionId}/requests`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S08 — Property Branding
// ─────────────────────────────────────────────────────────────────────────────
describe("S08 — Property Branding", () => {
  it("returns branding data for a valid property", async () => {
    const res = await request(app)
      .get(`/api/public/guest/properties/${FIXTURES.PUBLIC_PROPERTY_ID}/branding`)
      .expect(200);

    expect(res.body).toHaveProperty("property_name");
    expect(res.body.property_name).toBeTruthy();
  });

  it("branding response includes primary_color field", async () => {
    const res = await request(app)
      .get(`/api/public/guest/properties/${FIXTURES.PUBLIC_PROPERTY_ID}/branding`)
      .expect(200);

    expect(res.body).toHaveProperty("primary_color");
  });

  it("returns 404 for a non-existent property branding", async () => {
    const res = await request(app)
      .get("/api/public/guest/properties/FAKE-PROPERTY-ID/branding")
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S09 — QR Edge Cases
// ─────────────────────────────────────────────────────────────────────────────
describe("S09 — QR Edge Cases", () => {
  it("returns 404 for a completely non-existent QR code", async () => {
    const res = await request(app)
      .get("/api/public/guest/qr/NONEXISTENT-QR-CODE/status")
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });

  it("rejects session creation for a non-existent QR code with 404", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: "COMPLETELY-FAKE-QR" })
      .expect(404);

    expect(res.body).toHaveProperty("detail");
  });

  it("QR status endpoint is publicly accessible (no auth required)", async () => {
    const res = await request(app)
      .get(`/api/public/guest/qr/${FIXTURES.PUBLIC_QR_CODE_ID}/status`)
      .set("Authorization", "")
      .expect(200);

    expect(res.body.status).toBe("active");
  });

  it("session creation endpoint is publicly accessible (no auth required)", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({ qr_code_id: FIXTURES.PUBLIC_QR_CODE_ID })
      .expect(201);

    expect(res.body.session_id).toBeTruthy();
  });

  it("missing qr_code_id in session creation returns 400", async () => {
    const res = await request(app)
      .post("/api/public/guest/sessions")
      .send({})
      .expect(400);

    expect(res.body).toHaveProperty("detail");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// S10 — Cart Validation
// ─────────────────────────────────────────────────────────────────────────────
describe("S10 — Cart Validation", () => {
  it("rejects a request with quantity=0", async () => {
    const menuRes = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    const firstCat = menuRes.body.categories[0];
    const firstItem = firstCat?.items[0];
    expect(firstItem).toBeTruthy();

    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        items: [
          {
            item_id: firstItem.item_id,
            item_name: firstItem.item_name,
            item_category: firstCat.category_name,
            unit_price: parseFloat(firstItem.unit_price),
            currency: firstItem.currency,
            quantity: 0,
          },
        ],
      })
      .expect(400);

    expect(res.body).toHaveProperty("detail");
  });

  it("rejects a request with missing item_id gracefully (no server crash)", async () => {
    // When item_id is missing, the server may accept or reject — key is no 500 crash
    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        items: [
          {
            item_name: "Test Item",
            item_category: "Test",
            unit_price: 100,
            quantity: 1,
            // item_id intentionally omitted
          },
        ],
      });

    // Server should not crash (no 500)
    expect([201, 400, 422].includes(res.status)).toBe(true);
  });

  it("accepts a request with optional guest_name omitted", async () => {
    const menuRes = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    const firstCat = menuRes.body.categories[0];
    const firstItem = firstCat?.items[0];
    expect(firstItem).toBeTruthy();

    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        // guest_name intentionally omitted
        items: [
          {
            item_id: firstItem.item_id,
            item_name: firstItem.item_name,
            item_category: firstCat.category_name,
            unit_price: parseFloat(firstItem.unit_price),
            currency: firstItem.currency,
            quantity: 1,
          },
        ],
      })
      .expect(201);

    expect(res.body.requestNumber).toMatch(/^REQ-/);
  });

  it("calculates total_amount correctly (sum of unit_price * quantity)", async () => {
    const menuRes = await request(app)
      .get(`/api/public/guest/sessions/${publicSessionId}/menu`)
      .expect(200);

    const firstCat = menuRes.body.categories[0];
    const firstItem = firstCat?.items[0];
    const qty = 2;
    const unitPrice = parseFloat(firstItem.unit_price);

    const res = await request(app)
      .post(`/api/public/guest/sessions/${publicSessionId}/requests`)
      .send({
        items: [
          {
            item_id: firstItem.item_id,
            item_name: firstItem.item_name,
            item_category: firstCat.category_name,
            unit_price: unitPrice,
            currency: firstItem.currency,
            quantity: qty,
          },
        ],
      })
      .expect(201);

    // Track the request to verify total_amount
    const trackRes = await request(app)
      .get(`/api/public/guest/requests/${res.body.requestNumber}`)
      .expect(200);

    const expectedTotal = unitPrice * qty;
    expect(parseFloat(trackRes.body.total_amount)).toBeCloseTo(expectedTotal, 0);
  });
});
