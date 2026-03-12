/**
 * API Hooks — TanStack Query wrappers for every domain.
 *
 * Intent: Provide reactive, cached data access to all page components.
 * Each hook wraps an endpoint function with proper cache keys,
 * stale times, and mutation invalidation.
 *
 * Pattern:
 *   useXxxList()    → paginated list query
 *   useXxx(id)      → single item query
 *   useCreateXxx()  → mutation that invalidates list cache
 *   useUpdateXxx()  → mutation that invalidates list + item cache
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaginationParams } from "@/lib/api/types";
import {
  assignmentsApi,
  catalogApi,
  frontOfficeApi,
  partnersApi,
  propertiesApi,
  providersApi,
  qrApi,
  roomsApi,
  staffApi,
  templatesApi,
  usersApi,
} from "@/lib/api/endpoints";

// ─── Partners ────────────────────────────────────────────────
export function usePartners(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["partners", params],
    queryFn: () => partnersApi.list(params),
    staleTime: 30_000,
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: ["partners", id],
    queryFn: () => partnersApi.get(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: partnersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useUpdatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof partnersApi.update>[1] }) =>
      partnersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

export function useDeactivatePartner() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: partnersApi.deactivate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["partners"] }),
  });
}

// ─── Properties ──────────────────────────────────────────────
export function useProperties(params: PaginationParams & { partner_id?: string } = {}) {
  return useQuery({
    queryKey: ["properties", params],
    queryFn: () => propertiesApi.list(params),
    staleTime: 30_000,
  });
}

export function useProperty(id: string | undefined) {
  return useQuery({
    queryKey: ["properties", id],
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: propertiesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof propertiesApi.update>[1] }) =>
      propertiesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["properties"] }),
  });
}

// ─── Rooms ───────────────────────────────────────────────────
export function useRooms(params: PaginationParams & { property_id?: string } = {}) {
  return useQuery({
    queryKey: ["rooms", params],
    queryFn: () => roomsApi.list(params),
    staleTime: 30_000,
  });
}

export function useRoom(id: string | undefined) {
  return useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.get(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useBulkCreateRooms() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: roomsApi.bulkCreate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useUpdateRoom() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof roomsApi.update>[1] }) =>
      roomsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
}

export function useAssignRoomTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, templateId }: { roomId: string; templateId: string }) =>
      roomsApi.assignTemplate(roomId, templateId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms"] });
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
  });
}

// ─── Service Providers ───────────────────────────────────────
export function useProviders(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["providers", params],
    queryFn: () => providersApi.list(params),
    staleTime: 30_000,
  });
}

export function useProvider(id: string | undefined) {
  return useQuery({
    queryKey: ["providers", id],
    queryFn: () => providersApi.get(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: providersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

export function useUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof providersApi.update>[1] }) =>
      providersApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["providers"] }),
  });
}

// ─── Service Catalog ─────────────────────────────────────────
export function useCatalogItems(params: PaginationParams & { provider_id?: string; category?: string } = {}) {
  return useQuery({
    queryKey: ["catalog", params],
    queryFn: () => catalogApi.list(params),
    staleTime: 30_000,
  });
}

export function useCatalogItem(id: string | undefined) {
  return useQuery({
    queryKey: ["catalog", id],
    queryFn: () => catalogApi.get(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: catalogApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

export function useUpdateCatalogItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof catalogApi.update>[1] }) =>
      catalogApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalog"] }),
  });
}

// ─── Service Templates ───────────────────────────────────────
export function useTemplates(params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["templates", params],
    queryFn: () => templatesApi.list(params),
    staleTime: 30_000,
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ["templates", id],
    queryFn: () => templatesApi.get(id!),
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: templatesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof templatesApi.update>[1] }) =>
      templatesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useAddTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, catalogItemId }: { templateId: string; catalogItemId: string }) =>
      templatesApi.addItem(templateId, catalogItemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useRemoveTemplateItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, itemId }: { templateId: string; itemId: string }) =>
      templatesApi.removeItem(templateId, itemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

// ─── Template Assignments ────────────────────────────────────
export function useRoomAssignments(roomId: string | undefined) {
  return useQuery({
    queryKey: ["assignments", "room", roomId],
    queryFn: () => assignmentsApi.listByRoom(roomId!),
    enabled: !!roomId,
  });
}

export function useTemplateAssignedRooms(templateId: string | undefined, params: PaginationParams = {}) {
  return useQuery({
    queryKey: ["assignments", "template", templateId, params],
    queryFn: () => assignmentsApi.listByTemplate(templateId!, params),
    enabled: !!templateId,
  });
}

export function useBulkAssign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: assignmentsApi.bulkAssign,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      qc.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// ─── QR Codes ────────────────────────────────────────────────
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

// ─── Front Office ────────────────────────────────────────────
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

// ─── Users ───────────────────────────────────────────────────
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

// ─── Staff ───────────────────────────────────────────────────
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
