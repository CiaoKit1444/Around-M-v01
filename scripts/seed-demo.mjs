/**
 * seed-demo.mjs — Peppr Around full-flow demo seed
 *
 * Creates a complete end-to-end simulation dataset:
 *   Partner → Property → Room → QR Code → Guest Session
 *   Service Providers (2) → Catalog Items (4) → Template → Template Items
 *   Service Request (PENDING_MATCH) → Request Items (3)
 *   SP Tickets (2, one per provider) — status OPEN
 *   Service Operators (2, one per provider)
 *   SO Job (1, DISPATCHED) — linked to ticket-1 / operator-1
 *
 * Run: node scripts/seed-demo.mjs
 */

import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) {
  console.error("❌  DATABASE_URL not set");
  process.exit(1);
}

// ── helpers ──────────────────────────────────────────────────────────────────

function id() { return randomUUID(); }
function now() { return new Date(); }
function future(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes);
  return d;
}
function past(minutes) {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutes);
  return d;
}

async function run(conn, sql, params = []) {
  try {
    await conn.execute(sql, params);
  } catch (e) {
    if (e.code === "ER_DUP_ENTRY") {
      console.log(`  ⚠  Duplicate skipped`);
    } else {
      throw e;
    }
  }
}

// ── IDs (deterministic so re-runs are idempotent via INSERT IGNORE) ───────────

const PARTNER_ID       = "seed-partner-001";
const PROPERTY_ID      = "seed-property-001";
const ROOM_ID          = "seed-room-001";
const QR_ID            = "seed-qr-001";
const QR_CODE_ID       = "SEED-QR-DEMO-001";
const SESSION_ID       = "seed-session-001";

const SP_A_ID          = "seed-sp-transport-001";
const SP_B_ID          = "seed-sp-spa-001";

const CAT_AIRPORT      = "seed-cat-airport-001";
const CAT_TRANSFER     = "seed-cat-transfer-001";
const CAT_MASSAGE      = "seed-cat-massage-001";
const CAT_FACIAL       = "seed-cat-facial-001";

const TEMPLATE_ID      = "seed-template-001";
const TI_1             = "seed-ti-1";
const TI_2             = "seed-ti-2";
const TI_3             = "seed-ti-3";
const TI_4             = "seed-ti-4";

const REQUEST_ID       = "seed-request-001";
const REQ_NUM          = "REQ-SEED-001";
const ITEM_1_ID        = "seed-item-1";
const ITEM_2_ID        = "seed-item-2";
const ITEM_3_ID        = "seed-item-3";

const TICKET_A_ID      = "seed-ticket-a";   // transport items → SP-A
const TICKET_B_ID      = "seed-ticket-b";   // spa items → SP-B

const OPERATOR_A_ID    = "seed-op-a";
const OPERATOR_B_ID    = "seed-op-b";

const JOB_A_ID         = "seed-job-a";

// ── main ─────────────────────────────────────────────────────────────────────

const conn = await mysql.createConnection(DB_URL);
console.log("✅  Connected to DB\n");

// 1. Partner
console.log("1/14  Partner…");
await run(conn, `INSERT IGNORE INTO peppr_partners
  (id, name, email, phone, address, contact_person, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [PARTNER_ID, "Seed Hotel Group", "seed@peppr.dev", "+66-2-000-0000",
   "123 Demo Road, Bangkok 10110", "Seed Admin", "active", now(), now()]);

// 2. Property
console.log("2/14  Property…");
await run(conn, `INSERT IGNORE INTO peppr_properties
  (id, partner_id, name, type, address, city, country, timezone, currency, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [PROPERTY_ID, PARTNER_ID, "Seed Grand Hotel", "hotel", "123 Demo Road", "Bangkok",
   "TH", "Asia/Bangkok", "THB", "active", now(), now()]);

// 3. Room
console.log("3/14  Room…");
await run(conn, `INSERT IGNORE INTO peppr_rooms
  (id, property_id, room_number, floor, room_type, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [ROOM_ID, PROPERTY_ID, "808", "8", "Deluxe Suite", "active", now(), now()]);

// 4. QR Code
console.log("4/14  QR Code…");
await run(conn, `INSERT IGNORE INTO peppr_qr_codes
  (id, property_id, room_id, qr_code_id, access_type, status, scan_count, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [QR_ID, PROPERTY_ID, ROOM_ID, QR_CODE_ID, "public", "active", 0, now(), now()]);

// 5. Guest Session
console.log("5/14  Guest Session…");
await run(conn, `INSERT IGNORE INTO peppr_guest_sessions
  (id, qr_code_id, property_id, room_id, guest_name, access_type, status, expires_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [SESSION_ID, QR_ID, PROPERTY_ID, ROOM_ID, "Alex Demo", "public",
   "ACTIVE", future(1440), now(), now()]);

// 6. Service Providers
console.log("6/14  Service Providers…");
await run(conn, `INSERT IGNORE INTO peppr_service_providers
  (id, name, email, phone, category, service_area, contact_person, rating, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [SP_A_ID, "Speedy Transfers Co.", "ops@speedy.demo", "+66-81-111-1111",
   "Transport", "Bangkok Metro", "Khun Somchai", "4.80", "active", now(), now()]);

await run(conn, `INSERT IGNORE INTO peppr_service_providers
  (id, name, email, phone, category, service_area, contact_person, rating, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [SP_B_ID, "Serenity Spa & Wellness", "book@serenity.demo", "+66-81-222-2222",
   "Wellness", "Bangkok Metro", "Khun Malee", "4.95", "active", now(), now()]);

// 7. Catalog Items
console.log("7/14  Catalog Items…");
const catalogItems = [
  [CAT_AIRPORT, SP_A_ID, "Airport Transfer (Suvarnabhumi)", "Sedan, 1-3 pax, one-way", "SKU-TRANS-001", "Transport", "1200.00", "THB", "trip", 90],
  [CAT_TRANSFER, SP_A_ID, "City Transfer (On-demand)", "Sedan, 1-3 pax, within Bangkok", "SKU-TRANS-002", "Transport", "800.00", "THB", "trip", 60],
  [CAT_MASSAGE, SP_B_ID, "Thai Traditional Massage (60 min)", "In-room, full body", "SKU-SPA-001", "Wellness", "1500.00", "THB", "session", 60],
  [CAT_FACIAL, SP_B_ID, "Hydrating Facial Treatment (45 min)", "In-room, skin care", "SKU-SPA-002", "Wellness", "1200.00", "THB", "session", 45],
];
for (const [cid, pid, name, desc, sku, cat, price, cur, unit, dur] of catalogItems) {
  await run(conn, `INSERT IGNORE INTO peppr_catalog_items
    (id, provider_id, name, description, sku, category, price, currency, unit, duration_minutes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [cid, pid, name, desc, sku, cat, price, cur, unit, dur, "active", now(), now()]);
}

// 8. Service Template
console.log("8/14  Service Template…");
await run(conn, `INSERT IGNORE INTO peppr_service_templates
  (id, name, description, tier, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [TEMPLATE_ID, "Deluxe Suite Package", "Full service bundle for deluxe suite guests", "premium", "active", now(), now()]);

// 9. Template Items
console.log("9/14  Template Items…");
const templateItems = [
  [TI_1, TEMPLATE_ID, CAT_AIRPORT, 1],
  [TI_2, TEMPLATE_ID, CAT_TRANSFER, 2],
  [TI_3, TEMPLATE_ID, CAT_MASSAGE, 3],
  [TI_4, TEMPLATE_ID, CAT_FACIAL, 4],
];
for (const [tid, tmpl, cat, sort] of templateItems) {
  await run(conn, `INSERT IGNORE INTO peppr_template_items
    (id, template_id, catalog_item_id, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?)`,
    [tid, tmpl, cat, sort, now()]);
}

// 10. Service Request
console.log("10/14  Service Request…");
await run(conn, `INSERT IGNORE INTO peppr_service_requests
  (id, request_number, session_id, property_id, room_id,
   guest_name, guest_phone, guest_notes,
   preferred_datetime, subtotal, discount_amount, total_amount, currency,
   status, matching_mode, sla_deadline, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [REQUEST_ID, REQ_NUM, SESSION_ID, PROPERTY_ID, ROOM_ID,
   "Alex Demo", "+66-89-999-9999", "Please be punctual for airport transfer.",
   future(120), "3500.00", "0.00", "3500.00", "THB",
   "PENDING_MATCH", "manual", future(30), now(), now()]);

// 11. Request Items
console.log("11/14  Request Items…");
const requestItems = [
  [ITEM_1_ID, REQUEST_ID, CAT_AIRPORT, TI_1, "Airport Transfer (Suvarnabhumi)", "Transport", "1200.00", 1, 0, 1, "1200.00"],
  [ITEM_2_ID, REQUEST_ID, CAT_MASSAGE, TI_3, "Thai Traditional Massage (60 min)", "Wellness", "1500.00", 1, 0, 1, "1500.00"],
  [ITEM_3_ID, REQUEST_ID, CAT_FACIAL, TI_4, "Hydrating Facial Treatment (45 min)", "Wellness", "1200.00", 1, 0, 1, "1200.00"],
];
for (const [iid, rid, itemId, tiId, name, cat, price, qty, incl, bill, total] of requestItems) {
  await run(conn, `INSERT IGNORE INTO peppr_request_items
    (id, request_id, item_id, template_item_id, item_name, item_category,
     unit_price, quantity, included_quantity, billable_quantity, line_total, currency, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [iid, rid, itemId, tiId, name, cat, price, qty, incl, bill, total, "THB", "PENDING", now()]);
}

// 12. SP Tickets
console.log("12/14  SP Tickets…");
// Ticket A: transport item → SP-A (status CONFIRMED so it shows in outbound)
await run(conn, `INSERT IGNORE INTO peppr_sp_tickets
  (id, request_id, provider_id, item_ids, status, sp_admin_notes, accepted_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [TICKET_A_ID, REQUEST_ID, SP_A_ID,
   JSON.stringify([ITEM_1_ID]),
   "CONFIRMED", "Airport pickup confirmed. Driver assigned.",
   past(15), now(), now()]);

// Ticket B: spa items → SP-B (status OPEN so it shows in inbound)
await run(conn, `INSERT IGNORE INTO peppr_sp_tickets
  (id, request_id, provider_id, item_ids, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)`,
  [TICKET_B_ID, REQUEST_ID, SP_B_ID,
   JSON.stringify([ITEM_2_ID, ITEM_3_ID]),
   "OPEN", now(), now()]);

// 13. Service Operators
console.log("13/14  Service Operators…");
// Use a placeholder user_id — in production this would be a real users.id
const PLACEHOLDER_USER_A = "seed-user-op-a";
const PLACEHOLDER_USER_B = "seed-user-op-b";

await run(conn, `INSERT IGNORE INTO peppr_service_operators
  (id, provider_id, user_id, display_name, specialisation, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [OPERATOR_A_ID, SP_A_ID, PLACEHOLDER_USER_A,
   "Khun Nattapong (Driver)", "TRANSPORT", "ON_DUTY", now(), now()]);

await run(conn, `INSERT IGNORE INTO peppr_service_operators
  (id, provider_id, user_id, display_name, specialisation, status, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  [OPERATOR_B_ID, SP_B_ID, PLACEHOLDER_USER_B,
   "Khun Siriporn (Therapist)", "WELLNESS", "ACTIVE", now(), now()]);

// 14. SO Job (linked to Ticket A, Operator A — already DISPATCHED)
console.log("14/14  SO Job…");
const initialHistory = JSON.stringify([
  { stage: "DISPATCHED", timestamp: past(10).toISOString(), actorId: "seed-sp-admin" }
]);
await run(conn, `INSERT IGNORE INTO peppr_so_jobs
  (id, ticket_id, operator_id, status, stage_notes, stage_history, assigned_at, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [JOB_A_ID, TICKET_A_ID, OPERATOR_A_ID,
   "DISPATCHED", "Proceed to Suvarnabhumi Airport Terminal 2.",
   initialHistory, past(10), now(), now()]);

await conn.end();

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅  SEED COMPLETE — Demo Data Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARTNER       ${PARTNER_ID}
PROPERTY      ${PROPERTY_ID}
ROOM          808 (${ROOM_ID})
QR CODE       ${QR_CODE_ID}  →  /guest/scan?qr=${QR_CODE_ID}
GUEST SESSION ${SESSION_ID}  (guest: Alex Demo)

SERVICE PROVIDERS
  SP-A  ${SP_A_ID}  →  Speedy Transfers Co.
  SP-B  ${SP_B_ID}  →  Serenity Spa & Wellness

CATALOG ITEMS
  ${CAT_AIRPORT}   Airport Transfer (1,200 THB)
  ${CAT_TRANSFER}  City Transfer (800 THB)
  ${CAT_MASSAGE}   Thai Massage (1,500 THB)
  ${CAT_FACIAL}    Hydrating Facial (1,200 THB)

TEMPLATE      ${TEMPLATE_ID}  →  Deluxe Suite Package

SERVICE REQUEST
  ID            ${REQUEST_ID}
  Number        ${REQ_NUM}
  Status        PENDING_MATCH
  Total         3,500 THB
  Items:
    ${ITEM_1_ID}  →  Airport Transfer
    ${ITEM_2_ID}  →  Thai Massage
    ${ITEM_3_ID}  →  Hydrating Facial

SP TICKETS
  ${TICKET_A_ID}  →  SP-A  [CONFIRMED]  items: [item-1]
  ${TICKET_B_ID}  →  SP-B  [OPEN]       items: [item-2, item-3]

SERVICE OPERATORS
  ${OPERATOR_A_ID}  →  SP-A  Khun Nattapong (Driver)   ON_DUTY
  ${OPERATOR_B_ID}  →  SP-B  Khun Siriporn (Therapist) ACTIVE

SO JOB
  ${JOB_A_ID}  →  Ticket-A / Operator-A  [DISPATCHED]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PORTAL ENTRY POINTS
  FO Queue:        /fo/queue
  FO Request:      /fo/requests/${REQUEST_ID}
  SP Inbound:      /sp/inbound       (SP-B sees Ticket-B as OPEN)
  SP Outbound:     /sp/outbound      (SP-A sees Ticket-A as CONFIRMED)
  SP Operators:    /sp/operators
  SO Jobs:         /so/jobs          (Operator-A sees Job-A as DISPATCHED)
  SO Job Detail:   /so/jobs/${JOB_A_ID}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
