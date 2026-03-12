/**
 * API Proxy — Forwards /api/v1/* and /api/public/* requests to the FastAPI backend.
 *
 * Intent: Bridge the frontend (served by Express) to the Python FastAPI backend
 * without duplicating endpoint definitions. The Express server acts as a reverse proxy.
 *
 * This module does NOT contain business logic — only transport forwarding.
 *
 * Architecture:
 *   Browser → Express (port 3000) → FastAPI (PEPPR_API_URL)
 *   - /api/trpc/* → handled by tRPC (auth, frontend-specific)
 *   - /api/v1/*   → proxied to FastAPI /v1/*
 *   - /api/public/* → proxied to FastAPI /public/*
 */
import type { Express, Request, Response } from "express";
import axios from "axios";

const FASTAPI_BASE_URL = process.env.PEPPR_API_URL || "http://localhost:8000";

/**
 * Register the API proxy routes on the Express app.
 * Must be called BEFORE the Vite middleware (which catches all unmatched routes).
 */
export function registerApiProxy(app: Express): void {
  // Proxy /api/v1/* → FastAPI /v1/*
  app.all("/api/v1/*", createProxyHandler("/api/v1", "/v1"));

  // Proxy /api/public/* → FastAPI /public/*
  app.all("/api/public/*", createProxyHandler("/api/public", "/public"));

  // Health check passthrough
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const response = await axios.get(`${FASTAPI_BASE_URL}/health`, {
        timeout: 5000,
      });
      res.json({
        gateway: "healthy",
        backend: response.data,
      });
    } catch {
      res.status(503).json({
        gateway: "healthy",
        backend: "unreachable",
        backend_url: FASTAPI_BASE_URL,
      });
    }
  });

  console.log(`[API Proxy] Registered → ${FASTAPI_BASE_URL}`);
}

function createProxyHandler(stripPrefix: string, targetPrefix: string) {
  return async (req: Request, res: Response): Promise<void> => {
    const targetPath = req.originalUrl.replace(stripPrefix, targetPrefix);
    const targetUrl = `${FASTAPI_BASE_URL}${targetPath}`;

    try {
      // Forward headers, stripping hop-by-hop headers
      const forwardHeaders: Record<string, string> = {};
      const skipHeaders = new Set([
        "host",
        "connection",
        "keep-alive",
        "transfer-encoding",
        "te",
        "trailer",
        "upgrade",
        "proxy-authorization",
        "proxy-authenticate",
      ]);

      for (const [key, value] of Object.entries(req.headers)) {
        if (!skipHeaders.has(key.toLowerCase()) && typeof value === "string") {
          forwardHeaders[key] = value;
        }
      }

      // Add X-Forwarded headers
      forwardHeaders["x-forwarded-for"] =
        (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
      forwardHeaders["x-forwarded-proto"] = req.protocol;

      const response = await axios({
        method: req.method as string,
        url: targetUrl,
        headers: forwardHeaders,
        data: req.body,
        timeout: 30_000,
        validateStatus: () => true, // Don't throw on non-2xx
        responseType: "arraybuffer", // Preserve binary responses (QR images, etc.)
      });

      // Forward response headers
      const responseSkipHeaders = new Set([
        "transfer-encoding",
        "connection",
        "keep-alive",
      ]);
      for (const [key, value] of Object.entries(response.headers)) {
        if (!responseSkipHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value as string);
        }
      }

      res.status(response.status).send(Buffer.from(response.data));
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unknown proxy error";
      console.error(`[API Proxy] Error forwarding ${req.method} ${targetUrl}:`, message);
      res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to reach the backend API",
        target: targetUrl,
      });
    }
  };
}
