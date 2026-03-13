/**
 * API Proxy — Forwards /api/v1/* and /api/public/* to the FastAPI Core API.
 *
 * Architecture:
 *   Browser → Express BFF (port 3000) → FastAPI Core API (PEPPR_API_URL)
 *   - /api/trpc/*     → tRPC (auth, BFF-specific logic)
 *   - /api/v1/*       → proxied to FastAPI /v1/*
 *   - /api/public/*   → proxied to FastAPI /public/*
 *   - /api/health     → aggregated health (BFF + FastAPI)
 *   - /api/overseer/* → Port Overseer status & registry
 *
 * The target URL is resolved through the Port Overseer — never hardcoded here.
 */
import type { Express, Request, Response } from "express";
import axios from "axios";
import { overseer } from "./overseer";

/**
 * Register the API proxy routes on the Express app.
 * Must be called BEFORE the Vite middleware (which catches all unmatched routes).
 */
export function registerApiProxy(app: Express): void {
  const backendUrl = overseer.resolve("fastapi");

  // ── Proxy routes ──────────────────────────────────────────────────────────
  app.all("/api/v1/*", createProxyHandler("/api/v1", "/v1"));
  app.all("/api/public/*", createProxyHandler("/api/public", "/public"));

  // ── Aggregated health check ───────────────────────────────────────────────
  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      const fastapiHealth = await axios.get(`${backendUrl}/health`, { timeout: 5000 }).catch(() => null);
      res.json({
        gateway: "healthy",
        backend: fastapiHealth?.data ?? "unreachable",
        backend_url: backendUrl,
      });
    } catch {
      res.status(503).json({ gateway: "healthy", backend: "unreachable", backend_url: backendUrl });
    }
  });

  // ── Overseer: full snapshot ───────────────────────────────────────────────
  app.get("/api/overseer/status", async (_req: Request, res: Response) => {
    try {
      const snapshot = await overseer.healthCheck();
      res.json(snapshot);
    } catch (err) {
      res.status(500).json({ error: "Overseer health check failed", message: err instanceof Error ? err.message : String(err) });
    }
  });

  // ── Overseer: service registry ────────────────────────────────────────────
  app.get("/api/overseer/services", (_req: Request, res: Response) => {
    res.json({ services: overseer.getRegistry(), portMap: overseer.getLastSnapshot()?.portMap ?? {} });
  });

  // ── Overseer: config validation ───────────────────────────────────────────
  app.get("/api/overseer/config", (_req: Request, res: Response) => {
    const issues = overseer.validateConfig();
    res.json({
      issues,
      environment: process.env.NODE_ENV || "development",
      configuredServices: overseer.getRegistry().map((s) => ({
        id: s.id,
        name: s.name,
        url: s.url,
        envVar: s.envVar,
        envValue: s.envVar ? (process.env[s.envVar] ? "set" : "missing") : "n/a",
      })),
      lastChecked: overseer.getLastSnapshot()?.timestamp ?? null,
    });
  });

  // ── Overseer: cached snapshot (non-blocking) ──────────────────────────────
  app.get("/api/overseer/snapshot", (_req: Request, res: Response) => {
    const snapshot = overseer.getLastSnapshot();
    if (!snapshot) {
      res.status(202).json({ message: "No snapshot yet — trigger /api/overseer/status first" });
      return;
    }
    res.json(snapshot);
  });

  console.log(`[API Proxy] Registered → ${backendUrl} (via Port Overseer)`);
}

function createProxyHandler(stripPrefix: string, targetPrefix: string) {
  return async (req: Request, res: Response): Promise<void> => {
    const backendUrl = overseer.resolve("fastapi");
    const targetPath = req.originalUrl.replace(stripPrefix, targetPrefix);
    const targetUrl = `${backendUrl}${targetPath}`;

    try {
      const forwardHeaders: Record<string, string> = {};
      const skipHeaders = new Set([
        "host", "connection", "keep-alive", "transfer-encoding",
        "te", "trailer", "upgrade", "proxy-authorization", "proxy-authenticate",
      ]);

      for (const [key, value] of Object.entries(req.headers)) {
        if (!skipHeaders.has(key.toLowerCase()) && typeof value === "string") {
          forwardHeaders[key] = value;
        }
      }

      forwardHeaders["x-forwarded-for"] =
        (req.headers["x-forwarded-for"] as string) || req.ip || "unknown";
      forwardHeaders["x-forwarded-proto"] = req.protocol;
      forwardHeaders["x-peppr-gateway"] = "bff";

      const response = await axios({
        method: req.method as string,
        url: targetUrl,
        headers: forwardHeaders,
        data: req.body,
        timeout: 30_000,
        validateStatus: () => true,
        responseType: "arraybuffer",
      });

      const responseSkipHeaders = new Set(["transfer-encoding", "connection", "keep-alive"]);
      for (const [key, value] of Object.entries(response.headers)) {
        if (!responseSkipHeaders.has(key.toLowerCase())) {
          res.setHeader(key, value as string);
        }
      }

      res.status(response.status).send(Buffer.from(response.data));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown proxy error";
      console.error(`[API Proxy] Error forwarding ${req.method} ${targetUrl}:`, message);
      res.status(502).json({
        error: "Bad Gateway",
        message: "Failed to reach the backend API",
        target: targetUrl,
        overseer_url: overseer.resolve("fastapi"),
      });
    }
  };
}
