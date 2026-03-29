/**
 * Properties CRUD — Express routes for /v1/properties/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, sql, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprProperties, pepprPartners, pepprRooms, pepprQrCodes,
  pepprPropertyConfig,
} from "../../drizzle/schema";
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
  if (p.search) conditions.push(like(pepprProperties.name, `%${p.search}%`));
  if (req.query.partner_id) conditions.push(eq(pepprProperties.partnerId, req.query.partner_id as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprProperties, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;
  const orderCol = p.sortBy === "name" ? pepprProperties.name : pepprProperties.createdAt;

  const rows = await db.select().from(pepprProperties).where(where)
    .orderBy(orderFn(orderCol)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  // Partner names
  const partnerIds = Array.from(new Set(rows.map((r) => r.partnerId)));
  const partners = partnerIds.length
    ? await db.select({ id: pepprPartners.id, name: pepprPartners.name }).from(pepprPartners)
    : [];
  const partnerMap = new Map(partners.map((p) => [p.id, p.name]));

  // Room counts
  const roomCounts = await db
    .select({ propertyId: pepprRooms.propertyId, count: sql<number>`count(*)` })
    .from(pepprRooms).groupBy(pepprRooms.propertyId);
  const roomMap = new Map(roomCounts.map((r) => [r.propertyId, Number(r.count)]));

  // Active QR counts
  const qrCounts = await db
    .select({ propertyId: pepprQrCodes.propertyId, count: sql<number>`count(*)` })
    .from(pepprQrCodes).where(eq(pepprQrCodes.status, "active")).groupBy(pepprQrCodes.propertyId);
  const qrMap = new Map(qrCounts.map((r) => [r.propertyId, Number(r.count)]));

  const items = rows.map((r) => ({
    id: r.id, partner_id: r.partnerId, partner_name: partnerMap.get(r.partnerId) || null,
    name: r.name, type: r.type, address: r.address, city: r.city, country: r.country,
    timezone: r.timezone, currency: r.currency, phone: r.phone || null, email: r.email || null,
    rooms_count: roomMap.get(r.id) || 0, active_qr_count: qrMap.get(r.id) || 0,
    status: r.status, config: null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  }));

  res.json(paginatedResponse(items, total, p));
}));

// ── GET BY ID ────────────────────────────────────────────────────────────────
router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  const r = rows[0];
  const partnerRows = await db.select({ name: pepprPartners.name }).from(pepprPartners).where(eq(pepprPartners.id, r.partnerId)).limit(1);
  const roomCount = await countRows(db, pepprRooms, eq(pepprRooms.propertyId, r.id));
  const qrCount = await countRows(db, pepprQrCodes, and(eq(pepprQrCodes.propertyId, r.id), eq(pepprQrCodes.status, "active")));

  // Get config
  const configRows = await db.select().from(pepprPropertyConfig).where(eq(pepprPropertyConfig.propertyId, r.id)).limit(1);

  res.json({
    id: r.id, partner_id: r.partnerId, partner_name: partnerRows[0]?.name || null,
    name: r.name, type: r.type, address: r.address, city: r.city, country: r.country,
    timezone: r.timezone, currency: r.currency, phone: r.phone || null, email: r.email || null,
    rooms_count: roomCount, active_qr_count: qrCount, status: r.status,
    config: configRows[0] ? {
      logo_url: configRows[0].logoUrl, primary_color: configRows[0].primaryColor,
      secondary_color: configRows[0].secondaryColor, welcome_message: configRows[0].welcomeMessage,
    } : null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── CREATE ───────────────────────────────────────────────────────────────────
router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { partner_id, name, type, address, city, country, timezone, currency, phone, email } = req.body;
  if (!partner_id || !name || !type || !address || !city || !country) {
    res.status(400).json({ detail: "partner_id, name, type, address, city, country are required" }); return;
  }

  const id = generateId();
  await db.insert(pepprProperties).values({
    id, partnerId: partner_id, name, type, address, city, country,
    timezone: timezone || "UTC", currency: currency || "THB",
    phone: phone || null, email: email || null,
  });

  const created = await db.select().from(pepprProperties).where(eq(pepprProperties.id, id)).limit(1);
  const r = created[0]!;
  res.status(201).json({
    id: r.id, partner_id: r.partnerId, partner_name: null,
    name: r.name, type: r.type, address: r.address, city: r.city, country: r.country,
    timezone: r.timezone, currency: r.currency, phone: r.phone || null, email: r.email || null,
    rooms_count: 0, active_qr_count: 0, status: r.status, config: null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── UPDATE ───────────────────────────────────────────────────────────────────
router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  const fields: Record<string, string> = {
    partner_id: "partnerId", name: "name", type: "type", address: "address",
    city: "city", country: "country", timezone: "timezone", currency: "currency",
    phone: "phone", email: "email", status: "status",
  };
  const updates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) updates[dbKey] = req.body[bodyKey];
  }

  if (Object.keys(updates).length > 0) {
    await db.update(pepprProperties).set(updates).where(eq(pepprProperties.id, req.params.id));
  }

  const updated = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  const r = updated[0]!;
  res.json({
    id: r.id, partner_id: r.partnerId, name: r.name, type: r.type,
    address: r.address, city: r.city, country: r.country,
    timezone: r.timezone, currency: r.currency, phone: r.phone || null, email: r.email || null,
    rooms_count: 0, active_qr_count: 0, status: r.status, config: null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── UPDATE CONFIG ────────────────────────────────────────────────────────────
router.put("/:id/config", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  // Upsert config
  const configRows = await db.select().from(pepprPropertyConfig).where(eq(pepprPropertyConfig.propertyId, req.params.id)).limit(1);
  const configFields: Record<string, string> = {
    logo_url: "logoUrl", primary_color: "primaryColor", secondary_color: "secondaryColor",
    welcome_message: "welcomeMessage", qr_validation_limit: "qrValidationLimit",
    service_catalog_limit: "serviceCatalogLimit", request_submission_limit: "requestSubmissionLimit",
    enable_guest_cancellation: "enableGuestCancellation",
    enable_alternative_proposals: "enableAlternativeProposals",
    enable_direct_messaging: "enableDirectMessaging",
  };
  const configUpdates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(configFields)) {
    if (req.body[bodyKey] !== undefined) configUpdates[dbKey] = req.body[bodyKey];
  }

  if (configRows[0]) {
    await db.update(pepprPropertyConfig).set(configUpdates).where(eq(pepprPropertyConfig.propertyId, req.params.id));
  } else {
    await db.insert(pepprPropertyConfig).values({ propertyId: req.params.id, ...configUpdates });
  }

  res.json({ ...existing[0], config: req.body });
}));

// ── PATCH CONFIGURATION ──────────────────────────────────────────────────────
router.patch("/:id/configuration", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  const configFields: Record<string, string> = {
    logo_url: "logoUrl", primary_color: "primaryColor", secondary_color: "secondaryColor",
    welcome_message: "welcomeMessage", qr_validation_limit: "qrValidationLimit",
    service_catalog_limit: "serviceCatalogLimit", request_submission_limit: "requestSubmissionLimit",
    enable_guest_cancellation: "enableGuestCancellation",
    enable_alternative_proposals: "enableAlternativeProposals",
    enable_direct_messaging: "enableDirectMessaging",
  };
  const configUpdates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(configFields)) {
    if (req.body[bodyKey] !== undefined) configUpdates[dbKey] = req.body[bodyKey];
  }

  const configRows = await db.select().from(pepprPropertyConfig).where(eq(pepprPropertyConfig.propertyId, req.params.id)).limit(1);
  if (configRows[0]) {
    await db.update(pepprPropertyConfig).set(configUpdates).where(eq(pepprPropertyConfig.propertyId, req.params.id));
  } else {
    await db.insert(pepprPropertyConfig).values({ propertyId: req.params.id, ...configUpdates });
  }

  const updatedConfig = await db.select().from(pepprPropertyConfig).where(eq(pepprPropertyConfig.propertyId, req.params.id)).limit(1);
  const c = updatedConfig[0];
  res.json({
    success: true,
    data: {
      property_id: req.params.id,
      logo_url: c?.logoUrl || null, primary_color: c?.primaryColor || null,
      secondary_color: c?.secondaryColor || null, welcome_message: c?.welcomeMessage || null,
      qr_validation_limit: c?.qrValidationLimit, service_catalog_limit: c?.serviceCatalogLimit,
      request_submission_limit: c?.requestSubmissionLimit,
      enable_guest_cancellation: c?.enableGuestCancellation,
      enable_alternative_proposals: c?.enableAlternativeProposals,
      enable_direct_messaging: c?.enableDirectMessaging,
      updated_at: c?.updatedAt?.toISOString(),
    },
  });
}));

// ── DEACTIVATE ───────────────────────────────────────────────────────────────
router.post("/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprProperties).set({ status: "inactive" }).where(eq(pepprProperties.id, req.params.id));
  const updated = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  const r = updated[0];
  res.json({
    id: r.id, partner_id: r.partnerId, name: r.name, type: r.type,
    address: r.address, city: r.city, country: r.country,
    timezone: r.timezone, currency: r.currency, phone: r.phone || null, email: r.email || null,
    rooms_count: 0, active_qr_count: 0, status: r.status, config: null,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  });
}));

// ── DELETE (for test cleanup / admin hard delete) ────────────────────────────
router.delete("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprProperties).where(eq(pepprProperties.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Property not found" }); return; }

  await db.delete(pepprProperties).where(eq(pepprProperties.id, req.params.id));
  res.json({ success: true, id: req.params.id });
}));

export default router;
