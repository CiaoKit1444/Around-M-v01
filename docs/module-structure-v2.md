# Module Structure V2 — Domain-Correct Layout

> Produced after AR Genesis V1.2 audit. Replaces `module-boundaries.md`.
> Status: **target architecture** — current state is noted inline.

---

## Current State (as-audited)

All business logic currently lives directly inside Express route handlers under
`server/routes/`. There is no service layer, no repository layer, and no domain
module boundary. The `VALID_TRANSITIONS` state machine is inlined inside
`frontoffice.ts`. The `apiProxy.ts` passthrough has been fully removed — all
endpoints are now served natively by Express.

```
server/
  routes/
    frontoffice.ts   ← transaction + session + stay-token logic (mixed)
    catalog.ts       ← listing CRUD
    providers.ts     ← provider CRUD
    templates.ts     ← template CRUD
    partners.ts      ← partner CRUD
    properties.ts    ← property CRUD
    rooms.ts         ← room CRUD
    qrcodes.ts       ← QR CRUD + revocation
    staff.ts         ← staff CRUD
    admin.ts         ← audit log + SSO + users (mixed)
    users.ts         ← user invite/update (role-scope binding)
  db.ts              ← raw Drizzle helpers (no domain separation)
  pepprAuth.ts       ← auth (login, register, me, refresh)
  sse.ts             ← SSE broadcast
  overseer.ts        ← port/service registry
  apiProxy.ts        ← REMOVED (all endpoints migrated)
```

**Problems:**
- State machine logic (`VALID_TRANSITIONS`) is embedded in a route handler.
- DB queries are scattered across every route file — no repository layer.
- No payment or fulfillment domain exists at all.
- `admin.ts` owns `logAuditEvent` but it is imported by other route files
  (coupling across route modules).

---

## Target Structure (after domain extraction)

```
server/
  domain/
    transaction/
      transactionStateMachine.ts   ← state definitions + transition rules
      transactionRepository.ts     ← all DB reads/writes for peppr_service_requests
      transactionService.ts        ← business logic (create, transition, query)
    listing/
      listingRepository.ts         ← peppr_catalog_items + peppr_template_items
      listingService.ts            ← pricing, availability, template resolution
    provider/
      providerRepository.ts        ← peppr_service_providers
      providerService.ts           ← CRUD, rating, catalog count
    payment/
      paymentGateway.ts            ← interface (stub) — no silent completion
      paymentRepository.ts         ← peppr_payments (table TBD)
      paymentService.ts            ← initiate, capture, refund — never touches transaction status directly
    fulfillment/
      fulfillmentRepository.ts     ← peppr_fulfillments (table TBD)
      fulfillmentService.ts        ← assign, complete, audit trail
    audit/
      auditRepository.ts           ← peppr_audit_events (extracted from admin.ts)
      auditService.ts              ← logEvent(), query()
  routes/
    frontoffice.ts   ← handler only: parse req → call transactionService → format res
    catalog.ts       ← handler only: parse req → call listingService → format res
    providers.ts     ← handler only: parse req → call providerService → format res
    ...              ← all other routes follow same pattern
  db.ts              ← Drizzle connection only (no query logic)
```

**Invariants enforced by this structure:**
1. Route handlers contain zero business logic — only HTTP parsing and response formatting.
2. Services contain zero HTTP context — no `req`, no `res`.
3. Repositories contain zero business rules — only SQL.
4. `transactionService.transition()` is the **only** function that mutates transaction status.
5. `paymentService` never calls `transactionService.transition()` directly — it emits an event or returns a result that the handler uses to call the transition.
6. Every fulfillment write goes through `fulfillmentService` which always writes an audit record.

---

## Layer Responsibility Matrix

| Layer | Owns | Does NOT own |
|---|---|---|
| Route handler | HTTP parsing, auth check delegation, response shape | Business rules, DB queries |
| Service | Business rules, validation, orchestration | HTTP context, raw SQL |
| Repository | SQL queries, Drizzle ORM calls | Business rules, HTTP context |
| State machine | Transition table, guard conditions | DB writes, HTTP context |

---

## Domain Boundary Rules

| Domain | Canonical table(s) | May call | Must NOT call |
|---|---|---|---|
| transaction | peppr_service_requests, peppr_request_items | audit, listing (read-only) | payment directly |
| listing | peppr_catalog_items, peppr_template_items | provider (read-only) | transaction |
| provider | peppr_service_providers | — | transaction, listing |
| payment | peppr_payments (TBD) | audit | transaction.transition() |
| fulfillment | peppr_fulfillments (TBD) | audit, transaction (read-only) | payment |
| audit | peppr_audit_events | — | any domain |

---

## Migration Path (safe batches)

See `docs/safe-batch-plan.md` for the ordered execution plan.
