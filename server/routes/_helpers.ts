/**
 * Shared helpers for Express route handlers.
 * Provides pagination, UUID generation, and auth middleware.
 *
 * Auth strategy (dual-auth):
 *   1. Bearer JWT (legacy FastAPI flow) — Authorization header
 *   2. Manus OAuth session cookie — app_session_id cookie
 *   The middleware tries Bearer first, then falls back to the session cookie.
 *   This ensures the Express CRUD routes work for both auth methods.
 */
import type { Request, Response, NextFunction } from "express";
import { sql, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { jwtVerify } from "jose";
import { parse as parseCookieHeader } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { getDb } from "../db";
import { pepprUsers, pepprUserRoles } from "../../drizzle/schema";

// SECURITY: Fail fast if JWT_SECRET is missing — never fall back to a hardcoded value.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "[routes/_helpers] JWT_SECRET environment variable is not set. " +
    "Set it to a cryptographically random string of at least 32 characters."
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
const secretKey = new TextEncoder().encode(JWT_SECRET);

// ── UUID-like ID generation ──────────────────────────────────────────────────
export function generateId(): string {
  return nanoid(21);
}

// ── Pagination helpers ───────────────────────────────────────────────────────
export interface PaginationInput {
  page: number;
  pageSize: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export function parsePagination(req: Request): PaginationInput {
  return {
    page: Math.max(1, parseInt(req.query.page as string) || 1),
    pageSize: Math.min(100, Math.max(1, parseInt(req.query.page_size as string) || 20)),
    search: (req.query.search as string) || undefined,
    sortBy: (req.query.sort_by as string) || undefined,
    sortOrder: (req.query.sort_order as string) === "desc" ? "desc" : "asc",
  };
}

export function paginatedResponse<T>(items: T[], total: number, pagination: PaginationInput) {
  return {
    items,
    total,
    page: pagination.page,
    page_size: pagination.pageSize,
    total_pages: Math.ceil(total / pagination.pageSize),
  };
}

export async function countRows(db: any, table: any, where?: any): Promise<number> {
  const query = where
    ? db.select({ count: sql<number>`count(*)` }).from(table).where(where)
    : db.select({ count: sql<number>`count(*)` }).from(table);
  const result = await query;
  return Number(result[0]?.count || 0);
}

// ── Auth middleware (dual: Bearer JWT + Manus OAuth cookie) ──────────────────
export interface PepprJwtPayload {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  partner_id: string | null;
  property_id: string | null;
}

/**
 * Try to extract user from Bearer JWT (legacy FastAPI flow).
 */
async function extractFromBearerToken(req: Request): Promise<PepprJwtPayload | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as PepprJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Try to extract user from Manus OAuth session cookie.
 * Verifies the session JWT, then looks up the peppr_users record
 * by manus_open_id to build a PepprJwtPayload-compatible object.
 */
async function extractFromSessionCookie(req: Request): Promise<PepprJwtPayload | null> {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  const cookies = parseCookieHeader(cookieHeader);
  const sessionCookie = cookies[COOKIE_NAME];
  if (!sessionCookie) return null;

  try {
    const { payload } = await jwtVerify(sessionCookie, secretKey, {
      algorithms: ["HS256"],
    });
    const openId = payload.openId as string;
    if (!openId) return null;

    // Look up peppr_users by manus_open_id
    const db = await getDb();
    if (!db) return null;

    const [pepprUser] = await db
      .select()
      .from(pepprUsers)
      .where(eq(pepprUsers.manusOpenId, openId))
      .limit(1);

    if (!pepprUser) return null;

    // Fetch role assignments
    const roleRows = await db
      .select()
      .from(pepprUserRoles)
      .where(eq(pepprUserRoles.userId, pepprUser.userId));

    const roles = roleRows.length > 0
      ? roleRows.map((r) => r.roleId)
      : [pepprUser.role ?? "USER"];

    return {
      sub: pepprUser.userId,
      email: pepprUser.email,
      role: pepprUser.role ?? "USER",
      roles,
      partner_id: pepprUser.partnerId ?? null,
      property_id: pepprUser.propertyId ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Extract Peppr user from request — tries Bearer JWT first, then session cookie.
 */
export async function extractPepprUser(req: Request): Promise<PepprJwtPayload | null> {
  // 1. Try Bearer JWT (legacy FastAPI flow)
  const bearerUser = await extractFromBearerToken(req);
  if (bearerUser) return bearerUser;

  // 2. Fallback: try Manus OAuth session cookie
  return extractFromSessionCookie(req);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  extractPepprUser(req).then((user) => {
    if (!user) {
      res.status(401).json({ detail: "Authentication required" });
      return;
    }
    (req as any).pepprUser = user;
    next();
  }).catch(() => {
    res.status(401).json({ detail: "Authentication required" });
  });
}

// ── Error wrapper ────────────────────────────────────────────────────────────
export function asyncHandler(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
}

// ── Client IP helper ─────────────────────────────────────────────────────────
export function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}
