/**
 * API Endpoints — Typed HTTP functions for every backend route.
 *
 * Intent: Pure transport layer. No caching, no state, no side effects.
 * Each function maps 1:1 to a FastAPI endpoint.
 * TanStack Query hooks in /hooks/ wrap these for caching and reactivity.
 */
import api from "./client";
import type {
  CatalogItem,
  CatalogItemCreate,
  CatalogItemUpdate,
  GuestSession,
  LoginRequest,
  LoginResponse,
  MenuCategory,
  PaginatedResponse,
  PaginationParams,
  Partner,
  PartnerCreate,
  PartnerUpdate,
  Property,
  PropertyCreate,
  PropertyUpdate,
  QRCode,
  QRGenerateRequest,
  Room,
  RoomBulkCreate,
  RoomCreate,
  RoomUpdate,
  ServiceProvider,
  ServiceProviderCreate,
  ServiceProviderUpdate,
  ServiceRequest,
  ServiceRequestCreate,
  ServiceTemplate,
  ServiceTemplateCreate,
  ServiceTemplateUpdate,
  StaffMember,
  StaffPosition,
  User,
  UserProfile,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────
function toSearchParams(params: PaginationParams): URLSearchParams {
  const sp = new URLSearchParams();
  if (params.page) sp.set("page", String(params.page));
  if (params.page_size) sp.set("page_size", String(params.page_size));
  if (params.search) sp.set("search", params.search);
  if (params.sort_by) sp.set("sort_by", params.sort_by);
  if (params.sort_order) sp.set("sort_order", params.sort_order);
  return sp;
}

// ─── Auth ────────────────────────────────────────────────────
export const authApi = {
  login: (data: LoginRequest) =>
    api.post("v1/auth/login", { json: data }).json<LoginResponse>(),
  me: () => api.get("v1/auth/me").json<UserProfile>(),
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post("v1/auth/change-password", { json: data }).json<void>(),
  refreshToken: () => api.post("v1/auth/session").json<LoginResponse>(),
};

// ─── Partners ────────────────────────────────────────────────
export const partnersApi = {
  list: (params: PaginationParams = {}) =>
    api.get("v1/partners", { searchParams: toSearchParams(params) }).json<PaginatedResponse<Partner>>(),
  get: (id: string) =>
    api.get(`v1/partners/${id}`).json<Partner>(),
  create: (data: PartnerCreate) =>
    api.post("v1/partners", { json: data }).json<Partner>(),
  update: (id: string, data: PartnerUpdate) =>
    api.put(`v1/partners/${id}`, { json: data }).json<Partner>(),
  deactivate: (id: string) =>
    api.post(`v1/partners/${id}/deactivate`).json<Partner>(),
};

// ─── Properties ──────────────────────────────────────────────
export const propertiesApi = {
  list: (params: PaginationParams & { partner_id?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.partner_id) sp.set("partner_id", params.partner_id);
    return api.get("v1/properties", { searchParams: sp }).json<PaginatedResponse<Property>>();
  },
  get: (id: string) =>
    api.get(`v1/properties/${id}`).json<Property>(),
  create: (data: PropertyCreate) =>
    api.post("v1/properties", { json: data }).json<Property>(),
  update: (id: string, data: PropertyUpdate) =>
    api.put(`v1/properties/${id}`, { json: data }).json<Property>(),
  updateConfig: (id: string, config: Record<string, unknown>) =>
    api.put(`v1/properties/${id}/config`, { json: config }).json<Property>(),
  deactivate: (id: string) =>
    api.post(`v1/properties/${id}/deactivate`).json<Property>(),
};

// ─── Rooms ───────────────────────────────────────────────────
export const roomsApi = {
  list: (params: PaginationParams & { property_id?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.property_id) sp.set("property_id", params.property_id);
    return api.get("v1/rooms", { searchParams: sp }).json<PaginatedResponse<Room>>();
  },
  get: (id: string) =>
    api.get(`v1/rooms/${id}`).json<Room>(),
  create: (data: RoomCreate) =>
    api.post("v1/rooms", { json: data }).json<Room>(),
  bulkCreate: (data: RoomBulkCreate) =>
    api.post("v1/rooms/bulk", { json: data }).json<Room[]>(),
  update: (id: string, data: RoomUpdate) =>
    api.put(`v1/rooms/${id}`, { json: data }).json<Room>(),
  assignTemplate: (roomId: string, templateId: string) =>
    api.post(`v1/rooms/${roomId}/template`, { json: { template_id: templateId } }).json<Room>(),
  bulkAssignTemplate: (data: { room_ids: string[]; template_id: string }) =>
    api.post("v1/rooms/bulk-assign-template", { json: data }).json<void>(),
  removeTemplate: (roomId: string) =>
    api.delete(`v1/rooms/${roomId}/template`).json<Room>(),
};

// ─── Service Providers ───────────────────────────────────────
export const providersApi = {
  list: (params: PaginationParams = {}) =>
    api.get("v1/providers", { searchParams: toSearchParams(params) }).json<PaginatedResponse<ServiceProvider>>(),
  get: (id: string) =>
    api.get(`v1/providers/${id}`).json<ServiceProvider>(),
  create: (data: ServiceProviderCreate) =>
    api.post("v1/providers", { json: data }).json<ServiceProvider>(),
  update: (id: string, data: ServiceProviderUpdate) =>
    api.put(`v1/providers/${id}`, { json: data }).json<ServiceProvider>(),
  deactivate: (id: string) =>
    api.post(`v1/providers/${id}/deactivate`).json<ServiceProvider>(),
};

// ─── Service Catalog ─────────────────────────────────────────
export const catalogApi = {
  list: (params: PaginationParams & { provider_id?: string; category?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.provider_id) sp.set("provider_id", params.provider_id);
    if (params.category) sp.set("category", params.category);
    return api.get("v1/catalog", { searchParams: sp }).json<PaginatedResponse<CatalogItem>>();
  },
  get: (id: string) =>
    api.get(`v1/catalog/${id}`).json<CatalogItem>(),
  create: (data: CatalogItemCreate) =>
    api.post("v1/catalog", { json: data }).json<CatalogItem>(),
  update: (id: string, data: CatalogItemUpdate) =>
    api.put(`v1/catalog/${id}`, { json: data }).json<CatalogItem>(),
};

// ─── Service Templates ───────────────────────────────────────
export const templatesApi = {
  list: (params: PaginationParams = {}) =>
    api.get("v1/templates", { searchParams: toSearchParams(params) }).json<PaginatedResponse<ServiceTemplate>>(),
  get: (id: string) =>
    api.get(`v1/templates/${id}`).json<ServiceTemplate>(),
  create: (data: ServiceTemplateCreate) =>
    api.post("v1/templates", { json: data }).json<ServiceTemplate>(),
  update: (id: string, data: ServiceTemplateUpdate) =>
    api.put(`v1/templates/${id}`, { json: data }).json<ServiceTemplate>(),
  addItem: (templateId: string, catalogItemId: string) =>
    api.post(`v1/templates/${templateId}/items`, { json: { catalog_item_id: catalogItemId } }).json<ServiceTemplate>(),
  removeItem: (templateId: string, itemId: string) =>
    api.delete(`v1/templates/${templateId}/items/${itemId}`).json<ServiceTemplate>(),
};

// ─── Template Assignments ────────────────────────────────────
export const assignmentsApi = {
  listByRoom: (roomId: string) =>
    api.get(`v1/assignments/room/${roomId}`).json<{ template_id: string; template_name: string }[]>(),
  listByTemplate: (templateId: string, params: PaginationParams = {}) =>
    api.get(`v1/assignments/template/${templateId}`, { searchParams: toSearchParams(params) }).json<PaginatedResponse<Room>>(),
  assign: (data: { room_id: string; template_id: string }) =>
    api.post("v1/assignments", { json: data }).json<void>(),
  bulkAssign: (data: { room_ids: string[]; template_id: string }) =>
    api.post("v1/assignments/bulk", { json: data }).json<{ assigned: number; skipped: number }>(),
  remove: (roomId: string, templateId: string) =>
    api.delete(`v1/assignments/${roomId}/${templateId}`).json<void>(),
};

// ─── QR Codes ────────────────────────────────────────────────
export const qrApi = {
  list: (propertyId: string, params: PaginationParams & { status?: string; access_type?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.status) sp.set("status", params.status);
    if (params.access_type) sp.set("access_type", params.access_type);
    return api.get(`v1/properties/${propertyId}/qr`, { searchParams: sp }).json<PaginatedResponse<QRCode>>();
  },
  get: (propertyId: string, qrCodeId: string) =>
    api.get(`v1/properties/${propertyId}/qr/${qrCodeId}`).json<QRCode>(),
  generate: (data: QRGenerateRequest) =>
    api.post(`v1/properties/${data.property_id}/qr/generate`, { json: { room_ids: data.room_ids, access_type: data.access_type } }).json<QRCode[]>(),
  updateAccessType: (propertyId: string, qrCodeId: string, accessType: "public" | "restricted") =>
    api.put(`v1/properties/${propertyId}/qr/${qrCodeId}/access-type`, { json: { access_type: accessType } }).json<QRCode>(),
  activate: (propertyId: string, qrCodeId: string) =>
    api.post(`v1/properties/${propertyId}/qr/${qrCodeId}/activate`).json<QRCode>(),
  deactivate: (propertyId: string, qrCodeId: string) =>
    api.post(`v1/properties/${propertyId}/qr/${qrCodeId}/deactivate`).json<QRCode>(),
  suspend: (propertyId: string, qrCodeId: string) =>
    api.post(`v1/properties/${propertyId}/qr/${qrCodeId}/suspend`).json<QRCode>(),
};

// ─── Front Office ────────────────────────────────────────────
export const frontOfficeApi = {
  sessions: (propertyId: string, params: PaginationParams = {}) =>
    api.get(`v1/front-office/${propertyId}/sessions`, { searchParams: toSearchParams(params) }).json<PaginatedResponse<GuestSession>>(),
  requests: (propertyId: string, params: PaginationParams & { status?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.status) sp.set("status", params.status);
    return api.get(`v1/front-office/${propertyId}/requests`, { searchParams: sp }).json<PaginatedResponse<ServiceRequest>>();
  },
  getRequest: (requestId: string) =>
    api.get(`v1/front-office/requests/${requestId}`).json<ServiceRequest>(),
  updateRequestStatus: (requestId: string, status: string, reason?: string) =>
    api.put(`v1/front-office/requests/${requestId}/status`, { json: { status, ...(reason ? { reason } : {}) } }).json<ServiceRequest>(),
};

// ─── Guest (Public) ──────────────────────────────────────────
export const guestApi = {
  createSession: (qrCodeId: string) =>
    api.post("public/guest/sessions", { json: { qr_code_id: qrCodeId } }).json<GuestSession>(),
  getSession: (sessionId: string) =>
    api.get(`public/guest/sessions/${sessionId}`).json<GuestSession>(),
  validateSession: (sessionId: string) =>
    api.get(`public/guest/sessions/${sessionId}/validate`).json<{ valid: boolean }>(),
  getMenu: (sessionId: string) =>
    api.get(`public/guest/sessions/${sessionId}/menu`).json<MenuCategory[]>(),
  submitRequest: (sessionId: string, data: ServiceRequestCreate) =>
    api.post(`public/guest/sessions/${sessionId}/requests`, { json: data }).json<ServiceRequest>(),
  listRequests: (sessionId: string) =>
    api.get(`public/guest/sessions/${sessionId}/requests`).json<ServiceRequest[]>(),
  trackRequest: (requestNumber: string) =>
    api.get(`public/guest/requests/${requestNumber}`).json<ServiceRequest>(),
};

// ─── Users ───────────────────────────────────────────────────
export const usersApi = {
  list: (params: PaginationParams & { role?: string; status?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.role) sp.set("role", params.role);
    if (params.status) sp.set("status", params.status);
    return api.get("v1/users", { searchParams: sp }).json<PaginatedResponse<User>>();
  },
  get: (id: string) =>
    api.get(`v1/users/${id}`).json<User>(),
  invite: (data: { email: string; name: string; role: string; partner_id?: string; property_ids?: string[] }) =>
    api.post("v1/users/invite", { json: data }).json<User>(),
  update: (id: string, data: Partial<User>) =>
    api.put(`v1/users/${id}`, { json: data }).json<User>(),
  deactivate: (id: string) =>
    api.post(`v1/users/${id}/deactivate`).json<User>(),
  reactivate: (id: string) =>
    api.post(`v1/users/${id}/reactivate`).json<User>(),
};

// ─── Staff ───────────────────────────────────────────────────
export const staffApi = {
  listPositions: (params: PaginationParams = {}) =>
    api.get("v1/staff/positions", { searchParams: toSearchParams(params) }).json<PaginatedResponse<StaffPosition>>(),
  createPosition: (data: { title: string; department: string; property_id?: string }) =>
    api.post("v1/staff/positions", { json: data }).json<StaffPosition>(),
  updatePosition: (id: string, data: { title?: string; department?: string }) =>
    api.put(`v1/staff/positions/${id}`, { json: data }).json<StaffPosition>(),
  listMembers: (params: PaginationParams & { position_id?: string; property_id?: string } = {}) => {
    const sp = toSearchParams(params);
    if (params.position_id) sp.set("position_id", params.position_id);
    if (params.property_id) sp.set("property_id", params.property_id);
    return api.get("v1/staff/members", { searchParams: sp }).json<PaginatedResponse<StaffMember>>();
  },
  assignMember: (data: { user_id: string; position_id: string; property_id: string }) =>
    api.post("v1/staff/members", { json: data }).json<StaffMember>(),
  updateMember: (id: string, data: { position_id?: string; status?: string }) =>
    api.put(`v1/staff/members/${id}`, { json: data }).json<StaffMember>(),
};
