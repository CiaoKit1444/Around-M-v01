/**
 * Property-scoped QR Codes — Express routes for /api/v1/properties/:propertyId/qr/*
 *
 * The frontend qrApi calls paths like:
 *   GET    /api/v1/properties/:propertyId/qr              → list QR codes for property
 *   GET    /api/v1/properties/:propertyId/qr/:qrCodeId    → get single QR code
 *   POST   /api/v1/properties/:propertyId/qr/generate     → bulk generate QR codes
 *   PUT    /api/v1/properties/:propertyId/qr/:qrCodeId/access-type
 *   POST   /api/v1/properties/:propertyId/qr/:qrCodeId/activate
 *   POST   /api/v1/properties/:propertyId/qr/:qrCodeId/deactivate
 *   POST   /api/v1/properties/:propertyId/qr/:qrCodeId/suspend
 *   POST   /api/v1/properties/:propertyId/qr/:qrCodeId/resume
 *   POST   /api/v1/properties/:propertyId/qr/:qrCodeId/revoke
 *   POST   /api/v1/properties/:propertyId/qr/:qrCodeId/extend
 *   POST   /api/v1/properties/:propertyId/qr/room-change
 *   GET    /api/v1/properties/:propertyId/qr/tokens/active
 *
 * This router is mounted at /api/v1/properties/:propertyId/qr
 * so all paths below are relative to that mount.
 */
import { Router, type Request, type Response } from "express";
import { eq, and, desc, asc, sql, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprQrCodes, pepprRooms, pepprProperties, pepprStayTokens,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler, getClientIp,
} from "./_helpers";
import { nanoid } from "nanoid";
import { logAuditEvent } from "./admin";

const router = Router({ mergeParams: true });

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

/** Helper: find QR code by DB id (UUID) scoped to property */
async function findQr(db: any, propertyId: string, qrId: string) {
  // Try by DB id first, then by qr_code_id
  let rows = await db.select().from(pepprQrCodes)
    .where(and(eq(pepprQrCodes.propertyId, propertyId), eq(pepprQrCodes.id, qrId)))
    .limit(1);
  if (!rows[0]) {
    rows = await db.select().from(pepprQrCodes)
      .where(and(eq(pepprQrCodes.propertyId, propertyId), eq(pepprQrCodes.qrCodeId, qrId)))
      .limit(1);
  }
  return rows[0] || null;
}

/** Helper: enrich QR with room/property names */
async function enrichQr(db: any, qr: any) {
  const roomRows = await db.select({ roomNumber: pepprRooms.roomNumber })
    .from(pepprRooms).where(eq(pepprRooms.id, qr.roomId)).limit(1);
  const propRows = await db.select({ name: pepprProperties.name })
    .from(pepprProperties).where(eq(pepprProperties.id, qr.propertyId)).limit(1);
  return formatQr(qr, {
    room_number: roomRows[0]?.roomNumber || null,
    property_name: propRows[0]?.name || null,
  });
}

// ── LIST ─────────────────────────────────────────────────────────────────────
router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const propertyId = req.params.propertyId;
  const p = parsePagination(req);
  const conditions: any[] = [eq(pepprQrCodes.propertyId, propertyId)];
  if (req.query.room_id) conditions.push(eq(pepprQrCodes.roomId, req.query.room_id as string));
  if (req.query.status) conditions.push(eq(pepprQrCodes.status, req.query.status as string));
  if (req.query.access_type) conditions.push(eq(pepprQrCodes.accessType, req.query.access_type as string));
  const where = conditions.length === 1 ? conditions[0] : and(...conditions);

  const total = await countRows(db, pepprQrCodes, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;
  const rows = await db.select().from(pepprQrCodes).where(where)
    .orderBy(orderFn(pepprQrCodes.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  // Enrich with room numbers
  const roomIds = Array.from(new Set(rows.map((r: any) => r.roomId)));
  const roomMap = new Map<string, string>();
  if (roomIds.length > 0) {
    const roomRows = await db.select({ id: pepprRooms.id, roomNumber: pepprRooms.roomNumber })
      .from(pepprRooms).where(or(...roomIds.map((id: string) => eq(pepprRooms.id, id))));
    roomRows.forEach((r: any) => roomMap.set(r.id, r.roomNumber));
  }

  const propRows = await db.select({ name: pepprProperties.name })
    .from(pepprProperties).where(eq(pepprProperties.id, propertyId)).limit(1);
  const propertyName = propRows[0]?.name || null;

  const items = rows.map((r: any) => formatQr(r, {
    room_number: roomMap.get(r.roomId) || null,
    property_name: propertyName,
  }));
  res.json(paginatedResponse(items, total, p));
}));

// ── ACTIVE TOKENS ────────────────────────────────────────────────────────────
router.get("/tokens/active", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const propertyId = req.params.propertyId;
  const rows = await db.select().from(pepprStayTokens)
    .where(and(
      eq(pepprStayTokens.propertyId, propertyId),
      eq(pepprStayTokens.status, "active"),
    ))
    .orderBy(desc(pepprStayTokens.createdAt));

  const tokens = rows.map((r: any) => ({
    token: r.token,
    room_number: r.roomNumber || null,
    expires_at: r.expiresAt?.toISOString() || null,
  }));
  res.json({ tokens });
}));

// ── GENERATE (bulk) ──────────────────────────────────────────────────────────
router.post("/generate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const propertyId = req.params.propertyId;
  const { room_ids, access_type } = req.body;
  if (!Array.isArray(room_ids) || room_ids.length === 0) {
    res.status(400).json({ detail: "room_ids array is required" }); return;
  }

  const results = [];
  for (const roomId of room_ids) {
    const id = generateId();
    const qrCodeId = `QR-${nanoid(12)}`;
    await db.insert(pepprQrCodes).values({
      id, propertyId, roomId, qrCodeId,
      accessType: access_type || "public",
    });
    const created = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, id)).limit(1);
    if (created[0]) results.push(formatQr(created[0]));
  }

  res.status(201).json(results);
}));

// ── ROOM CHANGE ──────────────────────────────────────────────────────────────
router.post("/room-change", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const propertyId = req.params.propertyId;
  const { from_qr_code_id, to_room_id } = req.body;
  if (!from_qr_code_id || !to_room_id) {
    res.status(400).json({ detail: "from_qr_code_id and to_room_id are required" }); return;
  }

  const qr = await findQr(db, propertyId, from_qr_code_id);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  await db.update(pepprQrCodes).set({ roomId: to_room_id })
    .where(eq(pepprQrCodes.id, qr.id));

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── GET SINGLE ───────────────────────────────────────────────────────────────
router.get("/:qrCodeId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  res.json(await enrichQr(db, qr));
}));

// ── UPDATE ACCESS TYPE ───────────────────────────────────────────────────────
router.put("/:qrCodeId/access-type", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  const { access_type } = req.body;
  if (!access_type || !["public", "restricted"].includes(access_type)) {
    res.status(400).json({ detail: "access_type must be 'public' or 'restricted'" }); return;
  }

  await db.update(pepprQrCodes).set({ accessType: access_type })
    .where(eq(pepprQrCodes.id, qr.id));

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── ACTIVATE ─────────────────────────────────────────────────────────────────
router.post("/:qrCodeId/activate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  await db.update(pepprQrCodes).set({ status: "active" })
    .where(eq(pepprQrCodes.id, qr.id));

  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorType: "USER", actorId: actor?.sub, action: "qr_code_activated",
    resourceType: "qr_code", resourceId: qr.id,
    details: { qr_code_id: qr.qrCodeId, property_id: qr.propertyId },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"],
  });

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── DEACTIVATE ───────────────────────────────────────────────────────────────
router.post("/:qrCodeId/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  await db.update(pepprQrCodes).set({ status: "inactive" })
    .where(eq(pepprQrCodes.id, qr.id));

  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorType: "USER", actorId: actor?.sub, action: "qr_code_deactivated",
    resourceType: "qr_code", resourceId: qr.id,
    details: { qr_code_id: qr.qrCodeId, property_id: qr.propertyId },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"],
  });

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── SUSPEND ──────────────────────────────────────────────────────────────────
router.post("/:qrCodeId/suspend", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  await db.update(pepprQrCodes).set({ status: "suspended" })
    .where(eq(pepprQrCodes.id, qr.id));

  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorType: "USER", actorId: actor?.sub, action: "qr_code_suspended",
    resourceType: "qr_code", resourceId: qr.id,
    details: { qr_code_id: qr.qrCodeId, property_id: qr.propertyId },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"],
  });

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── RESUME ───────────────────────────────────────────────────────────────────
router.post("/:qrCodeId/resume", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  await db.update(pepprQrCodes).set({ status: "active" })
    .where(eq(pepprQrCodes.id, qr.id));

  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorType: "USER", actorId: actor?.sub, action: "qr_code_resumed",
    resourceType: "qr_code", resourceId: qr.id,
    details: { qr_code_id: qr.qrCodeId, property_id: qr.propertyId },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"],
  });

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── REVOKE ───────────────────────────────────────────────────────────────────
router.post("/:qrCodeId/revoke", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  const { reason } = req.body;
  await db.update(pepprQrCodes).set({ status: "revoked", revokedReason: reason || null })
    .where(eq(pepprQrCodes.id, qr.id));

  const actor = (req as any).pepprUser;
  await logAuditEvent({
    actorType: "USER", actorId: actor?.sub, action: "qr_code_revoked",
    resourceType: "qr_code", resourceId: qr.id,
    details: { qr_code_id: qr.qrCodeId, property_id: qr.propertyId, reason: reason || null },
    ipAddress: getClientIp(req), userAgent: req.headers["user-agent"],
  });

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

// ── EXTEND ───────────────────────────────────────────────────────────────────
router.post("/:qrCodeId/extend", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const qr = await findQr(db, req.params.propertyId, req.params.qrCodeId);
  if (!qr) { res.status(404).json({ detail: "QR code not found" }); return; }

  const { extension_hours } = req.body;
  if (!extension_hours || extension_hours <= 0) {
    res.status(400).json({ detail: "extension_hours must be a positive number" }); return;
  }

  const currentExpiry = qr.expiresAt || new Date();
  const newExpiry = new Date(currentExpiry.getTime() + extension_hours * 60 * 60 * 1000);
  await db.update(pepprQrCodes).set({ expiresAt: newExpiry })
    .where(eq(pepprQrCodes.id, qr.id));

  const updated = await db.select().from(pepprQrCodes).where(eq(pepprQrCodes.id, qr.id)).limit(1);
  res.json(await enrichQr(db, updated[0]));
}));

export default router;
