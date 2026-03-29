# Hardcoded Values Audit — PEPPR Around Admin Platform

**Date:** 2026-03-13  
**Scope:** `client/src/`, `server/` (excluding `_core/`, `node_modules/`, test files)  
**Status:** Near-production readiness review

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 **Critical** | 6 | Hardcoded property IDs (`pr-001`) used as live query parameters |
| 🟠 **High** | 5 | Fully static demo data rendered as real data (no API fallback) |
| 🟡 **Medium** | 4 | Demo data used as silent fallback when backend is unreachable |
| 🟢 **Acceptable** | 8 | Intentional hardcoding (enum lists, form defaults, UI constants) |

---

## 🔴 Critical — Must Fix Before Production

These items will produce **wrong data or broken queries** in production because they use a hardcoded entity ID that will not exist in the real database.

### 1. `QRManagementPage.tsx` — line 29
```ts
const propertyId = "pr-001"; // ← used in qrApi.list(propertyId, ...)
```
**Impact:** All QR code queries are scoped to a single demo property. Every other property's QR codes are invisible.  
**Fix:** Read `propertyId` from `useAuth().user?.property_id` (or a property selector context for super-admins).

---

### 2. `QRDetailPage.tsx` — line 105
```ts
const propertyId = "pr-001"; // ← used in qrApi.list(propertyId, ...)
```
**Impact:** Same as above — QR detail page queries are scoped to the demo property.  
**Fix:** Same as #1.

---

### 3. `QRAccessLogPage.tsx` — line 61
```ts
const propertyId = "pr-001";
```
**Impact:** Access log always shows data for the demo property only.  
**Fix:** Same as #1.

---

### 4. `StayTokensPage.tsx` — line 146
```ts
const propertyId = "pr-001";
```
**Impact:** Stay token management is scoped to the demo property.  
**Fix:** Same as #1.

---

### 5. `FrontOfficePage.tsx` — line 78
```ts
const propertyId = "pr-001";
```
**Impact:** Front Office request queue only shows requests for the demo property. Staff at other properties see nothing.  
**Fix:** Same as #1.

---

### 6. `DashboardPage.tsx` — lines 101–109
```ts
queryFn: () => qrApi.list("pr-001", { ... }),
queryFn: () => frontOfficeApi.requests("pr-001", { ... }),
```
**Impact:** Dashboard KPI cards for Active QR and Pending Requests are always scoped to the demo property.  
**Fix:** Same as #1.

---

### 7. `RoomsPage.tsx` — lines 205, 223
```tsx
propertyId="pr-001"
```
**Impact:** Room list and room creation are always scoped to the demo property.  
**Fix:** Same as #1.

---

## 🟠 High — Fully Static Demo Data (No API Wiring)

These pages render **only hardcoded data** and have no connection to the backend. They will show stale, fake data in production.

### 8. `ShiftHandoffPage.tsx` — lines 76–86
```ts
makeReq("r1", "REQ-1042", "Room Cleaning", "412", "Grand Hyatt", "pending", "urgent", 72),
makeReq("r2", "REQ-1043", "Extra Towels", "305", "Grand Hyatt", "pending", "normal", 18),
// ... 5 more hardcoded requests
```
**Impact:** Shift handoff always shows the same 7 fake requests regardless of actual open requests.  
**Fix:** Replace with `frontOfficeApi.requests(propertyId, { status: "PENDING,IN_PROGRESS,CONFIRMED" })`.

---

### 9. `AuditLogPage.tsx` — line 33
```ts
const DEMO_ENTRIES: AuditEntry[] = [ ... ]; // 10 hardcoded log entries
```
**Impact:** Audit log always shows the same 10 fake entries. Real audit events are never displayed.  
**Fix:** Wire to `GET /v1/audit-logs` endpoint with pagination and filters.

---

### 10. `QRAnalyticsDashboard.tsx` — lines 58–70
```ts
const TOP_ROOMS = [ { room: "101", scans: 142, ... }, ... ];
const ACCESS_TYPE_DATA = [ { name: "Public", value: 68 }, ... ];
```
**Impact:** QR analytics always shows the same 5 rooms and the same access-type split.  
**Fix:** Wire to `GET /v1/qr/analytics?property_id=...` endpoint.

---

### 11. `RevenueReportPage.tsx` — line 24
```ts
const PROPERTIES = ["Grand Hyatt Bangkok", "Siam Kempinski", "Mandarin Oriental", ...];
```
**Impact:** Revenue report property filter is hardcoded to 5 demo hotel names. Real properties are not listed.  
**Fix:** Fetch from `propertiesApi.list()` and populate the filter dynamically.

---

### 12. `SatisfactionReportPage.tsx` — lines 50–55
```ts
{ id: 1, guest: "Guest 1204", property: "Grand Hyatt", service: "Spa Package", rating: 5, ... },
```
**Impact:** Satisfaction report always shows the same 5 fake reviews.  
**Fix:** Wire to `GET /v1/feedback` endpoint.

---

## 🟡 Medium — Demo Fallback (Silent Substitution)

These pages use the `useDemoFallback` pattern correctly — they show a blue info banner when demo data is active. However, in production the banner should be removed and the fallback disabled to prevent confusion.

| Page | Demo Data Source | Risk |
|------|-----------------|------|
| `PartnersPage` | `getDemoPartners()` | Shows 6 fake partners if backend is down |
| `PropertiesPage` | `getDemoProperties()` | Shows 5 fake properties if backend is down |
| `RoomsPage` | `getDemoRooms()` | Shows 20 fake rooms if backend is down |
| `ProvidersPage` | `getDemoProviders()` | Shows 5 fake providers if backend is down |
| `CatalogPage` | `getDemoCatalog()` | Shows 8 fake catalog items if backend is down |
| `TemplatesPage` | `getDemoTemplates()` | Shows 3 fake templates if backend is down |
| `UsersPage` | `getDemoUsers()` | Shows fake users if backend is down |
| `QRManagementPage` | `getDemoQRCodes()` | Shows fake QR codes if backend is down |
| `StaffPage` | `getDemoPositions()` + `getDemoMembers()` | Shows fake staff if backend is down |

**Recommendation:** Keep the `useDemoFallback` pattern for development but add an environment gate:
```ts
// In useDemoFallback.ts — disable in production
const isDev = import.meta.env.DEV;
if (!isDev && query.isError) throw query.error; // surface real errors in prod
```

---

### 13. `ScheduledReports.tsx` — lines 41, 140–146
```ts
const DEMO_REPORTS: ScheduledReport[] = [ ... ];
const { data: reports = DEMO_REPORTS } = useQuery({
  queryFn: async () => { /* ... */ return DEMO_REPORTS; }, // always returns demo
});
```
**Impact:** Scheduled reports page always shows 3 fake scheduled reports. Create/delete actions are in-memory only.  
**Fix:** Wire to a real `POST /v1/reports/scheduled` and `GET /v1/reports/scheduled` endpoint.

---

### 14. `ApiKeyManagementPage.tsx` — line 61
```ts
const DEMO_KEYS: ApiKey[] = [ ... ];
const [keys, setKeys] = useState<ApiKey[]>(DEMO_KEYS);
```
**Impact:** API keys are stored in React state only. All created keys are lost on page refresh.  
**Fix:** Wire to `GET/POST/DELETE /v1/api-keys` endpoint.

---

### 15. `StayTokensPage.tsx` — line 30
```ts
const DEMO_TOKENS = [ { token: "STAY-2026-A1B2C3D4", ... }, ... ];
```
**Impact:** Token validation always succeeds against fake tokens.  
**Fix:** Wire to `GET /v1/stay-tokens` and `POST /v1/stay-tokens/validate` endpoint.

---

## 🟢 Acceptable — Intentional Hardcoding

These items are **correct and expected** to be hardcoded. No action required.

| Location | Value | Reason |
|----------|-------|--------|
| `PropertyDetailPage.tsx` | `PROPERTY_TYPES`, `TIMEZONES`, `CURRENCIES` | UI enum lists — stable domain constants |
| `CatalogDetailPage.tsx` | `CATEGORIES`, `UNITS`, `CURRENCIES` | UI enum lists — stable domain constants |
| `TemplateDetailPage.tsx` | `TIERS` | UI enum list — stable domain constant |
| `RoomDetailPage.tsx` | `ROOM_TYPES` | UI enum list — stable domain constant |
| `UserDetailPage.tsx` | `ROLES` | UI enum list — stable domain constant |
| `PropertyOnboardingWizard.tsx` | `currency: "THB"`, `timezone: "Asia/Bangkok"` | Sensible defaults for Thai market — user can change |
| `CatalogDetailPage.tsx` | `currency: "THB"` | Same as above |
| `server/apiProxy.ts` | `PEPPR_API_URL \|\| "http://localhost:8000"` | Correct env-var-first pattern with local dev fallback |
| `server/sse.ts` | `PEPPR_API_URL \|\| "http://localhost:8000"` | Same as above |
| `CollaborationIndicator.tsx` | `user?.property_id ?? "default"` | Safe fallback for super-admins with no property assignment |
| `client.ts` | `VITE_API_URL \|\| window.location.origin + "/api"` | Correct env-var-first pattern |
| `Map.tsx` | `mapId: "DEMO_MAP_ID"` | Google Maps map styling ID — replace with real Map ID when custom styling is needed |
| `RevenueReportPage.tsx` | `MONTHS`, `CATEGORIES`, `COLORS` | Static UI labels and chart palette — acceptable |
| `DashboardPage.tsx` | `ONBOARDING_DISMISSED_KEY = "peppr_onboarding_dismissed"` | Stable localStorage key constant |

---

## Recommended Fix Priority

```
Week 1 (before any real traffic):
  Fix #1–#7  → Replace all "pr-001" with useAuth().user?.property_id
              → Add a PropertySelector context for super-admins

Week 2 (before partner onboarding):
  Fix #8     → Wire ShiftHandoffPage to frontOfficeApi
  Fix #13    → Wire ScheduledReports to backend
  Fix #14    → Wire ApiKeyManagementPage to backend
  Fix #15    → Wire StayTokensPage to backend

Week 3 (before analytics go live):
  Fix #9     → Wire AuditLogPage to /v1/audit-logs
  Fix #10    → Wire QRAnalyticsDashboard to /v1/qr/analytics
  Fix #11    → Wire RevenueReportPage property filter to propertiesApi
  Fix #12    → Wire SatisfactionReportPage to /v1/feedback

Ongoing:
  Fix #Medium → Add env gate to useDemoFallback to disable in production
```
