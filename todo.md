# Peppr Around Admin Dashboard — TODO

## Phase 6: Core Admin Dashboard
- [x] Project scaffold with Next.js + MUI + Tailwind
- [x] Core layout: sidebar navigation, top bar, theme system
- [x] Dashboard page with stat cards and overview widgets
- [x] Partner & Property CRUD list pages
- [x] Service Provider, Catalog, Template list pages
- [x] QR Management and Front Office list pages
- [x] Users, Staff, Settings pages
- [x] Login page
- [x] API hooks layer (TanStack Query + typed endpoints)
- [x] Demo data fallback system
- [x] All list pages wired to API hooks
- [x] Detail/edit pages: Partner, Property, Room
- [x] Detail/edit pages: Provider, Catalog, Template, QR
- [x] Detail/edit pages: User, Front Office Request
- [x] Guest microsite: Scan landing, Service menu, Request, Track

## Phase 7: Backend Integration & Enhancements
- [x] Upgrade to web-db-user for API proxying
- [x] Express API proxy to FastAPI backend (replaces tRPC proxy approach)
- [x] Frontend API client updated to use relative URLs through Express proxy
- [x] Real-time SSE notifications for Front Office (live feed, connection status, event badges)
- [x] Bulk room creation dialog (range generator + CSV import)
- [x] QR batch generation dialog (room selection → access type config → results)
- [x] Vitest tests for API proxy, SSE, and auth (18 tests passing)
- [x] Bulk template assignment dialog for rooms
