/**
 * Front Office — Guest sessions, stay tokens, and service requests
 * Replaces FastAPI /v1/front-office/*, /v1/guest/*, /v1/requests/*
 */
import { Router, type Request, type Response } from "express";
import { eq, and, desc, asc, sql, gte, lte, like } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprGuestSessions, pepprStayTokens, pepprServiceRequests,
  pepprRequestItems, pepprQrCodes, pepprRooms, pepprProperties,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";
import { nanoid } from "nanoid";

const router = Router();

// ═══════════════════════════════════════════════════════════════════════════════
// STAY TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/stay-tokens", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (req.query.property_id) conditions.push(eq(pepprStayTokens.propertyId, req.query.property_id as string));
  if (req.query.status) conditions.push(eq(pepprStayTokens.status, req.query.status as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprStayTokens, where);
  const rows = await db.select().from(pepprStayTokens).where(where)
    .orderBy(desc(pepprStayTokens.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = rows.map((r) => ({
    id: r.id, token: r.token, property_id: r.propertyId, room_id: r.roomId,
    room_number: r.roomNumber || null, expires_at: r.expiresAt?.toISOString(),
    status: r.status, created_at: r.createdAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

router.post("/stay-tokens", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { property_id, room_id, room_number, expires_at } = req.body;
  if (!property_id || !room_id || !expires_at) {
    res.status(400).json({ detail: "property_id, room_id, expires_at are required" }); return;
  }

  const token = nanoid(16);
  await db.insert(pepprStayTokens).values({
    token, propertyId: property_id, roomId: room_id,
    roomNumber: room_number || null, expiresAt: new Date(expires_at),
  });

  const created = await db.select().from(pepprStayTokens).where(eq(pepprStayTokens.token, token)).limit(1);
  const r = created[0]!;
  res.status(201).json({
    id: r.id, token: r.token, property_id: r.propertyId, room_id: r.roomId,
    room_number: r.roomNumber || null, expires_at: r.expiresAt?.toISOString(),
    status: r.status, created_at: r.createdAt?.toISOString(),
  });
}));

router.post("/stay-tokens/bulk", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { tokens } = req.body;
  if (!Array.isArray(tokens)) { res.status(400).json({ detail: "tokens array is required" }); return; }

  const results = [];
  for (const t of tokens) {
    const token = nanoid(16);
    await db.insert(pepprStayTokens).values({
      token, propertyId: t.property_id, roomId: t.room_id,
      roomNumber: t.room_number || null, expiresAt: new Date(t.expires_at),
    });
    const created = await db.select().from(pepprStayTokens).where(eq(pepprStayTokens.token, token)).limit(1);
    if (created[0]) results.push({
      id: created[0].id, token: created[0].token, property_id: created[0].propertyId,
      room_id: created[0].roomId, room_number: created[0].roomNumber || null,
      expires_at: created[0].expiresAt?.toISOString(), status: created[0].status,
      created_at: created[0].createdAt?.toISOString(),
    });
  }
  res.status(201).json(results);
}));

router.post("/stay-tokens/:id/revoke", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprStayTokens).set({ status: "revoked" }).where(eq(pepprStayTokens.id, parseInt(req.params.id)));
  res.json({ success: true });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// GUEST SESSIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/sessions", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (req.query.property_id) conditions.push(eq(pepprGuestSessions.propertyId, req.query.property_id as string));
  if (req.query.status) conditions.push(eq(pepprGuestSessions.status, req.query.status as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprGuestSessions, where);
  const rows = await db.select().from(pepprGuestSessions).where(where)
    .orderBy(desc(pepprGuestSessions.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = rows.map((r) => ({
    id: r.id, qr_code_id: r.qrCodeId, property_id: r.propertyId,
    room_id: r.roomId, guest_name: r.guestName || null,
    access_type: r.accessType, status: r.status,
    expires_at: r.expiresAt?.toISOString(),
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

router.post("/sessions", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { qr_code_id, property_id, room_id, guest_name, access_type, expires_at } = req.body;
  if (!qr_code_id || !property_id || !room_id || !access_type || !expires_at) {
    res.status(400).json({ detail: "qr_code_id, property_id, room_id, access_type, expires_at are required" }); return;
  }

  const id = generateId();
  await db.insert(pepprGuestSessions).values({
    id, qrCodeId: qr_code_id, propertyId: property_id, roomId: room_id,
    guestName: guest_name || null, accessType: access_type,
    expiresAt: new Date(expires_at),
  });

  const created = await db.select().from(pepprGuestSessions).where(eq(pepprGuestSessions.id, id)).limit(1);
  const r = created[0]!;
  res.status(201).json({
    id: r.id, qr_code_id: r.qrCodeId, property_id: r.propertyId,
    room_id: r.roomId, guest_name: r.guestName || null,
    access_type: r.accessType, status: r.status,
    expires_at: r.expiresAt?.toISOString(),
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE REQUESTS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/requests", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (req.query.property_id) conditions.push(eq(pepprServiceRequests.propertyId, req.query.property_id as string));
  if (req.query.status) conditions.push(eq(pepprServiceRequests.status, req.query.status as string));
  if (req.query.room_id) conditions.push(eq(pepprServiceRequests.roomId, req.query.room_id as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprServiceRequests, where);
  const rows = await db.select().from(pepprServiceRequests).where(where)
    .orderBy(desc(pepprServiceRequests.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = rows.map((r) => ({
    id: r.id, request_number: r.requestNumber, session_id: r.sessionId,
    property_id: r.propertyId, room_id: r.roomId,
    guest_name: r.guestName || null, guest_phone: r.guestPhone || null,
    guest_notes: r.guestNotes || null,
    preferred_datetime: r.preferredDatetime?.toISOString() || null,
    subtotal: parseFloat(r.subtotal), discount_amount: parseFloat(r.discountAmount),
    total_amount: parseFloat(r.totalAmount), currency: r.currency,
    status: r.status, status_reason: r.statusReason || null,
    confirmed_at: r.confirmedAt?.toISOString() || null,
    completed_at: r.completedAt?.toISOString() || null,
    cancelled_at: r.cancelledAt?.toISOString() || null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  }));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/requests/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprServiceRequests).where(eq(pepprServiceRequests.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Request not found" }); return; }

  const r = rows[0];
  // Get items
  const items = await db.select().from(pepprRequestItems).where(eq(pepprRequestItems.requestId, r.id));

  res.json({
    id: r.id, request_number: r.requestNumber, session_id: r.sessionId,
    property_id: r.propertyId, room_id: r.roomId,
    guest_name: r.guestName || null, guest_phone: r.guestPhone || null,
    guest_notes: r.guestNotes || null,
    preferred_datetime: r.preferredDatetime?.toISOString() || null,
    subtotal: parseFloat(r.subtotal), discount_amount: parseFloat(r.discountAmount),
    total_amount: parseFloat(r.totalAmount), currency: r.currency,
    status: r.status, status_reason: r.statusReason || null,
    items: items.map((i) => ({
      id: i.id, item_id: i.itemId, template_item_id: i.templateItemId,
      item_name: i.itemName, item_category: i.itemCategory,
      unit_price: parseFloat(i.unitPrice), quantity: i.quantity,
      included_quantity: i.includedQuantity, billable_quantity: i.billableQuantity,
      line_total: parseFloat(i.lineTotal), currency: i.currency,
      guest_notes: i.guestNotes || null, status: i.status,
    })),
    confirmed_at: r.confirmedAt?.toISOString() || null,
    completed_at: r.completedAt?.toISOString() || null,
    cancelled_at: r.cancelledAt?.toISOString() || null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── CREATE REQUEST (guest-facing) ────────────────────────────────────────────
router.post("/requests", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const {
    session_id, property_id, room_id, guest_name, guest_phone, guest_notes,
    preferred_datetime, items, currency,
  } = req.body;

  if (!session_id || !property_id || !room_id) {
    res.status(400).json({ detail: "session_id, property_id, room_id are required" }); return;
  }

  const id = generateId();
  const requestNumber = `REQ-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;

  let subtotal = 0;
  if (Array.isArray(items)) {
    subtotal = items.reduce((sum: number, i: any) => sum + (i.unit_price * (i.billable_quantity || i.quantity || 1)), 0);
  }

  await db.insert(pepprServiceRequests).values({
    id, requestNumber, sessionId: session_id, propertyId: property_id, roomId: room_id,
    guestName: guest_name || null, guestPhone: guest_phone || null,
    guestNotes: guest_notes || null,
    preferredDatetime: preferred_datetime ? new Date(preferred_datetime) : null,
    subtotal: String(subtotal), discountAmount: "0", totalAmount: String(subtotal),
    currency: currency || "THB",
  });

  // Insert items
  if (Array.isArray(items)) {
    for (const item of items) {
      await db.insert(pepprRequestItems).values({
        id: generateId(), requestId: id,
        itemId: item.item_id || null, templateItemId: item.template_item_id || null,
        itemName: item.item_name, itemCategory: item.item_category,
        unitPrice: String(item.unit_price), quantity: item.quantity || 1,
        includedQuantity: item.included_quantity || 0,
        billableQuantity: item.billable_quantity || item.quantity || 1,
        lineTotal: String(item.unit_price * (item.billable_quantity || item.quantity || 1)),
        currency: item.currency || currency || "THB",
        guestNotes: item.guest_notes || null,
      });
    }
  }

  res.status(201).json({ id, request_number: requestNumber, status: "PENDING" });
}));

// ── UPDATE REQUEST STATUS ────────────────────────────────────────────────────
router.patch("/requests/:id/status", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { status, reason } = req.body;
  if (!status) { res.status(400).json({ detail: "status is required" }); return; }

  const updates: Record<string, any> = { status, statusReason: reason || null };
  const now = new Date();
  if (status === "CONFIRMED") updates.confirmedAt = now;
  if (status === "COMPLETED") updates.completedAt = now;
  if (status === "CANCELLED") updates.cancelledAt = now;

  await db.update(pepprServiceRequests).set(updates).where(eq(pepprServiceRequests.id, req.params.id));

  const updated = await db.select().from(pepprServiceRequests).where(eq(pepprServiceRequests.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Request not found" }); return; }
  res.json({ id: updated[0].id, status: updated[0].status });
}));

export default router;
