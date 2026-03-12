/**
 * API Types — Shared TypeScript interfaces for all domain models.
 *
 * Intent: Single source of truth for frontend data shapes.
 * These mirror the Pydantic schemas from the FastAPI backend.
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
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
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
  template_id?: string;
  template_name?: string;
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

// ─── Menu (Guest-facing) ────────────────────────────────────
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
