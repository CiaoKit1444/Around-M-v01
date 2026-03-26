import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { rbacRouter } from "./rbacRouter";
import { requestsRouter } from "./requestsRouter";
import { spTicketsRouter } from "./spTicketsRouter";
import { serviceOperatorsRouter } from "./serviceOperatorsRouter";
import { crudRouter } from "./crudRouter";
import { qrRouter } from "./qrRouter";
import { usersRouter } from "./usersRouter";
import { staffRouter } from "./staffRouter";
import { reportsRouter } from "./reportsRouter";
import { z } from "zod";
import { getDb } from "./db";
import { pepprStayTokens, pepprRooms, users, pepprUsers, pepprUserRoles } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

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
        twofa_enabled: pepprUser.twofaEnabled,
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
