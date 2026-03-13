/**
 * Service Providers CRUD — Express routes replacing FastAPI /v1/providers/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import { pepprServiceProviders, pepprCatalogItems } from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";

const router = Router();

function formatProvider(r: any, catalogCount: number) {
  return {
    id: r.id, name: r.name, email: r.email, phone: r.phone || null,
    category: r.category, service_area: r.serviceArea,
    contact_person: r.contactPerson || null,
    rating: r.rating ? parseFloat(r.rating) : null,
    catalog_items_count: catalogCount, status: r.status,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  };
}

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const where = p.search ? like(pepprServiceProviders.name, `%${p.search}%`) : undefined;
  const total = await countRows(db, pepprServiceProviders, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db.select().from(pepprServiceProviders).where(where)
    .orderBy(orderFn(pepprServiceProviders.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const catalogCounts = await db
    .select({ providerId: pepprCatalogItems.providerId, count: sql<number>`count(*)` })
    .from(pepprCatalogItems).groupBy(pepprCatalogItems.providerId);
  const countMap = new Map(catalogCounts.map((r: any) => [r.providerId, Number(r.count)]));

  const items = rows.map((r) => formatProvider(r, countMap.get(r.id) || 0));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Provider not found" }); return; }
  const catalogCount = await countRows(db, pepprCatalogItems, eq(pepprCatalogItems.providerId, req.params.id));
  res.json(formatProvider(rows[0], catalogCount));
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { name, email, phone, category, service_area, contact_person } = req.body;
  if (!name || !email || !category || !service_area) {
    res.status(400).json({ detail: "name, email, category, service_area are required" }); return;
  }

  const id = generateId();
  await db.insert(pepprServiceProviders).values({
    id, name, email, phone: phone || null, category, serviceArea: service_area,
    contactPerson: contact_person || null,
  });

  const created = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, id)).limit(1);
  res.status(201).json(formatProvider(created[0], 0));
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Provider not found" }); return; }

  const fields: Record<string, string> = {
    name: "name", email: "email", phone: "phone", category: "category",
    service_area: "serviceArea", contact_person: "contactPerson", status: "status",
  };
  const updates: Record<string, any> = {};
  for (const [bodyKey, dbKey] of Object.entries(fields)) {
    if (req.body[bodyKey] !== undefined) updates[dbKey] = req.body[bodyKey];
  }

  if (Object.keys(updates).length > 0) {
    await db.update(pepprServiceProviders).set(updates).where(eq(pepprServiceProviders.id, req.params.id));
  }

  const updated = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, req.params.id)).limit(1);
  const catalogCount = await countRows(db, pepprCatalogItems, eq(pepprCatalogItems.providerId, req.params.id));
  res.json(formatProvider(updated[0], catalogCount));
}));

router.post("/:id/deactivate", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.update(pepprServiceProviders).set({ status: "inactive" }).where(eq(pepprServiceProviders.id, req.params.id));
  const updated = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, req.params.id)).limit(1);
  if (!updated[0]) { res.status(404).json({ detail: "Provider not found" }); return; }
  res.json(formatProvider(updated[0], 0));
}));

export default router;
