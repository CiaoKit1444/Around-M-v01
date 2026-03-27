/**
 * Route index — registers all Express routes.
 *
 * Canonical path convention:
 *   /api/v1/*          → authenticated admin/staff endpoints
 *   /api/v1/public/*   → unauthenticated guest endpoints (QR scan, sessions, branding)
 *
 * Legacy aliases (kept for backward compatibility with deployed QR codes):
 *   /api/public/guest/* → same as /api/v1/public/* (guestRouter)
 */
import type { Express } from "express";
import partnersRouter from "./partners";
import propertiesRouter from "./properties";
import roomsRouter from "./rooms";
import providersRouter from "./providers";
import catalogRouter from "./catalog";
import templatesRouter from "./templates";
import qrcodesRouter from "./qrcodes";
import frontofficeRouter from "./frontoffice";
import staffRouter from "./staff";
import adminRouter from "./admin";
import usersRouter from "./users";
import guestRouter from "./guest";
import propertyQrRouter from "./property-qr";

export function registerMigratedRoutes(app: Express) {
  // ── Authenticated admin/staff endpoints ────────────────────────────────────
  app.use("/api/v1/partners", partnersRouter);
  app.use("/api/v1/properties", propertiesRouter);
  app.use("/api/v1/rooms", roomsRouter);
  app.use("/api/v1/providers", providersRouter);
  app.use("/api/v1/catalog", catalogRouter);
  app.use("/api/v1/templates", templatesRouter);
  app.use("/api/v1/qr-codes", qrcodesRouter);
  app.use("/api/v1/properties/:propertyId/qr", propertyQrRouter);
  app.use("/api/v1/front-office", frontofficeRouter);
  app.use("/api/v1/staff", staffRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/users", usersRouter);

  // ── Public guest endpoints (canonical) ─────────────────────────────────────
  // Handles: POST /sessions, GET /sessions/:id, GET /sessions/:id/menu,
  //          POST /sessions/:id/requests, GET /qr/:qrCodeId/status,
  //          POST /qr/validate-token, GET /properties/:id/branding
  app.use("/api/v1/public", guestRouter);

  // ── Legacy aliases (backward-compatible — do not remove) ───────────────────
  // Deployed QR codes and older clients may still call /api/public/guest/*
  app.use("/api/public/guest", guestRouter);

  console.log("[Routes] All Express routes registered");
}
