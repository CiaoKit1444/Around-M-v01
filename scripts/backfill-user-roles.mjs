/**
 * backfill-user-roles.mjs
 *
 * One-time migration: reads every row in peppr_users that has a non-null role
 * and inserts a corresponding row into peppr_user_roles (if one doesn't already exist).
 *
 * Safe to run multiple times — uses INSERT IGNORE to skip duplicates.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌  DATABASE_URL is not set");
  process.exit(1);
}

// Parse mysql2 connection from URL
const url = new URL(DATABASE_URL);
const connection = await mysql.createConnection({
  host: url.hostname,
  port: parseInt(url.port || "3306"),
  user: url.username,
  password: url.password,
  database: url.pathname.replace(/^\//, ""),
  ssl: { rejectUnauthorized: false },
});

console.log("✅  Connected to database");

// Fetch all users with a role set
const [users] = await connection.execute(
  "SELECT user_id, role, partner_id, property_id FROM peppr_users WHERE role IS NOT NULL AND role != ''"
);

console.log(`📋  Found ${users.length} users to backfill`);

let inserted = 0;
let skipped = 0;

for (const user of users) {
  const { user_id, role, partner_id, property_id } = user;

  // Check if this exact binding already exists
  const [existing] = await connection.execute(
    `SELECT id FROM peppr_user_roles
     WHERE user_id = ?
       AND role_id = ?
       AND (partner_id <=> ?)
       AND (property_id <=> ?)
     LIMIT 1`,
    [user_id, role, partner_id || null, property_id || null]
  );

  if (existing.length > 0) {
    skipped++;
    continue;
  }

  // Insert the binding
  await connection.execute(
    `INSERT INTO peppr_user_roles (user_id, role_id, partner_id, property_id, granted_at)
     VALUES (?, ?, ?, ?, NOW())`,
    [user_id, role, partner_id || null, property_id || null]
  );
  inserted++;
  console.log(`  ✓ ${user_id} → ${role}${partner_id ? ` (partner: ${partner_id})` : ""}${property_id ? ` (property: ${property_id})` : ""}`);
}

await connection.end();

console.log(`\n🎉  Backfill complete: ${inserted} inserted, ${skipped} already existed`);
