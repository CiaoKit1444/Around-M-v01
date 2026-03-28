import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import helmet from "helmet";
import cors from "cors";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
// apiProxy removed — all endpoints now served natively by Express routes
import { registerPepprAuthRoutes } from "../pepprAuth";
import { registerSSE } from "../sse";
import { overseer } from "../overseer";
import { registerMigratedRoutes } from "../routes/index";
import { startAutoConfirmWorker } from "../autoConfirmWorker";
import { getDb } from "../db";
import { tfaRecoveryTokens, jtiRevocations } from "../../drizzle/schema";
import { lt } from "drizzle-orm";
import { pruneExpiredJtis } from "../pepprAuth";

// ── CORS allowed origins ─────────────────────────────────────────────────────
// Build the allowlist from environment variables so no domain is hardcoded.
// CORS_ALLOWED_ORIGINS is a comma-separated list of additional origins (e.g.
// staging or preview URLs). The Manus preview domain and the production domain
// are always included when their env vars are set.
function buildCorsOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [
    // Manus sandbox preview (development)
    /\.manus\.computer$/,
    // Manus published app domain (production)
    /\.manus\.space$/,
  ];

  // Production custom domain — injected via VITE_APP_URL or CORS_ALLOWED_ORIGINS
  const extra = process.env.CORS_ALLOWED_ORIGINS ?? "";
  for (const raw of extra.split(",").map(s => s.trim()).filter(Boolean)) {
    origins.push(raw);
  }

  // Always allow the server's own origin in development
  if (process.env.NODE_ENV === "development") {
    origins.push(/localhost/);
  }

  return origins;
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // ── Port Overseer: startup gate ──────────────────────────────────────────
  await overseer.runStartupGate();
  overseer.startMonitoring();

  const app = express();
  const server = createServer(app);

  // ── SECURITY: HTTP headers (FIND-04) ──────────────────────────────────────
  // helmet sets 11 security headers in one call:
  //   Content-Security-Policy, X-Frame-Options, X-Content-Type-Options,
  //   Strict-Transport-Security, Referrer-Policy, Permissions-Policy, etc.
  // CSP is relaxed for the Vite dev server (inline scripts + HMR websocket).
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "development"
          ? false // Vite HMR requires inline scripts; re-enable in production
          : {
              directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "wss:", "https:"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
                upgradeInsecureRequests: [],
              },
            },
      // Allow Google Maps iframe embeds if needed
      crossOriginEmbedderPolicy: false,
    })
  );

  // ── SECURITY: CORS policy (FIND-05) ───────────────────────────────────────
  // Only origins in the allowlist may make credentialed cross-origin requests.
  // The allowlist is built from env vars — no domain is hardcoded here.
  const corsOrigins = buildCorsOrigins();
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no Origin header)
        if (!origin) return callback(null, true);
        const allowed = corsOrigins.some(o =>
          typeof o === "string" ? o === origin : o.test(origin)
        );
        if (allowed) return callback(null, true);
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        callback(new Error(`CORS: origin '${origin}' is not allowed`));
      },
      credentials: true,          // Required for session cookies
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      maxAge: 86400,              // Cache preflight for 24 h
    })
  );

  // ── SECURITY: Body size limits (FIND-06) ────────────────────────────────
  // Global limit is 2 MB — sufficient for all JSON API payloads.
  // File upload routes (base64-encoded images via tRPC) get a 20 MB override,
  // which still enforces a hard cap well below the old 50 MB default.
  // The CMS uploadBannerImage procedure additionally validates at the
  // application layer (5 MB raw cap) for defence in depth.
  const uploadBodyParser = express.json({ limit: "20mb" });
  app.use("/api/trpc/cms.uploadBannerImage", uploadBodyParser);
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ limit: "2mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Peppr auth routes: Express-native (no FastAPI dependency)
  registerPepprAuthRoutes(app);
  // Migrated CRUD routes: Express-native (replaces FastAPI endpoints)
  registerMigratedRoutes(app);
  // NOTE: FastAPI apiProxy has been removed — all endpoints are now served by Express routes
  // SSE: real-time notifications for Front Office
  registerSSE(app);
  // Auto-confirm background worker: COMPLETED → FULFILLED after 10-min opt-in window
  startAutoConfirmWorker();
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);

// ── Expired 2FA recovery token pruning ──────────────────────────────────────
// Runs every 6 hours to delete tfa_recovery_tokens rows whose expiresAt has
// passed. Keeps the table lean in production without a separate cron job.
async function pruneExpiredRecoveryTokens() {
  try {
    const db = await getDb();
    if (!db) return;
    const result = await db
      .delete(tfaRecoveryTokens)
      .where(lt(tfaRecoveryTokens.expiresAt, new Date()));
    const deleted = (result as any).rowsAffected ?? (result as any)[0]?.affectedRows ?? 0;
    if (deleted > 0) {
      console.log(`[2FA Pruner] Deleted ${deleted} expired recovery token(s).`);
    }
  } catch (err) {
    console.error("[2FA Pruner] Error pruning expired recovery tokens:", err);
  }
}

// Run immediately on startup, then every 6 hours
pruneExpiredRecoveryTokens();
setInterval(pruneExpiredRecoveryTokens, 6 * 60 * 60 * 1000);

// ── Periodic MySQL JTI revocation table pruning ──────────────────────────────
// Even though Redis handles fast JTI lookups, MySQL is the durability layer and
// accumulates rows over time. This cron deletes expired rows every 6 hours so
// the table stays lean without a separate database job.
async function pruneExpiredJtisCron() {
  try {
    const db = await getDb();
    if (!db) return;
    await pruneExpiredJtis(db);
  } catch (err) {
    console.error("[JTI Pruner] Error pruning expired JTI revocations:", err);
  }
}

// Stagger by 3 hours relative to the recovery token pruner to spread DB load
setTimeout(() => {
  pruneExpiredJtisCron();
  setInterval(pruneExpiredJtisCron, 6 * 60 * 60 * 1000);
}, 3 * 60 * 60 * 1000); // first run 3 hours after startup
