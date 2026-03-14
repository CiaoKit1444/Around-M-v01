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
router.post("/invite", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { email, name, role, partner_id, property_id } = req.body;
  if (!email || !name) {
    res.status(400).json({ detail: "email and name are required" }); return;
  }

  // Check for duplicate email
  const existing = await db.select({ userId: pepprUsers.userId })
    .from(pepprUsers).where(eq(pepprUsers.email, email.toLowerCase())).limit(1);
  if (existing[0]) {
    res.status(409).json({ detail: "A user with this email already exists" }); return;
  }

  const { nanoid } = await import("nanoid");
  const userId = nanoid(12);
  // Generate a secure temporary password
  const tempPassword = nanoid(16);
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db.insert(pepprUsers).values({
    userId,
    email: email.toLowerCase(),
    passwordHash,
    fullName: name,
    role: (role || "STAFF").toUpperCase(),
    partnerId: partner_id || null,
    propertyId: property_id || null,
    emailVerified: false,
    status: "ACTIVE",
  });

  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorId: actor?.sub, action: "USER_INVITE",
    resourceType: "USER", resourceId: userId,
    details: { email, name, role: (role || "STAFF").toUpperCase() },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
  });

  res.status(201).json({
    id: userId, user_id: userId, email: email.toLowerCase(),
    name, full_name: name,
    role: (role || "STAFF").toUpperCase(),
    status: "ACTIVE",
    partner_id: partner_id || null,
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
    roles: roles.map((rl) => ({ id: rl.id, role_id: rl.roleId, granted_at: rl.grantedAt?.toISOString() })),
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
