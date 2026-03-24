# Safe Batch Plan — Domain Module Extraction

> Based on AR Genesis V1.2 refactor protocol.
> Principle: each batch is independently deployable, test-covered, and non-breaking.
> Last updated: Phase 59

---

## Batch 0 — Already Done (Phases 58–59 audit)

- [x] `VALID_TRANSITIONS` guard added to `frontoffice.ts`
- [x] Audit events added to all state transitions and QR revocation
- [x] Discovery report, domain map, state semantics, module boundaries written
- [x] `apiProxy.ts` passthrough confirmed removed

---

## Batch 1 — Transaction Domain Extraction ← **START HERE**

**Goal:** Extract `transactionStateMachine.ts`, `transactionRepository.ts`, and `transactionService.ts`. Route handler becomes a thin shell.

**Files created:**
- `server/domain/transaction/transactionStateMachine.ts`
- `server/domain/transaction/transactionRepository.ts`
- `server/domain/transaction/transactionService.ts`

**Files modified:**
- `server/routes/frontoffice.ts` — replace inline logic with service calls

**Risk:** Low. No API contract change. No schema change. Tests cover all transitions.

**Success criteria:**
- All existing tests pass unchanged
- `frontoffice.ts` contains zero Drizzle imports
- `VALID_TRANSITIONS` lives only in `transactionStateMachine.ts`
- `logAuditEvent` called only from `transactionService.ts` for transaction events

---

## Batch 2 — Audit Domain Extraction

**Goal:** Move `logAuditEvent` out of `admin.ts` into `server/domain/audit/auditService.ts`. All callers import from the new location.

**Files created:**
- `server/domain/audit/auditRepository.ts`
- `server/domain/audit/auditService.ts`

**Files modified:**
- `server/routes/admin.ts` — remove `logAuditEvent`, re-export from audit domain
- `server/routes/frontoffice.ts` — update import path
- `server/routes/qrcodes.ts` — update import path

**Risk:** Low. Pure refactor — no logic change, no API change.

**Success criteria:**
- `logAuditEvent` defined in exactly one place
- No circular imports

---

## Batch 3 — Listing Domain Extraction

**Goal:** Extract `listingRepository.ts` and `listingService.ts` from `catalog.ts` and `templates.ts`.

**Files created:**
- `server/domain/listing/listingRepository.ts`
- `server/domain/listing/listingService.ts`

**Files modified:**
- `server/routes/catalog.ts` — thin handler
- `server/routes/templates.ts` — thin handler

**Risk:** Low. No API contract change. No schema change.

---

## Batch 4 — Provider Domain Extraction

**Goal:** Extract `providerRepository.ts` and `providerService.ts` from `providers.ts`.

**Files created:**
- `server/domain/provider/providerRepository.ts`
- `server/domain/provider/providerService.ts`

**Files modified:**
- `server/routes/providers.ts` — thin handler

**Risk:** Low.

---

## Batch 5 — Payment Domain Stub

**Goal:** Define the payment domain interface and stub. No real payment gateway yet — this establishes the boundary so payment can never silently complete a transaction.

**Files created:**
- `server/domain/payment/paymentGateway.ts` — interface only
- `server/domain/payment/paymentRepository.ts` — stub (no table yet)
- `server/domain/payment/paymentService.ts` — stub with invariant enforcement

**Schema changes:**
- Add `peppr_payments` table to `drizzle/schema.ts`
- Run `pnpm db:push`

**Risk:** Low (stub only, no live integration).

---

## Batch 6 — Fulfillment Domain Stub

**Goal:** Define the fulfillment domain interface and stub. Establishes the boundary so fulfillment never drives transaction status directly.

**Files created:**
- `server/domain/fulfillment/fulfillmentRepository.ts`
- `server/domain/fulfillment/fulfillmentService.ts`

**Schema changes:**
- Add `peppr_fulfillments` table to `drizzle/schema.ts`
- Run `pnpm db:push`

**Risk:** Low (stub only).

---

## Deferred (post-MVP)

- Real payment gateway integration (Batch 5 extension)
- Fulfillment assignment UI (Batch 6 extension)
- Event bus / domain events between modules
- CQRS read models for reporting

---

## Execution Rules

1. One batch at a time. Do not start Batch N+1 until Batch N tests are green.
2. Each batch ends with `pnpm test` passing and a checkpoint saved.
3. No API contract changes in any batch (URL paths, request/response shapes stay identical).
4. No schema changes in Batches 1–4 (schema changes only in Batches 5–6).
5. If a batch causes more than 3 test failures that cannot be fixed in 30 minutes, roll back and re-scope.
