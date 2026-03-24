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
import usersRouter from "./users";
import guestRouter from "./guest";
import propertyQrRouter from "./property-qr";

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

  // Property-scoped QR Codes (frontend API contract)
  app.use("/api/v1/properties/:propertyId/qr", propertyQrRouter);

  // Front Office (stay tokens, guest sessions, service requests)
  app.use("/api/v1/front-office", frontofficeRouter);

  // Staff (positions + members)
  app.use("/api/v1/staff", staffRouter);

  // Admin (audit, SSO allowlist, users)
  app.use("/api/v1/admin", adminRouter);

  // Users — dedicated router for /api/v1/users/* (frontend compatibility)
  app.use("/api/v1/users", usersRouter);

  // Public guest endpoints — dedicated guest router
  app.use("/api/public/guest", guestRouter);

  // Public front-office (legacy mount)
  app.use("/api/public", frontofficeRouter);

  // Public QR validation — guest router has /qr/:qrCodeId/status internally
  app.use("/api/v1/public", guestRouter);
  app.use("/api/public/qr", qrcodesRouter);

  console.log("[Routes] All migrated Express routes registered");
}
