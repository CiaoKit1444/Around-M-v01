/**
 * Staff CRUD — Express routes replacing FastAPI /v1/staff/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprStaffMembers, pepprStaffPositions, pepprUsers, pepprProperties,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF POSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/positions", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (p.search) conditions.push(like(pepprStaffPositions.title, `%${p.search}%`));
  if (req.query.department) conditions.push(eq(pepprStaffPositions.department, req.query.department as string));
  if (req.query.property_id) conditions.push(eq(pepprStaffPositions.propertyId, req.query.property_id as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprStaffPositions, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db.select().from(pepprStaffPositions).where(where)
    .orderBy(orderFn(pepprStaffPositions.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  // Count members per position
  const memberCounts = await db
    .select({ positionId: pepprStaffMembers.positionId, count: sql<number>`count(*)` })
    .from(pepprStaffMembers).groupBy(pepprStaffMembers.positionId);
  const countMap = new Map(memberCounts.map((r: any) => [r.positionId, Number(r.count)]));

  const items = rows.map((r) => ({
    id: r.id, title: r.title, department: r.department,
    property_id: r.propertyId || null, members_count: countMap.get(r.id) || 0,
    status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/positions/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprStaffPositions).where(eq(pepprStaffPositions.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Position not found" }); return; }

  const memberCount = await countRows(db, pepprStaffMembers, eq(pepprStaffMembers.positionId, req.params.id));
  const r = rows[0];
  res.json({
    id: r.id, title: r.title, department: r.department,
    property_id: r.propertyId || null, members_count: memberCount, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.post("/positions", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { title, department, property_id } = req.body;
  if (!title || !department) { res.status(400).json({ detail: "title and department are required" }); return; }

  const id = generateId();
  await db.insert(pepprStaffPositions).values({
    id, title, department, propertyId: property_id || null,
  });

  const created = await db.select().from(pepprStaffPositions).where(eq(pepprStaffPositions.id, id)).limit(1);
  const r = created[0]!;
  res.status(201).json({
    id: r.id, title: r.title, department: r.department,
    property_id: r.propertyId || null, members_count: 0, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.put("/positions/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprStaffPositions).where(eq(pepprStaffPositions.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Position not found" }); return; }

  const updates: Record<string, any> = {};
  if (req.body.title !== undefined) updates.title = req.body.title;
  if (req.body.department !== undefined) updates.department = req.body.department;
  if (req.body.property_id !== undefined) updates.propertyId = req.body.property_id;
  if (req.body.status !== undefined) updates.status = req.body.status;

  if (Object.keys(updates).length > 0) {
    await db.update(pepprStaffPositions).set(updates).where(eq(pepprStaffPositions.id, req.params.id));
  }

  const updated = await db.select().from(pepprStaffPositions).where(eq(pepprStaffPositions.id, req.params.id)).limit(1);
  const memberCount = await countRows(db, pepprStaffMembers, eq(pepprStaffMembers.positionId, req.params.id));
  const r = updated[0]!;
  res.json({
    id: r.id, title: r.title, department: r.department,
    property_id: r.propertyId || null, members_count: memberCount, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF MEMBERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/members", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (req.query.property_id) conditions.push(eq(pepprStaffMembers.propertyId, req.query.property_id as string));
  if (req.query.position_id) conditions.push(eq(pepprStaffMembers.positionId, req.query.position_id as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprStaffMembers, where);
  const rows = await db.select().from(pepprStaffMembers).where(where)
    .orderBy(desc(pepprStaffMembers.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  // Enrich with user, position, property names
  const items = await Promise.all(rows.map(async (r) => {
    const userRows = await db.select({ fullName: pepprUsers.fullName, email: pepprUsers.email })
      .from(pepprUsers).where(eq(pepprUsers.userId, r.userId)).limit(1);
    const posRows = await db.select({ title: pepprStaffPositions.title, department: pepprStaffPositions.department })
      .from(pepprStaffPositions).where(eq(pepprStaffPositions.id, r.positionId)).limit(1);
    const propRows = await db.select({ name: pepprProperties.name })
      .from(pepprProperties).where(eq(pepprProperties.id, r.propertyId)).limit(1);

    return {
      id: r.id, user_id: r.userId, position_id: r.positionId, property_id: r.propertyId,
      user_name: userRows[0]?.fullName || null, user_email: userRows[0]?.email || null,
      position_title: posRows[0]?.title || null, department: posRows[0]?.department || null,
      property_name: propRows[0]?.name || null, status: r.status,
      created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
    };
  }));

  res.json(paginatedResponse(items, total, p));
}));

router.get("/members/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Staff member not found" }); return; }

  const r = rows[0];
  const userRows = await db.select({ fullName: pepprUsers.fullName, email: pepprUsers.email })
    .from(pepprUsers).where(eq(pepprUsers.userId, r.userId)).limit(1);
  const posRows = await db.select({ title: pepprStaffPositions.title, department: pepprStaffPositions.department })
    .from(pepprStaffPositions).where(eq(pepprStaffPositions.id, r.positionId)).limit(1);
  const propRows = await db.select({ name: pepprProperties.name })
    .from(pepprProperties).where(eq(pepprProperties.id, r.propertyId)).limit(1);

  res.json({
    id: r.id, user_id: r.userId, position_id: r.positionId, property_id: r.propertyId,
    user_name: userRows[0]?.fullName || null, user_email: userRows[0]?.email || null,
    position_title: posRows[0]?.title || null, department: posRows[0]?.department || null,
    property_name: propRows[0]?.name || null, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.post("/members", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { user_id, position_id, property_id } = req.body;
  if (!user_id || !position_id || !property_id) {
    res.status(400).json({ detail: "user_id, position_id, property_id are required" }); return;
  }

  const id = generateId();
  await db.insert(pepprStaffMembers).values({
    id, userId: user_id, positionId: position_id, propertyId: property_id,
  });

  const created = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.id, id)).limit(1);
  const r = created[0]!;
  const userRows = await db.select({ fullName: pepprUsers.fullName, email: pepprUsers.email })
    .from(pepprUsers).where(eq(pepprUsers.userId, r.userId)).limit(1);
  const posRows = await db.select({ title: pepprStaffPositions.title, department: pepprStaffPositions.department })
    .from(pepprStaffPositions).where(eq(pepprStaffPositions.id, r.positionId)).limit(1);
  const propRows = await db.select({ name: pepprProperties.name })
    .from(pepprProperties).where(eq(pepprProperties.id, r.propertyId)).limit(1);

  res.status(201).json({
    id: r.id, user_id: r.userId, position_id: r.positionId, property_id: r.propertyId,
    user_name: userRows[0]?.fullName || null, user_email: userRows[0]?.email || null,
    position_title: posRows[0]?.title || null, department: posRows[0]?.department || null,
    property_name: propRows[0]?.name || null, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.put("/members/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Staff member not found" }); return; }

  const updates: Record<string, any> = {};
  if (req.body.user_id !== undefined) updates.userId = req.body.user_id;
  if (req.body.position_id !== undefined) updates.positionId = req.body.position_id;
  if (req.body.property_id !== undefined) updates.propertyId = req.body.property_id;
  if (req.body.status !== undefined) updates.status = req.body.status;

  if (Object.keys(updates).length > 0) {
    await db.update(pepprStaffMembers).set(updates).where(eq(pepprStaffMembers.id, req.params.id));
  }

  const updated = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.id, req.params.id)).limit(1);
  const r = updated[0]!;
  res.json({
    id: r.id, user_id: r.userId, position_id: r.positionId, property_id: r.propertyId,
    status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

router.post("/members/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprStaffMembers).set({ status: "inactive" }).where(eq(pepprStaffMembers.id, req.params.id));
  const updated = await db.select().from(pepprStaffMembers).where(eq(pepprStaffMembers.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Staff member not found" }); return; }
  res.json({ id: updated[0].id, status: updated[0].status });
}));

export default router;
