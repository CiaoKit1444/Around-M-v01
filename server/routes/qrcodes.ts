/**
 * QR Codes CRUD — Express routes for /v1/qr-codes/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprQrCodes, pepprRooms, pepprProperties, pepprStayTokens,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";
import { nanoid } from "nanoid";
import { logAuditEvent } from "./admin";
import { getClientIp } from "./_helpers";

const router = Router();

function formatQr(r: any, extra: Record<string, any> = {}) {
  return {
    id: r.id, property_id: r.propertyId, room_id: r.roomId,
    qr_code_id: r.qrCodeId, access_type: r.accessType, status: r.status,
    last_scanned: r.lastScanned?.toISOString() || null,
    scan_count: r.scanCount, expires_at: r.expiresAt?.toISOString() || null,
    revoked_reason: r.revokedReason || null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
    ...extra,
  };
}

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (req.query.property_id) conditions.push(eq(pepprQrCodes.propertyId, req.query.property_id as string));
  if (req.query.room_id) conditions.push(eq(pepprQrCodes.roomId, req.query.room_id as string));
  if (req.query.status) conditions.push(eq(pepprQrCodes.status, req.query.status as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprQrCodes, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db.select().from(pepprQrCodes).where(where)
    .orderBy(orderFn(pepprQrCodes.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = rows.map((r) => formatQr(r));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "QR code not found" }); return; }

  // Get room and property info
  const roomRows = await db.select({ roomNumber: pepprRooms.roomNumber }).from(pepprRooms).where(eq(pepprRooms.id, rows[0].roomId)).limit(1);
  const propRows = await db.select({ name: pepprProperties.name }).from(pepprProperties).where(eq(pepprProperties.id, rows[0].propertyId)).limit(1);

  res.json(formatQr(rows[0], {
    room_number: roomRows[0]?.roomNumber || null,
    property_name: propRows[0]?.name || null,
  }));
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { property_id, room_id, access_type, expires_at } = req.body;
  if (!property_id || !room_id) {
    res.status(400).json({ detail: "property_id and room_id are required" }); return;
  }

  const id = generateId();
  const qrCodeId = `QR-${nanoid(12)}`;
  await db.insert(pepprQrCodes).values({
    id, propertyId: property_id, roomId: room_id, qrCodeId,
    accessType: access_type || "public",
    expiresAt: expires_at ? new Date(expires_at) : null,
  });

  const created = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, id)).limit(1);
  res.status(201).json(formatQr(created[0]));
}));

// ── BULK GENERATE ────────────────────────────────────────────────────────────
router.post("/bulk-generate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { property_id, room_ids, access_type } = req.body;
  if (!property_id || !Array.isArray(room_ids)) {
    res.status(400).json({ detail: "property_id and room_ids are required" }); return;
  }

  const results = [];
  for (const roomId of room_ids) {
    const id = generateId();
    const qrCodeId = `QR-${nanoid(12)}`;
    await db.insert(pepprQrCodes).values({
      id, propertyId: property_id, roomId: roomId, qrCodeId,
      accessType: access_type || "public",
    });
    const created = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, id)).limit(1);
    if (created[0]) results.push(formatQr(created[0]));
  }

  res.status(201).json(results);
}));

// ── REVOKE ───────────────────────────────────────────────────────────────────
router.post("/:id/revoke", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { reason } = req.body;

  // Verify QR code exists before revoking
  const existing = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "QR code not found" }); return; }

  await db.update(pepprQrCodes).set({
    status: "revoked", revokedReason: reason || null,
  }).where(eq(pepprQrCodes.id, req.params.id));

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "QR code not found" }); return; }

  // Audit the revocation
  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorType: "USER",
    actorId: actor?.sub || undefined,
    action: "qr_code_revoked",
    resourceType: "qr_code",
    resourceId: req.params.id,
    details: {
      qr_code_id: existing[0].qrCodeId,
      property_id: existing[0].propertyId,
      room_id: existing[0].roomId,
      reason: reason || null,
    },
    ipAddress: getClientIp(req),
    userAgent: req.headers["user-agent"] || undefined,
  });

  res.json(formatQr(updated[0]));
}));

// ── VALIDATE (public endpoint for guest scanning) ────────────────────────────
router.get("/validate/:qrCodeId", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.qrCodeId, req.params.qrCodeId)).limit(1);
  if (!rows[0]) { res.status(404).json({ valid: false, detail: "QR code not found" }); return; }

  const qr = rows[0];
  if (qr.status !== "active") { res.json({ valid: false, detail: "QR code is not active" }); return; }
  if (qr.expiresAt && qr.expiresAt < new Date()) { res.json({ valid: false, detail: "QR code has expired" }); return; }

  // Update scan count
  await db.update(pepprQrCodes).set({
    scanCount: sql`${pepprQrCodes.scanCount} + 1`,
    lastScanned: new Date(),
  }).where(eq(pepprQrCodes.id, qr.id));

  // Get room and property info
  const roomRows = await db.select().from(pepprRooms).where(eq(pepprRooms.id, qr.roomId)).limit(1);
  const propRows = await db.select().from(pepprProperties).where(eq(pepprProperties.id, qr.propertyId)).limit(1);

  res.json({
    valid: true,
    property_id: qr.propertyId,
    property_name: propRows[0]?.name || null,
    room_id: qr.roomId,
    room_number: roomRows[0]?.roomNumber || null,
    access_type: qr.accessType,
  });
}));

export default router;
