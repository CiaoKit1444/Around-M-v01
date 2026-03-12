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
 */
import type { UseQueryResult } from "@tanstack/react-query";

export function useDemoFallback<T>(
  query: UseQueryResult<T>,
  demoData: T
): UseQueryResult<T> & { isDemo: boolean } {
  const isDemo = query.isError || (!query.data && !query.isLoading);

  return {
    ...query,
    data: query.data ?? demoData,
    isLoading: query.isLoading && !isDemo,
    isError: false,
    isDemo,
  } as UseQueryResult<T> & { isDemo: boolean };
}
