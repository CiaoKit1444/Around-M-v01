/**
 * restore-seed-fixtures.mjs
 *
 * Resets known test fixtures to their canonical seed state.
 * Run this before any full test suite execution to guarantee a clean baseline,
 * especially after E2E tests that mutate shared data (templates, QR codes, stay tokens).
 *
 * Usage:
 *   node scripts/restore-seed-fixtures.mjs
 *   pnpm test:restore   (if added to package.json scripts)
 *
 * What it resets:
 *   1. SIAM_ROOM_103 template → "Standard Room Package" (3 items, required by sellable S05)
 *   2. PEARL_ROOM_102 template → "Beach Resort Package" (3 items)
 *   3. Expired stay tokens → marks them inactive so token validation tests stay clean
 *   4. Reports counts of E2E-generated artifacts (does NOT delete them — safe to accumulate)
 *
 * Safe to run repeatedly — all operations are idempotent.
 */

import { createConnection } from "mysql2/promise";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// ── Canonical seed fixture map ────────────────────────────────────────────────
// These values are the ground-truth from scripts/seed-full.mjs.
// Update here if the seed data changes.

const FIXTURES = {
  rooms: [
    {
      id: "d7b7f56d-d4d3-4b8a-b",
      room_number: "103",
      property: "The Siam Riverside Hotel",
      template_id: "adbd3e43-bf13-43dc-8",
      template_name: "Standard Room Package",
      expected_items: 3,
    },
    {
      id: "3d7fe8d5-a06c-43ae-8",
      room_number: "102",
      property: "Andaman Pearl Beach Resort",
      template_id: "364f5978-e590-4bf2-9",
      template_name: "Beach Resort Package",
      expected_items: 3,
    },
  ],
  // QR codes that must remain active for guest flow tests
  qrCodes: [
    { qr_code_id: "QR-SIAM-103", expected_status: "active" },
    { qr_code_id: "QR-PEARL-102", expected_status: "active" },
    { qr_code_id: "QR-SIAM-201", expected_status: "active" },
    { qr_code_id: "QR-3D968C10-301", expected_status: "active" },
  ],
  // Stay token used by sellable.test.ts S02 restricted-QR validation
  stayTokens: [
    {
      token: "STK-PEARL-101",
      property_id: "7bb45879-4a59-4d4c-9",
      room_id: "3d7fe8d5-a06c-43ae-8",
    },
  ],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

function warn(msg) {
  console.warn(`  ⚠ ${msg}`);
}

function section(title) {
  console.log(`\n── ${title} ${"─".repeat(Math.max(0, 60 - title.length))}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("Peppr Around — Seed Fixture Restore");
  console.log(`Database: ${(process.env.DATABASE_URL ?? "").replace(/:[^:@]*@/, ":***@")}`);

  const conn = await createConnection(process.env.DATABASE_URL);

  // ── 1. Room template assignments ─────────────────────────────────────────────
  section("Room Template Assignments");
  for (const room of FIXTURES.rooms) {
    const [rows] = await conn.execute(
      "SELECT template_id FROM peppr_rooms WHERE id = ?",
      [room.id]
    );
    const current = rows[0]?.template_id;
    if (current === room.template_id) {
      ok(`Room ${room.room_number} (${room.property}) — already on "${room.template_name}"`);
    } else {
      await conn.execute(
        "UPDATE peppr_rooms SET template_id = ? WHERE id = ?",
        [room.template_id, room.id]
      );
      // Record the restoration in the assignments table
      await conn.execute(
        `INSERT INTO peppr_room_template_assignments (room_id, template_id, assigned_at)
         VALUES (?, ?, NOW())`,
        [room.id, room.template_id]
      );
      ok(
        `Room ${room.room_number} (${room.property}) — restored to "${room.template_name}" ` +
        `(was: ${current ?? "NULL"})`
      );
    }

    // Verify item count
    const [itemRows] = await conn.execute(
      "SELECT COUNT(*) AS cnt FROM peppr_template_items WHERE template_id = ?",
      [room.template_id]
    );
    const cnt = itemRows[0]?.cnt ?? 0;
    if (cnt >= room.expected_items) {
      ok(`  Template "${room.template_name}" has ${cnt} items (≥${room.expected_items} required)`);
    } else {
      warn(
        `  Template "${room.template_name}" has only ${cnt} items — expected ≥${room.expected_items}. ` +
        `Re-run seed-full.mjs to restore catalog items.`
      );
    }
  }

  // ── 2. QR code status ────────────────────────────────────────────────────────
  section("QR Code Status");
  for (const qr of FIXTURES.qrCodes) {
    const [rows] = await conn.execute(
      "SELECT status FROM peppr_qr_codes WHERE qr_code_id = ?",
      [qr.qr_code_id]
    );
    if (!rows[0]) {
      warn(`${qr.qr_code_id} — NOT FOUND in database. Re-run seed-full.mjs.`);
      continue;
    }
    if (rows[0].status === qr.expected_status) {
      ok(`${qr.qr_code_id} — status="${rows[0].status}" ✓`);
    } else {
      await conn.execute(
        "UPDATE peppr_qr_codes SET status = ? WHERE qr_code_id = ?",
        [qr.expected_status, qr.qr_code_id]
      );
      ok(`${qr.qr_code_id} — restored status to "${qr.expected_status}" (was: ${rows[0].status})`);
    }
  }

  // ── 3. Stay token validity ───────────────────────────────────────────────────
  section("Stay Token Validity");
  for (const st of FIXTURES.stayTokens) {
    const [rows] = await conn.execute(
      "SELECT id, status, expires_at FROM peppr_stay_tokens WHERE token = ?",
      [st.token]
    );
    if (!rows[0]) {
      // Token missing — insert a fresh one with a far-future expiry
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "");
      await conn.execute(
        `INSERT INTO peppr_stay_tokens (token, property_id, room_id, expires_at, status, created_at)
         VALUES (?, ?, ?, ?, 'active', NOW())`,
        [st.token, st.property_id, st.room_id, farFuture]
      );
      ok(`${st.token} — re-created (was missing), expires ${farFuture}`);
    } else if (rows[0].status !== "active" || new Date(rows[0].expires_at) < new Date()) {
      const farFuture = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "");
      await conn.execute(
        "UPDATE peppr_stay_tokens SET status = 'active', expires_at = ? WHERE id = ?",
        [farFuture, rows[0].id]
      );
      ok(`${st.token} — renewed (was: status=${rows[0].status}, expires=${rows[0].expires_at})`);
    } else {
      ok(`${st.token} — active, expires ${rows[0].expires_at} ✓`);
    }
  }

  // ── 4. E2E artifact summary (informational only) ─────────────────────────────
  section("E2E Artifact Summary (informational — not deleted)");
  const [e2eTemplates] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM peppr_service_templates WHERE name LIKE 'E2E%'"
  );
  const [e2eCatalog] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM peppr_catalog_items WHERE name LIKE 'E2E%'"
  );
  const [e2eProviders] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM peppr_service_providers WHERE name LIKE 'E2E%'"
  );
  const [e2ePositions] = await conn.execute(
    "SELECT COUNT(*) AS cnt FROM peppr_staff_positions WHERE title LIKE 'E2E%'"
  );
  console.log(`  E2E templates:  ${e2eTemplates[0].cnt}`);
  console.log(`  E2E catalog:    ${e2eCatalog[0].cnt}`);
  console.log(`  E2E providers:  ${e2eProviders[0].cnt}`);
  console.log(`  E2E positions:  ${e2ePositions[0].cnt}`);
  console.log("  (Run with --clean flag to remove E2E artifacts — not yet implemented)");

  await conn.end();
  console.log("\n✅ Seed fixture restore complete.\n");
}

main().catch((err) => {
  console.error("\n❌ Restore failed:", err.message);
  process.exit(1);
});
