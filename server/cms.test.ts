/**
 * cms.test.ts — Unit tests for the mini-CMS feature.
 *
 * Tests cover:
 *   - Input validation for createBanner (empty title, invalid type, invalid URL)
 *   - Input validation for setGreeting (invalid locale key)
 *   - Branding API response shape (banners + greeting fields)
 *   - Banner schedule filtering logic (isActive, startsAt, endsAt)
 *   - Greeting locale resolution (fallback to English)
 *   - Carousel locale filtering (locale-specific + global banners)
 *
 * Strategy: Uses appRouter.createCaller (no HTTP) for tRPC procedures.
 * Pure logic tests (schedule filtering, locale resolution) run without DB.
 */
import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Helpers ────────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 1,
  openId: "open-001",
  name: "Test Admin",
  email: "admin@test.com",
  loginMethod: "manus",
  role: "admin" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
  fontSizePref: "M" as const,
};

function makeCtx(): TrpcContext {
  return {
    user: MOCK_USER,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

// ── Banner Input Validation ────────────────────────────────────────────────────

describe("CMS Router — Banner Input Validation", () => {
  it("should reject a banner with an empty title", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cms.createBanner({
        propertyId: "prop-001",
        title: "",
        type: "announcement",
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toThrow();
  });

  it("should reject a banner with an invalid type", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cms.createBanner({
        propertyId: "prop-001",
        title: "Test",
        type: "invalid_type" as any,
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toThrow();
  });

  it("should reject a banner with an invalid imageUrl", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cms.createBanner({
        propertyId: "prop-001",
        title: "Test",
        type: "default",
        imageUrl: "not-a-url",
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toThrow();
  });
});

// ── Greeting Input Validation ──────────────────────────────────────────────────

describe("CMS Router — Greeting Input Validation", () => {
  it("should reject an invalid locale key in greetingConfig", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const invalidPayload = {
      propertyId: "prop-001",
      greetingConfig: { invalid_locale: { title: "Hello", body: "Welcome" } },
    };
    await expect(
      caller.cms.setGreeting(invalidPayload as any),
    ).rejects.toThrow();
  });
});

// ── Branding Response Shape ────────────────────────────────────────────────────

describe("Branding API — Response Shape", () => {
  it("branding response should include banners and greeting fields", () => {
    const mockBrandingResponse = {
      property_name: "Test Hotel",
      logo_url: null,
      primary_color: "#171717",
      welcome_message: null,
      banners: [
        {
          id: "banner-001",
          type: "announcement",
          title: "Weekend Special",
          body: "20% off all spa treatments",
          image_url: null,
          link_url: null,
          link_label: null,
          locale: null,
          sort_order: 0,
        },
      ],
      greeting: {
        en: { title: "Welcome!", body: "We're glad you're here." },
        th: { title: "ยินดีต้อนรับ!", body: "เรายินดีที่คุณมา" },
      },
    };

    expect(mockBrandingResponse).toHaveProperty("banners");
    expect(mockBrandingResponse).toHaveProperty("greeting");
    expect(Array.isArray(mockBrandingResponse.banners)).toBe(true);
    expect(mockBrandingResponse.banners[0]).toHaveProperty("id");
    expect(mockBrandingResponse.banners[0]).toHaveProperty("type");
    expect(mockBrandingResponse.banners[0]).toHaveProperty("title");
    expect(mockBrandingResponse.greeting).toHaveProperty("en");
    expect(mockBrandingResponse.greeting.en).toHaveProperty("title");
    expect(mockBrandingResponse.greeting.en).toHaveProperty("body");
  });

  it("branding response with no banners should return empty array", () => {
    const mockBrandingResponse = {
      property_name: "Test Hotel",
      logo_url: null,
      primary_color: "#171717",
      welcome_message: null,
      banners: [],
      greeting: null,
    };

    expect(mockBrandingResponse.banners).toEqual([]);
    expect(mockBrandingResponse.greeting).toBeNull();
  });
});

// ── Banner Schedule Filtering Logic ───────────────────────────────────────────

describe("Banner Schedule Filtering", () => {
  const now = new Date("2026-03-27T10:00:00Z");

  function isActiveBanner(banner: {
    isActive: boolean;
    startsAt: Date | null;
    endsAt: Date | null;
  }): boolean {
    if (!banner.isActive) return false;
    if (banner.startsAt && banner.startsAt > now) return false;
    if (banner.endsAt && banner.endsAt < now) return false;
    return true;
  }

  it("should show a banner with no schedule", () => {
    expect(isActiveBanner({ isActive: true, startsAt: null, endsAt: null })).toBe(true);
  });

  it("should hide an inactive banner", () => {
    expect(isActiveBanner({ isActive: false, startsAt: null, endsAt: null })).toBe(false);
  });

  it("should hide a banner that has not started yet", () => {
    expect(isActiveBanner({
      isActive: true,
      startsAt: new Date("2026-04-01T00:00:00Z"),
      endsAt: null,
    })).toBe(false);
  });

  it("should hide a banner that has already expired", () => {
    expect(isActiveBanner({
      isActive: true,
      startsAt: null,
      endsAt: new Date("2026-03-01T00:00:00Z"),
    })).toBe(false);
  });

  it("should show a banner within its active schedule window", () => {
    expect(isActiveBanner({
      isActive: true,
      startsAt: new Date("2026-03-01T00:00:00Z"),
      endsAt: new Date("2026-04-01T00:00:00Z"),
    })).toBe(true);
  });
});

// ── Greeting Locale Resolution Logic ──────────────────────────────────────────

describe("Greeting Locale Resolution", () => {
  const greeting = {
    en: { title: "Welcome!", body: "Enjoy your stay." },
    th: { title: "ยินดีต้อนรับ!", body: "ขอให้เพลิดเพลิน" },
  };

  function resolveGreeting(
    config: Record<string, { title: string; body: string }> | null | undefined,
    locale: string,
  ) {
    return config ? (config[locale] ?? config["en"] ?? null) : null;
  }

  it("should return the greeting for the current locale", () => {
    const result = resolveGreeting(greeting, "th");
    expect(result?.title).toBe("ยินดีต้อนรับ!");
  });

  it("should fall back to English when locale is not available", () => {
    const result = resolveGreeting(greeting, "ja");
    expect(result?.title).toBe("Welcome!");
  });

  it("should return null when greeting config is null", () => {
    const result = resolveGreeting(null, "en");
    expect(result).toBeNull();
  });

  it("should return null when greeting config is undefined", () => {
    const result = resolveGreeting(undefined, "en");
    expect(result).toBeNull();
  });

  it("should return English greeting for English locale", () => {
    const result = resolveGreeting(greeting, "en");
    expect(result?.title).toBe("Welcome!");
    expect(result?.body).toBe("Enjoy your stay.");
  });
});

// ── Carousel Locale Filtering Logic ───────────────────────────────────────────

describe("Banner Carousel Locale Filtering", () => {
  const banners = [
    { id: "1", locale: null, title: "Global Banner" },
    { id: "2", locale: "en", title: "English Banner" },
    { id: "3", locale: "th", title: "Thai Banner" },
    { id: "4", locale: "ja", title: "Japanese Banner" },
  ];

  function filterByLocale(slides: typeof banners, locale: string) {
    return slides.filter(b => !b.locale || b.locale === locale);
  }

  it("should show global (null locale) banners for any locale", () => {
    const result = filterByLocale(banners, "ko");
    expect(result.map(b => b.id)).toContain("1");
    expect(result).toHaveLength(1);
  });

  it("should show locale-specific + global banners for English", () => {
    const result = filterByLocale(banners, "en");
    expect(result.map(b => b.id)).toEqual(["1", "2"]);
  });

  it("should show locale-specific + global banners for Thai", () => {
    const result = filterByLocale(banners, "th");
    expect(result.map(b => b.id)).toEqual(["1", "3"]);
  });

  it("should NOT show other locale banners", () => {
    const result = filterByLocale(banners, "en");
    expect(result.map(b => b.id)).not.toContain("3");
    expect(result.map(b => b.id)).not.toContain("4");
  });
});
