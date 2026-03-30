# Peppr Around — Phase Chronicle

> *A complete timeline of every major feature, pivot, and milestone from the first commit to Phase 78. This is the project's memory.*

---

## How to Read This Document

The chronicle is organised into **Eras** — groups of phases that share a common strategic theme. Within each era, phases are listed with their key deliverables and the strategic context that drove them. Bug fix phases are noted but not detailed unless they represent a significant learning.

---

## Era 1: Foundation (Phases 1–10)
*Building the scaffold, establishing the hierarchy, and connecting to real data.*

**Phase 1–5: Scaffold & Static UI**
The project began as a static React application with hardcoded demo data. The initial scaffold established the three-level hierarchy (Partner → Property → Room) as the core data model, the DashboardLayout with sidebar navigation, and the basic page structure for the admin back-office. Authentication was mocked. All data was hardcoded arrays.

**Phase 6–10: Live Data Integration**
The first real backend connections were made. The FastAPI (Python) backend was integrated via a REST API client. Pages were progressively wired to real endpoints: QR Management, Front Office, Rooms, and the Setup Hierarchy. The `useActiveProperty()` hook was introduced to replace hardcoded `"pr-001"` property IDs. The onboarding wizard was wired to live room and template counts.

**Key milestone:** The platform moved from a static mockup to a live-data application. The gap between what the UI showed and what the database contained was closed.

---

## Era 2: Guest Experience (Phases 11–20)
*Building the guest-facing microsite and the QR scan flow.*

**Phase 11–13: Guest Microsite Foundation**
The guest-facing QR scan flow was built: `ScanLandingPage` (validates the QR code and creates a session), `ServiceMenuPage` (the guest's service catalog with cart), and `TrackRequestPage` (live status tracking). The guest session model (anonymous, localStorage-based, no account required) was established as the identity model for all guest interactions.

**Phase 14–16: Guest CMS**
A mini-CMS was built inside the admin back-office allowing property managers to customise the guest microsite: banner images, welcome messages, property branding, and feature flags. The `peppr_property_config` and `peppr_property_banners` tables were added to the schema.

**Phase 17–20: Guest Internationalisation**
The guest microsite was internationalised to support 8 languages: English, Thai, Chinese, Japanese, Korean, French, German, and Russian. A language selector was added to the guest session. All guest-facing strings were extracted into a translation map.

**Key milestone:** The guest experience was complete end-to-end: scan → browse → request → track. The platform was demonstrable to hotel operators.

---

## Era 3: Stabilisation & Documentation (Phases 21–28)
*Cleaning up technical debt, establishing documentation standards, and setting up CI.*

**Phase 21–22: Server & Resource Normalization**
The URL structure was rationalised to use path-based portal separation (`/admin/*`, `/fo/*`, `/sp/*`, `/so/*`, `/guest/*`) instead of subdomains. Legacy API aliases were removed. A route map document was created.

**Phase 23–27: Architecture Documentation**
A formal documentation suite was established: `docs/routes.md` (complete route table), `docs/schema.md` (auto-generated from Drizzle schema), and three Architecture Decision Records (ADRs):
- ADR-001: Why tRPC over REST
- ADR-002: Why MySQL/TiDB over SQLite
- ADR-003: Why SSE over WebSockets

**Phase 28: CI Gate**
The GitHub Actions CI pipeline was set up with two jobs: Unit Tests (no server required) and Integration Tests (live server). The `pnpm test` command was added to the project. The first 233 unit tests were written. The CI gate was set as a required check on the `main` branch.

**Key milestone:** The project had a formal documentation suite and an automated quality gate. The codebase was no longer held together by manual discipline alone.

---

## Era 4: Front Office Operations (Phases 29–38)
*Building the operational heart of the platform — the front office request management system.*

**Phase 29–31: Front Office Foundation**
The Front Office portal was built as a distinct operational surface. The request queue, request detail page, and status transition actions (Confirm, Start, Complete, Reject) were implemented. Server-Sent Events were added for real-time queue updates — new requests appear in the queue without a page refresh.

**Phase 32–34: Alert Management & Inbox**
A notification inbox was built as the primary ambient awareness surface for front office staff. Notifications were grouped by property, with a mute toggle and a dismiss action. Quick-action buttons (Confirm, In Progress) were added directly to inbox rows so staff could act without navigating to the detail page.

**Phase 35–38: Inbox Polish**
The inbox was progressively enhanced: dialog deep-links (clicking a notification opens the request detail in a dialog overlay), property filter chips, notification row property subtitles, and a persistent unread count badge on the bell icon.

**Key milestone:** Front office staff could manage their entire workload from the inbox without navigating to individual request pages. The inbox became the primary operational surface.

---

## Era 5: Security Hardening (Phases 39–48)
*A systematic OWASP audit and the implementation of production-grade security controls.*

**Phase 39–41: GitHub Repository Setup**
The project was connected to a GitHub repository (`CiaoKit1444/Around-M-v01`). Branch protection rules were configured. The CI pipeline was connected to the repository.

**Phase 42–45: OWASP Security Audit**
A full OWASP Top 10 audit was conducted. Findings were addressed in four phases:
- Phase 42: High severity — SQL injection prevention (Drizzle parameterised queries), XSS prevention (React escaping + CSP)
- Phase 43: Medium severity — Security headers (Helmet.js), CORS configuration
- Phase 44: Medium severity — Body size limits, JWT revocation (Redis blacklist), 2FA foundation
- Phase 45: Final batch — Rate limiting (Redis counters), password policy enforcement, hardcoded domain removal

**Phase 46–48: 2FA Implementation**
Two-factor authentication was implemented end-to-end: TOTP (authenticator app) setup flow, SMS OTP as a fallback, 2FA enforcement per user, backup codes, and an admin UI for managing 2FA status across the user base. A recovery flow was added for users who lose access to their 2FA device.

**Key milestone:** The platform was OWASP-compliant and ready for production deployment with real guest data.

---

## Era 6: Identity & Branding (Phases 49–62)
*Logo rollout, Redis production setup, and the Secret Chamber super-admin bootstrap.*

**Phase 49–52: Logo Rollout**
The Peppr Around logo was introduced and rolled out across the platform. Several iterations were required to handle dark background rendering, sidebar sizing, and favicon generation.

**Phase 54–55: Redis Production Enhancements**
Redis was upgraded from a development dependency to a production-grade service with connection pooling, graceful degradation (the platform continues to function if Redis is temporarily unavailable, with reduced security guarantees), and health check endpoints.

**Phase 56–58: Logo & QR Simulator Bug Fixes**
A series of bug fixes addressed: a broken QR scan simulator (used for testing without a physical QR code), a broken sidebar logo (caused by a Vite asset path issue), and a logo rendering failure across all pages (caused by a CDN URL change).

**Phase 59–61: Portal Naming & Metric Consistency**
The portal naming was standardised across the UI. Metric labels (request counts, completion rates, SLA compliance) were made consistent between the dashboard, the front office page, and the analytics reports.

**Phase 62: Secret Chamber**
A hidden super-admin bootstrap route was implemented — a one-time setup page accessible only via a secret URL that allows the first super-admin account to be created without requiring an existing admin to grant the role. This solved the chicken-and-egg problem of bootstrapping a new deployment.

**Key milestone:** The platform had a complete identity (logo, branding, naming) and a production-grade security infrastructure.

---

## Era 7: Technology Migration (Phases 67–71)
*The most significant architectural change in the project's history — migrating from Python/FastAPI to pure TypeScript.*

**Phase 67: CI Fix & Production Guard**
A CI failure caused by missing GitHub secrets was diagnosed and fixed. A production guard was added to prevent test data from being written to the production database.

**Phase 68–69: Service Template Preview**
A service template preview card was added to the room detail page, allowing property managers to see exactly what a guest would see before assigning a template to a room. Service count badges and duration display were added to the template list.

**Phase 70: Pure JS/TS Stack Cleanup**
The Python/FastAPI backend was removed. All API endpoints were migrated to tRPC procedures. The `server/routers.ts` and `server/crudRouter.ts` files became the single source of truth for all backend logic. The `useApi.ts` hook (which wrapped the old REST client) was replaced with direct `trpc.*` calls. The type safety gap between frontend and backend was permanently closed.

**Phase 71: Template Preview Card, Service Count Badge & Live Analytics**
The analytics dashboard was wired to live data. The QR analytics page, revenue report, and satisfaction report were connected to real database queries.

**Key milestone:** The platform was a pure TypeScript monorepo. The Python backend was gone. Type safety was end-to-end.

---

## Era 8: Inbox Evolution (Phases 72–76)
*The inbox grew from a notification panel into a full email-style operational surface.*

**Phase 72: Inbox & Bell Icon Fixes**
A series of inbox rendering bugs were fixed: the bell icon badge count was not updating correctly, the inbox panel was not closing when clicking outside, and the unread count was not persisting across page navigations.

**Phase 73: Sessions Tab & Cross-Session Persistence**
A "Sessions" tab was added to the inbox showing active guest sessions at the property. Cross-session persistence was implemented so that inbox state (read/unread, muted properties) survived page refreshes.

**Phase 74: Auto-Refresh, Archive & Grouping**
The inbox was enhanced with: auto-refresh (polling every 30 seconds for new notifications), an Archive tab (notifications older than 24 hours are automatically archived), and group collapse (notifications from the same property can be collapsed into a single row).

**Phase 75: Sound Alert, Archive Expiry & Group Dismiss-All**
A sound alert was added for new high-priority notifications. Archive expiry was implemented (archived notifications are deleted after 7 days). Group dismiss-all was added to the inbox toolbar.

**Phase 76: Email-Style Inbox UI**
The inbox was completely redesigned as an email-style interface. Each notification became an `EnvelopeRow` (avatar, bold subject, preview snippet, timestamp, unread dot). Clicking a row slides into a `DetailPane` showing the full message body, metadata strip, and action buttons (Confirm / In Progress / View Detail). The inbox became a first-class operational surface, not a notification panel.

**Key milestone:** The inbox was the most evolved component in the platform. It had grown from a simple bell dropdown into a full email-style inbox with 8 phases of iteration.

---

## Era 9: Setup Hierarchy Usability (Phases 77–78)
*Making the hierarchy management interface fast, searchable, and visually clear.*

**Phase 77: Setup Hierarchy Usability**
The Setup Hierarchy page (Partner/Property/Room management) was redesigned with: a paginated card grid (3 columns × 2 rows, 6 cards per page), a `HierarchyToolbar` component (debounced search + Sort By selector + Asc/Desc toggle), server-side pagination, and stale-while-revalidate caching with background prefetch. The backend was upgraded to support dynamic `sortBy` (ID / Name / Last Update) for all three entities.

**Phase 77d: Elasticsearch-Style Search**
The search logic was upgraded from exact-match `LIKE '%query%'` to multi-token fuzzy matching: the query is split into tokens, each token is matched across all searchable fields with OR, and all tokens are combined with AND. This matches the Elasticsearch `multi_match` with `operator: AND` pattern.

**Phase 77e: Search UX Enhancements**
Three search UX improvements were added simultaneously: token highlighting (matched words wrapped in amber `<mark>` spans), recent searches dropdown (last 5 queries from localStorage, per entity), and a global Spotlight search (⌘K / Ctrl+K) that queries all three entities simultaneously and groups results by type.

**Phase 78: Platform-Wide Copywriting Audit**
A full audit of all user-facing text across 10 files identified over 80 copy issues. All status labels, action buttons, empty states, error messages, and form placeholders were rewritten to be direct, unambiguous, and action-oriented. The guest tracking page's status descriptions were rewritten to describe what happens next, not just the current state.

**Key milestone:** The platform was operationally polished. The hierarchy management interface was fast and searchable. The copy was clear and consistent.

---

## Project Statistics at Phase 78

| Metric | Value |
|---|---|
| Total phases completed | 78 (+ sub-phases) |
| Git commits | 231 |
| Lines of TypeScript/TSX | ~84,000 |
| Database tables | 32 |
| tRPC procedures | ~85 |
| Unit tests | 233 |
| Pages (admin + guest) | ~45 |
| Supported guest languages | 8 |
| CI pipeline jobs | 2 (unit + integration) |
| OWASP compliance | Full Top 10 addressed |

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
