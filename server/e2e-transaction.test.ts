/**
 * E2E — Transaction Flow (Guest-facing)
 *
 * Covers: QR scan → session creation → session validate → menu fetch →
 *         service request submission → front-office status transitions →
 *         invalid transition rejection
 *
 * Stubs bypassed:
 *   - SMS: not triggered in this flow
 *   - Payment: not triggered (service request, not payment order)
 *   - 2FA: not enforced at route level
 *
 * Auth: guest endpoints are public; FO endpoints use admin JWT
 *
 * Key API facts verified by manual probe:
 *   - POST /public/sessions returns status "ACTIVE" (uppercase)
 *   - POST /public/sessions/:id/requests requires items to be a non-empty array
 */
import { describe, it, expect, beforeAll } from "vitest";
import { makeJwt, patchJson, fetchJson, SEED } from "./testHelpers";

const V1 = "/api/v1";
const PUB = `${V1}/public`;

let foToken: string;
let sessionId: string;
let requestId: string;
let requestNumber: string;
// Menu item captured in TX-04 and reused in TX-05
let menuItemPayload: object[] = [];

beforeAll(async () => {
  foToken = await makeJwt({ role: "admin" });
});

describe("Transaction Flow", () => {
  // TX-01: Create guest session from QR scan
  it("TX-01: POST /public/sessions creates a guest session", async () => {
    const r = await fetch(`http://localhost:3000${PUB}/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qr_code_id: SEED.SIAM_QR_PUBLIC,
        guest_name: "E2E Guest",
        font_size: "M",
      }),
    });
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body).toHaveProperty("session_id");
    // API returns uppercase status
    expect(body.status).toBe("ACTIVE");
    sessionId = body.session_id;
  });

  // TX-02: Validate session
  it("TX-02: GET /public/sessions/:id/validate confirms session is active", async () => {
    if (!sessionId) return;
    const r = await fetch(
      `http://localhost:3000${PUB}/sessions/${sessionId}/validate`
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.valid).toBe(true);
  });

  // TX-03: Get session details
  it("TX-03: GET /public/sessions/:id returns session details", async () => {
    if (!sessionId) return;
    const r = await fetch(`http://localhost:3000${PUB}/sessions/${sessionId}`);
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.session_id).toBe(sessionId);
    expect(body.status).toBe("ACTIVE");
  });

  // TX-04: Fetch service menu — also captures a real item for TX-05
  it("TX-04: GET /public/sessions/:id/menu returns service menu", async () => {
    if (!sessionId) return;
    const r = await fetch(
      `http://localhost:3000${PUB}/sessions/${sessionId}/menu`
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body).toHaveProperty("categories");
    expect(body).toHaveProperty("total_items");
    expect(typeof body.total_items).toBe("number");

    // Capture first available item for use in TX-05
    const firstCat = body.categories?.[0];
    const firstItem = firstCat?.items?.[0];
    if (firstItem) {
      menuItemPayload = [{
        item_id: firstItem.item_id,
        item_name: firstItem.item_name,
        item_category: firstCat.category_name,
        unit_price: parseFloat(firstItem.unit_price),
        currency: firstItem.currency,
        quantity: 1,
      }];
    }
  });

  // TX-05: Submit service request with a real menu item
  // The API rejects items: [] — at least one item is required
  it("TX-05: POST /public/sessions/:id/requests submits a service request", async () => {
    if (!sessionId) return;
    expect(menuItemPayload.length).toBeGreaterThan(0);
    const r = await fetch(
      `http://localhost:3000${PUB}/sessions/${sessionId}/requests`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: "E2E Guest",
          guest_notes: "E2E test request — please ignore",
          items: menuItemPayload,
        }),
      }
    );
    expect(r.status).toBe(201);
    const body = await r.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("requestNumber");
    expect(body.status).toBe("PENDING");
    requestId = body.id;
    requestNumber = body.requestNumber;
  });

  // TX-06: Track request by number (public endpoint)
  it("TX-06: GET /public/requests/:number tracks request by number", async () => {
    if (!requestNumber) return;
    const r = await fetch(
      `http://localhost:3000${PUB}/requests/${requestNumber}`
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.request_number).toBe(requestNumber);
    expect(body.status).toBe("PENDING");
  });

  // TX-07: Front-office confirms request (PENDING → CONFIRMED)
  it("TX-07: PATCH /front-office/requests/:id/status transitions to CONFIRMED", async () => {
    if (!requestId) return;
    const r = await patchJson(
      `${V1}/front-office/requests/${requestId}/status`,
      foToken,
      { status: "CONFIRMED" }
    );
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("CONFIRMED");
  });

  // TX-08: Front-office starts work (CONFIRMED → IN_PROGRESS)
  it("TX-08: PATCH /front-office/requests/:id/status transitions to IN_PROGRESS", async () => {
    if (!requestId) return;
    const r = await patchJson(
      `${V1}/front-office/requests/${requestId}/status`,
      foToken,
      { status: "IN_PROGRESS" }
    );
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("IN_PROGRESS");
  });

  // TX-09: Invalid transition is rejected (IN_PROGRESS → PENDING not allowed)
  it("TX-09: PATCH invalid transition returns 422", async () => {
    if (!requestId) return;
    const r = await patchJson(
      `${V1}/front-office/requests/${requestId}/status`,
      foToken,
      { status: "PENDING" }
    );
    expect(r.status).toBe(422);
  });

  // TX-10: List sessions for property
  it("TX-10: GET /front-office/sessions lists sessions for Siam property", async () => {
    const r = await fetchJson(
      `${V1}/front-office/sessions?property_id=${SEED.SIAM_PROPERTY_ID}&page=1&page_size=5`,
      foToken
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
  });
});
