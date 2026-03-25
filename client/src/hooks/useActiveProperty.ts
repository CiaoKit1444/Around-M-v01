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
 * setActiveProperty() persists the selection to localStorage and dispatches a
 * custom "pa:property-changed" event so all hook instances update reactively
 * without a full page reload.
 *
 * Usage:
 *   const { propertyId, isLoading, setActiveProperty } = useActiveProperty();
 */
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { propertiesApi } from "@/lib/api/endpoints";
import { useActiveRole } from "@/hooks/useActiveRole";
import { useState, useEffect } from "react";

const ACTIVE_PROPERTY_KEY = "pa_active_property_id";
const PROPERTY_CHANGED_EVENT = "pa:property-changed";

/** Read the persisted property ID from localStorage */
function readStoredPropertyId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PROPERTY_KEY);
  } catch {
    return null;
  }
}

export function useActiveProperty() {
  const { user, isAuthenticated } = useAuth();
  const { activeRole } = useActiveRole();

  // Reactive localStorage state — updates when setActiveProperty is called
  const [storedPropertyId, setStoredPropertyId] = useState<string | null>(
    readStoredPropertyId
  );

  // Listen for cross-component property changes
  useEffect(() => {
    const handler = () => {
      setStoredPropertyId(readStoredPropertyId());
    };
    window.addEventListener(PROPERTY_CHANGED_EVENT, handler);
    return () => window.removeEventListener(PROPERTY_CHANGED_EVENT, handler);
  }, []);

  // 1. Active role scope — if the role is scoped to a PROPERTY, use that
  const roleScopePropertyId =
    activeRole?.scopeType === "PROPERTY" ? activeRole.scopeId : null;

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
     * Set a new active property. Persists to localStorage and dispatches a
     * reactive event so all hook instances update without a page reload.
     * For PROPERTY-scoped roles, switching role via the carousel is the
     * preferred mechanism.
     */
    setActiveProperty: (id: string) => {
      localStorage.setItem(ACTIVE_PROPERTY_KEY, id);
      // Notify all hook instances reactively
      window.dispatchEvent(new Event(PROPERTY_CHANGED_EVENT));
    },
  };
}
