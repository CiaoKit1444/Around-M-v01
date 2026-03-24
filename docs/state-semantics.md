# Transaction State Semantics — Peppr Around V2

> Domain: `transaction` (Genesis term) = `ServiceRequest` (table: `peppr_service_requests`)
> Last updated: Phase 59 — domain extraction audit

---

## Transaction (ServiceRequest) States

| State | Meaning | Who Triggers | Terminal? | Auditable |
|---|---|---|---|---|
| `PENDING` | Guest submitted; awaiting staff acknowledgement | Guest (via QR scan flow) | No | Yes — `request_created` |
| `CONFIRMED` | Staff accepted; scheduled for fulfillment | Operator (Front Office) | No | Yes — `request_confirmed` |
| `IN_PROGRESS` | Fulfillment actively underway | Operator | No | Yes — `request_in_progress` |
| `COMPLETED` | Service delivered, request closed | Operator | **Yes** | Yes — `request_completed` |
| `CANCELLED` | Request voided (pre or post confirmation) | Operator or Guest | **Yes** | Yes — `request_cancelled` |

---

## Transition Table

```
PENDING     ──CONFIRM──►  CONFIRMED
PENDING     ──CANCEL──►   CANCELLED
CONFIRMED   ──START──►    IN_PROGRESS
CONFIRMED   ──CANCEL──►   CANCELLED
IN_PROGRESS ──COMPLETE──► COMPLETED
IN_PROGRESS ──CANCEL──►   CANCELLED
COMPLETED   ──(none)      (terminal)
CANCELLED   ──(none)      (terminal)
```

As a lookup table (used by `transactionStateMachine.ts`):

| From \ To | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELLED |
|---|---|---|---|---|
| PENDING | ✓ | — | — | ✓ |
| CONFIRMED | — | ✓ | — | ✓ |
| IN_PROGRESS | — | — | ✓ | ✓ |
| COMPLETED | — | — | — | — |
| CANCELLED | — | — | — | — |

---

## Timestamp Semantics

Each terminal-approaching transition stamps a dedicated column:

| Transition | Column stamped |
|---|---|
| → CONFIRMED | `confirmed_at` |
| → COMPLETED | `completed_at` |
| → CANCELLED | `cancelled_at` |

`IN_PROGRESS` does not stamp a dedicated column — use `updated_at`.

---

## Invariants

1. **Single source of truth.** Only `transactionService.transition()` may write `status` on `peppr_service_requests`. No other service, route handler, or background job may mutate this column directly.

2. **No silent completion.** Payment capture does not set status to `COMPLETED`. Payment success is a signal that the handler passes to `transactionService.transition(id, "COMPLETED", reason)` — the service validates the transition guard before writing.

3. **Audit on every transition.** Every call to `transactionService.transition()` writes an audit record via `auditService.logEvent()` before returning. This is enforced inside the service, not in the route handler.

4. **Terminal states are immutable.** Once `COMPLETED` or `CANCELLED`, no further transitions are accepted. The state machine returns a `TransitionError` with code `TERMINAL_STATE`.

5. **Reason is required for CANCELLED.** Cancellation without a `reason` string is rejected at the service layer with a `ValidationError`.

---

## Error Codes (from `transactionStateMachine.ts`)

| Code | Meaning |
|---|---|
| `INVALID_TRANSITION` | The requested `to` state is not in the allowed set for `from` |
| `TERMINAL_STATE` | The transaction is already in a terminal state |
| `MISSING_REASON` | Cancellation attempted without a reason |
| `NOT_FOUND` | No transaction exists with the given ID |

---

## Payment Relationship

Payment is a **side-effect** of a confirmed transaction, not a lifecycle driver.

```
Transaction: CONFIRMED → IN_PROGRESS → COMPLETED
                                            ↑
                              handler calls transition()
                              after paymentService.capture() succeeds
```

`paymentService.capture()` returns `{ success: boolean, paymentId: string }`.
The route handler checks `success` and then calls `transactionService.transition(id, "COMPLETED", reason)`.
`paymentService` **never** calls `transactionService` directly.

---

## Fulfillment Relationship

Fulfillment is a **child record** of a transaction, not a status driver.

```
Transaction: CONFIRMED → IN_PROGRESS
                              ↑
                    fulfillmentService.assign(transactionId, staffId)
                    creates peppr_fulfillments row + writes audit record
```

`fulfillmentService.complete(fulfillmentId)` marks the fulfillment row as done.
The route handler then decides whether to call `transactionService.transition(COMPLETED)`.
`fulfillmentService` **never** calls `transactionService.transition()` directly.

---

## GuestSession States

| State | Meaning |
|---|---|
| `ACTIVE` | Session valid; guest can browse and submit |
| `EXPIRED` | Session past expiry time |
| `REVOKED` | Manually invalidated by operator |

---

## StayToken States

| State | Meaning |
|---|---|
| `active` | Token valid for QR validation |
| `expired` | Token past expiry |
| `revoked` | Manually invalidated |

---

## QrCode States

| State | Meaning |
|---|---|
| `active` | QR code is scannable |
| `inactive` | Temporarily disabled |
| `revoked` | Permanently invalidated |
