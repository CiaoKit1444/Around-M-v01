import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { rbacRouter } from "./rbacRouter";
import { z } from "zod";
import { getDb } from "./db";
import { pepprStayTokens } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  rbac: rbacRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
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
  }),
});

export type AppRouter = typeof appRouter;
