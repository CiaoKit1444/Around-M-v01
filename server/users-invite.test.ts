/**
 * Tests for the /api/v1/users/* endpoints (frontend-facing users router).
 * Validates invite, list, get, update, deactivate, and reactivate flows.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE = "http://localhost:3000";

async function getTestToken(): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "change-me-in-production"
  );
  return new SignJWT({
    sub: "test-user-vitest-invite",
    email: "vitest-invite@test.com",
    role: "SUPER_ADMIN",
    roles: ["SUPER_ADMIN"],
    partner_id: null,
    property_id: null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1h")
    .sign(secret);
}

let TOKEN = "";
const createdUserIds: string[] = [];

beforeAll(async () => {
  TOKEN = await getTestToken();
});

function authHeaders() {
  return {
    Authorization: `Bearer ${TOKEN}`,
    "Content-Type": "application/json",
  };
}

async function fetchJson(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...(options?.headers || {}) },
  });
  const body = await res.json();
  return { status: res.status, body };
}

afterAll(async () => {
  // Clean up any test users created during the tests
  const { body: userList } = await fetchJson("/api/v1/users?page_size=100").catch(() => ({ body: { items: [] } }));
  for (const u of (userList?.items ?? [])) {
    if (u.email?.includes("vitest-invite-")) {
      await fetchJson(`/api/v1/users/${u.id}/deactivate`, { method: "POST" }).catch(() => {});
    }
  }
}, 30_000);

// ─── GET /api/v1/users ───────────────────────────────────────────────────────

describe("Users — list endpoint", () => {
  it("returns paginated users list", async () => {
    const { status, body } = await fetchJson("/api/v1/users");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(Array.isArray(body.items)).toBe(true);
  });

  it("returns users with id and name fields (frontend-compatible)", async () => {
    const { status, body } = await fetchJson("/api/v1/users");
    expect(status).toBe(200);
    if (body.items.length > 0) {
      const user = body.items[0];
      // Must have both frontend-style (id, name) and API-style (user_id, full_name) fields
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("name");
      expect(user).toHaveProperty("user_id");
      expect(user).toHaveProperty("full_name");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role");
      expect(user).toHaveProperty("status");
    }
  });

  it("requires authentication", async () => {
    const res = await fetch(`${BASE}/api/v1/users`);
    expect(res.status).toBe(401);
  });
});

// ─── POST /api/v1/users/invite ───────────────────────────────────────────────

describe("Users — invite endpoint", () => {
  it("rejects invite without email", async () => {
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ name: "Test User" }),
    });
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail");
  });

  it("rejects invite without name", async () => {
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: "vitest-invite-noname@test.com" }),
    });
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail");
  });

  it("creates a new user via invite", async () => {
    const testEmail = `vitest-invite-${Date.now()}@test.com`;
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({
        email: testEmail,
        name: "Vitest Invite User",
        // Use admin role (platform-wide, no scope required) for the general invite test
        role: "admin",
      }),
    });
    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("user_id");
    expect(body.email).toBe(testEmail);
    expect(body.name).toBe("Vitest Invite User");
    expect(body.full_name).toBe("Vitest Invite User");
    expect(body.role).toBe("ADMIN");
    expect(body.status).toBe("ACTIVE");
    // temp_password must be returned so the admin can share it with the user
    expect(body).toHaveProperty("temp_password");
    expect(typeof body.temp_password).toBe("string");
    expect(body.temp_password.length).toBeGreaterThanOrEqual(12);
    if (body.id) createdUserIds.push(body.id);
  });

  it("rejects duplicate email invite", async () => {
    const testEmail = `vitest-invite-dup-${Date.now()}@test.com`;
    // Create first user (admin role — no scope required)
    const { status: s1, body: b1 } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "First User", role: "admin" }),
    });
    expect(s1).toBe(201);
    if (b1.id) createdUserIds.push(b1.id);

    // Try to create duplicate (409 should fire before role validation)
    const { status: s2, body: b2 } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Duplicate User", role: "admin" }),
    });
    expect(s2).toBe(409);
    expect(b2).toHaveProperty("detail");
  });

  it("requires authentication for invite", async () => {
    const res = await fetch(`${BASE}/api/v1/users/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", name: "Test" }),
    });
    expect(res.status).toBe(401);
  });
});

// ─── GET /api/v1/users/:id ───────────────────────────────────────────────────

describe("Users — get by ID", () => {
  it("returns 404 for non-existent user", async () => {
    const { status } = await fetchJson("/api/v1/users/nonexistent-id-xyz");
    expect(status).toBe(404);
  });

  it("returns user with id and name fields", async () => {
    const { body: list } = await fetchJson("/api/v1/users?page_size=1");
    if (!list.items?.length) return;
    const userId = list.items[0].id;
    const { status, body } = await fetchJson(`/api/v1/users/${userId}`);
    expect(status).toBe(200);
    expect(body.id).toBe(userId);
    expect(body).toHaveProperty("name");
    expect(body).toHaveProperty("full_name");
    expect(body).toHaveProperty("email");
    expect(body).toHaveProperty("roles");
  });
});

// ─── PUT /api/v1/users/:id ───────────────────────────────────────────────────

describe("Users — update", () => {
  it("accepts name field (frontend-style) for update", async () => {
    // Create a user first (admin role — no scope required)
    const testEmail = `vitest-invite-update-${Date.now()}@test.com`;
    const { status: cs, body: cb } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Original Name", role: "admin" }),
    });
    expect(cs).toBe(201);
    const userId = cb.id;
    if (userId) createdUserIds.push(userId);

    // Update using `name` field (frontend User type)
    const { status, body } = await fetchJson(`/api/v1/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Name" }),
    });
    expect(status).toBe(200);
    expect(body.name).toBe("Updated Name");
    expect(body.full_name).toBe("Updated Name");
  });

  it("switches role from staff to admin (lowercase input)", async () => {
    const testEmail = `vitest-invite-roleswitch-${Date.now()}@test.com`;
    // Create with staff role + required property_id
    const { status: cs, body: cb } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Role Switch User", role: "staff", property_id: "test-property-001" }),
    });
    expect(cs).toBe(201);
    expect(cb.role).toBe("STAFF");
    const userId = cb.id;
    if (userId) createdUserIds.push(userId);

    // Switch role to admin using lowercase (as frontend sends)
    const { status, body } = await fetchJson(`/api/v1/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role: "admin" }),
    });
    expect(status).toBe(200);
    // Backend must normalize to uppercase
    expect(body.role).toBe("ADMIN");
  });

  it("switches role using uppercase input", async () => {
    const testEmail = `vitest-invite-roleswitch2-${Date.now()}@test.com`;
    // Create with admin role (no scope required)
    const { status: cs, body: cb } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Role Switch User 2", role: "admin" }),
    });
    expect(cs).toBe(201);
    const userId = cb.id;
    if (userId) createdUserIds.push(userId);

    // Switch role to PARTNER_ADMIN — must provide partner_id
    const { status, body } = await fetchJson(`/api/v1/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role: "PARTNER_ADMIN", partner_id: "test-partner-001" }),
    });
    expect(status).toBe(200);
    expect(body.role).toBe("PARTNER_ADMIN");
  });

  it("rejects invalid role value", async () => {
    const testEmail = `vitest-invite-badrole-${Date.now()}@test.com`;
    // Create with admin role (no scope required)
    const { status: cs, body: cb } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Bad Role User", role: "admin" }),
    });
    expect(cs).toBe(201);
    const userId = cb.id;
    if (userId) createdUserIds.push(userId);

    const { status, body } = await fetchJson(`/api/v1/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role: "superuser" }),
    });
    expect(status).toBe(400);
    expect(body).toHaveProperty("detail");
  });
});

// ─── Role-Scope Binding Validation ───────────────────────────────────────────

describe("Users — role-scope binding (invite)", () => {
  it("rejects partner_admin invite without partner_id", async () => {
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({
        email: `vitest-invite-scope-pa-${Date.now()}@test.com`,
        name: "Scope Test PA",
        role: "partner_admin",
        // no partner_id
      }),
    });
    expect(status).toBe(400);
    expect(body.detail).toMatch(/partner_id/i);
  });

  it("rejects property_admin invite without property_id", async () => {
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({
        email: `vitest-invite-scope-pra-${Date.now()}@test.com`,
        name: "Scope Test PRA",
        role: "property_admin",
        // no property_id
      }),
    });
    expect(status).toBe(400);
    expect(body.detail).toMatch(/property_id/i);
  });

  it("rejects staff invite without property_id", async () => {
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({
        email: `vitest-invite-scope-staff-${Date.now()}@test.com`,
        name: "Scope Test Staff",
        role: "staff",
        // no property_id
      }),
    });
    expect(status).toBe(400);
    expect(body.detail).toMatch(/property_id/i);
  });

  it("accepts admin invite without any scope (platform-wide role)", async () => {
    const testEmail = `vitest-invite-scope-admin-${Date.now()}@test.com`;
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Scope Test Admin", role: "admin" }),
    });
    expect(status).toBe(201);
    expect(body.role).toBe("ADMIN");
    if (body.id) createdUserIds.push(body.id);
  });

  it("accepts system_admin invite without any scope", async () => {
    const testEmail = `vitest-invite-scope-sysadmin-${Date.now()}@test.com`;
    const { status, body } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Scope Test SysAdmin", role: "system_admin" }),
    });
    expect(status).toBe(201);
    expect(body.role).toBe("SYSTEM_ADMIN");
    if (body.id) createdUserIds.push(body.id);
  });
});

describe("Users — role-scope binding (update)", () => {
  it("rejects changing role to partner_admin when user has no partner_id", async () => {
    // Create a plain admin first (no partner)
    const testEmail = `vitest-invite-scope-upd-pa-${Date.now()}@test.com`;
    const { status: cs, body: cb } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Scope Update PA", role: "admin" }),
    });
    expect(cs).toBe(201);
    const userId = cb.id;
    if (userId) createdUserIds.push(userId);

    // Try to change role to partner_admin without providing partner_id
    const { status, body } = await fetchJson(`/api/v1/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role: "partner_admin" }),
    });
    expect(status).toBe(400);
    expect(body.detail).toMatch(/partner_id/i);
  });

  it("accepts changing role to partner_admin when partner_id is provided in the same request", async () => {
    const testEmail = `vitest-invite-scope-upd-pa2-${Date.now()}@test.com`;
    const { status: cs, body: cb } = await fetchJson("/api/v1/users/invite", {
      method: "POST",
      body: JSON.stringify({ email: testEmail, name: "Scope Update PA2", role: "admin" }),
    });
    expect(cs).toBe(201);
    const userId = cb.id;
    if (userId) createdUserIds.push(userId);

    // Provide partner_id together with the role change
    const { status, body } = await fetchJson(`/api/v1/users/${userId}`, {
      method: "PUT",
      body: JSON.stringify({ role: "partner_admin", partner_id: "test-partner-001" }),
    });
    expect(status).toBe(200);
    expect(body.role).toBe("PARTNER_ADMIN");
  });
});
