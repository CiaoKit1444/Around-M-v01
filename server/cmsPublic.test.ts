/**
 * Tests for cmsPublicRouter.getPublicPreview
 *
 * Verifies the public (no-auth) procedure that powers the shareable
 * /guest/preview permalink page.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import {
  pepprPropertyBanners,
  pepprPropertyConfig,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

// ── Helpers ──────────────────────────────────────────────────────

function makeCaller() {
  return appRouter.createCaller({
    user: null,
    req: {} as any,
    res: {} as any,
  });
}
// ── Test fixtures ─────────────────────────────────────────────────────────────

const TEST_PROPERTY_ID = `vitest-preview-prop-${Date.now()}`;
const BANNER_ID_1 = nanoid(21);
const BANNER_ID_2 = nanoid(21);

const SAMPLE_GREETING = {
  en: { title: "Welcome, {{guest_name}}!", body: "Enjoy your stay in room {{room_number}}." },
  th: { title: "ยินดีต้อนรับ {{guest_name}}!", body: "ขอให้สนุกกับการพักผ่อนในห้อง {{room_number}}" },
};

beforeAll(async () => {
  const db = await getDb();
  if (!db) return;

  // Insert property config with branding + greeting
  await db.insert(pepprPropertyConfig).values({
    propertyId: TEST_PROPERTY_ID,
    logoUrl: "https://cdn.example.com/logo.png",
    primaryColor: "#6366F1",
    welcomeMessage: "Welcome",
    greetingConfig: SAMPLE_GREETING,
  }).onDuplicateKeyUpdate({ set: { greetingConfig: SAMPLE_GREETING } });

  // Insert two active banners
  await db.insert(pepprPropertyBanners).values([
    {
      id: BANNER_ID_1,
      propertyId: TEST_PROPERTY_ID,
      type: "announcement",
      title: "Pool Party Tonight!",
      body: "Join us at 8 PM",
      imageUrl: null,
      linkUrl: null,
      linkLabel: null,
      locale: null,
      sortOrder: 0,
      isActive: true,
    },
    {
      id: BANNER_ID_2,
      propertyId: TEST_PROPERTY_ID,
      type: "promotion",
      title: "Spa 20% Off",
      body: null,
      imageUrl: "https://cdn.example.com/spa.jpg",
      linkUrl: "https://example.com/spa",
      linkLabel: "Book now",
      locale: "en",
      sortOrder: 1,
      isActive: true,
    },
  ]);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(pepprPropertyBanners).where(eq(pepprPropertyBanners.propertyId, TEST_PROPERTY_ID));
  await db.delete(pepprPropertyConfig).where(eq(pepprPropertyConfig.propertyId, TEST_PROPERTY_ID));
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("cmsPublic.getPublicPreview", () => {
  it("returns banners, greeting, and branding for a known property", async () => {
    const caller = makeCaller();
    const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });

    expect(result.banners).toHaveLength(2);
    expect(result.greeting).not.toBeNull();
    expect(result.branding.primaryColor).toBe("#6366F1");
    expect(result.branding.logoUrl).toBe("https://cdn.example.com/logo.png");
  });

  it("returns banners in sortOrder ascending order", async () => {
    const caller = makeCaller();
    const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });

    const titles = result.banners.map(b => b.title);
    expect(titles[0]).toBe("Pool Party Tonight!");
    expect(titles[1]).toBe("Spa 20% Off");
  });

  it("returns greeting config with all seeded locales", async () => {
    const caller = makeCaller();
    const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });

    expect(result.greeting).toHaveProperty("en");
    expect(result.greeting).toHaveProperty("th");
    expect(result.greeting!.en.title).toContain("{{guest_name}}");
    expect(result.greeting!.en.body).toContain("{{room_number}}");
  });

  it("returns null greeting for a property with no config", async () => {
    const caller = makeCaller();
    const result = await caller.cmsPublic.getPublicPreview({ propertyId: "nonexistent-property-xyz" });

    expect(result.greeting).toBeNull();
    expect(result.banners).toHaveLength(0);
    expect(result.branding.primaryColor).toBe("#171717"); // default fallback
    expect(result.branding.logoUrl).toBeNull();
  });

  it("excludes inactive banners", async () => {
    const db = await getDb();
    if (!db) return;

    const inactiveBannerId = nanoid(21);
    await db.insert(pepprPropertyBanners).values({
      id: inactiveBannerId,
      propertyId: TEST_PROPERTY_ID,
      type: "default",
      title: "Hidden Banner",
      body: null,
      imageUrl: null,
      linkUrl: null,
      linkLabel: null,
      locale: null,
      sortOrder: 99,
      isActive: false,
    });

    try {
      const caller = makeCaller();
      const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });
      const titles = result.banners.map(b => b.title);
      expect(titles).not.toContain("Hidden Banner");
    } finally {
      await db.delete(pepprPropertyBanners).where(eq(pepprPropertyBanners.id, inactiveBannerId));
    }
  });

  it("excludes banners that have not yet started", async () => {
    const db = await getDb();
    if (!db) return;

    const futureBannerId = nanoid(21);
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow

    await db.insert(pepprPropertyBanners).values({
      id: futureBannerId,
      propertyId: TEST_PROPERTY_ID,
      type: "announcement",
      title: "Future Event",
      body: null,
      imageUrl: null,
      linkUrl: null,
      linkLabel: null,
      locale: null,
      sortOrder: 98,
      isActive: true,
      startsAt: futureDate,
    });

    try {
      const caller = makeCaller();
      const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });
      const titles = result.banners.map(b => b.title);
      expect(titles).not.toContain("Future Event");
    } finally {
      await db.delete(pepprPropertyBanners).where(eq(pepprPropertyBanners.id, futureBannerId));
    }
  });

  it("excludes banners that have already expired", async () => {
    const db = await getDb();
    if (!db) return;

    const expiredBannerId = nanoid(21);
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday

    await db.insert(pepprPropertyBanners).values({
      id: expiredBannerId,
      propertyId: TEST_PROPERTY_ID,
      type: "promotion",
      title: "Expired Deal",
      body: null,
      imageUrl: null,
      linkUrl: null,
      linkLabel: null,
      locale: null,
      sortOrder: 97,
      isActive: true,
      endsAt: pastDate,
    });

    try {
      const caller = makeCaller();
      const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });
      const titles = result.banners.map(b => b.title);
      expect(titles).not.toContain("Expired Deal");
    } finally {
      await db.delete(pepprPropertyBanners).where(eq(pepprPropertyBanners.id, expiredBannerId));
    }
  });

  it("returns only safe fields — no internal timestamps or PII", async () => {
    const caller = makeCaller();
    const result = await caller.cmsPublic.getPublicPreview({ propertyId: TEST_PROPERTY_ID });

    const banner = result.banners[0];
    // Should have these fields
    expect(banner).toHaveProperty("id");
    expect(banner).toHaveProperty("type");
    expect(banner).toHaveProperty("title");
    // Should NOT expose internal fields
    expect(banner).not.toHaveProperty("createdAt");
    expect(banner).not.toHaveProperty("updatedAt");
    expect(banner).not.toHaveProperty("isActive");
    expect(banner).not.toHaveProperty("sortOrder");
  });

  it("rejects propertyId that is too long", async () => {
    const caller = makeCaller();
    await expect(
      caller.cmsPublic.getPublicPreview({ propertyId: "x".repeat(101) }),
    ).rejects.toThrow();
  });
});
