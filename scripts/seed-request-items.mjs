/**
 * seed-request-items.mjs
 * Backfills peppr_request_items for all service requests that currently have 0 items.
 * Uses the correct column schema:
 *   id, request_id, item_id, item_name, item_category, unit_price, quantity,
 *   included_quantity, billable_quantity, line_total, currency, guest_notes, status
 *
 * Run: node scripts/seed-request-items.mjs
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

const uuid = () => randomUUID();

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  console.log("✅ Connected to database\n");

  try {
    // Load catalog items
    const [catalogRows] = await conn.execute(
      "SELECT id, name, category, price FROM peppr_catalog_items ORDER BY category, name"
    );
    const catalog = catalogRows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: parseFloat(r.price),
    }));

    // Group catalog by category for easy lookup
    const byCategory = {};
    for (const item of catalog) {
      if (!byCategory[item.category]) byCategory[item.category] = [];
      byCategory[item.category].push(item);
    }

    // Scenario: map request status to plausible catalog items
    const scenariosByCat = [
      { cat: "Food & Beverage",       qty: 2 },
      { cat: "Spa & Wellness",        qty: 1 },
      { cat: "Laundry & Dry Cleaning",qty: 3 },
      { cat: "Tours & Activities",    qty: 2 },
      { cat: "Transportation",        qty: 1 },
      { cat: "Experiences",           qty: 2 },
    ];

    // Find requests with 0 items
    const [emptyRequests] = await conn.execute(`
      SELECT sr.id, sr.property_id, sr.total_amount, sr.status
      FROM peppr_service_requests sr
      LEFT JOIN peppr_request_items ri ON ri.request_id = sr.id
      WHERE ri.id IS NULL
      ORDER BY sr.created_at
    `);

    console.log(`📦 Found ${emptyRequests.length} requests with no line items\n`);

    let itemsInserted = 0;
    let reqsUpdated = 0;

    for (let i = 0; i < emptyRequests.length; i++) {
      const req = emptyRequests[i];
      const scenario = scenariosByCat[i % scenariosByCat.length];
      const catItems = byCategory[scenario.cat] ?? catalog;

      // Pick 1-2 items from the category
      const picked = catItems.slice(0, Math.min(2, catItems.length));
      if (picked.length === 0) continue;

      let lineTotal = 0;
      const itemsToInsert = picked.map(item => {
        const qty = scenario.qty;
        const total = item.price * qty;
        lineTotal += total;
        return {
          id: uuid(),
          request_id: req.id,
          item_id: item.id,
          item_name: item.name,
          item_category: item.category,
          unit_price: item.price,
          quantity: qty,
          included_quantity: 0,
          billable_quantity: qty,
          line_total: total,
          currency: "THB",
          guest_notes: null,
          status: "PENDING",
        };
      });

      for (const item of itemsToInsert) {
        try {
          await conn.execute(
            `INSERT IGNORE INTO peppr_request_items
             (id, request_id, item_id, item_name, item_category, unit_price, quantity,
              included_quantity, billable_quantity, line_total, currency, guest_notes, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              item.id, item.request_id, item.item_id, item.item_name, item.item_category,
              item.unit_price, item.quantity, item.included_quantity, item.billable_quantity,
              item.line_total, item.currency, item.guest_notes, item.status,
            ]
          );
          itemsInserted++;
        } catch (e) {
          console.error(`  ⚠️  Item insert failed: ${e.message}`);
        }
      }

      // Update request totals to match line items
      try {
        await conn.execute(
          `UPDATE peppr_service_requests SET subtotal = ?, total_amount = ? WHERE id = ?`,
          [lineTotal, lineTotal, req.id]
        );
        reqsUpdated++;
      } catch (_) {}
    }

    console.log(`✅ Inserted ${itemsInserted} line items across ${reqsUpdated} requests\n`);

    // Final summary
    const [[{ totalItems }]] = await conn.execute("SELECT COUNT(*) as totalItems FROM peppr_request_items");
    const [[{ totalReqs }]]  = await conn.execute("SELECT COUNT(*) as totalReqs FROM peppr_service_requests");
    const [[{ emptyReqs }]]  = await conn.execute(`
      SELECT COUNT(*) as emptyReqs
      FROM peppr_service_requests sr
      LEFT JOIN peppr_request_items ri ON ri.request_id = sr.id
      WHERE ri.id IS NULL
    `);

    console.log("═══════════════════════════════════════════════════");
    console.log("  REQUEST ITEMS SUMMARY");
    console.log("═══════════════════════════════════════════════════");
    console.log(`  Total service requests:     ${totalReqs}`);
    console.log(`  Total line items:           ${totalItems}`);
    console.log(`  Requests still with 0 items: ${emptyReqs}`);
    console.log("═══════════════════════════════════════════════════\n");

    // Status distribution
    const [statusDist] = await conn.execute(
      "SELECT status, COUNT(*) as cnt FROM peppr_service_requests GROUP BY status ORDER BY cnt DESC"
    );
    console.log("  Status distribution:");
    for (const r of statusDist) {
      console.log(`    ${r.status.padEnd(15)} ${r.cnt}`);
    }
    console.log();

  } finally {
    await conn.end();
    console.log("✅ Done");
  }
}

main().catch(err => {
  console.error("❌ Failed:", err.message);
  process.exit(1);
});
