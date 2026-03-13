import {
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Peppr Users (migrated from FastAPI) ──────────────────────────────────────
export const pepprUsers = mysqlTable("peppr_users", {
  userId: varchar("user_id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 20 }),
  role: varchar("role", { length: 50 }).default("USER").notNull(),
  positionId: varchar("position_id", { length: 100 }),
  partnerId: varchar("partner_id", { length: 36 }),
  propertyId: varchar("property_id", { length: 36 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
  failedLoginAttempts: int("failed_login_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  lastLoginAt: timestamp("last_login_at"),
  lastLoginIp: varchar("last_login_ip", { length: 45 }),
  requires2fa: boolean("requires_2fa").default(false).notNull(),
  twofaEnabled: boolean("twofa_enabled").default(false).notNull(),
  twofaSecret: text("twofa_secret"),
  twofaMethod: varchar("twofa_method", { length: 20 }),
  twofaBackupCodes: json("twofa_backup_codes"),
  ssoProvider: varchar("sso_provider", { length: 50 }),
  ssoProviderId: varchar("sso_provider_id", { length: 255 }),
  manusOpenId: varchar("manus_open_id", { length: 64 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprUser = typeof pepprUsers.$inferSelect;
export type InsertPepprUser = typeof pepprUsers.$inferInsert;

// ── Peppr User Roles ─────────────────────────────────────────────────────────
export const pepprUserRoles = mysqlTable("peppr_user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  roleId: varchar("role_id", { length: 100 }).notNull(),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  grantedBy: varchar("granted_by", { length: 36 }),
});

export type PepprUserRole = typeof pepprUserRoles.$inferSelect;

// ── SSO Allowlist ────────────────────────────────────────────────────────────
export const pepprSsoAllowlist = mysqlTable("peppr_sso_allowlist", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  note: text("note"),
  addedBy: varchar("added_by", { length: 36 }),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  removedAt: timestamp("removed_at"),
});

export type PepprSsoAllowlistEntry = typeof pepprSsoAllowlist.$inferSelect;

// ── Audit Events ─────────────────────────────────────────────────────────────
export const pepprAuditEvents = mysqlTable("peppr_audit_events", {
  id: int("id").autoincrement().primaryKey(),
  actorType: varchar("actor_type", { length: 20 }).default("USER").notNull(),
  actorId: varchar("actor_id", { length: 36 }),
  action: varchar("action", { length: 50 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: varchar("resource_id", { length: 36 }),
  details: json("details"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PepprAuditEvent = typeof pepprAuditEvents.$inferSelect;