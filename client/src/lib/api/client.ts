/**
 * API Client — ky-based HTTP client for the Peppr Around FastAPI backend.
 *
 * Intent: Centralize all HTTP communication. Every domain hook imports from here.
 * This module does NOT contain business logic — only transport.
 */
import ky from "ky";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = ky.create({
  prefixUrl: API_BASE,
  timeout: 30_000,
  hooks: {
    beforeRequest: [
      (request) => {
        const token = localStorage.getItem("pa_access_token");
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      },
    ],
    afterResponse: [
      async (_request, _options, response) => {
        if (response.status === 401) {
          localStorage.removeItem("pa_access_token");
          localStorage.removeItem("pa_user");
          if (!window.location.pathname.includes("/auth")) {
            window.location.href = "/auth/login";
          }
        }
      },
    ],
  },
});

export default api;
export { API_BASE };
