/**
 * Contingency improvements tests:
 * 1. Cookie helper utility (setCookie, getCookie, deleteCookie)
 * 2. Role persistence via cookies (useActiveRole stores in cookie)
 * 3. AdminGuard reads from cookie
 * 4. Self-referential redirects removed from App.tsx
 * 5. DB index on manus_open_id
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── 1. Cookie helper tests (pure logic, no DOM) ──────────────────────────────

describe("Cookie helpers module", () => {
  it("exports setCookie, getCookie, deleteCookie functions", async () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/lib/cookies.ts"),
      "utf-8"
    );
    expect(src).toContain("export function setCookie");
    expect(src).toContain("export function getCookie");
    expect(src).toContain("export function deleteCookie");
  });

  it("setCookie uses SameSite=Lax and path=/", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/lib/cookies.ts"),
      "utf-8"
    );
    expect(src).toContain("SameSite=Lax");
    expect(src).toContain("path=/");
  });

  it("setCookie sets a 30-day max-age", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/lib/cookies.ts"),
      "utf-8"
    );
    // 30 days = 60 * 60 * 24 * 30 = 2592000
    expect(src).toContain("60 * 60 * 24 * 30");
  });

  it("getCookie uses encodeURIComponent/decodeURIComponent for safety", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/lib/cookies.ts"),
      "utf-8"
    );
    expect(src).toContain("encodeURIComponent");
    expect(src).toContain("decodeURIComponent");
  });

  it("deleteCookie sets max-age=0", () => {
    const src = readFileSync(
      resolve(__dirname, "../client/src/lib/cookies.ts"),
      "utf-8"
    );
    expect(src).toContain("max-age=0");
  });
});

// ── 2. useActiveRole stores role in both cookie and localStorage ─────────────

describe("useActiveRole cookie persistence", () => {
  const hookSrc = readFileSync(
    resolve(__dirname, "../client/src/hooks/useActiveRole.ts"),
    "utf-8"
  );

  it("imports cookie helpers from @/lib/cookies", () => {
    expect(hookSrc).toContain("from \"@/lib/cookies\"");
  });

  it("uses getCookie to load stored role", () => {
    expect(hookSrc).toContain("getCookie(COOKIE_KEY)");
  });

  it("uses setCookie to save role", () => {
    expect(hookSrc).toContain("setCookie(COOKIE_KEY,");
  });

  it("uses deleteCookie to clear role", () => {
    expect(hookSrc).toContain("deleteCookie(COOKIE_KEY)");
  });

  it("falls back to localStorage when cookie is missing", () => {
    // loadStoredRole should try localStorage after cookie
    expect(hookSrc).toContain("localStorage.getItem(STORAGE_KEY)");
  });

  it("migrates localStorage role to cookie on first read", () => {
    // When reading from localStorage, it should also write to cookie
    expect(hookSrc).toContain("setCookie(COOKIE_KEY, lsRaw)");
  });

  it("saveStoredRole writes to both stores", () => {
    expect(hookSrc).toContain("localStorage.setItem(STORAGE_KEY, json)");
    expect(hookSrc).toContain("setCookie(COOKIE_KEY, json)");
  });
});

// ── 3. AdminGuard reads role from cookie ─────────────────────────────────────

describe("AdminGuard cookie-based role check", () => {
  const guardSrc = readFileSync(
    resolve(__dirname, "../client/src/components/AdminGuard.tsx"),
    "utf-8"
  );

  it("imports getCookie from cookies module", () => {
    expect(guardSrc).toContain("import { getCookie }");
  });

  it("checks cookie for active role before localStorage", () => {
    expect(guardSrc).toContain("getCookie(\"peppr_active_role\")");
  });

  it("has hasStoredRole function that checks both stores", () => {
    expect(guardSrc).toContain("function hasStoredRole()");
    expect(guardSrc).toContain("getCookie(\"peppr_active_role\")");
    expect(guardSrc).toContain("localStorage.getItem(\"peppr_active_role\")");
  });

  it("uses hasStoredRole() instead of direct localStorage check", () => {
    // Should NOT have the old pattern of directly checking localStorage
    expect(guardSrc).not.toContain("const storedRole = localStorage.getItem(\"peppr_active_role\")");
  });
});

// ── 4. Self-referential redirects removed from App.tsx ───────────────────────

describe("App.tsx route cleanup", () => {
  const appSrc = readFileSync(
    resolve(__dirname, "../client/src/App.tsx"),
    "utf-8"
  );

  it("does NOT contain self-referential /admin/login → /admin/login redirect", () => {
    // The old pattern was: <Route path="/admin/login">{() => <Redirect to="/admin/login" />}</Route>
    expect(appSrc).not.toMatch(/Redirect to="\/admin\/login"/);
  });

  it("does NOT contain self-referential /admin/blocked redirect", () => {
    expect(appSrc).not.toMatch(/Redirect to="\/admin\/blocked"/);
  });

  it("does NOT contain self-referential /admin/sso-complete redirect", () => {
    expect(appSrc).not.toMatch(/Redirect to="\/admin\/sso-complete"/);
  });

  it("does NOT contain self-referential /admin/role-switch redirect", () => {
    expect(appSrc).not.toMatch(/Redirect to="\/admin\/role-switch"/);
  });

  it("still has the actual auth route components (not redirects)", () => {
    expect(appSrc).toContain('path="/admin/login" component={LoginPage}');
    expect(appSrc).toContain('path="/admin/role-switch" component={RoleSwitchPage}');
    expect(appSrc).toContain('path="/admin/sso-complete" component={SsoCompletePage}');
  });

  it("has a comment explaining the removal", () => {
    expect(appSrc).toContain("self-referential");
  });
});

// ── 5. RoleSwitchPage uses cookie-based remember role ────────────────────────

describe("RoleSwitchPage cookie-based remember role", () => {
  const roleSwitchSrc = readFileSync(
    resolve(__dirname, "../client/src/pages/auth/RoleSwitchPage.tsx"),
    "utf-8"
  );

  it("imports cookie helpers", () => {
    expect(roleSwitchSrc).toContain("import { getCookie, setCookie, deleteCookie }");
  });

  it("has getRememberedRole that checks cookie first", () => {
    expect(roleSwitchSrc).toContain("function getRememberedRole");
    expect(roleSwitchSrc).toContain("getCookie(REMEMBER_ROLE_KEY)");
  });

  it("has setRememberedRole that writes to both stores", () => {
    expect(roleSwitchSrc).toContain("function setRememberedRole");
    expect(roleSwitchSrc).toContain("localStorage.setItem(REMEMBER_ROLE_KEY, value)");
    expect(roleSwitchSrc).toContain("setCookie(REMEMBER_ROLE_KEY, value)");
  });

  it("has clearRememberedRole that clears both stores", () => {
    expect(roleSwitchSrc).toContain("function clearRememberedRole");
    expect(roleSwitchSrc).toContain("localStorage.removeItem(REMEMBER_ROLE_KEY)");
    expect(roleSwitchSrc).toContain("deleteCookie(REMEMBER_ROLE_KEY)");
  });

  it("does NOT import REMEMBER_ROLE_KEY from RoleCarousel", () => {
    // RoleSwitchPage still imports the RoleCarousel *component*, but should
    // NOT import REMEMBER_ROLE_KEY from it — it defines its own local constant.
    expect(roleSwitchSrc).not.toContain("import { REMEMBER_ROLE_KEY } from");
    expect(roleSwitchSrc).not.toContain("import { RoleCarousel, REMEMBER_ROLE_KEY }");
  });
});

// ── 6. Route ordering verification ──────────────────────────────────────────

describe("Route ordering in App.tsx (detail before list)", () => {
  const appSrc = readFileSync(
    resolve(__dirname, "../client/src/App.tsx"),
    "utf-8"
  );

  it("QR detail route comes before QR list route", () => {
    const detailIdx = appSrc.indexOf('path="/admin/qr/:id"');
    const listIdx = appSrc.indexOf('path="/admin/qr" component={QRManagementPage}');
    expect(detailIdx).toBeGreaterThan(0);
    expect(listIdx).toBeGreaterThan(0);
    expect(detailIdx).toBeLessThan(listIdx);
  });

  it("Provider detail route comes before provider list route", () => {
    const detailIdx = appSrc.indexOf('path="/admin/providers/:id"');
    const listIdx = appSrc.indexOf('path="/admin/providers" component={ProvidersPage}');
    expect(detailIdx).toBeGreaterThan(0);
    expect(listIdx).toBeGreaterThan(0);
    expect(detailIdx).toBeLessThan(listIdx);
  });

  it("Template detail route comes before template list route", () => {
    const detailIdx = appSrc.indexOf('path="/admin/templates/:id"');
    const listIdx = appSrc.indexOf('path="/admin/templates" component={TemplatesPage}');
    expect(detailIdx).toBeGreaterThan(0);
    expect(listIdx).toBeGreaterThan(0);
    expect(detailIdx).toBeLessThan(listIdx);
  });

  it("Catalog detail route comes before catalog list route", () => {
    const detailIdx = appSrc.indexOf('path="/admin/catalog/:id"');
    const listIdx = appSrc.indexOf('path="/admin/catalog" component={CatalogPage}');
    expect(detailIdx).toBeGreaterThan(0);
    expect(listIdx).toBeGreaterThan(0);
    expect(detailIdx).toBeLessThan(listIdx);
  });

  it("User detail route comes before user list route", () => {
    const detailIdx = appSrc.indexOf('path="/admin/users/:id"');
    const listIdx = appSrc.indexOf('path="/admin/users" component={UsersPage}');
    expect(detailIdx).toBeGreaterThan(0);
    expect(listIdx).toBeGreaterThan(0);
    expect(detailIdx).toBeLessThan(listIdx);
  });
});
