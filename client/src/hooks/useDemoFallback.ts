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

// Accept any query-like object (UseQueryResult, DefinedUseTRPCQueryResult, etc.)
// This avoids type incompatibility between tRPC and vanilla react-query results.
type QueryLike<T> = {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  fetchStatus: string;
  [key: string]: any;
};

export function useDemoFallback<T>(
  query: QueryLike<T>,
  demoData: any // eslint-disable-line @typescript-eslint/no-explicit-any — demo data is structurally compatible but may differ in TS inference
): { data: T | undefined; isLoading: boolean; isError: boolean; isDemo: boolean; isFetching: boolean; [key: string]: any } {
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
  };
}
