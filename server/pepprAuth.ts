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
import { eq, desc, and, sql, lt } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TOTP } from "otplib";
const authenticator = new TOTP();
import { getDb } from "./db";
import {
  pepprUsers,
  pepprUserRoles,
  pepprSsoAllowlist,
  pepprAuditEvents,
  jtiRevocations,
} from "../drizzle/schema";

// ── Config ───────────────────────────────────────────────────────────────────
// SECURITY: Fail fast if required secrets are missing — never fall back to
// hardcoded values, as that would allow token forgery with a known key.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "[pepprAuth] JWT_SECRET environment variable is not set. " +
    "Set it to a cryptographically random string of at least 32 characters."
  );
}
if (!process.env.SSO_BRIDGE_SECRET) {
  throw new Error(
    "[pepprAuth] SSO_BRIDGE_SECRET environment variable is not set. " +
    "Set it to a cryptographically random string of at least 32 characters."
  );
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = "HS256";
const JWT_EXPIRY_HOURS = 24;
const SSO_BRIDGE_SECRET = process.env.SSO_BRIDGE_SECRET;

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

const REFRESH_TOKEN_TTL_DAYS = 30;

async function createRefreshToken(
  user: typeof pepprUsers.$inferSelect
): Promise<string> {
  // FIND-08: Embed a unique jti so the token can be individually revoked.
  const jti = nanoid(36);
  return new SignJWT({
    sub: user.userId,
    type: "refresh",
    jti,
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_DAYS}d`)
    .sign(secretKey);
}

/** FIND-08: Revoke a refresh token by recording its jti in the DB. */
async function revokeRefreshToken(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  jti: string,
  userId: string,
  reason: "logout" | "password_change" | "admin_revoke" = "logout"
): Promise<void> {
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(jtiRevocations).ignore().values({ jti, userId, reason, expiresAt });
}

/** FIND-08: Return true if the jti has been revoked. */
async function isJtiRevoked(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  jti: string
): Promise<boolean> {
  const rows = await db
    .select({ jti: jtiRevocations.jti })
    .from(jtiRevocations)
    .where(eq(jtiRevocations.jti, jti))
    .limit(1);
  return rows.length > 0;
}

/** FIND-08: Prune expired JTI rows (call periodically to keep the table small). */
async function pruneExpiredJtis(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<void> {
  await db.delete(jtiRevocations).where(lt(jtiRevocations.expiresAt, new Date()));
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
    twofa_enabled: user.twoFaEnabled,
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

      // FIND-09: Enforce 2FA challenge when twoFaEnabled is true.
      // Return a partial-login response — no tokens are issued yet.
      // The client must call POST /api/v1/auth/verify-2fa with the TOTP code
      // and the ephemeral challenge token to complete authentication.
      if (user.twoFaEnabled && user.twoFaSecret) {
        // Issue a short-lived (5-min) challenge token that carries no role claims.
        const challengeToken = await new SignJWT({
          sub: user.userId,
          type: "2fa_challenge",
        })
          .setProtectedHeader({ alg: JWT_ALGORITHM })
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(secretKey);

        res.json({
          success: false,
          requires_2fa: true,
          challenge_token: challengeToken,
        });
        return;
      }

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

  // ── POST /api/v1/auth/verify-2fa (FIND-09) ──────────────────────────────
  // Completes a 2FA-gated login. Accepts the challenge_token from /login
  // and the TOTP code from the user's authenticator app.
  app.post("/api/v1/auth/verify-2fa", loginRateLimit, async (req: Request, res: Response) => {
    try {
      const { challenge_token, totp_code } = req.body;
      if (!challenge_token || !totp_code) {
        res.status(400).json({ detail: "challenge_token and totp_code are required" });
        return;
      }

      // Verify the short-lived challenge token
      const payload = await verifyToken(challenge_token);
      if (!payload || (payload as any).type !== "2fa_challenge" || !payload.sub) {
        res.status(401).json({ detail: "Invalid or expired challenge token" });
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
      if (!user || user.status !== "ACTIVE") {
        res.status(401).json({ detail: "User not found or inactive" });
        return;
      }

      // Verify TOTP code against stored secret
      if (!user.twoFaSecret) {
        res.status(500).json({ detail: "2FA secret not configured for this account" });
        return;
      }
      const totpValid = await authenticator.verify(totp_code, { secret: user.twoFaSecret });
      if (!totpValid) {
        // Check backup codes
        const backupCodes = (user.twoFaBackupCodes as string[] | null) ?? [];
        const backupIndex = backupCodes.indexOf(totp_code);
        if (backupIndex === -1) {
          res.status(401).json({ detail: "Invalid 2FA code" });
          return;
        }
        // Consume the backup code (one-time use)
        const updatedCodes = backupCodes.filter((_, i) => i !== backupIndex);
        await db.update(pepprUsers).set({ twoFaBackupCodes: updatedCodes }).where(eq(pepprUsers.userId, user.userId));
      }

      const roles = await getUserRoles(db, user.userId);
      const accessToken = await createAccessToken(user, roles);
      const refreshToken = await createRefreshToken(user);

      await recordAuditEvent(db, {
        actorId: user.userId,
        action: "LOGIN_2FA",
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
      console.error("[PepprAuth] verify-2fa error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/auth/logout (FIND-08) ──────────────────────────────────
  // Revokes the refresh token's JTI so it cannot be used to obtain new tokens.
  app.post("/api/v1/auth/logout", async (req: Request, res: Response) => {
    try {
      const { refresh_token } = req.body;
      if (refresh_token) {
        const payload = await verifyToken(refresh_token);
        if (payload && (payload as any).type === "refresh" && (payload as any).jti && payload.sub) {
          const db = await getDb();
          if (db) {
            await revokeRefreshToken(db, (payload as any).jti as string, payload.sub as string, "logout");
            // Opportunistically prune expired JTIs (best-effort, non-blocking)
            pruneExpiredJtis(db).catch(() => {});
          }
        }
      }
      res.json({ success: true });
    } catch (err) {
      console.error("[PepprAuth] Logout error:", err);
      res.json({ success: true }); // Always succeed from the client's perspective
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
      if (!payload || (payload as any).type !== "refresh" || !payload.sub) {
        res.status(401).json({ detail: "Invalid or expired refresh token" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ detail: "Database unavailable" });
        return;
      }

      // FIND-08: Reject revoked tokens
      const jti = (payload as any).jti as string | undefined;
      if (jti && await isJtiRevoked(db, jti)) {
        res.status(401).json({ detail: "Refresh token has been revoked" });
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

      // FIND-08: Revoke the old token (rotation — one-time use refresh tokens)
      if (jti) {
        await revokeRefreshToken(db, jti, user.userId, "logout");
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

  // NOTE: SSO allowlist and audit-log endpoints have been migrated to server/routes/admin.ts

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
      const resetLink = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;

      // Record audit event
      await recordAuditEvent(db, {
        actorId: user.userId,
        action: "PASSWORD_RESET_REQUESTED",
        resourceType: "user",
        resourceId: user.userId,
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      // Send password reset email (SMTP if configured, otherwise owner notification)
      try {
        const { sendPasswordResetEmail, isSmtpConfigured } = await import("./email");
        await sendPasswordResetEmail({
          to: user.email!,
          userName: user.fullName || "User",
          resetLink,
          expiresIn: "15 minutes",
        });

        const deliveryMethod = isSmtpConfigured() ? "email" : "owner notification";
        console.log(`[PepprAuth] Password reset sent via ${deliveryMethod} for ${user.email}`);
      } catch (emailErr) {
        console.warn("[PepprAuth] Could not send password reset:", emailErr);
      }

      res.json({
        success: true,
        message: "If an account exists with that email, a reset link has been sent.",
        // In development, include the link for testing
        ...(process.env.NODE_ENV === "development" ? { _dev_reset_link: resetLink } : {}),
      });
    } catch (err) {
      console.error("[PepprAuth] Forgot password error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  // ── POST /api/v1/admin/reset-password ────────────────────────────────────
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
      const resetLink = `${baseUrl}/admin/reset-password?token=${encodeURIComponent(resetToken)}`;

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

  // ── POST /api/v1/auth/register ── Admin-only: create a new user account ──
  app.post("/api/v1/auth/register", async (req: Request, res: Response) => {
    try {
      const { email, password, full_name, mobile, role } = req.body;
      if (!email || !password || !full_name) {
        res.status(400).json({ detail: "email, password, and full_name are required" });
        return;
      }
      if (password.length < 8) {
        res.status(400).json({ detail: "Password must be at least 8 characters" });
        return;
      }

      // Verify caller is authenticated (admin)
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ detail: "Authentication required" });
        return;
      }
      const token = authHeader.slice(7);
      try {
        await jwtVerify(token, secretKey);
      } catch {
        res.status(401).json({ detail: "Invalid or expired token" });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(503).json({ detail: "Database unavailable" });
        return;
      }

      // Check if email already exists
      const existing = await db.select({ userId: pepprUsers.userId }).from(pepprUsers)
        .where(eq(pepprUsers.email, email.toLowerCase())).limit(1);
      if (existing[0]) {
        res.status(409).json({ detail: "A user with this email already exists" });
        return;
      }

      const { nanoid } = await import("nanoid");
      const userId = nanoid(12);
      const passwordHash = await bcrypt.hash(password, 12);

      await db.insert(pepprUsers).values({
        userId,
        email: email.toLowerCase(),
        passwordHash,
        fullName: full_name,
        mobile: mobile || null,
        role: role || "STAFF",
        emailVerified: true,
        status: "ACTIVE",
      });

      await recordAuditEvent(db, {
        actorId: "admin",
        action: "USER_CREATED",
        resourceType: "user",
        resourceId: userId,
        details: { email, full_name, role: role || "STAFF" },
        ipAddress: getClientIp(req),
        userAgent: req.headers["user-agent"] || "",
      });

      res.status(201).json({ user_id: userId, email: email.toLowerCase(), full_name });
    } catch (err) {
      console.error("[PepprAuth] Register error:", err);
      res.status(500).json({ detail: "Internal server error" });
    }
  });

  console.log("[PepprAuth] Express-native auth routes registered (no FastAPI dependency)");
}
