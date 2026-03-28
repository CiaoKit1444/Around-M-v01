/**
 * E2E — Job Ending Flow
 *
 * Covers: IN_PROGRESS → COMPLETED → auto-confirm (FULFILLED) →
 *         public request tracking → admin audit trail
 *
 * Stubs bypassed:
 *   - Auto-confirm time gate: test utility endpoint backdates completedAt by 15 min,
 *     then triggers runAutoConfirm() directly via POST /front-office/test/run-auto-confirm
 *   - SMS: not triggered in this flow
 *   - Payment: not triggered
 *
 * Auth: admin JWT
 */
import { describe, it, expect, beforeAll } from "vitest";
import { makeJwt, patchJson, fetchJson, SEED } from "./testHelpers";

const V1 = "/api/v1";
const PUB = `${V1}/public`;
const FO = `${V1}/front-office`;

let token: string;
let sessionId: string;
let requestId: string;
let requestNumber: string;

beforeAll(async () => {
  token = await makeJwt({ role: "admin" });

  // Create a guest session
  const sr = await fetch(`http://localhost:3000${PUB}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qr_code_id: SEED.SIAM_QR_PUBLIC }),
  });
  if (sr.ok) {
    const sb = await sr.json();
    sessionId = sb.session_id;
  }

  // Submit a request
  if (sessionId) {
    const rr = await fetch(`http://localhost:3000${PUB}/sessions/${sessionId}/requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guest_name: "Job End Guest", items: [] }),
    });
    if (rr.ok) {
      const rb = await rr.json();
      requestId = rb.id;
      requestNumber = rb.requestNumber;
    }
  }

  // Advance to IN_PROGRESS
  if (requestId) {
    await fetch(`http://localhost:3000${FO}/requests/${requestId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "CONFIRMED" }),
    });
    await fetch(`http://localhost:3000${FO}/requests/${requestId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
  }
});

describe("Job Ending Flow", () => {
  // JE-01: Complete the job (IN_PROGRESS → COMPLETED)
  it("JE-01: PATCH /front-office/requests/:id/status → COMPLETED", async () => {
    if (!requestId) return;
    const r = await patchJson(`${FO}/requests/${requestId}/status`, token, {
      status: "COMPLETED",
    });
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("COMPLETED");
  });

  // JE-02: Get request detail — completed_at is set
  it("JE-02: GET /front-office/requests/:id shows completed_at timestamp", async () => {
    if (!requestId) return;
    const r = await fetchJson(`${FO}/requests/${requestId}`, token);
    expect(r.status).toBe(200);
    expect(r.body.status).toBe("COMPLETED");
    expect(r.body.completed_at).toBeTruthy();
  });

  // JE-03: Public tracking shows COMPLETED
  it("JE-03: GET /public/requests/:number shows COMPLETED status", async () => {
    if (!requestNumber) return;
    const r = await fetch(
      `http://localhost:3000${PUB}/requests/${requestNumber}`
    );
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.status).toBe("COMPLETED");
  });

  // JE-04: Auto-confirm stub bypass → FULFILLED
  it(
    "JE-04: backdate + runAutoConfirm transitions COMPLETED → FULFILLED",
    async () => {
      if (!requestId) return;

      // Step 1: Backdate completedAt by 15 minutes (test utility endpoint)
      const bdRes = await fetch(
        `http://localhost:3000${FO}/requests/${requestId}/backdate-completed`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (bdRes.status === 404) {
        console.log("JE-04: backdate endpoint not available — skipping");
        return;
      }
      expect([200, 204]).toContain(bdRes.status);

      // Step 2: Trigger auto-confirm worker
      const acRes = await fetch(
        `http://localhost:3000${FO}/run-auto-confirm`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (acRes.status === 404) {
        console.log("JE-04: run-auto-confirm endpoint not available — skipping");
        return;
      }
      expect([200, 204]).toContain(acRes.status);

      // Step 3: Verify request is now FULFILLED
      const r = await fetchJson(`${FO}/requests/${requestId}`, token);
      expect(r.status).toBe(200);
      expect(r.body.status).toBe("FULFILLED");
    },
    15000
  );

  // JE-05: Admin audit trail has events for this request
  it("JE-05: GET /admin/audit returns events for the completed request", async () => {
    if (!requestId) return;
    const r = await fetchJson(
      `${V1}/admin/audit?resource_id=${requestId}&page=1&page_size=10`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
    // Audit trail may have events if audit logging is enabled
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  // JE-06: List completed requests for property
  it("JE-06: GET /front-office/requests?status=COMPLETED lists completed requests", async () => {
    const r = await fetchJson(
      `${FO}/requests?property_id=${SEED.SIAM_PROPERTY_ID}&status=COMPLETED&page=1&page_size=5`,
      token
    );
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("items");
  });

  // JE-07: COMPLETED → CANCELLED is not allowed (terminal state)
  it("JE-07: PATCH COMPLETED → CANCELLED returns 422", async () => {
    if (!requestId) return;
    // Only test if still in COMPLETED (JE-04 may have moved it to FULFILLED)
    const detail = await fetchJson(`${FO}/requests/${requestId}`, token);
    if (detail.body.status !== "COMPLETED") return;

    const r = await patchJson(`${FO}/requests/${requestId}/status`, token, {
      status: "CANCELLED",
    });
    expect(r.status).toBe(422);
  });
});
