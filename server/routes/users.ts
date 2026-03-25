/**
 * Users routes — Exposes user management at /api/v1/users/*
 * Delegates to the admin router's user handlers.
 *
 * The frontend calls /api/v1/users/* but the admin router registers
 * handlers under /users/* (mounted at /api/v1/admin). This router
 * re-exposes those same handlers at the /api/v1/users prefix.
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, desc, asc, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb } from "../db";
import {
  pepprUsers, pepprUserRoles, pepprStaffMembers,
} from "../../drizzle/schema";
import {
  parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler, getClientIp,
} from "./_helpers";
import { logAuditEvent } from "./admin";
import { sendWelcomeEmail } from "../email";

const router = Router();

// GET /api/v1/users — list users
router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (p.search) {
    conditions.push(or(
      like(pepprUsers.fullName, `%${p.search}%`),
      like(pepprUsers.email, `%${p.search}%`),
    ));
  }
  if (req.query.status) conditions.push(eq(pepprUsers.status, req.query.status as string));
  if (req.query.role) conditions.push(eq(pepprUsers.role, req.query.role as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprUsers, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db.select().from(pepprUsers).where(where)
    .orderBy(orderFn(pepprUsers.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = rows.map((r) => ({
    id: r.userId, user_id: r.userId, email: r.email,
    name: r.fullName, full_name: r.fullName,
    mobile: r.mobile || null, role: r.role,
    position_id: r.positionId || null, partner_id: r.partnerId || null,
    property_id: r.propertyId || null, email_verified: r.emailVerified,
    status: r.status, sso_provider: r.ssoProvider || null,
    last_login_at: r.lastLoginAt?.toISOString() || null,
    last_login: r.lastLoginAt?.toISOString() || null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

// POST /api/v1/users/invite — invite a new user
// Accepts either legacy single-role format OR new multi-role format:
//   Legacy:  { email, name, role, partner_id?, property_id? }
//   Multi:   { email, name, role_bindings: [{ role, partner_id?, property_id? }] }
router.post("/invite", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { email, name, role, partner_id, property_id, role_bindings } = req.body;
  if (!email || !name) {
    res.status(400).json({ detail: "email and name are required" }); return;
  }

  // Check for duplicate email first (409 takes priority over 400 scope errors)
  const existing = await db.select({ userId: pepprUsers.userId })
    .from(pepprUsers).where(eq(pepprUsers.email, email.toLowerCase())).limit(1);
  if (existing[0]) {
    res.status(409).json({ detail: "A user with this email already exists" }); return;
  }

  // Normalise role bindings — support both legacy single-role and new multi-role format
  const ROLES_REQUIRING_PARTNER = ["PARTNER_ADMIN"];
  const ROLES_REQUIRING_PROPERTY = ["PROPERTY_ADMIN", "STAFF", "FRONT_OFFICE", "FRONT_DESK", "HOUSEKEEPING", "MAINTENANCE", "REVENUE_MANAGER", "CHANNEL_MANAGER"];

  type RoleBinding = { role: string; partner_id?: string | null; property_id?: string | null };
  let bindings: RoleBinding[] = [];

  if (Array.isArray(role_bindings) && role_bindings.length > 0) {
    // New multi-role format
    bindings = role_bindings.map((b: any) => ({
      role: String(b.role || "STAFF").toUpperCase(),
      partner_id: b.partner_id || null,
      property_id: b.property_id || null,
    }));
  } else {
    // Legacy single-role format
    bindings = [{ role: (role || "STAFF").toUpperCase(), partner_id: partner_id || null, property_id: property_id || null }];
  }

  // Validate each binding
  for (const b of bindings) {
    if (ROLES_REQUIRING_PARTNER.includes(b.role) && !b.partner_id) {
      res.status(400).json({ detail: `Role '${b.role}' requires a partner_id` }); return;
    }
    if (ROLES_REQUIRING_PROPERTY.includes(b.role) && !b.property_id) {
      res.status(400).json({ detail: `Role '${b.role}' requires a property_id` }); return;
    }
  }

  // Primary role = first binding's role (for legacy peppr_users.role field)
  const primaryRole = bindings[0].role;
  const primaryPartnerId = bindings[0].partner_id || null;
  const primaryPropertyId = bindings[0].property_id || null;

  const { nanoid } = await import("nanoid");
  const userId = nanoid(12);
  const tempPassword = nanoid(16);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db.insert(pepprUsers).values({
    userId,
    email: email.toLowerCase(),
    passwordHash,
    fullName: name,
    role: primaryRole,
    partnerId: primaryPartnerId,
    propertyId: primaryPropertyId,
    emailVerified: false,
    status: "ACTIVE",
  });

  // Insert all role bindings into peppr_user_roles
  const actor = (req as any).pepprUser;
  for (const b of bindings) {
    await db.insert(pepprUserRoles).values({
      userId,
      roleId: b.role,
      partnerId: b.partner_id || null,
      propertyId: b.property_id || null,
      grantedBy: actor?.sub || null,
    });
  }

  await logAuditEvent({
    actorId: actor?.sub, action: "USER_INVITE",
    resourceType: "USER", resourceId: userId,
    details: { email, name, role_bindings: bindings },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
  });

  const loginUrl = `${req.headers.origin || req.headers.referer?.replace(/\/[^\/]*$/, "") || "https://bo.peppr.vip"}/login`;
  const invitedByName = actor?.name || actor?.email || undefined;
  sendWelcomeEmail({
    to: email.toLowerCase(),
    userName: name,
    tempPassword,
    loginUrl,
    invitedBy: invitedByName,
  }).catch((err) => console.error("[Invite] Welcome email failed:", err));

  res.status(201).json({
    id: userId, user_id: userId, email: email.toLowerCase(),
    name, full_name: name,
    role: primaryRole,
    role_bindings: bindings,
    status: "ACTIVE",
    partner_id: primaryPartnerId,
    property_id: primaryPropertyId,
    temp_password: tempPassword,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
}));

// GET /api/v1/users/:id — get single user
router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprUsers).where(eq(pepprUsers.userId, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "User not found" }); return; }

  const r = rows[0];
  const roles = await db.select().from(pepprUserRoles).where(eq(pepprUserRoles.userId, r.userId));
  const staffAssignments = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.userId, r.userId));

  res.json({
    id: r.userId, user_id: r.userId, email: r.email,
    name: r.fullName, full_name: r.fullName,
    mobile: r.mobile || null, role: r.role,
    position_id: r.positionId || null, partner_id: r.partnerId || null,
    property_id: r.propertyId || null, email_verified: r.emailVerified,
    status: r.status, sso_provider: r.ssoProvider || null,
    requires_2fa: r.requires2fa, twofa_enabled: r.twofaEnabled,
    roles: roles.map((rl) => ({ id: rl.id, role_id: rl.roleId, partner_id: rl.partnerId || null, property_id: rl.propertyId || null, granted_at: rl.grantedAt?.toISOString() })),
    staff_assignments: staffAssignments.map((sa) => ({
      id: sa.id, position_id: sa.positionId, property_id: sa.propertyId, status: sa.status,
    })),
    last_login_at: r.lastLoginAt?.toISOString() || null,
    last_login: r.lastLoginAt?.toISOString() || null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// PUT /api/v1/users/:id — update user
router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprUsers).where(eq(pepprUsers.userId, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "User not found" }); return; }

  // Accept both `name` (frontend User type) and `full_name` (API schema)
  if (req.body.name !== undefined && req.body.full_name === undefined) {
    req.body.full_name = req.body.name;
  }
  // Normalize role to uppercase (frontend sends lowercase, DB stores uppercase)
  const VALID_ROLES = ["SYSTEM_ADMIN", "SUPER_ADMIN", "ADMIN", "PARTNER_ADMIN", "PROPERTY_ADMIN", "STAFF"];
  const ROLES_REQUIRING_PARTNER = ["PARTNER_ADMIN"];
  const ROLES_REQUIRING_PROPERTY = ["PROPERTY_ADMIN", "STAFF"];
  if (req.body.role !== undefined) {
    const normalized = String(req.body.role).toUpperCase().replace(/[^A-Z_]/g, "");
    if (!VALID_ROLES.includes(normalized)) {
      res.status(400).json({ detail: `Invalid role '${req.body.role}'. Must be one of: ${VALID_ROLES.join(", ")}` });
      return;
    }
    req.body.role = normalized;
    // Role-scope binding: when changing role, ensure required scope is provided
    // Merge with existing user values so partial updates still work
    const effectivePartnerId = req.body.partner_id ?? existing[0].partnerId;
    const effectivePropertyId = req.body.property_id ?? existing[0].propertyId;
    if (ROLES_REQUIRING_PARTNER.includes(normalized) && !effectivePartnerId) {
      res.status(400).json({ detail: `Role '${normalized}' requires a partner_id. Provide partner_id in the request or ensure the user already has one assigned.` });
      return;
    }
    if (ROLES_REQUIRING_PROPERTY.includes(normalized) && !effectivePropertyId) {
      res.status(400).json({ detail: `Role '${normalized}' requires a property_id. Provide property_id in the request or ensure the user already has one assigned.` });
      return;
    }
  }
  const fields: Record<string, string> = {
    full_name: "fullName", mobile: "mobile", role: "role",
    position_id: "positionId", partner_id: "partnerId", property_id: "propertyId",
    status: "status", email_verified: "emailVerified",
  };
  const updates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) updates[dbKey] = req.body[bodyKey];
  }

  if (Object.keys(updates).length > 0) {
    await db.update(pepprUsers).set(updates).where(eq(pepprUsers.userId, req.params.id));
  }

  const updated = await db.select().from(pepprUsers).where(eq(pepprUsers.userId, req.params.id)).limit(1);
  const r = updated[0]!;
  res.json({
    id: r.userId, user_id: r.userId, email: r.email,
    name: r.fullName, full_name: r.fullName,
    mobile: r.mobile || null, role: r.role, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// POST /api/v1/users/:id/deactivate
router.post("/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprUsers).set({ status: "SUSPENDED" }).where(eq(pepprUsers.userId, req.params.id));

  const user = (req as any).pepprUser;
  await logAuditEvent({
    actorId: user?.sub, action: "USER_DEACTIVATE",
    resourceType: "USER", resourceId: req.params.id,
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
  });

  res.json({ success: true });
}));

// POST /api/v1/users/:id/reactivate
router.post("/:id/reactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprUsers).set({ status: "ACTIVE" }).where(eq(pepprUsers.userId, req.params.id));
  res.json({ success: true });
}));

export default router;
