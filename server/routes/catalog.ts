/**
 * Catalog Items CRUD — Express routes replacing FastAPI /v1/catalog/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, and, desc, asc } from "drizzle-orm";
import { getDb } from "../db";
import { pepprCatalogItems, pepprServiceProviders } from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";

const router = Router();

function formatItem(r: any, providerName: string | null) {
  return {
    id: r.id, provider_id: r.providerId, provider_name: providerName,
    name: r.name, description: r.description || null, sku: r.sku,
    category: r.category, price: parseFloat(r.price), currency: r.currency,
    unit: r.unit, duration_minutes: r.durationMinutes || null, terms: r.terms || null,
    status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  };
}

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const conditions: any[] = [];
  if (p.search) conditions.push(like(pepprCatalogItems.name, `%${p.search}%`));
  if (req.query.provider_id) conditions.push(eq(pepprCatalogItems.providerId, req.query.provider_id as string));
  if (req.query.category) conditions.push(eq(pepprCatalogItems.category, req.query.category as string));
  const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;

  const total = await countRows(db, pepprCatalogItems, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db.select().from(pepprCatalogItems).where(where)
    .orderBy(orderFn(pepprCatalogItems.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  // Provider names
  const providerIds = Array.from(new Set(rows.map((r) => r.providerId)));
  const providers = providerIds.length
    ? await db.select({ id: pepprServiceProviders.id, name: pepprServiceProviders.name }).from(pepprServiceProviders)
    : [];
  const provMap = new Map(providers.map((p: any) => [p.id, p.name]));

  const items = rows.map((r) => formatItem(r, provMap.get(r.providerId) || null));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Catalog item not found" }); return; }

  const provRows = await db.select({ name: pepprServiceProviders.name }).from(pepprServiceProviders).where(eq(pepprServiceProviders.id, rows[0].providerId)).limit(1);
  res.json(formatItem(rows[0], provRows[0]?.name || null));
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { provider_id, name, description, sku, category, price, currency, unit, duration_minutes, terms } = req.body;
  if (!provider_id || !name || !sku || !category || price === undefined) {
    res.status(400).json({ detail: "provider_id, name, sku, category, price are required" }); return;
  }

  const id = generateId();
  await db.insert(pepprCatalogItems).values({
    id, providerId: provider_id, name, description: description || null,
    sku, category, price: String(price), currency: currency || "THB",
    unit: unit || "each", durationMinutes: duration_minutes || null, terms: terms || null,
  });

  const created = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, id)).limit(1);
  res.status(201).json(formatItem(created[0], null));
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Catalog item not found" }); return; }

  const fields: Record<string, string> = {
    provider_id: "providerId", name: "name", description: "description", sku: "sku",
    category: "category", price: "price", currency: "currency", unit: "unit",
    duration_minutes: "durationMinutes", terms: "terms", status: "status",
  };
  const updates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) {
      updates[dbKey] = bodyKey === "price" ? String(req.body[bodyKey]) : req.body[bodyKey];
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(pepprCatalogItems).set(updates).where(eq(pepprCatalogItems.id, req.params.id));
  }

  const updated = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, req.params.id)).limit(1);
  const provRows = await db.select({ name: pepprServiceProviders.name }).from(pepprServiceProviders).where(eq(pepprServiceProviders.id, updated[0].providerId)).limit(1);
  res.json(formatItem(updated[0], provRows[0]?.name || null));
}));

router.post("/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprCatalogItems).set({ status: "inactive" }).where(eq(pepprCatalogItems.id, req.params.id));
  const updated = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Catalog item not found" }); return; }
  res.json(formatItem(updated[0], null));
}));

export default router;
