/**
 * API Types — Shared TypeScript interfaces for all domain models.
 *
 * Intent: Single source of truth for frontend data shapes.
 * TypeScript types for the Peppr Around backend API.
 * Every API hook and page component imports types from here.
 */

// ─── Common ──────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface ApiError {
  detail: string;
  code?: string;
}

// ─── Auth ────────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
  ip?: string;
  user_agent?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginResponse {
  success: boolean;
  tokens: TokenResponse;
  user: UserProfile;
}

/** Matches Peppr UserProfile schema */
export interface UserProfile {
  user_id: string;
  email: string;
  full_name: string;
  mobile?: string | null;
  role?: string | null;
  partner_id?: string | null;
  property_id?: string | null;
  email_verified?: boolean;
  status?: string;
  twofa_enabled?: boolean;
  roles?: string[];
  last_login_at?: string | null;
  created_at?: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  partner_id?: string;
  property_ids?: string[];
  last_login?: string;
  created_at: string;
  updated_at: string;
}

// ─── Partners ────────────────────────────────────────────────
export interface Partner {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  status: "active" | "inactive" | "pending";
  properties_count: number;
  created_at: string;
  updated_at: string;
}

export interface PartnerCreate {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  contact_person?: string;
}

export interface PartnerUpdate extends Partial<PartnerCreate> {
  status?: "active" | "inactive" | "pending";
}

// ─── Properties ──────────────────────────────────────────────
export interface Property {
  id: string;
  partner_id: string;
  partner_name?: string;
  name: string;
  type: string;
  address: string;
  city: string;
  country: string;
  timezone: string;
  currency: string;
  phone?: string;
  email?: string;
  rooms_count: number;
  active_qr_count: number;
  status: "active" | "inactive" | "pending";
  config?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PropertyCreate {
  partner_id: string;
  name: string;
  type: string;
  address: string;
  city: string;
  country: string;
  timezone?: string;
  currency?: string;
  phone?: string;
  email?: string;
}

export interface PropertyUpdate extends Partial<PropertyCreate> {
  status?: "active" | "inactive" | "pending";
}

// ─── Rooms ───────────────────────────────────────────────────
export interface Room {
  id: string;
  property_id: string;
  property_name?: string;
  room_number: string;
  floor?: string;
  zone?: string;
  room_type: string;
  template_id?: string | null;
  template_name?: string | null;
  template_item_count?: number | null;
  qr_code_id?: string;
  status: "active" | "inactive" | "maintenance";
  created_at: string;
  updated_at: string;
}

export interface RoomCreate {
  property_id: string;
  room_number: string;
  floor?: string;
  zone?: string;
  room_type: string;
}

export interface RoomBulkCreate {
  property_id: string;
  rooms: RoomCreate[];
}

export interface RoomUpdate extends Partial<RoomCreate> {
  status?: "active" | "inactive" | "maintenance";
}

// ─── Service Providers ───────────────────────────────────────
export interface ServiceProvider {
  id: string;
  name: string;
  email: string;
  phone?: string;
  category: string;
  service_area: string;
  contact_person?: string;
  rating?: number;
  catalog_items_count: number;
  status: "active" | "inactive" | "pending";
  created_at: string;
  updated_at: string;
}

export interface ServiceProviderCreate {
  name: string;
  email: string;
  phone?: string;
  category: string;
  service_area: string;
  contact_person?: string;
}

export interface ServiceProviderUpdate extends Partial<ServiceProviderCreate> {
  status?: "active" | "inactive" | "pending";
}

// ─── Service Catalog ─────────────────────────────────────────
export interface CatalogItem {
  id: string;
  provider_id: string;
  provider_name?: string;
  name: string;
  description?: string;
  sku: string;
  category: string;
  price: number;
  currency: string;
  unit: string;
  duration_minutes?: number;
  terms?: string;
  status: "active" | "inactive" | "draft";
  created_at: string;
  updated_at: string;
}

export interface CatalogItemCreate {
  provider_id: string;
  name: string;
  description?: string;
  sku: string;
  category: string;
  price: number;
  currency?: string;
  unit?: string;
  duration_minutes?: number;
  terms?: string;
}

export interface CatalogItemUpdate extends Partial<CatalogItemCreate> {
  status?: "active" | "inactive" | "draft";
}

// ─── Service Templates ───────────────────────────────────────
export interface ServiceTemplate {
  id: string;
  name: string;
  description?: string;
  tier: string;
  status: "active" | "inactive" | "draft";
  items: TemplateItem[];
  item_count?: number;
  assigned_rooms_count: number;
  total_price: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateItem {
  id: string;
  catalog_item_id: string;
  catalog_item_name: string;
  provider_name: string;
  price: number;
  currency: string;
  sort_order: number;
}

export interface ServiceTemplateCreate {
  name: string;
  description?: string;
  tier: string;
  item_ids?: string[];
}

export interface ServiceTemplateUpdate extends Partial<ServiceTemplateCreate> {
  status?: "active" | "inactive" | "draft";
}

// ─── QR Codes ────────────────────────────────────────────────
export interface QRCode {
  id: string;
  property_id: string;
  room_id: string;
  room_number: string;
  property_name?: string;
  qr_code_id: string;
  access_type: "public" | "restricted";
  status: "active" | "inactive" | "suspended" | "revoked";
  last_scanned?: string;
  scan_count: number;
  image_base64?: string;
  created_at: string;
  updated_at: string;
}

export interface QRGenerateRequest {
  property_id: string;
  room_ids: string[];
  access_type?: "public" | "restricted";
}

// ─── Guest Sessions ──────────────────────────────────────────
export interface GuestSession {
  id: string;
  qr_code_id: string;
  room_number: string;
  property_name?: string;
  status: "active" | "expired" | "checked_out";
  started_at: string;
  expires_at: string;
  request_count: number;
}

// ─── Service Requests ────────────────────────────────────────
export interface ServiceRequest {
  id: string;
  request_number: string;
  session_id: string;
  room_number: string;
  property_name?: string;
  catalog_item_id: string;
  catalog_item_name: string;
  provider_name?: string;
  quantity: number;
  total_price: number;
  currency: string;
  notes?: string;
  status: "pending" | "confirmed" | "rejected" | "in_progress" | "completed" | "cancelled";
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
}

export interface ServiceRequestCreate {
  catalog_item_id: string;
  quantity?: number;
  notes?: string;
}

// ─── Staff ───────────────────────────────────────────────────
export interface StaffPosition {
  id: string;
  title: string;
  department: string;
  property_id?: string;
  members_count: number;
  created_at: string;
}

export interface StaffMember {
  id: string;
  user_id: string;
  name: string;
  email: string;
  position_id: string;
  position_title: string;
  property_id: string;
  property_name: string;
  status: "active" | "inactive" | "on_leave";
  created_at: string;
}

// ─── Menu (Guest-facing) ────────────────────────────────────────
export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  provider_name: string;
  price: number;
  currency: string;
  duration_minutes?: number;
}

// ─── Guest Session (Full API response) ──────────────────────────
export interface GuestSessionFull {
  session_id: string;
  qr_code_id: string;
  property_id: string;
  room_id: string;
  property_name?: string | null;
  room_number?: string | null;
  guest_name?: string | null;
  access_type: string;
  status: "ACTIVE" | "EXPIRED";
  font_size_pref?: "S" | "M" | "L" | "XL" | null;
  created_at: string;
  expires_at: string;
}

// ─── Service Menu (Full API response) ────────────────────────────
export interface ServiceMenuResponse {
  property_id: string;
  room_id: string;
  categories: ServiceMenuCategory[];
  total_items: number;
  templates_applied: string[];
  generated_at: string;
}

export interface ServiceMenuCategory {
  category_name: string;
  display_order: number;
  items: ServiceMenuItem[];
}

export interface ServiceMenuItem {
  item_id: string;
  template_item_id?: string | null;
  item_name: string;
  description?: string | null;
  category: string;
  unit_price: string;
  currency: string;
  included_quantity: number;
  max_quantity: number;
  is_available: boolean;
}

// ─── Guest Request (Full API response) ──────────────────────────
export interface GuestRequestSubmit {
  session_id: string;
  items: RequestItemInput[];
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_notes?: string | null;
  preferred_datetime?: string | null;
}

export interface RequestItemInput {
  item_id: string;
  template_item_id?: string | null;
  quantity?: number;
  guest_notes?: string | null;
}

export interface ServiceRequestFull {
  request_id: string;
  request_number: string;
  session_id: string;
  property_id: string;
  room_id: string;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_notes?: string | null;
  preferred_datetime?: string | null;
  subtotal: string;
  discount_amount: string;
  total_amount: string;
  currency: string;
  status: "PENDING" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "REJECTED";
  status_reason?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  cancelled_at?: string | null;
  items: RequestItemResponse[];
  created_at: string;
  updated_at: string;
}

export interface RequestItemResponse {
  request_item_id: string;
  item_id?: string | null;
  template_item_id?: string | null;
  item_name: string;
  item_category: string;
  unit_price: string;
  quantity: number;
  included_quantity: number;
  billable_quantity: number;
  line_total: string;
  currency: string;
  guest_notes?: string | null;
  status: string;
}

// ─── Property Configuration ──────────────────────────────────────
export interface PropertyConfigUpdate {
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  welcome_message?: string | null;
  qr_validation_limit?: number | null;
  service_catalog_limit?: number | null;
  request_submission_limit?: number | null;
  enable_guest_cancellation?: boolean | null;
  enable_alternative_proposals?: boolean | null;
  enable_direct_messaging?: boolean | null;
}

export interface PropertyConfigResponse extends PropertyConfigUpdate {
  property_id: string;
  updated_at: string;
}