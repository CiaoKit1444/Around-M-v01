/**
 * tRPC QR Router — Type-safe procedures for QR code management.
 *
 * Replaces the ky/axios → Express REST flow for QR codes.
 * All procedures use protectedProcedure (Manus OAuth session cookie).
 *
 * Procedures:
 *   qr.list          — List QR codes for a property
 *   qr.get           — Get a single QR code by id
 *   qr.generate      — Batch generate QR codes for rooms
 *   qr.updateAccess  — Change access type (public/restricted)
 *   qr.activate      — Activate a QR code
 *   qr.deactivate    — Deactivate a QR code
 *   qr.suspend       — Suspend a QR code
 *   qr.resume        — Resume a suspended QR code
 *   qr.revoke        — Revoke a QR code
 *   qr.extend        — Extend QR code expiry by N hours
 *   qr.activeTokens  — List active stay tokens for a property
 */
import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  pepprQrCodes,
  pepprRooms,
  pepprProperties,
  pepprStayTokens,
} from "../drizzle/schema";
import { eq, and, desc, asc, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

// ── Helpers ──────────────────────────────────────────────────────────────────
async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });
  return db;
}

function generateId(): string {
  return nanoid(21);
}

function formatQr(r: any, extra: Record<string, any> = {}) {
  return {
    id: r.id,
    property_id: r.propertyId,
    room_id: r.roomId,
    qr_code_id: r.qrCodeId,
    access_type: r.accessType,
    status: r.status,
    last_scanned: r.lastScanned?.toISOString() || null,
    scan_count: r.scanCount,
    expires_at: r.expiresAt?.toISOString() || null,
    revoked_reason: r.revokedReason || null,
    created_at: r.createdAt?.toISOString(),
    updated_at: r.updatedAt?.toISOString(),
    ...extra,
  };
}

/** Find QR by DB id or qr_code_id, scoped to property */
async function findQr(db: any, propertyId: string, qrId: string) {
  let rows = await db
    .select()
    .from(pepprQrCodes)
    .where(and(eq(pepprQrCodes.propertyId, propertyId), eq(pepprQrCodes.id, qrId)))
    .limit(1);
  if (!rows[0]) {
    rows = await db
      .select()
      .from(pepprQrCodes)
      .where(and(eq(pepprQrCodes.propertyId, propertyId), eq(pepprQrCodes.qrCodeId, qrId)))
      .limit(1);
  }
  return rows[0] || null;
}

const paginationInput = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(200).default(50),
  search: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().optional(),
  access_type: z.string().optional(),
  room_id: z.string().optional(),
});

// ── Router ───────────────────────────────────────────────────────────────────
export const qrRouter = router({
  /** List QR codes for a property */
  list: protectedProcedure
    .input(paginationInput.extend({ property_id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const conditions: any[] = [eq(pepprQrCodes.propertyId, input.property_id)];
      if (input.status) conditions.push(eq(pepprQrCodes.status, input.status));
      if (input.access_type) conditions.push(eq(pepprQrCodes.accessType, input.access_type));
      if (input.room_id) conditions.push(eq(pepprQrCodes.roomId, input.room_id));
      const where = conditions.length === 1 ? conditions[0] : and(...conditions);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pepprQrCodes)
        .where(where);
      const total = Number(countResult[0]?.count || 0);

      const orderFn = input.sortOrder === "desc" ? desc : asc;
      const rows = await db
        .select()
        .from(pepprQrCodes)
        .where(where)
        .orderBy(orderFn(pepprQrCodes.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      // Enrich with room numbers
      const roomIds = Array.from(new Set(rows.map((r: any) => r.roomId)));
      const roomMap = new Map<string, string>();
      if (roomIds.length > 0) {
        const roomRows = await db
          .select({ id: pepprRooms.id, roomNumber: pepprRooms.roomNumber })
          .from(pepprRooms)
          .where(or(...roomIds.map((id: string) => eq(pepprRooms.id, id))));
        roomRows.forEach((r: any) => roomMap.set(r.id, r.roomNumber));
      }

      const propRows = await db
        .select({ name: pepprProperties.name })
        .from(pepprProperties)
        .where(eq(pepprProperties.id, input.property_id))
        .limit(1);
      const propertyName = propRows[0]?.name || null;

      const items = rows.map((r: any) =>
        formatQr(r, {
          room_number: roomMap.get(r.roomId) || null,
          property_name: propertyName,
        })
      );

      return {
        items,
        total,
        page: input.page,
        page_size: input.pageSize,
        total_pages: Math.ceil(total / input.pageSize),
      };
    }),

  /** Get a single QR code by DB id or qr_code_id */
  get: protectedProcedure
    .input(z.object({ property_id: z.string(), qr_id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });

      const roomRows = await db
        .select({ roomNumber: pepprRooms.roomNumber })
        .from(pepprRooms)
        .where(eq(pepprRooms.id, qr.roomId))
        .limit(1);
      const propRows = await db
        .select({ name: pepprProperties.name })
        .from(pepprProperties)
        .where(eq(pepprProperties.id, qr.propertyId))
        .limit(1);

      return formatQr(qr, {
        room_number: roomRows[0]?.roomNumber || null,
        property_name: propRows[0]?.name || null,
      });
    }),

  /** Batch generate QR codes for a list of room IDs */
  generate: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        room_ids: z.array(z.string()).min(1).max(200),
        access_type: z.enum(["public", "restricted"]).default("public"),
        expires_at: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
      const created: any[] = [];

      for (const roomId of input.room_ids) {
        const id = generateId();
        const qrCodeId = `QR-${nanoid(12)}`;
        await db.insert(pepprQrCodes).values({
          id,
          propertyId: input.property_id,
          roomId,
          qrCodeId,
          accessType: input.access_type,
          expiresAt,
        });
        const rows = await db
          .select()
          .from(pepprQrCodes)
          .where(eq(pepprQrCodes.id, id))
          .limit(1);
        if (rows[0]) created.push(formatQr(rows[0]));
      }

      return created;
    }),

  /** Update access type for a QR code */
  updateAccess: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        qr_id: z.string(),
        access_type: z.enum(["public", "restricted"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      await db
        .update(pepprQrCodes)
        .set({ accessType: input.access_type })
        .where(eq(pepprQrCodes.id, qr.id));
      const updated = await findQr(db, input.property_id, qr.id);
      return formatQr(updated!);
    }),

  /** Activate a QR code */
  activate: protectedProcedure
    .input(z.object({ property_id: z.string(), qr_id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      await db.update(pepprQrCodes).set({ status: "active" }).where(eq(pepprQrCodes.id, qr.id));
      return formatQr({ ...qr, status: "active" });
    }),

  /** Deactivate a QR code */
  deactivate: protectedProcedure
    .input(z.object({ property_id: z.string(), qr_id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      await db.update(pepprQrCodes).set({ status: "inactive" }).where(eq(pepprQrCodes.id, qr.id));
      return formatQr({ ...qr, status: "inactive" });
    }),

  /** Suspend a QR code */
  suspend: protectedProcedure
    .input(z.object({ property_id: z.string(), qr_id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      await db.update(pepprQrCodes).set({ status: "suspended" }).where(eq(pepprQrCodes.id, qr.id));
      return formatQr({ ...qr, status: "suspended" });
    }),

  /** Resume a suspended QR code */
  resume: protectedProcedure
    .input(z.object({ property_id: z.string(), qr_id: z.string() }))
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      await db.update(pepprQrCodes).set({ status: "active" }).where(eq(pepprQrCodes.id, qr.id));
      return formatQr({ ...qr, status: "active" });
    }),

  /** Revoke a QR code */
  revoke: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        qr_id: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      const reason = input.reason || "Manual revocation";
      await db
        .update(pepprQrCodes)
        .set({ status: "revoked", revokedReason: reason })
        .where(eq(pepprQrCodes.id, qr.id));
      return formatQr({ ...qr, status: "revoked", revokedReason: reason });
    }),

  /** Extend QR code expiry by N hours */
  extend: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        qr_id: z.string(),
        hours: z.number().min(1).max(8760),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const qr = await findQr(db, input.property_id, input.qr_id);
      if (!qr) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });
      const base = qr.expiresAt && qr.expiresAt > new Date() ? qr.expiresAt : new Date();
      const newExpiry = new Date(base.getTime() + input.hours * 60 * 60 * 1000);
      await db
        .update(pepprQrCodes)
        .set({ expiresAt: newExpiry })
        .where(eq(pepprQrCodes.id, qr.id));
      return formatQr({ ...qr, expiresAt: newExpiry });
    }),

  /** Bulk update access type for multiple QR codes */
  bulkUpdateAccess: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        qr_ids: z.array(z.string()),
        access_type: z.enum(["public", "restricted"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      let updated = 0;
      for (const qrId of input.qr_ids) {
        const qr = await findQr(db, input.property_id, qrId);
        if (!qr) continue;
        await db
          .update(pepprQrCodes)
          .set({ accessType: input.access_type })
          .where(eq(pepprQrCodes.id, qr.id));
        updated++;
      }
      return { updated };
    }),

  /** Bulk revoke multiple QR codes */
  bulkRevoke: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        qr_ids: z.array(z.string()),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      const reason = input.reason || "Bulk revocation";
      let revoked = 0;
      for (const qrId of input.qr_ids) {
        const qr = await findQr(db, input.property_id, qrId);
        if (!qr) continue;
        await db
          .update(pepprQrCodes)
          .set({ status: "revoked", revokedReason: reason })
          .where(eq(pepprQrCodes.id, qr.id));
        revoked++;
      }
      return { revoked };
    }),

  /** Bulk extend expiry for multiple QR codes */
  bulkExtend: protectedProcedure
    .input(
      z.object({
        property_id: z.string(),
        qr_ids: z.array(z.string()),
        hours: z.number().min(1).max(8760),
      })
    )
    .mutation(async ({ input }) => {
      const db = await requireDb();
      let extended = 0;
      for (const qrId of input.qr_ids) {
        const qr = await findQr(db, input.property_id, qrId);
        if (!qr) continue;
        const base = qr.expiresAt && qr.expiresAt > new Date() ? qr.expiresAt : new Date();
        const newExpiry = new Date(base.getTime() + input.hours * 60 * 60 * 1000);
        await db
          .update(pepprQrCodes)
          .set({ expiresAt: newExpiry })
          .where(eq(pepprQrCodes.id, qr.id));
        extended++;
      }
      return { extended };
    }),

  /** List active stay tokens for a property */
  activeTokens: protectedProcedure
    .input(z.object({ property_id: z.string() }))
    .query(async ({ input }) => {
      const db = await requireDb();
      const rows = await db
        .select()
        .from(pepprStayTokens)
        .where(
          and(
            eq(pepprStayTokens.propertyId, input.property_id),
            eq(pepprStayTokens.status, "active"),
          )
        )
        .orderBy(desc(pepprStayTokens.expiresAt));
      return {
        tokens: rows.map((r: any) => ({
          id: r.id,
          token: r.token,
          room_id: r.roomId,
          room_number: r.roomNumber || null,
          status: r.status,
          expires_at: r.expiresAt?.toISOString() || null,
          created_at: r.createdAt?.toISOString(),
        })),
      };
    }),
});
