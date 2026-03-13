/**
 * Admin routes — Audit log, SSO allowlist, user management
 * Replaces FastAPI /v1/admin/*, /v1/audit/*, /v1/sso-allowlist/*, /v1/users/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, desc, asc, sql, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprAuditEvents, pepprSsoAllowlist, pepprUsers, pepprUserRoles,
  pepprStaffMembers, pepprStaffPositions,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler, getClientIp,
} from "./_helpers";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/audit", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (req.query.actor_id) conditions.push(eq(pepprAuditEvents.actorId, req.query.actor_id as string));
  if (req.query.action) conditions.push(eq(pepprAuditEvents.action, req.query.action as string));
  if (req.query.resource_type) conditions.push(eq(pepprAuditEvents.resourceType, req.query.resource_type as string));
  if (p.search) {
    conditions.push(or(
      like(pepprAuditEvents.action, `%${p.search}%`),
      like(pepprAuditEvents.resourceType, `%${p.search}%`),
    ));
  }
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprAuditEvents, where);
  const rows = await db.select().from(pepprAuditEvents).where(where)
    .orderBy(desc(pepprAuditEvents.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  // Enrich with actor names
  const actorIds = Array.from(new Set(rows.map((r) => r.actorId).filter(Boolean)));
  let actorMap = new Map<string, string>();
  if (actorIds.length) {
    const actors = await db.select({ userId: pepprUsers.userId, fullName: pepprUsers.fullName })
      .from(pepprUsers);
    actorMap = new Map(actors.map((a: any) => [a.userId, a.fullName]));
  }

  const items = rows.map((r) => ({
    id: r.id, actor_type: r.actorType, actor_id: r.actorId || null,
    actor_name: (r.actorId ? actorMap.get(r.actorId) : null) || null,
    action: r.action, resource_type: r.resourceType || null,
    resource_id: r.resourceId || null, details: r.details || null,
    ip_address: r.ipAddress || null, user_agent: r.userAgent || null,
    created_at: r.createdAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

// Helper to log audit events
export async function logAuditEvent(params: {
  actorType?: string; actorId?: string; action: string;
  resourceType?: string; resourceId?: string; details?: any;
  ipAddress?: string; userAgent?: string;
}) {
  try {
    const db = await getDb();
    if (!db) return;
    await db.insert(pepprAuditEvents).values({
      actorType: params.actorType || "USER",
      actorId: params.actorId || null,
      action: params.action,
      resourceType: params.resourceType || null,
      resourceId: params.resourceId || null,
      details: params.details || null,
      ipAddress: params.ipAddress || null,
      userAgent: params.userAgent || null,
    });
  } catch (e) {
    console.error("[Audit] Failed to log event:", e);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SSO ALLOWLIST
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/sso-allowlist", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (p.search) conditions.push(like(pepprSsoAllowlist.email, `%${p.search}%`));
  if (req.query.status) conditions.push(eq(pepprSsoAllowlist.status, req.query.status as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprSsoAllowlist, where);
  const rows = await db.select().from(pepprSsoAllowlist).where(where)
    .orderBy(desc(pepprSsoAllowlist.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = rows.map((r) => ({
    entry_id: String(r.id), email: r.email, note: r.note || null,
    is_active: r.status === "ACTIVE", created_by: r.addedBy || null,
    status: r.status,
    created_at: r.createdAt?.toISOString(), removed_at: r.removedAt?.toISOString() || null,
  }));
  res.json({ items, total });
}));

router.post("/sso-allowlist", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { email, note } = req.body;
  if (!email) { res.status(400).json({ detail: "email is required" }); return; }

  const user = (req as any).pepprUser;
  await db.insert(pepprSsoAllowlist).values({
    email: email.toLowerCase(), note: note || null, addedBy: user?.sub || null,
  });

  await logAuditEvent({
    actorId: user?.sub, action: "SSO_ALLOWLIST_ADD",
    resourceType: "SSO_ALLOWLIST", details: { email },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
  });

  res.status(201).json({ success: true, email });
}));

router.post("/sso-allowlist/bulk", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { emails, note } = req.body;
  if (!Array.isArray(emails)) { res.status(400).json({ detail: "emails array is required" }); return; }

  const user = (req as any).pepprUser;
  const results = [];
  for (const email of emails) {
    try {
      await db.insert(pepprSsoAllowlist).values({
        email: email.toLowerCase(), note: note || null, addedBy: user?.sub || null,
      });
      results.push({ email, success: true });
    } catch {
      results.push({ email, success: false, error: "Duplicate or invalid" });
    }
  }

  res.status(201).json({ results });
}));

router.delete("/sso-allowlist/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprSsoAllowlist).set({
    status: "REMOVED", removedAt: new Date(),
  }).where(eq(pepprSsoAllowlist.id, parseInt(req.params.id)));

  const user = (req as any).pepprUser;
  await logAuditEvent({
    actorId: user?.sub, action: "SSO_ALLOWLIST_REMOVE",
    resourceType: "SSO_ALLOWLIST", resourceId: req.params.id,
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
  });

  res.json({ success: true });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// USERS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/users", requireAuth, asyncHandler(async (req: Request, res: Response) => {
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
    user_id: r.userId, email: r.email, full_name: r.fullName,
    mobile: r.mobile || null, role: r.role,
    position_id: r.positionId || null, partner_id: r.partnerId || null,
    property_id: r.propertyId || null, email_verified: r.emailVerified,
    status: r.status, sso_provider: r.ssoProvider || null,
    last_login_at: r.lastLoginAt?.toISOString() || null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/users/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprUsers).where(eq(pepprUsers.userId, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "User not found" }); return; }

  const r = rows[0];
  // Get roles
  const roles = await db.select().from(pepprUserRoles).where(eq(pepprUserRoles.userId, r.userId));
  // Get staff assignments
  const staffAssignments = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.userId, r.userId));

  res.json({
    user_id: r.userId, email: r.email, full_name: r.fullName,
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
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.put("/users/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprUsers).where(eq(pepprUsers.userId, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "User not found" }); return; }

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
    user_id: r.userId, email: r.email, full_name: r.fullName,
    mobile: r.mobile || null, role: r.role, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.post("/users/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
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

router.post("/users/:id/activate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprUsers).set({ status: "ACTIVE" }).where(eq(pepprUsers.userId, req.params.id));
  res.json({ success: true });
}));

// ── ROLE MANAGEMENT ──────────────────────────────────────────────────────────
router.post("/users/:id/roles", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { role_id } = req.body;
  if (!role_id) { res.status(400).json({ detail: "role_id is required" }); return; }

  const user = (req as any).pepprUser;
    await db.insert(pepprUserRoles).values({
      userId: req.params.id, roleId: role_id, grantedBy: user?.sub || undefined,
    });

    await logAuditEvent({
      actorId: user?.sub, action: "ROLE_GRANT",
      resourceType: "USER", resourceId: req.params.id,
      details: { role_id },
      ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
    });

  res.status(201).json({ success: true });
}));

router.delete("/users/:id/roles/:roleId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.delete(pepprUserRoles).where(
    and(eq(pepprUserRoles.userId, req.params.id), eq(pepprUserRoles.roleId, req.params.roleId))
  );

  const user = (req as any).pepprUser;
    await logAuditEvent({
      actorId: user?.sub, action: "ROLE_REVOKE",
      resourceType: "USER", resourceId: req.params.id,
      details: { role_id: req.params.roleId },
      ipAddress: getClientIp(req), userAgent: req.headers["user-agent"] || undefined,
    });

  res.json({ success: true });
}));

export default router;
