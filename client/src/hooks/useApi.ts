/**
 * API Hooks — Migrated to tRPC for core CRUD entities.
 *
 * Core entities (partners, properties, rooms, providers, catalog, templates,
 * assignments) now use tRPC procedures via `trpc.crud.*` hooks.
 * This gives us:
 *   - Type-safe end-to-end data flow
 *   - Unified Manus OAuth cookie auth (no more Bearer JWT dependency)
 *   - Automatic cache invalidation via tRPC utils
 *
 * Remaining entities (QR, front-office, users, staff) still use the ky-based
 * REST client until their tRPC procedures are created.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationParams } from "@/lib/api/types";
import { trpc } from "@/lib/trpc";
import {
  frontOfficeApi,
  qrApi,
  staffApi,
  usersApi,
} from "@/lib/api/endpoints";

// ─── Partners (tRPC) ────────────────────────────────────────
export function usePartners(params: PaginationParams = {}) {
  return trpc.crud.partners.list.useQuery({
    page: params.page ?? 1,
    pageSize: params.page_size ?? 20,
    search: params.search,
    sortBy: params.sort_by,
    sortOrder: params.sort_order,
  });
}

export function usePartner(id: string | undefined) {
  return trpc.crud.partners.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
}

export function useCreatePartner() {
  const utils = trpc.useUtils();
  return trpc.crud.partners.create.useMutation({
    onSuccess: () => utils.crud.partners.list.invalidate(),
  });
}

export function useUpdatePartner() {
  const utils = trpc.useUtils();
  return trpc.crud.partners.update.useMutation({
    onSuccess: () => utils.crud.partners.list.invalidate(),
  });
}

export function useDeactivatePartner() {
  const utils = trpc.useUtils();
  return trpc.crud.partners.deactivate.useMutation({
    onSuccess: () => utils.crud.partners.list.invalidate(),
  });
}

// ─── Properties (tRPC) ──────────────────────────────────────
export function useProperties(params: PaginationParams & { partner_id?: string } = {}) {
  return trpc.crud.properties.list.useQuery({
    page: params.page ?? 1,
    pageSize: params.page_size ?? 20,
    search: params.search,
    sortBy: params.sort_by,
    sortOrder: params.sort_order,
    partner_id: params.partner_id,
  });
}

export function useProperty(id: string | undefined) {
  return trpc.crud.properties.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
}

export function useCreateProperty() {
  const utils = trpc.useUtils();
  return trpc.crud.properties.create.useMutation({
    onSuccess: () => utils.crud.properties.list.invalidate(),
  });
}

export function useUpdateProperty() {
  const utils = trpc.useUtils();
  return trpc.crud.properties.update.useMutation({
    onSuccess: () => utils.crud.properties.list.invalidate(),
  });
}

// ─── Rooms (tRPC) ───────────────────────────────────────────
export function useRooms(params: PaginationParams & { property_id?: string } = {}) {
  return trpc.crud.rooms.list.useQuery({
    page: params.page ?? 1,
    pageSize: params.page_size ?? 20,
    search: params.search,
    sortBy: params.sort_by,
    sortOrder: params.sort_order,
    property_id: params.property_id,
  });
}

export function useRoom(id: string | undefined) {
  return trpc.crud.rooms.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
}

export function useCreateRoom() {
  const utils = trpc.useUtils();
  return trpc.crud.rooms.create.useMutation({
    onSuccess: () => utils.crud.rooms.list.invalidate(),
  });
}

export function useBulkCreateRooms() {
  const utils = trpc.useUtils();
  return trpc.crud.rooms.bulkCreate.useMutation({
    onSuccess: () => {
      utils.crud.rooms.list.invalidate();
      utils.crud.properties.list.invalidate();
    },
  });
}

export function useUpdateRoom() {
  const utils = trpc.useUtils();
  return trpc.crud.rooms.update.useMutation({
    onSuccess: () => utils.crud.rooms.list.invalidate(),
  });
}

export function useAssignRoomTemplate() {
  const utils = trpc.useUtils();
  return trpc.crud.rooms.assignTemplate.useMutation({
    onSuccess: () => {
      utils.crud.rooms.list.invalidate();
      utils.crud.assignments.listByRoom.invalidate();
    },
  });
}

// ─── Service Providers (tRPC) ───────────────────────────────
export function useProviders(params: PaginationParams = {}) {
  return trpc.crud.providers.list.useQuery({
    page: params.page ?? 1,
    pageSize: params.page_size ?? 20,
    search: params.search,
    sortBy: params.sort_by,
    sortOrder: params.sort_order,
  });
}

export function useProvider(id: string | undefined) {
  return trpc.crud.providers.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
}

export function useCreateProvider() {
  const utils = trpc.useUtils();
  return trpc.crud.providers.create.useMutation({
    onSuccess: () => utils.crud.providers.list.invalidate(),
  });
}

export function useUpdateProvider() {
  const utils = trpc.useUtils();
  return trpc.crud.providers.update.useMutation({
    onSuccess: () => utils.crud.providers.list.invalidate(),
  });
}

// ─── Service Catalog (tRPC) ─────────────────────────────────
export function useCatalogItems(params: PaginationParams & { provider_id?: string; category?: string } = {}) {
  return trpc.crud.catalog.list.useQuery({
    page: params.page ?? 1,
    pageSize: params.page_size ?? 20,
    search: params.search,
    sortBy: params.sort_by,
    sortOrder: params.sort_order,
    provider_id: params.provider_id,
    category: params.category,
  });
}

export function useCatalogItem(id: string | undefined) {
  return trpc.crud.catalog.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
}

export function useCreateCatalogItem() {
  const utils = trpc.useUtils();
  return trpc.crud.catalog.create.useMutation({
    onSuccess: () => utils.crud.catalog.list.invalidate(),
  });
}

export function useUpdateCatalogItem() {
  const utils = trpc.useUtils();
  return trpc.crud.catalog.update.useMutation({
    onSuccess: () => utils.crud.catalog.list.invalidate(),
  });
}

// ─── Service Templates (tRPC) ───────────────────────────────
export function useTemplates(params: PaginationParams = {}) {
  return trpc.crud.templates.list.useQuery({
    page: params.page ?? 1,
    pageSize: params.page_size ?? 20,
    search: params.search,
    sortBy: params.sort_by,
    sortOrder: params.sort_order,
  });
}

export function useTemplate(id: string | undefined) {
  return trpc.crud.templates.get.useQuery(
    { id: id! },
    { enabled: !!id },
  );
}

export function useCreateTemplate() {
  const utils = trpc.useUtils();
  return trpc.crud.templates.create.useMutation({
    onSuccess: () => utils.crud.templates.list.invalidate(),
  });
}

export function useUpdateTemplate() {
  const utils = trpc.useUtils();
  return trpc.crud.templates.update.useMutation({
    onSuccess: () => utils.crud.templates.list.invalidate(),
  });
}

export function useAddTemplateItem() {
  const utils = trpc.useUtils();
  return trpc.crud.templates.addItem.useMutation({
    onSuccess: () => utils.crud.templates.list.invalidate(),
  });
}

export function useRemoveTemplateItem() {
  const utils = trpc.useUtils();
  return trpc.crud.templates.removeItem.useMutation({
    onSuccess: () => utils.crud.templates.list.invalidate(),
  });
}

// ─── Template Assignments (tRPC) ────────────────────────────
export function useRoomAssignments(roomId: string | undefined) {
  return trpc.crud.assignments.listByRoom.useQuery(
    { roomId: roomId! },
    { enabled: !!roomId },
  );
}

export function useTemplateAssignedRooms(templateId: string | undefined, params: PaginationParams = {}) {
  return trpc.crud.assignments.listByTemplate.useQuery(
    {
      templateId: templateId!,
      page: params.page ?? 1,
      pageSize: params.page_size ?? 20,
    },
    { enabled: !!templateId },
  );
}

export function useBulkAssign() {
  const utils = trpc.useUtils();
  return trpc.crud.assignments.bulkAssign.useMutation({
    onSuccess: () => {
      utils.crud.assignments.listByRoom.invalidate();
      utils.crud.assignments.listByTemplate.invalidate();
      utils.crud.rooms.list.invalidate();
    },
  });
}

// ─── QR Codes (still ky-based — pending tRPC migration) ─────
export function useQRCodes(propertyId: string | undefined, params: PaginationParams & { status?: string; access_type?: string } = {}) {
  return useQuery({
    queryKey: ["qr", propertyId, params],
    queryFn: () => qrApi.list(propertyId!, params),
    enabled: !!propertyId,
    staleTime: 15_000,
  });
}

export function useQRCode(propertyId: string | undefined, qrCodeId: string | undefined) {
  return useQuery({
    queryKey: ["qr", propertyId, qrCodeId],
    queryFn: () => qrApi.get(propertyId!, qrCodeId!),
    enabled: !!propertyId && !!qrCodeId,
  });
}

export function useGenerateQR() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: qrApi.generate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["qr"] }),
  });
}

// ─── Front Office (still ky-based — pending tRPC migration) ─
export function useFrontOfficeSessions(propertyId: string | undefined, params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["front-office", "sessions", propertyId, params],
    queryFn: () => frontOfficeApi.sessions(propertyId!, params),
    enabled: !!propertyId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export function useFrontOfficeRequests(propertyId: string | undefined, params: PaginationParams & { status?: string } = {}) {
  return useQuery({
    queryKey: ["front-office", "requests", propertyId, params],
    queryFn: () => frontOfficeApi.requests(propertyId!, params),
    enabled: !!propertyId,
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

export function useFrontOfficeRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: ["front-office", "request", requestId],
    queryFn: () => frontOfficeApi.getRequest(requestId!),
    enabled: !!requestId,
  });
}

export function useUpdateRequestStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status, notes }: { requestId: string; status: string; notes?: string }) =>
      frontOfficeApi.updateRequestStatus(requestId, status, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["front-office"] }),
  });
}

// ─── Users (still ky-based — pending tRPC migration) ────────
export function useUsers(params: PaginationParams & { role?: string; status?: string } = {}) {
  return useQuery({
    queryKey: ["users", params],
    queryFn: () => usersApi.list(params),
    staleTime: 30_000,
  });
}

export function useUser(id: string | undefined) {
  return useQuery({
    queryKey: ["users", id],
    queryFn: () => usersApi.get(id!),
    enabled: !!id,
  });
}

export function useInviteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.invite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof usersApi.update>[1] }) =>
      usersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ─── Staff (still ky-based — pending tRPC migration) ────────
export function useStaffPositions(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["staff", "positions", params],
    queryFn: () => staffApi.listPositions(params),
    staleTime: 60_000,
  });
}

export function useCreateStaffPosition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: staffApi.createPosition,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff", "positions"] }),
  });
}

export function useStaffMembers(params: PaginationParams & { position_id?: string; property_id?: string } = {}) {
  return useQuery({
    queryKey: ["staff", "members", params],
    queryFn: () => staffApi.listMembers(params),
    staleTime: 30_000,
  });
}

export function useAssignStaffMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: staffApi.assignMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["staff"] }),
  });
}
