# Peppr Around — Architecture Reference

> *This document describes the system as it exists at Phase 78 (March 2026). It is both a reference and a justification — every major decision is accompanied by the reasoning that produced it.*

---

## System Overview

Peppr Around is a **monorepo full-stack web application** deployed on the Manus hosting platform. The system has two distinct user-facing surfaces: an **Admin/Staff Back-Office** (`bo.peppr.vip`) and a **Guest Microsite** (accessed via QR code deep-link). Both surfaces are served by the same Express server, share the same database, and communicate via the same tRPC API layer.

```
┌─────────────────────────────────────────────────────────────┐
│                    bo.peppr.vip                             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  React 19 SPA (Vite)                                 │   │
│  │  ├── /admin/*   Admin Back-Office                    │   │
│  │  ├── /fo/*      Front Office Portal                  │   │
│  │  ├── /sp/*      Service Provider Portal              │   │
│  │  ├── /so/*      Service Operator Portal              │   │
│  │  └── /guest/*   Guest Microsite (QR deep-link)       │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │ tRPC + SSE                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Express 4 Server                                    │   │
│  │  ├── /api/trpc        tRPC router                    │   │
│  │  ├── /api/sse         Server-Sent Events             │   │
│  │  ├── /api/oauth/*     Manus OAuth callback           │   │
│  │  └── /api/stripe/*    Stripe webhooks                │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │ Drizzle ORM                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  MySQL / TiDB (managed)                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Redis (managed)  — rate limiting, JWT revocation,   │   │
│  │                     2FA tokens, session blacklist     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## The Data Hierarchy

The three-level hierarchy is the structural backbone of the entire system. Every piece of data is anchored to one of these three levels.

```
Partner (Hotel Management Company)
  └── Property (Hotel / Resort)
        └── Room / Service Unit (Guest-facing QR endpoint)
```

This hierarchy drives:
- **Authentication scope** — a staff member's `propertyId` determines which requests they see.
- **QR code generation** — every QR code is bound to a specific Room within a specific Property.
- **Notification routing** — inbox notifications are scoped to a property and filterable by partner.
- **Reporting** — all analytics aggregate up through the hierarchy.

### Core Entity Map

| Entity | Table | Key Relationships |
|---|---|---|
| Partner | `peppr_partners` | Has many Properties |
| Property | `peppr_properties` | Belongs to Partner; has many Rooms, Config, Banners |
| Property Config | `peppr_property_config` | 1:1 with Property; guest branding, feature flags |
| Room / Service Unit | `peppr_rooms` | Belongs to Property; has one active Template Assignment |
| Service Provider | `peppr_service_providers` | Belongs to Property; handles SP tickets |
| Catalog Item | `peppr_catalog_items` | Belongs to Property; the menu of services |
| Service Template | `peppr_service_templates` | Belongs to Property; a named bundle of Catalog Items |
| Template Item | `peppr_template_items` | Join table: Template ↔ Catalog Item |
| Room Template Assignment | `peppr_room_template_assignments` | Join: Room ↔ Template (one active per room) |
| QR Code | `peppr_qr_codes` | Belongs to Room; has access type, expiry, rotation |
| Stay Token | `peppr_stay_tokens` | Belongs to QR Code; short-lived guest session key |
| Guest Session | `peppr_guest_sessions` | Created on QR scan; holds locale, font size pref |
| Service Request | `peppr_service_requests` | Belongs to Property + Room + Guest Session |
| Request Item | `peppr_request_items` | Line items within a Service Request |
| Request Event | `peppr_request_events` | Immutable audit trail of status transitions |
| Request Note | `peppr_request_notes` | Staff notes thread on a request |
| Staff Member | `peppr_staff_members` | Belongs to Property; has Position |
| SP Assignment | `peppr_sp_assignments` | Assigns a request to a Service Provider |
| SP Ticket | `peppr_sp_tickets` | Work ticket for a Service Provider |
| SO Job | `peppr_so_jobs` | Job for a Service Operator |
| Payment | `peppr_payments` | Stripe-linked payment for a request |
| Inbox State | `peppr_inbox_state` | Per-user read/mute state for notifications |
| Archived Notification | `peppr_archived_notifications` | Archived inbox items |

---

## Technology Stack Decisions

### Why tRPC Instead of REST

The project began with a FastAPI (Python) backend and a REST API layer. This created a persistent friction: every time a backend endpoint changed, the frontend TypeScript types had to be manually updated. Type drift caused silent runtime errors that were difficult to trace.

The migration to tRPC (Phase 70 — "Pure JS/TS Stack Cleanup") eliminated this entirely. Procedures defined in `server/routers.ts` produce types that are consumed directly by `trpc.*.useQuery/useMutation` hooks in the frontend. There is no contract file, no code generation step, and no possibility of type mismatch. The compiler enforces the contract at build time.

**Rule for future builders:** Never introduce a REST endpoint for a new feature. Define a tRPC procedure. If you need a webhook endpoint (e.g., Stripe), register it as a raw Express route before the tRPC middleware.

### Why MySQL / TiDB Instead of SQLite

The initial template used SQLite. SQLite is excellent for local development but has no support for concurrent writes in a production multi-tenant environment. MySQL/TiDB was chosen because it is the managed database provided by the Manus platform, supports the full Drizzle ORM feature set, and handles concurrent connections from multiple staff sessions without locking.

**Schema management:** All schema changes go through `pnpm db:push` which runs `drizzle-kit generate && drizzle-kit migrate`. Never alter the database directly. The migration files in `drizzle/migrations/` are the source of truth.

### Why Server-Sent Events Instead of WebSockets

Real-time updates (new requests appearing in the front office queue, presence indicators on the request detail page) were initially considered for WebSocket implementation. SSE was chosen instead for three reasons:

1. SSE is unidirectional (server → client), which matches the actual data flow pattern — the server pushes state changes, the client does not push raw events back.
2. SSE works over standard HTTP/1.1 without protocol upgrade, making it compatible with the Manus proxy layer.
3. SSE connections are automatically reconnected by the browser on drop, with no client-side reconnection logic required.

The SSE endpoint at `/api/sse` broadcasts events scoped to `propertyId`, ensuring that staff at Hotel A do not receive events from Hotel B.

### Why Manus OAuth Instead of Custom Auth

The platform originally used a custom FastAPI JWT authentication system with email/password login, 2FA (TOTP + SMS), and a full password reset flow. This was migrated to Manus OAuth in Phase 70 for the primary staff authentication path.

The custom auth system (`pepprUsers`, `pepprUserRoles`) was retained in the database because it handles the **Peppr-specific role model** — the multi-role binding system where a single user can be a Partner Admin for one hotel group and a Front Office officer for a specific property. Manus OAuth handles the SSO identity; the `pepprUsers` table handles the role-to-property binding.

**The bridge:** On first OAuth login, the system looks up the Manus `openId` in `pepprUsers.manusOpenId`. If found, the full Peppr profile (roles, propertyId, partnerId) is hydrated. If not found, a new `pepprUser` record is created with a default `USER` role.

### Why Redis

Redis was added in Phase 46 to support:
- **JWT revocation** — a blacklist of invalidated tokens, checked on every protected request.
- **Rate limiting** — per-IP and per-user rate limits on authentication endpoints, enforced via Redis counters with TTL.
- **2FA token storage** — TOTP backup codes and SMS OTP tokens stored with short TTL.
- **Session management** — active session tracking for the "force logout all devices" feature.

Redis is not used as a primary data store. All business data lives in MySQL. Redis is the **ephemeral security layer**.

---

## Authentication Flow

```
Staff Login (Manus OAuth):
  1. Frontend calls getLoginUrl() → redirects to Manus OAuth portal
  2. Manus OAuth redirects to /api/oauth/callback with code + state
  3. Server exchanges code for Manus user profile
  4. Server looks up pepprUsers by manusOpenId → hydrates Peppr roles
  5. Server sets HttpOnly cookie (JWT signed with JWT_SECRET)
  6. Frontend reads auth state via trpc.auth.me.useQuery()

Guest Session (QR Scan):
  1. Guest scans QR code → navigates to /guest/scan/:qrId
  2. Server validates QR code (active, not expired, not revoked)
  3. Server creates or resumes peppr_guest_sessions record
  4. Session token stored in localStorage (not a cookie)
  5. All guest API calls include session token in header
```

---

## URL Structure

The platform uses a single domain with path-based portal separation. This was a deliberate decision made in Phase 21 (Server & Resource Normalization) to avoid subdomain complexity.

| Path prefix | Portal | Authentication |
|---|---|---|
| `/admin/*` | Admin Back-Office | Manus OAuth + Admin role |
| `/fo/*` | Front Office Portal | Manus OAuth + FO role |
| `/sp/*` | Service Provider Portal | Manus OAuth + SP role |
| `/so/*` | Service Operator Portal | Manus OAuth + SO role |
| `/guest/*` | Guest Microsite | Anonymous (session token) |
| `/api/trpc` | tRPC API | Cookie (staff) or session token (guest) |
| `/api/sse` | Server-Sent Events | Cookie (staff only) |

---

## File Structure Conventions

```
server/
  routers.ts          ← tRPC procedures (split into sub-files when > 150 lines)
  crudRouter.ts       ← CRUD procedures for all hierarchy entities
  db.ts               ← Drizzle query helpers (reused across procedures)
  storage.ts          ← S3 helpers (storagePut, storageGet)
  _core/              ← Framework plumbing — DO NOT edit unless extending infra

client/src/
  pages/              ← Page-level components (one file per route)
  components/         ← Reusable UI components
  components/shared/  ← Cross-page shared components (PageHeader, EmptyState, etc.)
  components/ui/      ← shadcn/ui primitives
  components/dialogs/ ← Modal dialogs (BulkRoomCreate, QRBatchGenerate, etc.)
  components/guest/   ← Guest microsite specific components
  contexts/           ← React contexts (AuthContext, NotificationContext)
  hooks/              ← Custom hooks (useActiveProperty, useAuth, etc.)
  lib/                ← Utilities (trpc.ts, getRoleLandingPath.ts)

drizzle/
  schema.ts           ← Single source of truth for all table definitions
  migrations/         ← Auto-generated migration files (never edit manually)

Genesis/              ← This folder — project DNA and retrospective
docs/                 ← Technical documentation (routes.md, schema.md, ADRs)
```

---

## Security Architecture

The platform underwent a full OWASP audit in Phases 42–45. The following controls are in place:

| Control | Implementation |
|---|---|
| HTTPS enforcement | Manus platform handles TLS termination |
| Security headers | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| CORS | Allowlist-based, configured via `CORS_ALLOWED_ORIGINS` env |
| Rate limiting | Redis-backed per-IP limits on `/api/trpc/auth.*` |
| JWT revocation | Redis blacklist checked on every protected procedure |
| 2FA | TOTP (authenticator app) + SMS OTP; enforced per-user |
| Password policy | Min 12 chars, complexity rules, bcrypt hashing |
| Body size limit | 10MB limit on all POST endpoints |
| SQL injection | Drizzle ORM parameterised queries — no raw SQL strings |
| XSS | React's default escaping + CSP headers |
| Audit log | Every state-changing action recorded in `peppr_audit_events` |

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
