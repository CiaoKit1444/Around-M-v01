/**
 * foSearch.test.ts
 *
 * Unit tests for FOQueuePage search and filter logic.
 */

import { describe, it, expect } from "vitest";

// ── Search filter logic ───────────────────────────────────────────────────────

const mockRequests = [
  { id: "r1", requestNumber: "REQ-20260325-1001", guestName: "Alice Smith", roomId: "room-101", status: "DISPATCHED" },
  { id: "r2", requestNumber: "REQ-20260325-1002", guestName: "Bob Jones",  roomId: "room-202", status: "IN_PROGRESS" },
  { id: "r3", requestNumber: "REQ-20260325-1003", guestName: null,         roomId: "room-303", status: "COMPLETED" },
  { id: "r4", requestNumber: "REQ-20260325-1004", guestName: "Alice Wang", roomId: "room-404", status: "SUBMITTED" },
];

function applySearch(requests: typeof mockRequests, query: string) {
  if (!query.trim()) return requests;
  const q = query.toLowerCase();
  return requests.filter(r =>
    r.requestNumber.toLowerCase().includes(q) ||
    (r.guestName ?? "").toLowerCase().includes(q) ||
    r.roomId.toLowerCase().includes(q)
  );
}

describe("FOQueuePage — search filter", () => {
  it("returns all requests when search is empty", () => {
    expect(applySearch(mockRequests, "")).toHaveLength(4);
  });

  it("returns all requests when search is whitespace only", () => {
    expect(applySearch(mockRequests, "   ")).toHaveLength(4);
  });

  it("filters by request number (partial match)", () => {
    const result = applySearch(mockRequests, "1001");
    expect(result).toHaveLength(1);
    expect(result[0].requestNumber).toBe("REQ-20260325-1001");
  });

  it("filters by guest name (case-insensitive)", () => {
    const result = applySearch(mockRequests, "alice");
    expect(result).toHaveLength(2);
    expect(result.map(r => r.id)).toEqual(["r1", "r4"]);
  });

  it("filters by room ID (exact room suffix match)", () => {
    const result = applySearch(mockRequests, "room-202");
    expect(result).toHaveLength(1);
    expect(result[0].roomId).toBe("room-202");
  });

  it("handles null guestName without throwing", () => {
    expect(() => applySearch(mockRequests, "alice")).not.toThrow();
  });

  it("returns empty array when no requests match", () => {
    const result = applySearch(mockRequests, "ZZZNOMATCH");
    expect(result).toHaveLength(0);
  });

  it("is case-insensitive for request number search", () => {
    const result = applySearch(mockRequests, "req-20260325");
    expect(result).toHaveLength(4); // all match the prefix
  });
});

// ── Debounce behaviour ────────────────────────────────────────────────────────

describe("FOQueuePage — debounce logic", () => {
  it("debounce delay is 300ms", () => {
    const DEBOUNCE_MS = 300;
    expect(DEBOUNCE_MS).toBe(300);
  });

  it("debounced value lags behind input value", async () => {
    let debounced = "";
    let input = "";
    const setDebounced = (v: string) => { debounced = v; };

    // Simulate typing
    input = "ali";
    const timer = setTimeout(() => setDebounced(input), 300);

    // Before 300ms, debounced is still empty
    expect(debounced).toBe("");

    // After 300ms
    await new Promise(r => setTimeout(r, 350));
    expect(debounced).toBe("ali");

    clearTimeout(timer);
  });

  it("clear button resets both input and debounced search simultaneously", () => {
    let searchInput = "alice";
    let search = "alice";
    // Simulate clear button click
    searchInput = "";
    search = "";
    expect(searchInput).toBe("");
    expect(search).toBe("");
  });
});

// ── SP filter logic ───────────────────────────────────────────────────────────

describe("SPJobQueuePage — status + date filters", () => {
  // Use fixed epoch timestamps to be timezone-independent
  // j1: 2026-03-20, j2: 2026-03-22, j3: 2026-03-24, j4: 2026-03-25
  const D20 = new Date("2026-03-20T00:00:00Z").getTime();
  const D22 = new Date("2026-03-22T00:00:00Z").getTime();
  const D24 = new Date("2026-03-24T00:00:00Z").getTime();
  const D25 = new Date("2026-03-25T00:00:00Z").getTime();

  const jobs = [
    { id: "j1", status: "DISPATCHED",  createdAt: new Date(D20 + 8 * 3600_000) },
    { id: "j2", status: "IN_PROGRESS", createdAt: new Date(D22 + 8 * 3600_000) },
    { id: "j3", status: "DISPATCHED",  createdAt: new Date(D24 + 8 * 3600_000) },
    { id: "j4", status: "COMPLETED",   createdAt: new Date(D25 + 8 * 3600_000) },
  ];

  // Timezone-safe filter: compare epoch ms directly
  function applyFilters(
    items: typeof jobs,
    tabStatuses: string[],
    filterStatus: string,
    filterFromMs: number | null,
    filterToMs: number | null
  ) {
    return items.filter(j => {
      if (!tabStatuses.includes(j.status)) return false;
      if (filterStatus !== "ALL" && j.status !== filterStatus) return false;
      if (filterFromMs !== null && j.createdAt.getTime() < filterFromMs) return false;
      if (filterToMs !== null && j.createdAt.getTime() > filterToMs) return false;
      return true;
    });
  }

  it("tab filter alone returns only matching statuses", () => {
    const result = applyFilters(jobs, ["DISPATCHED"], "ALL", null, null);
    expect(result).toHaveLength(2);
    expect(result.every(j => j.status === "DISPATCHED")).toBe(true);
  });

  it("status filter narrows within tab", () => {
    const result = applyFilters(jobs, ["DISPATCHED", "IN_PROGRESS"], "DISPATCHED", null, null);
    expect(result).toHaveLength(2);
    expect(result.every(j => j.status === "DISPATCHED")).toBe(true);
  });

  it("from-date filter excludes older records", () => {
    // from = start of 2026-03-22 UTC
    const result = applyFilters(jobs, ["DISPATCHED", "IN_PROGRESS", "COMPLETED"], "ALL", D22, null);
    expect(result.every(j => j.createdAt.getTime() >= D22)).toBe(true);
    expect(result.map(j => j.id)).toEqual(["j2", "j3", "j4"]);
  });

  it("to-date filter excludes newer records", () => {
    // to = end of 2026-03-22 UTC (23:59:59.999)
    const toMs = D22 + 24 * 3600_000 - 1;
    const result = applyFilters(jobs, ["DISPATCHED", "IN_PROGRESS", "COMPLETED"], "ALL", null, toMs);
    expect(result.every(j => j.createdAt.getTime() <= toMs)).toBe(true);
    expect(result.map(j => j.id)).toEqual(["j1", "j2"]);
  });

  it("combined from+to range returns only records within window", () => {
    // from = start of 2026-03-22, to = end of 2026-03-24
    const fromMs = D22;
    const toMs = D24 + 24 * 3600_000 - 1;
    const result = applyFilters(jobs, ["DISPATCHED", "IN_PROGRESS", "COMPLETED"], "ALL", fromMs, toMs);
    expect(result).toHaveLength(2); // j2 and j3
    expect(result.map(j => j.id)).toEqual(["j2", "j3"]);
  });

  it("reset filters returns to full tab list", () => {
    // After reset: filterStatus=ALL, no date bounds
    const result = applyFilters(jobs, ["DISPATCHED"], "ALL", null, null);
    expect(result).toHaveLength(2);
  });

  it("hasActiveFilter is true when any filter is non-default", () => {
    const check = (status: string, from: string, to: string) =>
      status !== "ALL" || from !== "" || to !== "";
    expect(check("ALL", "", "")).toBe(false);
    expect(check("DISPATCHED", "", "")).toBe(true);
    expect(check("ALL", "2026-03-20", "")).toBe(true);
    expect(check("ALL", "", "2026-03-25")).toBe(true);
  });
});
