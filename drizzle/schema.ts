import {
  boolean,
  decimal,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing Manus OAuth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  fontSizePref: mysqlEnum("fontSizePref", ["S", "M", "L"]).default("M").notNull(),
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
  resetTokenHash: text("reset_token_hash"),
  resetTokenExpiresAt: timestamp("reset_token_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprUser = typeof pepprUsers.$inferSelect;
export type InsertPepprUser = typeof pepprUsers.$inferInsert;

// ── Peppr User Roles ─────────────────────────────────────────────────────────
// Supports multi-role bindings per user.
// PARTNER_ADMIN roles bind to partner_id; PROPERTY_ADMIN / STAFF / FRONT_OFFICE
// roles bind to property_id. GLOBAL roles (SUPER_ADMIN, SYSTEM_ADMIN, ADMIN)
// leave both null. A user can have multiple rows — one per role-binding.
export const pepprUserRoles = mysqlTable("peppr_user_roles", {
  id: int("id").autoincrement().primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  roleId: varchar("role_id", { length: 100 }).notNull(),
  /** For PARTNER_ADMIN: the partner this binding applies to */
  partnerId: varchar("partner_id", { length: 36 }),
  /** For PROPERTY_ADMIN / STAFF / FRONT_OFFICE etc.: the property this binding applies to */
  propertyId: varchar("property_id", { length: 36 }),
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

// ── Partners ─────────────────────────────────────────────────────────────────
export const pepprPartners = mysqlTable("peppr_partners", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  contactPerson: varchar("contact_person", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprPartner = typeof pepprPartners.$inferSelect;

// ── Properties ───────────────────────────────────────────────────────────────
export const pepprProperties = mysqlTable("peppr_properties", {
  id: varchar("id", { length: 36 }).primaryKey(),
  partnerId: varchar("partner_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).default("UTC").notNull(),
  currency: varchar("currency", { length: 10 }).default("THB").notNull(),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprProperty = typeof pepprProperties.$inferSelect;

// ── Property Configuration ───────────────────────────────────────────────────
export const pepprPropertyConfig = mysqlTable("peppr_property_config", {
  id: int("id").autoincrement().primaryKey(),
  propertyId: varchar("property_id", { length: 36 }).notNull().unique(),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 20 }),
  secondaryColor: varchar("secondary_color", { length: 20 }),
  welcomeMessage: text("welcome_message"),
  qrValidationLimit: int("qr_validation_limit").default(100),
  serviceCatalogLimit: int("service_catalog_limit").default(50),
  requestSubmissionLimit: int("request_submission_limit").default(10),
  enableGuestCancellation: boolean("enable_guest_cancellation").default(true),
  enableAlternativeProposals: boolean("enable_alternative_proposals").default(false),
  enableDirectMessaging: boolean("enable_direct_messaging").default(false),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprPropertyConfig = typeof pepprPropertyConfig.$inferSelect;

// ── Rooms ────────────────────────────────────────────────────────────────────
export const pepprRooms = mysqlTable("peppr_rooms", {
  id: varchar("id", { length: 36 }).primaryKey(),
  propertyId: varchar("property_id", { length: 36 }).notNull(),
  roomNumber: varchar("room_number", { length: 50 }).notNull(),
  floor: varchar("floor", { length: 20 }),
  zone: varchar("zone", { length: 50 }),
  roomType: varchar("room_type", { length: 50 }).notNull(),
  templateId: varchar("template_id", { length: 36 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprRoom = typeof pepprRooms.$inferSelect;

// ── Service Providers ────────────────────────────────────────────────────────
export const pepprServiceProviders = mysqlTable("peppr_service_providers", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  category: varchar("category", { length: 100 }).notNull(),
  serviceArea: varchar("service_area", { length: 255 }).notNull(),
  contactPerson: varchar("contact_person", { length: 255 }),
  rating: decimal("rating", { precision: 3, scale: 2 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprServiceProvider = typeof pepprServiceProviders.$inferSelect;

// ── Catalog Items ────────────────────────────────────────────────────────────
export const pepprCatalogItems = mysqlTable("peppr_catalog_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  providerId: varchar("provider_id", { length: 36 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  sku: varchar("sku", { length: 100 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("THB").notNull(),
  unit: varchar("unit", { length: 50 }).default("each").notNull(),
  durationMinutes: int("duration_minutes"),
  terms: text("terms"),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprCatalogItem = typeof pepprCatalogItems.$inferSelect;

// ── Service Templates ────────────────────────────────────────────────────────
export const pepprServiceTemplates = mysqlTable("peppr_service_templates", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  tier: varchar("tier", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprServiceTemplate = typeof pepprServiceTemplates.$inferSelect;

// ── Template Items (junction: template ↔ catalog item) ───────────────────────
export const pepprTemplateItems = mysqlTable("peppr_template_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  templateId: varchar("template_id", { length: 36 }).notNull(),
  catalogItemId: varchar("catalog_item_id", { length: 36 }).notNull(),
  sortOrder: int("sort_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PepprTemplateItem = typeof pepprTemplateItems.$inferSelect;

// ── Room ↔ Template Assignments ──────────────────────────────────────────────
export const pepprRoomTemplateAssignments = mysqlTable("peppr_room_template_assignments", {
  id: int("id").autoincrement().primaryKey(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  templateId: varchar("template_id", { length: 36 }).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
});

export type PepprRoomTemplateAssignment = typeof pepprRoomTemplateAssignments.$inferSelect;

// ── QR Codes ─────────────────────────────────────────────────────────────────
export const pepprQrCodes = mysqlTable("peppr_qr_codes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  propertyId: varchar("property_id", { length: 36 }).notNull(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  qrCodeId: varchar("qr_code_id", { length: 100 }).notNull().unique(),
  accessType: varchar("access_type", { length: 20 }).default("public").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  lastScanned: timestamp("last_scanned"),
  scanCount: int("scan_count").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  revokedReason: text("revoked_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprQrCode = typeof pepprQrCodes.$inferSelect;

// ── Stay Tokens (for restricted QR access) ───────────────────────────────────
export const pepprStayTokens = mysqlTable("peppr_stay_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 100 }).notNull().unique(),
  propertyId: varchar("property_id", { length: 36 }).notNull(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  roomNumber: varchar("room_number", { length: 50 }),
  expiresAt: timestamp("expires_at").notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PepprStayToken = typeof pepprStayTokens.$inferSelect;

// ── Guest Sessions ───────────────────────────────────────────────────────────
export const pepprGuestSessions = mysqlTable("peppr_guest_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  qrCodeId: varchar("qr_code_id", { length: 36 }).notNull(),
  propertyId: varchar("property_id", { length: 36 }).notNull(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  guestName: varchar("guest_name", { length: 255 }),
  accessType: varchar("access_type", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprGuestSession = typeof pepprGuestSessions.$inferSelect;

// ── Service Requests ─────────────────────────────────────────────────────────
export const pepprServiceRequests = mysqlTable("peppr_service_requests", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestNumber: varchar("request_number", { length: 50 }).notNull().unique(),
  sessionId: varchar("session_id", { length: 36 }).notNull(),
  propertyId: varchar("property_id", { length: 36 }).notNull(),
  roomId: varchar("room_id", { length: 36 }).notNull(),
  guestName: varchar("guest_name", { length: 255 }),
  guestPhone: varchar("guest_phone", { length: 50 }),
  guestNotes: text("guest_notes"),
  preferredDatetime: timestamp("preferred_datetime"),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).default("0").notNull(),
  discountAmount: decimal("discount_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).default("0").notNull(),
  currency: varchar("currency", { length: 10 }).default("THB").notNull(),
  status: varchar("status", { length: 30 }).default("SUBMITTED").notNull(),
  statusReason: text("status_reason"),
  matchingMode: varchar("matching_mode", { length: 10 }).default("auto").notNull(),
  slaDeadline: timestamp("sla_deadline"),
  assignedProviderId: varchar("assigned_provider_id", { length: 36 }),
  autoConfirmed: boolean("auto_confirmed").default(false).notNull(),
  confirmedAt: timestamp("confirmed_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprServiceRequest = typeof pepprServiceRequests.$inferSelect;

// ── Request Items ────────────────────────────────────────────────────────────
export const pepprRequestItems = mysqlTable("peppr_request_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestId: varchar("request_id", { length: 36 }).notNull(),
  itemId: varchar("item_id", { length: 36 }),
  templateItemId: varchar("template_item_id", { length: 36 }),
  itemName: varchar("item_name", { length: 255 }).notNull(),
  itemCategory: varchar("item_category", { length: 100 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 12, scale: 2 }).notNull(),
  quantity: int("quantity").default(1).notNull(),
  includedQuantity: int("included_quantity").default(0).notNull(),
  billableQuantity: int("billable_quantity").default(1).notNull(),
  lineTotal: decimal("line_total", { precision: 12, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 10 }).default("THB").notNull(),
  guestNotes: text("guest_notes"),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PepprRequestItem = typeof pepprRequestItems.$inferSelect;

// ── Staff Positions ──────────────────────────────────────────────────────────
export const pepprStaffPositions = mysqlTable("peppr_staff_positions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  department: varchar("department", { length: 100 }).notNull(),
  propertyId: varchar("property_id", { length: 36 }),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprStaffPosition = typeof pepprStaffPositions.$inferSelect;

// ── Staff Members (junction: user ↔ position ↔ property) ─────────────────────
export const pepprStaffMembers = mysqlTable("peppr_staff_members", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  positionId: varchar("position_id", { length: 36 }).notNull(),
  propertyId: varchar("property_id", { length: 36 }).notNull(),
  status: varchar("status", { length: 20 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprStaffMember = typeof pepprStaffMembers.$inferSelect;

// ── SP Assignments ───────────────────────────────────────────────────────────
// Designed as a list (not a single FK) to support 1:N splitting post-MVP.
// At MVP, only one row per request has is_active = true.
export const pepprSpAssignments = mysqlTable("peppr_sp_assignments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestId: varchar("request_id", { length: 36 }).notNull(),
  providerId: varchar("provider_id", { length: 36 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  estimatedArrival: timestamp("estimated_arrival"),
  assignedStaffName: varchar("assigned_staff_name", { length: 200 }),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprSpAssignment = typeof pepprSpAssignments.$inferSelect;
export type InsertPepprSpAssignment = typeof pepprSpAssignments.$inferInsert;

// ── SP Tickets (Sprint 14: replaces whole-request assignment with per-item tickets) ──
// Each ticket represents a group of request items assigned to one SP.
// Lifecycle: OPEN → CONFIRMED → DISPATCHED → RUNNING ⇄ PENDING → CLOSED
//            OPEN/CONFIRMED/DISPATCHED/RUNNING/PENDING → CANCELLED
export const pepprSpTickets = mysqlTable("peppr_sp_tickets", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestId: varchar("request_id", { length: 36 }).notNull(),
  providerId: varchar("provider_id", { length: 36 }).notNull(),
  itemIds: json("item_ids").default([]), // array of pepprRequestItems.id assigned to this ticket
  status: varchar("status", { length: 20 }).default("OPEN").notNull(),
  spAdminNotes: text("sp_admin_notes"),
  declineReason: text("decline_reason"),
  acceptedAt: timestamp("accepted_at"),
  dispatchedAt: timestamp("dispatched_at"),
  closedAt: timestamp("closed_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprSpTicket = typeof pepprSpTickets.$inferSelect;
export type InsertPepprSpTicket = typeof pepprSpTickets.$inferInsert;

// ── Service Operators (Sprint 14: field staff managed by SP Admin) ────────────
export const pepprServiceOperators = mysqlTable("peppr_service_operators", {
  id: varchar("id", { length: 36 }).primaryKey(),
  providerId: varchar("provider_id", { length: 36 }).notNull(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  displayName: varchar("display_name", { length: 200 }).notNull(),
  specialisation: varchar("specialisation", { length: 50 }).default("GENERAL").notNull(),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull(), // ACTIVE | INACTIVE | ON_DUTY | OFF_DUTY
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprServiceOperator = typeof pepprServiceOperators.$inferSelect;
export type InsertPepprServiceOperator = typeof pepprServiceOperators.$inferInsert;

// ── SO Jobs (Sprint 14: individual job assigned to a Service Operator) ────────
// Stage machine: DISPATCHED → RUNNING ⇄ PENDING → CLOSED | CANCELLED
export const pepprSoJobs = mysqlTable("peppr_so_jobs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ticketId: varchar("ticket_id", { length: 36 }).notNull(),
  operatorId: varchar("operator_id", { length: 36 }).notNull(),
  status: varchar("status", { length: 20 }).default("DISPATCHED").notNull(),
  stageNotes: text("stage_notes"),
  stageHistory: json("stage_history").default([]),
  assignedAt: timestamp("assigned_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprSoJob = typeof pepprSoJobs.$inferSelect;
export type InsertPepprSoJob = typeof pepprSoJobs.$inferInsert;

// ── Payments ─────────────────────────────────────────────────────────────────
export const pepprPayments = mysqlTable("peppr_payments", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestId: varchar("request_id", { length: 36 }).notNull(),
  method: varchar("method", { length: 20 }).notNull(), // omise_qr | promptpay_qr
  amount: varchar("amount", { length: 20 }).notNull(), // decimal string e.g. "350.00"
  currency: varchar("currency", { length: 3 }).default("THB").notNull(),
  gatewayRef: varchar("gateway_ref", { length: 200 }),
  gatewayChargeId: varchar("gateway_charge_id", { length: 200 }),
  status: varchar("status", { length: 20 }).default("PENDING").notNull(), // PENDING | PAID | FAILED | REFUNDED
  qrPayload: text("qr_payload"),
  qrDataUrl: text("qr_data_url"),
  expiresAt: timestamp("expires_at"),
  paidAt: timestamp("paid_at"),
  confirmedAt: timestamp("confirmed_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PepprPayment = typeof pepprPayments.$inferSelect;
export type InsertPepprPayment = typeof pepprPayments.$inferInsert;

// ── Request Events (append-only audit log) ───────────────────────────────────
export const pepprRequestEvents = mysqlTable("peppr_request_events", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestId: varchar("request_id", { length: 36 }).notNull(),
  fromState: varchar("from_state", { length: 50 }),
  toState: varchar("to_state", { length: 50 }).notNull(),
  actorId: varchar("actor_id", { length: 36 }),
  actorType: varchar("actor_type", { length: 20 }).notNull(), // guest | staff | sp | system
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PepprRequestEvent = typeof pepprRequestEvents.$inferSelect;
export type InsertPepprRequestEvent = typeof pepprRequestEvents.$inferInsert;

// ── Request Notes ────────────────────────────────────────────────────────────
export const pepprRequestNotes = mysqlTable("peppr_request_notes", {
  id: varchar("id", { length: 36 }).primaryKey(),
  requestId: varchar("request_id", { length: 36 }).notNull(),
  authorId: varchar("author_id", { length: 36 }),
  authorType: varchar("author_type", { length: 20 }).notNull(), // staff | sp | system
  content: text("content").notNull(),
  isInternal: boolean("is_internal").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PepprRequestNote = typeof pepprRequestNotes.$inferSelect;
export type InsertPepprRequestNote = typeof pepprRequestNotes.$inferInsert;
