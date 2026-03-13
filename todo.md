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
- [x] #1 Wire Partner detail/edit form to FastAPI create/update/deactivate
- [x] #2 Wire Property detail/edit form to FastAPI CRUD with config panel
- [x] #3 Wire Room detail/edit form to FastAPI CRUD with template assignment
- [x] #4 Wire Service Provider detail/edit form to FastAPI CRUD
- [x] #5 Wire Catalog Item detail/edit form to FastAPI CRUD
- [x] #6 Wire Template detail/edit form with item reordering and CRUD
- [x] #7 Wire User management pages to FastAPI invite/edit/deactivate

## Phase 11: Front Office & Operations
- [x] #8 Build Request Detail page with item breakdown and status timeline
- [x] #9 Add browser push notifications for SSE events
- [x] #10 Build request assignment to staff members
- [x] #11 Add request filtering and advanced search (search + sort + status filter)
- [x] #12 Build request batch actions (bulk confirm + bulk reject)
- [x] #13 Add request priority/urgency levels
- [x] #14 Build request notes/comments thread (internal staff)
- [x] #15 Add request SLA timer with color-coded urgency
- [x] #16 Build shift handoff view

## Phase 12: Guest Experience
- [x] #17 Build guest feedback/rating flow after request completion
- [x] #18 Add guest session persistence (localStorage + useGuestSession hook)
- [x] #19 Build guest request cancellation flow (dialog + reason field)
- [x] #20 Add guest request modification (notes edit dialog on pending requests)
- [x] #21 Build guest request history ("My Requests" tab in GuestHistoryPage)
- [x] #22 Add multi-language support for guest microsite (EN/TH/JA/ZH/KO/FR/DE/AR via i18n lib)
- [x] #23 Build guest welcome screen customization from property branding
- [x] #24 Add service item images and rich descriptions
- [x] #25 Build guest favorites / order again feature

## Phase 13: QR Code Management
- [x] #26 Build QR code batch print layout (printable PDF with @media print CSS)
- [x] #27 Add QR code analytics dashboard (scan trends, hourly heatmap, top rooms, access type pie)
- [x] #28 Build QR code rotation/renewal flow (Rotate URL button + warning in lifecycle actions)
- [x] #29 Build QR code access log with filtering and CSV export
- [x] #30 Build stay token managemen## Phase 14: Analytics & Reporting
- [x] #31 Build dashboard analytics layer with real FastAPI data (demo data + FastAPI hooks wired)
- [x] #32 Add CSV/Excel export for all list pages (Partners, Properties, Rooms, Providers, Catalog, Templates, QR, Users, Staff)
- [x] #33 Build revenue reporting page with charts (RevenueReportPage)
- [x] #34 Build service popularity report (ServicePopularityReport)
- [x] #35 Build guest satisfaction dashboard (SatisfactionReportPage)
- [x] #36 Build operational efficiency report (OperationalEfficiencyReport)
- [x] #37 Add scheduled email reports (ScheduledReports page)## Phase 15: Security & Access Control
- [x] #38 Add role-based access control to frontend (useRBAC hook + sidebar permission filtering)
- [x] #39 Implement JWT token refresh flow (silent refresh interceptor in API client)
- [x] #40 Build two-factor authentication UI (TwoFactorPage with TOTP setup + backup codes)
- [x] #41 Add session management page (SessionManagementPage with active sessions + revoke)
- [x] #42 Build API key management for partners (ApiKeyManagementPage with create/revoke/scopes)

## Phase 16: UX, Polish & Infrastructure
- [x] #43 Add dark mode polish (ThemeContext + dark/light toggle in TopBar)
- [x] #44 Optimize responsive mobile layout (MobileBottomNav + Drawer sidebar + responsive padding)
- [x] #45 Add loading skeletons and empty states (Phase 18 skeleton library across all pages)
- [x] #46 Build activity audit log page (AuditLogPage with filtering and export)
- [x] #47 Add keyboard shortcuts (Cmd+K CommandPalette + route transition bar)
- [x] #48 Build onboarding wizard for new properties (OnboardingWizard on Dashboard)
- [x] #49 Add real-time collaboration indicators (CollaborationIndicator on RequestDetailPage)
- [x] #50 Build notification center (NotificationCenter with in-app bell + unread count in TopBar)

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

## Phase 18: Skeleton Loading & Progressive UI (Anti-White-Screen)
- [x] Build reusable skeleton component library (TableSkeleton, CardSkeleton, DetailSkeleton, StatSkeleton, FormSkeleton, FrontOfficeSkeleton, ReportSkeleton, QRDetailSkeleton, PageHeaderSkeleton)
- [x] Dashboard page skeleton (stat cards + chart shimmer)
- [x] All list pages skeleton (Partners, Properties, Rooms, Providers, Catalog, Templates, QR, Users, Staff)
- [x] Front Office page skeleton (sessions + request queue split view)
- [x] All detail/edit pages skeleton (Partner, Property, Room, Provider, Catalog, Template, QR, User, Request)
- [x] Report pages skeleton (Revenue, Satisfaction, Audit, ServicePopularity, OperationalEfficiency, ScheduledReports)
- [x] Guest microsite skeleton (ScanLanding, ServiceMenu, RequestPage, TrackRequest, GuestHistory)
- [x] Admin pages skeleton (ShiftHandoff, ApiKeyManagement)
- [x] Settings page skeleton
- [x] Global route transition bar (blue-purple shimmer bar at top of viewport)
- [x] RouteTransitionBar wired to useIsFetching + useLocation for smart visibility

## Phase 19: Next-Steps Sprint
- [x] SSE-based collaboration presence (POST/DELETE/GET endpoints + presence:join/leave SSE broadcast; CollaborationIndicator upgraded to use server-backed presence)
- [x] Wire OnboardingWizard to live room and template counts on Dashboard (roomsQ + templatesQ queries; all 5 wizard steps driven by real API data)
- [x] Bulk QR print action from QR list page (checkbox select → Print Selected (N) → /qr/print?ids=... pre-filtered)

## Phase 20: Targeted Improvements
- [x] Scope SSE presence to active propertyId (POST/DELETE now send propertyId; server broadcasts only to that property's SSE clients, with fallback to all if propertyId absent)
- [x] Add Select All on Page shortcut to QR Management table ("Select All on Page (N)" / "Deselect All" toggle always visible in toolbar; bulk print/access buttons appear when sel > 0)
- [x] Persist OnboardingWizard dismissal via localStorage (key: peppr_onboarding_dismissed; state initialised from storage; X button writes flag and hides wizard permanently)

## Phase 21: Targeted Improvements
- [x] Add "Reset setup wizard" button in Settings page (Admin Tools card with amber border; RotateCcw icon; clears peppr_onboarding_dismissed from localStorage + sonner toast)
- [x] Add cross-page Select All to QR Management (secondary underline prompt "Select all N QR codes across all pages" appears when current page is fully selected and more pages exist; allPagesSelected state drives Print All (N) button; Clear button deselects everything)
- [x] Expose property_id on auth user object — already fully wired in AuthContext (UserProfile → profileToUser → User interface → /v1/auth/me verification on mount); fallback to "default" for super-admins without property assignment is correct behaviour

## Phase 22: Targeted Improvements
- [x] Add "Clear all dismissed banners" reset to Admin Tools in Settings (second row in Admin Tools card; clears all peppr_* keys except auth tokens; toast reports count cleared)
- [x] Persist cross-page QR selection across pagination (selectedIdsRef Set + rowSelection state; useEffect rebuilds selection on page change; handleRowSelectionChange syncs additions/removals)
- [x] Add Set Expiry Date bulk action to QR Management toolbar (Set Expiry (N) button opens Dialog with date picker; converts date to hours via qrApi.extend; blank date skips API call; toast on success/error)

## Phase 23: QR Management Polish
- [x] Add Escape key shortcut to clear all QR selection (keydown listener on window; fires only when selectedIdsRef.current.size > 0; calls clearAllSelection() + toast.info)
- [x] Add persistent selection count badge in QR PageHeader actions bar (Chip with onDelete=clearAllSelection; shows "N selected · Press Esc to clear" or "N selected (all pages) · Press Esc to clear")
- [x] Add Revoke All Selected bulk action to QR toolbar (red Revoke (N) button → Dialog with reason TextField; calls qrApi.revoke for each ID; clears selection on success; toast on success/error)

## Bug Fixes
- [ ] Fix "Failed to load user" error on UserDetailPage (/users/u-001) — hardcoded demo ID or missing fallback

## Phase 24: Audit Fixes — Critical & High

### Critical: Replace hardcoded pr-001 propertyId
- [x] Build useActiveProperty hook (reads from auth user, falls back to first property for super-admins)
- [x] Fix QRManagementPage — replace "pr-001" with useActiveProperty()
- [x] Fix QRDetailPage — replace "pr-001" with useActiveProperty()
- [x] Fix QRAccessLogPage — replace "pr-001" with useActiveProperty()
- [x] Fix StayTokensPage — replace "pr-001" with useActiveProperty()
- [x] Fix FrontOfficePage — replace "pr-001" with useActiveProperty()
- [x] Fix DashboardPage — replace "pr-001" with useActiveProperty()
- [x] Fix RoomsPage — replace "pr-001" with useActiveProperty()

### High: Wire fully-static pages to real FastAPI endpoints
- [x] Wire ShiftHandoffPage to frontOfficeApi.requests() (already wired in prior phase)
- [x] Wire AuditLogPage to /v1/admin/audit-log endpoint (with demo fallback)
- [x] Wire QRAnalyticsDashboard to /v1/properties/{id}/qr/analytics endpoint (with demo fallback)
- [x] Wire RevenueReportPage to /v1/reports/revenue endpoint (with demo fallback)
- [x] Wire SatisfactionReportPage to /v1/reports/satisfaction endpoint (with demo fallback)

## Phase 25: Seed Data & Demo Data Cleanup

### Audit & Design
- [ ] Audit all demo data sources across frontend pages
- [ ] Map all real FastAPI endpoints needed for seeding
- [ ] Design seed data for 3–5 hotels with full hierarchy

### Seed Script
- [ ] Build seed script (partner → property → rooms → providers → catalog → templates → QR codes → staff)
- [ ] Run seed script against real FastAPI endpoints
- [ ] Verify seeded data appears correctly in the admin dashboard

### Frontend Cleanup
- [ ] Remove or gate all remaining hardcoded DEMO_* constants in pages
- [ ] Ensure all pages show real data or graceful empty states (no hardcoded names/IDs)

## Phase 26: Port Overseer — Global Configuration Checkpoint

### Design & Core
- [x] Audit full platform stack: all ports, services, DB connections, environment variables
- [x] Design Port Overseer schema: ServiceRegistry, PortAllocation, HealthCheck, ConfigSnapshot
- [x] Build server/overseer.ts — the core Overseer module with service registry and port governance
- [x] Expose /api/overseer/status and /api/overseer/services endpoints from Express
- [x] Refactor Overseer to use YAML as canonical config payload (overseer.config.yaml)
- [x] Install js-yaml and @types/js-yaml
- [x] Write overseer.config.yaml with full service registry, port map, and env requirements
- [x] Update server/overseer.ts to load config from YAML file at startup

### Integration
- [x] Wire Express proxy to read target URLs from Overseer registry (not hardcoded env vars)
- [x] Add startup validation: Overseer checks all required services are reachable before accepting traffic
- [x] Add /api/overseer/health — aggregated health of all registered services

### Admin UI
- [x] Build OverseerPage in dashboard: service cards with live health status, port assignments, config viewer
- [x] Add Overseer link to sidebar navigation under System section
- [ ] Show environment config diff between expected vs actual values

### Seed Pipeline
- [ ] Use Overseer to discover FastAPI base URL dynamically
- [ ] Build seed script using Overseer-resolved endpoints
- [ ] Create root admin (chawakit1444@gmail.com) via FastAPI
- [ ] Seed 3–5 hotels with full hierarchy through real endpoints

## Phase 25: Seed Data (Real Platform Data)
- [x] Fix PostgreSQL setup: install, create peppr user/DB, configure pg_hba.conf
- [x] Fix FastAPI backend: bcrypt 4.0.1 downgrade (passlib 1.7.x compatibility), UserRole ambiguous FK, SYSTEM_ADMIN role assignment
- [x] Create root admin user: chawakit1444@gmail.com (SYSTEM_ADMIN)
- [x] Seed 3 hotel partners via /v1/partners: Siam Prestige, Andaman Bay, Northern Bloom
- [x] Seed 4 properties via /v1/properties: SPB-BKK (54 rooms), SPB-HKT (46 rooms), ABR-PTG (47 rooms), NBL-NMN (28 rooms)
- [x] Seed 175 rooms via direct SQL (FastAPI rooms/bulk endpoint has MissingGreenlet ORM bug)
- [x] Seed 175 QR codes via direct SQL (FastAPI qr/generate endpoint has require_role/current_user bug)
- [x] Seed 4 service providers + 26 catalog items via direct SQL (ORM provider_code column mismatch)
- [x] Seed 12 service templates (3 per property) + 24 template items via direct SQL

## Phase 26: Port Overseer
- [x] Audit full platform stack: all ports, services, DB connections, environment variables
- [x] Design Port Overseer schema: ServiceRegistry, PortAllocation, HealthCheck, ConfigSnapshot
- [x] Write overseer.config.yaml — canonical YAML config with full service registry, port map, env requirements
- [x] Build server/overseer.ts — loads from YAML, runs health checks, exposes service registry
- [x] Wire Express proxy to read target URLs from Overseer registry
- [x] Add startup validation: Overseer checks all required services at boot
- [x] Add /api/overseer/status and /api/overseer/services tRPC procedures
- [x] Build OverseerPage in dashboard: service cards with live health status, port assignments, YAML config viewer
- [x] Add Port Overseer link to sidebar navigation under System section

## Phase 27: Multi-Tenant RBAC with Role-Switching Carousel

### Schema & Backend
- [x] Extend user_roles table: add scope_type (GLOBAL/PARTNER/PROPERTY), scope_id (nullable), is_active flag
- [x] Add /v1/auth/me to return all assigned roles with scope labels (BFF tRPC: rbac.myRoles)
- [x] Add /v1/auth/switch-role endpoint: sets active_role + scope in session/JWT (BFF tRPC: rbac.switchRole)
- [x] Add /v1/admin/users/{id}/roles endpoints: assign/revoke roles per user (BFF tRPC: rbac.assignRole/revokeRole)
- [x] Add SSO allowlist support (BFF tRPC: rbac.ssoAllowlist/addSsoAllowlist)
- [x] Seed 6 sample multi-role users across 3 partners/4 properties

### Role Carousel UI
- [x] Build RoleCarousel component: card-per-role with property/partner context, arrow navigation
- [x] Build RoleSwitchPage at /role-switch: shown after login when user has multiple roles
- [x] Persist active role in localStorage via useActiveRole hook
- [x] Show active role badge in TopBar (ActiveRoleBadge component)

### Feature Gating
- [x] Update sidebar navigation to show/hide sections based on active role (filterNavigation)
- [x] Update useActiveProperty to resolve from active role scope first

### User Management (Super-Admin)
- [x] Build UserManagementPage at /users/manage: users table with expandable role assignments
- [x] Add Role tab: assign/revoke roles with scope picker per user
- [x] Add SSO Allowlist tab: manage who can login via Google OAuth
- [x] Add Role Definitions tab: view all role types with permissions
- [x] Add Role Management nav link to sidebar under Administration
- [x] Tests: 47 passed (5 test files)

## Phase 28: FastAPI Bug Fixes + SSO + Role Guard

### FastAPI ORM Bug Fixes
- [x] Fix rooms/bulk: MissingGreenlet lazy-load — use selectinload or eager load in the Room router
- [x] Fix qr/generate: require_role returns None, not current_user — fix the dependency injection
- [x] Fix providers: provider_code column mismatch — align ORM model with actual DB schema

### Google OAuth SSO
- [x] Wire Google OAuth callback in BFF to validate against SSO allowlist
- [x] Redirect to /role-switch after successful SSO login
- [x] Show error page if email not in SSO allowlist

### Role-Context Confirmation Guard
- [x] Build RoleContextGuard component: shows current role + scope before destructive action
- [x] Wire to: deactivate partner (PartnerDetailPage), revoke QR bulk (QRManagementPage), revoke QR single (QRDetailPage), revoke user role (UserManagementPage)
- [x] Add "You are acting as [ROLE] on [SCOPE]" confirmation step in dialogs

## Phase 29: Role Guard Expansion + Audit Integration

### Property Deactivation Guard
- [x] Wire RoleContextGuard into PropertyDetailPage deactivate action

### Audit Log Integration
- [x] Add adminApi.logAuditAction() helper in endpoints.ts (calls FastAPI /v1/admin/audit-log)
- [x] Audit logging built into RoleContextGuard via optional `audit` field in GuardOptions
- [x] Log guarded action in PartnerDetailPage deactivation
- [x] Log guarded action in QRManagementPage bulk revoke
- [x] Log guarded action in QRDetailPage single revoke
- [x] Log guarded action in UserManagementPage role revocation
- [x] Log guarded action in PropertyDetailPage deactivation

### Catalog & Template Deletion Guards
- [x] Wire RoleContextGuard into CatalogDetailPage deactivate action (new Deactivate button in PageHeader)
- [x] Wire RoleContextGuard into TemplateDetailPage remove-item action

## Phase 30: Guard Completion + Audit Log Enhancements

### Room Deactivation Guard
- [x] Wire RoleContextGuard into RoomDetailPage deactivate action (Deactivate button in PageHeader, guarded + audited)

### Audit Log Viewer Enhancements
- [x] Add actorRole filter to AuditLogPage (dropdown: super_admin/admin/partner_admin/property_admin/manager/staff/system)
- [x] Severity filter already existed; actorRole chip now displayed inline on each timeline row
- [x] actorRole column added to CSV export

### Bulk Template Assignment Guard
- [x] Wire RoleContextGuard into BulkTemplateAssignDialog (role-context confirmation before bulk assign fires)

## Phase 31: Provider Guard + Audit Pagination + QR Rotation Guard

### Service Provider Deactivation Guard
- [x] Wire RoleContextGuard into ProviderDetailPage deactivate action (replaces plain Dialog; provider entityType added to AuditActionPayload union)

### Audit Log Pagination
- [x] Add page/page_size state to AuditLogPage (PAGE_SIZE = 20)
- [x] Pass page + page_size as searchParams to FastAPI /v1/admin/audit-log query
- [x] Client-side slice fallback when backend returns full list
- [x] Prev/Next pagination controls + page X of Y display below timeline
- [x] All filter dropdowns reset page to 1 on change

### QR Rotation Guard
- [x] Wire RoleContextGuard into QRDetailPage Rotate URL action (replaces window.confirm(); full audit payload with old URL invalidation note)

## Phase 32: Full Backlog Punch

### Operational Guards
- [x] Wire RoleContextGuard into RequestDetailPage Reject and Cancel actions
- [x] Wire RoleContextGuard into FrontOfficePage bulk reject action
- [x] Wire RoleContextGuard into CatalogDetailPage Save when price changes (guard fires only when editing and unit_price changed)

### Audit Log Enhancements
- [x] Add From/To date-range pickers to AuditLogPage (MUI DatePicker with date-fns adapter)
- [x] Add entry detail drawer (side panel) on row click in AuditLogPage (full JSON details, actor role chip, severity badge)
- [x] Add provider and room to AuditLogPage Entity Type filter dropdown

### Data & Reporting
- [x] room and provider added to AuditLogPage Entity Type dropdown MenuItem list
- [x] Dashboard KPI cards navigate to filtered list on click (StatCard onClick prop + useLocation)
- [x] Add CSV export button to ServicePopularityReport (useExportCSV hook, all columns)

### UX & Polish
- [x] confirmPhrase wired into severity=destructive guard calls (partner deactivation: type partner name; user role revocation: type user name/email)
- [x] EmptyState component already has illustrated empty state with CDN image + CTA — RoomsPage, ProvidersPage, CatalogPage all use it correctly (no change needed)
- [x] PageHeader actions container now uses flexWrap + responsive justifyContent to prevent overflow on mobile

## Phase 33: Audit Export + Request Analytics + Guard Bypass Trail

### Audit Log Filtered Export
- [x] Pass active filters (dateFrom, dateTo, severity, actorRole, entityType, search) to FastAPI export endpoint
- [x] "Export All Matching" button added (distinct from "Export Page" button)

### Request Analytics Page
- [x] RequestAnalyticsPage created with daily volume stacked bar, response time trend (avg+P90), SLA compliance radial gauge, top categories progress bars
- [x] KPI row: Total Requests, Avg Response Time, SLA Compliance, Top Category
- [x] Period selector (7d/30d/90d), CSV export, refresh; demo data fallback
- [x] Route /reports/requests registered in App.tsx
- [x] Sidebar nav entry added under Reports (Request Analytics)

### Guard Bypass Audit Trail
- [x] handleCancel in RoleContextGuard fires GUARD_BYPASSED__ audit entry (severity: info)
- [x] Includes action name, entityType/Id/Name, actorRole, scope, and cancel reason in details

## Phase 34: Staff Analytics + Audit Retention + QR Expiry Guard

### Staff Analytics Page
- [x] StaffAnalyticsPage created at /reports/staff with per-staff KPI table (requests handled, avg response time, SLA compliance, rating)
- [x] Bar chart: requests handled per staff member
- [x] Line chart: avg response time trend per staff
- [x] Wire to FastAPI /v1/reports/staff-analytics with demo fallback
- [x] Route /reports/staff registered in App.tsx; sidebar nav entry added under Reports

### Audit Log Retention Policy UI
- [x] Audit Log Retention card added to SettingsPage (red-bordered card after Admin Tools)
- [x] Retention period selector (30/90/180/365 days) with Apply button
- [x] Manual purge button with RoleContextGuard (severity: destructive, confirmPhrase: "purge audit log")
- [x] system entityType added to AuditActionPayload union in endpoints.ts

### Bulk QR Expiry Guard
- [x] RoleContextGuard wired into QRManagementPage Set Expiry Apply button
- [x] Guard shows selected count and new expiry date in description
- [x] Audit payload: entityType: qr_code, entityId: all target IDs, details: expiry date or "never expire"

## Phase 35: Critical Bug Fixes
- [x] Fix sidebar nav items invisible — filterNavigation returned empty array when activeRole was null; now falls back to RBAC role mapped to RoleId (SUPER_ADMIN for admin/super_admin, PROPERTY_ADMIN for manager, FRONT_DESK for staff/viewer)
- [x] Fix sign-out button — TopBar now calls tRPC auth.logout mutation (clears server cookie), clears localStorage tokens + peppr_active_role, then navigates to /auth/login
