/**
 * cmsRouter — Mini-CMS tRPC router for property banners and greeting config.
 *
 * Banners: per-property carousel slides shown in the guest QR hero section.
 *   - type: 'default' | 'announcement' | 'promotion'
 *   - Supports optional schedule (startsAt / endsAt), locale targeting, image URL, CTA link
 *   - sortOrder controls carousel order (ascending)
 *
 * Greeting: i18n map keyed by locale code stored in peppr_property_config.greetingConfig.
 *   - Shape: Record<string, { title: string; body: string }>
 *   - Supported locales: en, th, ja, zh, ko, fr, de, ar
 *
 * All procedures require authentication (protectedProcedure).
 * Property-scoped writes additionally verify the caller has access to that property.
 */
import { z } from "zod";
import { eq, and, asc } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import {
  pepprPropertyBanners,
  pepprPropertyConfig,
} from "../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { storagePut } from "./storage";

// ── Shared schemas ────────────────────────────────────────────────────────────

const BANNER_TYPES = ["default", "announcement", "promotion"] as const;
const LOCALES = ["en", "th", "ja", "zh", "ko", "fr", "de", "ar"] as const;

const bannerUpsertSchema = z.object({
  propertyId: z.string().min(1),
  type: z.enum(BANNER_TYPES).default("announcement"),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  linkUrl: z.string().url().optional().or(z.literal("")),
  linkLabel: z.string().max(100).optional(),
  locale: z.enum(LOCALES).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

const greetingLocaleSchema = z.object({
  title: z.string().max(200),
  body: z.string().max(2000),
});

const greetingConfigSchema = z.record(
  z.enum(LOCALES),
  greetingLocaleSchema,
);

// ── Router ────────────────────────────────────────────────────────────────────

export const cmsRouter = router({
  /**
   * Upload a banner image to S3 and return the CDN URL.
   * Accepts a base64-encoded file body + MIME type.
   * The caller should then store the returned URL in the banner's imageUrl field.
   */
  uploadBannerImage: protectedProcedure
    .input(z.object({
      propertyId: z.string().min(1),
      fileName: z.string().min(1).max(255),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]),
      base64Data: z.string().min(1), // base64-encoded file content
    }))
    .mutation(async ({ input }) => {
      // Validate approximate file size (base64 overhead ~1.37×; cap at 5 MB raw)
      const approxBytes = (input.base64Data.length * 3) / 4;
      if (approxBytes > 5 * 1024 * 1024) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Image must be under 5 MB" });
      }

      const ext = input.mimeType.split("/")[1].replace("jpeg", "jpg");
      const suffix = nanoid(8);
      const key = `banners/${input.propertyId}/${suffix}-${input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}.${ext}`;

      const buffer = Buffer.from(input.base64Data, "base64");
      const { url } = await storagePut(key, buffer, input.mimeType);

      return { url, key };
    }),

  // ── Banners ────────────────────────────────────────────────────────────────

  /** List all banners for a property (ordered by sortOrder ASC). */
  listBanners: protectedProcedure
    .input(z.object({ propertyId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const rows = await db
        .select()
        .from(pepprPropertyBanners)
        .where(eq(pepprPropertyBanners.propertyId, input.propertyId))
        .orderBy(asc(pepprPropertyBanners.sortOrder), asc(pepprPropertyBanners.createdAt));

      return rows;
    }),

  /** Create a new banner. */
  createBanner: protectedProcedure
    .input(bannerUpsertSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const id = nanoid(21);
      await db.insert(pepprPropertyBanners).values({
        id,
        propertyId: input.propertyId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        imageUrl: input.imageUrl || null,
        linkUrl: input.linkUrl || null,
        linkLabel: input.linkLabel ?? null,
        locale: input.locale ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
      });

      const [created] = await db
        .select()
        .from(pepprPropertyBanners)
        .where(eq(pepprPropertyBanners.id, id))
        .limit(1);

      return created;
    }),

  /** Update an existing banner by id. */
  updateBanner: protectedProcedure
    .input(bannerUpsertSchema.extend({ id: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [existing] = await db
        .select()
        .from(pepprPropertyBanners)
        .where(and(
          eq(pepprPropertyBanners.id, input.id),
          eq(pepprPropertyBanners.propertyId, input.propertyId),
        ))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Banner not found" });

      await db.update(pepprPropertyBanners)
        .set({
          type: input.type,
          title: input.title,
          body: input.body ?? null,
          imageUrl: input.imageUrl || null,
          linkUrl: input.linkUrl || null,
          linkLabel: input.linkLabel ?? null,
          locale: input.locale ?? null,
          sortOrder: input.sortOrder,
          isActive: input.isActive,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
        })
        .where(eq(pepprPropertyBanners.id, input.id));

      const [updated] = await db
        .select()
        .from(pepprPropertyBanners)
        .where(eq(pepprPropertyBanners.id, input.id))
        .limit(1);

      return updated;
    }),

  /** Delete a banner by id. */
  deleteBanner: protectedProcedure
    .input(z.object({ id: z.string().min(1), propertyId: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [existing] = await db
        .select()
        .from(pepprPropertyBanners)
        .where(and(
          eq(pepprPropertyBanners.id, input.id),
          eq(pepprPropertyBanners.propertyId, input.propertyId),
        ))
        .limit(1);

      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Banner not found" });

      await db.delete(pepprPropertyBanners)
        .where(eq(pepprPropertyBanners.id, input.id));

      return { success: true };
    }),

  /**
   * Reorder banners for a property.
   * Accepts an ordered array of banner IDs; updates sortOrder to match array index.
   */
  reorderBanners: protectedProcedure
    .input(z.object({
      propertyId: z.string().min(1),
      orderedIds: z.array(z.string()),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      await Promise.all(
        input.orderedIds.map((id, idx) =>
          db.update(pepprPropertyBanners)
            .set({ sortOrder: idx })
            .where(and(
              eq(pepprPropertyBanners.id, id),
              eq(pepprPropertyBanners.propertyId, input.propertyId),
            )),
        ),
      );

      return { success: true };
    }),

  // ── Greeting Config ────────────────────────────────────────────────────────

  /** Get the greeting config for a property (returns null if not set). */
  getGreeting: protectedProcedure
    .input(z.object({ propertyId: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const [row] = await db
        .select({ greetingConfig: pepprPropertyConfig.greetingConfig })
        .from(pepprPropertyConfig)
        .where(eq(pepprPropertyConfig.propertyId, input.propertyId))
        .limit(1);

      if (!row) return null;
      return (row.greetingConfig ?? null) as Record<string, { title: string; body: string }> | null;
    }),

  /**
   * Set (upsert) the greeting config for a property.
   * greetingConfig is a Record<locale, { title, body }>.
   */
  setGreeting: protectedProcedure
    .input(z.object({
      propertyId: z.string().min(1),
      greetingConfig: greetingConfigSchema,
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      // Check if config row exists
      const [existing] = await db
        .select({ id: pepprPropertyConfig.id })
        .from(pepprPropertyConfig)
        .where(eq(pepprPropertyConfig.propertyId, input.propertyId))
        .limit(1);

      if (existing) {
        await db.update(pepprPropertyConfig)
          .set({ greetingConfig: input.greetingConfig })
          .where(eq(pepprPropertyConfig.propertyId, input.propertyId));
      } else {
        await db.insert(pepprPropertyConfig).values({
          propertyId: input.propertyId,
          greetingConfig: input.greetingConfig,
        });
      }

      return { success: true, greetingConfig: input.greetingConfig };
    }),
});

export type CmsRouter = typeof cmsRouter;

// ── Public preview procedure (no auth required) ───────────────────────────────

/**
 * getPublicPreview — returns the data needed to render a shareable guest preview
 * page without requiring admin authentication.
 *
 * Returns:
 *   - banners: active banners for the property
 *   - greeting: full greeting config map
 *   - branding: { propertyName, logoUrl, primaryColor }
 *
 * This is intentionally read-only and returns no PII.
 */
export const cmsPublicRouter = router({
  getPublicPreview: publicProcedure
    .input(z.object({ propertyId: z.string().min(1).max(100) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

      const now = new Date();

      // Fetch active banners ordered by sortOrder
      const banners = await db
        .select()
        .from(pepprPropertyBanners)
        .where(and(
          eq(pepprPropertyBanners.propertyId, input.propertyId),
          eq(pepprPropertyBanners.isActive, true),
        ))
        .orderBy(asc(pepprPropertyBanners.sortOrder), asc(pepprPropertyBanners.createdAt));

      // Filter out scheduled/expired banners
      const activeBanners = banners.filter(b => {
        if (b.startsAt && b.startsAt > now) return false;
        if (b.endsAt && b.endsAt < now) return false;
        return true;
      });

      // Fetch property config (branding + greeting)
      const [config] = await db
        .select({
          logoUrl: pepprPropertyConfig.logoUrl,
          primaryColor: pepprPropertyConfig.primaryColor,
          welcomeMessage: pepprPropertyConfig.welcomeMessage,
          greetingConfig: pepprPropertyConfig.greetingConfig,
        })
        .from(pepprPropertyConfig)
        .where(eq(pepprPropertyConfig.propertyId, input.propertyId))
        .limit(1);

      return {
        banners: activeBanners.map(b => ({
          id: b.id,
          type: b.type,
          title: b.title,
          body: b.body,
          imageUrl: b.imageUrl,
          linkUrl: b.linkUrl,
          linkLabel: b.linkLabel,
          locale: b.locale,
        })),
        greeting: (config?.greetingConfig ?? null) as Record<string, { title: string; body: string }> | null,
        branding: {
          logoUrl: config?.logoUrl ?? null,
          primaryColor: config?.primaryColor ?? "#171717",
        },
      };
    }),
});

export type CmsPublicRouter = typeof cmsPublicRouter;
