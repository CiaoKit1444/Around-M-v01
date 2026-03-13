/**
 * Route index — registers all migrated Express routes.
 * These replace the FastAPI proxy endpoints.
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

export function registerMigratedRoutes(app: Express) {
  // Partners
  app.use("/api/v1/partners", partnersRouter);

  // Properties
  app.use("/api/v1/properties", propertiesRouter);

  // Rooms
  app.use("/api/v1/rooms", roomsRouter);

  // Service Providers
  app.use("/api/v1/providers", providersRouter);

  // Catalog Items
  app.use("/api/v1/catalog", catalogRouter);

  // Service Templates
  app.use("/api/v1/templates", templatesRouter);

  // QR Codes
  app.use("/api/v1/qr-codes", qrcodesRouter);

  // Front Office (stay tokens, guest sessions, service requests)
  app.use("/api/v1/front-office", frontofficeRouter);

  // Staff (positions + members)
  app.use("/api/v1/staff", staffRouter);

  // Admin (audit, SSO allowlist, users)
  app.use("/api/v1/admin", adminRouter);

  // Public guest endpoints (same routes, different base)
  app.use("/api/public", frontofficeRouter);

  // QR validation (public)
  app.use("/api/public/qr", qrcodesRouter);

  console.log("[Routes] All migrated Express routes registered");
}
