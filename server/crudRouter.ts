/**
 * tRPC CRUD Router — Type-safe procedures for core entities.
 *
 * Replaces the ky/axios → Express REST flow with tRPC procedures
 * that use protectedProcedure (Manus OAuth session cookie).
 *
 * Entities: partners, properties, rooms, providers, catalog, templates, assignments
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  pepprPartners,
  pepprProperties,
  pepprRooms,
  pepprQrCodes,
  pepprServiceProviders,
  pepprCatalogItems,
  pepprServiceTemplates,
  pepprTemplateItems,
  pepprRoomTemplateAssignments,
  pepprAuditEvents,
} from "../drizzle/schema";
import { eq, and, like, sql, asc, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// ── Shared helpers ──────────────────────────────────────────────────────────
function generateId(): string {
  return nanoid(21);
}

const paginationInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(1000).default(20),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

function paginatedResult<T>(items: T[], total: number, page: number, pageSize: number) {
  return {
    items,
    total,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(total / pageSize),
  };
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

async function countRows(db: any, table: any, where?: any): Promise<number> {
  const query = where
    ? db.select({ count: sql<number>`count(*)` }).from(table).where(where)
    : db.select({ count: sql<number>`count(*)` }).from(table);
  const result = await query;
  return Number(result[0]?.count || 0);
}

// ── Partners ────────────────────────────────────────────────────────────────
const partnersRouter = router({
  list: protectedProcedure.input(paginationInput).query(async ({ input }) => {
    const db = await requireDb();
    const where = input.search ? like(pepprPartners.name, `%${input.search}%`) : undefined;
    const total = await countRows(db, pepprPartners, where);
    const orderFn = input.sortOrder === "desc" ? desc : asc;
    const rows = await db.select().from(pepprPartners).where(where)
      .orderBy(orderFn(pepprPartners.createdAt))
      .limit(input.pageSize).offset((input.page - 1) * input.pageSize);
    // Count properties per partner
    const propCounts = new Map<string, number>();
    for (const r of rows) {
      const cnt = await countRows(db, pepprProperties, eq(pepprProperties.partnerId, r.id));
      propCounts.set(r.id, cnt);
    }
    const items = rows.map((r: any) => ({
      id: r.id, name: r.name, email: r.email, phone: r.phone ?? null,
      address: r.address ?? null, contact_person: r.contactPerson ?? null,
      status: r.status, created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
      properties_count: propCounts.get(r.id) ?? 0,
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(pepprPartners).where(eq(pepprPartners.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });
    const propertiesCount = await countRows(db, pepprProperties, eq(pepprProperties.partnerId, row.id));
    return {
      id: row.id, name: row.name, email: row.email, phone: row.phone ?? null,
      address: row.address ?? null, contact_person: row.contactPerson ?? null,
      status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
      properties_count: propertiesCount,
    };
  }),

  create: protectedProcedure.input(z.object({
    name: z.string(), email: z.string(), phone: z.string().optional(),
    address: z.string().optional(), contact_person: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    await db.insert(pepprPartners).values({
      id, name: input.name, email: input.email,
      phone: input.phone ?? null, address: input.address ?? null,
      contactPerson: input.contact_person ?? null,
    });
    const [created] = await db.select().from(pepprPartners).where(eq(pepprPartners.id, id)).limit(1);
    return {
      id: created.id, name: created.name, email: created.email, phone: created.phone ?? null,
      address: created.address ?? null, contact_person: created.contactPerson ?? null,
      status: created.status, created_at: created.createdAt.toISOString(), updated_at: created.updatedAt.toISOString(),
    };
  }),

  update: protectedProcedure.input(z.object({
    id: z.string(),
    name: z.string().optional(), email: z.string().optional(), phone: z.string().optional(),
    address: z.string().optional(), contact_person: z.string().optional(), status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...fields } = input;
    const updates: Record<string, any> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.email !== undefined) updates.email = fields.email;
    if (fields.phone !== undefined) updates.phone = fields.phone;
    if (fields.address !== undefined) updates.address = fields.address;
    if (fields.contact_person !== undefined) updates.contactPerson = fields.contact_person;
    if (fields.status !== undefined) updates.status = fields.status;
    if (Object.keys(updates).length > 0) {
      await db.update(pepprPartners).set(updates).where(eq(pepprPartners.id, id));
    }
    const [updated] = await db.select().from(pepprPartners).where(eq(pepprPartners.id, id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });
    return {
      id: updated.id, name: updated.name, email: updated.email, phone: updated.phone ?? null,
      address: updated.address ?? null, contact_person: updated.contactPerson ?? null,
      status: updated.status, created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),

  deactivate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(pepprPartners).set({ status: "inactive" }).where(eq(pepprPartners.id, input.id));
    const [updated] = await db.select().from(pepprPartners).where(eq(pepprPartners.id, input.id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Partner not found" });
    return { id: updated.id, name: updated.name, status: updated.status };
  }),
});

// ── Properties ──────────────────────────────────────────────────────────────
const propertiesRouter = router({
  list: protectedProcedure.input(paginationInput.extend({
    partner_id: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions: any[] = [];
    if (input.search) conditions.push(like(pepprProperties.name, `%${input.search}%`));
    if (input.partner_id) conditions.push(eq(pepprProperties.partnerId, input.partner_id));
    const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;
    const total = await countRows(db, pepprProperties, where);
    const orderFn = input.sortOrder === "desc" ? desc : asc;
    const rows = await db.select().from(pepprProperties).where(where)
      .orderBy(orderFn(pepprProperties.createdAt))
      .limit(input.pageSize).offset((input.page - 1) * input.pageSize);
    // Get partner names
    const partnerIds = Array.from(new Set(rows.map((r: any) => r.partnerId)));
    const partners = partnerIds.length
      ? await db.select({ id: pepprPartners.id, name: pepprPartners.name }).from(pepprPartners)
      : [];
    const partnerMap = new Map(partners.map((p: any) => [p.id, p.name]));
    // Count rooms per property
    const roomCounts = new Map<string, number>();
    for (const r of rows) {
      const cnt = await countRows(db, pepprRooms, eq(pepprRooms.propertyId, r.id));
      roomCounts.set(r.id, cnt);
    }
    const items = rows.map((r: any) => ({
      id: r.id, partner_id: r.partnerId, name: r.name, type: r.type,
      address: r.address, city: r.city, country: r.country, timezone: r.timezone,
      currency: r.currency, phone: r.phone ?? null, email: r.email ?? null,
      status: r.status, created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
      partner_name: partnerMap.get(r.partnerId) ?? null,
      rooms_count: roomCounts.get(r.id) ?? 0,
      room_count: roomCounts.get(r.id) ?? 0,
      active_qr_count: 0,
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(pepprProperties).where(eq(pepprProperties.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
    const [partner] = await db.select({ name: pepprPartners.name }).from(pepprPartners).where(eq(pepprPartners.id, row.partnerId)).limit(1);
    const roomCount = await countRows(db, pepprRooms, eq(pepprRooms.propertyId, row.id));
    return {
      id: row.id, partner_id: row.partnerId, name: row.name, type: row.type,
      address: row.address, city: row.city, country: row.country, timezone: row.timezone,
      currency: row.currency, phone: row.phone ?? null, email: row.email ?? null,
      status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
      partner_name: partner?.name ?? null, rooms_count: roomCount, room_count: roomCount, active_qr_count: 0,
    };
  }),

  create: protectedProcedure.input(z.object({
    partner_id: z.string(), name: z.string(), type: z.string(),
    address: z.string(), city: z.string(), country: z.string(),
    timezone: z.string().default("UTC"), currency: z.string().default("THB"),
    phone: z.string().optional(), email: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    await db.insert(pepprProperties).values({
      id, partnerId: input.partner_id, name: input.name, type: input.type,
      address: input.address, city: input.city, country: input.country,
      timezone: input.timezone, currency: input.currency,
      phone: input.phone ?? null, email: input.email ?? null,
    });
    const [created] = await db.select().from(pepprProperties).where(eq(pepprProperties.id, id)).limit(1);
    return {
      id: created.id, partner_id: created.partnerId, name: created.name, type: created.type,
      address: created.address, city: created.city, country: created.country,
      timezone: created.timezone, currency: created.currency,
      phone: created.phone ?? null, email: created.email ?? null,
      status: created.status, created_at: created.createdAt.toISOString(), updated_at: created.updatedAt.toISOString(),
      partner_name: null, room_count: 0,
    };
  }),

  update: protectedProcedure.input(z.object({
    id: z.string(),
    partner_id: z.string().optional(), name: z.string().optional(), type: z.string().optional(),
    address: z.string().optional(), city: z.string().optional(), country: z.string().optional(),
    timezone: z.string().optional(), currency: z.string().optional(),
    phone: z.string().optional(), email: z.string().optional(), status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...fields } = input;
    const updates: Record<string, any> = {};
    const fieldMap: Record<string, string> = {
      partner_id: "partnerId", name: "name", type: "type", address: "address",
      city: "city", country: "country", timezone: "timezone", currency: "currency",
      phone: "phone", email: "email", status: "status",
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if ((fields as any)[key] !== undefined) updates[dbKey] = (fields as any)[key];
    }
    if (Object.keys(updates).length > 0) {
      await db.update(pepprProperties).set(updates).where(eq(pepprProperties.id, id));
    }
    const [updated] = await db.select().from(pepprProperties).where(eq(pepprProperties.id, id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Property not found" });
    return {
      id: updated.id, partner_id: updated.partnerId, name: updated.name, type: updated.type,
      address: updated.address, city: updated.city, country: updated.country,
      timezone: updated.timezone, currency: updated.currency,
      phone: updated.phone ?? null, email: updated.email ?? null,
      status: updated.status, created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),
  deactivate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(pepprProperties).set({ status: "inactive" }).where(eq(pepprProperties.id, input.id));
    return { id: input.id, status: "inactive" };
  }),
});

// ── Rooms ────────────────────────────────────────────────────────────────────
const roomsRouter = router({
  list: protectedProcedure.input(paginationInput.extend({
    property_id: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions: any[] = [];
    if (input.search) conditions.push(like(pepprRooms.roomNumber, `%${input.search}%`));
    if (input.property_id) conditions.push(eq(pepprRooms.propertyId, input.property_id));
    const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;
    const total = await countRows(db, pepprRooms, where);
    const orderFn = input.sortOrder === "desc" ? desc : asc;
    const rows = await db.select().from(pepprRooms).where(where)
      .orderBy(orderFn(pepprRooms.roomNumber))
      .limit(input.pageSize).offset((input.page - 1) * input.pageSize);
    // Batch-fetch template names and item counts for all rooms in this page
    const templateIds = Array.from(new Set(rows.map((r: any) => r.templateId).filter(Boolean)));
    const templateNameMap = new Map<string, string>();
    const templateItemCountMap = new Map<string, number>();
    if (templateIds.length > 0) {
      const tmplRows = await db.select({ id: pepprServiceTemplates.id, name: pepprServiceTemplates.name })
        .from(pepprServiceTemplates)
        .where(sql`${pepprServiceTemplates.id} IN (${sql.join(templateIds.map(id => sql`${id}`), sql`, `)})`);
      for (const t of tmplRows) templateNameMap.set(t.id, t.name);
      const countRows2 = await db.select({
        templateId: pepprTemplateItems.templateId,
        cnt: sql<number>`COUNT(*)`,
      }).from(pepprTemplateItems)
        .where(sql`${pepprTemplateItems.templateId} IN (${sql.join(templateIds.map(id => sql`${id}`), sql`, `)})`)
        .groupBy(pepprTemplateItems.templateId);
      for (const c of countRows2) templateItemCountMap.set(c.templateId, Number(c.cnt));
    }
    const items = rows.map((r: any) => ({
      id: r.id, property_id: r.propertyId, room_number: r.roomNumber,
      floor: r.floor ?? null, zone: r.zone ?? null, room_type: r.roomType,
      template_id: r.templateId ?? null,
      template_name: r.templateId ? (templateNameMap.get(r.templateId) ?? null) : null,
      template_item_count: r.templateId ? (templateItemCountMap.get(r.templateId) ?? 0) : null,
      status: r.status,
      created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(pepprRooms).where(eq(pepprRooms.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
    const [prop] = await db.select({ name: pepprProperties.name }).from(pepprProperties).where(eq(pepprProperties.id, row.propertyId)).limit(1);
    // Fetch the active QR code assigned to this room (if any)
    const [qrRow] = await db
      .select({ qrCodeId: pepprQrCodes.qrCodeId, qrDbId: pepprQrCodes.id, accessType: pepprQrCodes.accessType })
      .from(pepprQrCodes)
      .where(and(eq(pepprQrCodes.roomId, input.id), eq(pepprQrCodes.status, "active")))
      .limit(1);
    return {
      id: row.id, property_id: row.propertyId, room_number: row.roomNumber,
      floor: row.floor ?? null, zone: row.zone ?? null, room_type: row.roomType,
      template_id: row.templateId ?? null, status: row.status,
      created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
      property_name: prop?.name ?? null,
      qr_code_id: qrRow?.qrCodeId ?? null,
      qr_db_id: qrRow?.qrDbId ?? null,
      qr_access_type: qrRow?.accessType ?? null,
    };
  }),

  create: protectedProcedure.input(z.object({
    property_id: z.string(), room_number: z.string(), room_type: z.string(),
    floor: z.string().optional(), zone: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    await db.insert(pepprRooms).values({
      id, propertyId: input.property_id, roomNumber: input.room_number,
      roomType: input.room_type, floor: input.floor ?? null, zone: input.zone ?? null,
    });
    const [created] = await db.select().from(pepprRooms).where(eq(pepprRooms.id, id)).limit(1);
    return {
      id: created.id, property_id: created.propertyId, room_number: created.roomNumber,
      floor: created.floor ?? null, zone: created.zone ?? null, room_type: created.roomType,
      template_id: created.templateId ?? null, status: created.status,
      created_at: created.createdAt.toISOString(), updated_at: created.updatedAt.toISOString(),
    };
  }),

  bulkCreate: protectedProcedure.input(z.object({
    property_id: z.string(),
    rooms: z.array(z.object({
      room_number: z.string(), room_type: z.string(),
      floor: z.string().optional(), zone: z.string().optional(),
    })),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const values = input.rooms.map(r => ({
      id: generateId(), propertyId: input.property_id,
      roomNumber: r.room_number, roomType: r.room_type,
      floor: r.floor ?? null, zone: r.zone ?? null,
    }));
    if (values.length > 0) {
      await db.insert(pepprRooms).values(values);
    }
    return { created: values.length };
  }),

  update: protectedProcedure.input(z.object({
    id: z.string(),
    room_number: z.string().optional(), room_type: z.string().optional(),
    floor: z.string().optional(), zone: z.string().optional(), status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...fields } = input;
    const updates: Record<string, any> = {};
    if (fields.room_number !== undefined) updates.roomNumber = fields.room_number;
    if (fields.room_type !== undefined) updates.roomType = fields.room_type;
    if (fields.floor !== undefined) updates.floor = fields.floor;
    if (fields.zone !== undefined) updates.zone = fields.zone;
    if (fields.status !== undefined) updates.status = fields.status;
    if (Object.keys(updates).length > 0) {
      await db.update(pepprRooms).set(updates).where(eq(pepprRooms.id, id));
    }
    const [updated] = await db.select().from(pepprRooms).where(eq(pepprRooms.id, id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
    let template_name: string | null = null;
    if (updated.templateId) {
      const [tmpl] = await db.select({ name: pepprServiceTemplates.name }).from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, updated.templateId)).limit(1);
      template_name = tmpl?.name ?? null;
    }
    return {
      id: updated.id, property_id: updated.propertyId, room_number: updated.roomNumber,
      floor: updated.floor ?? null, zone: updated.zone ?? null, room_type: updated.roomType,
      template_id: updated.templateId ?? null, template_name, status: updated.status,
      created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),

  assignTemplate: protectedProcedure.input(z.object({
    roomId: z.string(), templateId: z.string(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(pepprRooms).set({ templateId: input.templateId }).where(eq(pepprRooms.id, input.roomId));
    const [updated] = await db.select().from(pepprRooms).where(eq(pepprRooms.id, input.roomId)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
    let template_name: string | null = null;
    if (updated.templateId) {
      const [tmpl] = await db.select({ name: pepprServiceTemplates.name }).from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, updated.templateId)).limit(1);
      template_name = tmpl?.name ?? null;
    }
    return {
      id: updated.id, property_id: updated.propertyId, room_number: updated.roomNumber,
      floor: updated.floor ?? null, zone: updated.zone ?? null, room_type: updated.roomType,
      template_id: updated.templateId ?? null, template_name, status: updated.status,
      created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),

  removeTemplate: protectedProcedure.input(z.object({
    roomId: z.string(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(pepprRooms).set({ templateId: null }).where(eq(pepprRooms.id, input.roomId));
    const [updated] = await db.select().from(pepprRooms).where(eq(pepprRooms.id, input.roomId)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
    return {
      id: updated.id, property_id: updated.propertyId, room_number: updated.roomNumber,
      floor: updated.floor ?? null, zone: updated.zone ?? null, room_type: updated.roomType,
      template_id: null, template_name: null, status: updated.status,
      created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),
});

// ── Service Providers ───────────────────────────────────────────────────────
const providersRouter = router({
  list: protectedProcedure.input(paginationInput).query(async ({ input }) => {
    const db = await requireDb();
    const where = input.search ? like(pepprServiceProviders.name, `%${input.search}%`) : undefined;
    const total = await countRows(db, pepprServiceProviders, where);
    const orderFn = input.sortOrder === "desc" ? desc : asc;
    const rows = await db.select().from(pepprServiceProviders).where(where)
      .orderBy(orderFn(pepprServiceProviders.createdAt))
      .limit(input.pageSize).offset((input.page - 1) * input.pageSize);
    // Count catalog items per provider
    const catCounts = new Map<string, number>();
    for (const r of rows) {
      const cnt = await countRows(db, pepprCatalogItems, eq(pepprCatalogItems.providerId, r.id));
      catCounts.set(r.id, cnt);
    }
    const items = rows.map((r: any) => ({
      id: r.id, name: r.name, email: r.email, phone: r.phone ?? null,
      category: r.category, service_area: r.serviceArea,
      contact_person: r.contactPerson ?? null, rating: r.rating ?? null,
      status: r.status, created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
      catalog_items_count: catCounts.get(r.id) ?? 0,
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
    const catalogItemsCount = await countRows(db, pepprCatalogItems, eq(pepprCatalogItems.providerId, row.id));
    return {
      id: row.id, name: row.name, email: row.email, phone: row.phone ?? null,
      category: row.category, service_area: row.serviceArea,
      contact_person: row.contactPerson ?? null, rating: row.rating ?? null,
      status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
      catalog_items_count: catalogItemsCount,
    };
  }),

  create: protectedProcedure.input(z.object({
    name: z.string(), email: z.string(), category: z.string(), service_area: z.string(),
    phone: z.string().optional(), contact_person: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    await db.insert(pepprServiceProviders).values({
      id, name: input.name, email: input.email, category: input.category,
      serviceArea: input.service_area, phone: input.phone ?? null,
      contactPerson: input.contact_person ?? null,
    });
    const [created] = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, id)).limit(1);
    return {
      id: created.id, name: created.name, email: created.email, phone: created.phone ?? null,
      category: created.category, service_area: created.serviceArea,
      contact_person: created.contactPerson ?? null, rating: created.rating ?? null,
      status: created.status, created_at: created.createdAt.toISOString(), updated_at: created.updatedAt.toISOString(),
    };
  }),

  update: protectedProcedure.input(z.object({
    id: z.string(),
    name: z.string().optional(), email: z.string().optional(), phone: z.string().optional(),
    category: z.string().optional(), service_area: z.string().optional(),
    contact_person: z.string().optional(), status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...fields } = input;
    const updates: Record<string, any> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.email !== undefined) updates.email = fields.email;
    if (fields.phone !== undefined) updates.phone = fields.phone;
    if (fields.category !== undefined) updates.category = fields.category;
    if (fields.service_area !== undefined) updates.serviceArea = fields.service_area;
    if (fields.contact_person !== undefined) updates.contactPerson = fields.contact_person;
    if (fields.status !== undefined) updates.status = fields.status;
    if (Object.keys(updates).length > 0) {
      await db.update(pepprServiceProviders).set(updates).where(eq(pepprServiceProviders.id, id));
    }
    const [updated] = await db.select().from(pepprServiceProviders).where(eq(pepprServiceProviders.id, id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Provider not found" });
    return {
      id: updated.id, name: updated.name, email: updated.email, phone: updated.phone ?? null,
      category: updated.category, service_area: updated.serviceArea,
      contact_person: updated.contactPerson ?? null, rating: updated.rating ?? null,
      status: updated.status, created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),
  deactivate: protectedProcedure.input(z.object({ id: z.string() })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.update(pepprServiceProviders).set({ status: "inactive" }).where(eq(pepprServiceProviders.id, input.id));
    return { id: input.id, status: "inactive" };
  }),
});

// ── Catalog Items ───────────────────────────────────────────────────────────
const catalogRouter = router({
  list: protectedProcedure.input(paginationInput.extend({
    provider_id: z.string().optional(),
    category: z.string().optional(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const conditions: any[] = [];
    if (input.search) conditions.push(like(pepprCatalogItems.name, `%${input.search}%`));
    if (input.provider_id) conditions.push(eq(pepprCatalogItems.providerId, input.provider_id));
    if (input.category) conditions.push(eq(pepprCatalogItems.category, input.category));
    const where = conditions.length === 1 ? conditions[0] : conditions.length > 1 ? and(...conditions) : undefined;
    const total = await countRows(db, pepprCatalogItems, where);
    const orderFn = input.sortOrder === "desc" ? desc : asc;
    const rows = await db.select().from(pepprCatalogItems).where(where)
      .orderBy(orderFn(pepprCatalogItems.createdAt))
      .limit(input.pageSize).offset((input.page - 1) * input.pageSize);
    // Get provider names
    const providerIds = Array.from(new Set(rows.map((r: any) => r.providerId)));
    const providers = providerIds.length
      ? await db.select({ id: pepprServiceProviders.id, name: pepprServiceProviders.name }).from(pepprServiceProviders)
      : [];
    const provMap = new Map(providers.map((p: any) => [p.id, p.name]));
    const items = rows.map((r: any) => ({
      id: r.id, provider_id: r.providerId, name: r.name, description: r.description ?? null,
      sku: r.sku, category: r.category, price: r.price, currency: r.currency,
      unit: r.unit, duration_minutes: r.durationMinutes ?? null, terms: r.terms ?? null,
      status: r.status, created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
      provider_name: provMap.get(r.providerId) ?? null,
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Catalog item not found" });
    const [prov] = await db.select({ name: pepprServiceProviders.name }).from(pepprServiceProviders).where(eq(pepprServiceProviders.id, row.providerId)).limit(1);
    return {
      id: row.id, provider_id: row.providerId, name: row.name, description: row.description ?? null,
      sku: row.sku, category: row.category, price: row.price, currency: row.currency,
      unit: row.unit, duration_minutes: row.durationMinutes ?? null, terms: row.terms ?? null,
      status: row.status, created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
      provider_name: prov?.name ?? null,
    };
  }),

  create: protectedProcedure.input(z.object({
    provider_id: z.string(), name: z.string(), sku: z.string(), category: z.string(),
    price: z.number(), description: z.string().optional(), currency: z.string().default("THB"),
    unit: z.string().default("each"), duration_minutes: z.number().optional(), terms: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    await db.insert(pepprCatalogItems).values({
      id, providerId: input.provider_id, name: input.name, sku: input.sku,
      category: input.category, price: String(input.price), currency: input.currency,
      unit: input.unit, description: input.description ?? null,
      durationMinutes: input.duration_minutes ?? null, terms: input.terms ?? null,
    });
    const [created] = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, id)).limit(1);
    return {
      id: created.id, provider_id: created.providerId, name: created.name,
      description: created.description ?? null, sku: created.sku, category: created.category,
      price: created.price, currency: created.currency, unit: created.unit,
      duration_minutes: created.durationMinutes ?? null, terms: created.terms ?? null,
      status: created.status, created_at: created.createdAt.toISOString(), updated_at: created.updatedAt.toISOString(),
      provider_name: null,
    };
  }),

  update: protectedProcedure.input(z.object({
    id: z.string(),
    provider_id: z.string().optional(), name: z.string().optional(), sku: z.string().optional(),
    category: z.string().optional(), price: z.number().optional(), description: z.string().optional(),
    currency: z.string().optional(), unit: z.string().optional(),
    duration_minutes: z.number().optional(), terms: z.string().optional(), status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...fields } = input;
    const updates: Record<string, any> = {};
    const fieldMap: Record<string, string> = {
      provider_id: "providerId", name: "name", sku: "sku", category: "category",
      description: "description", currency: "currency", unit: "unit",
      duration_minutes: "durationMinutes", terms: "terms", status: "status",
    };
    for (const [key, dbKey] of Object.entries(fieldMap)) {
      if ((fields as any)[key] !== undefined) updates[dbKey] = (fields as any)[key];
    }
    if (fields.price !== undefined) updates.price = String(fields.price);
    if (Object.keys(updates).length > 0) {
      await db.update(pepprCatalogItems).set(updates).where(eq(pepprCatalogItems.id, id));
    }
    const [updated] = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Catalog item not found" });
    return {
      id: updated.id, provider_id: updated.providerId, name: updated.name,
      description: updated.description ?? null, sku: updated.sku, category: updated.category,
      price: updated.price, currency: updated.currency, unit: updated.unit,
      status: updated.status, created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),

  /**
   * Dedicated deactivate procedure — sets status to 'inactive' and writes an audit log entry.
   * Preferred over catalog.update({ status: 'inactive' }) for proper audit trail.
   */
  deactivate: protectedProcedure
    .input(z.object({
      id: z.string(),
      reason: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      const [item] = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, input.id)).limit(1);
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Catalog item not found" });
      if (item.status === "inactive") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Catalog item is already inactive" });
      }
      await db.update(pepprCatalogItems)
        .set({ status: "inactive" })
        .where(eq(pepprCatalogItems.id, input.id));
      // Write audit log entry
      await db.insert(pepprAuditEvents).values({
        actorType: "USER",
        actorId: ctx.user.openId,
        action: "CATALOG_DEACTIVATED",
        resourceType: "catalog",
        resourceId: input.id,
        details: {
          name: item.name,
          sku: item.sku,
          previousStatus: item.status,
          reason: input.reason ?? null,
          actorName: ctx.user.name,
        },
      });
      return { id: input.id, status: "inactive" as const };
    }),
});

// ── Service Templates ───────────────────────────────────────────────────────
const templatesRouter = router({
  list: protectedProcedure.input(paginationInput).query(async ({ input }) => {
    const db = await requireDb();
    const where = input.search ? like(pepprServiceTemplates.name, `%${input.search}%`) : undefined;
    const total = await countRows(db, pepprServiceTemplates, where);
    const orderFn = input.sortOrder === "desc" ? desc : asc;
    const rows = await db.select().from(pepprServiceTemplates).where(where)
      .orderBy(orderFn(pepprServiceTemplates.createdAt))
      .limit(input.pageSize).offset((input.page - 1) * input.pageSize);
    // Get template items for each template
    const items = await Promise.all(rows.map(async (r: any) => {
      const templateItems = await db.select().from(pepprTemplateItems)
        .where(eq(pepprTemplateItems.templateId, r.id))
        .orderBy(asc(pepprTemplateItems.sortOrder));
      // Get catalog item details
      const catalogIds = templateItems.map((ti: any) => ti.catalogItemId);
      const catalogItems = catalogIds.length
        ? await Promise.all(catalogIds.map(async (cid: string) => {
            const [ci] = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, cid)).limit(1);
            return ci;
          }))
        : [];
      // Count assigned rooms
      const assignedRoomsCount = await countRows(db, pepprRoomTemplateAssignments, eq(pepprRoomTemplateAssignments.templateId, r.id));
      // Calculate total price
      const totalPrice = catalogItems.filter(Boolean).reduce((sum: number, ci: any) => sum + (parseFloat(ci?.price || '0')), 0);
      return {
        id: r.id, name: r.name, description: r.description ?? null,
        tier: r.tier, status: r.status,
        created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
        item_count: templateItems.length,
        assigned_rooms_count: assignedRoomsCount,
        total_price: totalPrice,
        items: templateItems.map((ti: any, idx: number) => {
          const ci = catalogItems[idx];
          return {
            id: ti.id,
            catalog_item_id: ti.catalogItemId,
            catalog_item_name: ci?.name ?? "Unknown",
            provider_name: "",
            price: ci ? parseFloat(ci.price || "0") : 0,
            currency: ci?.currency ?? "THB",
            sort_order: ti.sortOrder,
          };
        }),
      };
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  get: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const [row] = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, input.id)).limit(1);
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    const templateItems = await db.select().from(pepprTemplateItems)
      .where(eq(pepprTemplateItems.templateId, row.id))
      .orderBy(asc(pepprTemplateItems.sortOrder));
    const catalogItems = await Promise.all(templateItems.map(async (ti: any) => {
      const [ci] = await db.select().from(pepprCatalogItems).where(eq(pepprCatalogItems.id, ti.catalogItemId)).limit(1);
      return ci;
    }));
    return {
      id: row.id, name: row.name, description: row.description ?? null,
      tier: row.tier, status: row.status,
      created_at: row.createdAt.toISOString(), updated_at: row.updatedAt.toISOString(),
      items: templateItems.map((ti: any, idx: number) => {
        const ci = catalogItems[idx];
        return {
          id: ti.id,
          catalog_item_id: ti.catalogItemId,
          catalog_item_name: ci?.name ?? "Unknown",
          provider_name: "",
          price: ci ? parseFloat(ci.price || "0") : 0,
          currency: ci?.currency ?? "THB",
          sort_order: ti.sortOrder,
        };
      }),
    };
  }),

  create: protectedProcedure.input(z.object({
    name: z.string(), tier: z.string(), description: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    await db.insert(pepprServiceTemplates).values({
      id, name: input.name, tier: input.tier, description: input.description ?? null,
    });
    const [created] = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, id)).limit(1);
    return {
      id: created.id, name: created.name, description: created.description ?? null,
      tier: created.tier, status: created.status,
      created_at: created.createdAt.toISOString(), updated_at: created.updatedAt.toISOString(),
      items: [],
    };
  }),

  update: protectedProcedure.input(z.object({
    id: z.string(),
    name: z.string().optional(), tier: z.string().optional(),
    description: z.string().optional(), status: z.string().optional(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const { id, ...fields } = input;
    const updates: Record<string, any> = {};
    if (fields.name !== undefined) updates.name = fields.name;
    if (fields.tier !== undefined) updates.tier = fields.tier;
    if (fields.description !== undefined) updates.description = fields.description;
    if (fields.status !== undefined) updates.status = fields.status;
    if (Object.keys(updates).length > 0) {
      await db.update(pepprServiceTemplates).set(updates).where(eq(pepprServiceTemplates.id, id));
    }
    const [updated] = await db.select().from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, id)).limit(1);
    if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
    return {
      id: updated.id, name: updated.name, description: updated.description ?? null,
      tier: updated.tier, status: updated.status,
      created_at: updated.createdAt.toISOString(), updated_at: updated.updatedAt.toISOString(),
    };
  }),

  addItem: protectedProcedure.input(z.object({
    templateId: z.string(), catalogItemId: z.string(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    const id = generateId();
    // Get max sort order
    const existing = await db.select({ sortOrder: pepprTemplateItems.sortOrder })
      .from(pepprTemplateItems).where(eq(pepprTemplateItems.templateId, input.templateId))
      .orderBy(desc(pepprTemplateItems.sortOrder)).limit(1);
    const nextSort = (existing[0]?.sortOrder ?? -1) + 1;
    await db.insert(pepprTemplateItems).values({
      id, templateId: input.templateId, catalogItemId: input.catalogItemId, sortOrder: nextSort,
    });
    return { id, template_id: input.templateId, catalog_item_id: input.catalogItemId, sort_order: nextSort };
  }),

  removeItem: protectedProcedure.input(z.object({
    templateId: z.string(), itemId: z.string(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    await db.delete(pepprTemplateItems).where(
      and(eq(pepprTemplateItems.templateId, input.templateId), eq(pepprTemplateItems.id, input.itemId))
    );
    return { success: true };
  }),
});

// ── Assignments ─────────────────────────────────────────────────────────────
const assignmentsRouter = router({
  listByRoom: protectedProcedure.input(z.object({ roomId: z.string() })).query(async ({ input }) => {
    const db = await requireDb();
    const rows = await db.select().from(pepprRoomTemplateAssignments)
      .where(eq(pepprRoomTemplateAssignments.roomId, input.roomId));
    // Get template names
    const results = await Promise.all(rows.map(async (r: any) => {
      const [tmpl] = await db.select({ name: pepprServiceTemplates.name })
        .from(pepprServiceTemplates).where(eq(pepprServiceTemplates.id, r.templateId)).limit(1);
      return { template_id: r.templateId, template_name: tmpl?.name ?? "Unknown" };
    }));
    return results;
  }),

  listByTemplate: protectedProcedure.input(paginationInput.extend({
    templateId: z.string(),
  })).query(async ({ input }) => {
    const db = await requireDb();
    const assignments = await db.select().from(pepprRoomTemplateAssignments)
      .where(eq(pepprRoomTemplateAssignments.templateId, input.templateId));
    const roomIds = assignments.map((a: any) => a.roomId);
    if (roomIds.length === 0) return paginatedResult([], 0, input.page, input.pageSize);
    // Get rooms
    const rooms = await Promise.all(roomIds.map(async (rid: string) => {
      const [room] = await db.select().from(pepprRooms).where(eq(pepprRooms.id, rid)).limit(1);
      return room;
    }));
    const validRooms = rooms.filter(Boolean);
    const total = validRooms.length;
    const start = (input.page - 1) * input.pageSize;
    const paged = validRooms.slice(start, start + input.pageSize);
    const items = paged.map((r: any) => ({
      id: r.id, property_id: r.propertyId, room_number: r.roomNumber,
      floor: r.floor ?? null, zone: r.zone ?? null, room_type: r.roomType,
      template_id: r.templateId ?? null, status: r.status,
    }));
    return paginatedResult(items, total, input.page, input.pageSize);
  }),

  bulkAssign: protectedProcedure.input(z.object({
    room_ids: z.array(z.string()), template_id: z.string(),
  })).mutation(async ({ input }) => {
    const db = await requireDb();
    let assigned = 0;
    let skipped = 0;
    for (const roomId of input.room_ids) {
      // Check if already assigned
      const existing = await db.select().from(pepprRoomTemplateAssignments)
        .where(and(
          eq(pepprRoomTemplateAssignments.roomId, roomId),
          eq(pepprRoomTemplateAssignments.templateId, input.template_id),
        )).limit(1);
      if (existing.length > 0) { skipped++; continue; }
      await db.insert(pepprRoomTemplateAssignments).values({
        roomId, templateId: input.template_id,
      });
      assigned++;
    }
    return { assigned, skipped };
  }),
});

// ── Export combined router ──────────────────────────────────────────────────
export const crudRouter = router({
  partners: partnersRouter,
  properties: propertiesRouter,
  rooms: roomsRouter,
  providers: providersRouter,
  catalog: catalogRouter,
  templates: templatesRouter,
  assignments: assignmentsRouter,
});
