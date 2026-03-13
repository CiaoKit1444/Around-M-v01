/**
 * useActiveProperty — provides the active propertyId for the current user.
 *
 * Resolution order:
 *  1. user.property_id from AuthContext (staff assigned to a single property)
 *  2. First property from propertiesApi.list() (super-admins / multi-property admins)
 *  3. undefined while loading, null if no properties exist
 *
 * Usage:
 *   const { propertyId, isLoading } = useActiveProperty();
 *
 * For super-admins managing multiple properties, a PropertySelector UI should
 * be added to the TopBar so they can switch the active property. When that
 * selector exists, store the choice in localStorage under "pa_active_property_id"
 * and this hook will pick it up automatically.
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { propertiesApi } from "@/lib/api/endpoints";

const ACTIVE_PROPERTY_KEY = "pa_active_property_id";

export function useActiveProperty() {
  const { user, isAuthenticated } = useAuth();

  // Check if user has a direct property assignment
  const directPropertyId = user?.property_id ?? null;

  // Check localStorage override (for super-admins who have switched property)
  const storedPropertyId =
    typeof window !== "undefined"
      ? localStorage.getItem(ACTIVE_PROPERTY_KEY)
      : null;

  // Only fetch the properties list if the user has no direct assignment
  // and is authenticated (super-admin scenario)
  const needsFallback = isAuthenticated && !directPropertyId && !storedPropertyId;

  const fallbackQuery = useQuery({
    queryKey: ["properties", "first"],
    queryFn: () => propertiesApi.list({ page: 1, page_size: 1 }),
    enabled: needsFallback,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // Resolution order: stored override → direct assignment → first from API
  const propertyId: string | null | undefined =
    storedPropertyId ||
    directPropertyId ||
    (needsFallback
      ? fallbackQuery.data?.items?.[0]?.id ?? null
      : null);

  const isLoading =
    needsFallback && (fallbackQuery.isLoading || fallbackQuery.isFetching);

  return {
    /** The resolved active property ID, or null/undefined while loading */
    propertyId,
    /** True while the fallback properties query is in-flight */
    isLoading,
    /** Set a new active property (persists to localStorage for super-admins) */
    setActiveProperty: (id: string) => {
      localStorage.setItem(ACTIVE_PROPERTY_KEY, id);
      // Force a page reload so all queries re-run with the new propertyId.
      // A more elegant solution would use a React context, but this is safe
      // for the near-production stage without adding a full context layer.
      window.location.reload();
    },
  };
}
