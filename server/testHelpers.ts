/**
 * Shared test helpers for E2E and integration tests.
 *
 * Provides:
 *  - makeJwt()   — sign a peppr JWT with the live JWT_SECRET
 *  - fetchJson() — GET with Bearer auth
 *  - postJson()  — POST with Bearer auth
 *  - patchJson() — PATCH with Bearer auth
 *  - putJson()   — PUT with Bearer auth
 *  - deleteReq() — DELETE with Bearer auth
 *  - SEED        — well-known IDs from the seed dataset
 *
 * JWT_SECRET is loaded from .env by vitest.config.ts.
 * All HTTP calls hit the live dev server at http://localhost:3000.
 */
import { SignJWT } from "jose";

const BASE = "http://localhost:3000";

// ── JWT helpers ───────────────────────────────────────────────────────────────

export async function makeJwt(
  payload: Record<string, unknown> = {},
  expiresIn = "1h"
): Promise<string> {
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET ?? "change-me-in-production"
  );
  return new SignJWT({ type: "peppr", role: "admin", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(expiresIn)
    .sign(secret);
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────

async function req(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<{ status: number; body: any }> {
  const init: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, init);
  let parsed: any;
  const ct = r.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    parsed = await r.json();
  } else {
    parsed = await r.text();
  }
  return { status: r.status, body: parsed };
}

export const fetchJson = (path: string, token: string) =>
  req("GET", path, token);

export const postJson = (path: string, token: string, body: unknown) =>
  req("POST", path, token, body);

export const patchJson = (path: string, token: string, body: unknown) =>
  req("PATCH", path, token, body);

export const putJson = (path: string, token: string, body: unknown) =>
  req("PUT", path, token, body);

export const deleteReq = (path: string, token: string) =>
  req("DELETE", path, token);

// ── Seed constants ────────────────────────────────────────────────────────────
// These IDs are the ACTUAL UUIDs from the live seed database.
// Verified against the live server on 2026-03-27.

export const SEED = {
  // Partners (using property IDs as partner proxies — partner table uses same UUIDs)
  SIAM_PARTNER_ID: "3d968c10-8f30-4b39-a",   // The Siam Riverside Hotel partner
  PEARL_PARTNER_ID: "7bb45879-4a59-4d4c-9",  // Andaman Pearl Beach Resort partner

  // Properties
  SIAM_PROPERTY_ID: "3d968c10-8f30-4b39-a",  // The Siam Riverside Hotel
  PEARL_PROPERTY_ID: "7bb45879-4a59-4d4c-9", // Andaman Pearl Beach Resort

  // Rooms (actual UUIDs from peppr_rooms table)
  SIAM_ROOM_103: "d7b7f56d-d4d3-4b8a-b",     // Room 103 at Siam Riverside Hotel
  PEARL_ROOM_102: "3d7fe8d5-a06c-43ae-8",    // Room 102 at Andaman Pearl Beach Resort

  // QR codes (human-readable IDs)
  SIAM_QR_PUBLIC: "QR-SIAM-103",             // public access, Standard Room Package
  SIAM_QR_RESTRICTED: "QR-SIAM-201",         // restricted access
  PEARL_QR_PUBLIC: "QR-PEARL-102",            // restricted access (Pearl)
  SUITE_QR_MULTI: "QR-3D968C10-301",         // public, Suite Premium Package (7 items)

  // Providers (actual UUID from peppr_providers table)
  SEED_PROVIDER_ID: "eaffd014-13bd-43da-9",  // Thai Wellness Spa Co.

  // Users
  SIAM_USER_ID: "siam-admin-001",
  SIAM_FO_USER_ID: "siam-fo-001",
};
