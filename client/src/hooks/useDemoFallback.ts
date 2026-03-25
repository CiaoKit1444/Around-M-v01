/**
 * Demo Fallback Hook — Wraps TanStack Query with demo data fallback.
 *
 * Intent: When the API is unreachable (no backend running), seamlessly
 * fall back to demo data so the UI always renders. When the API is
 * connected, real data takes priority.
 *
 * Usage:
 *   const { data, isLoading } = useDemoFallback(
 *     usePartners(),
 *     getDemoPartners()
 *   );
 *
 * IMPORTANT: A disabled query (enabled: false) has isLoading=false and
 * data=undefined. We must NOT treat that as "demo mode" — the query is
 * simply waiting for its dependencies (e.g. propertyId) to resolve.
 * We only fall back to demo data when the query is enabled AND has
 * definitively failed or returned no data.
 */
import type { UseQueryResult } from "@tanstack/react-query";

export function useDemoFallback<T>(
  query: UseQueryResult<T>,
  demoData: T
): UseQueryResult<T> & { isDemo: boolean } {
  // fetchStatus === "idle" means the query is disabled (waiting for dependencies).
  // In that case we show a loading state, NOT demo data.
  const isDisabled = query.fetchStatus === "idle" && !query.data;

  // Only show demo data when the query is enabled AND has failed or returned nothing.
  const isDemo = !isDisabled && (query.isError || (!query.data && !query.isLoading && !query.isFetching));

  return {
    ...query,
    data: isDisabled ? undefined : (query.data ?? (isDemo ? demoData : undefined)),
    isLoading: isDisabled || query.isLoading || (!isDemo && query.isFetching && !query.data),
    isError: false,
    isDemo,
  } as UseQueryResult<T> & { isDemo: boolean };
}
