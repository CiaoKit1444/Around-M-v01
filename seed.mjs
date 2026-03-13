/**
 * Seed Script — Populates Peppr Around with realistic hospitality data.
 *
 * Usage: node seed.mjs
 *
 * This script is idempotent — it checks for existing data before inserting.
 * It seeds: partners, properties, property configs, rooms, service providers,
 * catalog items, service templates, template items, staff positions, staff members,
 * and QR codes.
 */
import mysql from "mysql2/promise";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

const conn = await mysql.createConnection(DATABASE_URL);

// ── Helper ──────────────────────────────────────────────────────────────────
const uid = () => randomUUID().slice(0, 20);
const now = new Date().toISOString().slice(0, 19).replace("T", " ");

async function countTable(table) {
  const [rows] = await conn.execute(`SELECT COUNT(*) as c FROM ${table} WHERE id NOT LIKE 'test%'`);
  return rows[0].c;
}

// ── Check if seed data already exists ───────────────────────────────────────
const [existingPartners] = await conn.execute(
  "SELECT COUNT(*) as c FROM peppr_partners WHERE name LIKE 'Siam Hospitality%' OR name LIKE 'Andaman Resorts%'"
);
if (existingPartners[0].c > 0) {
  console.log("Seed data already exists. Skipping.");
  await conn.end();
  process.exit(0);
}

console.log("Seeding Peppr Around database...\n");

// ── 1. Partners ─────────────────────────────────────────────────────────────
const partners = [
  { id: uid(), name: "Siam Hospitality Group", email: "info@siamhospitality.co.th", phone: "+66-2-555-0100", address: "88 Silom Road, Bang Rak, Bangkok 10500", contactPerson: "Somchai Pattanakit" },
  { id: uid(), name: "Andaman Resorts International", email: "ops@andamanresorts.com", phone: "+66-76-555-0200", address: "42 Patong Beach Road, Kathu, Phuket 83150", contactPerson: "Natthaya Srisuk" },
  { id: uid(), name: "Lanna Heritage Hotels", email: "reservations@lannaheritage.co.th", phone: "+66-53-555-0300", address: "15 Tha Phae Road, Mueang, Chiang Mai 50200", contactPerson: "Kittisak Wongsiri" },
];

for (const p of partners) {
  await conn.execute(
    "INSERT INTO peppr_partners (id, name, email, phone, address, contact_person, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
    [p.id, p.name, p.email, p.phone, p.address, p.contactPerson]
  );
}
console.log(`✓ ${partners.length} partners created`);

// ── 2. Properties ───────────────────────────────────────────────────────────
const properties = [
  { id: uid(), partnerId: partners[0].id, name: "The Siam Riverside Hotel", type: "Hotel", address: "88/1 Charoen Krung Road", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", phone: "+66-2-555-0101", email: "riverside@siamhospitality.co.th" },
  { id: uid(), partnerId: partners[0].id, name: "Siam Business Suites", type: "Serviced Apartment", address: "55 Sukhumvit Soi 24", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", phone: "+66-2-555-0102", email: "suites@siamhospitality.co.th" },
  { id: uid(), partnerId: partners[1].id, name: "Andaman Pearl Beach Resort", type: "Resort", address: "99 Karon Beach Road", city: "Phuket", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", phone: "+66-76-555-0201", email: "pearl@andamanresorts.com" },
  { id: uid(), partnerId: partners[1].id, name: "Andaman Cliff Villas", type: "Villa", address: "23 Kamala Hillside", city: "Phuket", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", phone: "+66-76-555-0202", email: "villas@andamanresorts.com" },
  { id: uid(), partnerId: partners[2].id, name: "Lanna Heritage Boutique Hotel", type: "Boutique Hotel", address: "15/1 Tha Phae Road", city: "Chiang Mai", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", phone: "+66-53-555-0301", email: "boutique@lannaheritage.co.th" },
];

for (const p of properties) {
  await conn.execute(
    "INSERT INTO peppr_properties (id, partner_id, name, type, address, city, country, timezone, currency, phone, email, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')",
    [p.id, p.partnerId, p.name, p.type, p.address, p.city, p.country, p.timezone, p.currency, p.phone, p.email]
  );
}
console.log(`✓ ${properties.length} properties created`);

// ── 3. Property Configurations ──────────────────────────────────────────────
const configs = [
  { propertyId: properties[0].id, primaryColor: "#1a365d", secondaryColor: "#c6a35a", welcomeMessage: "Welcome to The Siam Riverside Hotel. How may we assist you today?" },
  { propertyId: properties[1].id, primaryColor: "#2d3748", secondaryColor: "#48bb78", welcomeMessage: "Welcome to Siam Business Suites. Your comfort is our priority." },
  { propertyId: properties[2].id, primaryColor: "#065f46", secondaryColor: "#f59e0b", welcomeMessage: "Welcome to Andaman Pearl Beach Resort. Enjoy paradise." },
  { propertyId: properties[3].id, primaryColor: "#7c3aed", secondaryColor: "#fbbf24", welcomeMessage: "Welcome to Andaman Cliff Villas. Your private retreat awaits." },
  { propertyId: properties[4].id, primaryColor: "#92400e", secondaryColor: "#d97706", welcomeMessage: "Welcome to Lanna Heritage. Experience authentic Northern Thai hospitality." },
];

for (const c of configs) {
  await conn.execute(
    "INSERT INTO peppr_property_config (property_id, primary_color, secondary_color, welcome_message) VALUES (?, ?, ?, ?)",
    [c.propertyId, c.primaryColor, c.secondaryColor, c.welcomeMessage]
  );
}
console.log(`✓ ${configs.length} property configurations created`);

// ── 4. Rooms ────────────────────────────────────────────────────────────────
const roomTypes = ["Standard", "Deluxe", "Suite", "Premium", "Executive"];
const rooms = [];

// Siam Riverside: 5 floors, 10 rooms each
for (let floor = 1; floor <= 5; floor++) {
  for (let room = 1; room <= 10; room++) {
    const roomNum = `${floor}${String(room).padStart(2, "0")}`;
    rooms.push({
      id: uid(),
      propertyId: properties[0].id,
      roomNumber: roomNum,
      floor: String(floor),
      zone: floor <= 2 ? "River View" : "City View",
      roomType: roomTypes[Math.min(floor - 1, 4)],
    });
  }
}

// Andaman Pearl: 3 floors, 8 rooms each
for (let floor = 1; floor <= 3; floor++) {
  for (let room = 1; room <= 8; room++) {
    const roomNum = `${floor}${String(room).padStart(2, "0")}`;
    rooms.push({
      id: uid(),
      propertyId: properties[2].id,
      roomNumber: roomNum,
      floor: String(floor),
      zone: floor === 1 ? "Beachfront" : "Garden View",
      roomType: floor === 3 ? "Suite" : floor === 2 ? "Deluxe" : "Standard",
    });
  }
}

// Lanna Heritage: 2 floors, 6 rooms each
for (let floor = 1; floor <= 2; floor++) {
  for (let room = 1; room <= 6; room++) {
    const roomNum = `${floor}${String(room).padStart(2, "0")}`;
    rooms.push({
      id: uid(),
      propertyId: properties[4].id,
      roomNumber: roomNum,
      floor: String(floor),
      zone: "Heritage Wing",
      roomType: floor === 2 ? "Deluxe" : "Standard",
    });
  }
}

for (const r of rooms) {
  await conn.execute(
    "INSERT INTO peppr_rooms (id, property_id, room_number, floor, zone, room_type, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
    [r.id, r.propertyId, r.roomNumber, r.floor, r.zone, r.roomType]
  );
}
console.log(`✓ ${rooms.length} rooms created`);

// ── 5. Service Providers ────────────────────────────────────────────────────
const providers = [
  { id: uid(), name: "Thai Wellness Spa Co.", email: "booking@thaiwellness.co.th", phone: "+66-2-555-1001", category: "Spa & Wellness", serviceArea: "Bangkok, Phuket", contactPerson: "Araya Thongchai", rating: "4.80" },
  { id: uid(), name: "Siam Gourmet Catering", email: "orders@siamgourmet.co.th", phone: "+66-2-555-1002", category: "Food & Beverage", serviceArea: "Bangkok", contactPerson: "Prasert Chaiyaporn", rating: "4.65" },
  { id: uid(), name: "Andaman Adventures", email: "tours@andamanadventures.com", phone: "+66-76-555-1003", category: "Tours & Activities", serviceArea: "Phuket, Krabi", contactPerson: "Wichai Suksombat", rating: "4.90" },
  { id: uid(), name: "Royal Thai Laundry", email: "service@royallaundry.co.th", phone: "+66-2-555-1004", category: "Laundry & Dry Cleaning", serviceArea: "Bangkok, Chiang Mai, Phuket", contactPerson: "Supaporn Rattanakul", rating: "4.50" },
  { id: uid(), name: "Bangkok Executive Transport", email: "dispatch@bkktransport.co.th", phone: "+66-2-555-1005", category: "Transportation", serviceArea: "Bangkok", contactPerson: "Thawatchai Boonmee", rating: "4.70" },
  { id: uid(), name: "Northern Thai Cooking School", email: "classes@ntcooking.co.th", phone: "+66-53-555-1006", category: "Experiences", serviceArea: "Chiang Mai", contactPerson: "Kannika Sripanya", rating: "4.95" },
];

for (const p of providers) {
  await conn.execute(
    "INSERT INTO peppr_service_providers (id, name, email, phone, category, service_area, contact_person, rating, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')",
    [p.id, p.name, p.email, p.phone, p.category, p.serviceArea, p.contactPerson, p.rating]
  );
}
console.log(`✓ ${providers.length} service providers created`);

// ── 6. Catalog Items ────────────────────────────────────────────────────────
const catalogItems = [
  // Spa & Wellness
  { id: uid(), providerId: providers[0].id, name: "Traditional Thai Massage", description: "Authentic Thai massage with stretching and pressure techniques", sku: "SPA-001", category: "Spa & Wellness", price: "1500.00", unit: "session", durationMinutes: 60 },
  { id: uid(), providerId: providers[0].id, name: "Aromatherapy Oil Massage", description: "Relaxing full-body massage with essential oils", sku: "SPA-002", category: "Spa & Wellness", price: "2000.00", unit: "session", durationMinutes: 90 },
  { id: uid(), providerId: providers[0].id, name: "Herbal Compress Treatment", description: "Traditional herbal compress with steamed Thai herbs", sku: "SPA-003", category: "Spa & Wellness", price: "2500.00", unit: "session", durationMinutes: 120 },
  { id: uid(), providerId: providers[0].id, name: "Foot Reflexology", description: "Therapeutic foot massage targeting pressure points", sku: "SPA-004", category: "Spa & Wellness", price: "800.00", unit: "session", durationMinutes: 45 },

  // Food & Beverage
  { id: uid(), providerId: providers[1].id, name: "In-Room Breakfast Set", description: "Continental or Thai breakfast served to your room", sku: "FB-001", category: "Food & Beverage", price: "450.00", unit: "set", durationMinutes: null },
  { id: uid(), providerId: providers[1].id, name: "Afternoon Tea Set", description: "Selection of pastries, sandwiches, and premium tea", sku: "FB-002", category: "Food & Beverage", price: "890.00", unit: "set", durationMinutes: null },
  { id: uid(), providerId: providers[1].id, name: "Private Dinner (2 persons)", description: "Five-course Thai dinner with wine pairing", sku: "FB-003", category: "Food & Beverage", price: "4500.00", unit: "set", durationMinutes: null },
  { id: uid(), providerId: providers[1].id, name: "Fresh Fruit Platter", description: "Seasonal tropical fruits beautifully arranged", sku: "FB-004", category: "Food & Beverage", price: "350.00", unit: "platter", durationMinutes: null },
  { id: uid(), providerId: providers[1].id, name: "Minibar Refill Package", description: "Full minibar restock with premium selections", sku: "FB-005", category: "Food & Beverage", price: "1200.00", unit: "package", durationMinutes: null },

  // Tours & Activities
  { id: uid(), providerId: providers[2].id, name: "Phi Phi Island Day Trip", description: "Full-day speedboat tour to Phi Phi Islands with snorkeling", sku: "TOUR-001", category: "Tours & Activities", price: "3500.00", unit: "person", durationMinutes: 480 },
  { id: uid(), providerId: providers[2].id, name: "Sunset Dinner Cruise", description: "Evening cruise with dinner and live music", sku: "TOUR-002", category: "Tours & Activities", price: "2800.00", unit: "person", durationMinutes: 180 },
  { id: uid(), providerId: providers[2].id, name: "Scuba Diving Experience", description: "Guided dive with certified instructor (no experience needed)", sku: "TOUR-003", category: "Tours & Activities", price: "4500.00", unit: "person", durationMinutes: 240 },

  // Laundry
  { id: uid(), providerId: providers[3].id, name: "Express Laundry (per kg)", description: "Same-day wash, dry, and fold service", sku: "LAUN-001", category: "Laundry & Dry Cleaning", price: "150.00", unit: "kg", durationMinutes: null },
  { id: uid(), providerId: providers[3].id, name: "Dry Cleaning (per piece)", description: "Professional dry cleaning for suits and formal wear", sku: "LAUN-002", category: "Laundry & Dry Cleaning", price: "350.00", unit: "piece", durationMinutes: null },
  { id: uid(), providerId: providers[3].id, name: "Ironing Service (per piece)", description: "Professional pressing and ironing", sku: "LAUN-003", category: "Laundry & Dry Cleaning", price: "80.00", unit: "piece", durationMinutes: null },

  // Transportation
  { id: uid(), providerId: providers[4].id, name: "Airport Transfer (Sedan)", description: "Private sedan transfer to/from Suvarnabhumi Airport", sku: "TRANS-001", category: "Transportation", price: "1200.00", unit: "trip", durationMinutes: null },
  { id: uid(), providerId: providers[4].id, name: "Airport Transfer (Van)", description: "Private van transfer for groups up to 8 passengers", sku: "TRANS-002", category: "Transportation", price: "1800.00", unit: "trip", durationMinutes: null },
  { id: uid(), providerId: providers[4].id, name: "Half-Day City Tour (4h)", description: "Private car with driver for city exploration", sku: "TRANS-003", category: "Transportation", price: "2500.00", unit: "trip", durationMinutes: 240 },

  // Experiences
  { id: uid(), providerId: providers[5].id, name: "Thai Cooking Class", description: "Learn to cook 5 authentic Thai dishes with local chef", sku: "EXP-001", category: "Experiences", price: "1800.00", unit: "person", durationMinutes: 180 },
  { id: uid(), providerId: providers[5].id, name: "Temple & Market Tour", description: "Guided morning tour of Chiang Mai temples and local market", sku: "EXP-002", category: "Experiences", price: "1200.00", unit: "person", durationMinutes: 240 },
];

for (const item of catalogItems) {
  await conn.execute(
    "INSERT INTO peppr_catalog_items (id, provider_id, name, description, sku, category, price, currency, unit, duration_minutes, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'THB', ?, ?, 'active')",
    [item.id, item.providerId, item.name, item.description, item.sku, item.category, item.price, item.unit, item.durationMinutes]
  );
}
console.log(`✓ ${catalogItems.length} catalog items created`);

// ── 7. Service Templates ────────────────────────────────────────────────────
const templates = [
  { id: uid(), name: "Standard Room Package", description: "Basic amenities and services for standard rooms", tier: "Standard" },
  { id: uid(), name: "Deluxe Room Package", description: "Enhanced services including spa and dining options", tier: "Deluxe" },
  { id: uid(), name: "Suite Premium Package", description: "Full-service package with premium experiences", tier: "Premium" },
  { id: uid(), name: "Beach Resort Package", description: "Curated beach and water activities", tier: "Premium" },
  { id: uid(), name: "Heritage Experience Package", description: "Cultural and culinary experiences in Chiang Mai", tier: "Standard" },
];

for (const t of templates) {
  await conn.execute(
    "INSERT INTO peppr_service_templates (id, name, description, tier, status) VALUES (?, ?, ?, ?, 'active')",
    [t.id, t.name, t.description, t.tier]
  );
}
console.log(`✓ ${templates.length} service templates created`);

// ── 8. Template Items ───────────────────────────────────────────────────────
const templateItemMappings = [
  // Standard: breakfast, laundry, foot massage
  { templateId: templates[0].id, items: [catalogItems[4], catalogItems[12], catalogItems[3]] },
  // Deluxe: breakfast, afternoon tea, Thai massage, laundry, airport transfer
  { templateId: templates[1].id, items: [catalogItems[4], catalogItems[5], catalogItems[0], catalogItems[12], catalogItems[15]] },
  // Suite Premium: all dining, spa, transport
  { templateId: templates[2].id, items: [catalogItems[4], catalogItems[5], catalogItems[6], catalogItems[1], catalogItems[2], catalogItems[15], catalogItems[16]] },
  // Beach Resort: tours, diving, sunset cruise
  { templateId: templates[3].id, items: [catalogItems[9], catalogItems[10], catalogItems[11]] },
  // Heritage: cooking class, temple tour, breakfast
  { templateId: templates[4].id, items: [catalogItems[18], catalogItems[19], catalogItems[4]] },
];

let templateItemCount = 0;
for (const mapping of templateItemMappings) {
  for (let i = 0; i < mapping.items.length; i++) {
    await conn.execute(
      "INSERT INTO peppr_template_items (id, template_id, catalog_item_id, sort_order) VALUES (?, ?, ?, ?)",
      [uid(), mapping.templateId, mapping.items[i].id, i + 1]
    );
    templateItemCount++;
  }
}
console.log(`✓ ${templateItemCount} template items linked`);

// ── 9. Additional Staff Positions ───────────────────────────────────────────
const positions = [
  { id: uid(), title: "General Manager", department: "Management", propertyId: null },
  { id: uid(), title: "Front Desk Agent", department: "Front Office", propertyId: properties[0].id },
  { id: uid(), title: "Concierge", department: "Front Office", propertyId: properties[0].id },
  { id: uid(), title: "Housekeeping Supervisor", department: "Housekeeping", propertyId: properties[0].id },
  { id: uid(), title: "Spa Therapist", department: "Spa & Wellness", propertyId: properties[2].id },
  { id: uid(), title: "Restaurant Manager", department: "Food & Beverage", propertyId: properties[0].id },
  { id: uid(), title: "Night Auditor", department: "Finance", propertyId: null },
  { id: uid(), title: "Activities Coordinator", department: "Guest Relations", propertyId: properties[2].id },
  { id: uid(), title: "Heritage Guide", department: "Guest Relations", propertyId: properties[4].id },
];

for (const p of positions) {
  await conn.execute(
    "INSERT INTO peppr_staff_positions (id, title, department, property_id, status) VALUES (?, ?, ?, ?, 'active')",
    [p.id, p.title, p.department, p.propertyId]
  );
}
console.log(`✓ ${positions.length} staff positions created`);

// ── 10. Staff Users ─────────────────────────────────────────────────────────
const passwordHash = await bcrypt.hash("Peppr2026!", 12);

const staffUsers = [
  { id: uid(), email: "somchai.p@siamhospitality.co.th", fullName: "Somchai Pattanakit", mobile: "+66-81-555-0001", role: "PARTNER_ADMIN" },
  { id: uid(), email: "natthaya.s@andamanresorts.com", fullName: "Natthaya Srisuk", mobile: "+66-81-555-0002", role: "PARTNER_ADMIN" },
  { id: uid(), email: "kittisak.w@lannaheritage.co.th", fullName: "Kittisak Wongsiri", mobile: "+66-81-555-0003", role: "PARTNER_ADMIN" },
  { id: uid(), email: "araya.t@siamhospitality.co.th", fullName: "Araya Thongchai", mobile: "+66-81-555-0004", role: "PROPERTY_ADMIN" },
  { id: uid(), email: "prasert.c@siamhospitality.co.th", fullName: "Prasert Chaiyaporn", mobile: "+66-81-555-0005", role: "STAFF" },
  { id: uid(), email: "wichai.s@andamanresorts.com", fullName: "Wichai Suksombat", mobile: "+66-81-555-0006", role: "STAFF" },
  { id: uid(), email: "supaporn.r@siamhospitality.co.th", fullName: "Supaporn Rattanakul", mobile: "+66-81-555-0007", role: "STAFF" },
  { id: uid(), email: "kannika.s@lannaheritage.co.th", fullName: "Kannika Sripanya", mobile: "+66-81-555-0008", role: "STAFF" },
];

for (const u of staffUsers) {
  await conn.execute(
    "INSERT INTO peppr_users (user_id, email, password_hash, full_name, mobile, role, status) VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')",
    [u.id, u.email, passwordHash, u.fullName, u.mobile, u.role]
  );
}
console.log(`✓ ${staffUsers.length} staff users created (password: Peppr2026!)`);

// ── 11. Staff Member Assignments ────────────────────────────────────────────
const staffAssignments = [
  { userId: staffUsers[0].id, positionId: positions[0].id, propertyId: properties[0].id }, // Somchai → GM at Riverside
  { userId: staffUsers[3].id, positionId: positions[1].id, propertyId: properties[0].id }, // Araya → Front Desk at Riverside
  { userId: staffUsers[4].id, positionId: positions[5].id, propertyId: properties[0].id }, // Prasert → Restaurant Mgr at Riverside
  { userId: staffUsers[6].id, positionId: positions[3].id, propertyId: properties[0].id }, // Supaporn → Housekeeping at Riverside
  { userId: staffUsers[1].id, positionId: positions[0].id, propertyId: properties[2].id }, // Natthaya → GM at Pearl
  { userId: staffUsers[5].id, positionId: positions[7].id, propertyId: properties[2].id }, // Wichai → Activities at Pearl
  { userId: staffUsers[2].id, positionId: positions[0].id, propertyId: properties[4].id }, // Kittisak → GM at Heritage
  { userId: staffUsers[7].id, positionId: positions[8].id, propertyId: properties[4].id }, // Kannika → Heritage Guide
];

for (const a of staffAssignments) {
  await conn.execute(
    "INSERT INTO peppr_staff_members (id, user_id, position_id, property_id, status) VALUES (?, ?, ?, ?, 'active')",
    [uid(), a.userId, a.positionId, a.propertyId]
  );
}
console.log(`✓ ${staffAssignments.length} staff assignments created`);

// ── 12. QR Codes (for first few rooms at Riverside) ─────────────────────────
const riversideRooms = rooms.filter(r => r.propertyId === properties[0].id).slice(0, 15);
const qrCodes = [];

for (const room of riversideRooms) {
  const qrId = `QR-SIAM-${room.roomNumber}`;
  qrCodes.push({
    id: uid(),
    propertyId: properties[0].id,
    roomId: room.id,
    qrCodeId: qrId,
    accessType: "public",
  });
}

// Also add some for Andaman Pearl
const pearlRooms = rooms.filter(r => r.propertyId === properties[2].id).slice(0, 8);
for (const room of pearlRooms) {
  const qrId = `QR-PEARL-${room.roomNumber}`;
  qrCodes.push({
    id: uid(),
    propertyId: properties[2].id,
    roomId: room.id,
    qrCodeId: qrId,
    accessType: "restricted",
  });
}

for (const qr of qrCodes) {
  await conn.execute(
    "INSERT INTO peppr_qr_codes (id, property_id, room_id, qr_code_id, access_type, status) VALUES (?, ?, ?, ?, ?, 'active')",
    [qr.id, qr.propertyId, qr.roomId, qr.qrCodeId, qr.accessType]
  );
}
console.log(`✓ ${qrCodes.length} QR codes created`);

// ── 13. Room ↔ Template Assignments ─────────────────────────────────────────
// Assign Standard package to standard rooms, Deluxe to deluxe rooms, etc.
let assignmentCount = 0;
for (const room of rooms) {
  let templateId;
  if (room.roomType === "Standard") templateId = templates[0].id;
  else if (room.roomType === "Deluxe") templateId = templates[1].id;
  else if (room.roomType === "Suite" || room.roomType === "Premium" || room.roomType === "Executive") templateId = templates[2].id;
  else templateId = templates[0].id;

  // Override for beach resort rooms
  if (room.propertyId === properties[2].id) templateId = templates[3].id;
  // Override for heritage rooms
  if (room.propertyId === properties[4].id) templateId = templates[4].id;

  await conn.execute(
    "INSERT INTO peppr_room_template_assignments (room_id, template_id) VALUES (?, ?)",
    [room.id, templateId]
  );
  assignmentCount++;
}
console.log(`✓ ${assignmentCount} room-template assignments created`);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════");
console.log("  Seed Complete!");
console.log("═══════════════════════════════════════════════════");
console.log(`  Partners:          ${partners.length}`);
console.log(`  Properties:        ${properties.length}`);
console.log(`  Property Configs:  ${configs.length}`);
console.log(`  Rooms:             ${rooms.length}`);
console.log(`  Service Providers: ${providers.length}`);
console.log(`  Catalog Items:     ${catalogItems.length}`);
console.log(`  Templates:         ${templates.length}`);
console.log(`  Template Items:    ${templateItemCount}`);
console.log(`  Staff Positions:   ${positions.length}`);
console.log(`  Staff Users:       ${staffUsers.length}`);
console.log(`  Staff Assignments: ${staffAssignments.length}`);
console.log(`  QR Codes:          ${qrCodes.length}`);
console.log(`  Room Assignments:  ${assignmentCount}`);
console.log("═══════════════════════════════════════════════════");
console.log("  Staff login: any seeded email + password 'Peppr2026!'");
console.log("═══════════════════════════════════════════════════\n");

await conn.end();
