/**
 * seed-cms.mjs
 *
 * Seeds placeholder banners (with stub Unsplash image URLs) and mock greeting
 * messages for all existing properties. Also updates property_config with
 * placeholder logo URLs and greeting_config JSON.
 *
 * Run with:  node scripts/seed-cms.mjs
 */
import { createConnection } from "mysql2/promise";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });

// ── Stub image URLs (Unsplash source — no API key needed) ─────────────────────
// Using picsum.photos as deterministic placeholders (no rate limits, no auth)
const STUB_IMAGES = {
  hotel_lobby:     "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  pool:            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
  restaurant:      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80",
  spa:             "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&q=80",
  beach:           "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  city_night:      "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
  breakfast:       "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  mountain:        "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80",
  villa:           "https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=800&q=80",
  heritage:        "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
};

// ── Greeting messages per locale ──────────────────────────────────────────────
const GREETING_TEMPLATES = {
  en: {
    title: "Welcome to {{property_name}}!",
    body:  "Hi {{guest_name}}, your room {{room_number}} is all set. Browse our services below and let us know how we can make your stay exceptional.",
  },
  th: {
    title: "ยินดีต้อนรับสู่ {{property_name}}!",
    body:  "สวัสดีครับ/ค่ะ {{guest_name}} ห้อง {{room_number}} ของท่านพร้อมแล้ว กรุณาเลือกบริการที่ต้องการด้านล่าง",
  },
  ja: {
    title: "{{property_name}} へようこそ！",
    body:  "{{guest_name}} 様、お部屋 {{room_number}} のご準備が整いました。以下よりご希望のサービスをお選びください。",
  },
  zh: {
    title: "欢迎来到 {{property_name}}！",
    body:  "亲爱的 {{guest_name}}，您的 {{room_number}} 号房间已准备就绪。请在下方浏览我们的服务。",
  },
  ko: {
    title: "{{property_name}} 에 오신 것을 환영합니다!",
    body:  "{{guest_name}} 님, {{room_number}} 호실이 준비되었습니다. 아래에서 원하시는 서비스를 선택해 주세요.",
  },
  fr: {
    title: "Bienvenue au {{property_name}} !",
    body:  "Bonjour {{guest_name}}, votre chambre {{room_number}} est prête. Parcourez nos services ci-dessous.",
  },
  de: {
    title: "Willkommen im {{property_name}}!",
    body:  "Hallo {{guest_name}}, Ihr Zimmer {{room_number}} ist bereit. Entdecken Sie unsere Services unten.",
  },
  ar: {
    title: "مرحباً بكم في {{property_name}}!",
    body:  "عزيزي {{guest_name}}، غرفتك {{room_number}} جاهزة. تصفح خدماتنا أدناه.",
  },
};

// ── Banner templates per property type ───────────────────────────────────────
const BANNER_SETS = {
  "The Siam Riverside Hotel": [
    {
      type: "default",
      title: "Experience Riverside Luxury",
      body: "Unwind in our signature suites overlooking the Chao Phraya River",
      imageUrl: STUB_IMAGES.hotel_lobby,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 0, isActive: true,
    },
    {
      type: "promotion",
      title: "🍳 Complimentary Breakfast",
      body: "Enjoy our award-winning buffet breakfast — included with every stay",
      imageUrl: STUB_IMAGES.breakfast,
      linkUrl: null, linkLabel: "Order Now", locale: null,
      sortOrder: 1, isActive: true,
    },
    {
      type: "announcement",
      title: "Rooftop Pool Now Open",
      body: "Our infinity pool is open daily 07:00 – 22:00. Towels provided.",
      imageUrl: STUB_IMAGES.pool,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 2, isActive: true,
    },
  ],
  "Andaman Pearl Beach Resort": [
    {
      type: "default",
      title: "Paradise Awaits You",
      body: "Turquoise waters, white sand, and world-class hospitality",
      imageUrl: STUB_IMAGES.beach,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 0, isActive: true,
    },
    {
      type: "promotion",
      title: "🌿 Spa & Wellness Package",
      body: "Book a 60-min treatment and receive a complimentary coconut scrub",
      imageUrl: STUB_IMAGES.spa,
      linkUrl: null, linkLabel: "Book Spa", locale: null,
      sortOrder: 1, isActive: true,
    },
    {
      type: "announcement",
      title: "Sunset Dinner — Tonight",
      body: "Join us on the beach terrace for a candlelit dinner at 19:00",
      imageUrl: STUB_IMAGES.restaurant,
      linkUrl: null, linkLabel: "Reserve Table", locale: null,
      sortOrder: 2, isActive: true,
    },
  ],
  "Andaman Cliff Villas": [
    {
      type: "default",
      title: "Your Private Cliff Villa",
      body: "Exclusive villas with private plunge pools and panoramic sea views",
      imageUrl: STUB_IMAGES.villa,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 0, isActive: true,
    },
    {
      type: "promotion",
      title: "🧖 In-Villa Spa",
      body: "Schedule a private spa session — our therapist comes to you",
      imageUrl: STUB_IMAGES.spa,
      linkUrl: null, linkLabel: "Book Now", locale: null,
      sortOrder: 1, isActive: true,
    },
    {
      type: "announcement",
      title: "Sunset Cocktail Hour",
      body: "Complimentary welcome drinks at the cliff lounge — 17:30 daily",
      imageUrl: STUB_IMAGES.beach,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 2, isActive: true,
    },
  ],
  "Siam Business Suites": [
    {
      type: "default",
      title: "Business Travel, Reimagined",
      body: "High-speed Wi-Fi, meeting rooms, and 24-hour concierge at your service",
      imageUrl: STUB_IMAGES.city_night,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 0, isActive: true,
    },
    {
      type: "promotion",
      title: "🍽️ Executive Lounge Access",
      body: "Complimentary evening cocktails and canapes for all suite guests",
      imageUrl: STUB_IMAGES.restaurant,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 1, isActive: true,
    },
    {
      type: "announcement",
      title: "Express Laundry Available",
      body: "Same-day laundry service — drop off before 09:00, back by 18:00",
      imageUrl: STUB_IMAGES.hotel_lobby,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 2, isActive: true,
    },
  ],
  "Lanna Heritage Boutique Hotel": [
    {
      type: "default",
      title: "Northern Thai Heritage",
      body: "Immerse yourself in Lanna culture — architecture, art, and cuisine",
      imageUrl: STUB_IMAGES.heritage,
      linkUrl: null, linkLabel: null, locale: null,
      sortOrder: 0, isActive: true,
    },
    {
      type: "promotion",
      title: "🏔️ Doi Inthanon Day Trip",
      body: "Join our guided tour to Thailand's highest peak — departs 07:30",
      imageUrl: STUB_IMAGES.mountain,
      linkUrl: null, linkLabel: "Book Tour", locale: null,
      sortOrder: 1, isActive: true,
    },
    {
      type: "announcement",
      title: "Traditional Thai Cooking Class",
      body: "Learn to cook authentic northern Thai dishes — every Saturday 10:00",
      imageUrl: STUB_IMAGES.restaurant,
      linkUrl: null, linkLabel: "Reserve Spot", locale: null,
      sortOrder: 2, isActive: true,
    },
  ],
};

// ── Stub logo URLs per property ───────────────────────────────────────────────
const LOGO_URLS = {
  "The Siam Riverside Hotel":    "https://ui-avatars.com/api/?name=Siam+Riverside&background=1a365d&color=fff&size=128&bold=true",
  "Andaman Pearl Beach Resort":  "https://ui-avatars.com/api/?name=Andaman+Pearl&background=065f46&color=fff&size=128&bold=true",
  "Andaman Cliff Villas":        "https://ui-avatars.com/api/?name=Andaman+Cliff&background=7c3aed&color=fff&size=128&bold=true",
  "Siam Business Suites":        "https://ui-avatars.com/api/?name=Siam+Business&background=2d3748&color=fff&size=128&bold=true",
  "Lanna Heritage Boutique Hotel": "https://ui-avatars.com/api/?name=Lanna+Heritage&background=92400e&color=fff&size=128&bold=true",
};

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await createConnection(process.env.DATABASE_URL);
  console.log("✓ Connected to database\n");

  try {
    // Fetch all properties
    const [properties] = await conn.execute("SELECT id, name FROM peppr_properties");

    for (const prop of properties) {
      const { id: propertyId, name } = prop;
      console.log(`\n── ${name} (${propertyId})`);

      // 1. Update property_config with logo + greeting
      const greetingConfig = JSON.stringify(GREETING_TEMPLATES);
      const logoUrl = LOGO_URLS[name] ?? null;

      await conn.execute(
        `UPDATE peppr_property_config
         SET logo_url = ?, greeting_config = ?
         WHERE property_id = ?`,
        [logoUrl, greetingConfig, propertyId],
      );
      console.log(`  ✓ Updated config — logo: ${logoUrl ? "set" : "null"}, greeting: all 8 locales`);

      // 2. Delete existing seed banners (idempotent re-seed)
      const [existing] = await conn.execute(
        "SELECT COUNT(*) as cnt FROM peppr_property_banners WHERE property_id = ?",
        [propertyId],
      );
      if (existing[0].cnt > 0) {
        await conn.execute(
          "DELETE FROM peppr_property_banners WHERE property_id = ?",
          [propertyId],
        );
        console.log(`  ↺ Cleared ${existing[0].cnt} existing banner(s)`);
      }

      // 3. Insert banners
      const banners = BANNER_SETS[name] ?? BANNER_SETS["The Siam Riverside Hotel"];
      for (const b of banners) {
        const id = randomUUID();
        const now = new Date();
        await conn.execute(
          `INSERT INTO peppr_property_banners
           (id, property_id, type, title, body, image_url, link_url, link_label,
            locale, sort_order, is_active, starts_at, ends_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
          [
            id, propertyId, b.type, b.title, b.body ?? null,
            b.imageUrl ?? null, b.linkUrl ?? null, b.linkLabel ?? null,
            b.locale ?? null, b.sortOrder, b.isActive ? 1 : 0,
            now, now,
          ],
        );
        console.log(`  ✓ Banner [${b.type}] "${b.title}"`);
      }
    }

    console.log("\n✅ Seed complete!\n");
  } finally {
    await conn.end();
  }
}

main().catch(e => {
  console.error("Seed failed:", e.message);
  process.exit(1);
});
