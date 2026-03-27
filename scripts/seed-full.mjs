/**
 * seed-full.mjs — Comprehensive test-data seed for Peppr Around Admin
 *
 * Strategy: All IDs are fetched dynamically from the DB at startup so the
 * script works regardless of how IDs were stored (truncated or full UUIDs).
 *
 * Covers:
 *   1. Rooms for Andaman Cliff Villas, Lanna Heritage Boutique Hotel (extra floors),
 *      and Siam Business Suites (all new)
 *   2. Template assignments for ALL rooms that have none
 *   3. QR codes for every room that lacks one
 *   4. Staff positions per property
 *   5. Staff members linked to existing peppr_users
 *   6. Sample service requests (various statuses) with line items
 *
 * Safe to re-run: uses INSERT IGNORE / checks before inserting.
 * Run: node scripts/seed-full.mjs
 */

import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

// ── Load .env ──────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

// ── Helpers ────────────────────────────────────────────────────────────────
const uuid = () => randomUUID();

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d.toISOString().slice(0, 19).replace("T", " ");
}

function pickTemplate(roomType, tmpl) {
  const map = {
    "Standard":       tmpl.standard,
    "Deluxe":         tmpl.deluxe,
    "Suite":          tmpl.suite,
    "Villa":          tmpl.beach,
    "Heritage Room":  tmpl.heritage,
    "Business Room":  tmpl.standard,
    "Executive":      tmpl.deluxe,
    "Penthouse":      tmpl.suite,
  };
  return map[roomType] ?? tmpl.standard;
}

// ── Room factory ───────────────────────────────────────────────────────────
function makeRooms(propertyId, config, tmpl) {
  const rooms = [];
  for (const { floor, zone, types } of config) {
    for (const [roomType, numbers] of Object.entries(types)) {
      for (const num of numbers) {
        rooms.push({
          id: uuid(),
          property_id: propertyId,
          room_number: String(num),
          floor: String(floor),
          zone,
          room_type: roomType,
          template_id: pickTemplate(roomType, tmpl),
          status: "active",
        });
      }
    }
  }
  return rooms;
}

// ── Staff position definitions ─────────────────────────────────────────────
const POSITION_DEFS = [
  { title: "Front Desk Officer",       department: "Front Office" },
  { title: "Housekeeping Supervisor",  department: "Housekeeping" },
  { title: "Concierge",                department: "Guest Services" },
  { title: "F&B Attendant",            department: "Food & Beverage" },
  { title: "Maintenance Technician",   department: "Engineering" },
  { title: "Spa Therapist",            department: "Spa & Wellness" },
  { title: "Butler",                   department: "Guest Services" },
  { title: "Night Auditor",            department: "Front Office" },
];

// ── Service request scenarios ──────────────────────────────────────────────
const GUEST_NAMES = [
  "Tanaka Hiroshi", "Sophie Martin", "James Wilson", "Priya Sharma",
  "Lars Eriksson", "Mei Ling Chen", "Carlos Mendez", "Fatima Al-Hassan",
  "Yuki Nakamura", "Emma Thompson", "Ahmed Khalil", "Isabella Rossi",
  "David Park", "Nadia Petrov", "Raj Patel", "Amelia Johnson",
];

let reqCounter = 2000;

function makeRequest(propertyId, roomId, sessionId, catalog, scenario) {
  const guestName = GUEST_NAMES[Math.floor(Math.random() * GUEST_NAMES.length)];
  const items = scenario.items.map((item, i) => ({
    id: uuid(),
    catalog_item_id: item.id,
    quantity: item.qty ?? 1,
    unit_price: parseFloat(item.price),
    subtotal: (item.qty ?? 1) * parseFloat(item.price),
    notes: null,
    sort_order: i,
  }));
  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const reqId = uuid();
  const reqNum = `REQ-${String(reqCounter++).padStart(5, "0")}`;
  const { status, daysBack } = scenario;

  return {
    request: {
      id: reqId,
      request_number: reqNum,
      session_id: sessionId,
      property_id: propertyId,
      room_id: roomId,
      guest_name: guestName,
      guest_phone: `+66-8${Math.floor(Math.random() * 90000000 + 10000000)}`,
      guest_notes: null,
      preferred_datetime: null,
      subtotal,
      discount_amount: 0,
      total_amount: subtotal,
      currency: "THB",
      status,
      status_reason: status === "CANCELLED" ? "Guest changed plans" : null,
      confirmed_at:  ["CONFIRMED","IN_PROGRESS","COMPLETED"].includes(status) ? hoursAgo(Math.floor(Math.random() * 48 + 1)) : null,
      completed_at:  status === "COMPLETED" ? hoursAgo(Math.floor(Math.random() * 12 + 1)) : null,
      cancelled_at:  status === "CANCELLED" ? hoursAgo(Math.floor(Math.random() * 6 + 1)) : null,
      created_at:    daysAgo(daysBack),
    },
    items,
  };
}

// ── Main ───────────────────────────────────────────────────────────────────
async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("✅ Connected to database\n");

  try {
    // ── 0. Load all reference IDs dynamically ──────────────────────────────
    const [propRows]     = await conn.execute("SELECT id, name FROM peppr_properties ORDER BY name");
    const [tmplRows]     = await conn.execute("SELECT id, name FROM peppr_service_templates ORDER BY name");
    const [catalogRows]  = await conn.execute("SELECT id, name, category, price FROM peppr_catalog_items ORDER BY category, name");

    // Map by name
    const PROP  = Object.fromEntries(propRows.map(r => [r.name, r.id]));
    const TMPL  = Object.fromEntries(tmplRows.map(r => [r.name, r.id]));
    const CAT   = Object.fromEntries(catalogRows.map(r => [r.name, { id: r.id, price: r.price }]));

    // Friendly aliases
    const tmpl = {
      standard: TMPL["Standard Room Package"],
      deluxe:   TMPL["Deluxe Room Package"],
      suite:    TMPL["Suite Premium Package"],
      beach:    TMPL["Beach Resort Package"],
      heritage: TMPL["Heritage Experience Package"],
    };

    const propIds = {
      andamanCliff:  PROP["Andaman Cliff Villas"],
      andamanPearl:  PROP["Andaman Pearl Beach Resort"],
      lannaHeritage: PROP["Lanna Heritage Boutique Hotel"],
      siamBusiness:  PROP["Siam Business Suites"],
      siamRiverside: PROP["The Siam Riverside Hotel"],
    };

    console.log("📋 Loaded property IDs:");
    for (const [k, v] of Object.entries(propIds)) console.log(`   ${k}: ${v}`);
    console.log();

    // ── 1. Define new rooms ────────────────────────────────────────────────

    // Andaman Cliff Villas — 16 villas (currently 0 rooms)
    const andamanCliffRooms = makeRooms(propIds.andamanCliff, [
      { floor: 1, zone: "Clifftop",  types: { "Villa":  [101, 102, 103, 104, 105, 106, 107, 108] } },
      { floor: 1, zone: "Beachside", types: { "Suite":  [201, 202, 203, 204], "Villa": [205, 206, 207, 208] } },
    ], tmpl);

    // Lanna Heritage — extra 8 rooms on floors 3–4 (currently 12 rooms on floors 1–2)
    const lannaExtraRooms = makeRooms(propIds.lannaHeritage, [
      { floor: 3, zone: "Garden Wing",  types: { "Heritage Room": [301, 302, 303, 304], "Suite": [305, 306] } },
      { floor: 4, zone: "Rooftop Wing", types: { "Suite": [401, 402] } },
    ], tmpl);

    // Siam Business Suites — 20 rooms (currently 0)
    const siamBusinessRooms = makeRooms(propIds.siamBusiness, [
      { floor: 5, zone: "Tower A",        types: { "Business Room": [501, 502, 503, 504, 505, 506, 507, 508] } },
      { floor: 6, zone: "Tower B",        types: { "Business Room": [601, 602, 603, 604, 605, 606], "Executive": [607, 608, 609, 610] } },
      { floor: 7, zone: "Executive Floor",types: { "Executive": [701, 702, 703], "Penthouse": [704] } },
      { floor: 8, zone: "Penthouse",      types: { "Penthouse": [801, 802] } },
    ], tmpl);

    const newRooms = [...andamanCliffRooms, ...lannaExtraRooms, ...siamBusinessRooms];

    // ── 2. Insert new rooms ────────────────────────────────────────────────
    let roomsInserted = 0;
    for (const r of newRooms) {
      try {
        await conn.execute(
          `INSERT IGNORE INTO peppr_rooms (id, property_id, room_number, floor, zone, room_type, template_id, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [r.id, r.property_id, r.room_number, r.floor, r.zone, r.room_type, r.template_id, r.status]
        );
        roomsInserted++;
      } catch (_) {}
    }
    console.log(`✅ Inserted ${roomsInserted} new rooms`);

    // ── 3. Assign templates to rooms that have none ────────────────────────
    const [unassigned] = await conn.execute(
      `SELECT id, room_type FROM peppr_rooms WHERE template_id IS NULL`
    );
    let templatesAssigned = 0;
    for (const r of unassigned) {
      const tid = pickTemplate(r.room_type, tmpl);
      await conn.execute(`UPDATE peppr_rooms SET template_id = ? WHERE id = ?`, [tid, r.id]);
      templatesAssigned++;
    }
    console.log(`✅ Assigned templates to ${templatesAssigned} previously unassigned rooms`);

    // ── 4. Generate QR codes for rooms without one ─────────────────────────
    const [allRooms] = await conn.execute(
      `SELECT id, property_id, room_number FROM peppr_rooms WHERE status = 'active'`
    );
    const [existingQRs] = await conn.execute(`SELECT room_id FROM peppr_qr_codes`);
    const roomsWithQR = new Set(existingQRs.map(q => q.room_id));

    let qrInserted = 0;
    for (const room of allRooms) {
      if (roomsWithQR.has(room.id)) continue;
      const code = `QR-${room.property_id.slice(0, 8).toUpperCase()}-${room.room_number}-${Date.now().toString(36)}`;
      try {
        await conn.execute(
          `INSERT IGNORE INTO peppr_qr_codes (id, property_id, room_id, qr_code_id, access_type, status, scan_count)
           VALUES (?, ?, ?, ?, 'public', 'active', 0)`,
          [uuid(), room.property_id, room.id, code]
        );
        qrInserted++;
      } catch (_) {}
    }
    console.log(`✅ Generated ${qrInserted} new QR codes`);

    // ── 5. Staff positions ─────────────────────────────────────────────────
    const [existingPositions] = await conn.execute(
      `SELECT property_id, title FROM peppr_staff_positions`
    );
    const existingPosKey = new Set(existingPositions.map(p => `${p.property_id}::${p.title}`));

    let positionsInserted = 0;
    for (const propId of Object.values(propIds)) {
      for (const def of POSITION_DEFS) {
        const key = `${propId}::${def.title}`;
        if (existingPosKey.has(key)) continue;
        try {
          await conn.execute(
            `INSERT INTO peppr_staff_positions (id, title, department, property_id, status) VALUES (?, ?, ?, ?, 'active')`,
            [uuid(), def.title, def.department, propId]
          );
          positionsInserted++;
        } catch (_) {}
      }
    }
    console.log(`✅ Inserted ${positionsInserted} staff positions`);

    // ── 6. Staff members ───────────────────────────────────────────────────
    const [realUsers] = await conn.execute(
      `SELECT user_id FROM peppr_users WHERE email NOT LIKE 'vitest%' AND status = 'ACTIVE' LIMIT 20`
    );
    const [allPositions] = await conn.execute(
      `SELECT id, property_id FROM peppr_staff_positions WHERE status = 'active'`
    );
    const posByProp = {};
    for (const p of allPositions) {
      if (!posByProp[p.property_id]) posByProp[p.property_id] = [];
      posByProp[p.property_id].push(p.id);
    }

    // Check existing staff assignments to avoid duplicates
    const [existingStaff] = await conn.execute(
      `SELECT user_id, property_id FROM peppr_staff_members`
    );
    const existingStaffKey = new Set(existingStaff.map(s => `${s.user_id}::${s.property_id}`));

    let staffInserted = 0;
    for (const user of realUsers) {
      for (const propId of Object.values(propIds)) {
        const key = `${user.user_id}::${propId}`;
        if (existingStaffKey.has(key)) continue;
        const propPositions = posByProp[propId] ?? [];
        if (propPositions.length === 0) continue;
        const posId = propPositions[Math.floor(Math.random() * propPositions.length)];
        try {
          await conn.execute(
            `INSERT INTO peppr_staff_members (id, user_id, position_id, property_id, status) VALUES (?, ?, ?, ?, 'active')`,
            [uuid(), user.user_id, posId, propId]
          );
          staffInserted++;
        } catch (_) {}
      }
    }
    console.log(`✅ Inserted ${staffInserted} staff member assignments`);

    // ── 7. Service requests ────────────────────────────────────────────────
    const [[{ reqCount }]] = await conn.execute(
      `SELECT COUNT(*) as reqCount FROM peppr_service_requests`
    );
    console.log(`📦 Existing service requests: ${reqCount}`);

    if (Number(reqCount) >= 120) {
      console.log("⏭️  Skipping request seed — already have ≥120 requests");
    } else {
      // Pick sample rooms spread across all properties
      const [sampleRooms] = await conn.execute(`
        SELECT r.id as room_id, r.property_id, r.room_number
        FROM peppr_rooms r
        WHERE r.status = 'active'
        ORDER BY RAND()
        LIMIT 60
      `);

      // Check / create guest sessions
      const [[{ hasSessions }]] = await conn.execute(
        `SELECT COUNT(*) as hasSessions FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'peppr_guest_sessions'`
      );

      const sessionMap = {};
      if (Number(hasSessions) > 0) {
        for (const room of sampleRooms) {
          const [[existing]] = await conn.execute(
            `SELECT id FROM peppr_guest_sessions WHERE room_id = ? AND status = 'active' LIMIT 1`,
            [room.room_id]
          );
          if (existing) {
            sessionMap[room.room_id] = existing.id;
          } else {
            const sid = uuid();
            try {
              await conn.execute(
                `INSERT IGNORE INTO peppr_guest_sessions (id, property_id, room_id, locale, status) VALUES (?, ?, ?, 'en', 'active')`,
                [sid, room.property_id, room.room_id]
              );
              sessionMap[room.room_id] = sid;
            } catch (_) {
              sessionMap[room.room_id] = uuid();
            }
          }
        }
      } else {
        for (const room of sampleRooms) sessionMap[room.room_id] = uuid();
      }

      // Request scenarios — varied status and service mix
      const scenarios = [
        { items: [{ ...CAT["In-Room Breakfast Set"], qty: 2 }, { ...CAT["Fresh Fruit Platter"], qty: 1 }],  status: "COMPLETED",   daysBack: 5 },
        { items: [{ ...CAT["Afternoon Tea Set"], qty: 2 }],                                                  status: "CONFIRMED",   daysBack: 1 },
        { items: [{ ...CAT["Private Dinner (2 persons)"], qty: 1 }],                                         status: "SUBMITTED",   daysBack: 0 },
        { items: [{ ...CAT["Minibar Refill Package"], qty: 1 }],                                             status: "IN_PROGRESS", daysBack: 0 },
        { items: [{ ...CAT["Traditional Thai Massage"], qty: 1 }],                                           status: "COMPLETED",   daysBack: 3 },
        { items: [{ ...CAT["Aromatherapy Oil Massage"], qty: 1 }, { ...CAT["Foot Reflexology"], qty: 1 }],   status: "CONFIRMED",   daysBack: 1 },
        { items: [{ ...CAT["Herbal Compress Treatment"], qty: 1 }],                                          status: "SUBMITTED",   daysBack: 0 },
        { items: [{ ...CAT["Express Laundry (per kg)"], qty: 3 }, { ...CAT["Ironing Service (per piece)"], qty: 5 }], status: "COMPLETED", daysBack: 2 },
        { items: [{ ...CAT["Dry Cleaning (per piece)"], qty: 2 }],                                           status: "IN_PROGRESS", daysBack: 0 },
        { items: [{ ...CAT["Phi Phi Island Day Trip"], qty: 2 }],                                            status: "CONFIRMED",   daysBack: 1 },
        { items: [{ ...CAT["Sunset Dinner Cruise"], qty: 2 }],                                               status: "SUBMITTED",   daysBack: 0 },
        { items: [{ ...CAT["Scuba Diving Experience"], qty: 1 }],                                            status: "CANCELLED",   daysBack: 4 },
        { items: [{ ...CAT["Airport Transfer (Sedan)"], qty: 1 }],                                           status: "COMPLETED",   daysBack: 6 },
        { items: [{ ...CAT["Airport Transfer (Van)"], qty: 1 }],                                             status: "CONFIRMED",   daysBack: 1 },
        { items: [{ ...CAT["Half-Day City Tour (4h)"], qty: 2 }],                                            status: "SUBMITTED",   daysBack: 0 },
        { items: [{ ...CAT["Thai Cooking Class"], qty: 2 }],                                                 status: "COMPLETED",   daysBack: 7 },
        { items: [{ ...CAT["Temple & Market Tour"], qty: 3 }],                                               status: "CONFIRMED",   daysBack: 2 },
        { items: [{ ...CAT["In-Room Breakfast Set"], qty: 1 }, { ...CAT["Traditional Thai Massage"], qty: 1 }], status: "COMPLETED", daysBack: 4 },
        { items: [{ ...CAT["Minibar Refill Package"], qty: 1 }, { ...CAT["Fresh Fruit Platter"], qty: 2 }], status: "IN_PROGRESS", daysBack: 0 },
        { items: [{ ...CAT["Foot Reflexology"], qty: 2 }],                                                   status: "SUBMITTED",   daysBack: 0 },
      ];

      // Check request_items table exists
      const [[{ hasReqItems }]] = await conn.execute(
        `SELECT COUNT(*) as hasReqItems FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'peppr_request_items'`
      );

      let reqInserted = 0;
      let itemsInserted = 0;

      for (let i = 0; i < sampleRooms.length; i++) {
        const room = sampleRooms[i];
        const scenario = scenarios[i % scenarios.length];
        const sessionId = sessionMap[room.room_id] ?? uuid();

        const { request, items } = makeRequest(room.property_id, room.room_id, sessionId, CAT, scenario);

        try {
          await conn.execute(
            `INSERT IGNORE INTO peppr_service_requests
             (id, request_number, session_id, property_id, room_id, guest_name, guest_phone,
              guest_notes, preferred_datetime, subtotal, discount_amount, total_amount, currency,
              status, status_reason, confirmed_at, completed_at, cancelled_at, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              request.id, request.request_number, request.session_id,
              request.property_id, request.room_id, request.guest_name,
              request.guest_phone, request.guest_notes, request.preferred_datetime,
              request.subtotal, request.discount_amount, request.total_amount,
              request.currency, request.status, request.status_reason,
              request.confirmed_at, request.completed_at, request.cancelled_at,
              request.created_at,
            ]
          );
          reqInserted++;

          if (Number(hasReqItems) > 0) {
            for (const item of items) {
              try {
                await conn.execute(
                  `INSERT IGNORE INTO peppr_request_items
                   (id, request_id, catalog_item_id, quantity, unit_price, subtotal, notes, sort_order)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                  [item.id, request.id, item.catalog_item_id, item.quantity,
                   item.unit_price, item.subtotal, item.notes, item.sort_order]
                );
                itemsInserted++;
              } catch (_) {}
            }
          }
        } catch (_) {}
      }

      console.log(`✅ Inserted ${reqInserted} service requests with ${itemsInserted} line items`);
    }

    // ── 8. Summary ─────────────────────────────────────────────────────────
    const [[{ totalRooms }]]    = await conn.execute(`SELECT COUNT(*) as totalRooms FROM peppr_rooms`);
    const [[{ assignedRooms }]] = await conn.execute(`SELECT COUNT(*) as assignedRooms FROM peppr_rooms WHERE template_id IS NOT NULL`);
    const [[{ totalQR }]]       = await conn.execute(`SELECT COUNT(*) as totalQR FROM peppr_qr_codes`);
    const [[{ totalPos }]]      = await conn.execute(`SELECT COUNT(*) as totalPos FROM peppr_staff_positions`);
    const [[{ totalStaff }]]    = await conn.execute(`SELECT COUNT(*) as totalStaff FROM peppr_staff_members`);
    const [[{ totalReqs }]]     = await conn.execute(`SELECT COUNT(*) as totalReqs FROM peppr_service_requests`);

    console.log("\n═══════════════════════════════════════════════════");
    console.log("  SEED SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Rooms total:          ${totalRooms}`);
    console.log(`  Rooms with template:  ${assignedRooms}`);
    console.log(`  QR codes total:       ${totalQR}`);
    console.log(`  Staff positions:      ${totalPos}`);
    console.log(`  Staff members:        ${totalStaff}`);
    console.log(`  Service requests:     ${totalReqs}`);
    console.log("═══════════════════════════════════════════════════\n");

    const [breakdown] = await conn.execute(`
      SELECT
        p.name,
        COUNT(DISTINCT r.id)  as rooms,
        COUNT(DISTINCT q.id)  as qr_codes,
        COUNT(DISTINCT sr.id) as requests,
        COUNT(DISTINCT sp.id) as positions,
        COUNT(DISTINCT sm.id) as staff
      FROM peppr_properties p
      LEFT JOIN peppr_rooms r             ON r.property_id  = p.id
      LEFT JOIN peppr_qr_codes q          ON q.property_id  = p.id
      LEFT JOIN peppr_service_requests sr ON sr.property_id = p.id
      LEFT JOIN peppr_staff_positions sp  ON sp.property_id = p.id
      LEFT JOIN peppr_staff_members sm    ON sm.property_id = p.id
      GROUP BY p.id, p.name
      ORDER BY p.name
    `);

    console.log("  Per-property breakdown:");
    console.log("  ──────────────────────────────────────────────────────────────────");
    console.log("  Property                          | Rooms | QR  | Reqs | Pos | Staff");
    console.log("  ──────────────────────────────────────────────────────────────────");
    for (const row of breakdown) {
      const name = row.name.padEnd(34);
      console.log(`  ${name}| ${String(row.rooms).padStart(5)} | ${String(row.qr_codes).padStart(3)} | ${String(row.requests).padStart(4)} | ${String(row.positions).padStart(3)} | ${row.staff}`);
    }
    console.log("  ──────────────────────────────────────────────────────────────────\n");

  } finally {
    await conn.end();
    console.log("✅ Done — database connection closed");
  }
}

main().catch(err => {
  console.error("❌ Seed failed:", err.message);
  console.error(err.stack);
  process.exit(1);
});
