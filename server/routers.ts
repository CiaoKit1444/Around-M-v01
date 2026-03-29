import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { rbacRouter } from "./rbacRouter";
import { requestsRouter } from "./requestsRouter";
import { spTicketsRouter } from "./spTicketsRouter";
import { serviceOperatorsRouter } from "./serviceOperatorsRouter";
import { crudRouter } from "./crudRouter";
import { qrRouter } from "./qrRouter";
import { usersRouter } from "./usersRouter";
import { staffRouter } from "./staffRouter";
import { reportsRouter } from "./reportsRouter";
import { cmsRouter, cmsPublicRouter } from "./cmsRouter";
import { guestRouter } from "./guestRouter";
import { bootstrapRouter } from "./bootstrapRouter";
import { z } from "zod";
import { getDb } from "./db";
import { pepprStayTokens, pepprRooms, users, pepprUsers, pepprUserRoles, pepprAuditEvents, pepprInboxState } from "../drizzle/schema";
import { redisClient } from "./pepprAuth";
import { eq, and } from "drizzle-orm";
import { TOTP, generateSecret } from "otplib";
import QRCode from "qrcode";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// ── Inbox Router ────────────────────────────────────────────────────────────
const inboxRouter = router({
  /**
   * Persist the "mark all read" timestamp for the current user.
   * Called when the user clicks "Mark all read" in the Inbox popover.
   * Returns the new lastReadAt so the client can sync its unread badge.
   */
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { lastReadAt: new Date().toISOString() };
    const now = new Date();
    await db
      .insert(pepprInboxState)
      .values({ userId: ctx.user.openId, lastReadAt: now })
      .onDuplicateKeyUpdate({ set: { lastReadAt: now } });
    return { lastReadAt: now.toISOString() };
  }),

  /**
   * Get the last-read timestamp for the current user.
   * Called on mount to seed the initial unread count correctly.
   */
  getLastRead: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { lastReadAt: null };
    const [row] = await db
      .select()
      .from(pepprInboxState)
      .where(eq(pepprInboxState.userId, ctx.user.openId))
      .limit(1);
    return { lastReadAt: row?.lastReadAt?.toISOString() ?? null };
  }),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  rbac: rbacRouter,
  requests: requestsRouter,
  spTickets: spTicketsRouter,
  serviceOperators: serviceOperatorsRouter,
  crud: crudRouter,
  qr: qrRouter,
  users: usersRouter,
  staff: staffRouter,
  reports: reportsRouter,
  cms: cmsRouter,
  cmsPublic: cmsPublicRouter,
  guest: guestRouter,
  bootstrap: bootstrapRouter,
  inbox: inboxRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    /**
     * Returns the full Peppr user profile (pepprUsers + pepprUserRoles) for the
     * currently authenticated Manus OAuth session. Used by AuthContext to bridge
     * the two auth systems without requiring a separate JWT login.
     */
    pepprProfile: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return null;
      const [pepprUser] = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.manusOpenId, ctx.user.openId))
        .limit(1);
      if (!pepprUser) return null;
      const roles = await db
        .select()
        .from(pepprUserRoles)
        .where(eq(pepprUserRoles.userId, pepprUser.userId));
      return {
        user_id: pepprUser.userId,
        email: pepprUser.email,
        full_name: pepprUser.fullName,
        mobile: pepprUser.mobile ?? null,
        role: pepprUser.role,
        partner_id: pepprUser.partnerId ?? null,
        property_id: pepprUser.propertyId ?? null,
        email_verified: pepprUser.emailVerified,
        status: pepprUser.status,
        twofa_enabled: pepprUser.twoFaEnabled,
        roles: roles.map(r => r.roleId),
      };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  preferences: router({
    getFontSize: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return "M" as const;
      const [row] = await db.select({ fontSizePref: users.fontSizePref })
        .from(users)
        .where(eq(users.openId, ctx.user.openId))
        .limit(1);
      return (row?.fontSizePref ?? "M") as "S" | "M" | "L" | "XL";
    }),

    setFontSize: protectedProcedure
      .input(z.object({ size: z.enum(["S", "M", "L", "XL"]) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return { ok: false };
        await db.update(users)
          .set({ fontSizePref: input.size })
          .where(eq(users.openId, ctx.user.openId));
        return { ok: true };
      }),
  }),

  twoFa: router({
    /**
     * Step 1 of 2FA setup: generate a new TOTP secret and return a QR code data URL.
     * The secret is stored temporarily in twoFaSecret but twoFaEnabled remains false
     * until the user verifies the code in step 2.
     */
    setupInit: protectedProcedure.mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const [pepprUser] = await db.select().from(pepprUsers)
        .where(eq(pepprUsers.manusOpenId, ctx.user.openId)).limit(1);
      if (!pepprUser) throw new Error("Peppr user not found");

      // Generate a fresh base32 secret
      const secret = generateSecret();

      // Build the otpauth:// URI for authenticator apps
      const issuer = "Peppr Around";
      const label = encodeURIComponent(`${issuer}:${pepprUser.email}`);
      const otpAuthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

      // Generate QR code as base64 data URL (server-side, no external service)
      const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 200, margin: 2 });

      // Persist the secret (not yet enabled — user must verify first)
      await db.update(pepprUsers)
        .set({ twoFaSecret: secret, twoFaMethod: "totp" })
        .where(eq(pepprUsers.userId, pepprUser.userId));

      return { secret, qrDataUrl, otpAuthUrl };
    }),

    /**
     * Step 2 of 2FA setup: verify a TOTP code and enable 2FA.
     * Also generates 8 single-use backup codes.
     */
    setupVerifyAndEnable: protectedProcedure
      .input(z.object({ code: z.string().length(6).regex(/^\d{6}$/, "Must be 6 digits") }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const [pepprUser] = await db.select().from(pepprUsers)
          .where(eq(pepprUsers.manusOpenId, ctx.user.openId)).limit(1);
        if (!pepprUser) throw new Error("Peppr user not found");
        if (!pepprUser.twoFaSecret) throw new Error("No pending 2FA setup. Call setupInit first.");

        // Verify the TOTP code against the stored secret
        const totp = new TOTP();
        const isValid = totp.verify(input.code, { secret: pepprUser.twoFaSecret });
        if (!isValid) throw new Error("Invalid code. Please check your authenticator app and try again.");

        // Generate 8 backup codes (each 10 chars, alphanumeric)
        const backupCodes = Array.from({ length: 8 }, () =>
          nanoid(10).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 10)
        );

        await db.update(pepprUsers)
          .set({ twoFaEnabled: true, twoFaBackupCodes: backupCodes })
          .where(eq(pepprUsers.userId, pepprUser.userId));

        return { success: true, backupCodes };
      }),

    /**
     * Disable 2FA. Requires the user to confirm with their current password.
     */
    disable: protectedProcedure
      .input(z.object({ password: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const [pepprUser] = await db.select().from(pepprUsers)
          .where(eq(pepprUsers.manusOpenId, ctx.user.openId)).limit(1);
        if (!pepprUser) throw new Error("Peppr user not found");
        if (!pepprUser.twoFaEnabled) throw new Error("2FA is not enabled.");

        // Verify password before disabling
        const passwordValid = pepprUser.passwordHash
          ? await bcrypt.compare(input.password, pepprUser.passwordHash)
          : false;
        if (!passwordValid) throw new Error("Incorrect password.");

        await db.update(pepprUsers)
          .set({ twoFaEnabled: false, twoFaSecret: null, twoFaBackupCodes: null, twoFaMethod: null })
          .where(eq(pepprUsers.userId, pepprUser.userId));

        return { success: true };
      }),

    /**
     * Regenerate backup codes. Requires a valid TOTP code to confirm identity.
     */
    regenerateBackupCodes: protectedProcedure
      .input(z.object({ code: z.string().length(6).regex(/^\d{6}$/) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        const [pepprUser] = await db.select().from(pepprUsers)
          .where(eq(pepprUsers.manusOpenId, ctx.user.openId)).limit(1);
        if (!pepprUser || !pepprUser.twoFaEnabled || !pepprUser.twoFaSecret)
          throw new Error("2FA is not enabled.");

        const totp = new TOTP();
        const isValid = totp.verify(input.code, { secret: pepprUser.twoFaSecret });
        if (!isValid) throw new Error("Invalid TOTP code.");

        const backupCodes = Array.from({ length: 8 }, () =>
          nanoid(10).toUpperCase().replace(/[^A-Z0-9]/g, "X").slice(0, 10)
        );
        await db.update(pepprUsers)
          .set({ twoFaBackupCodes: backupCodes })
          .where(eq(pepprUsers.userId, pepprUser.userId));

        return { backupCodes };
      }),

    /**
     * Admin: force a user to re-enroll in 2FA on next login.
     * Clears their current 2FA secret and sets requires2Fa=true so the
     * login flow will block them until they complete a fresh setup.
     * Restricted to SUPER_ADMIN role.
     */
    forceReenroll: protectedProcedure
      .input(z.object({ targetUserId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB unavailable" });
        // Verify caller is a super-admin
        const [caller] = await db
          .select({ userId: pepprUsers.userId })
          .from(pepprUsers)
          .where(eq(pepprUsers.manusOpenId, ctx.user.openId))
          .limit(1);
        if (!caller) throw new TRPCError({ code: "FORBIDDEN", message: "User not found" });
        const callerRoles = await db
          .select({ roleId: pepprUserRoles.roleId })
          .from(pepprUserRoles)
          .where(eq(pepprUserRoles.userId, caller.userId));
        const isSuperAdmin = callerRoles.some((r: { roleId: string }) => r.roleId === "SUPER_ADMIN");
        if (!isSuperAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Super admin only" });
        // Resolve target user
        const [target] = await db
          .select({ userId: pepprUsers.userId, email: pepprUsers.email })
          .from(pepprUsers)
          .where(eq(pepprUsers.userId, input.targetUserId))
          .limit(1);
        if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Target user not found" });
        // Apply force re-enroll: clear 2FA state, set requires2Fa flag
        await db
          .update(pepprUsers)
          .set({ twoFaEnabled: false, twoFaSecret: null, twoFaBackupCodes: null, requires2Fa: true })
          .where(eq(pepprUsers.userId, input.targetUserId));
        // Audit record
        await db.insert(pepprAuditEvents).values({
          actorType: "USER",
          actorId: caller.userId,
          action: "2FA_FORCE_REENROLL",
          resourceType: "user",
          resourceId: input.targetUserId,
          details: { targetEmail: target.email },
        });
        return { success: true, targetUserId: input.targetUserId };
      }),

    /**
     * Get current 2FA status for the logged-in user.
     */
    status: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return { enabled: false };
      const [pepprUser] = await db
        .select({ twoFaEnabled: pepprUsers.twoFaEnabled })
        .from(pepprUsers)
        .where(eq(pepprUsers.manusOpenId, ctx.user.openId))
        .limit(1);
      return { enabled: pepprUser?.twoFaEnabled ?? false };
    }),
  }),

  systemHealth: router({
    /**
     * Enhancement 2: Redis health indicator.
     * Returns whether Redis is configured, reachable, and the active key prefix.
     * Protected so only authenticated admin users can query it.
     */
    redis: protectedProcedure.query(async () => {
      const configured = !!process.env.REDIS_URL;
      if (!configured || !redisClient) {
        return { configured: false, connected: false, latencyMs: null, prefix: null, activeRevocations: null };
      }
      try {
        const start = Date.now();
        await redisClient.ping();
        const latencyMs = Date.now() - start;
        // Derive the active prefix from the env (mirrors pepprAuth logic)
        const prefix = process.env.REDIS_KEY_PREFIX ??
          (process.env.NODE_ENV === "production" ? "prod" : process.env.NODE_ENV === "test" ? "test" : "dev");

        // Count active JTI revocation keys using SCAN (non-blocking, cursor-based)
        // We cap at 500 iterations to avoid long-running scans on large keyspaces
        let activeRevocations = 0;
        let cursor = "0";
        const pattern = `${prefix}:jti:revoked:*`;
        let iterations = 0;
        do {
          const [nextCursor, keys] = await redisClient.scan(cursor, "MATCH", pattern, "COUNT", 100);
          activeRevocations += keys.length;
          cursor = nextCursor;
          iterations++;
        } while (cursor !== "0" && iterations < 5); // max 500 keys scanned

        return { configured: true, connected: true, latencyMs, prefix, activeRevocations };
      } catch {
        return { configured: true, connected: false, latencyMs: null, prefix: null, activeRevocations: null };
      }
    }),
  }),

  stayTokens: router({
    listByRoom: protectedProcedure
      .input(z.object({
        propertyId: z.string(),
        roomId: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        const rows = await db.select().from(pepprStayTokens)
          .where(and(
            eq(pepprStayTokens.propertyId, input.propertyId),
            eq(pepprStayTokens.roomId, input.roomId),
            eq(pepprStayTokens.status, "active"),
          ))
          .orderBy(pepprStayTokens.createdAt);
        return rows.map(r => ({
          id: r.id,
          token: r.token,
          room_number: r.roomNumber,
          status: r.status,
          expires_at: r.expiresAt?.toISOString() || null,
        }));
      }),

    /**
     * Generate a temporary 24-hour test stay token for a room.
     * Creates a new token with a unique STK-TEST-* prefix.
     */
    generateTestToken: protectedProcedure
      .input(z.object({
        propertyId: z.string(),
        roomId: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");

        // Get room number for the token label
        const [room] = await db.select().from(pepprRooms)
          .where(eq(pepprRooms.id, input.roomId))
          .limit(1);

        const roomNumber = room?.roomNumber ?? "??";
        const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
        const token = `STK-TEST-R${roomNumber}-${suffix}`;
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await db.insert(pepprStayTokens).values({
          token,
          propertyId: input.propertyId,
          roomId: input.roomId,
          roomNumber,
          expiresAt,
          status: "active",
        });

        return {
          token,
          room_number: roomNumber,
          expires_at: expiresAt.toISOString(),
          status: "active" as const,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
