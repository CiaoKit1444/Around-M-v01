/**
 * Sprint 14 migration — creates peppr_sp_tickets, peppr_service_operators, peppr_so_jobs
 * Run: node scripts/migrate-sprint14.mjs
 */
import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const conn = await createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS peppr_sp_tickets (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    provider_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    sp_admin_notes TEXT,
    decline_reason TEXT,
    accepted_at TIMESTAMP NULL,
    dispatched_at TIMESTAMP NULL,
    closed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS peppr_service_operators (
    id VARCHAR(36) PRIMARY KEY,
    provider_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    specialisation VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS peppr_so_jobs (
    id VARCHAR(36) PRIMARY KEY,
    ticket_id VARCHAR(36) NOT NULL,
    operator_id VARCHAR(36) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DISPATCHED',
    stage_notes TEXT,
    stage_history JSON,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
];

for (const sql of statements) {
  const tableName = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
  try {
    await conn.execute(sql);
    console.log(`✓ ${tableName}`);
  } catch (err) {
    console.error(`✗ ${tableName}:`, err.message);
    process.exit(1);
  }
}

await conn.end();
console.log("Migration complete.");
