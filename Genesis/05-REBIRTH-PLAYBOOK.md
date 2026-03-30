# Peppr Around — Rebirth Playbook

> *"If we had to build this again from scratch, knowing everything we know now, this is exactly how we would do it."*

---

## Purpose

This playbook is the operational guide for rebuilding the Peppr Around platform from zero. It is written for a team that has read the Manifesto, Architecture, Lessons Learned, and Design Language documents and is ready to execute. It assumes a two-person team (one product/design, one engineering) with access to the Manus AI development environment.

The playbook is structured as a sequence of **Sprints**, each with a clear goal, deliverables, and a definition of done. The order is deliberate — each sprint builds on the previous one and avoids the mistakes documented in the Lessons Learned file.

---

## Pre-Sprint: Environment Setup

Before writing a single line of application code, the following must be in place.

**Technology stack (non-negotiable):**
- Runtime: Node.js 22 LTS
- Language: TypeScript 5.x (strict mode)
- Frontend: React 19 + Vite + Tailwind CSS 4
- Backend: Express 4 + tRPC 11
- Database: MySQL/TiDB (Drizzle ORM)
- Cache/Security state: Redis
- Testing: Vitest
- CI: GitHub Actions

**Repository setup checklist:**
1. Create the GitHub repository with branch protection on `main` (require CI to pass before merge)
2. Set up the GitHub Actions workflow immediately — do not defer this (see `02-LESSONS-LEARNED.md`)
3. Add all required secrets to GitHub Actions: `JWT_SECRET`, `SSO_BRIDGE_SECRET`, `DATABASE_URL`, `REDIS_URL`
4. Create `.env.example` listing every required environment variable with a description but no value
5. Set up the Manus project with `web-db-user` capabilities

**First commit must include:**
- The tRPC scaffold (routers.ts, crudRouter.ts, context.ts)
- The Drizzle schema with the three-level hierarchy tables
- The DashboardLayout component
- The CI workflow file
- The `.env.example` file
- A passing `pnpm test` with at least one smoke test

---

## Sprint 1: Data Model & Authentication (Week 1)

**Goal:** The database schema is complete, migrations run cleanly, and authentication works end-to-end.

**Why this first:** The data model is the foundation of everything. Every feature built without a stable schema will require migration work later. Authentication must be in place before any protected routes are built.

**Deliverables:**

The complete Drizzle schema with all 32 tables, pushed to the database via `pnpm db:push`. The schema must include:
- `partners` — the top level of the hierarchy
- `properties` — scoped to a partner
- `rooms` / `service_units` — scoped to a property
- `service_templates` and `service_template_items` — the service catalog
- `peppr_service_requests` — the request lifecycle table
- `peppr_request_events` — the immutable event log (see `02-LESSONS-LEARNED.md`)
- `peppr_guest_sessions` — anonymous guest sessions
- `users` with `role` (admin/user/super_admin)
- `peppr_property_config` — per-property CMS settings
- `qr_codes` — QR binding table

The authentication flow must be complete: Manus OAuth login, JWT session cookie, `protectedProcedure` middleware, and the `useAuth()` hook on the frontend.

**Definition of done:** A logged-in admin can see their name in the sidebar. `pnpm check` reports 0 errors. `pnpm test` passes.

---

## Sprint 2: Setup Hierarchy (Week 2)

**Goal:** An admin can create and manage Partners, Properties, and Rooms through the UI.

**Why this second:** The hierarchy is the master data. Every other feature (requests, QR codes, service templates) depends on having partners, properties, and rooms in the database. Build the hierarchy management before building anything that uses it.

**Deliverables:**

The Setup Hierarchy page (`/admin/onboarding`) with three sections:
- Partners section: card grid (3 columns, 6/page), HierarchyToolbar (search + sort), Add/Edit/Delete partner
- Properties section: card grid filtered by selected partner, Add/Edit/Delete property
- Rooms section: table view filtered by selected property, Add/Edit/Delete room, bulk seed

The `HierarchyToolbar` component must be built as a reusable component from the start — do not inline the search/sort logic into each page.

The backend must support:
- `crud.partners.list` with `search`, `sortBy`, `sortOrder`, `page`, `pageSize`
- `crud.properties.list` with the same params plus `partner_id` filter
- `crud.rooms.list` with the same params plus `property_id` filter
- Multi-token fuzzy search (see `02-LESSONS-LEARNED.md` — build this correctly from the start)

**Definition of done:** An admin can create a partner, add a property to it, and add 10 rooms to the property. The search finds rooms by partial name match across multiple tokens.

---

## Sprint 3: Service Templates (Week 3)

**Goal:** An admin can create service templates and assign them to rooms.

**Deliverables:**

The Service Templates page (`/admin/service-templates`) with:
- Template list with search and sort
- Template detail with item management (add/edit/delete items, set price, duration, image)
- Template assignment to rooms (bulk assign from the room table)

The backend must support:
- `crud.serviceTemplates.list`, `create`, `update`, `delete`
- `crud.serviceTemplateItems.list`, `create`, `update`, `delete`
- `crud.rooms.assignTemplate` (bulk assign)

**Definition of done:** An admin can create a template with 5 items, assign it to 10 rooms, and see the template name on each room card.

---

## Sprint 4: QR Code Management (Week 4)

**Goal:** QR codes can be generated, bound to rooms, and printed.

**Deliverables:**

The QR Management page (`/admin/qr`) with:
- QR code list with search and filter by property/status
- Bulk generate QR codes for unbound rooms
- Individual QR code detail with download (PNG, PDF) and print
- QR binding status (bound/unbound) on each room card in the hierarchy

The backend must support:
- `crud.qrCodes.list`, `generate`, `bind`, `unbind`, `revoke`
- QR code validation endpoint (used by the guest microsite)

**Definition of done:** An admin can generate QR codes for all rooms in a property, download a PDF with all codes, and scan one with a phone to reach the guest landing page.

---

## Sprint 5: Guest Microsite (Week 5)

**Goal:** A guest can scan a QR code, browse the service menu, submit a request, and track it.

**Deliverables:**

Four guest pages:
- `ScanLandingPage` — validates the QR token, creates a guest session, redirects to the service menu
- `ServiceMenuPage` — the service catalog with categories, items, cart, and checkout
- `TrackRequestPage` — live request status with SSE updates
- `ServiceMenuPage` (order history) — previous requests for the current session

The guest session model must be anonymous (no account required). The session is created on QR scan and stored in localStorage. The session ID is passed with every guest API call.

The backend must support:
- `guest.validateQr` — validates the QR token, creates a session
- `guest.getMenu` — returns the service template for the room
- `guest.submitRequest` — creates a service request
- `guest.trackRequest` — returns the current status of a request (with SSE subscription)

**Definition of done:** A guest can scan a QR code, order a room service item, and see the status update from "Awaiting confirmation" to "Your request is being prepared" in real time.

---

## Sprint 6: Front Office Operations (Week 6)

**Goal:** Front office staff can manage the request queue, confirm requests, and track completion.

**Deliverables:**

The Front Office portal (`/fo`) with:
- Request queue with real-time updates (SSE)
- Request detail page with status transition actions (Confirm, Start, Complete, Reject)
- Request notes (staff can add internal notes to any request)
- SLA deadline display (amber when < 15 minutes, red when overdue)

The notification inbox with:
- Envelope-row list (subject, preview, timestamp, unread dot)
- Detail pane (full message, metadata, action buttons)
- Archive tab
- Property filter
- Mute toggle

The backend must support:
- `requests.list` with status filter and property filter
- `requests.updateStatus` with actor, timestamp, and reason (appended to `peppr_request_events`)
- `requests.addNote`
- SSE endpoint for real-time queue updates

**Definition of done:** A front office staff member can see a new request appear in the queue within 3 seconds of submission, confirm it, and see the guest's tracking page update in real time.

---

## Sprint 7: Security Hardening (Week 7)

**Goal:** The platform is OWASP Top 10 compliant and ready for production.

**Do not defer this sprint.** Security hardening done after the product is built is always more expensive than security built in from the start. This sprint must happen before any real guest data is processed.

**Deliverables:**

- Security headers via Helmet.js (CSP, HSTS, X-Frame-Options, etc.)
- Rate limiting via Redis (per-IP for public endpoints, per-user for authenticated endpoints)
- JWT revocation via Redis blacklist (logout invalidates the token immediately)
- 2FA via TOTP (authenticator app) with SMS OTP fallback
- Input validation on all tRPC procedures (Zod schemas)
- Body size limits on all upload endpoints
- CORS configuration (explicit allowlist, not wildcard)
- SQL injection prevention (Drizzle parameterised queries — already handled by the ORM, but verify)

**Definition of done:** An OWASP ZAP scan reports no high or critical findings. The `pnpm test` suite includes tests for rate limiting and JWT revocation.

---

## Sprint 8: Analytics & Reporting (Week 8)

**Goal:** Property managers can see operational metrics and export reports.

**Deliverables:**

The Analytics dashboard with:
- Request volume over time (daily/weekly/monthly)
- Average response time and SLA compliance rate
- Top requested services
- Revenue by service category (if pricing is enabled)
- Guest satisfaction scores (if feedback is enabled)

The Reports page with:
- Exportable CSV/PDF reports for each metric
- Date range selector
- Property filter

**Definition of done:** A property manager can see the request volume for the past 30 days and export a CSV report.

---

## Sprint 9: Guest CMS & Internationalisation (Week 9)

**Goal:** Property managers can customise the guest microsite and guests can use it in their preferred language.

**Deliverables:**

The Guest CMS in the admin back-office:
- Property branding (logo, banner image, welcome message)
- Feature flags (enable/disable service categories)
- Language settings (default language for the property)

Guest microsite internationalisation:
- 8 languages: English, Thai, Chinese, Japanese, Korean, French, German, Russian
- Language selector on the guest landing page
- All guest-facing strings extracted into a translation map

**Definition of done:** A property manager can upload a banner image and set a Thai welcome message. A Thai-speaking guest can switch to Thai and see all UI text in Thai.

---

## Sprint 10: Polish & Launch Readiness (Week 10)

**Goal:** The platform is production-ready — no stale copy, no broken flows, no missing empty states.

**Deliverables:**

A full copywriting audit (see `02-LESSONS-LEARNED.md` — do this as a dedicated sprint, not as an afterthought):
- Every status label describes what happens next
- Every empty state has a call-to-action
- Every action button uses verb-first imperative phrasing
- Every error message includes a recovery action

A full accessibility audit:
- Colour contrast ≥ 4.5:1 for all body text
- All interactive elements keyboard-reachable
- All images have `alt` text

A full CI audit:
- All 233+ unit tests passing
- Integration tests passing
- TypeScript: 0 errors
- No hardcoded IDs, URLs, or credentials

**Definition of done:** The CI pipeline is green. The copywriting audit finds 0 issues. The platform is ready to onboard the first real hotel property.

---

## The Rules That Must Never Be Broken

These are the non-negotiable constraints distilled from 78 phases of experience. They are not guidelines — they are rules.

**Rule 1: Never hardcode an entity ID.** Not even in a prototype. Use a constant with a clear name that can be found and replaced with a single grep.

**Rule 2: Never store demo data in component state.** Build the real data layer first. A loading skeleton is more honest than fake data.

**Rule 3: Never defer security.** OWASP hardening is Sprint 7, not Sprint 20. The cost of retrofitting security is always higher than the cost of building it in.

**Rule 4: Never build a page without an escape route.** Every page must have a way back. The layout is the skeleton — build it before the pages.

**Rule 5: Never use a single `status` field for a lifecycle entity.** Add an event log table from the beginning. The status field is a cache of the latest event.

**Rule 6: Never write copy as an afterthought.** Copy is code. It must be maintained with the same discipline. Every feature rename requires a copy update in the same commit.

**Rule 7: Never skip CI setup.** The CI pipeline is the first thing set up after the scaffold. Tests written after the fact are always harder to write and less complete.

**Rule 8: Never use WebSockets when SSE is sufficient.** If the real-time channel is asymmetric (server pushes, client mutates via HTTP), use SSE. It is simpler, more reliable, and reconnects automatically.

---

## Estimated Timeline

| Sprint | Focus | Duration |
|---|---|---|
| Pre-Sprint | Environment setup | 1 day |
| Sprint 1 | Data model + auth | 5 days |
| Sprint 2 | Setup hierarchy | 5 days |
| Sprint 3 | Service templates | 4 days |
| Sprint 4 | QR management | 4 days |
| Sprint 5 | Guest microsite | 5 days |
| Sprint 6 | Front office ops | 6 days |
| Sprint 7 | Security hardening | 4 days |
| Sprint 8 | Analytics | 4 days |
| Sprint 9 | CMS + i18n | 4 days |
| Sprint 10 | Polish + launch | 3 days |
| **Total** | | **~45 working days** |

With Manus AI as the primary engineering partner, the actual velocity will be significantly higher than a traditional team. The original platform was built in approximately 78 phases over several weeks. A rebuild with this playbook and the lessons learned should reach the same feature parity in 3–4 weeks.

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
