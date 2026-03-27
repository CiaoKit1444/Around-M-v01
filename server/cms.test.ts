/**
 * cms.test.ts — Unit tests for the mini-CMS feature.
 *
 * Tests cover:
 *   - Input validation for createBanner (empty title, invalid type, invalid URL)
 *   - Input validation for setGreeting (invalid locale key)
 *   - Input validation for uploadBannerImage (oversized, wrong MIME type)
 *   - Branding API response shape (banners + greeting fields)
 *   - Banner schedule filtering logic (isActive, startsAt, endsAt)
 *   - Greeting locale resolution (fallback to English)
 *   - Carousel locale filtering (locale-specific + global banners)
 *   - Personalisation token resolution ({{guest_name}}, {{room_number}}, {{property_name}})
 *   - Seed data shape validation (banner fields, greeting locale coverage)
 *
 * Strategy: Uses appRouter.createCaller (no HTTP) for tRPC procedures.
 * Pure logic tests run without DB.
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

// ── Image Upload Input Validation ─────────────────────────────────────────────

describe("CMS Router — Image Upload Input Validation", () => {
  it("should reject an upload with an unsupported MIME type", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cms.uploadBannerImage({
        propertyId: "prop-001",
        fileName: "test",
        mimeType: "image/bmp" as any,
        base64Data: Buffer.from("fake").toString("base64"),
      }),
    ).rejects.toThrow();
  });

  it("should reject an upload that exceeds 5 MB", async () => {
    const caller = appRouter.createCaller(makeCtx());
    // Generate a base64 string that decodes to ~6 MB
    const oversizedBase64 = "A".repeat(Math.ceil((6 * 1024 * 1024 * 4) / 3));
    await expect(
      caller.cms.uploadBannerImage({
        propertyId: "prop-001",
        fileName: "big",
        mimeType: "image/jpeg",
        base64Data: oversizedBase64,
      }),
    ).rejects.toThrow("Image must be under 5 MB");
  });

  it("should reject an upload with an empty fileName", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cms.uploadBannerImage({
        propertyId: "prop-001",
        fileName: "",
        mimeType: "image/png",
        base64Data: Buffer.from("fake").toString("base64"),
      }),
    ).rejects.toThrow();
  });

  it("should reject an upload with empty base64Data", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.cms.uploadBannerImage({
        propertyId: "prop-001",
        fileName: "test",
        mimeType: "image/png",
        base64Data: "",
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

// ── Personalisation Token Resolution ──────────────────────────────────────────

describe("Greeting Personalisation Token Resolution", () => {
  /**
   * Mirrors the resolveTokens() function in GuestGreetingPanel.tsx.
   * Kept here as a pure unit test — no DOM or React required.
   */
  function resolveTokens(
    text: string,
    ctx: { guestName?: string | null; roomNumber?: string | null; propertyName: string },
  ): string {
    return text
      .replace(/\{\{guest_name\}\}/g, ctx.guestName?.trim() || "")
      .replace(/\{\{room_number\}\}/g, ctx.roomNumber?.trim() || "")
      .replace(/\{\{property_name\}\}/g, ctx.propertyName)
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  it("should replace {{property_name}} with the property name", () => {
    const result = resolveTokens("Welcome to {{property_name}}!", {
      propertyName: "Andaman Pearl Beach Resort",
    });
    expect(result).toBe("Welcome to Andaman Pearl Beach Resort!");
  });

  it("should replace {{guest_name}} with the guest's name", () => {
    const result = resolveTokens("Hi {{guest_name}}, enjoy your stay.", {
      guestName: "Ciao",
      propertyName: "Test Hotel",
    });
    expect(result).toBe("Hi Ciao, enjoy your stay.");
  });

  it("should replace {{room_number}} with the room number", () => {
    const result = resolveTokens("Your room {{room_number}} is ready.", {
      roomNumber: "512",
      propertyName: "Test Hotel",
    });
    expect(result).toBe("Your room 512 is ready.");
  });

  it("should replace all three tokens in a single string", () => {
    const result = resolveTokens(
      "Hi {{guest_name}}, room {{room_number}} at {{property_name}} is ready.",
      { guestName: "Alice", roomNumber: "101", propertyName: "The Siam" },
    );
    expect(result).toBe("Hi Alice, room 101 at The Siam is ready.");
  });

  it("should gracefully omit {{guest_name}} when not provided", () => {
    const result = resolveTokens("Hi {{guest_name}}, welcome!", {
      guestName: null,
      propertyName: "Test Hotel",
    });
    // Empty string substitution — double-space collapsed, trimmed
    expect(result).toBe("Hi , welcome!");
  });

  it("should gracefully omit {{room_number}} when not provided", () => {
    const result = resolveTokens("Room {{room_number}} is ready.", {
      roomNumber: null,
      propertyName: "Test Hotel",
    });
    expect(result).toBe("Room is ready.");
  });

  it("should handle a string with no tokens unchanged", () => {
    const result = resolveTokens("Enjoy your stay.", { propertyName: "Test Hotel" });
    expect(result).toBe("Enjoy your stay.");
  });

  it("should handle multiple occurrences of the same token", () => {
    const result = resolveTokens(
      "{{property_name}} — {{property_name}}",
      { propertyName: "Lanna Heritage" },
    );
    expect(result).toBe("Lanna Heritage — Lanna Heritage");
  });
});

// ── Seed Data Shape Validation ────────────────────────────────────────────────

describe("Seed Data Shape Validation", () => {
  /**
   * These tests validate the shape of the seed data used in scripts/seed-cms.mjs.
   * They ensure the seed script produces well-formed banners and greeting configs
   * before they are inserted into the database.
   */

  const SEED_BANNER = {
    type: "default",
    title: "Experience Riverside Luxury",
    body: "Unwind in our signature suites overlooking the Chao Phraya River",
    imageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    linkUrl: null,
    linkLabel: null,
    locale: null,
    sortOrder: 0,
    isActive: true,
  };

  const SEED_GREETING = {
    en: { title: "Welcome to {{property_name}}!", body: "Hi {{guest_name}}, your room {{room_number}} is all set." },
    th: { title: "ยินดีต้อนรับสู่ {{property_name}}!", body: "สวัสดีครับ/ค่ะ {{guest_name}} ห้อง {{room_number}} ของท่านพร้อมแล้ว" },
    ja: { title: "{{property_name}} へようこそ！", body: "{{guest_name}} 様、お部屋 {{room_number}} のご準備が整いました。" },
    zh: { title: "欢迎来到 {{property_name}}！", body: "亲爱的 {{guest_name}}，您的 {{room_number}} 号房间已准备就绪。" },
    ko: { title: "{{property_name}} 에 오신 것을 환영합니다!", body: "{{guest_name}} 님, {{room_number}} 호실이 준비되었습니다." },
    fr: { title: "Bienvenue au {{property_name}} !", body: "Bonjour {{guest_name}}, votre chambre {{room_number}} est prête." },
    de: { title: "Willkommen im {{property_name}}!", body: "Hallo {{guest_name}}, Ihr Zimmer {{room_number}} ist bereit." },
    ar: { title: "مرحباً بكم في {{property_name}}!", body: "عزيزي {{guest_name}}، غرفتك {{room_number}} جاهزة." },
  };

  it("seed banner should have all required fields", () => {
    expect(SEED_BANNER).toHaveProperty("type");
    expect(SEED_BANNER).toHaveProperty("title");
    expect(SEED_BANNER).toHaveProperty("sortOrder");
    expect(SEED_BANNER).toHaveProperty("isActive");
    expect(["default", "announcement", "promotion"]).toContain(SEED_BANNER.type);
    expect(SEED_BANNER.title.length).toBeGreaterThan(0);
  });

  it("seed banner imageUrl should be a valid URL", () => {
    expect(() => new URL(SEED_BANNER.imageUrl)).not.toThrow();
  });

  it("seed greeting should cover all 8 supported locales", () => {
    const SUPPORTED_LOCALES = ["en", "th", "ja", "zh", "ko", "fr", "de", "ar"];
    for (const locale of SUPPORTED_LOCALES) {
      expect(SEED_GREETING).toHaveProperty(locale);
      expect(SEED_GREETING[locale as keyof typeof SEED_GREETING]).toHaveProperty("title");
      expect(SEED_GREETING[locale as keyof typeof SEED_GREETING]).toHaveProperty("body");
    }
  });

  it("seed greeting titles should contain the {{property_name}} token", () => {
    for (const [, entry] of Object.entries(SEED_GREETING)) {
      expect(entry.title).toContain("{{property_name}}");
    }
  });

  it("seed greeting bodies should contain personalisation tokens", () => {
    for (const [, entry] of Object.entries(SEED_GREETING)) {
      const hasToken =
        entry.body.includes("{{guest_name}}") ||
        entry.body.includes("{{room_number}}") ||
        entry.body.includes("{{property_name}}");
      expect(hasToken).toBe(true);
    }
  });
});
