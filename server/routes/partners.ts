/**
 * Partners CRUD — Express routes for /v1/partners/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, sql, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import { pepprPartners, pepprProperties } from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";

const router = Router();

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (p.search) {
    conditions.push(like(pepprPartners.name, `%${p.search}%`));
  }
  const where = conditions.length ? conditions[0] : undefined;

  const total = await countRows(db, pepprPartners, where);
  const orderCol = p.sortBy === "name" ? pepprPartners.name : pepprPartners.createdAt;
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db
    .select()
    .from(pepprPartners)
    .where(where)
    .orderBy(orderFn(orderCol))
    .limit(p.pageSize)
    .offset((p.page - 1) * p.pageSize);

  // Count properties per partner
  const propCounts = await db
    .select({
      partnerId: pepprProperties.partnerId,
      count: sql<number>`count(*)`,
    })
    .from(pepprProperties)
    .groupBy(pepprProperties.partnerId);

  const countMap = new Map(propCounts.map((r) => [r.partnerId, Number(r.count)]));

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone || null,
    address: r.address || null,
    contact_person: r.contactPerson || null,
    status: r.status,
    properties_count: countMap.get(r.id) || 0,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  }));

  res.json(paginatedResponse(items, total, p));
}));

// ── GET BY ID ────────────────────────────────────────────────────────────────
router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprPartners).where(eq(pepprPartners.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Partner not found" }); return; }

  const r = rows[0];
  const propCount = await countRows(db, pepprProperties, eq(pepprProperties.partnerId, r.id));

  res.json({
    id: r.id, name: r.name, email: r.email,
    phone: r.phone || null, address: r.address || null,
    contact_person: r.contactPerson || null, status: r.status,
    properties_count: propCount,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { name, email, phone, address, contact_person } = req.body;
  if (!name || !email) { res.status(400).json({ detail: "Name and email are required" }); return; }

  const id = generateId();
  await db.insert(pepprPartners).values({
    id, name, email,
    phone: phone || null,
    address: address || null,
    contactPerson: contact_person || null,
  });

  const created = await db.select().from(pepprPartners).where(eq(pepprPartners.id, id)).limit(1);
  const r = created[0]!;
  res.status(201).json({
    id: r.id, name: r.name, email: r.email,
    phone: r.phone || null, address: r.address || null,
    contact_person: r.contactPerson || null, status: r.status,
    properties_count: 0,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprPartners).where(eq(pepprPartners.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Partner not found" }); return; }

  const { name, email, phone, address, contact_person, status } = req.body;
  const updates: Record<string, any> = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (phone !== undefined) updates.phone = phone;
  if (address !== undefined) updates.address = address;
  if (contact_person !== undefined) updates.contactPerson = contact_person;
  if (status !== undefined) updates.status = status;

  if (Object.keys(updates).length > 0) {
    await db.update(pepprPartners).set(updates).where(eq(pepprPartners.id, req.params.id));
  }

  const updated = await db.select().from(pepprPartners).where(eq(pepprPartners.id, req.params.id)).limit(1);
  const r = updated[0]!;
  const propCount = await countRows(db, pepprProperties, eq(pepprProperties.partnerId, r.id));
  res.json({
    id: r.id, name: r.name, email: r.email,
    phone: r.phone || null, address: r.address || null,
    contact_person: r.contactPerson || null, status: r.status,
    properties_count: propCount,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── DEACTIVATE ───────────────────────────────────────────────────────────────
router.post("/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprPartners).where(eq(pepprPartners.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Partner not found" }); return; }

  await db.update(pepprPartners).set({ status: "inactive" }).where(eq(pepprPartners.id, req.params.id));

  const updated = await db.select().from(pepprPartners).where(eq(pepprPartners.id, req.params.id)).limit(1);
  const r = updated[0]!;
  res.json({
    id: r.id, name: r.name, email: r.email,
    phone: r.phone || null, address: r.address || null,
    contact_person: r.contactPerson || null, status: r.status,
    properties_count: 0,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── DELETE (for test cleanup / admin hard delete) ────────────────────────────
router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprPartners).where(eq(pepprPartners.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Partner not found" }); return; }

  await db.delete(pepprPartners).where(eq(pepprPartners.id, req.params.id));
  res.json({ success: true, id: req.params.id });
}));

export default router;
