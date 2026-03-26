/**
 * Front Office Portal Tests
 *
 * Validates:
 * - FO routes are registered in App.tsx
 * - FO pages export default components
 * - FOLayout has all nav items
 * - New pages (RoomStatus, ShiftHandoff, GuestCheckin) exist and compile
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(__dirname, "..");

function readFile(relPath: string): string {
  const fullPath = resolve(ROOT, relPath);
  if (!existsSync(fullPath)) throw new Error(`File not found: ${relPath}`);
  return readFileSync(fullPath, "utf-8");
}

describe("Front Office Portal — Route Registration", () => {
  const appTsx = readFile("client/src/App.tsx");

  it("imports all FO page components", () => {
    expect(appTsx).toContain("import FOOverviewPage");
    expect(appTsx).toContain("import FOQueuePage");
    expect(appTsx).toContain("import FONotificationsPage");
    expect(appTsx).toContain("import FORequestDetailPage");
    expect(appTsx).toContain("import FORoomStatusPage");
    expect(appTsx).toContain("import FOShiftHandoffPage");
    expect(appTsx).toContain("import FOGuestCheckinPage");
  });

  it("registers /fo/rooms route", () => {
    expect(appTsx).toContain('path="/fo/rooms"');
    expect(appTsx).toContain("component={FORoomStatusPage}");
  });

  it("registers /fo/checkin route", () => {
    expect(appTsx).toContain('path="/fo/checkin"');
    expect(appTsx).toContain("component={FOGuestCheckinPage}");
  });

  it("registers /fo/handoff route", () => {
    expect(appTsx).toContain('path="/fo/handoff"');
    expect(appTsx).toContain("component={FOShiftHandoffPage}");
  });

  it("registers /fo/queue/:id before /fo/queue (detail before list)", () => {
    const detailIdx = appTsx.indexOf('path="/fo/queue/:id"');
    const listIdx = appTsx.indexOf('path="/fo/queue" component');
    expect(detailIdx).toBeGreaterThan(-1);
    expect(listIdx).toBeGreaterThan(-1);
    expect(detailIdx).toBeLessThan(listIdx);
  });

  it("wraps FO routes in FOLayout", () => {
    expect(appTsx).toContain("<FOLayout>");
  });

  it("registers /fo/* wildcard in Router", () => {
    expect(appTsx).toContain('path="/fo/*"');
  });
});

describe("Front Office Portal — Page Files", () => {
  const pages = [
    "client/src/pages/fo/FOOverviewPage.tsx",
    "client/src/pages/fo/FOQueuePage.tsx",
    "client/src/pages/fo/FONotificationsPage.tsx",
    "client/src/pages/fo/FORequestDetailPage.tsx",
    "client/src/pages/fo/FORoomStatusPage.tsx",
    "client/src/pages/fo/FOShiftHandoffPage.tsx",
    "client/src/pages/fo/FOGuestCheckinPage.tsx",
  ];

  for (const page of pages) {
    const name = page.split("/").pop()!.replace(".tsx", "");

    it(`${name} file exists`, () => {
      expect(existsSync(resolve(ROOT, page))).toBe(true);
    });

    it(`${name} exports a default function`, () => {
      const content = readFile(page);
      expect(content).toMatch(/export default function \w+/);
    });
  }
});

describe("Front Office Portal — Layout Navigation", () => {
  const layout = readFile("client/src/layouts/FOLayout.tsx");

  it("has Overview nav item", () => {
    expect(layout).toContain('href="/fo"');
    expect(layout).toContain('label="Overview"');
  });

  it("has Request Queue nav item", () => {
    expect(layout).toContain('href="/fo/queue"');
    expect(layout).toContain('label="Request Queue"');
  });

  it("has Room Status nav item", () => {
    expect(layout).toContain('href="/fo/rooms"');
    expect(layout).toContain('label="Room Status"');
  });

  it("has Guest Check-in nav item", () => {
    expect(layout).toContain('href="/fo/checkin"');
    expect(layout).toContain('label="Guest Check-in"');
  });

  it("has Shift Handoff nav item", () => {
    expect(layout).toContain('href="/fo/handoff"');
    expect(layout).toContain('label="Shift Handoff"');
  });

  it("has Notifications nav item", () => {
    expect(layout).toContain('href="/fo/notifications"');
    expect(layout).toContain('label="Notifications"');
  });

  it("has role gating for FO access", () => {
    expect(layout).toContain("FRONT_DESK");
    expect(layout).toContain("FRONT_OFFICE");
    expect(layout).toContain("PROPERTY_ADMIN");
    expect(layout).toContain("SUPER_ADMIN");
  });
});

describe("Front Office Portal — Page Features", () => {
  it("FORoomStatusPage has room grid with status indicators", () => {
    const content = readFile("client/src/pages/fo/FORoomStatusPage.tsx");
    expect(content).toContain("Room Status Board");
    expect(content).toContain("vacant");
    expect(content).toContain("occupied");
    expect(content).toContain("service_active");
    expect(content).toContain("service_urgent");
    expect(content).toContain("SLA Breached");
    expect(content).toContain("trpc.crud.rooms.list.useQuery");
    expect(content).toContain("trpc.requests.listByProperty.useQuery");
  });

  it("FOShiftHandoffPage has handoff dialog and request sections", () => {
    const content = readFile("client/src/pages/fo/FOShiftHandoffPage.tsx");
    expect(content).toContain("Shift Handoff");
    expect(content).toContain("Complete Handoff");
    expect(content).toContain("Pending (Awaiting Assignment)");
    expect(content).toContain("Dispatched (Awaiting Provider)");
    expect(content).toContain("In Progress (Being Handled)");
    expect(content).toContain("trpc.requests.listByProperty.useQuery");
    expect(content).toContain("SLA breached");
  });

  it("FOGuestCheckinPage has token generation", () => {
    const content = readFile("client/src/pages/fo/FOGuestCheckinPage.tsx");
    expect(content).toContain("Guest Check-in");
    expect(content).toContain("Generate Token");
    expect(content).toContain("trpc.stayTokens.generateTestToken.useMutation");
    expect(content).toContain("trpc.crud.rooms.list.useQuery");
    expect(content).toContain("Stay Token");
    expect(content).toContain("24-hour");
  });

  it("FOOverviewPage has KPI cards and recent requests", () => {
    const content = readFile("client/src/pages/fo/FOOverviewPage.tsx");
    expect(content).toContain("Front Office Overview");
    expect(content).toContain("Pending");
    expect(content).toContain("Dispatched");
    expect(content).toContain("In Progress");
    expect(content).toContain("Done Today");
    expect(content).toContain("trpc.requests.listByProperty.useQuery");
  });

  it("FOQueuePage has SLA clock and assign/reject dialogs", () => {
    const content = readFile("client/src/pages/fo/FOQueuePage.tsx");
    expect(content).toContain("Request Queue");
    expect(content).toContain("SLAClock");
    expect(content).toContain("AssignDialog");
    expect(content).toContain("RejectDialog");
    expect(content).toContain("useFrontOfficeSSE");
    expect(content).toContain("trpc.requests.listByProperty.useQuery");
  });
});
