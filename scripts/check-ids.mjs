import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const l of lines) {
    const m = l.match(/^([^#=]+)=(.*)/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [partners] = await conn.execute("SELECT id, name, CHAR_LENGTH(id) as id_len FROM peppr_partners ORDER BY name");
console.log("PARTNERS:");
for (const p of partners) {
  console.log(`  id="${p.id}" (len=${p.id_len}) name="${p.name}"`);
}

const [properties] = await conn.execute("SELECT id, partner_id, name, CHAR_LENGTH(id) as id_len, CHAR_LENGTH(partner_id) as pid_len FROM peppr_properties ORDER BY name");
console.log("\nPROPERTIES:");
for (const p of properties) {
  console.log(`  id="${p.id}" (len=${p.id_len}) partner_id="${p.partner_id}" (len=${p.pid_len}) name="${p.name}"`);
}

// Check matching
const partnerIds = new Set(partners.map(p => p.id));
console.log("\nMATCH CHECK:");
for (const p of properties) {
  const matches = partnerIds.has(p.partner_id);
  console.log(`  ${p.name}: partner_id="${p.partner_id}" matches=${matches}`);
}

// Also check what the drizzle schema column names are
const [cols] = await conn.execute("SHOW COLUMNS FROM peppr_properties WHERE Field LIKE '%partner%'");
console.log("\nPARTNER COLUMNS IN peppr_properties:");
for (const c of cols) {
  console.log(`  ${c.Field} (${c.Type})`);
}

await conn.end();
