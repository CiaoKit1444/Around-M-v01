/**
 * seed-guest-sessions.mjs
 *
 * Seeds peppr_guest_sessions with active sessions across all 5 properties,
 * covering all 8 supported locales (en, th, ja, zh, ko, fr, de, ar).
 * Each session has a guest_name, locale stored in font_size_pref (M default),
 * and maps to a real room + QR code.
 *
 * Also ensures peppr_property_config has greetingConfig with all 8 locales
 * for every property.
 *
 * Usage: node scripts/seed-guest-sessions.mjs
 */

import { createConnection } from "mysql2/promise";
import { randomUUID } from "crypto";
import { config } from "dotenv";

config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

// ── Locale-specific guest names ──────────────────────────────────────────────
const LOCALE_GUESTS = {
  en: [
    { name: "James Wilson", locale: "en" },
    { name: "Emily Carter", locale: "en" },
    { name: "Michael Brown", locale: "en" },
  ],
  th: [
    { name: "สมชาย ใจดี", locale: "th" },
    { name: "นภา สุขสันต์", locale: "th" },
    { name: "วิชัย มีสุข", locale: "th" },
  ],
  ja: [
    { name: "田中 太郎", locale: "ja" },
    { name: "鈴木 花子", locale: "ja" },
    { name: "山田 一郎", locale: "ja" },
  ],
  zh: [
    { name: "李明", locale: "zh" },
    { name: "王芳", locale: "zh" },
    { name: "张伟", locale: "zh" },
  ],
  ko: [
    { name: "김민준", locale: "ko" },
    { name: "이서연", locale: "ko" },
    { name: "박지훈", locale: "ko" },
  ],
  fr: [
    { name: "Jean Dupont", locale: "fr" },
    { name: "Marie Leclerc", locale: "fr" },
    { name: "Pierre Martin", locale: "fr" },
  ],
  de: [
    { name: "Hans Müller", locale: "de" },
    { name: "Anna Schmidt", locale: "de" },
    { name: "Klaus Weber", locale: "de" },
  ],
  ar: [
    { name: "محمد العلي", locale: "ar" },
    { name: "فاطمة الأحمد", locale: "ar" },
    { name: "عبدالله السعيد", locale: "ar" },
  ],
};

// ── Greeting messages per locale ─────────────────────────────────────────────
const GREETING_TEMPLATES = {
  en: {
    title: "Welcome to {{property_name}}",
    body: "Dear {{guest_name}}, we are delighted to have you with us in Room {{room_number}}. Our team is here to make your stay exceptional. Please don't hesitate to request any service.",
  },
  th: {
    title: "ยินดีต้อนรับสู่ {{property_name}}",
    body: "เรียน {{guest_name}} ยินดีต้อนรับสู่ห้องพัก {{room_number}} ทีมงานของเราพร้อมให้บริการคุณตลอด 24 ชั่วโมง กรุณาแจ้งความต้องการของคุณได้เลย",
  },
  ja: {
    title: "{{property_name}}へようこそ",
    body: "{{guest_name}}様、{{room_number}}号室へのご宿泊を心よりお待ちしておりました。ご滞在中、何かご不明な点やご要望がございましたら、お気軽にお申し付けください。",
  },
  zh: {
    title: "欢迎来到{{property_name}}",
    body: "尊敬的{{guest_name}}，欢迎您入住{{room_number}}号房间。我们的团队随时为您提供优质服务，如有任何需要，请随时告知我们。",
  },
  ko: {
    title: "{{property_name}}에 오신 것을 환영합니다",
    body: "{{guest_name}}님, {{room_number}}호실에 오신 것을 환영합니다. 저희 팀은 최고의 서비스를 제공하기 위해 항상 대기하고 있습니다. 필요하신 것이 있으면 언제든지 요청해 주세요.",
  },
  fr: {
    title: "Bienvenue au {{property_name}}",
    body: "Cher(e) {{guest_name}}, nous sommes ravis de vous accueillir dans la chambre {{room_number}}. Notre équipe est à votre disposition pour rendre votre séjour inoubliable.",
  },
  de: {
    title: "Willkommen im {{property_name}}",
    body: "Liebe(r) {{guest_name}}, wir freuen uns, Sie in Zimmer {{room_number}} begrüßen zu dürfen. Unser Team steht Ihnen jederzeit zur Verfügung, um Ihren Aufenthalt unvergesslich zu machen.",
  },
  ar: {
    title: "مرحباً بكم في {{property_name}}",
    body: "عزيزي {{guest_name}}، يسعدنا استقبالكم في الغرفة {{room_number}}. فريقنا على أتم الاستعداد لتقديم أفضل الخدمات لكم. لا تترددوا في طلب أي خدمة.",
  },
};

// ── Property-specific greeting overrides ─────────────────────────────────────
const PROPERTY_GREETING_OVERRIDES = {
  "Andaman Cliff Villas": {
    en: { title: "Welcome to Andaman Cliff Villas", body: "Dear {{guest_name}}, your private cliff villa {{room_number}} awaits. Enjoy the breathtaking Andaman Sea views and our world-class butler service." },
    th: { title: "ยินดีต้อนรับสู่ Andaman Cliff Villas", body: "เรียน {{guest_name}} วิลล่าริมหน้าผา {{room_number}} ของคุณพร้อมต้อนรับแล้ว เพลิดเพลินกับวิวทะเลอันดามันอันตระการตา" },
    ja: { title: "アンダマン・クリフ・ヴィラへようこそ", body: "{{guest_name}}様、崖の上のプライベートヴィラ{{room_number}}でアンダマン海の絶景をお楽しみください。" },
    zh: { title: "欢迎来到安达曼悬崖别墅", body: "尊敬的{{guest_name}}，您的悬崖别墅{{room_number}}已准备就绪，尽情享受安达曼海的壮丽景色。" },
  },
  "Andaman Pearl Beach Resort": {
    en: { title: "Welcome to Andaman Pearl Beach Resort", body: "Dear {{guest_name}}, your beachfront room {{room_number}} is ready. Feel the sand between your toes and let the ocean breeze refresh your spirit." },
    th: { title: "ยินดีต้อนรับสู่ Andaman Pearl Beach Resort", body: "เรียน {{guest_name}} ห้องพักริมหาด {{room_number}} ของคุณพร้อมแล้ว สัมผัสความสุขของทะเลอันดามัน" },
  },
  "Lanna Heritage Boutique Hotel": {
    en: { title: "Sawadee Krap — Welcome to Lanna Heritage", body: "Dear {{guest_name}}, room {{room_number}} has been prepared with traditional Lanna hospitality. Experience the timeless charm of Northern Thailand." },
    th: { title: "สวัสดีครับ — ยินดีต้อนรับสู่ล้านนา เฮอริเทจ", body: "เรียน {{guest_name}} ห้อง {{room_number}} ได้รับการจัดเตรียมด้วยการต้อนรับแบบล้านนาดั้งเดิม สัมผัสเสน่ห์ของภาคเหนือไทย" },
    ja: { title: "ランナー・ヘリテージへようこそ", body: "{{guest_name}}様、{{room_number}}号室でタイ北部の伝統的なランナー文化をご体験ください。" },
    zh: { title: "欢迎来到兰纳遗产精品酒店", body: "尊敬的{{guest_name}}，{{room_number}}号房间已按照传统兰纳风格精心布置，欢迎体验泰国北部的历史文化。" },
  },
  "Siam Business Suites": {
    en: { title: "Welcome to Siam Business Suites", body: "Dear {{guest_name}}, your executive suite {{room_number}} is configured for productivity. High-speed WiFi, ergonomic workspace, and 24/7 concierge await." },
    th: { title: "ยินดีต้อนรับสู่ Siam Business Suites", body: "เรียน {{guest_name}} ห้องสวีทผู้บริหาร {{room_number}} พร้อมรองรับการทำงานของคุณ WiFi ความเร็วสูงและคอนเซียร์จตลอด 24 ชั่วโมง" },
    zh: { title: "欢迎来到暹罗商务套房", body: "尊敬的{{guest_name}}，您的行政套房{{room_number}}已为您的商务需求做好准备。高速WiFi、人体工学工作区和24小时礼宾服务等候您。" },
    ja: { title: "サイアム・ビジネス・スイーツへようこそ", body: "{{guest_name}}様、エグゼクティブスイート{{room_number}}でビジネスをお楽しみください。高速WiFiと24時間コンシェルジュサービスをご利用いただけます。" },
  },
  "The Siam Riverside Hotel": {
    en: { title: "Welcome to The Siam Riverside Hotel", body: "Dear {{guest_name}}, your riverside room {{room_number}} overlooks the majestic Chao Phraya River. Enjoy the timeless beauty of Bangkok from your private balcony." },
    th: { title: "ยินดีต้อนรับสู่ The Siam Riverside Hotel", body: "เรียน {{guest_name}} ห้องพักริมแม่น้ำ {{room_number}} มองเห็นแม่น้ำเจ้าพระยาอันยิ่งใหญ่ เพลิดเพลินกับความงามของกรุงเทพฯ จากระเบียงส่วนตัว" },
    ja: { title: "ザ・サイアム・リバーサイド・ホテルへようこそ", body: "{{guest_name}}様、チャオプラヤー川を望む{{room_number}}号室でバンコクの美しい景色をお楽しみください。" },
    zh: { title: "欢迎来到暹罗河畔酒店", body: "尊敬的{{guest_name}}，您的河景客房{{room_number}}俯瞰壮丽的昭披耶河，在私人阳台上欣赏曼谷的永恒之美。" },
    fr: { title: "Bienvenue au Siam Riverside Hotel", body: "Cher(e) {{guest_name}}, votre chambre {{room_number}} avec vue sur le fleuve Chao Phraya vous attend. Profitez de la beauté intemporelle de Bangkok depuis votre balcon privé." },
    de: { title: "Willkommen im Siam Riverside Hotel", body: "Liebe(r) {{guest_name}}, Ihr Zimmer {{room_number}} mit Blick auf den Chao Phraya bietet Ihnen die zeitlose Schönheit Bangkoks von Ihrem privaten Balkon aus." },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseMysqlUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  };
}

function futureTs(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

async function main() {
  const conn = await createConnection(parseMysqlUrl(DB_URL));
  console.log("✅ Connected to database");

  // ── 1. Fetch all active rooms with QR codes ──────────────────────────────
  const [rooms] = await conn.execute(`
    SELECT r.id as room_id, r.room_number, r.property_id, q.id as qr_code_id, p.name as property_name
    FROM peppr_rooms r
    JOIN peppr_qr_codes q ON q.room_id = r.id
    JOIN peppr_properties p ON p.id = r.property_id
    WHERE r.status = 'active' AND q.status = 'active'
    ORDER BY p.name, r.room_number
  `);
  console.log(`📋 Found ${rooms.length} active rooms with QR codes`);

  // Group rooms by property
  const byProperty = {};
  for (const row of rooms) {
    if (!byProperty[row.property_name]) byProperty[row.property_name] = [];
    byProperty[row.property_name].push(row);
  }

  // ── 2. Clear existing guest sessions ────────────────────────────────────
  const [existing] = await conn.execute("SELECT COUNT(*) as cnt FROM peppr_guest_sessions");
  if (existing[0].cnt > 0) {
    await conn.execute("DELETE FROM peppr_guest_sessions");
    console.log(`🗑  Cleared ${existing[0].cnt} existing guest sessions`);
  }

  // ── 3. Seed guest sessions ───────────────────────────────────────────────
  const locales = Object.keys(LOCALE_GUESTS);
  let totalSessions = 0;

  for (const [propertyName, propertyRooms] of Object.entries(byProperty)) {
    let roomIdx = 0;
    const sessionsForProperty = [];

    // Create sessions cycling through locales
    for (const locale of locales) {
      const guests = LOCALE_GUESTS[locale];
      for (const guest of guests) {
        if (roomIdx >= propertyRooms.length) roomIdx = 0;
        const room = propertyRooms[roomIdx++];
        const sessionId = randomUUID();
        const expiresAt = futureTs(24 + Math.floor(Math.random() * 48)); // 24-72h from now

        sessionsForProperty.push([
          sessionId,
          room.qr_code_id,
          room.property_id,
          room.room_id,
          guest.name,
          "qr_scan",
          "ACTIVE",
          expiresAt,
        ]);
      }
    }

    // Batch insert
    for (const s of sessionsForProperty) {
      await conn.execute(
        `INSERT INTO peppr_guest_sessions (id, qr_code_id, property_id, room_id, guest_name, access_type, status, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        s
      );
    }

    totalSessions += sessionsForProperty.length;
    console.log(`  ✅ ${propertyName}: ${sessionsForProperty.length} sessions (${locales.length} locales × 3 guests)`);
  }

  console.log(`\n🎉 Seeded ${totalSessions} guest sessions total`);

  // ── 4. Update greetingConfig for all properties ──────────────────────────
  console.log("\n📝 Updating greetingConfig for all properties...");

  const [properties] = await conn.execute(
    "SELECT id, name FROM peppr_properties WHERE status = 'active'"
  );

  for (const prop of properties) {
    // Build greeting config: start with generic templates, then apply overrides
    const greetingConfig = {};
    for (const locale of locales) {
      const override = PROPERTY_GREETING_OVERRIDES[prop.name]?.[locale];
      greetingConfig[locale] = override ?? GREETING_TEMPLATES[locale];
    }

    const greetingJson = JSON.stringify(greetingConfig);

    // Check if config row exists
    const [existing] = await conn.execute(
      "SELECT id FROM peppr_property_config WHERE property_id = ?",
      [prop.id]
    );

    if (existing.length > 0) {
      await conn.execute(
        "UPDATE peppr_property_config SET greeting_config = ? WHERE property_id = ?",
        [greetingJson, prop.id]
      );
      console.log(`  ✅ Updated greeting config for ${prop.name}`);
    } else {
      const configId = randomUUID();
      await conn.execute(
        `INSERT INTO peppr_property_config (id, property_id, greeting_config, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        [configId, prop.id, greetingJson]
      );
      console.log(`  ✅ Created greeting config for ${prop.name}`);
    }
  }

  // ── 5. Summary ────────────────────────────────────────────────────────────
  console.log("\n📊 Final summary:");
  const [sessionCounts] = await conn.execute(`
    SELECT p.name, COUNT(gs.id) as sessions,
           GROUP_CONCAT(DISTINCT SUBSTRING(gs.guest_name, 1, 8) ORDER BY gs.guest_name SEPARATOR ', ') as sample_guests
    FROM peppr_guest_sessions gs
    JOIN peppr_properties p ON p.id = gs.property_id
    GROUP BY p.name
    ORDER BY p.name
  `);
  for (const row of sessionCounts) {
    console.log(`  ${row.name}: ${row.sessions} sessions`);
  }

  const [configCount] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM peppr_property_config WHERE greeting_config IS NOT NULL"
  );
  console.log(`\n  Properties with greeting config: ${configCount[0].cnt}`);
  console.log("\n✅ Guest session seed complete!");

  await conn.end();
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
