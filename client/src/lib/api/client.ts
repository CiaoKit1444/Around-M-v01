/**
 * API Client — ky-based HTTP client for the Peppr Around backend.
 *
 * Intent: Centralize all HTTP communication. Every domain hook imports from here.
 * This module does NOT contain business logic — only transport.
 *
 * Architecture:
 *   In development, requests go through the Express proxy:
 *     Browser → Express (/api/v1/*) → tRPC/Express routes
 *   The proxy is transparent — the frontend uses /api/v1/* and /api/public/* paths.
 *
 * Auth strategy (Feature #27 — Token Refresh):
 *   - beforeRequest: attaches Bearer token from localStorage
 *   - afterResponse: on 401, attempts silent token refresh via /v1/auth/refresh
 *   - If refresh succeeds: retries the original request with the new token
 *   - If refresh fails: clears tokens and dispatches a "pa:logout" event
 *   - 401 responses are NOT auto-redirected to login — useDemoFallback handles them
 */
import ky, { type BeforeRequestHook, type AfterResponseHook } from "ky";

const API_BASE = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

// ─── Token storage helpers ────────────────────────────────────────────────────
export const tokenStore = {
  get: () => localStorage.getItem("pa_access_token"),
  set: (t: string) => localStorage.setItem("pa_access_token", t),
  getRefresh: () => localStorage.getItem("pa_refresh_token"),
  setRefresh: (t: string) => localStorage.setItem("pa_refresh_token", t),
  clear: () => {
    localStorage.removeItem("pa_access_token");
    localStorage.removeItem("pa_refresh_token");
    localStorage.removeItem("pa_user");
  },
};

// ─── Refresh state (prevent concurrent refreshes) ────────────────────────────
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = tokenStore.getRefresh();
    if (!refreshToken) return null;

    try {
      const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent("pa:logout"));
        return null;
      }

      const data = (await res.json()) as {
        tokens?: { access_token: string; refresh_token?: string };
        access_token?: string;
        refresh_token?: string;
      };

      const newAccess = data.tokens?.access_token ?? data.access_token ?? null;
      const newRefresh = data.tokens?.refresh_token ?? data.refresh_token ?? null;

      if (newAccess) {
        tokenStore.set(newAccess);
        if (newRefresh) tokenStore.setRefresh(newRefresh);
        return newAccess;
      }

      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("pa:logout"));
      return null;
    } catch {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent("pa:logout"));
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
const attachToken: BeforeRequestHook = (request) => {
  const token = tokenStore.get();
  if (token) {
    request.headers.set("Authorization", `Bearer ${token}`);
  }
};

const handleUnauthorized: AfterResponseHook = async (request, _options, response) => {
  if (response.status !== 401) return response;

  // Don't retry auth endpoints to avoid infinite loops
  if (request.url.includes("/auth/")) return response;

  const newToken = await refreshAccessToken();
  if (!newToken) return response;

  // Retry original request with new token
  const retried = request.clone();
  retried.headers.set("Authorization", `Bearer ${newToken}`);
  return fetch(retried);
};

// ─── Client ───────────────────────────────────────────────────────────────────
const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 30_000,
  hooks: {
    beforeRequest: [attachToken],
    afterResponse: [handleUnauthorized],
  },
});

export default api;
export { API_BASE };
