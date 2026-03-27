/**
 * guestRouter.ts — ADR-002 Phase 1
 *
 * Public tRPC procedures for the guest-facing microsite.
 * These procedures mirror the REST handlers in server/routes/guest.ts and
 * are progressively replacing them as part of the guest microsite tRPC
 * migration described in docs/adr/002-guest-microsite-trpc.md.
 *
 * Phase 1 covers:
 *   guest.getQrStatus   — GET /qr/:qrCodeId/status
 *   guest.createSession — POST /sessions
 *
 * All procedures use publicProcedure (no authentication required).
 * Superjson handles Date serialisation automatically.
 */

import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { generateId } from "./routes/_helpers";
import {
  pepprQrCodes,
  pepprRooms,
  pepprProperties,
  pepprGuestSessions,
  pepprStayTokens,
} from "../drizzle/schema";

// ── Shared output shapes ──────────────────────────────────────────────────────

const QrStatusOutput = z.object({
  qr_code_id: z.string(),
  property_id: z.string(),
  property_name: z.string().nullable(),
  room_id: z.string().nullable(),
  room_number: z.string().nullable(),
  access_type: z.string(),
  status: z.string(),
});

const SessionOutput = z.object({
  session_id: z.string(),
  qr_code_id: z.string(),
  property_id: z.string(),
  property_name: z.string().nullable(),
  room_id: z.string().nullable(),
  room_number: z.string().nullable(),
  guest_name: z.string().nullable(),
  access_type: z.string(),
  status: z.string(),
  font_size_pref: z.string(),
  expires_at: z.date().nullable(),
  created_at: z.date().nullable(),
  updated_at: z.date().nullable(),
});

// ── Router ────────────────────────────────────────────────────────────────────

export const guestRouter = router({
  /**
   * guest.getQrStatus
   *
   * Returns the status and metadata of a QR code by its public qrCodeId.
   * Increments the scan counter and records lastScanned timestamp.
   *
   * Replaces: GET /api/v1/public/qr/:qrCodeId/status
   * Status: Active (ADR-002 Phase 1)
   */
  getQrStatus: publicProcedure
    .input(z.object({ qrCodeId: z.string().min(1) }))
    .output(QrStatusOutput)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db.select().from(pepprQrCodes)
        .where(eq(pepprQrCodes.qrCodeId, input.qrCodeId)).limit(1);
      if (!rows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });

      const qr = rows[0];

      const [propRows, roomRows] = await Promise.all([
        db.select().from(pepprProperties).where(eq(pepprProperties.id, qr.propertyId)).limit(1),
        qr.roomId
          ? db.select().from(pepprRooms).where(eq(pepprRooms.id, qr.roomId)).limit(1)
          : Promise.resolve([]),
      ]);

      // Increment scan counter
      await db.update(pepprQrCodes).set({
        scanCount: sql`${pepprQrCodes.scanCount} + 1`,
        lastScanned: new Date(),
      }).where(eq(pepprQrCodes.id, qr.id));

      return {
        qr_code_id: qr.qrCodeId,
        property_id: qr.propertyId,
        property_name: propRows[0]?.name ?? null,
        room_id: qr.roomId ?? null,
        room_number: (roomRows as typeof propRows)[0]?.name ?? null,
        access_type: qr.accessType,
        status: qr.status,
      };
    }),

  /**
   * guest.createSession
   *
   * Creates a new guest session from a QR scan. For restricted QR codes,
   * a valid stay_token must be provided. Returns the full session object.
   *
   * Replaces: POST /api/v1/public/sessions
   * Status: Active (ADR-002 Phase 1)
   */
  createSession: publicProcedure
    .input(z.object({
      qr_code_id: z.string().min(1),
      stay_token: z.string().optional(),
      guest_name: z.string().max(100).optional(),
      font_size: z.enum(["S", "M", "L", "XL"]).optional(),
    }))
    .output(SessionOutput)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const resolvedFontSize = input.font_size ?? "M";

      // Validate QR code
      const qrRows = await db.select().from(pepprQrCodes)
        .where(eq(pepprQrCodes.qrCodeId, input.qr_code_id)).limit(1);
      if (!qrRows[0]) throw new TRPCError({ code: "NOT_FOUND", message: "QR code not found" });

      const qr = qrRows[0];
      if (qr.status !== "active") {
        throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "QR code is not active" });
      }
      if (qr.expiresAt && qr.expiresAt < new Date()) {
        throw new TRPCError({ code: "UNPROCESSABLE_CONTENT", message: "QR code has expired" });
      }

      // For restricted QR codes, validate stay token
      if (qr.accessType === "restricted") {
        if (!input.stay_token) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Stay token is required for restricted access" });
        }
        const tokenRows = await db.select().from(pepprStayTokens)
          .where(and(
            eq(pepprStayTokens.token, input.stay_token),
            eq(pepprStayTokens.propertyId, qr.propertyId),
            eq(pepprStayTokens.status, "active"),
          )).limit(1);
        if (!tokenRows[0]) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Invalid or expired stay token" });
        }
      }

      // Create session
      const id = generateId();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
      await db.insert(pepprGuestSessions).values({
        id,
        qrCodeId: input.qr_code_id,
        propertyId: qr.propertyId,
        roomId: qr.roomId ?? null,
        guestName: input.guest_name ?? null,
        accessType: qr.accessType,
        fontSizePref: resolvedFontSize,
        expiresAt,
      });

      const created = await db.select().from(pepprGuestSessions)
        .where(eq(pepprGuestSessions.id, id)).limit(1);
      const session = created[0]!;

      const [propRows, roomRows] = await Promise.all([
        db.select().from(pepprProperties).where(eq(pepprProperties.id, qr.propertyId)).limit(1),
        qr.roomId
          ? db.select().from(pepprRooms).where(eq(pepprRooms.id, qr.roomId)).limit(1)
          : Promise.resolve([]),
      ]);

      return {
        session_id: session.id,
        qr_code_id: session.qrCodeId,
        property_id: session.propertyId,
        property_name: propRows[0]?.name ?? null,
        room_id: session.roomId ?? null,
        room_number: (roomRows as typeof propRows)[0]?.name ?? null,
        guest_name: session.guestName ?? null,
        access_type: session.accessType,
        status: session.status,
        font_size_pref: session.fontSizePref ?? "M",
        expires_at: session.expiresAt ?? null,
        created_at: session.createdAt ?? null,
        updated_at: session.updatedAt ?? null,
      };
    }),
});

export type GuestRouter = typeof guestRouter;
