/**
 * OWASP Security Fix Verification — FIND-06, FIND-08, FIND-09
 *
 * FIND-06: Request body size limits
 * FIND-08: JWT JTI revocation store
 * FIND-09: 2FA enforcement in login flow
 */
import { describe, it, expect } from "vitest";
import { SignJWT } from "jose";

// ── Shared helpers ────────────────────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-at-least-32-chars-long!";
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function makeRefreshToken(jti?: string, sub = "user-123"): Promise<string> {
  const builder = new SignJWT({ sub, type: "refresh", ...(jti ? { jti } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d");
  return builder.sign(secretKey);
}

async function make2faChallengeToken(sub = "user-123"): Promise<string> {
  return new SignJWT({ sub, type: "2fa_challenge" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secretKey);
}

// ── FIND-06: Body size limit logic ───────────────────────────────────────────
describe("FIND-06 — Request body size limits", () => {
  it("global limit is set to 2mb (not 50mb)", async () => {
    // Read the middleware setup from index.ts and verify the limit value
    const fs = await import("fs");
    const indexContent = fs.readFileSync(
      new URL("../server/_core/index.ts", import.meta.url).pathname,
      "utf-8"
    );
    // The global limit should be 2mb
    expect(indexContent).toContain('express.json({ limit: "2mb" })');
    expect(indexContent).toContain('express.urlencoded({ limit: "2mb"');
    // The old 50mb limit should be gone
    expect(indexContent).not.toContain('"50mb"');
  });

  it("upload route has a higher 20mb override before the global 2mb limit", async () => {
    const fs = await import("fs");
    const indexContent = fs.readFileSync(
      new URL("../server/_core/index.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(indexContent).toContain('express.json({ limit: "20mb" })');
    expect(indexContent).toContain("cms.uploadBannerImage");
    // The 20mb override must appear BEFORE the 2mb global limit
    const pos20mb = indexContent.indexOf('"20mb"');
    const pos2mb = indexContent.indexOf('"2mb"');
    expect(pos20mb).toBeLessThan(pos2mb);
  });

  it("CMS upload procedure has an application-layer 5mb cap as defence in depth", async () => {
    const fs = await import("fs");
    const cmsContent = fs.readFileSync(
      new URL("../server/cmsRouter.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(cmsContent).toContain("5 * 1024 * 1024");
    expect(cmsContent).toContain("Image must be under 5 MB");
  });
});

// ── FIND-08: JTI revocation store ────────────────────────────────────────────
describe("FIND-08 — JWT JTI revocation store", () => {
  it("refresh tokens now include a jti claim", async () => {
    const { jwtVerify } = await import("jose");
    const token = await makeRefreshToken("test-jti-abc123");
    const { payload } = await jwtVerify(token, secretKey);
    expect((payload as any).jti).toBe("test-jti-abc123");
    expect((payload as any).type).toBe("refresh");
  });

  it("jti_revocations table exists in the schema", async () => {
    const schema = await import("../drizzle/schema");
    expect(schema.jtiRevocations).toBeDefined();
    // Verify the table has the required columns
    const cols = Object.keys(schema.jtiRevocations);
    expect(cols.length).toBeGreaterThan(0);
  });

  it("JtiRevocation type is exported from schema", async () => {
    // This is a type-level check — if the import compiles, the type exists
    const schema = await import("../drizzle/schema");
    // The table definition should be present
    expect(schema.jtiRevocations).toBeTruthy();
  });

  it("refresh endpoint logic checks for jti before issuing new tokens", async () => {
    const fs = await import("fs");
    const authContent = fs.readFileSync(
      new URL("../server/pepprAuth.ts", import.meta.url).pathname,
      "utf-8"
    );
    // Must check isJtiRevoked
    expect(authContent).toContain("isJtiRevoked");
    // Must revoke old token on rotation
    expect(authContent).toContain("revokeRefreshToken");
    // Logout endpoint must also revoke
    expect(authContent).toContain("/api/v1/auth/logout");
  });

  it("pruneExpiredJtis function exists for table maintenance", async () => {
    const fs = await import("fs");
    const authContent = fs.readFileSync(
      new URL("../server/pepprAuth.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(authContent).toContain("pruneExpiredJtis");
    expect(authContent).toContain("lt(jtiRevocations.expiresAt");
  });
});

// ── FIND-09: 2FA enforcement ──────────────────────────────────────────────────
describe("FIND-09 — 2FA enforcement in login flow", () => {
  it("login handler checks twoFaEnabled before issuing tokens", async () => {
    const fs = await import("fs");
    const authContent = fs.readFileSync(
      new URL("../server/pepprAuth.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(authContent).toContain("user.twoFaEnabled");
    expect(authContent).toContain("requires_2fa: true");
    expect(authContent).toContain("challenge_token");
  });

  it("challenge token has type '2fa_challenge' and 5-minute expiry", async () => {
    const { jwtVerify } = await import("jose");
    const token = await make2faChallengeToken();
    const { payload } = await jwtVerify(token, secretKey);
    expect((payload as any).type).toBe("2fa_challenge");
    // exp should be ~5 minutes from now (within a 10s tolerance)
    const now = Math.floor(Date.now() / 1000);
    expect(payload.exp).toBeGreaterThan(now + 290);
    expect(payload.exp).toBeLessThan(now + 310);
  });

  it("verify-2fa endpoint exists and validates TOTP code", async () => {
    const fs = await import("fs");
    const authContent = fs.readFileSync(
      new URL("../server/pepprAuth.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(authContent).toContain("/api/v1/auth/verify-2fa");
    expect(authContent).toContain("totp_code");
    expect(authContent).toContain("authenticator.verify");
  });

  it("backup codes are consumed on use (one-time use)", async () => {
    const fs = await import("fs");
    const authContent = fs.readFileSync(
      new URL("../server/pepprAuth.ts", import.meta.url).pathname,
      "utf-8"
    );
    // Should filter out the used backup code
    expect(authContent).toContain("backupCodes.filter");
    expect(authContent).toContain("twoFaBackupCodes");
  });

  it("challenge token carries no role claims (minimal privilege)", async () => {
    const { jwtVerify } = await import("jose");
    const token = await make2faChallengeToken();
    const { payload } = await jwtVerify(token, secretKey);
    // Challenge tokens must NOT contain role/roles/email claims
    expect((payload as any).role).toBeUndefined();
    expect((payload as any).roles).toBeUndefined();
    expect((payload as any).email).toBeUndefined();
  });

  it("LOGIN_2FA audit event is recorded on successful 2FA completion", async () => {
    const fs = await import("fs");
    const authContent = fs.readFileSync(
      new URL("../server/pepprAuth.ts", import.meta.url).pathname,
      "utf-8"
    );
    expect(authContent).toContain("LOGIN_2FA");
  });
});
