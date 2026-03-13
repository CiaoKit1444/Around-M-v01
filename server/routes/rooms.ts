/**
 * Rooms CRUD — Express routes replacing FastAPI /v1/rooms/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprRooms, pepprProperties, pepprServiceTemplates, pepprQrCodes,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";

const router = Router();

async function formatRoom(db: any, r: any) {
  const propRows = await db.select({ name: pepprProperties.name }).from(pepprProperties).where(eq(pepprProperties.id, r.propertyId)).limit(1);
  let templateName: string | null = null;
  if (r.templateId) {
    const tRows = await db.select({ name: pepprServiceTemplates.name }).from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, r.templateId)).limit(1);
    templateName = tRows[0]?.name || null;
  }
  const qrRows = await db.select({ id: pepprQrCodes.id }).from(pepprQrCodes).where(and(eq(pepprQrCodes.roomId, r.id), eq(pepprQrCodes.status, "active"))).limit(1);
  return {
    id: r.id, property_id: r.propertyId, property_name: propRows[0]?.name || null,
    room_number: r.roomNumber, floor: r.floor || null, zone: r.zone || null,
    room_type: r.roomType, template_id: r.templateId || null, template_name: templateName,
    qr_code_id: qrRows[0]?.id || null, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  };
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (p.search) conditions.push(like(pepprRooms.roomNumber, `%${p.search}%`));
  if (req.query.property_id) conditions.push(eq(pepprRooms.propertyId, req.query.property_id as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprRooms, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;
  const rows = await db.select().from(pepprRooms).where(where)
    .orderBy(orderFn(pepprRooms.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = await Promise.all(rows.map((r: any) => formatRoom(db, r)));
  res.json(paginatedResponse(items, total, p));
}));

// ── GET BY ID ────────────────────────────────────────────────────────────────
router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprRooms).where(eq(pepprRooms.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Room not found" }); return; }
  res.json(await formatRoom(db, rows[0]));
}));

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { property_id, room_number, floor, zone, room_type } = req.body;
  if (!property_id || !room_number || !room_type) {
    res.status(400).json({ detail: "property_id, room_number, room_type are required" }); return;
  }

  const id = generateId();
  await db.insert(pepprRooms).values({
    id, propertyId: property_id, roomNumber: room_number,
    floor: floor || null, zone: zone || null, roomType: room_type,
  });

  const created = await db.select().from(pepprRooms).where(eq(pepprRooms.id, id)).limit(1);
  res.status(201).json(await formatRoom(db, created[0]));
}));

// ── BULK CREATE ──────────────────────────────────────────────────────────────
router.post("/bulk", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { property_id, rooms } = req.body;
  if (!property_id || !Array.isArray(rooms) || rooms.length === 0) {
    res.status(400).json({ detail: "property_id and rooms array are required" }); return;
  }

  const ids: string[] = [];
  for (const room of rooms) {
    const id = generateId();
    ids.push(id);
    await db.insert(pepprRooms).values({
      id, propertyId: room.property_id || property_id,
      roomNumber: room.room_number, floor: room.floor || null,
      zone: room.zone || null, roomType: room.room_type,
    });
  }

  const created = [];
  for (const id of ids) {
    const rows = await db.select().from(pepprRooms).where(eq(pepprRooms.id, id)).limit(1);
    if (rows[0]) created.push(await formatRoom(db, rows[0]));
  }
  res.status(201).json(created);
}));

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprRooms).where(eq(pepprRooms.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Room not found" }); return; }

  const fields: Record<string, string> = {
    property_id: "propertyId", room_number: "roomNumber", floor: "floor",
    zone: "zone", room_type: "roomType", status: "status",
  };
  const updates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) updates[dbKey] = req.body[bodyKey];
  }

  if (Object.keys(updates).length > 0) {
    await db.update(pepprRooms).set(updates).where(eq(pepprRooms.id, req.params.id));
  }

  const updated = await db.select().from(pepprRooms).where(eq(pepprRooms.id, req.params.id)).limit(1);
  res.json(await formatRoom(db, updated[0]));
}));

// ── ASSIGN TEMPLATE ──────────────────────────────────────────────────────────
router.post("/:id/template", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { template_id } = req.body;
  if (!template_id) { res.status(400).json({ detail: "template_id is required" }); return; }

  await db.update(pepprRooms).set({ templateId: template_id }).where(eq(pepprRooms.id, req.params.id));
  const updated = await db.select().from(pepprRooms).where(eq(pepprRooms.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Room not found" }); return; }
  res.json(await formatRoom(db, updated[0]));
}));

// ── BULK ASSIGN TEMPLATE ─────────────────────────────────────────────────────
router.post("/bulk-assign-template", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { room_ids, template_id } = req.body;
  if (!Array.isArray(room_ids) || !template_id) {
    res.status(400).json({ detail: "room_ids and template_id are required" }); return;
  }

  for (const roomId of room_ids) {
    await db.update(pepprRooms).set({ templateId: template_id }).where(eq(pepprRooms.id, roomId));
  }
  res.json({ success: true });
}));

// ── REMOVE TEMPLATE ──────────────────────────────────────────────────────────
router.delete("/:id/template", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprRooms).set({ templateId: null }).where(eq(pepprRooms.id, req.params.id));
  const updated = await db.select().from(pepprRooms).where(eq(pepprRooms.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Room not found" }); return; }
  res.json(await formatRoom(db, updated[0]));
}));

// ── DEACTIVATE ───────────────────────────────────────────────────────────────
router.post("/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprRooms).set({ status: "inactive" }).where(eq(pepprRooms.id, req.params.id));
  const updated = await db.select().from(pepprRooms).where(eq(pepprRooms.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Room not found" }); return; }
  res.json(await formatRoom(db, updated[0]));
}));

export default router;
