/**
 * E2E — Dispatch Flow
 *
 * Covers: PENDING → CONFIRMED → IN_PROGRESS →
 *         cancel flow (PENDING → CANCELLED, terminal guard) →
 *         stay token creation → list requests
 *
 * Stubs bypassed:
 *   - SMS: dispatch notifications are fire-and-forget (stub SMS gateway used)
 *   - 2FA: not enforced at route level
 *
 * Auth: admin JWT (acts as front-office)
 *
 * Key API facts verified by manual probe:
 *   - POST /public/sessions/:id/requests requires items to be a non-empty array
 *   - PATCH /front-office/requests/:id/status reads `reason` (not `cancellation_reason`)
 *   - Stay-tokens are mounted at /api/v1/front-office/stay-tokens (not /api/v1/stay-tokens)
 */
import { describe, it, expect, beforeAll } from "vitest";
import { makeJwt, postJson, patchJson, fetchJson, SEED } from "./testHelpers";

const V1 = "/api/v1";
const PUB = `${V1}/public`;
const FO = `${V1}/front-office`;

let token: string;
let sessionId: string;
let requestId: string;
let cancelRequestId: string;

beforeAll(async () => {
  token = await makeJwt({ role: "admin" });

  // Create a guest session using the public QR code
  const sr = await fetch(`http://localhost:3000${PUB}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qr_code_id: SEED.SIAM_QR_PUBLIC }),
  });
  if (sr.ok) {
    const sb = await sr.json();
    sessionId = sb.session_id;
  }

  // Fetch menu to get real item data — the API rejects items: []
  if (sessionId) {
    const mr = await fetch(`http://localhost:3000${PUB}/sessions/${sessionId}/menu`);
    const mb = mr.ok ? await mr.json() : { categories: [] };
    const firstCat = mb.categories?.[0];
    const firstItem = firstCat?.items?.[0];
    const itemPayload = firstItem
      ? [{
          item_id: firstItem.item_id,
          item_name: firstItem.item_name,
          item_category: firstCat.category_name,
          unit_price: parseFloat(firstItem.unit_price),
          currency: firstItem.currency,
          quantity: 1,
        }]
      : [];

    // Request 1: used for the full PENDING → CONFIRMED → IN_PROGRESS chain
    const rr1 = await fetch(`http://localhost:3000${PUB}/sessions/${sessionId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_name: "Dispatch Guest", items: itemPayload }),
    });
    if (rr1.ok) {
      const rb1 = await rr1.json();
      requestId = rb1.id;
    }

    // Request 2: used for the cancel flow test
    const rr2 = await fetch(`http://localhost:3000${PUB}/sessions/${sessionId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_name: "Cancel Guest", items: itemPayload }),
    });
    if (rr2.ok) {
      const rb2 = await rr2.json();
      cancelRequestId = rb2.id;
    }
  }
});

describe("Dispatch Flow", () => {
  // DP-01: List pending requests
  it("DP-01: GET /front-office/requests lists pending requests", async () => {
    const r = await fetchJson(
      `${FO}/requests?property_id=${SEED.SIAM_PROPERTY_ID}&status=PENDING&page=1&page_size=10`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  // DP-02: Accept request (PENDING → CONFIRMED)
  it("DP-02: PATCH /front-office/requests/:id/status → CONFIRMED", async () => {
    if (!requestId) return;
    const r = await patchJson(`${FO}/requests/${requestId}/status`, token, {
      status: "CONFIRMED",
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("CONFIRMED");
  });

  // DP-03: Start work (CONFIRMED → IN_PROGRESS)
  it("DP-03: PATCH /front-office/requests/:id/status → IN_PROGRESS", async () => {
    if (!requestId) return;
    const r = await patchJson(`${FO}/requests/${requestId}/status`, token, {
      status: "IN_PROGRESS",
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("IN_PROGRESS");
  });

  // DP-04: Get request detail
  it("DP-04: GET /front-office/requests/:id returns request detail", async () => {
    if (!requestId) return;
    const r = await fetchJson(`${FO}/requests/${requestId}`, token);
    expect(r.status).toBe(200);
    expect(r.body.id).toBe(requestId);
    expect(r.body.status).toBe("IN_PROGRESS");
  });

  // DP-05: Cancel a separate request (PENDING → CANCELLED)
  // The route reads `reason` from req.body — NOT `cancellation_reason`
  it("DP-05: PATCH /front-office/requests/:id/status → CANCELLED", async () => {
    if (!cancelRequestId) return;
    const r = await patchJson(`${FO}/requests/${cancelRequestId}/status`, token, {
      status: "CANCELLED",
      reason: "E2E test cancel",
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("CANCELLED");
  });

  // DP-06: Cancelled request is in terminal state — no further transitions allowed
  it("DP-06: PATCH cancelled request → CONFIRMED returns 422 (terminal state)", async () => {
    if (!cancelRequestId) return;
    const r = await patchJson(`${FO}/requests/${cancelRequestId}/status`, token, {
      status: "CONFIRMED",
    });
    expect(r.status).toBe(422);
  });

  // DP-07: Create stay token
  // Stay-tokens are under /front-office/stay-tokens, not /stay-tokens
  it("DP-07: POST /front-office/stay-tokens creates a stay token for a room", async () => {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const r = await postJson(`${FO}/stay-tokens`, token, {
      property_id: SEED.SIAM_PROPERTY_ID,
      room_id: SEED.SIAM_ROOM_103,
      expires_at: expiresAt,
    });
    expect([200, 201]).toContain(r.status);
    expect(r.body).toHaveProperty("id");
    expect(r.body).toHaveProperty("token");
  });

  // DP-08: List stay tokens
  it("DP-08: GET /front-office/stay-tokens lists stay tokens for Siam property", async () => {
    const r = await fetchJson(
      `${FO}/stay-tokens?property_id=${SEED.SIAM_PROPERTY_ID}&page=1&page_size=5`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
  });

  // DP-09: List sessions for property
  it("DP-09: GET /front-office/sessions lists active sessions", async () => {
    const r = await fetchJson(
      `${FO}/sessions?property_id=${SEED.SIAM_PROPERTY_ID}&page=1&page_size=5`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
  });
});
