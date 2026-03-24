# State Semantics — Peppr Around V2

## ServiceRequest States (Transaction Lifecycle)

| State | Meaning | Who Triggers | Auditable |
|---|---|---|---|
| `PENDING` | Guest submitted, awaiting operator review | Guest (via QR scan flow) | Yes — request_created |
| `CONFIRMED` | Operator accepted, fulfillment will proceed | Operator (Front Office) | Yes — request_confirmed |
| `IN_PROGRESS` | Fulfillment actively underway | Operator | Yes — request_in_progress |
| `COMPLETED` | Service delivered, request closed | Operator | Yes — request_completed |
| `CANCELLED` | Request voided (pre or post confirmation) | Operator or Guest | Yes — request_cancelled |

## Valid Transitions

```
PENDING     → CONFIRMED   (operator confirms)
PENDING     → CANCELLED   (operator or guest cancels before confirmation)
CONFIRMED   → IN_PROGRESS (operator starts fulfillment)
CONFIRMED   → CANCELLED   (operator cancels after confirmation)
IN_PROGRESS → COMPLETED   (operator marks done)
IN_PROGRESS → CANCELLED   (exceptional cancellation mid-fulfillment)
```

## Invalid Transitions (must fail deterministically)

- `COMPLETED → any` — completed requests are terminal
- `CANCELLED → any` — cancelled requests are terminal
- `PENDING → COMPLETED` — cannot skip CONFIRMED
- `PENDING → IN_PROGRESS` — cannot skip CONFIRMED

## Rules

- Every state transition MUST write an audit event
- Transitions must be explicit — no silent status mutation
- `completedAt`, `confirmedAt`, `cancelledAt` timestamps must be set on transition
- Callbacks (if payment is added) must be idempotent

## GuestSession States

| State | Meaning |
|---|---|
| `ACTIVE` | Session valid, guest can browse and submit |
| `EXPIRED` | Session past expiry time |
| `REVOKED` | Manually invalidated by operator |

## StayToken States

| State | Meaning |
|---|---|
| `active` | Token valid for QR validation |
| `expired` | Token past expiry |
| `revoked` | Manually invalidated |

## QrCode States

| State | Meaning |
|---|---|
| `active` | QR code is scannable |
| `inactive` | Temporarily disabled |
| `revoked` | Permanently invalidated |
