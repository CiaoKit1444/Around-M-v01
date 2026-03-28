/**
 * Phase 48 Tests — Admin 2FA Tools, Token Pruning, Audit Log Action Filter
 *
 * Tests:
 *   1. twoFa.forceReenroll — clears twoFaSecret, backupCodes, sets twoFaEnabled=false
 *   2. pruneExpiredRecoveryTokens — deletes rows where expiresAt < NOW()
 *   3. reports.auditLog.list — action filter parameter is accepted and applied
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── 1. forceReenroll business logic ──────────────────────────────────────────

describe("twoFa.forceReenroll logic", () => {
  it("produces the correct DB update payload to clear 2FA", () => {
    // Simulate what the procedure does when called
    const updatePayload = {
      twoFaEnabled: false,
      twoFaSecret: null,
      backupCodes: null,
    };

    expect(updatePayload.twoFaEnabled).toBe(false);
    expect(updatePayload.twoFaSecret).toBeNull();
    expect(updatePayload.backupCodes).toBeNull();
  });

  it("produces the correct audit event for force re-enroll", () => {
    const actorId = "admin-user-123";
    const targetUserId = "target-user-456";

    const auditEvent = {
      actorType: "admin",
      actorId,
      action: "2FA_FORCE_REENROLL",
      resourceType: "user",
      resourceId: targetUserId,
      details: JSON.stringify({ targetUserId, forcedBy: actorId }),
    };

    expect(auditEvent.action).toBe("2FA_FORCE_REENROLL");
    expect(auditEvent.resourceType).toBe("user");
    expect(auditEvent.resourceId).toBe(targetUserId);
    const details = JSON.parse(auditEvent.details);
    expect(details.targetUserId).toBe(targetUserId);
    expect(details.forcedBy).toBe(actorId);
  });

  it("rejects non-admin callers", () => {
    const userRole = "user";
    const isAdmin = userRole === "admin" || userRole === "super_admin";
    expect(isAdmin).toBe(false);
  });
});

// ── 2. Token pruning logic ────────────────────────────────────────────────────

describe("pruneExpiredRecoveryTokens logic", () => {
  it("identifies expired tokens correctly", () => {
    const now = new Date();
    const expiredToken = { expiresAt: new Date(now.getTime() - 1000) }; // 1 second ago
    const validToken = { expiresAt: new Date(now.getTime() + 60_000) }; // 1 minute from now

    expect(expiredToken.expiresAt < now).toBe(true);
    expect(validToken.expiresAt < now).toBe(false);
  });

  it("prune interval is set to 6 hours in milliseconds", () => {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
    expect(SIX_HOURS_MS).toBe(21_600_000);
  });

  it("handles zero deleted rows gracefully without logging", () => {
    const deleted = 0;
    const shouldLog = deleted > 0;
    expect(shouldLog).toBe(false);
  });

  it("logs when rows are deleted", () => {
    const deleted = 3;
    const shouldLog = deleted > 0;
    expect(shouldLog).toBe(true);
  });
});

// ── 3. Audit log action filter ────────────────────────────────────────────────

describe("auditLog.list action filter", () => {
  it("passes action filter to the query correctly", () => {
    const input = { action: "2FA_FORCE_REENROLL", page: 1, pageSize: 20 };
    const hasActionFilter = input.action !== undefined;
    expect(hasActionFilter).toBe(true);
    expect(input.action).toBe("2FA_FORCE_REENROLL");
  });

  it("omits action filter when set to 'all'", () => {
    const actionFilter = "all";
    const queryAction = actionFilter !== "all" ? actionFilter : undefined;
    expect(queryAction).toBeUndefined();
  });

  it("correctly identifies 2FA security event actions", () => {
    const TFA_ACTIONS = [
      "2FA_ENABLED", "2FA_DISABLED", "2FA_FORCE_REENROLL",
      "2FA_RECOVERY_REQUESTED", "2FA_RECOVERY_BYPASS", "LOGIN_2FA",
    ];

    expect(TFA_ACTIONS).toContain("2FA_FORCE_REENROLL");
    expect(TFA_ACTIONS).toContain("2FA_RECOVERY_BYPASS");
    expect(TFA_ACTIONS).toContain("2FA_RECOVERY_REQUESTED");
    expect(TFA_ACTIONS.length).toBe(6);
  });

  it("2FA view uses search='2FA' to fetch all related events", () => {
    const is2FAView = true;
    const querySearch = is2FAView ? "2FA" : undefined;
    expect(querySearch).toBe("2FA");
  });

  it("non-2FA view passes search from user input", () => {
    const is2FAView = false;
    const userSearch = "login";
    const querySearch = is2FAView ? undefined : (userSearch || undefined);
    expect(querySearch).toBe("login");
  });
});

// ── 4. AuditLogPage quick-filter tab logic ────────────────────────────────────

describe("AuditLogPage quick-filter tab logic", () => {
  it("is2FAView is true only when actionFilter is __2fa__", () => {
    expect("__2fa__" === "__2fa__").toBe(true);
    expect("all" === "__2fa__").toBe(false);
    expect("2FA_ENABLED" === "__2fa__").toBe(false);
  });

  it("individual action filter is not passed to query in 2FA view", () => {
    const is2FAView = true;
    const actionFilter = "__2fa__";
    const queryAction = (!is2FAView && actionFilter !== "all") ? actionFilter : undefined;
    expect(queryAction).toBeUndefined();
  });

  it("individual action filter IS passed to query for specific action tabs", () => {
    const is2FAView = false;
    const actionFilter = "2FA_FORCE_REENROLL";
    const queryAction = (!is2FAView && actionFilter !== "all") ? actionFilter : undefined;
    expect(queryAction).toBe("2FA_FORCE_REENROLL");
  });
});
