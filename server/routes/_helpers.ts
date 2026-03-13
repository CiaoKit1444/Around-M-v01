/**
 * Shared helpers for Express route handlers.
 * Provides pagination, UUID generation, and auth middleware.
 */
import type { Request, Response, NextFunction } from "express";
import { sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
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

// ── Auth middleware (Peppr JWT from Authorization header) ─────────────────────
export interface PepprJwtPayload {
  sub: string;
  email: string;
  role: string;
  roles: string[];
  partner_id: string | null;
  property_id: string | null;
}

export async function extractPepprUser(req: Request): Promise<PepprJwtPayload | null> {
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
