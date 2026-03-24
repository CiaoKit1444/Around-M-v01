/**
 * Seed stay tokens for all Siam Riverside Hotel rooms.
 * Creates one active token per room with a 30-day expiry.
 * Also assigns the Siam template to rooms that have NULL template_id.
 *
 * Run: node scripts/seed-siam-tokens.mjs
 */
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const connection = await mysql.createConnection(DATABASE_URL);
const db = drizzle(connection);

// ── 1. Get Siam Riverside property ───────────────────────────────────────────
const [propRows] = await connection.execute(
  "SELECT id, name FROM peppr_properties WHERE name LIKE '%Siam%' LIMIT 1"
);
if (!propRows.length) {
  console.error("Siam Riverside Hotel not found");
  process.exit(1);
}
const property = propRows[0];
console.log(`Property: ${property.name} (${property.id})`);

// ── 2. Get all rooms for the property ────────────────────────────────────────
const [roomRows] = await connection.execute(
  "SELECT id, room_number, room_type, template_id FROM peppr_rooms WHERE property_id = ? ORDER BY room_number",
  [property.id]
);
console.log(`Found ${roomRows.length} rooms`);

// ── 3. Get a template to assign to rooms without one ─────────────────────────
const [templateRows] = await connection.execute(
  "SELECT id, name FROM peppr_service_templates WHERE status = 'active' LIMIT 1"
);
let templateId = null;
if (templateRows.length) {
  templateId = templateRows[0].id;
  console.log(`Using template: ${templateRows[0].name} (${templateId})`);
} else {
  console.log("No active templates found — rooms will keep their current template_id");
}

// ── 4. Assign template to rooms with NULL template_id ────────────────────────
if (templateId) {
  const nullTemplateRooms = roomRows.filter(r => !r.template_id || r.template_id === "NULL");
  if (nullTemplateRooms.length > 0) {
    await connection.execute(
      `UPDATE peppr_rooms SET template_id = ? WHERE property_id = ? AND (template_id IS NULL OR template_id = 'NULL')`,
      [templateId, property.id]
    );
    console.log(`Assigned template to ${nullTemplateRooms.length} rooms that had NULL template_id`);
  }
}

// ── 5. Check existing tokens ──────────────────────────────────────────────────
const [existingTokens] = await connection.execute(
  "SELECT room_id FROM peppr_stay_tokens WHERE property_id = ? AND status = 'active'",
  [property.id]
);
const existingRoomIds = new Set(existingTokens.map(t => t.room_id));
console.log(`Existing active tokens: ${existingRoomIds.size}`);

// ── 6. Seed one token per room ────────────────────────────────────────────────
const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
let created = 0;
let skipped = 0;

for (const room of roomRows) {
  if (existingRoomIds.has(room.id)) {
    skipped++;
    continue;
  }

  const token = `STK-SIAM-R${room.room_number}`;
  await connection.execute(
    `INSERT INTO peppr_stay_tokens (token, property_id, room_id, room_number, expires_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'active', NOW())
     ON DUPLICATE KEY UPDATE status = 'active', expires_at = ?`,
    [token, property.id, room.id, room.room_number, expiresAt, expiresAt]
  );
  created++;
}

console.log(`\nDone! Created: ${created}, Skipped (already had token): ${skipped}`);
console.log(`Total rooms now have active tokens: ${created + existingRoomIds.size}`);

await connection.end();
