/**
 * useActiveProperty — provides the active propertyId for the current user.
 *
 * Resolution order (updated for multi-tenant RBAC):
 *  1. Active role scope (PROPERTY scope → scopeId is the propertyId)
 *  2. localStorage override (super-admins / partner-admins who have manually switched)
 *  3. user.property_id from AuthContext (legacy direct assignment)
 *  4. First property from propertiesApi.list() (SUPER_ADMIN fallback)
 *  5. undefined while loading, null if no properties exist
 *
 * Usage:
 *   const { propertyId, isLoading } = useActiveProperty();
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { propertiesApi } from "@/lib/api/endpoints";
import { useActiveRole } from "@/hooks/useActiveRole";

const ACTIVE_PROPERTY_KEY = "pa_active_property_id";

export function useActiveProperty() {
  const { user, isAuthenticated } = useAuth();
  const { activeRole } = useActiveRole();

  // 1. Active role scope — if the role is scoped to a PROPERTY, use that
  const roleScopePropertyId =
    activeRole?.scopeType === "PROPERTY" ? activeRole.scopeId : null;

  // 2. localStorage override (super-admins / partner-admins who have manually switched)
  const storedPropertyId =
    typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_PROPERTY_KEY)
      : null;

  // 3. Direct assignment from user profile (legacy)
  const directPropertyId = user?.property_id ?? null;

  // 4. Only fetch the properties list if none of the above resolved
  const needsFallback =
    isAuthenticated &&
    !roleScopePropertyId &&
    !storedPropertyId &&
    !directPropertyId;

  const fallbackQuery = useQuery({
    queryKey: ["properties", "first"],
    queryFn: () => propertiesApi.list({ page: 1, page_size: 1 }),
    enabled: needsFallback,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // Resolution order
  const propertyId: string | null | undefined =
    roleScopePropertyId ||
    storedPropertyId ||
    directPropertyId ||
    (needsFallback ? fallbackQuery.data?.items?.[0]?.id ?? null : null);

  const isLoading =
    needsFallback && (fallbackQuery.isLoading || fallbackQuery.isFetching);

  return {
    /** The resolved active property ID, or null/undefined while loading */
    propertyId,
    /** True while the fallback properties query is in-flight */
    isLoading,
    /**
     * Set a new active property (persists to localStorage for super-admins
     * and partner-admins who manage multiple properties).
     * For PROPERTY-scoped roles, switching role via the carousel is the
     * preferred mechanism.
     */
    setActiveProperty: (id: string) => {
      localStorage.setItem(ACTIVE_PROPERTY_KEY, id);
      window.location.reload();
    },
  };
}
