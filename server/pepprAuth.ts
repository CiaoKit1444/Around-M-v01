/**
 * Peppr Auth Service — Express-native authentication
 *
 * Replaces the FastAPI auth endpoints so login works in the published
 * Manus deployment without a separate Python process.
 *
 * Endpoints registered (all under /api/v1/auth):
 *   POST /login          — email + password login
 *   POST /sso-login      — SSO bridge (called by OAuth callback)
 *   GET  /me             — current user profile from JWT
 *   POST /refresh        — refresh access token
 *
 * Admin endpoints (under /api/v1/admin):
 *   GET    /sso-allowlist — list SSO allowlist entries
 *   POST   /sso-allowlist — add email to allowlist
 *   DELETE /sso-allowlist/:id — remove email from allowlist
 *   GET    /audit-log     — list audit events
 */
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { eq, desc, and, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  pepprUsers,
  pepprUserRoles,
  pepprSsoAllowlist,
  pepprAuditEvents,
} from "../drizzle/schema";

// ── Config ───────────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET || "change-me-in-production";
const JWT_ALGORITHM = "HS256";
const JWT_EXPIRY_HOURS = 24;
const SSO_BRIDGE_SECRET = process.env.SSO_BRIDGE_SECRET || "peppr-sso-bridge-secret-change-in-prod";

const secretKey = new TextEncoder().encode(JWT_SECRET);

// ── JWT Helpers ──────────────────────────────────────────────────────────────
async function createAccessToken(
  user: typeof pepprUsers.$inferSelect,
  roles: string[]
): Promise<string> {
  return new SignJWT({
    sub: user.userId,
    email: user.email,
    role: user.role || "",
    roles,
    partner_id: user.partnerId || null,
    property_id: user.propertyId || null,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${JWT_EXPIRY_HOURS}h`)
    .sign(secretKey);
}

async function createRefreshToken(
  user: typeof pepprUsers.$inferSelect
): Promise<string> {
  return new SignJWT({
    sub: user.userId,
    type: "refresh",
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secretKey);
}

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload;
  } catch {
    return null;
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getUserRoles(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, userId: string): Promise<string[]> {
  const rows = await db
    .select({ roleId: pepprUserRoles.roleId })
    .from(pepprUserRoles)
    .where(eq(pepprUserRoles.userId, userId));
  return rows.map((r) => r.roleId);
}

function buildUserProfile(user: typeof pepprUsers.$inferSelect, roles: string[]) {
  return {
    user_id: user.userId,
    email: user.email,
    full_name: user.fullName,
    mobile: user.mobile || null,
    role: user.role,
    position_id: user.positionId || null,
    partner_id: user.partnerId || null,
    property_id: user.propertyId || null,
    email_verified: user.emailVerified,
    status: user.status,
    twofa_enabled: user.twofaEnabled,
    roles,
    last_login_at: user.lastLoginAt?.toISOString() || null,
    created_at: user.createdAt?.toISOString() || null,
  };
}

async function recordAuditEvent(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  event: {
    actorType?: string;
    actorId?: string;
    action: string;
    resourceType?: string;
    resourceId?: string;
    details?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
  }
) {
  try {
    await db.insert(pepprAuditEvents).values({
      actorType: event.actorType || "USER",
      actorId: event.actorId || null,
      action: event.action,
      resourceType: event.resourceType || null,
      resourceId: event.resourceId || null,
      details: event.details || null,
      ipAddress: event.ipAddress || null,
      userAgent: event.userAgent || null,
    });
  } catch (err) {
    console.error("[PepprAuth] Failed to record audit event:", err);
  }
}

function getClientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

// ── Rate Limiting ───────────────────────────────────────────────────────────
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Array.from(rateLimitStore.entries()).forEach(([key, entry]) => {
    if (entry.resetAt <= now) rateLimitStore.delete(key);
  });
}, 5 * 60 * 1000);

/**
 * IP-based rate limiter middleware.
 * @param maxAttempts Max requests per window
 * @param windowMs Window duration in milliseconds
 */
function rateLimit(maxAttempts: number, windowMs: number) {
  return (req: Request, res: Response, next: () => void) => {
    const ip = getClientIp(req);
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      rateLimitStore.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxAttempts - entry.count);
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.setHeader("X-RateLimit-Limit", maxAttempts.toString());
    res.setHeader("X-RateLimit-Remaining", remaining.toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(entry.resetAt / 1000).toString());

    if (entry.count > maxAttempts) {
      res.setHeader("Retry-After", retryAfter.toString());
      res.status(429).json({
        detail: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retry_after: retryAfter,
      });
      return;
    }

    next();
  };
}

// Rate limit configs
const loginRateLimit = rateLimit(5, 60 * 1000);       // 5 attempts per minute
const ssoRateLimit = rateLimit(10, 60 * 1000);         // 10 attempts per minute
const refreshRateLimit = rateLimit(20, 60 * 1000);     // 20 attempts per minute
const passwordResetRateLimit = rateLimit(3, 60 * 1000); // 3 attempts per minute

// ── Route Registration ───────────────────────────────────────────────────────
export function registerPepprAuthRoutes(app: Express): void {
  // ── POST /api/v1/auth/login ─────────────────────────────────────────────
  app.post("/api/v1/auth/login", loginRateLimit, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        res.status(400).json({ detail: "Email and password are required" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ detail: "Database unavailable" });
        return;
      }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.email, email.toLowerCase()))
        .limit(1);

      const user = rows[0];
      if (!user) {
        res.status(401).json({ detail: "Invalid credentials. Please try again." });
        return;
      }

      // Check account status
      if (user.status !== "ACTIVE") {
        res.status(403).json({ detail: "Account is disabled" });
        return;
      }

      // Check lockout
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        res.status(423).json({ detail: "Account is temporarily locked. Try again later." });
        return;
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        // Increment failed attempts
        const attempts = (user.failedLoginAttempts || 0) + 1;
        const lockUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
        await db
          .update(pepprUsers)
          .set({
            failedLoginAttempts: attempts,
            lockedUntil: lockUntil,
          })
          .where(eq(pepprUsers.userId, user.userId));

        res.status(401).json({ detail: "Invalid credentials. Please try again." });
        return;
      }

      // Successful login — reset failed attempts
      await db
        .update(pepprUsers)
        .set({
          failedLoginAttempts: 0,
          lockedUntil: null,
          lastLoginAt: new Date(),
          lastLoginIp: getClientIp(req),
        })
        .where(eq(pepprUsers.userId, user.userId));

      const roles = await getUserRoles(db, user.userId);
      const accessToken = await createAccessToken(user, roles);
      const refreshToken = await createRefreshToken(user);

      await recordAuditEvent(db, {
        actorId: user.userId,
        action: "LOGIN",
        resourceType: "session",
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      res.json({
        success: true,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: JWT_EXPIRY_HOURS * 3600,
        },
        user: buildUserProfile(user, roles),
      });
    } catch (err) {
      console.error("[PepprAuth] Login error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/auth/sso-login ─────────────────────────────────────────
  app.post("/api/v1/auth/sso-login", ssoRateLimit, async (req: Request, res: Response) => {
    try {
      const { email, provider, provider_id, bridge_secret, open_id } = req.body;

      // Validate bridge secret
      if (bridge_secret !== SSO_BRIDGE_SECRET) {
        res.status(403).json({ detail: "Invalid bridge secret" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ detail: "Database unavailable" });
        return;
      }

      let user: typeof pepprUsers.$inferSelect | undefined;

      // Strategy 1: Find by email
      if (email) {
        const rows = await db
          .select()
          .from(pepprUsers)
          .where(eq(pepprUsers.email, email.toLowerCase()))
          .limit(1);
        user = rows[0];
      }

      // Strategy 2: Find by sso_provider_id (Manus openId)
      if (!user && (provider_id || open_id)) {
        const lookupId = provider_id || open_id;
        const rows = await db
          .select()
          .from(pepprUsers)
          .where(eq(pepprUsers.ssoProviderId, lookupId))
          .limit(1);
        user = rows[0];
      }

      // Strategy 3: Find by manus_open_id
      if (!user && open_id) {
        const rows = await db
          .select()
          .from(pepprUsers)
          .where(eq(pepprUsers.manusOpenId, open_id))
          .limit(1);
        user = rows[0];
      }

      if (!user) {
        // Check SSO allowlist — if email is on the list, return specific error
        if (email) {
          const allowlistRows = await db
            .select()
            .from(pepprSsoAllowlist)
            .where(
              and(
                eq(pepprSsoAllowlist.email, email.toLowerCase()),
                eq(pepprSsoAllowlist.status, "ACTIVE")
              )
            )
            .limit(1);

          if (allowlistRows.length > 0) {
            // Email is on allowlist but no Peppr account exists yet
            res.status(404).json({
              detail: "Email is on the SSO allowlist but no Peppr account exists. Please contact your administrator to create your account.",
              code: "SSO_NO_ACCOUNT",
            });
            return;
          }
        }

        res.status(404).json({
          detail: "No Peppr account found for this identity",
          code: "SSO_NO_ACCOUNT",
        });
        return;
      }

      // Auto-link SSO provider if not already linked
      if (provider_id || open_id) {
        const updates: Record<string, string> = {};
        if (!user.ssoProvider && provider) updates.ssoProvider = provider;
        if (!user.ssoProviderId && provider_id) updates.ssoProviderId = provider_id;
        if (!user.manusOpenId && open_id) updates.manusOpenId = open_id;

        if (Object.keys(updates).length > 0) {
          await db
            .update(pepprUsers)
            .set(updates as any)
            .where(eq(pepprUsers.userId, user.userId));
        }
      }

      // Update last login
      await db
        .update(pepprUsers)
        .set({
          lastLoginAt: new Date(),
          lastLoginIp: getClientIp(req),
        })
        .where(eq(pepprUsers.userId, user.userId));

      const roles = await getUserRoles(db, user.userId);
      const accessToken = await createAccessToken(user, roles);
      const refreshToken = await createRefreshToken(user);

      await recordAuditEvent(db, {
        actorId: user.userId,
        action: "LOGIN_SSO",
        resourceType: "session",
        details: { provider: provider || "manus", email: user.email, provider_id: provider_id || open_id },
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      res.json({
        success: true,
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: "Bearer",
          expires_in: JWT_EXPIRY_HOURS * 3600,
        },
        user: buildUserProfile(user, roles),
      });
    } catch (err) {
      console.error("[PepprAuth] SSO login error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── GET /api/v1/auth/me ─────────────────────────────────────────────────
  app.get("/api/v1/auth/me", async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ detail: "Not authenticated" });
        return;
      }

      const token = authHeader.slice(7);
      const payload = await verifyToken(token);
      if (!payload || !payload.sub) {
        res.status(401).json({ detail: "Invalid or expired token" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ detail: "Database unavailable" });
        return;
      }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, payload.sub as string))
        .limit(1);

      const user = rows[0];
      if (!user) {
        res.status(404).json({ detail: "User not found" });
        return;
      }

      const roles = await getUserRoles(db, user.userId);
      res.json(buildUserProfile(user, roles));
    } catch (err) {
      console.error("[PepprAuth] /me error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/auth/refresh ───────────────────────────────────────────
  app.post("/api/v1/auth/refresh", refreshRateLimit, async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body;
      if (!refresh_token) {
        res.status(400).json({ detail: "Refresh token is required" });
        return;
      }

      const payload = await verifyToken(refresh_token);
      if (!payload || payload.type !== "refresh" || !payload.sub) {
        res.status(401).json({ detail: "Invalid or expired refresh token" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ detail: "Database unavailable" });
        return;
      }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, payload.sub as string))
        .limit(1);

      const user = rows[0];
      if (!user || user.status !== "ACTIVE") {
        res.status(401).json({ detail: "User not found or inactive" });
        return;
      }

      const roles = await getUserRoles(db, user.userId);
      const accessToken = await createAccessToken(user, roles);
      const newRefreshToken = await createRefreshToken(user);

      res.json({
        success: true,
        tokens: {
          access_token: accessToken,
          refresh_token: newRefreshToken,
          token_type: "Bearer",
          expires_in: JWT_EXPIRY_HOURS * 3600,
        },
        user: buildUserProfile(user, roles),
      });
    } catch (err) {
      console.error("[PepprAuth] Refresh error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── GET /api/v1/admin/sso-allowlist ─────────────────────────────────────
  app.get("/api/v1/admin/sso-allowlist", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      const rows = await db
        .select()
        .from(pepprSsoAllowlist)
        .orderBy(desc(pepprSsoAllowlist.createdAt));

      res.json(rows.map((r) => ({
        id: r.id,
        email: r.email,
        note: r.note,
        added_by: r.addedBy,
        status: r.status,
        created_at: r.createdAt?.toISOString(),
        removed_at: r.removedAt?.toISOString() || null,
      })));
    } catch (err) {
      console.error("[PepprAuth] SSO allowlist list error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/admin/sso-allowlist ────────────────────────────────────
  app.post("/api/v1/admin/sso-allowlist", async (req: Request, res: Response) => {
    try {
      const { email, note } = req.body;
      if (!email) { res.status(400).json({ detail: "Email is required" }); return; }

      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      await db.insert(pepprSsoAllowlist).values({
        email: email.toLowerCase(),
        note: note || null,
        status: "ACTIVE",
      });

      res.json({ success: true, message: `${email} added to SSO allowlist` });
    } catch (err: any) {
      if (err?.code === "ER_DUP_ENTRY") {
        res.status(409).json({ detail: "Email already on the allowlist" });
        return;
      }
      console.error("[PepprAuth] SSO allowlist add error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── DELETE /api/v1/admin/sso-allowlist/:id ──────────────────────────────
  app.delete("/api/v1/admin/sso-allowlist/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) { res.status(400).json({ detail: "Invalid ID" }); return; }

      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      await db
        .update(pepprSsoAllowlist)
        .set({ status: "REMOVED", removedAt: new Date() })
        .where(eq(pepprSsoAllowlist.id, id));

      res.json({ success: true, message: "Entry removed from SSO allowlist" });
    } catch (err) {
      console.error("[PepprAuth] SSO allowlist delete error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── GET /api/v1/admin/audit-log ─────────────────────────────────────────
  app.get("/api/v1/admin/audit-log", async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const rows = await db
        .select()
        .from(pepprAuditEvents)
        .orderBy(desc(pepprAuditEvents.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(pepprAuditEvents);
      const total = countResult[0]?.count || 0;

      res.json({
        events: rows.map((r) => ({
          event_id: r.id,
          actor_type: r.actorType,
          actor_id: r.actorId,
          action: r.action,
          resource_type: r.resourceType,
          resource_id: r.resourceId,
          details: r.details,
          ip_address: r.ipAddress,
          user_agent: r.userAgent,
          created_at: r.createdAt?.toISOString(),
        })),
        total,
        limit,
        offset,
      });
    } catch (err) {
      console.error("[PepprAuth] Audit log error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/auth/forgot-password ───────────────────────────────────
  app.post("/api/v1/auth/forgot-password", passwordResetRateLimit, async (req: Request, res: Response) => {
    try {
      const { email, origin } = req.body;
      if (!email) {
        res.status(400).json({ detail: "Email is required" });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.email, email.toLowerCase()))
        .limit(1);

      const user = rows[0];

      // Always return success to prevent email enumeration
      if (!user || user.status !== "ACTIVE") {
        res.json({ success: true, message: "If an account exists with that email, a reset link has been generated." });
        return;
      }

      // Generate a short-lived reset token (15 minutes)
      const resetToken = await new SignJWT({
        sub: user.userId,
        email: user.email,
        type: "password_reset",
      })
        .setProtectedHeader({ alg: JWT_ALGORITHM })
        .setIssuedAt()
        .setExpirationTime("15m")
        .sign(secretKey);

      // Store the reset token hash in the user record for single-use validation
      const tokenHash = await bcrypt.hash(resetToken.slice(-16), 4);
      await db
        .update(pepprUsers)
        .set({ resetTokenHash: tokenHash, resetTokenExpiresAt: new Date(Date.now() + 15 * 60 * 1000) })
        .where(eq(pepprUsers.userId, user.userId));

      // Build the reset link
      const baseUrl = origin || "https://bo.peppr.vip";
      const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

      // Record audit event
      await recordAuditEvent(db, {
        actorId: user.userId,
        action: "PASSWORD_RESET_REQUESTED",
        resourceType: "user",
        resourceId: user.userId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      // Notify the project owner with the reset link
      try {
        const { notifyOwner } = await import("./_core/notification");
        await notifyOwner({
          title: `Password Reset Requested — ${user.email}`,
          content: `User ${user.fullName} (${user.email}) requested a password reset.\n\nReset link (valid for 15 minutes):\n${resetLink}\n\nIf this was not expected, please investigate.`,
        });
      } catch (notifyErr) {
        console.warn("[PepprAuth] Could not notify owner about password reset:", notifyErr);
      }

      res.json({
        success: true,
        message: "If an account exists with that email, a reset link has been generated. Please contact your administrator.",
        // In development, include the link for testing
        ...(process.env.NODE_ENV === "development" ? { _dev_reset_link: resetLink } : {}),
      });
    } catch (err) {
      console.error("[PepprAuth] Forgot password error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/auth/reset-password ────────────────────────────────────
  app.post("/api/v1/auth/reset-password", passwordResetRateLimit, async (req: Request, res: Response) => {
    try {
      const { token, new_password } = req.body;
      if (!token || !new_password) {
        res.status(400).json({ detail: "Token and new password are required" });
        return;
      }

      if (new_password.length < 8) {
        res.status(400).json({ detail: "Password must be at least 8 characters" });
        return;
      }

      // Verify the reset token
      const payload = await verifyToken(token);
      if (!payload || payload.type !== "password_reset" || !payload.sub) {
        res.status(400).json({ detail: "Invalid or expired reset token" });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, payload.sub as string))
        .limit(1);

      const user = rows[0];
      if (!user) {
        res.status(400).json({ detail: "Invalid reset token" });
        return;
      }

      // Verify single-use: check the stored token hash
      if (!user.resetTokenHash) {
        res.status(400).json({ detail: "This reset link has already been used" });
        return;
      }

      const tokenTail = token.slice(-16);
      const hashValid = await bcrypt.compare(tokenTail, user.resetTokenHash);
      if (!hashValid) {
        res.status(400).json({ detail: "Invalid reset token" });
        return;
      }

      // Check expiry
      if (user.resetTokenExpiresAt && new Date(user.resetTokenExpiresAt) < new Date()) {
        res.status(400).json({ detail: "Reset token has expired" });
        return;
      }

      // Hash the new password and update
      const newHash = await bcrypt.hash(new_password, 12);
      await db
        .update(pepprUsers)
        .set({
          passwordHash: newHash,
          resetTokenHash: null,
          resetTokenExpiresAt: null,
          failedLoginAttempts: 0,
          lockedUntil: null,
        })
        .where(eq(pepprUsers.userId, user.userId));

      await recordAuditEvent(db, {
        actorId: user.userId,
        action: "PASSWORD_RESET_COMPLETED",
        resourceType: "user",
        resourceId: user.userId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      res.json({ success: true, message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (err) {
      console.error("[PepprAuth] Reset password error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/admin/generate-reset-link ──────────────────────────────
  // Admin-only: generate a reset link for any user
  app.post("/api/v1/admin/generate-reset-link", async (req: Request, res: Response) => {
    try {
      const { user_id, origin } = req.body;
      if (!user_id) {
        res.status(400).json({ detail: "user_id is required" });
        return;
      }

      const db = await getDb();
      if (!db) { res.status(503).json({ detail: "Database unavailable" }); return; }

      const rows = await db
        .select()
        .from(pepprUsers)
        .where(eq(pepprUsers.userId, user_id))
        .limit(1);

      const user = rows[0];
      if (!user) {
        res.status(404).json({ detail: "User not found" });
        return;
      }

      const resetToken = await new SignJWT({
        sub: user.userId,
        email: user.email,
        type: "password_reset",
      })
        .setProtectedHeader({ alg: JWT_ALGORITHM })
        .setIssuedAt()
        .setExpirationTime("1h")
        .sign(secretKey);

      const tokenHash = await bcrypt.hash(resetToken.slice(-16), 4);
      await db
        .update(pepprUsers)
        .set({ resetTokenHash: tokenHash, resetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000) })
        .where(eq(pepprUsers.userId, user.userId));

      const baseUrl = origin || "https://bo.peppr.vip";
      const resetLink = `${baseUrl}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;

      await recordAuditEvent(db, {
        actorId: "admin",
        action: "ADMIN_PASSWORD_RESET_GENERATED",
        resourceType: "user",
        resourceId: user.userId,
        details: { target_email: user.email },
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      res.json({ success: true, reset_link: resetLink, expires_in: "1 hour" });
    } catch (err) {
      console.error("[PepprAuth] Generate reset link error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  console.log("[PepprAuth] Express-native auth routes registered (no FastAPI dependency)");
}
