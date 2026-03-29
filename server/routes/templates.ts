/**
 * Service Templates CRUD — Express routes for /v1/templates/*
 */
import { Router, type Request, type Response } from "express";
import { eq, like, desc, asc, sql } from "drizzle-orm";
import { getDb } from "../db";
import {
  pepprServiceTemplates, pepprTemplateItems, pepprCatalogItems,
  pepprServiceProviders, pepprRooms,
} from "../../drizzle/schema";
import {
  generateId, parsePagination, paginatedResponse, countRows,
  requireAuth, asyncHandler,
} from "./_helpers";

const router = Router();

async function formatTemplate(db: any, r: any) {
  // Get template items with catalog details
  const tiRows = await db
    .select({
      id: pepprTemplateItems.id,
      catalogItemId: pepprTemplateItems.catalogItemId,
      sortOrder: pepprTemplateItems.sortOrder,
      itemName: pepprCatalogItems.name,
      itemPrice: pepprCatalogItems.price,
      itemCurrency: pepprCatalogItems.currency,
      providerId: pepprCatalogItems.providerId,
    })
    .from(pepprTemplateItems)
    .leftJoin(pepprCatalogItems, eq(pepprTemplateItems.catalogItemId, pepprCatalogItems.id))
    .where(eq(pepprTemplateItems.templateId, r.id))
    .orderBy(asc(pepprTemplateItems.sortOrder));

  // Get provider names
  const providerIds = Array.from(new Set(tiRows.map((ti: any) => ti.providerId).filter(Boolean)));
  let provMap = new Map<string, string>();
  if (providerIds.length) {
    const provRows = await db.select({ id: pepprServiceProviders.id, name: pepprServiceProviders.name }).from(pepprServiceProviders);
    provMap = new Map(provRows.map((p: any) => [p.id, p.name]));
  }

  const items = tiRows.map((ti: any) => ({
    id: ti.id,
    catalog_item_id: ti.catalogItemId,
    catalog_item_name: ti.itemName || "Unknown",
    provider_name: provMap.get(ti.providerId) || "Unknown",
    price: parseFloat(ti.itemPrice || "0"),
    currency: ti.itemCurrency || "THB",
    sort_order: ti.sortOrder,
  }));

  // Count assigned rooms
  const assignedRooms = await countRows(db, pepprRooms, eq(pepprRooms.templateId, r.id));
  const totalPrice = items.reduce((sum: number, i: any) => sum + i.price, 0);

  return {
    id: r.id, name: r.name, description: r.description || null, tier: r.tier,
    status: r.status, items, assigned_rooms_count: assignedRooms, total_price: totalPrice,
    created_at: r.createdAt?.toISOString(), updated_at: r.updatedAt?.toISOString(),
  };
}

router.get("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const p = parsePagination(req);
  const where = p.search ? like(pepprServiceTemplates.name, `%${p.search}%`) : undefined;
  const total = await countRows(db, pepprServiceTemplates, where);
  const orderFn = p.sortOrder === "desc" ? desc : asc;

  const rows = await db.select().from(pepprServiceTemplates).where(where)
    .orderBy(orderFn(pepprServiceTemplates.createdAt)).limit(p.pageSize).offset((p.page - 1) * p.pageSize);

  const items = await Promise.all(rows.map((r: any) => formatTemplate(db, r)));
  res.json(paginatedResponse(items, total, p));
}));

router.get("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const rows = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, req.params.id)).limit(1);
  if (!rows[0]) { res.status(404).json({ detail: "Template not found" }); return; }
  res.json(await formatTemplate(db, rows[0]));
}));

router.post("/", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { name, description, tier, item_ids } = req.body;
  if (!name || !tier) { res.status(400).json({ detail: "name and tier are required" }); return; }

  const id = generateId();
  await db.insert(pepprServiceTemplates).values({
    id, name, description: description || null, tier,
  });

  // Add items if provided
  if (Array.isArray(item_ids)) {
    for (let i = 0; i < item_ids.length; i++) {
      await db.insert(pepprTemplateItems).values({
        id: generateId(), templateId: id, catalogItemId: item_ids[i], sortOrder: i,
      });
    }
  }

  const created = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, id)).limit(1);
  res.status(201).json(await formatTemplate(db, created[0]));
}));

router.put("/:id", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const existing = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, req.params.id)).limit(1);
  if (!existing[0]) { res.status(404).json({ detail: "Template not found" }); return; }

  const updates: Record<string, any> = {};
  if (req.body.name !== undefined) updates.name = req.body.name;
  if (req.body.description !== undefined) updates.description = req.body.description;
  if (req.body.tier !== undefined) updates.tier = req.body.tier;
  if (req.body.status !== undefined) updates.status = req.body.status;

  if (Object.keys(updates).length > 0) {
    await db.update(pepprServiceTemplates).set(updates).where(eq(pepprServiceTemplates.id, req.params.id));
  }

  const updated = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, req.params.id)).limit(1);
  res.json(await formatTemplate(db, updated[0]));
}));

// ── ADD ITEM ─────────────────────────────────────────────────────────────────
router.post("/:id/items", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  const { catalog_item_id } = req.body;
  if (!catalog_item_id) { res.status(400).json({ detail: "catalog_item_id is required" }); return; }

  // Get max sort order
  const maxOrder = await db
    .select({ max: sql<number>`COALESCE(MAX(sort_order), -1)` })
    .from(pepprTemplateItems)
    .where(eq(pepprTemplateItems.templateId, req.params.id));

  await db.insert(pepprTemplateItems).values({
    id: generateId(), templateId: req.params.id, catalogItemId: catalog_item_id,
    sortOrder: (maxOrder[0]?.max || 0) + 1,
  });

  const template = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, req.params.id)).limit(1);
  if (!template[0]) { res.status(404).json({ detail: "Template not found" }); return; }
  res.json(await formatTemplate(db, template[0]));
}));

// ── REMOVE ITEM ──────────────────────────────────────────────────────────────
router.delete("/:id/items/:itemId", requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const db = await getDb();
  if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

  await db.delete(pepprTemplateItems).where(eq(pepprTemplateItems.id, req.params.itemId));

  const template = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, req.params.id)).limit(1);
  if (!template[0]) { res.status(404).json({ detail: "Template not found" }); return; }
  res.json(await formatTemplate(db, template[0]));
}));

export default router;
