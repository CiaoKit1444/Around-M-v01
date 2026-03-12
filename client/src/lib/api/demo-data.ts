/**
 * Demo Data — Realistic mock data for standalone UI development.
 *
 * Intent: Allow the frontend to render fully without a running backend.
 * When the API is connected, these are never used — TanStack Query
 * fetches from the real endpoints. This file exists purely for
 * development and demonstration purposes.
 */
import type {
  CatalogItem,
  GuestSession,
  PaginatedResponse,
  Partner,
  Property,
  QRCode,
  Room,
  ServiceProvider,
  ServiceRequest,
  ServiceTemplate,
  StaffMember,
  StaffPosition,
  User,
} from "./types";

function paginate<T>(items: T[], page = 1, pageSize = 10): PaginatedResponse<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    page_size: pageSize,
    total_pages: Math.ceil(items.length / pageSize),
  };
}

// ─── Partners ────────────────────────────────────────────────
export const demoPartners: Partner[] = [
  { id: "p-001", name: "Grand Hyatt Group", email: "ops@grandhyatt.com", phone: "+66-2-254-1234", contact_person: "Somchai T.", status: "active", properties_count: 3, address: "494 Rajdamri Road, Bangkok", created_at: "2025-11-15T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "p-002", name: "Siam Kempinski Hotels", email: "admin@siamkempinski.com", phone: "+66-2-162-9000", contact_person: "Nattapong K.", status: "active", properties_count: 2, address: "991/9 Rama I Road, Bangkok", created_at: "2025-12-01T08:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  { id: "p-003", name: "Centara Hotels & Resorts", email: "partner@centara.com", phone: "+66-2-769-1234", contact_person: "Wipada S.", status: "active", properties_count: 5, address: "999/99 Rama I Road, Bangkok", created_at: "2026-01-10T08:00:00Z", updated_at: "2026-03-10T10:00:00Z" },
  { id: "p-004", name: "Mandarin Oriental", email: "gm@mandarinoriental.com", phone: "+66-2-659-9000", contact_person: "Pichaya L.", status: "active", properties_count: 1, address: "48 Oriental Avenue, Bangkok", created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
  { id: "p-005", name: "The Sukhothai Bangkok", email: "info@sukhothai.com", phone: "+66-2-344-8888", contact_person: "Araya M.", status: "pending", properties_count: 1, address: "13/3 South Sathorn Road, Bangkok", created_at: "2026-02-15T08:00:00Z", updated_at: "2026-03-11T10:00:00Z" },
  { id: "p-006", name: "Anantara Resorts", email: "ops@anantara.com", phone: "+66-2-476-0022", contact_person: "Kittisak P.", status: "active", properties_count: 4, address: "257 Charoennakorn Road, Bangkok", created_at: "2026-01-05T08:00:00Z", updated_at: "2026-03-08T10:00:00Z" },
];

// ─── Properties ──────────────────────────────────────────────
export const demoProperties: Property[] = [
  { id: "pr-001", partner_id: "p-001", partner_name: "Grand Hyatt Group", name: "Grand Hyatt Bangkok", type: "Hotel", address: "494 Rajdamri Road", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 320, active_qr_count: 280, status: "active", created_at: "2025-11-20T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "pr-002", partner_id: "p-002", partner_name: "Siam Kempinski Hotels", name: "Siam Kempinski Bangkok", type: "Hotel", address: "991/9 Rama I Road", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 280, active_qr_count: 250, status: "active", created_at: "2025-12-05T08:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  { id: "pr-003", partner_id: "p-003", partner_name: "Centara Hotels & Resorts", name: "Centara Grand", type: "Hotel", address: "999/99 Rama I Road", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 196, active_qr_count: 180, status: "active", created_at: "2026-01-15T08:00:00Z", updated_at: "2026-03-10T10:00:00Z" },
  { id: "pr-004", partner_id: "p-004", partner_name: "Mandarin Oriental", name: "Mandarin Oriental Bangkok", type: "Hotel", address: "48 Oriental Avenue", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 196, active_qr_count: 170, status: "active", created_at: "2026-01-25T08:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
  { id: "pr-005", partner_id: "p-005", partner_name: "The Sukhothai Bangkok", name: "The Sukhothai Bangkok", type: "Hotel", address: "13/3 South Sathorn Road", city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok", currency: "THB", rooms_count: 148, active_qr_count: 120, status: "pending", created_at: "2026-02-20T08:00:00Z", updated_at: "2026-03-11T10:00:00Z" },
];

// ─── Rooms ───────────────────────────────────────────────────
export const demoRooms: Room[] = Array.from({ length: 20 }, (_, i) => ({
  id: `rm-${String(i + 1).padStart(3, "0")}`,
  property_id: i < 8 ? "pr-001" : i < 14 ? "pr-002" : "pr-003",
  property_name: i < 8 ? "Grand Hyatt Bangkok" : i < 14 ? "Siam Kempinski Bangkok" : "Centara Grand",
  room_number: `${Math.floor(i / 4 + 1)}${String((i % 4) + 1).padStart(2, "0")}`,
  floor: String(Math.floor(i / 4 + 1)),
  zone: i % 3 === 0 ? "Tower A" : i % 3 === 1 ? "Tower B" : "Main Wing",
  room_type: i % 5 === 0 ? "Suite" : i % 3 === 0 ? "Deluxe" : "Standard",
  template_id: i < 15 ? `tpl-${(i % 3) + 1}` : undefined,
  template_name: i < 15 ? ["Basic", "VIP", "Premium"][i % 3] : undefined,
  status: i === 18 ? "maintenance" : "active",
  created_at: "2026-01-15T08:00:00Z",
  updated_at: "2026-03-10T10:00:00Z",
}));

// ─── Service Providers ───────────────────────────────────────
export const demoProviders: ServiceProvider[] = [
  { id: "sp-001", name: "Thai Wellness Spa Co.", email: "ops@thaiwellness.com", phone: "+66-2-111-2222", category: "Spa & Wellness", service_area: "Bangkok", contact_person: "Siriwan T.", rating: 4.8, catalog_items_count: 12, status: "active", created_at: "2025-12-01T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "sp-002", name: "Royal Thai Cuisine", email: "chef@royalthai.com", phone: "+66-2-333-4444", category: "Food & Beverage", service_area: "Bangkok", contact_person: "Kittisak P.", rating: 4.6, catalog_items_count: 24, status: "active", created_at: "2025-12-15T08:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  { id: "sp-003", name: "Bangkok Limousine Service", email: "booking@bkklimo.com", phone: "+66-2-555-6666", category: "Transportation", service_area: "Bangkok Metropolitan", contact_person: "Naphat W.", rating: 4.5, catalog_items_count: 8, status: "active", created_at: "2026-01-05T08:00:00Z", updated_at: "2026-03-10T10:00:00Z" },
  { id: "sp-004", name: "Siam Laundry Express", email: "service@siamlaundry.com", phone: "+66-2-777-8888", category: "Laundry", service_area: "Bangkok", contact_person: "Pranee S.", rating: 4.3, catalog_items_count: 6, status: "active", created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
  { id: "sp-005", name: "Concierge Plus", email: "hello@conciergeplus.com", phone: "+66-2-999-0000", category: "Concierge", service_area: "Bangkok", contact_person: "Araya M.", rating: 4.9, catalog_items_count: 15, status: "active", created_at: "2026-02-01T08:00:00Z", updated_at: "2026-03-08T10:00:00Z" },
];

// ─── Service Catalog ─────────────────────────────────────────
export const demoCatalogItems: CatalogItem[] = [
  { id: "ci-001", provider_id: "sp-001", provider_name: "Thai Wellness Spa Co.", name: "Traditional Thai Massage", description: "60-minute full body Thai massage", sku: "SPA-THM-60", category: "Spa & Wellness", price: 2500, currency: "THB", unit: "session", duration_minutes: 60, status: "active", created_at: "2025-12-05T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "ci-002", provider_id: "sp-001", provider_name: "Thai Wellness Spa Co.", name: "Aromatherapy Oil Massage", description: "90-minute aromatherapy massage", sku: "SPA-AOM-90", category: "Spa & Wellness", price: 3500, currency: "THB", unit: "session", duration_minutes: 90, status: "active", created_at: "2025-12-05T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "ci-003", provider_id: "sp-002", provider_name: "Royal Thai Cuisine", name: "In-Room Breakfast Set", description: "Thai/Western breakfast delivered to room", sku: "FB-BRK-SET", category: "Food & Beverage", price: 890, currency: "THB", unit: "set", status: "active", created_at: "2025-12-20T08:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  { id: "ci-004", provider_id: "sp-002", provider_name: "Royal Thai Cuisine", name: "Afternoon Tea Set", description: "Premium afternoon tea for two", sku: "FB-TEA-PR2", category: "Food & Beverage", price: 1500, currency: "THB", unit: "set", status: "active", created_at: "2025-12-20T08:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  { id: "ci-005", provider_id: "sp-003", provider_name: "Bangkok Limousine Service", name: "Airport Transfer (Sedan)", description: "One-way airport transfer in luxury sedan", sku: "TRN-APT-SD", category: "Transportation", price: 1800, currency: "THB", unit: "trip", duration_minutes: 60, status: "active", created_at: "2026-01-10T08:00:00Z", updated_at: "2026-03-10T10:00:00Z" },
  { id: "ci-006", provider_id: "sp-004", provider_name: "Siam Laundry Express", name: "Express Laundry (5 items)", description: "Same-day laundry service for up to 5 items", sku: "LND-EXP-05", category: "Laundry", price: 450, currency: "THB", unit: "batch", status: "active", created_at: "2026-01-25T08:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
  { id: "ci-007", provider_id: "sp-005", provider_name: "Concierge Plus", name: "Restaurant Reservation", description: "Table booking at premium restaurants", sku: "CON-RSV-01", category: "Concierge", price: 0, currency: "THB", unit: "booking", status: "active", created_at: "2026-02-05T08:00:00Z", updated_at: "2026-03-08T10:00:00Z" },
  { id: "ci-008", provider_id: "sp-005", provider_name: "Concierge Plus", name: "City Tour (Half Day)", description: "4-hour guided Bangkok city tour", sku: "CON-TUR-HD", category: "Concierge", price: 3200, currency: "THB", unit: "person", duration_minutes: 240, status: "active", created_at: "2026-02-05T08:00:00Z", updated_at: "2026-03-08T10:00:00Z" },
];

// ─── Service Templates ───────────────────────────────────────
export const demoTemplates: ServiceTemplate[] = [
  { id: "tpl-001", name: "Basic Comfort", description: "Essential services for standard rooms", tier: "basic", status: "active", items: [
    { id: "ti-001", catalog_item_id: "ci-003", catalog_item_name: "In-Room Breakfast Set", provider_name: "Royal Thai Cuisine", price: 890, currency: "THB", sort_order: 1 },
    { id: "ti-002", catalog_item_id: "ci-006", catalog_item_name: "Express Laundry (5 items)", provider_name: "Siam Laundry Express", price: 450, currency: "THB", sort_order: 2 },
  ], assigned_rooms_count: 120, total_price: 1340, created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "tpl-002", name: "VIP Experience", description: "Premium services for deluxe and suite rooms", tier: "vip", status: "active", items: [
    { id: "ti-003", catalog_item_id: "ci-001", catalog_item_name: "Traditional Thai Massage", provider_name: "Thai Wellness Spa Co.", price: 2500, currency: "THB", sort_order: 1 },
    { id: "ti-004", catalog_item_id: "ci-003", catalog_item_name: "In-Room Breakfast Set", provider_name: "Royal Thai Cuisine", price: 890, currency: "THB", sort_order: 2 },
    { id: "ti-005", catalog_item_id: "ci-005", catalog_item_name: "Airport Transfer (Sedan)", provider_name: "Bangkok Limousine Service", price: 1800, currency: "THB", sort_order: 3 },
    { id: "ti-006", catalog_item_id: "ci-007", catalog_item_name: "Restaurant Reservation", provider_name: "Concierge Plus", price: 0, currency: "THB", sort_order: 4 },
  ], assigned_rooms_count: 80, total_price: 5190, created_at: "2026-01-25T08:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
  { id: "tpl-003", name: "Premium Suite", description: "Full-service package for presidential suites", tier: "premium", status: "active", items: [
    { id: "ti-007", catalog_item_id: "ci-002", catalog_item_name: "Aromatherapy Oil Massage", provider_name: "Thai Wellness Spa Co.", price: 3500, currency: "THB", sort_order: 1 },
    { id: "ti-008", catalog_item_id: "ci-004", catalog_item_name: "Afternoon Tea Set", provider_name: "Royal Thai Cuisine", price: 1500, currency: "THB", sort_order: 2 },
    { id: "ti-009", catalog_item_id: "ci-005", catalog_item_name: "Airport Transfer (Sedan)", provider_name: "Bangkok Limousine Service", price: 1800, currency: "THB", sort_order: 3 },
    { id: "ti-010", catalog_item_id: "ci-008", catalog_item_name: "City Tour (Half Day)", provider_name: "Concierge Plus", price: 3200, currency: "THB", sort_order: 4 },
    { id: "ti-011", catalog_item_id: "ci-006", catalog_item_name: "Express Laundry (5 items)", provider_name: "Siam Laundry Express", price: 450, currency: "THB", sort_order: 5 },
  ], assigned_rooms_count: 24, total_price: 10450, created_at: "2026-02-01T08:00:00Z", updated_at: "2026-03-08T10:00:00Z" },
];

// ─── QR Codes ────────────────────────────────────────────────
export const demoQRCodes: QRCode[] = [
  { id: "qr-001", property_id: "pr-001", room_id: "rm-001", room_number: "1201", property_name: "Grand Hyatt Bangkok", qr_code_id: "PA-QR-20260301-a1b2c3d4", access_type: "public", status: "active", last_scanned: "2026-03-12T06:00:00Z", scan_count: 42, created_at: "2026-03-01T08:00:00Z", updated_at: "2026-03-12T06:00:00Z" },
  { id: "qr-002", property_id: "pr-001", room_id: "rm-002", room_number: "1202", property_name: "Grand Hyatt Bangkok", qr_code_id: "PA-QR-20260301-e5f6g7h8", access_type: "public", status: "active", last_scanned: "2026-03-12T05:00:00Z", scan_count: 38, created_at: "2026-03-01T08:00:00Z", updated_at: "2026-03-12T05:00:00Z" },
  { id: "qr-003", property_id: "pr-001", room_id: "rm-003", room_number: "1203", property_name: "Grand Hyatt Bangkok", qr_code_id: "PA-QR-20260301-i9j0k1l2", access_type: "restricted", status: "active", last_scanned: "2026-03-12T04:00:00Z", scan_count: 15, created_at: "2026-03-01T08:00:00Z", updated_at: "2026-03-12T04:00:00Z" },
  { id: "qr-004", property_id: "pr-002", room_id: "rm-009", room_number: "1301", property_name: "Siam Kempinski Bangkok", qr_code_id: "PA-QR-20260305-m3n4o5p6", access_type: "restricted", status: "active", scan_count: 0, created_at: "2026-03-05T08:00:00Z", updated_at: "2026-03-05T08:00:00Z" },
  { id: "qr-005", property_id: "pr-002", room_id: "rm-010", room_number: "1302", property_name: "Siam Kempinski Bangkok", qr_code_id: "PA-QR-20260305-q7r8s9t0", access_type: "public", status: "suspended", last_scanned: "2026-03-09T10:00:00Z", scan_count: 22, created_at: "2026-03-05T08:00:00Z", updated_at: "2026-03-09T10:00:00Z" },
  { id: "qr-006", property_id: "pr-003", room_id: "rm-015", room_number: "P-01", property_name: "Centara Grand", qr_code_id: "PA-QR-20260310-u1v2w3x4", access_type: "public", status: "active", last_scanned: "2026-03-12T05:30:00Z", scan_count: 8, created_at: "2026-03-10T08:00:00Z", updated_at: "2026-03-12T05:30:00Z" },
];

// ─── Guest Sessions ──────────────────────────────────────────
export const demoSessions: GuestSession[] = [
  { id: "gs-001", qr_code_id: "PA-QR-20260301-a1b2c3d4", room_number: "1201", property_name: "Grand Hyatt Bangkok", status: "active", started_at: "2026-03-12T02:00:00Z", expires_at: "2026-03-13T12:00:00Z", request_count: 3 },
  { id: "gs-002", qr_code_id: "PA-QR-20260301-e5f6g7h8", room_number: "1202", property_name: "Grand Hyatt Bangkok", status: "active", started_at: "2026-03-11T14:00:00Z", expires_at: "2026-03-13T12:00:00Z", request_count: 1 },
  { id: "gs-003", qr_code_id: "PA-QR-20260305-m3n4o5p6", room_number: "1301", property_name: "Siam Kempinski Bangkok", status: "active", started_at: "2026-03-12T04:00:00Z", expires_at: "2026-03-14T12:00:00Z", request_count: 2 },
  { id: "gs-004", qr_code_id: "PA-QR-20260310-u1v2w3x4", room_number: "P-01", property_name: "Centara Grand", status: "active", started_at: "2026-03-12T05:30:00Z", expires_at: "2026-03-13T12:00:00Z", request_count: 0 },
];

// ─── Service Requests ────────────────────────────────────────
export const demoRequests: ServiceRequest[] = [
  { id: "sr-001", request_number: "REQ-20260312-001", session_id: "gs-001", room_number: "1201", property_name: "Grand Hyatt Bangkok", catalog_item_id: "ci-001", catalog_item_name: "Traditional Thai Massage", provider_name: "Thai Wellness Spa Co.", quantity: 1, total_price: 2500, currency: "THB", status: "confirmed", created_at: "2026-03-12T03:00:00Z", updated_at: "2026-03-12T03:15:00Z", confirmed_at: "2026-03-12T03:15:00Z" },
  { id: "sr-002", request_number: "REQ-20260312-002", session_id: "gs-001", room_number: "1201", property_name: "Grand Hyatt Bangkok", catalog_item_id: "ci-003", catalog_item_name: "In-Room Breakfast Set", provider_name: "Royal Thai Cuisine", quantity: 2, total_price: 1780, currency: "THB", status: "in_progress", created_at: "2026-03-12T04:00:00Z", updated_at: "2026-03-12T04:10:00Z", confirmed_at: "2026-03-12T04:05:00Z" },
  { id: "sr-003", request_number: "REQ-20260312-003", session_id: "gs-001", room_number: "1201", property_name: "Grand Hyatt Bangkok", catalog_item_id: "ci-006", catalog_item_name: "Express Laundry (5 items)", provider_name: "Siam Laundry Express", quantity: 1, total_price: 450, currency: "THB", notes: "Please pick up from room", status: "pending", created_at: "2026-03-12T05:30:00Z", updated_at: "2026-03-12T05:30:00Z" },
  { id: "sr-004", request_number: "REQ-20260312-004", session_id: "gs-002", room_number: "1202", property_name: "Grand Hyatt Bangkok", catalog_item_id: "ci-005", catalog_item_name: "Airport Transfer (Sedan)", provider_name: "Bangkok Limousine Service", quantity: 1, total_price: 1800, currency: "THB", notes: "Flight at 18:00, pickup at 14:00", status: "confirmed", created_at: "2026-03-12T02:00:00Z", updated_at: "2026-03-12T02:20:00Z", confirmed_at: "2026-03-12T02:20:00Z" },
  { id: "sr-005", request_number: "REQ-20260312-005", session_id: "gs-003", room_number: "1301", property_name: "Siam Kempinski Bangkok", catalog_item_id: "ci-002", catalog_item_name: "Aromatherapy Oil Massage", provider_name: "Thai Wellness Spa Co.", quantity: 2, total_price: 7000, currency: "THB", status: "completed", created_at: "2026-03-12T01:00:00Z", updated_at: "2026-03-12T04:00:00Z", confirmed_at: "2026-03-12T01:15:00Z", completed_at: "2026-03-12T04:00:00Z" },
  { id: "sr-006", request_number: "REQ-20260312-006", session_id: "gs-003", room_number: "1301", property_name: "Siam Kempinski Bangkok", catalog_item_id: "ci-004", catalog_item_name: "Afternoon Tea Set", provider_name: "Royal Thai Cuisine", quantity: 1, total_price: 1500, currency: "THB", status: "rejected", notes: "Not available today", created_at: "2026-03-12T03:00:00Z", updated_at: "2026-03-12T03:30:00Z" },
];

// ─── Users ───────────────────────────────────────────────────
export const demoUsers: User[] = [
  { id: "u-001", email: "admin@peppraround.com", name: "Platform Admin", role: "SYSTEM_ADMIN", status: "active", created_at: "2025-11-01T08:00:00Z", updated_at: "2026-03-12T06:00:00Z" },
  { id: "u-002", email: "somchai@grandhyatt.com", name: "Somchai T.", role: "PARTNER_ADMIN", status: "active", partner_id: "p-001", created_at: "2025-11-15T08:00:00Z", updated_at: "2026-03-01T10:00:00Z" },
  { id: "u-003", email: "nattapong@siamkempinski.com", name: "Nattapong K.", role: "PARTNER_ADMIN", status: "active", partner_id: "p-002", created_at: "2025-12-01T08:00:00Z", updated_at: "2026-02-28T10:00:00Z" },
  { id: "u-004", email: "siriwan@grandhyatt.com", name: "Siriwan T.", role: "PROPERTY_ADMIN", status: "active", partner_id: "p-001", property_ids: ["pr-001"], created_at: "2025-12-10T08:00:00Z", updated_at: "2026-03-10T10:00:00Z" },
  { id: "u-005", email: "kittisak@grandhyatt.com", name: "Kittisak P.", role: "STAFF", status: "active", partner_id: "p-001", property_ids: ["pr-001"], created_at: "2026-01-05T08:00:00Z", updated_at: "2026-03-05T10:00:00Z" },
  { id: "u-006", email: "naphat@siamkempinski.com", name: "Naphat W.", role: "STAFF", status: "active", partner_id: "p-002", property_ids: ["pr-002"], created_at: "2026-01-20T08:00:00Z", updated_at: "2026-03-08T10:00:00Z" },
  { id: "u-007", email: "wipada@centara.com", name: "Wipada S.", role: "PARTNER_ADMIN", status: "active", partner_id: "p-003", created_at: "2026-01-10T08:00:00Z", updated_at: "2026-03-10T10:00:00Z" },
];

// ─── Staff ───────────────────────────────────────────────────
export const demoPositions: StaffPosition[] = [
  { id: "pos-001", title: "Front Desk Agent", department: "Front Office", members_count: 8, created_at: "2025-12-01T08:00:00Z" },
  { id: "pos-002", title: "Concierge", department: "Front Office", members_count: 4, created_at: "2025-12-01T08:00:00Z" },
  { id: "pos-003", title: "Housekeeping Supervisor", department: "Housekeeping", members_count: 3, created_at: "2025-12-15T08:00:00Z" },
  { id: "pos-004", title: "F&B Manager", department: "Food & Beverage", members_count: 2, created_at: "2026-01-05T08:00:00Z" },
  { id: "pos-005", title: "Spa Coordinator", department: "Spa & Wellness", members_count: 2, created_at: "2026-01-20T08:00:00Z" },
];

export const demoMembers: StaffMember[] = [
  { id: "sm-001", user_id: "u-004", name: "Siriwan T.", email: "siriwan@grandhyatt.com", position_id: "pos-001", position_title: "Front Desk Agent", property_id: "pr-001", property_name: "Grand Hyatt Bangkok", status: "active", created_at: "2025-12-10T08:00:00Z" },
  { id: "sm-002", user_id: "u-005", name: "Kittisak P.", email: "kittisak@grandhyatt.com", position_id: "pos-001", position_title: "Front Desk Agent", property_id: "pr-001", property_name: "Grand Hyatt Bangkok", status: "active", created_at: "2026-01-05T08:00:00Z" },
  { id: "sm-003", user_id: "u-006", name: "Naphat W.", email: "naphat@siamkempinski.com", position_id: "pos-002", position_title: "Concierge", property_id: "pr-002", property_name: "Siam Kempinski Bangkok", status: "active", created_at: "2026-01-20T08:00:00Z" },
];

// ─── Paginated exports ──────────────────────────────────────
export const getDemoPartners = (p?: number, ps?: number) => paginate(demoPartners, p, ps);
export const getDemoProperties = (p?: number, ps?: number) => paginate(demoProperties, p, ps);
export const getDemoRooms = (p?: number, ps?: number) => paginate(demoRooms, p, ps);
export const getDemoProviders = (p?: number, ps?: number) => paginate(demoProviders, p, ps);
export const getDemoCatalog = (p?: number, ps?: number) => paginate(demoCatalogItems, p, ps);
export const getDemoTemplates = (p?: number, ps?: number) => paginate(demoTemplates, p, ps);
export const getDemoQRCodes = (p?: number, ps?: number) => paginate(demoQRCodes, p, ps);
export const getDemoSessions = (p?: number, ps?: number) => paginate(demoSessions, p, ps);
export const getDemoRequests = (p?: number, ps?: number) => paginate(demoRequests, p, ps);
export const getDemoUsers = (p?: number, ps?: number) => paginate(demoUsers, p, ps);
export const getDemoPositions = (p?: number, ps?: number) => paginate(demoPositions, p, ps);
export const getDemoMembers = (p?: number, ps?: number) => paginate(demoMembers, p, ps);
