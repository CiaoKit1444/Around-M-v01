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

## Phase 8: Auth, Request Actions & QR Detail
- [x] Wire login page to FastAPI /v1/auth/login endpoint
- [x] Store auth token and wire AuthContext to real API calls
- [x] Show real user data when authenticated, demo fallback when not
- [x] Front Office: Confirm/Reject/In Progress action buttons on requests
- [x] Front Office: Request status update calls FastAPI endpoint
- [x] QR detail page: Visual QR code preview (generated SVG from qr_data)
- [x] QR detail page: Download PNG/SVG + copy QR code ID
- [x] Vitest tests for auth flow, request actions, and QR detail (31 tests passing)

## Phase 9: Guest Microsite, Guest SSE & Settings
- [x] Wire guest scan landing page to FastAPI /v1/public/qr/{qr_code_id}/status + /public/guest/sessions
- [x] Wire guest service menu to FastAPI /public/guest/sessions/{sessionId}/menu
- [x] Wire guest request submission to FastAPI /public/guest/sessions/{sessionId}/requests
- [x] Wire guest request tracking to FastAPI /public/guest/requests/{requestNumber}
- [x] SSE endpoint for guest real-time status updates (reuses /api/sse/front-office)
- [x] Guest tracking page: auto-poll + SSE for live status updates
- [x] Settings page: branding (logo, colors, welcome message) wired to FastAPI
- [x] Settings page: guest experience (limits, feature toggles) wired to FastAPI
- [x] Settings page: security & notifications sections (placeholder for future API)
- [x] Vitest tests for guest endpoints, settings, and data shapes (47 tests passing across 5 files)

## Phase 10: Core CRUD & Data Management
- [ ] #1 Wire Partner detail/edit form to FastAPI create/update/deactivate
- [ ] #2 Wire Property detail/edit form to FastAPI CRUD with config panel
- [ ] #3 Wire Room detail/edit form to FastAPI CRUD with template assignment
- [ ] #4 Wire Service Provider detail/edit form to FastAPI CRUD
- [ ] #5 Wire Catalog Item detail/edit form to FastAPI CRUD
- [ ] #6 Wire Template detail/edit form with item reordering and CRUD
- [ ] #7 Wire User management pages to FastAPI invite/edit/deactivate

## Phase 11: Front Office & Operations
- [ ] #8 Build Request Detail page with item breakdown and status timeline
- [ ] #9 Add browser push notifications for SSE events
- [ ] #10 Build request assignment to staff members
- [ ] #11 Add request filtering and advanced search
- [ ] #12 Build request batch actions (bulk confirm/reject)
- [ ] #13 Add request priority/urgency levels
- [ ] #14 Build request notes/comments thread (internal staff)
- [ ] #15 Add request SLA timer with color-coded urgency
- [ ] #16 Build shift handoff view

## Phase 12: Guest Experience
- [ ] #17 Build guest feedback/rating flow after request completion
- [ ] #18 Add guest session persistence (localStorage)
- [ ] #19 Build guest request cancellation flow
- [ ] #20 Add guest request modification (quantity/notes)
- [ ] #21 Build guest request history ("My Requests" tab)
- [ ] #22 Add multi-language support for guest microsite (EN/TH)
- [ ] #23 Build guest welcome screen customization from property branding
- [ ] #24 Add service item images and rich descriptions
- [ ] #25 Build guest favorites / order again feature

## Phase 13: QR Code Management
- [ ] #26 Build QR code batch print layout (printable PDF)
- [ ] #27 Add QR code analytics dashboard (scan trends, heatmap)
- [ ] #28 Build QR code rotation/renewal flow
- [ ] #29 Add QR code access log (scan history per code)
- [ ] #30 Build stay token management UI

## Phase 14: Analytics & Reporting
- [ ] #31 Build dashboard analytics layer with real FastAPI data
- [ ] #32 Add CSV/Excel export for all list pages
- [ ] #33 Build revenue reporting page with charts
- [ ] #34 Build service popularity report
- [ ] #35 Build guest satisfaction dashboard
- [ ] #36 Build operational efficiency report
- [ ] #37 Add scheduled email reports

## Phase 15: Security & Access Control
- [ ] #38 Add role-based access control to frontend
- [ ] #39 Implement JWT token refresh flow
- [ ] #40 Build two-factor authentication UI
- [ ] #41 Add session management page
- [ ] #42 Build API key management for partners

## Phase 16: UX, Polish & Infrastructure
- [ ] #43 Add dark mode polish (audit all pages)
- [ ] #44 Optimize responsive mobile layout
- [ ] #45 Add loading skeletons and empty states
- [ ] #46 Build activity audit log page
- [ ] #47 Add keyboard shortcuts (Cmd+K, Cmd+N, etc.)
- [ ] #48 Build onboarding wizard for new properties
- [ ] #49 Add real-time collaboration indicators
- [ ] #50 Build notification center (in-app bell with unread count)

## Phase 17: Feature Sprint (Features #38–50 from batch request)
- [x] #38 Live entity search in CommandPalette (debounced API calls, keyboard navigation)
- [x] #39 Service popularity analytics report (bar chart, trend line, category breakdown)
- [x] #40 Operational efficiency report (response time, completion rate, SLA compliance)
- [x] #41 Scheduled email reports (schedule builder, recipient list, frequency config)
- [x] #42 Request priority/urgency levels (Low/Normal/High/Urgent with visual indicators)
- [x] #43 Notes/comments thread on request detail (staff internal notes, delete, Ctrl+Enter)
- [x] #44 SLA timer with color-coded urgency (progress bar, overdue alert, per-priority SLA)
- [x] #45 Shift handoff view (open requests summary, KPI cards, handoff dialog with notes)
- [x] #46 Guest welcome screen customization (branding config: logo, colors, welcome message)
- [x] #47 Service item images in guest menu (image display with fallback placeholder)
- [x] #48 Guest favorites and order-again feature (localStorage persistence, tabs UI)
- [x] #49 Request assignment to staff (assign dialog, staff list, badge on request card)
- [x] #50 API key management for partners (create/revoke/rotate, scopes, usage stats)
