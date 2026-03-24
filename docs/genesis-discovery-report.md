# Genesis Discovery Report — Peppr Around Admin V2

**Date:** 2026-03-24  
**Analyst:** Manus (Principal Architect Mode)  
**Genesis Version:** AR Genesis V1.2  
**Target System:** Peppr Around Admin V2 (peppr-around-v2-web)

---

## SECTION A — DISCOVERY SUMMARY

Peppr Around Admin V2 is a hospitality operations platform — a back-office console for managing hotel properties, rooms, QR codes, service templates, catalog items, staff, and guest service requests. It is built as a full-stack TypeScript monorepo (React 19 + Express 4 + Drizzle ORM + MySQL/TiDB).

The system was originally backed by a FastAPI Python service. The current codebase is a **migration-in-progress**: the Express server re-implements the FastAPI endpoints route by route, with the original Python service accessible via an `apiProxy.ts` passthrough for any endpoints not yet migrated.

**Runtime truth is intact.** Business flows work. The core guest-to-operator service request lifecycle is implemented and functional. Auth (JWT + SSO), audit logging, role-based access, and QR-based guest sessions all exist.

**Architectural discipline is uneven.** The codebase has significant structural debt introduced during the FastAPI-to-Express migration: business logic lives in route handlers, there are no service or repository layers, domain naming is inconsistent (ServiceRequest vs Transaction, CatalogItem vs Listing), and the module boundary between "admin console" and "guest-facing BFF" is blurred.

---

## SECTION B — DOMAIN MAP (Around V2 vs Genesis Canon)

| Genesis Domain | Around V2 Equivalent | Location | Notes |
|---|---|---|---|
| **Listing** | `CatalogItem` | `pepprCatalogItems` / `routes/catalog.ts` | Naming mismatch — "catalog item" is not the same semantic as "listing" |
| **Transaction** | `ServiceRequest` | `pepprServiceRequests` / `routes/frontoffice.ts` | Closest match — has lifecycle states (PENDING → CONFIRMED → COMPLETED → CANCELLED) |
| **Provider** | `ServiceProvider` | `pepprServiceProviders` / `routes/providers.ts` | Good match — represents fulfillment-capable actor |
| **Payment** | **Missing** | — | No payment module exists. ServiceRequest has `totalAmount` but no payment intent, gateway reference, or callback handling |
| **Fulfillment** | Partial — `ServiceRequest.status` | `routes/frontoffice.ts` | Fulfillment state is embedded in ServiceRequest, not a separate domain |
| **Template** | `ServiceTemplate` | `pepprServiceTemplates` / `routes/templates.ts` | Good match — reusable context model defining what can apply |
| **Spot** | `QrCode` + `Room` | `pepprQrCodes` / `pepprRooms` | QR code is the touchpoint; Room is the physical context |
| **Operator** | `PepprUser` (STAFF/ADMIN roles) | `pepprUsers` | Operator concept exists but is not explicitly named |
| **Partner** | `Partner` | `pepprPartners` | No Genesis equivalent — hospitality-specific hierarchy |
| **Property** | `Property` | `pepprProperties` | No Genesis equivalent — hospitality-specific hierarchy |

### Domain Naming Gaps

- `ServiceRequest` should align with Genesis `Transaction` semantics — it is a lifecycle-bearing intent record
- `CatalogItem` should align with Genesis `Listing` semantics — it is a sellable/useable offering
- `ServiceProvider` aligns well with Genesis `Provider`
- `ServiceTemplate` aligns well with Genesis `Template`
- `QrCode` + `Room` together form the Genesis `Spot` concept

---

## SECTION C — GAP ANALYSIS VS GENESIS

### C1. Handler-Service-Repository Pattern

**Genesis requires:** handler → service → repository separation  
**Around V2 has:** all business logic in route handlers (fat handlers)

Every route file (`routes/catalog.ts`, `routes/frontoffice.ts`, `routes/admin.ts`, etc.) contains:
- DB queries directly in the handler
- Business rule branching in the handler
- State transition logic in the handler
- No service layer
- No repository layer

This violates Genesis rules: "no business logic in handlers" and "no hidden state transitions."

**Risk:** Medium-High. Refactoring to HSR requires extracting logic without changing behavior.

### C2. Payment Module Missing

**Genesis requires:** explicit Payment domain with intent, gateway reference, payment status, callback handling  
**Around V2 has:** `totalAmount` field on `ServiceRequest` — no payment intent, no gateway, no callback

The `ServiceRequest` has pricing fields but no payment lifecycle. This means:
- Payment success cannot be tracked
- Payment callbacks cannot be handled
- Transaction completion is not tied to payment truth

**Risk:** High if payment is a near-term requirement. Low if cash/manual payment is the current model.

### C3. Fulfillment Not Separated

**Genesis requires:** Fulfillment as a distinct domain with its own state machine  
**Around V2 has:** Fulfillment state embedded in `ServiceRequest.status`

The `ServiceRequest` status (`PENDING → CONFIRMED → IN_PROGRESS → COMPLETED → CANCELLED`) conflates transaction lifecycle with fulfillment lifecycle. Genesis separates these: transaction records intent, fulfillment records delivery execution.

**Risk:** Medium. Separating fulfillment requires a schema migration.

### C4. BFF / Admin Boundary Blurred

**Genesis requires:** BFF handles edge adaptation; Core API owns business truth  
**Around V2 has:** `routes/frontoffice.ts` serves both guest-facing (public) and admin-facing (authenticated) endpoints from the same router, mounted at both `/api/v1/front-office` and `/api/public`

The guest flow (scan QR → browse menu → submit request) and the operator flow (view requests → confirm → complete) share the same route file. This makes the BFF/Core boundary invisible.

**Risk:** Low for now. Separation is a clean-up task, not an emergency.

### C5. Naming Inconsistency

| Term in Code | Genesis Term | Inconsistency |
|---|---|---|
| `ServiceRequest` | `Transaction` | Different name for same concept |
| `CatalogItem` | `Listing` | Different name for same concept |
| `requestNumber` | `transactionId` / `referenceNumber` | Ambiguous |
| `PENDING/CONFIRMED/COMPLETED` | `created/awaiting_payment/completed` | State name mismatch |

**Risk:** Low for runtime, Medium for future AI agent work and onboarding.

### C6. Audit Log Exists but is Incomplete

**Genesis requires:** every critical state transition should be auditable  
**Around V2 has:** `pepprAuditEvents` table and `logAuditEvent()` helper in `routes/admin.ts`

The audit log is called in some places (user management) but **not** in:
- Service request state transitions (CONFIRM, COMPLETE, CANCEL)
- QR code revocation
- Stay token creation/expiry
- Template assignment changes

**Risk:** Medium. Operational observability is incomplete.

### C7. Event Catalog Not Implemented

**Genesis requires:** canonical business events (listing_attached, transaction_created, payment_initiated, etc.)  
**Around V2 has:** no event catalog, no event emission

Events are implicit in state changes but never emitted or catalogued.

**Risk:** Low for MVP. Becomes Medium when async workflows or notifications are needed.

---

## SECTION D — RISK REGISTER

| # | Risk | Severity | Reversibility | Recommendation |
|---|---|---|---|---|
| R1 | Fat handlers — business logic in route files | Medium | High | Safe to extract incrementally |
| R2 | Payment module missing | High (if payment needed) | Medium | Add as new module, do not retrofit into ServiceRequest |
| R3 | Fulfillment embedded in ServiceRequest | Medium | Low | Staged migration — add `pepprFulfillments` table alongside, not replacing |
| R4 | BFF/Admin boundary blurred | Low | High | Documentation-first, then route separation |
| R5 | Naming inconsistency (ServiceRequest vs Transaction) | Low | Medium | Alias in API responses first, rename DB later |
| R6 | Audit log gaps | Medium | High | Add audit calls to state transition handlers |
| R7 | No event catalog | Low | High | Document events first, emit later |
| R8 | apiProxy.ts still active | Medium | High | Identify remaining proxied endpoints and migrate |

---

## SECTION E — REFACTOR PLAN BY BATCH

### Batch 1 — Safe: Documentation + Naming Alignment (Zero Risk)
- Add `docs/domain-map.md` to project (mapping Around V2 terms to Genesis terms)
- Add `docs/state-semantics.md` documenting ServiceRequest lifecycle
- Add `docs/module-boundaries.md` clarifying guest BFF vs admin core
- Add inline JSDoc to route files explaining domain ownership
- No code changes

### Batch 2 — Safe: Audit Log Completeness (Low Risk)
- Add `logAuditEvent()` calls to ServiceRequest state transitions (CONFIRM, COMPLETE, CANCEL)
- Add audit calls to QR code revocation
- Add audit calls to stay token operations
- Behavior unchanged — only adds observability

### Batch 3 — Medium: Extract Service Layer for ServiceRequest (Medium Risk)
- Create `server/services/serviceRequestService.ts`
- Move state transition logic (confirm, complete, cancel) out of `routes/frontoffice.ts`
- Handler calls service; service calls DB directly (no repository layer yet)
- API contract unchanged

### Batch 4 — Medium: Naming Aliases in API Responses (Low-Medium Risk)
- Add `transaction_id` alias alongside `request_id` in ServiceRequest responses
- Add `listing_id` alias alongside `item_id` in RequestItem responses
- Preserves backward compatibility

### Batch 5 — High Risk (Defer): Payment Module
- Add `pepprPayments` table
- Add payment intent creation, gateway callback handling
- **Do not execute without explicit product decision on payment provider**

### Batch 6 — High Risk (Defer): Fulfillment Separation
- Add `pepprFulfillments` table
- Migrate fulfillment state out of ServiceRequest
- **Requires schema migration and API contract change**

---

## SECTION F — FIRST SAFE BATCH TO EXECUTE NOW

**Batch 2: Audit Log Completeness**

This is the highest-value, lowest-risk improvement. It adds operational observability without changing any API contracts, business logic, or database schema.

**Files to change:**
- `server/routes/frontoffice.ts` — add audit calls to CONFIRM, COMPLETE, CANCEL transitions
- `server/routes/qrcodes.ts` — add audit call to QR revocation
- `server/routes/admin.ts` — verify existing audit calls are complete

**Files to create:**
- `docs/genesis-discovery-report.md` (this file)
- `docs/domain-map.md` — Around V2 to Genesis term mapping
- `docs/state-semantics.md` — ServiceRequest lifecycle documentation

**Behavior change:** None. Only adds audit log entries.

---

## SECTION G — FILES TO CREATE/UPDATE

### Create (documentation)
- `docs/genesis-discovery-report.md` ← this file
- `docs/domain-map.md`
- `docs/state-semantics.md`
- `docs/module-boundaries.md`

### Update (Batch 2 — audit completeness)
- `server/routes/frontoffice.ts` — add audit calls to state transitions
- `server/routes/qrcodes.ts` — add audit call to revocation

### Defer (Batch 3+)
- `server/services/serviceRequestService.ts` — new service layer
- `drizzle/schema.ts` — add `pepprPayments`, `pepprFulfillments` (Batch 5/6)

---

## SECTION H — OPEN QUESTIONS / AMBIGUITIES

1. **Payment model:** Is Peppr Around currently cash-only / manual payment, or is there a payment gateway integration planned? This determines whether Batch 5 is near-term or deferred.

2. **`apiProxy.ts` scope:** Which endpoints are still being proxied to the original FastAPI service? Are there any endpoints that have not been migrated yet?

3. **ServiceRequest vs Transaction naming:** Is there a product decision to keep "ServiceRequest" as the user-facing term, or should the API align with Genesis "Transaction" terminology?

4. **Fulfillment granularity:** Does the business need to track individual item fulfillment (e.g., item A delivered, item B pending) or is request-level fulfillment sufficient?

5. **Event emission:** Is there any downstream system (webhook, notification service, analytics) that would consume business events if they were emitted?
