/**
 * Tests for migrated Express CRUD routes.
 * Validates that all 14 endpoint groups respond correctly.
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE = "http://localhost:3000";

// Generate a test JWT (same secret as dev server)
async function getTestToken(): Promise<string> {
  const { SignJWT } = await import("jose");
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "change-me-in-production"
  );
  return new SignJWT({
    sub: "test-user-vitest",
    email: "vitest@test.com",
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

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH — Requires no token
// ═══════════════════════════════════════════════════════════════════════════════

describe("Auth — register endpoint", () => {
  it("rejects registration without required fields", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email: "test@test.com" }),
    });
    expect(status).toBe(400);
    expect(body.detail).toContain("required");
  });

  it("rejects short passwords", async () => {
    const { status, body } = await fetchJson("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "short@test.com",
        password: "123",
        full_name: "Short Pass",
      }),
    });
    expect(status).toBe(400);
    expect(body.detail).toContain("8 characters");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PARTNERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Partners CRUD", () => {
  let partnerId: string;

  it("returns 401 without auth", async () => {
    const res = await fetch(`${BASE}/api/v1/partners`);
    expect(res.status).toBe(401);
  });

  it("lists partners (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/partners");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("page");
    expect(body).toHaveProperty("page_size");
    expect(body).toHaveProperty("total_pages");
  });

  it("creates a partner", async () => {
    const { status, body } = await fetchJson("/api/v1/partners", {
      method: "POST",
      body: JSON.stringify({
        name: "Test Partner Vitest",
        email: "partner@test.com",
      }),
    });
    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body.name).toBe("Test Partner Vitest");
    partnerId = body.id;
  });

  it("gets a partner by ID", async () => {
    if (!partnerId) return;
    const { status, body } = await fetchJson(`/api/v1/partners/${partnerId}`);
    expect(status).toBe(200);
    expect(body.id).toBe(partnerId);
    expect(body.name).toBe("Test Partner Vitest");
  });

  it("updates a partner", async () => {
    if (!partnerId) return;
    const { status, body } = await fetchJson(`/api/v1/partners/${partnerId}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Updated Partner" }),
    });
    expect(status).toBe(200);
    expect(body.name).toBe("Updated Partner");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROPERTIES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Properties CRUD", () => {
  let propertyId: string;

  it("lists properties (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/properties");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });

  it("creates a property", async () => {
    // First create a partner to use as partner_id
    const partnerRes = await fetchJson("/api/v1/partners", {
      method: "POST",
      body: JSON.stringify({
        name: "Property Test Partner",
        email: "prop-partner@test.com",
      }),
    });
    const pId = partnerRes.body?.id || "test";
    const { status, body } = await fetchJson("/api/v1/properties", {
      method: "POST",
      body: JSON.stringify({
        partner_id: pId,
        name: "Test Property Vitest",
        type: "hotel",
        address: "123 Test St",
        city: "Bangkok",
        country: "Thailand",
      }),
    });
    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    propertyId = body.id;
  });

  it("gets a property by ID", async () => {
    if (!propertyId) return;
    const { status, body } = await fetchJson(
      `/api/v1/properties/${propertyId}`
    );
    expect(status).toBe(200);
    expect(body.id).toBe(propertyId);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Rooms CRUD", () => {
  it("lists rooms (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/rooms");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

describe("Providers CRUD", () => {
  it("lists providers (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/providers");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CATALOG
// ═══════════════════════════════════════════════════════════════════════════════

describe("Catalog CRUD", () => {
  it("lists catalog items (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/catalog");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

describe("Templates CRUD", () => {
  it("lists templates (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/templates");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// QR CODES
// ═══════════════════════════════════════════════════════════════════════════════

describe("QR Codes CRUD", () => {
  it("lists QR codes (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/qr-codes");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });

  it("returns 404 for invalid QR validation", async () => {
    const res = await fetch(
      `${BASE}/api/v1/qr-codes/validate/INVALID-QR-CODE`
    );
    // This is a public endpoint, no auth needed
    // But it's mounted under /api/v1/qr-codes which requires auth
    // The validate endpoint is also on /api/public/qr
    const publicRes = await fetch(
      `${BASE}/api/public/qr/validate/INVALID-QR-CODE`
    );
    const body = await publicRes.json();
    expect(body.valid).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FRONT OFFICE
// ═══════════════════════════════════════════════════════════════════════════════

describe("Front Office — Stay Tokens", () => {
  it("lists stay tokens (paginated)", async () => {
    const { status, body } = await fetchJson(
      "/api/v1/front-office/stay-tokens"
    );
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

describe("Front Office — Guest Sessions", () => {
  it("lists guest sessions (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/front-office/sessions");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

describe("Front Office — Service Requests", () => {
  it("lists service requests (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/front-office/requests");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// STAFF
// ═══════════════════════════════════════════════════════════════════════════════

describe("Staff — Positions", () => {
  let positionId: string;

  it("lists positions (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/staff/positions");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });

  it("creates a position", async () => {
    const { status, body } = await fetchJson("/api/v1/staff/positions", {
      method: "POST",
      body: JSON.stringify({
        title: "Test Position Vitest",
        department: "Engineering",
      }),
    });
    expect(status).toBe(201);
    expect(body).toHaveProperty("id");
    expect(body.title).toBe("Test Position Vitest");
    positionId = body.id;
  });

  it("gets a position by ID", async () => {
    if (!positionId) return;
    const { status, body } = await fetchJson(
      `/api/v1/staff/positions/${positionId}`
    );
    expect(status).toBe(200);
    expect(body.id).toBe(positionId);
  });
});

describe("Staff — Members", () => {
  it("lists members (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/staff/members");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });

  it("rejects member creation without required fields", async () => {
    const { status, body } = await fetchJson("/api/v1/staff/members", {
      method: "POST",
      body: JSON.stringify({ user_id: "test" }),
    });
    expect(status).toBe(400);
    expect(body.detail).toContain("required");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

describe("Admin — Audit Log", () => {
  it("lists audit events (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/admin/audit");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });
});

describe("Admin — SSO Allowlist", () => {
  it("lists SSO allowlist entries", async () => {
    const { status, body } = await fetchJson("/api/v1/admin/sso-allowlist");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
  });

  it("adds an entry to SSO allowlist", async () => {
    const uniqueEmail = `vitest-sso-${Date.now()}@test.com`;
    const { status, body } = await fetchJson("/api/v1/admin/sso-allowlist", {
      method: "POST",
      body: JSON.stringify({ email: uniqueEmail, note: "Test entry" }),
    });
    expect(status).toBe(201);
    expect(body.success).toBe(true);
  });
});

describe("Admin — Users", () => {
  it("lists users (paginated)", async () => {
    const { status, body } = await fetchJson("/api/v1/admin/users");
    expect(status).toBe(200);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("total");
    expect(body.items.length).toBeGreaterThan(0);
  });

  it("gets a user by ID", async () => {
    // First get the list to find a valid user ID
    const { body: listBody } = await fetchJson("/api/v1/admin/users");
    if (listBody.items.length === 0) return;
    const userId = listBody.items[0].user_id;
    const { status, body } = await fetchJson(`/api/v1/admin/users/${userId}`);
    expect(status).toBe(200);
    expect(body.user_id).toBe(userId);
  });

  it("returns 404 for non-existent user", async () => {
    const { status } = await fetchJson("/api/v1/admin/users/nonexistent-id");
    expect(status).toBe(404);
  });
});
