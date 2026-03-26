/**
 * Sprint 15 migration: add item_ids JSON column to peppr_sp_tickets
 */
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL not set");

const conn = await mysql.createConnection(DATABASE_URL);

const statements = [
  `ALTER TABLE peppr_sp_tickets ADD COLUMN IF NOT EXISTS item_ids JSON`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    console.log("✓", sql.slice(0, 80));
  } catch (err) {
    if (err.code === "ER_DUP_FIELDNAME" || err.message?.includes("Duplicate column")) {
      console.log("⚠ already exists, skipping:", sql.slice(0, 80));
    } else {
      console.error("✗ FAILED:", sql);
      console.error(err.message);
    }
  }
}

await conn.end();
console.log("Sprint 15 migration complete.");
