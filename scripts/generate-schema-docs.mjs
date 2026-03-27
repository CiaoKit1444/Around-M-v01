#!/usr/bin/env node
/**
 * generate-schema-docs.mjs
 *
 * Introspects drizzle/schema.ts and regenerates docs/schema.md.
 *
 * Usage:
 *   pnpm docs:schema
 *
 * The script parses the TypeScript source as plain text (no TS compiler needed)
 * and extracts table definitions, column names, types, nullable status, and
 * defaults. It then writes a structured Markdown document to docs/schema.md.
 *
 * Limitations:
 *   - Parses source text with regex; does not execute TypeScript.
 *   - Complex column expressions (e.g. multi-line generics) may be truncated.
 *   - The ER tree in Section 9 is static and must be updated manually when
 *     foreign-key relationships change.
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SCHEMA_FILE = resolve(ROOT, "drizzle", "schema.ts");
const OUTPUT_FILE = resolve(ROOT, "docs", "schema.md");

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseSchema(src) {
  const tables = [];

  // Match each mysqlTable block: export const <varName> = mysqlTable("<tableName>", { ... });
  // We use a simple brace-counting approach to extract the column block.
  const tableStartRe =
    /export const (\w+)\s*=\s*mysqlTable\("([^"]+)",\s*\{/g;
  let match;

  while ((match = tableStartRe.exec(src)) !== null) {
    const varName = match[1];
    const tableName = match[2];
    const blockStart = match.index + match[0].length;

    // Walk forward counting braces to find the end of the column block
    let depth = 1;
    let i = blockStart;
    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }
    const columnBlock = src.slice(blockStart, i - 1);
    const columns = parseColumns(columnBlock);
    tables.push({ varName, tableName, columns });
  }

  return tables;
}

function parseColumns(block) {
  const columns = [];
  // Split on lines and look for property definitions
  const lines = block.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    // Skip comments and blank lines
    if (!line || line.startsWith("//") || line.startsWith("*")) continue;

    // Match: propName: typeHelper("col_name", ...) modifiers
    const colRe = /^(\w+)\s*:\s*(\w+)\("([^"]+)"([^)]*)\)(.*)/;
    const m = colRe.exec(line);
    if (!m) continue;

    const [, prop, typeHelper, colName, , modifiers] = m;
    const mod = modifiers || "";

    const nullable = !mod.includes(".notNull()");
    const isUnique = mod.includes(".unique()");
    const isPK =
      mod.includes(".primaryKey()") || mod.includes("autoincrement()");

    let defaultVal = null;
    const defMatch = mod.match(/\.default\(([^)]+)\)/);
    if (defMatch) defaultVal = defMatch[1].trim();
    if (mod.includes(".defaultNow()")) defaultVal = "NOW()";
    if (mod.includes(".autoincrement()")) defaultVal = "AUTO_INCREMENT";

    columns.push({
      prop,
      colName,
      typeHelper,
      nullable,
      isUnique,
      isPK,
      defaultVal,
    });
  }
  return columns;
}

function typeLabel(typeHelper) {
  const map = {
    int: "INT",
    bigint: "BIGINT",
    varchar: "VARCHAR",
    text: "TEXT",
    boolean: "BOOLEAN",
    timestamp: "TIMESTAMP",
    json: "JSON",
    decimal: "DECIMAL",
    float: "FLOAT",
    double: "DOUBLE",
    date: "DATE",
    time: "TIME",
    char: "CHAR",
    tinyint: "TINYINT",
    smallint: "SMALLINT",
    mediumint: "MEDIUMINT",
  };
  return map[typeHelper] || typeHelper.toUpperCase();
}

function renderTable(table) {
  const { varName, tableName, columns } = table;
  if (columns.length === 0) return `### \`${tableName}\`\n\n_No columns parsed._\n\n`;

  const rows = columns
    .map((c) => {
      const pk = c.isPK ? "✓" : "";
      const nullable = c.nullable ? "YES" : "NO";
      const unique = c.isUnique ? "✓" : "";
      const def = c.defaultVal ?? "—";
      return `| \`${c.colName}\` | \`${c.prop}\` | ${typeLabel(c.typeHelper)} | ${nullable} | ${pk} | ${unique} | ${def} |`;
    })
    .join("\n");

  return `### \`${tableName}\`

> TypeScript export: \`${varName}\`

| SQL Column | TS Property | Type | Nullable | PK | Unique | Default |
|------------|-------------|------|----------|----|--------|---------|
${rows}

`;
}

// ── Section groupings ─────────────────────────────────────────────────────────

const SECTIONS = [
  {
    title: "Auth & Identity",
    tables: ["users", "peppr_users", "peppr_user_roles", "peppr_sso_allowlist"],
  },
  {
    title: "Organisation Hierarchy",
    tables: ["peppr_partners", "peppr_properties", "peppr_property_config"],
  },
  {
    title: "Rooms & QR Codes",
    tables: ["peppr_rooms", "peppr_qr_codes", "peppr_stay_tokens"],
  },
  {
    title: "Service Catalogue",
    tables: [
      "peppr_service_providers",
      "peppr_catalog_items",
      "peppr_service_templates",
      "peppr_template_items",
      "peppr_room_template_assignments",
    ],
  },
  {
    title: "Guest Sessions & Requests",
    tables: [
      "peppr_guest_sessions",
      "peppr_service_requests",
      "peppr_request_items",
    ],
  },
  {
    title: "Fulfilment",
    tables: [
      "peppr_sp_assignments",
      "peppr_sp_tickets",
      "peppr_service_operators",
      "peppr_so_jobs",
      "peppr_staff_positions",
      "peppr_staff_members",
    ],
  },
  {
    title: "Payments & Audit",
    tables: [
      "peppr_payments",
      "peppr_request_events",
      "peppr_request_notes",
      "peppr_audit_events",
    ],
  },
  {
    title: "CMS",
    tables: ["peppr_property_banners"],
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────

const src = readFileSync(SCHEMA_FILE, "utf8");
const tables = parseSchema(src);
const tableMap = Object.fromEntries(tables.map((t) => [t.tableName, t]));

const now = new Date().toISOString().slice(0, 10);

let md = `# Database Schema Reference

> **Auto-generated** by \`scripts/generate-schema-docs.mjs\` on ${now}.
> Run \`pnpm docs:schema\` to regenerate after schema changes.
> Do not edit this file manually — changes will be overwritten.

This document lists every table in \`drizzle/schema.ts\` with its columns,
types, nullable status, primary key, unique constraint, and default value.

---

## Table of Contents

`;

SECTIONS.forEach((sec, i) => {
  md += `${i + 1}. [${sec.title}](#${sec.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")})\n`;
});
md += `${SECTIONS.length + 1}. [Entity Relationship Overview](#entity-relationship-overview)\n\n---\n\n`;

const ungrouped = tables.filter(
  (t) => !SECTIONS.flatMap((s) => s.tables).includes(t.tableName)
);

SECTIONS.forEach((sec, i) => {
  md += `## ${i + 1}. ${sec.title}\n\n`;
  sec.tables.forEach((tName) => {
    const t = tableMap[tName];
    if (t) {
      md += renderTable(t);
    } else {
      md += `### \`${tName}\`\n\n_Table not found in schema — may have been renamed or removed._\n\n`;
    }
  });
});

if (ungrouped.length > 0) {
  md += `## ${SECTIONS.length + 1}. Ungrouped Tables\n\n`;
  ungrouped.forEach((t) => {
    md += renderTable(t);
  });
  md += "\n";
}

md += `## ${SECTIONS.length + 1}. Entity Relationship Overview

> This section is maintained manually. Update it when foreign-key relationships change.

\`\`\`
peppr_partners
  └─ peppr_properties (partner_id)
       ├─ peppr_property_config (property_id)
       ├─ peppr_property_banners (property_id)
       ├─ peppr_rooms (property_id)
       │    ├─ peppr_qr_codes (room_id)
       │    │    └─ peppr_stay_tokens (qr_code_id)
       │    │         └─ peppr_guest_sessions (stay_token_id)
       │    │              └─ peppr_service_requests (session_id)
       │    │                   ├─ peppr_request_items (request_id)
       │    │                   ├─ peppr_request_events (request_id)
       │    │                   ├─ peppr_request_notes (request_id)
       │    │                   ├─ peppr_payments (request_id)
       │    │                   └─ peppr_sp_tickets (request_id)
       │    │                        └─ peppr_so_jobs (ticket_id)
       │    └─ peppr_room_template_assignments (room_id)
       │         └─ peppr_service_templates (template_id)
       │              └─ peppr_template_items (template_id)
       │                   └─ peppr_catalog_items (catalog_item_id)
       │                        └─ peppr_service_providers (provider_id)
       └─ peppr_staff_members (property_id)
            └─ peppr_staff_positions (position_id)

peppr_users (Peppr identity, links to peppr_partners / peppr_properties)
users (Manus OAuth identity, managed by framework)
peppr_user_roles (multi-role bindings for peppr_users)
peppr_sso_allowlist (SSO email domain allowlist)
peppr_service_operators (property-scoped operator accounts)
peppr_sp_assignments (legacy: direct SP assignment, superseded by sp_tickets)
peppr_audit_events (immutable audit trail, references any entity by string id)
\`\`\`

---

_Generated by \`scripts/generate-schema-docs.mjs\`. Schema source: \`drizzle/schema.ts\`._
`;

mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(OUTPUT_FILE, md, "utf8");

const tableCount = tables.length;
const colCount = tables.reduce((acc, t) => acc + t.columns.length, 0);
console.log(
  `✓ docs/schema.md regenerated — ${tableCount} tables, ${colCount} columns`
);
