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

## Phase 36: Auth Guard + Role Enforcement
- [x] Sign-out button loading state — TopBar sign-out MenuItem disabled + shows CircularProgress while logoutMutation.isPending
- [x] Admin route auth guard — AdminGuard component wraps all AdminRoutes; redirects to /auth/login if not authenticated, /role-switch if no active role
- [x] Persist sidebar collapse state — AdminLayout reads/writes peppr_sidebar_collapsed to localStorage on toggle
- [x] Enforce role selection after sign-in — LoginPage clears peppr_active_role and redirects to /role-switch; AdminGuard enforces the check on every admin route access

## Phase 37: Remember Role + Session Timeout + Role Badge
- [x] "Remember my role" checkbox on RoleSwitchPage — skips role-switch on next login if checked
- [x] Session timeout warning banner — dismissible banner when JWT is close to expiry (5 min warning)
- [x] Active role badge chip in TopBar — shows current role name + scope next to user avatar

## Phase 38: Google SSO Login
- [x] FastAPI: add POST /v1/auth/sso-login endpoint — accepts verified email from Manus OAuth, finds/creates user, returns JWT tokens
- [x] Express: update OAuth callback to call FastAPI sso-login and store peppr tokens in a short-lived cookie/query param, then redirect to /auth/sso-complete
- [x] Frontend: add /auth/sso-complete page that reads the tokens from query params and stores them, then redirects to /role-switch
- [x] Frontend: add "Sign in with Google" button on LoginPage that triggers the Manus OAuth flow

## Phase 39: SSO Follow-up Features
- [x] SSO Allowlist UI — Settings sub-page to list, add, and remove permitted Google SSO emails (backed by /v1/admin/sso-allowlist)
- [x] Link Google Account — Profile/Settings section to connect Google account to existing email/password user
- [x] Audit Log SSO events — record LOGIN_SSO entries in FastAPI sso_router and display in AuditLogPage

## Phase 40: Fix Google SSO Login Loop
- [x] Diagnose why SSO callback bounces back to login instead of proceeding to role selection
- [x] Fix the root cause (OAuth callback, SsoCompletePage, or AdminGuard)
- [x] Verify full SSO flow works end-to-end

## Phase 41: SSO Polish & Audit Log Live Data
- [x] SSO auto-link for provisioned staff — when a user on the SSO allowlist signs in via Google, auto-link their Manus openId to their Peppr account
- [x] Wire AuditLogPage to real /v1/admin/audit-log endpoint — replace demo data with live API calls, support filtering and pagination
- [x] SSO link-complete toast — detect mode=link in OAuth callback state and show confirmation toast on Settings page after redirect

## Phase 42: Fix Persistent SSO Login Loop
- [ ] Deep diagnose SSO login loop — trace full OAuth callback flow with server logs
- [ ] Fix the root cause preventing SSO login from completing
- [ ] Verify full SSO flow works end-to-end

## Phase 42: Migrate Auth from FastAPI to Express (Production Fix)
- [x] Audit FastAPI auth code — understand user table, password hashing, JWT, role assignment
- [x] Create Drizzle schema for peppr_users and sso_allowlist tables in Manus TiDB
- [x] Build Express auth service — POST /api/v1/auth/login, POST /api/v1/auth/sso-login, GET /api/v1/auth/me, POST /api/v1/auth/refresh
- [x] Update OAuth callback to use Express-native SSO bridge (no FastAPI dependency)
- [x] Seed admin user into Manus TiDB database
- [x] Verify end-to-end login flow works in published deployment

## Phase 43: Migrate Remaining Endpoints, Rate Limiting, Password Reset
- [ ] Audit remaining FastAPI endpoints — identify which CRUD routes need migration
- [ ] Migrate partner CRUD endpoints to tRPC (list, get, create, update, delete)
- [ ] Migrate property CRUD endpoints to tRPC (list, get, create, update, delete)
- [ ] Migrate staff/user CRUD endpoints to tRPC (list, get, create, update, delete)
- [ ] Migrate audit log endpoint to Express (GET /api/v1/admin/audit-log)
- [ ] Migrate SSO allowlist endpoints to Express (CRUD /api/v1/admin/sso-allowlist)
- [x] Add rate limiting to POST /api/v1/auth/login — 5 attempts per minute per IP
- [x] Add rate limiting to POST /api/v1/auth/sso-login — 5 attempts per minute per IP
- [x] Build password reset request endpoint — POST /api/v1/auth/forgot-password
- [x] Build password reset confirm endpoint — POST /api/v1/auth/reset-password
- [x] Add "Forgot password?" link on LoginPage
- [x] Build ForgotPasswordPage — email input form
- [x] Build ResetPasswordPage — new password form with token validation

## Phase 43b: Fix "No roles assigned" after SSO login
- [ ] Diagnose why RoleSwitchPage shows "No roles assigned" after SSO login
- [ ] Fix roles data flow — ensure SSO login JWT includes roles and RoleSwitchPage reads them correctly

## Phase 44: Bug Fix — Staff Create Page 404
- [x] Fix /staff/members/new route returning 404 — added StaffMemberDetailPage + StaffPositionDetailPage + routes in App.tsx

## Phase 45: Triple Punch — SSO Bug + CRUD Migration + Inline Staff Creation

### 1. Fix "No roles assigned" SSO bug
- [x] Diagnose why RoleSwitchPage shows "No roles assigned" after SSO login — user confirmed resolved
- [x] Fix roles data flow — SSO login flow verified working
- [x] Verify full SSO flow works end-to-end — confirmed by user

### 2. Migrate remaining CRUD endpoints from FastAPI to Express/tRPC
- [x] Migrate partner CRUD (list, get, create, update, deactivate) — server/routes/partners.ts
- [x] Migrate property CRUD (list, get, create, update, deactivate) — server/routes/properties.ts
- [x] Migrate room CRUD (list, get, create, update, bulk create) — server/routes/rooms.ts
- [x] Migrate service provider CRUD (list, get, create, update) — server/routes/providers.ts
- [x] Migrate catalog item CRUD (list, get, create, update) — server/routes/catalog.ts
- [x] Migrate service template CRUD (list, get, create, update, items) — server/routes/templates.ts
- [x] Migrate QR code endpoints (list, get, generate, activate, deactivate, revoke, extend) — server/routes/qrcodes.ts
- [x] Migrate staff endpoints (positions CRUD, members CRUD) — server/routes/staff.ts
- [x] Migrate user endpoints (list, get, invite, update, deactivate, reactivate) — server/routes/admin.ts
- [x] Migrate front office endpoints (stay tokens, sessions, requests) — server/routes/frontoffice.ts
- [x] Migrate audit log endpoint (list with filters) — server/routes/admin.ts
- [x] Migrate SSO allowlist endpoints (list, add, remove) — server/routes/admin.ts
- [x] Removed duplicate SSO allowlist/audit-log handlers from pepprAuth.ts
- [x] Frontend API client unchanged — same /api/v1/* URLs, Express routes now handle directly

### 3. Inline staff member creation
- [x] Add "Create New User" button + collapsible inline form in StaffMemberDetailPage
- [x] Build inline user creation form (full name, email, mobile, password, role)
- [x] Wire to POST /api/v1/auth/register endpoint — auto-selects created user
- [x] 89 tests passing across 7 test files

## Phase 46: Triple Punch — Remove FastAPI Proxy + Email Delivery + Seed Data

### 1. Disable/remove FastAPI apiProxy
- [x] Removed apiProxy registration from _core/index.ts (kept file for reference)
- [x] Updated sse.ts to use localhost self-reference instead of FASTAPI_BASE_URL
- [x] Cleaned up FastAPI-dependent code paths — all endpoints now Express-native
- [x] All 87 tests passing without the proxy

### 2. Email delivery for password reset
- [x] Created server/email.ts — email utility with SMTP support + owner notification fallback
- [x] Wired forgot-password endpoint to use sendPasswordResetEmail()
- [x] HTML email template with Peppr Around branding
- [x] Auto-detects SMTP config (SMTP_HOST/PORT/USER/PASS) — falls back to notifyOwner()
- [x] Installed nodemailer + @types/nodemailer

### 3. Seed initial data
- [x] Created seed.mjs — idempotent seed script with realistic Thai hospitality data
- [x] Seeded: 3 partners, 5 properties, 5 configs, 86 rooms, 6 providers, 20 catalog items, 5 templates, 9 positions, 8 staff users, 8 staff assignments, 23 QR codes, 86 room-template assignments
- [x] Staff login: any seeded email + password 'Peppr2026!'
- [x] All 87 tests passing across 7 test files

## Phase 47: Bug Fix — User Invite Page
- [x] Fix /users/invite page showing "Failed to load user" error — isNew check now recognizes 'invite' param
- [x] Fix email field not editable on invite/create mode — added /users/invite route in App.tsx
- [x] All 87 tests passing

## Phase 48: Bug Fix — QR Page React Error #185
- [x] Fix React error #185 (infinite re-render loop) on /qr page — replaced data?.items array dependency with stable itemIdsKey string in useEffect

## Phase 49: Scan & Fix All Infinite Re-render Patterns
- [x] Scanned all 10 useDemoFallback pages + all components for unstable useEffect deps
- [x] Only QRManagementPage had the pattern (already fixed in Phase 48)
- [x] DashboardPage and StaffAnalyticsPage use useMemo (not useEffect) — safe
- [x] All other list pages have zero useEffect calls — safe

## Phase 50: Triple Punch — Publish, DB Cleanup, SMTP
- [x] Added afterAll cleanup blocks to migrated-routes.test.ts (60s timeout) — auto-removes test records after each run
- [x] Added DELETE endpoints for partners, properties, positions, SSO allowlist
- [x] Fixed test script to use --no-cache flag for consistent results
- [x] 85 tests passing across 7 files with full cleanup
- [ ] Set up SMTP secrets for password reset email delivery — DEFERRED (using owner notification fallback)
- [x] Checkpoint saved — user guided to click Publish button in Management UI

## Phase 51: Bug Fix — Failed to load user on /users/invite (persistent)
- [x] Root cause: wouter returns params.id=undefined for static routes like /users/invite (no :id segment)
- [x] Fixed UserDetailPage: isNew now checks !params.id || params.id === 'new' || params.id === 'invite'
- [x] Fixed same bug in 6 other detail pages: partners, properties, rooms, providers, catalog, templates
- [x] 0 TS errors, all 9 detail pages now handle undefined params.id correctly

## Phase 52: Bug Fix — User Invite
- [x] Add POST /api/v1/users/invite endpoint (missing — frontend calls v1/users/invite but backend only has v1/admin/users)
- [x] Add GET /api/v1/users and GET /api/v1/users/:id routes to match frontend expectations
- [x] Fix field mapping: frontend sends {email, name, role, partner_id} but backend expects {email, full_name, role, partner_id}
- [x] Created dedicated server/routes/users.ts router with all user endpoints
- [x] Mounted at /api/v1/users in routes/index.ts
- [x] Added id/name aliases alongside user_id/full_name in all user responses
- [x] Added name→full_name alias in PUT /users/:id update handler
- [x] 11 new vitest tests passing (96 total across 8 files)

## Phase 53: User Invite — Welcome Email & Temp Password Flow
- [x] Return temp_password in POST /api/v1/users/invite response
- [x] Send welcome notification (owner notification + email via SMTP if configured) on invite
- [x] Update frontend invite success dialog to display temp password with copy button
- [x] Show "share with user" instructions in the success dialog
- [x] Write vitest tests for the updated invite response shape (96 tests passing)

## Phase 54: Bug Fix — TemplatesPage hooks violation
- [x] Fix "Rendered more hooks than during the previous render" in TemplatesPage (useMemo called after early return)
- [x] Moved useMemo (csvColumns) and useExportCSV above the isLoading early return
- [x] Scanned all other pages — only TemplatesPage had this pattern

## Phase 55: Critical Fix — Enable Role Switching on Existing Users
- [x] Verified PUT /api/v1/users/:id backend accepts role field and persists it
- [x] Added role normalization (uppercase) + validation in PUT handler (rejects invalid roles with 400)
- [x] Fixed frontend: role loaded as lowercase to match ROLES array, sent as lowercase, backend normalizes to uppercase
- [x] Roles & Access tab is fully editable in both invite and edit modes
- [x] Role change shows specific toast: "Role changed to Admin" (not generic "User updated")
- [x] Header role chip updates immediately after save
- [x] 4 new vitest tests: role switch lowercase, role switch uppercase, invalid role rejection, name update (99 total)

## Phase 56: Bug Fix — 404 on /users/:id/edit
- [x] Registered /users/:id/edit route in App.tsx pointing to UserDetailPage
- [x] Verified UsersPage Edit button navigates to /users/:id/edit (correct)
- [x] Verified View button navigates to /users/:id (correct)
- [x] Checked other entity types — staff/members/:id/edit and staff/positions/:id/edit already registered

## Phase 57: Role-Scope Binding — Require Partner/Property Based on Role
- [x] Defined role-scope rules: partner_admin→partner required; property_admin/staff→property required; system_admin/admin→no scope
- [x] Frontend Profile tab: Partner field appears for partner_admin; Property field appears for property_admin/staff
- [x] Frontend validation: save blocked with clear error if required scope missing; auto-switches to Profile tab
- [x] Roles & Access tab: scope requirement chip per role card; scope binding summary shown after selection
- [x] Backend invite: duplicate check moved before role-scope validation (409 > 400); role-scope enforced with 400
- [x] Backend PUT: role-scope validation checks effective scope (new + existing user values)
- [x] 10 new vitest tests for role-scope binding (106 total, all passing)

## Phase 58: Genesis Architecture Alignment (AR Genesis V1.2)

### Batch 1 — Documentation (Zero Risk)
- [x] Created docs/genesis-discovery-report.md — full discovery analysis vs Genesis canon
- [x] Created docs/domain-map.md — Around V2 to Genesis term mapping (ServiceRequest=Transaction, CatalogItem=Listing, etc.)
- [x] Created docs/state-semantics.md — ServiceRequest lifecycle with valid/invalid transitions
- [x] Created docs/module-boundaries.md — layer overview, route ownership, BFF/Core boundary concern

### Batch 2 — Audit Log Completeness (Low Risk)
- [x] Added logAuditEvent() to PATCH /requests/:id/status (CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED)
- [x] Added state transition validation (VALID_TRANSITIONS map) — rejects invalid transitions with 422
- [x] Added logAuditEvent() to POST /qr-codes/:id/revoke
- [x] Added 404 pre-check to QR revoke before mutation
- [x] All 106 tests passing (8 test files)

### Deferred Batches (require product decision)
- [ ] Batch 3: Extract service layer for ServiceRequest (server/services/serviceRequestService.ts)
- [ ] Batch 4: Naming aliases in API responses (transaction_id, listing_id)
- [ ] Batch 5: Payment module (pepprPayments table, gateway integration) — needs payment provider decision
- [ ] Batch 6: Fulfillment separation (pepprFulfillments table) — needs schema migration approval

## Phase 59: Domain Module Extraction (Genesis Batch 3+)

### Audit
- [x] Read all server route files and mapped business logic locations
- [x] Identified all state mutation points for ServiceRequest/Transaction

### Batch 1 — Transaction Module + State Machine
- [x] Created server/domain/transaction/transactionStateMachine.ts (pure, no DB, no HTTP)
- [x] Created server/domain/transaction/transactionRepository.ts (DB only, no logic)
- [x] Created server/domain/transaction/transactionService.ts (orchestration: state machine + repo + audit)
- [x] Created server/domain/audit/auditService.ts (extracted from admin.ts)
- [x] Rewrote server/routes/frontoffice.ts as thin handler shell (zero Drizzle imports for service requests)
- [x] VALID_TRANSITIONS lives only in transactionStateMachine.ts
- [x] logAuditEvent for transactions called only from transactionService.ts
- [x] Updated docs/state-semantics.md, docs/module-structure-v2.md, docs/safe-batch-plan.md
- [x] 28 new vitest tests for state machine (134 total, all passing)

### Deferred Batches
- [ ] Batch 2: listing module (CatalogItem + Template)
- [ ] Batch 3: provider module (ServiceProvider)
- [ ] Batch 4: payment module (stub + gateway interface)
- [ ] Batch 5: fulfillment module (auditable fulfillment records)

## Phase 60: Bug Fix — Edit Button 404 Across All List Pages
- [x] Audited all list pages for edit navigation paths
- [x] Compared against App.tsx registered routes — found 6 missing, 2 already correct
- [x] Added /partners/:id/edit → PartnerDetailPage
- [x] Added /properties/:id/edit → PropertyDetailPage
- [x] Added /rooms/:id/edit → RoomDetailPage
- [x] Added /providers/:id/edit → ProviderDetailPage
- [x] Added /catalog/:id/edit → CatalogDetailPage
- [x] Added /templates/:id/edit → TemplateDetailPage
- [x] /users/:id/edit and /staff/members/:id/edit were already registered (no change needed)

## Phase 61: UX Polish — New Button Audit, Edit Mode Indicator, Cancel Button
- [x] Audited all "New"/"Add" button navigation paths — all 10 /new routes already registered, no gaps
- [x] Added Edit mode "Editing" badge (warning Chip) to PageHeader on all 9 editable detail pages
- [x] Added Cancel button (red outlined, X icon) on all 9 detail pages — only visible in edit mode, navigates to view URL
- [x] Enhanced PageHeader component with optional badge prop
- [x] All 134 tests pass, 9 test files, no TypeScript errors

## Phase 62: QR Scan Simulator — Full-Fidelity Guest Preview
- [x] Audit QR detail page, guest pages, and public API endpoints
- [x] Add "Test Scan" button to QR detail page (opens simulator at /qr/:id/simulate)
- [x] Build simulator preview page that reflects real QR setup: access type, property branding, room info, service template, catalog items, pricing
- [x] Fix guest API routing — mounted guest router at /api/public/guest and /api/v1/public
- [x] Add phone-frame mockup wrapper for realistic mobile preview (375x667 iPhone frame with URL bar)
- [x] Show simulator data summary panel (QR config, property & room, public API status, flow guide)
- [x] Register /qr/:id/simulate route in App.tsx
- [x] 14 new vitest tests for guest router endpoints (148 total, all passing)

## Phase 62b: Bug Fix — QR Scan Simulator "QR Code not found"
- [x] Investigated: frontend qrApi calls /api/v1/properties/:propertyId/qr/:qrCodeId but no route existed at that path
- [x] Created property-scoped QR router (server/routes/property-qr.ts) with all 12 endpoints matching frontend API contract
- [x] Mounted at /api/v1/properties/:propertyId/qr in routes/index.ts
- [x] Added 12 vitest tests for property-scoped QR route mounting — 160 total tests passing

## Phase 62c: Bug Fix — Guest scan page shows "Something went wrong verifying this QR code"
- [x] Root cause: ky client throws synchronous error when path starts with `/` and `prefixUrl` is set
- [x] Fixed ScanLandingPage.tsx line 59: removed leading `/` from branding API call (`/public/guest/...` → `public/guest/...`)
- [x] Fixed CommandPalette.tsx lines 80-82: removed leading `/` from 3 search API calls
- [x] All 160 tests passing, guest scan page now shows correct "Verification Required" flow

## Phase 62d: Bug Fix — Simulator Public API Status panel shows error
- [x] Root cause: statusQuery used DB UUID (params.id) instead of QR code ID (qr.qr_code_id) for the public endpoint
- [x] Fixed: statusQuery now depends on qr.qr_code_id from admin query result, runs after admin data loads
- [x] All 160 tests passing

## Phase 63: Simulator Enhancements — Full E2E Flow, Template Details, Public QR
- [x] Fixed session validate endpoint (case-insensitive status check: ACTIVE vs active)
- [x] Seeded stay tokens for Andaman Pearl Beach Resort rooms and assigned templates to rooms
- [x] Added Service Template card to simulator data panel (template name, tier, status, item count, grouped menu items with prices, total value)
- [x] Added dynamic Stay Token card — fetches active tokens from admin API instead of hardcoded value, shows expiry dates and copy buttons
- [x] Verified public QR codes work end-to-end (QR-SIAM-103: scan → auto-session → Standard Room Package menu)
- [x] Verified restricted QR codes work end-to-end (QR-PEARL-102: scan → token → session → Beach Resort Package menu)
- [x] Added 14 new E2E vitest tests (guest-e2e-flow.test.ts) — 174 total tests passing
- [x] Fixed ky leading slash bug in ScanLandingPage branding call and CommandPalette search calls

## Phase 63b: Bug Fix — Simulator stay token invalid + no template assigned
- [x] Root cause 1: No stay token existed for Room 101 (tokens were only created for rooms 102, 103, 106)
- [x] Root cause 2: Room 101 had template_id = NULL (template assignment only covered rooms 102, 103, 106)
- [x] Fixed: Created stay token STK-PEARL-R101 for Room 101, assigned Beach Resort Package template to all Pearl rooms
- [x] Verified full E2E flow: token validation → session creation → menu with 3 items (Phi Phi Island, Sunset Cruise, Scuba Diving)
- [x] 174 tests passing

## Phase 63c: Bug Fix — Stay Token card not visible in simulator data panel
- [x] Moved Stay Token card to 2nd position (right after QR Configuration) with prominent purple border
- [x] Enhanced token display with larger font, shield icon, and purple copy button
- [x] Added room_id filter to stay-tokens GET endpoint so simulator only shows tokens for the specific room
- [x] 174 tests passing

## Phase 63d: Bug Fix — Stay Token card shows "No active stay tokens" when tokens exist
- [x] Root cause: ky client sends Bearer token (from localStorage) but admin is authenticated via Manus OAuth session cookie
- [x] Created tRPC `stayTokens.listByRoom` procedure that uses Manus session cookie auth
- [x] Replaced ky-based fetch with `trpc.stayTokens.listByRoom.useQuery()` in simulator
- [x] Fixed TypeScript error: expires_at can be null
- [x] 174 tests passing

## Phase 64: Bug Fix — SYSTEM_ADMIN role sees limited sidebar (only Dashboard + Front Office)
- [ ] Investigate RBAC sidebar filtering logic — SYSTEM_ADMIN must have same access as SUPER_ADMIN
- [ ] Fix permission mapping so SYSTEM_ADMIN grants full admin sidebar visibility
- [ ] Test with supara.d@peppr.vip account to verify full menu is visible

## Phase 64 (completed): Bug Fix — SYSTEM_ADMIN role sees limited sidebar
- [x] Root cause: SYSTEM_ADMIN missing from RoleId type in navigation.ts — allowedRoles.includes("SYSTEM_ADMIN") always returned false
- [x] Fixed: Added SYSTEM_ADMIN to RoleId union type and all 30+ allowedRoles arrays across 6 nav groups
- [x] SYSTEM_ADMIN now has identical full-access navigation as SUPER_ADMIN
- [x] 174 tests passing

## Phase 65: Three-punch improvements
- [x] SYSTEM_ADMIN backend enforcement — added SYSTEM_ADMIN to ROLE_DEFINITIONS in rbacRouter.ts with permissions: ["*"]; updated all 3 SUPER_ADMIN-only tRPC guards (listUsers, assignRole, revokeRole) to also accept SYSTEM_ADMIN
- [x] Seed stay tokens for all Siam Riverside Hotel rooms — created 50 STK-SIAM-R* tokens (one per room, 30-day expiry); assigned Suite Premium Package template to 43 rooms that had NULL template_id
- [x] Generate Test Token button in QR Simulator — added generateTestToken tRPC mutation (creates STK-TEST-R{room}-{suffix} with 24h expiry); button appears in Stay Token card for restricted QR codes; auto-copies generated token to clipboard and refreshes token list
- [x] 174 tests passing

## Phase 66: Bug Fix — QR Simulator shows "QR Code not found" for demo IDs
- [x] Root cause 1: useDemoFallback treated a disabled query (enabled: false, waiting for propertyId) as "demo mode" because isLoading=false and data=undefined — showed demo rows immediately before real data loaded
- [x] Fixed useDemoFallback: check fetchStatus === "idle" to detect disabled queries; only fall back to demo data when the query is enabled AND has definitively failed
- [x] Root cause 2: QR Management View button allowed navigation to demo IDs (e.g. qr-002) which don't exist in the DB
- [x] Fixed QRManagementPage: disabled View button when isDemo=true with tooltip "Connect backend to view real QR codes"
- [x] QR Simulator: added isDemoId detection (/^qr-\d+$/) to show a clear "Demo data detected" warning instead of cryptic error message
- [x] 174 tests passing

## Phase 67: Property Context Switcher in Top Bar
- [x] Audit DashboardLayout top bar and useActiveProperty hook
- [x] Build PropertySwitcher dropdown component (search, badge, keyboard nav, status dots)
- [x] Wire PropertySwitcher into TopBar between ActiveRoleBadge and Search (SUPER_ADMIN + SYSTEM_ADMIN only)
- [x] Updated useActiveProperty: reactive switching via pa:property-changed event — no page reload needed
- [x] setActiveProperty() persists to localStorage and dispatches event so all hook instances update instantly
- [x] 174 tests passing

## Phase 68: Active Property in Sidebar Header
- [x] Audit AdminLayout sidebar header structure (Sidebar.tsx brand header section)
- [x] Added ActivePropertyHeader component: logo + status dot overlay (always visible) + property name below app title
- [x] Collapsed state: status dot stays on logo corner with tooltip showing property name and status
- [x] Expanded state: small colored dot + property name truncated to 140px below "Peppr Around" title
- [x] Falls back to "Admin Console" label when no property is resolved
- [x] Shares ["properties", "switcher"] query cache with PropertySwitcher (zero extra API calls)
- [x] 174 tests passing

## Phase 69: Fix QR Image in QR Management
- [x] Audited QRDetailPage and QRPrintPage — both used a fake hash-based SVG generator (not scannable)
- [x] Installed `qrcode` + `@types/qrcode` npm packages
- [x] Created shared QRCodeImage component (client/src/components/QRCodeImage.tsx) using real qrcode library
- [x] Also exported generateQRDataUrl() and generateQRSvgString() helpers for download buttons
- [x] QRDetailPage: replaced dangerouslySetInnerHTML SVG with <QRCodeImage url={scanUrl} size={184} />
- [x] QRDetailPage: PNG/SVG download buttons now use real qrcode library (generateQRDataUrl/generateQRSvgString)
- [x] QRPrintPage: replaced fake SVG img tag with <QRCodeImage url={scanUrl} size={cardSize} />
- [x] Scan URL format: {window.location.origin}/guest/scan/{qr_code_id} (matches existing pattern)
- [x] 174 tests passing

## Phase 70: Multi-Role Model Refactor
- [x] Audited schema: peppr_user_roles already existed but had no partner_id/property_id columns
- [x] Added partner_id and property_id columns to pepprUserRoles in drizzle/schema.ts
- [x] Ran pnpm db:push — migration applied (7 columns in peppr_user_roles)
- [x] Existing single-role data preserved in users.role (primary role); new bindings go into peppr_user_roles
- [x] assignRole: now accepts partnerId/propertyId and saves them to peppr_user_roles; duplicate check scoped per (userId, roleId, partnerId, propertyId)
- [x] revokeRole: supports scope-specific revocation by row ID or by roleId+scopeId
- [x] myRoles: now joins peppr_partners and peppr_properties to build real scopeLabel (e.g. 'Andaman Pearl Group')
- [x] buildRoleAssignment: accepts scopeId/scopeLabel params, no longer hardcodes null
- [x] GET /users/:id: returns roles[] array with partner_id and property_id on each binding
- [x] POST /users/invite: accepts role_bindings[] array (multi-role); legacy single-role format still supported
- [x] Switch Role (ActiveRoleBadge + useActiveRole): already reactive to myRoles — now shows real scope labels
- [x] Invite User UI (UserDetailPage): fully rewritten with multi-role checkboxes + per-role binding selectors
  - Checkbox cards for all 6 roles with color-coded borders
  - 'Add another partner/property' button for multi-binding per role
  - Inline Partner/Property dropdowns (not raw ID fields)
  - Validation: blocks save if scoped role has no binding selected
  - Role count badge on Roles & Access tab
- [x] AddRoleDialog in UserManagementPage: replaced raw ID text field with Partner/Property dropdowns
- [x] 174 tests passing (12 test files)

## Phase 71: Role Model Polish
- [x] Ran backfill script (scripts/backfill-user-roles.mjs) — 257 users migrated into peppr_user_roles; idempotent, safe to re-run
- [x] Added inline role binding management to UserDetailPage view mode:
  - Roles & Access tab shows all current bindings as cards with role color dot, scope label, and Revoke button
  - 'Add Role Binding' button opens dialog with role dropdown + Partner/Property selectors + scope hint
  - Uses trpc.rbac.getUserRoles (new procedure) + trpc.rbac.assignRole + trpc.rbac.revokeRole
  - Refresh button invalidates getUserRoles cache for live updates
- [x] Switch Role post-login prompt: already fully implemented
  - SsoCompletePage clears peppr_active_role and redirects to /role-switch
  - LoginPage (email/password) also redirects to /role-switch after success
  - RoleSwitchPage: auto-selects single-role users, shows RoleCarousel for multi-role, supports 'Remember my role'
- [x] 174 tests passing (12 test files)

## Phase 72: Unified Onboarding Drill-Down Page
- [x] Audit Partners, Properties, Rooms pages and API endpoints
- [x] Build OnboardingPage: Partner Carousel (cards + New Partner card)
- [x] Add Service Area Grid section (appears on Partner selection, card grid + New Service Area)
- [x] Add Service Unit DataTable (appears on Service Area selection, shows QR binding status)
- [x] Add /onboarding route, redirect /partners /properties /rooms to /onboarding
- [x] Update sidebar: replace Partners/Properties/Rooms with single "Onboarding" item
- [x] Run tests and verify 174 pass (174 tests, 0 TypeScript errors)

## Phase 73: Fix OnboardingPage Partner Selection Deadlock
- [x] Diagnose why selecting a Partner card does not reveal the Service Areas section
- [x] Fix: replaced per-partner/per-area queries (which caused re-fetch deadlock) with single bulk fetch of all properties (page_size=500) and all rooms (page_size=1000), filtered client-side — no re-fetch on selection change
- [x] Verify Service Areas appear after Partner click, Service Units appear after Service Area click
- [x] 174 tests passing, 0 TypeScript errors

## Phase 74: OnboardingPage — Three Improvements
- [x] Clean up test data: renamed 7 "Updated Partner" records to realistic Thai hospitality group names (Phuket Luxury Villas, Chiang Mai Boutique Hotels, Samui Beach Resorts, Bangkok Prestige Hotels, Krabi Eco Retreats, Hua Hin Seaside Hotels, Pattaya Marina Resorts); added one service area per partner
- [x] Add QR completion progress bar on Partner cards (LinearProgress, qrBound/qrTotal aggregated from allRooms via qrStatsByPartner map)
- [x] Add QR completion progress bar on Service Area cards (LinearProgress, qrBound/qrTotal per property via qrStatsByProperty map)
- [x] Smooth scroll-to-section: useRef + useEffect scroll on selectedPartner change (scrolls to Service Areas) and selectedServiceArea change (scrolls to Service Units); scrollMarginTop: 80px to clear topbar
- [x] 174 tests passing, 0 TypeScript errors

## Phase 75: OnboardingPage — Three More Features
- [x] Inline QR assignment side-drawer: clicking "Assign QR" on a Service Unit row opens a 400px right drawer with unit summary, access type selector (public/restricted), and Generate & Assign button calling qrApi.generate
- [x] Completion badge overlay on Partner cards: green checkmark badge when 100% QR-bound, amber warning badge when 0 total units; hidden when selected (avoids overlap with selection indicator)
- [x] Bulk seed rooms modal: "Quick Setup" button appears below Service Area cards with 0 rooms; modal accepts floors, rooms/floor, room type, optional zone; generates numbered rooms (e.g. 101, 102, 201) via roomsApi.bulkCreate
- [x] All APIs already existed (useGenerateQR, useBulkCreateRooms) — no new tRPC procedures needed
- [x] 174 tests passing, 0 TypeScript errors

## Phase 76: Fix Service Area Selection Deadlock
- [x] Diagnosed: Phase 75 wrapped ServiceAreaCard in an outer <Box> for the Quick Setup button; the wrapper broke grid item sizing and caused click area misalignment, making the card appear unresponsive
- [x] Fixed: moved Quick Setup button inside ServiceAreaCard as a footer via new optional `onQuickSetup` prop; double stopPropagation on both the wrapper Box and the Button ensures card click still fires for selection
- [x] Removed outer wrapper Box entirely from the grid — ServiceAreaCard is now a direct grid child again
- [x] 174 tests passing, 0 TypeScript errors

## Phase 77: Fix Service Area Switch Deadlock
- [x] Reproduced: Partner > 1st Service Area (empty results) > 2nd Service Area = UI halted
- [x] Root cause: useMaterialReactTable used `initialState` only — pagination and columnFilters were never reset when selectedServiceArea changed; MRT's internal state machine got stuck on stale filter/pagination values from the empty-data first selection
- [x] Fix: lifted pagination and columnFilters into controlled React state (tablePagination, tableColumnFilters); added useEffect watching selectedServiceArea?.id to reset both to defaults on every Service Area switch; wired state + onChange handlers into useMaterialReactTable
- [x] 174 tests passing, 0 TypeScript errors

## Phase 78: Fix Service Area Card Double-Selection Bug
- [x] Diagnosed: (1) hover CSS used same `secondary.main` color as selected border — unselected card looked selected on hover; (2) `MaterialReactTable` had no `key` prop so MRT's internal state (pagination/filters) persisted across Service Area switches causing the table to deadlock when switching from an empty area to a populated one
- [x] Fixed hover: unselected card hover now uses `rgba(139,92,246,0.45)` (lighter tint) vs solid `secondary.main` for selected — visually distinct
- [x] Fixed deadlock: added `key={selectedServiceArea?.id ?? "none"}` to `<MaterialReactTable>` — React fully remounts the table on every Service Area switch, giving it a clean slate with no stale internal state
- [x] 174 tests passing, 0 TypeScript errors

## Phase 79: OnboardingPage — Three More Improvements
- [x] rooms_count cache refresh: useBulkCreateRooms.onSuccess now invalidates both ["rooms"] and ["properties"] — Service Area card counts update immediately after Quick Setup
- [x] Partner card hover fix: hover now uses rgba(99,102,241,0.45) tint vs solid primary.main for selected — visually distinct
- [x] Bulk QR generation: row-selection checkboxes enabled (enableRowSelection, getRowId, state.rowSelection); "Generate QR (N)" button appears in toolbar when rows selected; rowSelection resets on Service Area switch
- [x] Root bug also fixed: Drawer + Dialog were inside the main content Box, blocking the Service Units section from rendering — moved outside into a Fragment wrapper
- [x] 174 tests passing, 0 TypeScript errors

## Phase 80: Critical Fix — Service Units Section Never Renders
- [x] Root cause confirmed: previous "fix" (Phase 79) split the return into TWO separate `<Box>` containers inside a Fragment — the Service Units section was in a second Box that rendered OUTSIDE the DashboardLayout's scrollable viewport, making it permanently invisible
- [x] Fix: removed the Fragment wrapper and the second Box entirely; all three sections (Partners, Service Areas, Service Units) + Drawer + Dialog are now inside a single root `<Box>` container
- [x] 174 tests passing, 0 TypeScript errors

## Phase 82: Critical Bug Fix — Service Units Table Not Appearing
- [x] Fix: selectedServiceArea state set but Service Units table not rendering (purple border shows but table stays hidden)

## Phase 83: Card Selected State — Solid Fill Design
- [x] Selected Partner card: solid blue background fill with white/light text
- [x] Selected Service Area card: solid purple background fill with white/light text

## Phase 84: Section Header Solid-Fill Tint
- [x] Service Areas section header: indigo tint fill when a Partner is selected
- [x] Service Units section header: purple tint fill when a Service Area is selected

## Phase 85: Three UX Improvements
- [x] Deselect on second click: clicking selected Partner/Service Area card again clears selection
- [x] Sticky section headers: Service Areas and Service Units headers stay visible while scrolling
- [x] Breadcrumb trail in Service Units header: show [Partner] › [Service Area] path

## Phase 86: URL State Persistence + Onboarding Health Bar
- [x] Persist ?partner=X&area=Y in URL; restore selection on page load/refresh
- [x] Onboarding health progress bar in page header (% QR-bound across all units)

## Phase 87: Codebase-Wide Inline Query Param Audit & Fix
- [x] Audit QR Management page for inline object query params
- [x] Audit Properties page for inline object query params
- [x] Audit Rooms list page for inline object query params
- [x] Fix PartnersPage: stabilize params + demo data with useState
- [x] Fix PropertiesPage: stabilize params + demo data with useState
- [x] Fix RoomsPage: stabilize params + demo data with useState
- [x] Fix ProvidersPage: stabilize params + demo data with useState
- [x] Fix CatalogPage: stabilize params + demo data with useState
- [x] Fix TemplatesPage: stabilize params + demo data with useState
- [x] Fix UsersPage: stabilize params + demo data with useState
- [x] Fix QRManagementPage: stabilize demo data with useState
- [x] Fix StaffPage: stabilize demo data with useState
- [x] Fix FrontOfficePage: stabilize demo data with useState

## Phase 88: Fix Sticky Header Overlay Bug
- [x] Remove sticky positioning from Service Areas and Service Units section headers (overlaying cards)

## Sprint 1: Schema Migration (Post-Cart MVP)
- [x] Add service_requests table to drizzle/schema.ts (extended with matchingMode, slaDeadline, autoConfirmed)
- [x] Add request_items table to drizzle/schema.ts
- [x] Add sp_assignments table to drizzle/schema.ts
- [x] Add payments table to drizzle/schema.ts
- [x] Add request_events table to drizzle/schema.ts
- [x] Add request_notes table to drizzle/schema.ts
- [x] Run pnpm db:push to migrate schema (migration 0005_quick_puck.sql applied)

## Sprint 2: Request Generation API
- [x] tRPC procedure: submitCart (cart → service_request, generate ref_no REQ-YYYYMMDD-NNNN)
- [x] tRPC procedure: getRequest (fetch request + items + assignment + payment + events)
- [x] tRPC procedure: listByProperty (FO queue with status filter)
- [x] tRPC procedure: assignProvider (FO manual/auto dispatch)
- [x] tRPC procedure: acceptJob / rejectJob (SP actions)
- [x] tRPC procedure: markInProgress / markCompleted (SP lifecycle)
- [x] tRPC procedure: confirmFulfilled / raiseDispute (guest OPT-IN)
- [x] tRPC procedure: cancelRequest (pre-payment only)
- [x] tRPC procedure: addNote / listProviders
- [x] Notify Front Office on new request and SP rejection via notifyOwner
- [x] Register requestsRouter in appRouter

## Sprint 3: Front Office Portal (/fo/* route-gated, single project)
- [x] Add front_office and service_provider roles to RBAC
- [x] Create FOLayout with role-gated access (amber theme, FRONT_DESK/PROPERTY_ADMIN/SUPER_ADMIN)
- [x] Register /fo/* routes in App.tsx
- [x] FO: Request queue page with live SLA countdown clock
- [x] FO: Auto/Manual matching toggle per request
- [x] FO: Assign provider dialog with provider shortlist
- [x] FO: Reject/cancel request with reason
- [x] FO: Request detail drawer with audit log and notes

## Sprint 4: SP Portal (/sp/* route-gated, single project)
- [x] Create SPLayout with role-gated access (teal theme)
- [x] Register /sp/* routes in App.tsx
- [x] SP: Job queue page (Incoming/Active/History tabs)
- [x] SP: Accept job form (ETA, staff name, delivery notes)
- [x] SP: Reject job form with reason
- [x] SP: Mark In Progress and Mark Completed actions
- [x] Write vitest tests for requestsRouter procedures (189 tests passing, 13 test files)

## Sprint 5: Guest Checkout, Role Switch & Payment Gateway (Stub)
- [x] Add FRONT_DESK and SERVICE_PROVIDER role cards to Role Switch page (quick-access shortcuts + portal buttons below carousel)
- [x] Wire Guest PWA cart "Confirm Order" to trpc.requests.submitCart
- [x] Redirect guest to /guest/track/{requestNumber} after submitCart
- [x] Build stub payment gateway server module (server/stubPaymentGateway.ts)
- [x] tRPC procedure: initiatePayment (stub: returns QR data + amount, stores charge in memory)
- [x] tRPC procedure: pollPayment (stub: simulates PENDING → PAID after 15s, transitions request to PAYMENT_CONFIRMED)
- [x] tRPC procedure: getByRefNo (public: fetch request by REQ-YYYYMMDD-NNNN for guest tracking)
- [x] Build QR Payment page for guest (/guest/payment/:requestId)
- [x] QR Payment page: PromptPay QR display (SVG stub), amount, countdown timer
- [x] QR Payment page: polling loop (every 3s via tRPC useQuery refetchInterval) → transitions to PAYMENT_CONFIRMED
- [x] QR Payment page: auto-confirm after 15s (stub only, "Demo mode" notice shown)
- [x] pepprPayments schema updated: added gatewayChargeId, qrDataUrl, expiresAt, paidAt columns
- [x] Write vitest tests for stub PGW (204 tests passing, 14 test files)

## Sprint 6: Three Follow-Up Features
- [x] Migrate TrackRequestPage to use trpc.requests.getByRefNo instead of legacy guestApi.trackRequest()
- [x] Add "Simulate Payment" button to PaymentPage (stub-only, forces immediate PAID without waiting 15s)
- [x] FO portal: FORequestDetailPage at /fo/queue/:id with "Send Payment Link" panel for SP_ACCEPTED requests
- [x] simulatePayment tRPC procedure added to requestsRouter (force-confirms pending payment)
- [x] Write vitest tests for Sprint 6 features (230 tests passing, 15 test files)

## Sprint 7: Real-time FO Notifications, In-Progress Transition & SMS Stub
- [x] SP acceptance (acceptJob tRPC) emits SSE event to FO queue channel via broadcastToProperty
- [x] FOQueuePage: SSE connected via useFrontOfficeSSE; Live/Polling indicator + unread badge
- [x] useFrontOfficeSSE: now invalidates tRPC listByProperty + getRequest on request.updated events
- [x] markInProgress tRPC procedure enhanced: state guard, SSE broadcast, proper error message
- [x] FORequestDetailPage: "Mark In Progress" button (header) + Payment Confirmed banner with "Start Service" button
- [x] sendPaymentSms tRPC procedure added (stub: logs SMS/WhatsApp, returns mock delivery receipt)
- [x] FORequestDetailPage PaymentLinkPanel: "Send SMS" + "WhatsApp" buttons with sent feedback states
- [x] Write vitest tests for Sprint 7 features (252 tests passing, 16 test files)

## Sprint 8: Complete Service, Guest SSE, SMS Stub Upgrade
- [x] markCompleted enhanced: state guard, propertyId lookup, SSE broadcast to FO + guest, owner notification, feedbackUrl in response
- [x] Add "Complete Service" button (green, Flag icon) on FORequestDetailPage header for IN_PROGRESS requests
- [x] Add In Progress banner (cyan) with inline Complete Service button on FORequestDetailPage
- [x] Add Completed banner (green) with SLA deadline and guest feedback pending indicator on FORequestDetailPage
- [x] Guest SSE endpoint added to sse.ts (/api/sse/guest/:requestId) with broadcastToRequest helper
- [x] broadcastToRequest called from pollPayment, simulatePayment, and markCompleted for instant guest updates
- [x] useGuestSSE hook created (client/src/hooks/useGuestSSE.ts) with auto-reconnect and stable callback
- [x] TrackRequestPage wired to useGuestSSE: instant updates + live dot indicator (green=SSE, amber=polling)
- [x] stubSmsGateway.ts created: Twilio-shaped receipts, normalisePhone, segment counting, pricePerSegment
- [x] Stub SMS: 4 configurable failure modes via STUB_SMS_FAILURE_MODE env (network, invalid_number, rate_limit, timeout)
- [x] sendPaymentSms upgraded: uses stubSmsGateway, throws TRPCError on delivery failure, returns full receipt
- [x] Write vitest tests for Sprint 8 (276 tests passing, 17 test files)

## Sprint 9: Path-Based Route Reorganisation (bo.peppr.vip)
- [x] Audit full route map and document before/after path table (24 admin paths, 5 auth paths, /fo/* and /sp/* unchanged, /guest/* unchanged)
- [x] Prefix all admin/back-office routes with /admin in App.tsx (dashboard, onboarding, partners, properties, rooms, providers, catalog, templates, qr, front-office, users, staff, reports, settings, system)
- [x] Prefix all auth routes with /admin (/auth/login → /admin/login, /auth/sso-complete → /admin/sso-complete, etc.)
- [x] /fo/* and /sp/* routes already correctly prefixed — no changes needed
- [x] /guest/* routes unchanged
- [x] Update all navigate() calls across 30+ admin page files via bulk sed
- [x] Update navigation.ts: 24 path entries updated to /admin prefix
- [x] Update Sidebar active-path check for /admin dashboard root
- [x] Update RoleSwitchPage: getLandingPath returns /admin for admin roles; auto-select navigates to /admin
- [x] Update AdminGuard: redirects to /admin/login and /admin/role-switch
- [x] Update ActiveRoleBadge: home navigation to /admin
- [x] Update FOLayout and SPLayout: /auth/login → /admin/login, /role-switch → /admin/role-switch
- [x] Update server-side OAuth callback (_core/oauth.ts): /auth/sso-complete → /admin/sso-complete, /auth/sso-no-account → /admin/sso-no-account
- [x] Update server-side password reset links (pepprAuth.ts): /auth/reset-password → /admin/reset-password
- [x] Fix accidentally renamed API endpoint back to /api/v1/auth/reset-password
- [x] Add legacy /auth/* → /admin/* redirect routes in App.tsx for backward compatibility
- [x] Add root / → /admin redirect in App.tsx
- [x] 276 tests passing, 0 TypeScript errors

## Sprint 10: Fulfill/Dispute Flow, SMS Secret, Role-Aware Landing
- [x] confirmFulfilled: state guard (COMPLETED only), SSE broadcast to FO + guest, returns FULFILLED
- [x] raiseDispute: expanded state guard (COMPLETED + IN_PROGRESS), SSE broadcast, owner notification with requestNumber
- [x] TrackRequestPage: disputeDialogOpen + disputeReason state variables added
- [x] TrackRequestPage: FULFILLED banner (green) shown when status=FULFILLED
- [x] TrackRequestPage: DISPUTED banner (red) shown when status=DISPUTED
- [x] TrackRequestPage: "Confirm Service Received" button (canConfirm flag) for COMPLETED status
- [x] TrackRequestPage: "Something went wrong" button (canDispute flag) for COMPLETED/IN_PROGRESS
- [x] TrackRequestPage: Dispute dialog with min-5-char reason validation and Submit Dispute button
- [x] STUB_SMS_FAILURE_MODE exposed as toggleable secret via Secrets panel
- [x] Role-aware landing: getLandingPath moved above useEffect, wrapped in useCallback
- [x] Auto-select (single role) uses getLandingPath — FRONT_DESK/PROPERTY_ADMIN → /fo, SERVICE_PROVIDER → /sp
- [x] Remember-role auto-select uses getLandingPath for correct portal redirect
- [x] 314 tests passing, 18 test files, 0 TypeScript errors

## Bug Fix: Port Overseer 404
- [x] Root cause: deployed version predates Sprint 9 /admin prefix — route is correct in code; fix = Publish latest checkpoint

## Sprint 11: FO Dispute Resolution, SP Job Detail
- [x] resolveDispute tRPC procedure: DISPUTED → RESOLVED, 5-char min resolution note, SSE broadcast to FO + guest, audit log with actorId/actorType, owner notification
- [x] FORequestDetailPage: FULFILLED banner (emerald, ShieldCheck icon, guest confirmed message)
- [x] FORequestDetailPage: DISPUTED banner (orange, AlertOctagon icon, guest reason + Resolve Dispute button)
- [x] FORequestDetailPage: Resolve Dispute dialog (resolution note field, min 5 chars, Submit Dispute button)
- [x] FORequestDetailPage: RESOLVED banner (purple, Scale icon, resolution note displayed)
- [x] SPJobDetailPage created at /sp/jobs/:id (read-only: status banners, items, payment info, assignment details, guest info, timeline, audit log)
- [x] SPJobDetailPage: SP actions shown contextually (Accept/Decline for DISPATCHED, Start Job for SP_ACCEPTED, Mark Complete for IN_PROGRESS)
- [x] SPJobQueuePage: "Details" button added to every JobCard navigating to /sp/jobs/:id
- [x] App.tsx: /sp/jobs/:id route registered
- [x] 335 tests passing, 19 test files, 0 TypeScript errors

## Sprint 12: Guest RESOLVED Banner, SP Dispute Summary, SP Queue Pagination
- [x] TrackRequestPage: RESOLVED banner (purple, resolution note from statusReason)
- [x] TrackRequestPage: RESOLVED state shown in status stepper/timeline
- [x] SPJobDetailPage: dispute reason section (read-only, shown when DISPUTED/RESOLVED)
- [x] SPJobDetailPage: resolution note section (read-only, shown when RESOLVED)
- [x] SPJobQueuePage: cursor-based pagination tRPC input (limit + cursor, createdAt timestamp)
- [x] SPJobQueuePage: Load More button (appends without duplicates, hidden when no more pages)
- [x] SPOverviewPage + SPLayout: updated to use paginated { items, nextCursor } response shape
- [x] Write vitest tests for Sprint 12 features (10 new pagination tests)
- [x] 345 tests passing, 19 test files, 0 TypeScript errors

## Sprint 13: SP Filters, FO Search, Auto-Confirm Worker
- [x] SPJobQueuePage: status filter dropdown (All / Incoming / Active / History)
- [x] SPJobQueuePage: date range filter (from/to date pickers)
- [x] SPJobQueuePage: reset filters button + result count badge
- [x] FOQueuePage: debounced search input (300ms, ref number, room, guest name)
- [x] FOQueuePage: clear (X) button resets both input and debounced state simultaneously
- [x] Auto-confirm timeout worker: server-side interval (60s) transitions COMPLETED → FULFILLED after 10 min
- [x] Auto-confirm worker: logs audit event with actorType=system, actorId=auto-confirm-worker
- [x] Auto-confirm worker: broadcasts SSE to FO property channel and guest request channel
- [x] Auto-confirm worker: idempotent start/stop lifecycle
- [x] Write vitest tests for Sprint 13 features (38 new tests across 2 test files)
- [x] 383 tests passing, 21 test files, 0 TypeScript errors

## Sprint 14: Job Matching & Dispatch Redesign
- [x] Domain model document: docs/job-matching-dispatch-design.md (roles, state machines, open Q&A)
- [x] Schema: pepprSpTickets table (ticket lifecycle: OPEN→CONFIRMED→DISPATCHED→RUNNING→PENDING→CLOSED/CANCELLED)
- [x] Schema: pepprServiceOperators table (SP-scoped operator roster)
- [x] Schema: pepprSoJobs table (SO job with stage history, timestamps)
- [x] DB migration: scripts/migrate-sprint14.mjs applied (TiDB single-statement mode)
- [x] spTicketsRouter: createTicket, listInbound, listByProvider, acceptTicket, declineTicket, dispatchTicket, updateJobStage, listSoJobs, advanceSoJobStage
- [x] serviceOperatorsRouter: listOperators, addOperator, removeOperator
- [x] SPLayout: Inbound Tickets, Outbound Queue, Operators nav links added
- [x] SPInboundPage: inbound ticket list with Accept/Decline dialogs
- [x] SPOutboundPage: outbound queue (CONFIRMED/DISPATCHED/RUNNING/PENDING) with dispatch action
- [x] SPOperatorsPage: SP Admin operator roster management (add/remove)
- [x] SOLayout: Service Operator portal layout with My Jobs / History nav
- [x] SOJobsPage: active job list with Start/Complete stage advance buttons
- [x] SOJobDetailPage: job detail placeholder with back navigation
- [x] App.tsx: /so/* routes wired (SORoutes function)
- [x] 383 tests passing, 21 test files, 0 TypeScript errors

## Sprint 15: FO Item Assignment, SO Job Detail, SP Dispatch Dialog (COMPLETED)
- [x] Schema: added item_ids JSON column to peppr_sp_tickets (migration-sprint15.mjs applied)
- [x] Backend: assignItemsToSp procedure — creates SpTicket with specific itemIds array
- [x] Backend: listTicketsForRequest procedure — returns all tickets for a request (for assignment badges)
- [x] Backend: getSoJob procedure — returns job + linked ticket for SO detail page
- [x] FORequestDetailPage: "Assign Items" button (indigo, visible when not terminal)
- [x] FORequestDetailPage: ItemAssignDialog — checkbox item selection, provider dropdown, optional notes
- [x] FORequestDetailPage: per-item assignment badges showing SP name when item is already assigned
- [x] SOJobDetailPage: full rewrite — stage progress bar, stage advance buttons, notes field
- [x] SOJobDetailPage: stage history timeline with timestamps and notes
- [x] SOJobDetailPage: cancel-with-reason dialog (min 5 chars)
- [x] SPOutboundPage: dispatch dialog already complete from Sprint 14 (operator picker, SoJob creation)
- [x] Sprint 15 tests: 23 new tests (sprint15.test.ts) — input validation, JSON serialisation, itemTicketMap, stage machine, history building, cancel validation
- [x] 406 tests passing, 22 test files, 0 TypeScript errors

## Sprint 16: Dial Role Selection Page

- [ ] Create RoleDialSelector component (port from design package, adapted for live role data)
- [ ] Create RoleSelectionPage — full-screen dark page with dial, header, background decoration
- [ ] Wire RoleSelectionPage into post-login flow: redirect SUPER_ADMIN and SYSTEM_ADMIN to /role-select after OAuth callback
- [ ] Add "Switch Role (Dial)" option in existing role switcher (third option alongside dropdown and carousel)
- [ ] RoleDial: show only roles the current user actually has (from pepprUserRoles query)
- [ ] RoleDial: on role click, call existing switchRole mutation then navigate to correct portal
- [ ] Write vitest tests for Sprint 16 features

## Sprint 16: Dial Role Selection Page (COMPLETED)
- [x] RoleDialSelector component — circular orbit picker ported from design prototype
  - [x] SVG connecting lines from centre to each role button
  - [x] Neon glow pulse ring on selected/hovered role
  - [x] Centre circle shows role name, scope, and display label on hover/select
  - [x] Confirm button activates with selected role colour
  - [x] Remember my role checkbox
  - [x] Background decoration (radial blurs, orbit rings)
- [x] RoleSwitchPage rewritten with three-way view mode switcher (bottom pill bar)
  - [x] Dropdown — simple role list with scope labels
  - [x] Carousel — existing RoleCarousel (unchanged)
  - [x] Dial — new RoleDialSelector
  - [x] SUPER_ADMIN and SYSTEM_ADMIN default to Dial view on first login
  - [x] View mode persisted in localStorage (peppr_role_view_mode)
  - [x] User can manually switch between all three modes at any time
- [x] All three portals (FO, SP, SO) already navigate to /admin/role-switch — no changes needed
- [x] Sprint 16 tests: 28 new tests (sprint16.test.ts) — view mode defaults, role colours, landing paths, dial geometry
- [x] 434 tests passing, 23 test files, 0 TypeScript errors

## Sprint 16b: Dial Refinements
- [ ] Tighter oval RY = 45% of RX
- [ ] Dynamic outward label offsets (labels always point away from centre)
- [ ] Responsive scaling via useWindowSize (scales on small screens)

## Hotfix: Portal Role Guards
- [x] Add SP_ADMIN and SERVICE_OPERATOR to ROLE_DEFINITIONS in rbacRouter.ts
- [x] SP portal guard: allow SP_ADMIN, SERVICE_PROVIDER, SUPER_ADMIN, SYSTEM_ADMIN
- [x] FO portal guard: allow FRONT_DESK, FRONT_OFFICE, PROPERTY_ADMIN, SUPER_ADMIN, SYSTEM_ADMIN
- [x] SO portal guard: allow SERVICE_OPERATOR, SUPER_ADMIN, SYSTEM_ADMIN
- [x] Add SP_ADMIN and SERVICE_OPERATOR role assignments to Super Admin user in DB
- [x] Add SP_ADMIN, SERVICE_OPERATOR, SYSTEM_ADMIN, FRONT_OFFICE to ROLE_ICONS and ROLE_COLORS
- [x] 434 tests passing, 0 TypeScript errors

## Font Size Preference Enhancements
- [x] Server-side font size preference sync (DB column + tRPC procedure)
- [x] Hover tooltips on S/M/L switcher buttons
- [x] Font size control on Guest microsite layout

## Font Size & Display Preferences Round 2
- [ ] Add XL (125%) as fourth font size scale — enum, DB, hook, all switchers
- [ ] Consolidated Display Preferences drawer from user avatar menu (font size + theme + language)
- [ ] Persist guest font size in peppr_guest_sessions and sync on load

## Font Size Deep-Link QR Code
- [ ] POST /sessions accepts optional font_size field and persists it on creation
- [ ] Guest microsite reads font_size from URL query param and passes it to session creation
- [ ] Admin QR code generator includes font_size option in deep-link URL

## Navigation Audit & UX Improvements
- [x] Fix bare-path navigation in CatalogPage, ProvidersPage, TemplatesPage, UsersPage, StaffPage, QRManagementPage, QRDetailPage, QRSimulatorPage, RoomDetailPage, ProviderDetailPage, TemplateDetailPage, OnboardingPage, FrontOfficePage, ShiftHandoffPage
- [x] Add catch-all legacy-path redirects in App.tsx for /rooms, /partners, /properties, /providers, /catalog, /templates, /qr, /users, /staff bare paths → /admin/* equivalents
- [x] Add Breadcrumbs component (client/src/components/shared/Breadcrumbs.tsx) with clickable trail
- [x] Wire breadcrumbs to all detail pages: RoomDetailPage, PartnerDetailPage, PropertyDetailPage, ProviderDetailPage, CatalogDetailPage, TemplateDetailPage, QRDetailPage

## Onboarding UX: Edit Partner Access
- [x] Add "Edit Partner" button to the partner card context menu / bottom action bar on OnboardingPage so users can navigate directly to the partner edit form

## Critical: AdminGuard Auth Fix
- [x] Replace AdminGuard localStorage JWT check with tRPC auth.me (Manus OAuth) so direct URL access works on bo.peppr.vip
- [x] Preserve original URL as returnTo so users land on the right page after login

## QR Detail Navigation Fix
- [x] Fix QR detail navigation from Room detail page (Partner > Properties > Room)
- [x] Fix QR detail navigation from QR Management list page

## Contingency: 3 Critical Improvements
- [x] Persist active role in cookie (not just localStorage) so role context survives incognito/cross-browser
- [x] Add manus_open_id DB index on peppr_users table for O(1) auth.pepprProfile lookups
- [x] Remove duplicate self-referential redirect entries in App.tsx Router (lines 295-301 redirect /admin/login → /admin/login etc.)

## Bug: Onboarding page broken after contingency deployment
- [x] Partners showing 0 with skeleton cards on bo.peppr.vip/admin/onboarding
- [x] Diagnose root cause — Express CRUD routes only accepted Bearer JWT, not Manus OAuth session cookie. Fixed with dual-auth in _helpers.ts

## DEFINITIVE FIX: All detail pages 404
- [x] Root cause: regexparam v3 treats `:rest*` as single-segment param `([^/]+?)`, NOT a wildcard
- [x] Fix: Changed `/admin/:rest*` → `/admin/*` which generates `(.*)` — true multi-segment wildcard
- [x] Same fix applied to /fo, /sp, /so portal wrappers
- [x] Verified: /admin/providers/:id ✅, /admin/rooms/:id ✅, /admin/qr ✅, /admin/onboarding ✅
- [x] Sidebar navigation works correctly (no /admin/admin doubling)
- [x] All 475 tests passing (24 test files)

## Phase 6 — Artisan Manus: 3 Moon-Shot Improvements
- [x] 1. Test QR flow end-to-end: generate QR batch, scan, verify guest microsite with re-seeded data
- [x] 2. Migrate remaining useApi/ky/axios calls to tRPC for unified data layer
- [x] 3. Build real Front Office portal pages for /fo routes (FORoomStatusPage, FOShiftHandoffPage, FOGuestCheckinPage + nav items + routes + 33 tests)

## Phase 6 — Artisan Manus: Improvements #1 & #2 (Sprint)
- [x] #1 QR E2E flow test: generate QR, scan, create session, get menu, submit request, track (14/14 tests passing after DB seed fix)
- [x] #2a Add tRPC qrRouter (list, get, generate, activate/deactivate/revoke/suspend/resume/extend)
- [x] #2b Add tRPC usersRouter (list, get, invite, update, deactivate)
- [x] #2c Add tRPC staffRouter (list, get, create, update, deactivate)
- [x] #2d Migrate QRManagementPage from MUI+ky to shadcn+tRPC
- [x] #2e Migrate UsersPage and StaffPage from ky to tRPC
- [x] #2f Migrate 15+ pages from ky to tRPC (QRDetail, StayTokens, Staff, Users, Catalog, Provider, Property, Room, Template, Dashboard, FrontOffice, Settings, RequestDetail, PartnerDetail, UserDetail)
- [x] #2g Report pages left on apiClient (no tRPC equivalents for FastAPI /v1/reports/* endpoints — deferred)

## Phase 7 — Artisan Manus: Next 3 Improvements
- [x] #1 Add reportsRouter.ts with 5 tRPC procedures (revenue, satisfaction, staffAnalytics, requestAnalytics, auditLog) + migrate all 5 report pages from apiClient to tRPC
- [x] #2 Replace FORoomStatusPage 15s polling with SSE real-time push (useFrontOfficeSSE hook + Live/Connecting indicator in header)
- [x] #3 Add catalog.deactivate tRPC procedure with peppr_audit_events write + update CatalogDetailPage to use it

## Phase 8 — Sellable & Operable Test Suite
- [x] SELLABLE-01: Guest QR scan flow (valid QR → session creation → service menu) ✅
- [x] SELLABLE-02: Guest service menu (categories, items, pricing, images) ✅
- [x] SELLABLE-03: Guest request submission (single item, multi-item, with notes) ✅
- [x] SELLABLE-04: Guest request tracking (status polling, timeline events) ✅
- [x] SELLABLE-05: Guest feedback/rating after completion (deferred — no feedback endpoint yet)
- [x] SELLABLE-06: Guest session persistence (localStorage, resume session) ✅
- [x] SELLABLE-07: Guest request cancellation flow ✅
- [x] SELLABLE-08: QR edge cases (expired, revoked, invalid, suspended) ✅
- [x] OPERABLE-01: FO queue listing (pagination, filters, SLA timers) ✅
- [x] OPERABLE-02: Request lifecycle (pending → confirmed → in_progress → completed) ✅
- [x] OPERABLE-03: Request assignment to staff member ✅
- [x] OPERABLE-04: Request rejection with reason ✅
- [x] OPERABLE-05: Batch confirm/reject operations ✅
- [x] OPERABLE-06: Staff notes thread (add, view, delete) ✅
- [x] OPERABLE-07: SSE real-time event delivery (request.created, request.updated) ✅
- [x] OPERABLE-08: Shift handoff summary (open request grouping by status) ✅
- [x] OPERABLE-09: Room status board (occupancy + active request counts) ✅
- [x] OPERABLE-10: Auth/RBAC (protectedProcedure rejects unauthenticated, adminProcedure rejects non-admin) ✅
- [x] ADMIN-01: Partner CRUD (create, read, update, deactivate) ✅
- [x] ADMIN-02: Property CRUD with partner linkage ✅
- [x] ADMIN-03: Room CRUD with property linkage and template assignment ✅
- [x] ADMIN-04: QR code generation (batch), activate/deactivate/revoke lifecycle ✅
- [x] ADMIN-05: Service catalog CRUD + catalog.deactivate audit log ✅
- [x] ADMIN-06: Service template CRUD + item reordering ✅
- [x] ADMIN-07: Staff member CRUD + position assignment ✅
- [x] ADMIN-08: User invite + role update ✅
- [x] ADMIN-09: Reports (revenue, satisfaction, staff analytics, request analytics, audit log) ✅
- [x] ADMIN-10: Audit log entries written on key actions ✅
- [x] DEFECT FIX: Guest cart validation — server now rejects empty items array and quantity=0 with HTTP 400 ✅
- [x] TOTAL: 691/691 tests passing across 29 test files — 100% pass rate ✅

## Phase 9 — Mini-CMS: Guest QR Banner & Greeting Panel
- [x] Schema: add peppr_property_banners table (id, propertyId, type, title, body, imageUrl, linkUrl, linkLabel, locale, sortOrder, isActive, startsAt, endsAt, createdAt, updatedAt)
- [x] Schema: add greetingConfig JSON column to peppr_property_config (i18n map keyed by locale)
- [x] DB migration: pnpm db:push
- [x] Backend: cmsRouter.ts tRPC router (banner CRUD + greeting get/set, protectedProcedure)
- [x] Backend: guest.ts — extend /properties/:id/branding to include banners[] and greeting{}
- [x] Admin UI: PropertyDetailPage — new "Guest CMS" tab with BannerManager + GreetingEditor
- [x] Admin UI: BannerManager — list/add/edit/delete/reorder banners with image upload, schedule, locale
- [x] Admin UI: GreetingEditor — i18n tabs (EN/TH/JA/ZH/KO/FR/DE/AR) with rich text greeting
- [x] Guest UI: GuestBannerCarousel component — auto-play dot carousel with default fallback banner
- [x] Guest UI: GuestGreetingPanel component — i18n-aware welcome message with property logo
- [x] Guest UI: ScanLandingPage — inject [Banner] + [Greeting] above existing body
- [x] Guest UI: ServiceMenuPage — inject [Banner] + [Greeting] above service categories
- [x] GuestLayout: extend GuestBranding type with banners[] and greeting{}
- [x] Vitest: cms-banners.test.ts (CRUD + ordering + schedule filtering)
- [x] Vitest: guest-cms.test.ts (branding endpoint returns banners + greeting)

## Phase 10 — CMS Improvements: Upload, Preview, Tokens & Seed Data
- [x] S3 image upload: add `cms.uploadBannerImage` tRPC procedure (base64 → storagePut)
- [x] S3 image upload: add image upload button in BannerManager (file picker → base64 → CDN URL)
- [x] Live preview: add MobilePreviewFrame component in GuestCMSTab showing real-time carousel + greeting render
- [x] Greeting tokens: resolve {{room_number}}, {{guest_name}}, {{property_name}} in GuestGreetingPanel at render time
- [x] Greeting tokens: document supported tokens in GreetingEditor with inline hint chips
- [x] Seed data: create seed-cms.mjs script with placeholder banners (stub Unsplash URLs) for demo properties
- [x] Seed data: mock greeting messages in EN/TH/JA/ZH/KO/FR/DE/AR for each demo property
- [x] Seed data: wire seed script to run via `node scripts/seed-cms.mjs`
- [x] Vitest: token resolution tests (all 3 tokens, missing context fallback)
- [x] Vitest: upload procedure input validation tests
- [x] All 728 tests pass (30 test files)

## Phase 11 — Comprehensive Seed Data
- [x] Audit all DB tables and FastAPI data model (service areas, rooms, QR, templates, catalog, staff, requests)
- [x] Write scripts/seed-full.mjs covering full hierarchy: Partners → Service Areas → Rooms → QR codes → Templates → Catalog → Staff → Requests
- [x] Ensure seed is idempotent (safe to re-run)
- [x] Run seed and verify all entities appear in Setup Hierarchy, Service Menu, and Front Office
- [x] All tests still pass after seed

## Phase 12 — Fix: Setup Hierarchy Service Areas showing 0
- [x] Investigate OnboardingPage code to understand what drives "Service Areas" panel
- [x] Fix: paginationInput max pageSize was 100, OnboardingPage requests 500/1000 — increased to 1000
- [x] All 728 tests pass after fix

## Phase 13 — Fix: React error #310 crash on back navigation from room detail to onboarding
- [x] Investigate React error #310 ("Rendered more hooks than during previous render") on OnboardingPage
- [x] Root cause: RoomDetailPage Back button navigated to /admin/rooms, which matched a legacy inline redirect that called window.location.replace during render — 0-hook inline component replaced many-hook RoomDetailPage
- [x] Fix 1: RoomDetailPage Back button + createRoom onSuccess now navigate directly to /admin/onboarding
- [x] Fix 2: Legacy redirect routes in App.tsx now use <Redirect> component instead of inline window.location.replace
- [x] All 728 tests pass (30 files)

## Phase 14 — Fix: TypeError crash when assigning service template to room
- [x] Root cause: assignTemplate procedure returned partial room shape (missing room_type, floor, zone) — setRoom(updated) replaced full room with partial data
- [x] Fix: assignTemplate now returns full room shape including room_type, floor, zone, template_name, created_at, updated_at
- [x] Defensive guards: room.room_type and t.items now have fallbacks in RoomDetailPage
- [x] All 728 tests pass (30 files)

## Phase 15 — Mutation fixes, ErrorBoundary, i18n guest seed

- [x] Audit all mutation procedures for partial return shapes (removeTemplate, deactivateRoom, update, etc.)
- [x] Fix removeTemplate procedure — already returns full room shape with template_id: null, template_name: null
- [x] Fix update procedure to also return template_name (was missing, causing template chip to disappear after save)
- [x] Add TabErrorBoundary component wrapping each tab in RoomDetailPage (General, Service Template, QR Code)
- [x] TabErrorBoundary shows error message + Retry button (no full-page crash)
- [x] Seed guest sessions: scripts/seed-guest-sessions.mjs with 8 locales (EN/TH/JA/ZH/KO/FR/DE/AR)
- [x] 120 guest sessions across 5 properties (24 per property × 8 locales × 3 guests each)
- [x] Each locale session has matching greeting message from greetingConfig (property-specific overrides for key locales)
- [x] Guest sessions linked to real rooms with QR codes
- [x] greetingConfig updated for all 5 properties with all 8 locale messages
- [x] All 728 tests pass (30 files)

## Phase 16 — Preview as Guest toggle in GuestCMSTab

- [x] Add "Preview as Guest" toggle button in the Greeting Editor section (and mirrored in the right-side preview panel)
- [x] When toggled ON: show a collapsible sample session panel with editable Guest Name and Room Number fields
- [x] Auto-fill locale-appropriate sample data (e.g. 田中 太郎 / Room 412 for JA) when preview is first activated
- [x] Locale change in preview panel auto-updates sample data to match locale
- [x] "Use sample" shortcut button in editor resets fields to locale defaults
- [x] MobilePreviewFrame passes resolved tokens (guest_name, room_number) to GuestGreetingPanel
- [x] Phone frame border turns blue when in preview mode (visual distinction)
- [x] "GUEST VIEW" badge appears above phone frame with guest name and room number
- [x] Inline text preview card shows resolved tokens in preview mode (header changes to "GUEST VIEW — TOKENS RESOLVED")
- [x] Greeting tab shows "Preview ON" chip when preview mode is active
- [x] Token resolution is live — changes to greeting text or sample fields immediately reflect in phone preview
- [x] All 728 tests pass (30 files)

## Phase 17 — Guest Preview Permalink

- [x] Add public tRPC procedure cmsPublic.getPublicPreview(propertyId) — returns banners + greeting + branding, no auth required
- [x] Build /guest/preview page (no auth) — full-screen layout with phone frame + info panel
- [x] Page reads ?propertyId, ?locale, ?guestName, ?room, ?propertyName query params
- [x] Phone frame renders GuestBannerCarousel + GuestGreetingPanel with resolved tokens
- [x] Stub service menu skeleton shown below greeting in phone frame for realism
- [x] "PREVIEW MODE" banner at top of page (dark bar) explains this is a preview, not visible to guests
- [x] Locale switcher panel on right — clicking a locale updates phone frame AND rewrites URL (history.replaceState)
- [x] Preview Details card shows all active params (propertyId, locale, guestName, room)
- [x] Share This Preview card shows the full URL with copy button
- [x] Add "Generate Preview Link" button below phone frame in GuestCMSTab right panel
- [x] Share dialog in GuestCMSTab shows full URL with current locale/sample session params pre-filled
- [x] "Open in new tab" + "Copy Link" buttons in share dialog
- [x] URL updates live as locale/guestName/room fields change in the editor
- [x] buildPreviewUrl() includes guestName/room only when Preview as Guest mode is active
- [x] Write 9 vitest tests for cmsPublic.getPublicPreview (banners, greeting, branding, filtering, safe fields, validation)
- [x] All 9 new tests pass (728 pre-existing tests unaffected)

## Phase 18 — Fix QR deep-link navigation from RoomDetailPage

- [x] Root cause: crud.rooms.get never joined pepprQrCodes, so qr_code_id was always undefined
- [x] Fix server: crud.rooms.get now joins pepprQrCodes (active status) and returns qr_code_id, qr_db_id, qr_access_type
- [x] Fix "Manage QR" / "View QR Detail" header button: navigates to /admin/qr/{qr_db_id} when QR exists, opens QRBatchGenerateDialog when no QR
- [x] Fix empty state: "Generate QR Code" button opens QRBatchGenerateDialog pre-seeded with this room
- [x] QRBatchGenerateDialog imported and wired with propertyId, propertyName, preSelectedRoomIds=[room.id]
- [x] onSuccess invalidates crud.rooms.get query so QR tab refreshes without full page reload
- [x] Access type chip (Public / Restricted) shown below QR code ID in the assigned state
- [x] property_name already returned by crud.rooms.get (existing join with pepprProperties)
- [x] TypeScript compiles clean (0 errors), HMR applied successfully

## Phase 19 — QR Code tab: real QR image + inline template assignment

- [x] Replace placeholder QrCode icon with real QRCodeImage component (qrcode npm package, already installed)
- [x] QR image encodes the actual guest scan URL: {origin}/guest/scan/{qr_code_id} — fully scannable
- [x] Two-column layout: left card = real QR image + code + access type chip + View QR Detail button; right = template section
- [x] Inline Service Template section in QR Code tab: shows template name + Change/Remove buttons if assigned
- [x] Dashed empty state with Assign Template button if no template — triggers same showTemplateDialog
- [x] Template mutations (assign/remove) shared with Service Template tab — no duplication
- [x] TypeScript compiles clean, HMR applied successfully

## Phase 20 — Fix guest scan route: wrong title + admin auth required

- [x] Root cause 1: main.tsx tRPC global error handler fired getLoginUrl() redirect for ANY UNAUTHED error, including on guest routes
- [x] Fix: added isGuestRoute guard — skip redirect when window.location.pathname starts with /guest/
- [x] Root cause 2: client/index.html has hardcoded <title>Peppr Around — Admin</title> — no page sets document.title dynamically for guest pages
- [x] Fix ScanLandingPage: useEffect sets document.title to "Room {roomNumber} — {propertyName}" once QR status loads; restores on unmount
- [x] Fix ServiceMenuPage: useEffect sets document.title from session.room_number + session.property_name; restores on unmount
- [x] Guest routes in App.tsx are already outside AdminGuard/DashboardLayout — no structural change needed
- [x] Server-side guest endpoints (/api/v1/public/*, /api/public/guest/*) are all public Express routes, no auth middleware
- [x] HMR applied cleanly for all 3 changed files (main.tsx, ScanLandingPage.tsx, ServiceMenuPage.tsx)

## Phase 21 — Server & Resource Normalization

- [x] Audit: 7 tRPC routers, 14 Express route files, db.ts helpers, shared/const.ts, shared/types.ts, client API layer
- [x] routes/index.ts: removed 3 redundant route mounts (/api/public frontoffice, /api/public/qr qrcodes, duplicate /api/public/guest)
- [x] Canonical path established: /api/v1/public/* for all guest endpoints; /api/public/guest/* kept as legacy alias
- [x] guest.ts: normalized 3 error responses from {error: ...} to {detail: ...} (consistent with all other handlers)
- [x] server/index.ts: replaced dead static-file-only stub with @deprecated notice pointing to server/_core/index.ts
- [x] server/apiProxy.ts: replaced removed FastAPI proxy with @deprecated notice + archived original content inline
- [x] client guestApi: migrated all 7 methods from legacy public/guest/* to canonical v1/public/*
- [x] Removed duplicate sessionRequests method (identical to listRequests)
- [x] GuestHistoryPage: updated sessionRequests → listRequests call + fixed type cast
- [x] TypeScript: 0 errors after normalization
- [x] HMR applied cleanly for all changed files

## Phase 22 — Phase 21 Follow-ups: legacy alias removal, route map doc, guest page titles

- [x] Migrated all 6 remaining legacy /api/public/guest/* call sites to canonical /api/v1/public/*
  - GuestFontSizeSwitcher.tsx (2 fetch calls)
  - ScanLandingPage.tsx (1 fetch call)
  - ServiceMenuPage.tsx (1 fetch call)
  - TrackRequestPage.tsx (2 fetch calls)
- [x] Removed legacy /api/public/guest/* alias mount from routes/index.ts — no more dual mounts
- [x] Updated routes/index.ts header comment to document canonical path convention
- [x] Generated docs/routes.md — full server route and tRPC namespace map
  - 15 tRPC namespaces (auth, crud.*, qr, users, staff, requests, reports, rbac, spTickets, serviceOperators, cms, cmsPublic, preferences, stayTokens, system)
  - 13 Express route groups under /api/v1/
  - OAuth endpoints (framework-managed)
  - Auth symbols, conventions, and notes
- [x] Added dynamic document.title to RequestPage ("Room {N} — {Property}" from sessionStorage)
- [x] Added dynamic document.title to TrackRequestPage ("Request #{ref} — Room {N}" from tRPC data)
- [x] Added dynamic document.title to GuestHistoryPage ("Room {N} — {Property}" from useGuestSession)
- [x] All 5 guest pages now set dynamic browser tab titles; all restore admin title on unmount
- [x] TypeScript: 0 errors

## Phase 23 — Documentation cleanup (routes/index.ts comment + docs/routes.md gaps)

- [x] Removed stale legacy alias comment from server/routes/index.ts — replaced with clean canonical path convention comment pointing to docs/routes.md
- [x] PATCH /requests/:number/modify and POST /requests/:number/feedback already present in docs/routes.md /api/v1/public section (lines 349-350) — no change needed
- [x] Expanded SSE section in docs/routes.md from a one-line note to a full documented section:
  - /api/sse/front-office: method, auth, query params, Content-Type, managed-by
  - 4 event types: status_update, presence:join, presence:leave, connected (with payload shapes)
  - Scoping rules for propertyId-filtered broadcasts
  - Guest SSE (/api/sse/guest/:requestId) documented as separate lightweight stream
- [x] Updated Notes section: added route map maintenance reminder pointing to server/routes/index.ts
