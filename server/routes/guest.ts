/**
 * Guest Router — Public endpoints for the guest-facing microsite.
 *
 * Mounted at /api/public/guest — no authentication required.
 *
 * Provides:
 *   POST /sessions              → Create guest session from QR scan
 *   GET  /sessions/:id          → Get session details
 *   GET  /sessions/:id/validate → Validate session is still active
 *   GET  /sessions/:id/menu     → Get service menu for the session's room
 *   POST /sessions/:id/requests → Submit a service request
 *   GET  /sessions/:id/requests → List requests for a session
 *   GET  /requests/:number      → Track a request by its number
 *   GET  /properties/:id/branding → Get property branding config
 */
import { Router, Request, Response } from "express";
import { eq, and, sql, desc } from "drizzle-orm";
import { getDb } from "../db";
import { asyncHandler, getClientIp, parsePagination, generateId } from "./_helpers";
import {
  pepprGuestSessions, pepprQrCodes, pepprRooms, pepprProperties,
  pepprServiceRequests, pepprRequestItems, pepprStayTokens,
  pepprServiceTemplates, pepprTemplateItems, pepprCatalogItems,
} from "../../drizzle/schema";
import { createServiceRequest } from "../domain/transaction/transactionService";
import { nanoid } from "nanoid";

const router = Router();

// ── CREATE SESSION ──────────────────────────────────────────────────────────
router.post("/sessions", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { qr_code_id, stay_token, guest_name, font_size } = req.body;
  const validFontSizes = ["S", "M", "L", "XL"];
  const resolvedFontSize = font_size && validFontSizes.includes(font_size) ? font_size as "S" | "M" | "L" | "XL" : "M";
  if (!qr_code_id) {
    res.status(400).json({ detail: "qr_code_id is required" }); return;
  }

  // Validate QR code
  const qrRows = await db.select().from(pepprQrCodes)
    .where(eq(pepprQrCodes.qrCodeId, qr_code_id)).limit(1);
  if (!qrRows[0]) { res.status(404).json({ detail: "QR code not found" }); return; }

  const qr = qrRows[0];
  if (qr.status !== "active") {
    res.status(422).json({ detail: "QR code is not active" }); return;
  }
  if (qr.expiresAt && qr.expiresAt < new Date()) {
    res.status(422).json({ detail: "QR code has expired" }); return;
  }

  // For restricted QR codes, validate stay token
  if (qr.accessType === "restricted") {
    if (!stay_token) {
      res.status(403).json({ detail: "Stay token is required for restricted access" }); return;
    }
    const tokenRows = await db.select().from(pepprStayTokens)
      .where(and(
        eq(pepprStayTokens.token, stay_token),
        eq(pepprStayTokens.propertyId, qr.propertyId),
        eq(pepprStayTokens.status, "active"),
      )).limit(1);
    if (!tokenRows[0]) {
      res.status(403).json({ detail: "Invalid or expired stay token" }); return;
    }
  }

  // Create session
  const id = generateId();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h from now
  await db.insert(pepprGuestSessions).values({
    id,
    qrCodeId: qr_code_id,
    propertyId: qr.propertyId,
    roomId: qr.roomId,
    guestName: guest_name || null,
    accessType: qr.accessType,
    fontSizePref: resolvedFontSize,
    expiresAt,
  });

  const created = await db.select().from(pepprGuestSessions)
    .where(eq(pepprGuestSessions.id, id)).limit(1);
  const r = created[0]!;

  // Get property name for the response
  const propRows = await db.select().from(pepprProperties)
    .where(eq(pepprProperties.id, qr.propertyId)).limit(1);

  res.status(201).json({
    session_id: r.id,
    qr_code_id: r.qrCodeId,
    property_id: r.propertyId,
    property_name: propRows[0]?.name || null,
    room_id: r.roomId,
    guest_name: r.guestName || null,
    access_type: r.accessType,
    status: r.status,
    font_size_pref: r.fontSizePref || "M",
    expires_at: r.expiresAt?.toISOString(),
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── GET SESSION ─────────────────────────────────────────────────────────────
router.get("/sessions/:id", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprGuestSessions)
    .where(eq(pepprGuestSessions.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Session not found" }); return; }

  const r = rows[0];
  const propRows = await db.select().from(pepprProperties)
    .where(eq(pepprProperties.id, r.propertyId)).limit(1);
  const roomRows = await db.select().from(pepprRooms)
    .where(eq(pepprRooms.id, r.roomId)).limit(1);

  res.json({
    session_id: r.id,
    qr_code_id: r.qrCodeId,
    property_id: r.propertyId,
    property_name: propRows[0]?.name || null,
    room_id: r.roomId,
    room_number: roomRows[0]?.roomNumber || null,
    guest_name: r.guestName || null,
    access_type: r.accessType,
    status: r.status,
    font_size_pref: r.fontSizePref || "M",
    expires_at: r.expiresAt?.toISOString(),
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── UPDATE FONT SIZE PREFERENCE ─────────────────────────────────────────────
router.patch("/sessions/:id/font-size", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ error: "DB unavailable" }); return; }
  const { font_size } = req.body;
  const validSizes = ["S", "M", "L", "XL"];
  if (!font_size || !validSizes.includes(font_size)) {
    res.status(400).json({ error: "Invalid font_size. Must be S, M, L, or XL" }); return;
  }
  const rows = await db.select().from(pepprGuestSessions)
    .where(eq(pepprGuestSessions.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ error: "Session not found" }); return; }
  await db.update(pepprGuestSessions)
    .set({ fontSizePref: font_size as "S" | "M" | "L" | "XL" })
    .where(eq(pepprGuestSessions.id, req.params.id));
  res.json({ ok: true, font_size });
}));

// ── VALIDATE SESSION ────────────────────────────────────────────────────────
router.get("/sessions/:id/validate", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ valid: false }); return; }

  const rows = await db.select().from(pepprGuestSessions)
    .where(eq(pepprGuestSessions.id, req.params.id)).limit(1);
  if (!rows[0]) { res.json({ valid: false }); return; }

  const r = rows[0];
  const isActive = r.status?.toUpperCase() === "ACTIVE";
  const notExpired = !r.expiresAt || r.expiresAt > new Date();
  res.json({ valid: isActive && notExpired });
}));

// ── GET SERVICE MENU ────────────────────────────────────────────────────────
router.get("/sessions/:id/menu", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  // Get session
  const sessionRows = await db.select().from(pepprGuestSessions)
    .where(eq(pepprGuestSessions.id, req.params.id)).limit(1);
  if (!sessionRows[0]) { res.status(404).json({ detail: "Session not found" }); return; }

  const session = sessionRows[0];

  // Get the room to find its template
  const roomRows = await db.select().from(pepprRooms)
    .where(eq(pepprRooms.id, session.roomId)).limit(1);
  if (!roomRows[0]) { res.status(404).json({ detail: "Room not found" }); return; }

  const room = roomRows[0];
  const templateId = room.templateId;

  if (!templateId) {
    // No template assigned — return empty menu
    res.json({
      session_id: session.id,
      property_id: session.propertyId,
      room_id: session.roomId,
      room_number: room.roomNumber,
      template_name: null,
      categories: [],
      total_items: 0,
    });
    return;
  }

  // Get template
  const templateRows = await db.select().from(pepprServiceTemplates)
    .where(eq(pepprServiceTemplates.id, templateId)).limit(1);
  const template = templateRows[0];

  // Get template items with their catalog item details
  const templateItems = await db.select().from(pepprTemplateItems)
    .where(eq(pepprTemplateItems.templateId, templateId));

  // Get catalog items for all template items
  const catalogItemIds = templateItems.map(ti => ti.catalogItemId).filter(Boolean);
  let catalogItems: any[] = [];
  if (catalogItemIds.length > 0) {
    catalogItems = await db.select().from(pepprCatalogItems)
      .where(sql`${pepprCatalogItems.id} IN (${sql.join(catalogItemIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const catalogMap = new Map(catalogItems.map(ci => [ci.id, ci]));

  // Group items by category
  const categoryMap = new Map<string, any[]>();
  for (const ti of templateItems) {
    const catalog = catalogMap.get(ti.catalogItemId);
    const category = catalog?.category || "Other";
    const items = categoryMap.get(category) || [];
    items.push({
      item_id: catalog?.id || ti.id,
      template_item_id: ti.id,
      item_name: catalog?.name || "Unknown Item",
      item_category: category,
      description: catalog?.description || null,
      unit_price: catalog?.price || "0",
      currency: catalog?.currency || "THB",
      included_quantity: 0,
      max_quantity: 10,
      is_available: catalog?.status === "active" || !catalog,
      image_url: (catalog as any)?.imageUrl || null,
    });
    categoryMap.set(category, items);
  }

  const categories = Array.from(categoryMap.entries()).map(([name, items]) => ({
    category_name: name,
    items,
  }));

  res.json({
    session_id: session.id,
    property_id: session.propertyId,
    room_id: session.roomId,
    room_number: room.roomNumber,
    template_id: templateId,
    template_name: template?.name || null,
    categories,
    total_items: templateItems.length,
  });
}));

// ── SUBMIT SERVICE REQUEST ──────────────────────────────────────────────────
router.post("/sessions/:id/requests", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  // Validate session
  const sessionRows = await db.select().from(pepprGuestSessions)
    .where(eq(pepprGuestSessions.id, req.params.id)).limit(1);
  if (!sessionRows[0]) { res.status(404).json({ detail: "Session not found" }); return; }

  const session = sessionRows[0];
  const { guest_name, guest_phone, guest_notes, preferred_datetime, items, currency } = req.body;

  const id = generateId();
  const requestNumber = `REQ-${Date.now().toString(36).toUpperCase()}-${nanoid(4).toUpperCase()}`;

  let subtotal = 0;
  const itemInputs = [];
  if (Array.isArray(items)) {
    for (const item of items) {
      const lineTotal = item.unit_price * (item.billable_quantity || item.quantity || 1);
      subtotal += lineTotal;
      itemInputs.push({
        id: generateId(),
        requestId: id,
        itemId: item.item_id || null,
        templateItemId: item.template_item_id || null,
        itemName: item.item_name,
        itemCategory: item.item_category,
        unitPrice: String(item.unit_price),
        quantity: item.quantity || 1,
        includedQuantity: item.included_quantity || 0,
        billableQuantity: item.billable_quantity || item.quantity || 1,
        lineTotal: String(lineTotal),
        currency: item.currency || currency || "THB",
        guestNotes: item.guest_notes || null,
      });
    }
  }

  const result = await createServiceRequest(
    {
      id, requestNumber, sessionId: session.id,
      propertyId: session.propertyId, roomId: session.roomId,
      guestName: guest_name || session.guestName || null,
      guestPhone: guest_phone || null,
      guestNotes: guest_notes || null,
      preferredDatetime: preferred_datetime ? new Date(preferred_datetime) : null,
      subtotal: String(subtotal), totalAmount: String(subtotal),
      currency: currency || "THB",
    },
    itemInputs,
    undefined, // no actor for guest requests
    getClientIp(req),
    req.headers["user-agent"] || undefined,
  );

  res.status(201).json(result);
}));

// ── LIST SESSION REQUESTS ───────────────────────────────────────────────────
router.get("/sessions/:id/requests", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprServiceRequests)
    .where(eq(pepprServiceRequests.sessionId, req.params.id))
    .orderBy(desc(pepprServiceRequests.createdAt));

  res.json(rows.map(r => ({
    id: r.id,
    request_number: r.requestNumber,
    status: r.status,
    guest_name: r.guestName,
    total_amount: r.totalAmount,
    currency: r.currency,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
  })));
}));

// ── TRACK REQUEST BY NUMBER ─────────────────────────────────────────────────
router.get("/requests/:number", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprServiceRequests)
    .where(eq(pepprServiceRequests.requestNumber, req.params.number)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Request not found" }); return; }

  const r = rows[0];
  const items = await db.select().from(pepprRequestItems)
    .where(eq(pepprRequestItems.requestId, r.id));

  res.json({
    id: r.id,
    request_number: r.requestNumber,
    session_id: r.sessionId,
    property_id: r.propertyId,
    room_id: r.roomId,
    status: r.status,
    guest_name: r.guestName,
    guest_phone: r.guestPhone,
    guest_notes: r.guestNotes,
    subtotal: r.subtotal,
    total_amount: r.totalAmount,
    currency: r.currency,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
    items: items.map(i => ({
      id: i.id,
      item_name: i.itemName,
      item_category: i.itemCategory,
      unit_price: i.unitPrice,
      quantity: i.quantity,
      included_quantity: i.includedQuantity,
      billable_quantity: i.billableQuantity,
      line_total: i.lineTotal,
      currency: i.currency,
    })),
  });
}));

// ── PROPERTY BRANDING ───────────────────────────────────────────────────────
router.get("/properties/:id/branding", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprProperties)
    .where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  const p = rows[0];
  res.json({
    property_name: p.name,
    logo_url: (p as any).logoUrl || null,
    primary_color: (p as any).primaryColor || "#171717",
    welcome_message: (p as any).welcomeMessage || null,
  });
}));

// ── QR STATUS (public) ─────────────────────────────────────────────────────
router.get("/qr/:qrCodeId/status", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprQrCodes)
    .where(eq(pepprQrCodes.qrCodeId, req.params.qrCodeId)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "QR code not found" }); return; }

  const qr = rows[0];
  const propRows = await db.select().from(pepprProperties)
    .where(eq(pepprProperties.id, qr.propertyId)).limit(1);
  const roomRows = await db.select().from(pepprRooms)
    .where(eq(pepprRooms.id, qr.roomId)).limit(1);

  // Update scan count
  await db.update(pepprQrCodes).set({
    scanCount: sql`${pepprQrCodes.scanCount} + 1`,
    lastScanned: new Date(),
  }).where(eq(pepprQrCodes.id, qr.id));

  res.json({
    qr_code_id: qr.qrCodeId,
    property_id: qr.propertyId,
    property_name: propRows[0]?.name || null,
    room_id: qr.roomId,
    room_number: roomRows[0]?.roomNumber || null,
    access_type: qr.accessType,
    status: qr.status,
  });
}));

// ── VALIDATE STAY TOKEN ─────────────────────────────────────────────────────
router.post("/qr/validate-token", asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ valid: false }); return; }

  const { qr_code_id, stay_token } = req.body;
  if (!qr_code_id || !stay_token) {
    res.json({ valid: false }); return;
  }

  // Get QR code to find property
  const qrRows = await db.select().from(pepprQrCodes)
    .where(eq(pepprQrCodes.qrCodeId, qr_code_id)).limit(1);
  if (!qrRows[0]) { res.json({ valid: false }); return; }

  const tokenRows = await db.select().from(pepprStayTokens)
    .where(and(
      eq(pepprStayTokens.token, stay_token),
      eq(pepprStayTokens.propertyId, qrRows[0].propertyId),
      eq(pepprStayTokens.status, "active"),
    )).limit(1);

  res.json({ valid: !!tokenRows[0] });
}));

export default router;
