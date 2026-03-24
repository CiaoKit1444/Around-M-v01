# Module Boundaries — Peppr Around V2

## Layer Overview

```
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (Admin Console)                              │
│  client/src/pages/                                           │
│  — renders, validates UI input, calls API                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ /api/v1/*
┌──────────────────────────▼──────────────────────────────────┐
│  Express Server (BFF + Core API — currently merged)          │
│  server/routes/                                              │
│  — auth, business rules, state transitions, persistence      │
└──────────────────────────┬──────────────────────────────────┘
                           │ Drizzle ORM
┌──────────────────────────▼──────────────────────────────────┐
│  MySQL / TiDB                                                │
│  drizzle/schema.ts                                           │
└─────────────────────────────────────────────────────────────┘
```

## Route Modules and Their Domains

| Route File | Domain | Auth | Notes |
|---|---|---|---|
| `server/pepprAuth.ts` | Identity / Auth | Public + Protected | Login, SSO, JWT, refresh |
| `server/routes/partners.ts` | Partner | Protected | Hotel group management |
| `server/routes/properties.ts` | Property | Protected | Hotel / venue management |
| `server/routes/rooms.ts` | Room / Spot | Protected | Physical room management |
| `server/routes/qrcodes.ts` | QrCode / Spot | Protected + Public | QR generation, validation |
| `server/routes/catalog.ts` | Listing (CatalogItem) | Protected | Service catalog management |
| `server/routes/templates.ts` | Template | Protected | Service template management |
| `server/routes/providers.ts` | Provider | Protected | Service provider management |
| `server/routes/frontoffice.ts` | Transaction (ServiceRequest) + Guest BFF | Mixed | **Boundary concern: mixes guest-facing and operator-facing** |
| `server/routes/staff.ts` | Staff | Protected | Staff positions and members |
| `server/routes/admin.ts` | Admin / Audit | Protected | Audit log, SSO allowlist |
| `server/routes/users.ts` | User Management | Protected | User CRUD, invite, role management |

## Boundary Concern: frontoffice.ts

`routes/frontoffice.ts` currently serves two distinct concerns:

**Guest BFF (public):**
- `POST /api/public/qr/validate` — QR scan entry point
- `GET /api/public/guest-sessions/:id/menu` — browse service menu
- `POST /api/public/service-requests` — submit request

**Operator Core (protected):**
- `GET /api/v1/front-office/service-requests` — operator request list
- `PUT /api/v1/front-office/service-requests/:id/confirm` — confirm request
- `PUT /api/v1/front-office/service-requests/:id/complete` — complete request
- `PUT /api/v1/front-office/service-requests/:id/cancel` — cancel request

**Genesis rule:** BFF must not become the real domain owner. The operator state transition logic belongs in a Core API service layer, not in the same file as guest-facing request submission.

**Recommended future split:**
- `routes/guestBff.ts` — public guest-facing endpoints
- `routes/frontoffice.ts` — operator-facing request management only
- `services/serviceRequestService.ts` — state transition business logic

## What the Frontend Must Not Own

Per Genesis rules, the React frontend must not:
- Own transaction truth
- Embed critical workflow branching
- Bypass the intended API path

Current violations to watch:
- `client/src/pages/frontoffice/RequestDetailPage.tsx` — confirm/complete/cancel actions call API correctly; no business logic in frontend ✓
- `client/src/pages/guest/RequestPage.tsx` — submits request via API correctly ✓

## Non-negotiable Boundaries

1. Payment callbacks must be handled server-side only — never in the frontend
2. State transitions must go through the API — never direct DB manipulation from frontend
3. Audit events must be written server-side — never from the frontend
