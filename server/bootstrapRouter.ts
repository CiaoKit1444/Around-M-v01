/**
 * bootstrapRouter — Secret Chamber operations for SUPER_ADMIN only.
 *
 * Five destructive / seed operations:
 *   P1  purgeTransactions        — delete all transaction-layer rows only
 *   P2  purgeMasterAndTx         — delete master + transaction, reset counters
 *   P3  purgeAllAndSeed          — P2 + SP layer, then seed 10 demo hotels
 *   S1  purgeSpAll               — delete all SP providers + services + cascade tx rows
 *   S2  purgeSpServicesOnly      — delete catalog items, templates, template_items only
 *
 * Every operation:
 *   - Requires caller to hold SUPER_ADMIN role in peppr_user_roles
 *   - Accepts a `confirmCode` that must match the operation's expected code
 *   - Writes a BOOTSTRAP_* audit event to peppr_audit_events
 *   - Returns a summary of rows deleted / created per table
 */

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "./db";
import { nanoid } from "nanoid";

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

function affected(res: any): number {
  return (res as any).rowsAffected ?? (res as any)[0]?.affectedRows ?? 0;
}
import {
  pepprPartners,
  pepprProperties,
  pepprPropertyConfig,
  pepprPropertyBanners,
  pepprRooms,
  pepprQrCodes,
  pepprRoomTemplateAssignments,
  pepprStaffPositions,
  pepprStaffMembers,
  pepprUserRoles,
  pepprUsers,
  pepprServiceProviders,
  pepprCatalogItems,
  pepprServiceTemplates,
  pepprTemplateItems,
  pepprServiceOperators,
  pepprServiceRequests,
  pepprRequestItems,
  pepprRequestEvents,
  pepprRequestNotes,
  pepprSpAssignments,
  pepprSpTickets,
  pepprSoJobs,
  pepprPayments,
  pepprGuestSessions,
  pepprStayTokens,
  pepprAuditEvents,
  jtiRevocations,
  tfaRecoveryTokens,
} from "../drizzle/schema";
import { inArray, ne, sql } from "drizzle-orm";

// ── Confirm codes (shown in UI, typed by admin) ──────────────────────────────
export const CONFIRM_CODES: Record<string, string> = {
  P1: "PURGE-TX",
  P2: "PURGE-ALL",
  P3: "SEED-NOW",
  S1: "PURGE-SP",
  S2: "PURGE-SVC",
};

// ── Production environment guard ────────────────────────────────────────────
/**
 * Blocks destructive operations (P2, P3) in production environments.
 * Production is detected when NODE_ENV=production AND the origin is not localhost.
 */
function assertNotProduction(origin?: string) {
  const isProductionEnv = process.env.NODE_ENV === "production";
  const isLocalhost = !origin || origin.includes("localhost") || origin.includes("127.0.0.1");
  if (isProductionEnv && !isLocalhost) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This operation is disabled in production. Use a staging environment.",
    });
  }
}

// ── SUPER_ADMIN guard ────────────────────────────────────────────────────────
async function assertSuperAdmin(userId: number | string) {
  const db = await requireDb();
  const userIdStr = String(userId);
  const roles = await db
    .select({ roleId: pepprUserRoles.roleId })
    .from(pepprUserRoles)
    .where(sql`${pepprUserRoles.userId} = ${userIdStr}`);
  const isSuperAdmin = roles.some((r: { roleId: string }) => r.roleId === "SUPER_ADMIN");
  if (!isSuperAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Secret Chamber requires SUPER_ADMIN role",
    });
  }
}

// ── Audit helper ─────────────────────────────────────────────────────────────
async function auditBootstrap(
  actorId: number | string,
  action: string,
  details: Record<string, unknown>
) {
  const db = await requireDb();
  await db.insert(pepprAuditEvents).values({
    actorType: "SYSTEM",
    actorId: String(actorId),
    action,
    resourceType: "BOOTSTRAP",
    details,
  } as any);
}

// ── Summary helper ────────────────────────────────────────────────────────────
type Summary = Record<string, number>;

// ── Transaction-layer purge (shared by P1, P2, P3) ──────────────────────────
async function purgeTransactionLayer(): Promise<Summary> {
  const db = await requireDb();
  const summary: Summary = {};

  // Order matters: children before parents
  summary.so_jobs = affected(await db.delete(pepprSoJobs));
  summary.sp_tickets = affected(await db.delete(pepprSpTickets));
  summary.sp_assignments = affected(await db.delete(pepprSpAssignments));
  summary.payments = affected(await db.delete(pepprPayments));
  summary.request_notes = affected(await db.delete(pepprRequestNotes));
  summary.request_events = affected(await db.delete(pepprRequestEvents));
  summary.request_items = affected(await db.delete(pepprRequestItems));
  summary.service_requests = affected(await db.delete(pepprServiceRequests));
  summary.guest_sessions = affected(await db.delete(pepprGuestSessions));
  summary.stay_tokens = affected(await db.delete(pepprStayTokens));
  summary.jti_revocations = affected(await db.delete(jtiRevocations));
  summary.tfa_recovery_tokens = affected(await db.delete(tfaRecoveryTokens));
  summary.audit_events = affected(await db.delete(pepprAuditEvents));

  // Reset stay_tokens AUTO_INCREMENT
  await db.execute(sql`ALTER TABLE peppr_stay_tokens AUTO_INCREMENT = 1`);

  return summary;
}

// ── SP layer purge (shared by P3, S1) ────────────────────────────────────────
async function purgeSpLayer(): Promise<Summary> {
  const db = await requireDb();
  const summary: Summary = {};

  summary.service_operators = affected(await db.delete(pepprServiceOperators));
  summary.template_items = affected(await db.delete(pepprTemplateItems));
  summary.service_templates = affected(await db.delete(pepprServiceTemplates));
  summary.catalog_items = affected(await db.delete(pepprCatalogItems));
  summary.service_providers = affected(await db.delete(pepprServiceProviders));

  return summary;
}

// ── Master layer purge (P2, P3) ───────────────────────────────────────────────
async function purgeMasterLayer(): Promise<Summary> {
  const db = await requireDb();
  const summary: Summary = {};

  summary.staff_members = affected(await db.delete(pepprStaffMembers));
  summary.staff_positions = affected(await db.delete(pepprStaffPositions));
  summary.qr_codes = affected(await db.delete(pepprQrCodes));
  summary.room_template_assignments = affected(await db.delete(pepprRoomTemplateAssignments));
  summary.rooms = affected(await db.delete(pepprRooms));
  summary.property_banners = affected(await db.delete(pepprPropertyBanners));
  summary.property_config = affected(await db.delete(pepprPropertyConfig));
  summary.properties = affected(await db.delete(pepprProperties));
  summary.partners = affected(await db.delete(pepprPartners));

  // User roles scoped to property/partner (preserve SUPER_ADMIN / SYSTEM_ADMIN global roles)
  const scopedRoles = await db
    .select({ id: pepprUserRoles.id })
    .from(pepprUserRoles)
    .where(sql`${pepprUserRoles.partnerId} IS NOT NULL OR ${pepprUserRoles.propertyId} IS NOT NULL`);

  if (scopedRoles.length > 0) {
    const ids = scopedRoles.map((r) => r.id);
    await db.delete(pepprUserRoles).where(inArray(pepprUserRoles.id, ids));
  }
  summary.user_roles_scoped = scopedRoles.length;

  // Non-super-admin peppr_users (preserve SUPER_ADMIN / SYSTEM_ADMIN)
  const globalAdminRoles = await db
    .select({ userId: pepprUserRoles.userId })
    .from(pepprUserRoles)
    .where(
      sql`${pepprUserRoles.roleId} IN ('SUPER_ADMIN','SYSTEM_ADMIN') AND ${pepprUserRoles.partnerId} IS NULL AND ${pepprUserRoles.propertyId} IS NULL`
    );
  const preservedUserIds = globalAdminRoles.map((r) => r.userId);

  if (preservedUserIds.length > 0) {
    const delRes = await db
      .delete(pepprUsers)
      .where(
        sql`${pepprUsers.userId} NOT IN (${sql.join(
          preservedUserIds.map((id) => sql`${id}`),
          sql`, `
        )})`
      );
    summary.peppr_users_deleted = (delRes as any).rowsAffected ?? 0;
  } else {
    const delRes = await db.delete(pepprUsers);
    summary.peppr_users_deleted = (delRes as any).rowsAffected ?? 0;
  }

  // Reset autoincrement counters
  await db.execute(sql`ALTER TABLE peppr_room_template_assignments AUTO_INCREMENT = 1`);

  return summary;
}

// ── Seed: 10 demo hotels ──────────────────────────────────────────────────────
const THAI_HOTEL_NAMES = [
  ["Lanna Heritage Hotel", "Riverside Boutique Chiang Mai", "The Mountain Retreat"],
  ["Sukhumvit Grand", "Silom Suites Bangkok", "Riverside Bangkok Hotel", "Asoke Residence"],
  ["Phuket Pearl Resort", "Patong Beach Hotel", "Kata Sands"],
];

const PARTNER_NAMES = [
  "Lanna Hospitality Group",
  "Bangkok City Hotels",
  "Andaman Resorts Co.",
];

export async function seedDemoData(): Promise<Summary> {
  const db = await requireDb();
  const summary: Summary = {
    partners: 0,
    properties: 0,
    rooms: 0,
    qr_codes: 0,
    service_providers: 0,
    catalog_items: 0,
    service_templates: 0,
    template_items: 0,
    staff_accounts: 0,
  };

  const cities = ["Chiang Mai", "Bangkok", "Phuket"];
  const roomTypes = ["Standard", "Deluxe", "Suite", "Superior"];
  const floors = ["1", "2", "3", "4", "5"];

  // ── 3 Partners ──────────────────────────────────────────────────────────────
  for (let pi = 0; pi < 3; pi++) {
    const partnerId = nanoid(36).slice(0, 36);
    await db.insert(pepprPartners).values({
      id: partnerId,
      name: PARTNER_NAMES[pi],
      email: `partner${pi + 1}@demo.peppr.vip`,
      phone: `+6681${String(pi + 1).padStart(7, "0")}`,
      contactPerson: `Partner Admin ${pi + 1}`,
      status: "active",
    });
    summary.partners++;

    const hotelNames = THAI_HOTEL_NAMES[pi];

    // ── Properties per partner ───────────────────────────────────────────────
    for (let hi = 0; hi < hotelNames.length; hi++) {
      const propertyId = nanoid(36).slice(0, 36);
      await db.insert(pepprProperties).values({
        id: propertyId,
        partnerId,
        name: hotelNames[hi],
        type: "hotel",
        address: `${100 + hi * 10} Demo Street, ${cities[pi]}`,
        city: cities[pi],
        country: "Thailand",
        timezone: "Asia/Bangkok",
        currency: "THB",
        phone: `+6653${String(hi + 1).padStart(7, "0")}`,
        email: `info@${hotelNames[hi].toLowerCase().replace(/\s+/g, "")}.demo`,
        status: "active",
      });
      summary.properties++;

      // Property config
      await db.insert(pepprPropertyConfig).values({
        propertyId,
        primaryColor: "#D97706",
        secondaryColor: "#1E293B",
        welcomeMessage: `Welcome to ${hotelNames[hi]}! How can we serve you today?`,
        qrValidationLimit: 200,
        serviceCatalogLimit: 50,
        requestSubmissionLimit: 20,
        enableGuestCancellation: true,
      } as any);

      // ── Rooms (10 per property) ────────────────────────────────────────────
      for (let ri = 0; ri < 10; ri++) {
        const roomId = nanoid(36).slice(0, 36);
        const floor = floors[Math.floor(ri / 2)];
        const roomNumber = `${floor}0${(ri % 2) + 1}`;
        const roomType = roomTypes[ri % roomTypes.length];

        await db.insert(pepprRooms).values({
          id: roomId,
          propertyId,
          roomNumber,
          floor,
          zone: `Wing-${String.fromCharCode(65 + (ri % 3))}`,
          roomType,
          status: "active",
        });
        summary.rooms++;

        // QR code per room
        const qrId = nanoid(36).slice(0, 36);
        await db.insert(pepprQrCodes).values({
          id: qrId,
          propertyId,
          roomId,
          qrCodeId: `QR-${propertyId.slice(0, 6)}-${roomNumber}`,
          accessType: "public",
          status: "active",
          scanCount: 0,
        });
        summary.qr_codes++;
      }
    }
  }

  // ── 5 Service Providers (shared across all properties) ───────────────────
  const spData = [
    { name: "CleanPro Services", category: "housekeeping", area: "All Properties" },
    { name: "Gourmet Delivery Co.", category: "food_beverage", area: "All Properties" },
    { name: "Spa & Wellness Thai", category: "spa", area: "All Properties" },
    { name: "TechFix Rapid", category: "maintenance", area: "All Properties" },
    { name: "Concierge Plus", category: "concierge", area: "All Properties" },
  ];

  const providerIds: string[] = [];
  for (const sp of spData) {
    const providerId = nanoid(36).slice(0, 36);
    providerIds.push(providerId);
    await db.insert(pepprServiceProviders).values({
      id: providerId,
      name: sp.name,
      email: `ops@${sp.name.toLowerCase().replace(/\s+/g, "")}.demo`,
      phone: "+6681" + Math.floor(Math.random() * 9000000 + 1000000),
      category: sp.category,
      serviceArea: sp.area,
      contactPerson: `${sp.name} Manager`,
      rating: "4.50",
      status: "active",
    });
    summary.service_providers++;

    // ── 3 Catalog items per provider ────────────────────────────────────────
    const catalogIds: string[] = [];
    const catalogItems = getCatalogItems(sp.category);
    for (const item of catalogItems) {
      const itemId = nanoid(36).slice(0, 36);
      catalogIds.push(itemId);
      await db.insert(pepprCatalogItems).values({
        id: itemId,
        providerId,
        name: item.name,
        description: item.description,
        sku: `SKU-${providerId.slice(0, 4)}-${nanoid(4).toUpperCase()}`,
        category: sp.category,
        price: item.price,
        currency: "THB",
        unit: item.unit,
        durationMinutes: item.duration,
        status: "active",
      });
      summary.catalog_items++;
    }

    // ── 1 Service template per provider ─────────────────────────────────────
    const templateId = nanoid(36).slice(0, 36);
    await db.insert(pepprServiceTemplates).values({
      id: templateId,
      name: `${sp.name} — Standard Package`,
      description: `Standard service package from ${sp.name}`,
      tier: "standard",
      status: "active",
    });
    summary.service_templates++;

    // Template items (link first 2 catalog items)
    for (let ti = 0; ti < Math.min(2, catalogIds.length); ti++) {
      await db.insert(pepprTemplateItems).values({
        id: nanoid(36).slice(0, 36),
        templateId,
        catalogItemId: catalogIds[ti],
        sortOrder: ti,
      });
      summary.template_items++;
    }
  }

  return summary;
}

// ── Catalog item presets per category ────────────────────────────────────────
function getCatalogItems(category: string) {
  const presets: Record<string, Array<{ name: string; description: string; price: string; unit: string; duration: number }>> = {
    housekeeping: [
      { name: "Room Turndown Service", description: "Evening turndown with mints and fresh towels", price: "150.00", unit: "service", duration: 30 },
      { name: "Deep Clean Package", description: "Full room deep clean including bathroom", price: "350.00", unit: "service", duration: 90 },
      { name: "Laundry — Express", description: "Same-day laundry and pressing", price: "200.00", unit: "kg", duration: 240 },
    ],
    food_beverage: [
      { name: "Breakfast In-Room", description: "Continental breakfast delivered to your room", price: "450.00", unit: "set", duration: 30 },
      { name: "Afternoon Tea Set", description: "Thai-style afternoon tea for two", price: "600.00", unit: "set", duration: 20 },
      { name: "Late Night Snack Box", description: "Assorted snacks and beverages", price: "280.00", unit: "box", duration: 15 },
    ],
    spa: [
      { name: "Thai Massage — 60 min", description: "Traditional Thai massage in-room", price: "800.00", unit: "session", duration: 60 },
      { name: "Aromatherapy Facial", description: "Relaxing aromatherapy facial treatment", price: "1200.00", unit: "session", duration: 75 },
      { name: "Foot Reflexology", description: "30-minute foot reflexology session", price: "500.00", unit: "session", duration: 30 },
    ],
    maintenance: [
      { name: "AC Repair — Standard", description: "Air conditioning inspection and repair", price: "0.00", unit: "service", duration: 45 },
      { name: "Plumbing Fix", description: "Minor plumbing issue resolution", price: "0.00", unit: "service", duration: 30 },
      { name: "TV / Remote Setup", description: "TV channel setup and remote pairing", price: "0.00", unit: "service", duration: 15 },
    ],
    concierge: [
      { name: "Airport Transfer — Sedan", description: "Private sedan transfer to/from airport", price: "1200.00", unit: "trip", duration: 60 },
      { name: "Tour Booking Assistance", description: "Local tour and activity booking service", price: "200.00", unit: "booking", duration: 20 },
      { name: "Restaurant Reservation", description: "Restaurant booking with preferred seating", price: "0.00", unit: "booking", duration: 10 },
    ],
  };
  return presets[category] ?? presets.concierge;
}

// ── Router ────────────────────────────────────────────────────────────────────
export const bootstrapRouter = router({
  /**
   * P1 — Purge Transactions Only
   * Deletes all transaction-layer rows. Master data (partners, properties, rooms,
   * QR codes, SP, catalog) is preserved.
   */
  purgeTransactions: protectedProcedure
    .input(z.object({ confirmCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertSuperAdmin(ctx.user.id);
      if (input.confirmCode !== CONFIRM_CODES.P1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid confirmation code. Expected: ${CONFIRM_CODES.P1}` });
      }
      const summary = await purgeTransactionLayer();
      await auditBootstrap(ctx.user.id, "BOOTSTRAP_PURGE_TRANSACTIONS", summary as Record<string, unknown>);
      return { operation: "P1", summary };
    }),

  /**
   * P2 — Purge Master + Transactions + Reset Counters
   * Deletes everything except SUPER_ADMIN / SYSTEM_ADMIN accounts and SP layer.
   */
  purgeMasterAndTx: protectedProcedure
    .input(z.object({ confirmCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertNotProduction(ctx.req?.headers?.origin as string | undefined);
      await assertSuperAdmin(ctx.user.id);
      if (input.confirmCode !== CONFIRM_CODES.P2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid confirmation code. Expected: ${CONFIRM_CODES.P2}` });
      }
      const txSummary = await purgeTransactionLayer();
      const masterSummary = await purgeMasterLayer();
      const summary = { ...txSummary, ...masterSummary };
      await auditBootstrap(ctx.user.id, "BOOTSTRAP_PURGE_MASTER_TX", summary as Record<string, unknown>);
      return { operation: "P2", summary };
    }),

  /**
   * P3 — Full Purge + Seed 10 Demo Hotels
   * Wipes everything (including SP layer), then seeds 3 partners, 10 hotels,
   * rooms, QR codes, 5 SPs, catalog items, templates, and staff accounts.
   */
  purgeAllAndSeed: protectedProcedure
    .input(z.object({ confirmCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      assertNotProduction(ctx.req?.headers?.origin as string | undefined);
      await assertSuperAdmin(ctx.user.id);
      if (input.confirmCode !== CONFIRM_CODES.P3) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid confirmation code. Expected: ${CONFIRM_CODES.P3}` });
      }
      const txSummary = await purgeTransactionLayer();
      const masterSummary = await purgeMasterLayer();
      const spSummary = await purgeSpLayer();
      const seedSummary = await seedDemoData();
      const summary = {
        deleted: { ...txSummary, ...masterSummary, ...spSummary },
        seeded: seedSummary,
      };
      await auditBootstrap(ctx.user.id, "BOOTSTRAP_PURGE_ALL_SEED", summary as Record<string, unknown>);
      return { operation: "P3", summary };
    }),

  /**
   * S1 — Purge All SP + Services
   * Deletes all service providers, catalog items, templates, template items,
   * service operators, and all transaction rows that reference SP data.
   */
  purgeSpAll: protectedProcedure
    .input(z.object({ confirmCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertSuperAdmin(ctx.user.id);
      if (input.confirmCode !== CONFIRM_CODES.S1) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid confirmation code. Expected: ${CONFIRM_CODES.S1}` });
      }
      // Purge SP-related transaction rows first
      const db2 = await requireDb();
      const soRes = await db2.delete(pepprSoJobs);
      const tkRes = await db2.delete(pepprSpTickets);
      const asRes = await db2.delete(pepprSpAssignments);
      const spSummary = await purgeSpLayer();
      const summary = {
        so_jobs: affected(soRes),
        sp_tickets: affected(tkRes),
        sp_assignments: affected(asRes),
        ...spSummary,
      };
      await auditBootstrap(ctx.user.id, "BOOTSTRAP_PURGE_SP_ALL", summary as Record<string, unknown>);
      return { operation: "S1", summary };
    }),

  /**
   * S2 — Purge Services Only
   * Deletes catalog items, service templates, and template items.
   * Service providers and operators are preserved.
   */
  purgeSpServicesOnly: protectedProcedure
    .input(z.object({ confirmCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertSuperAdmin(ctx.user.id);
      if (input.confirmCode !== CONFIRM_CODES.S2) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Invalid confirmation code. Expected: ${CONFIRM_CODES.S2}` });
      }
      const db3 = await requireDb();
      const tiRes = await db3.delete(pepprTemplateItems);
      const stRes = await db3.delete(pepprServiceTemplates);
      const ciRes = await db3.delete(pepprCatalogItems);
      const summary = {
        template_items: affected(tiRes),
        service_templates: affected(stRes),
        catalog_items: affected(ciRes),
      };
      await auditBootstrap(ctx.user.id, "BOOTSTRAP_PURGE_SP_SERVICES", summary as Record<string, unknown>);
      return { operation: "S2", summary };
    }),

  /**
   * Preview — returns counts of what would be deleted/seeded without committing.
   * Safe to call at any time.
   */
  preview: protectedProcedure.query(async ({ ctx }) => {
    await assertSuperAdmin(ctx.user.id);
    const db = await requireDb();

    const count = async (table: any) => {
      const res = await db.select({ n: sql<number>`COUNT(*)` }).from(table);
      return Number(res[0]?.n ?? 0);
    };

    return {
      transactions: {
        service_requests: await count(pepprServiceRequests),
        request_items: await count(pepprRequestItems),
        request_events: await count(pepprRequestEvents),
        request_notes: await count(pepprRequestNotes),
        sp_assignments: await count(pepprSpAssignments),
        sp_tickets: await count(pepprSpTickets),
        so_jobs: await count(pepprSoJobs),
        payments: await count(pepprPayments),
        guest_sessions: await count(pepprGuestSessions),
        stay_tokens: await count(pepprStayTokens),
      },
      master: {
        partners: await count(pepprPartners),
        properties: await count(pepprProperties),
        rooms: await count(pepprRooms),
        qr_codes: await count(pepprQrCodes),
        staff_members: await count(pepprStaffMembers),
      },
      sp: {
        service_providers: await count(pepprServiceProviders),
        catalog_items: await count(pepprCatalogItems),
        service_templates: await count(pepprServiceTemplates),
        service_operators: await count(pepprServiceOperators),
      },
      seedPreview: {
        partners: 3,
        properties: 10,
        rooms: 100,
        qr_codes: 100,
        service_providers: 5,
        catalog_items: 15,
        service_templates: 5,
        template_items: 10,
      },
    };
  }),
});
