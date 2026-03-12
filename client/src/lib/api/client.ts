/**
 * API Client — ky-based HTTP client for the Peppr Around FastAPI backend.
 *
 * Intent: Centralize all HTTP communication. Every domain hook imports from here.
 * This module does NOT contain business logic — only transport.
 *
 * Architecture:
 *   In development, requests go through the Express proxy:
 *     Browser → Express (/api/v1/*) → FastAPI (/v1/*)
 *   The proxy is transparent — the frontend uses /api/v1/* and /api/public/* paths.
 *
 * Auth strategy:
 *   - 401 responses are NOT auto-redirected to login. Instead, the error propagates
 *     to TanStack Query, where useDemoFallback() catches it and shows demo data.
 *   - Only explicit logout or token expiry triggers a login redirect.
 *   - This allows the dashboard to always render, even without authentication.
 */
import ky from "ky";

/**
 * The API base URL.
 * - In production/deployed mode: relative path (same origin, proxied by Express)
 * - In development: also relative (Express dev server proxies to FastAPI)
 * - Override with VITE_API_URL if you need direct FastAPI access (e.g., for testing)
 */
const API_BASE = import.meta.env.VITE_API_URL || `${window.location.origin}/api`;

const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 30_000,
  hooks: {
    beforeRequest: [
      (request) => {
        // Forward JWT token from localStorage for FastAPI auth
        const token = localStorage.getItem("pa_access_token");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    // NOTE: No afterResponse 401 redirect. The useDemoFallback hook handles
    // unauthenticated states gracefully by showing demo data.
    // Login redirect is handled by AuthContext when needed.
  },
});

export default api;
export { API_BASE };
