# Domain Map — Peppr Around V2

Maps Around V2 terms to Genesis canonical domain vocabulary.

## Term Mapping

| Around V2 Term | Genesis Term | DB Table | Notes |
|---|---|---|---|
| `ServiceRequest` | `Transaction` | `peppr_service_requests` | Lifecycle-bearing intent record. States: PENDING → CONFIRMED → IN_PROGRESS → COMPLETED / CANCELLED |
| `CatalogItem` | `Listing` | `peppr_catalog_items` | Sellable/useable offering visible in context |
| `ServiceProvider` | `Provider` | `peppr_service_providers` | Fulfillment-capable actor |
| `ServiceTemplate` | `Template` | `peppr_service_templates` | Reusable context model defining what can apply |
| `QrCode` + `Room` | `Spot` | `peppr_qr_codes` + `peppr_rooms` | QR code is the touchpoint; Room is the physical context |
| `PepprUser` (STAFF/ADMIN) | `Operator` | `peppr_users` | Internal actor who monitors and manages workflow |
| `Partner` | *(hospitality-specific)* | `peppr_partners` | No Genesis equivalent — hotel group / management company |
| `Property` | *(hospitality-specific)* | `peppr_properties` | No Genesis equivalent — individual hotel / venue |
| `StayToken` | *(hospitality-specific)* | `peppr_stay_tokens` | Restricted QR access credential for hotel guests |
| `GuestSession` | *(hospitality-specific)* | `peppr_guest_sessions` | Active guest context after QR scan |
| `RequestItem` | *(line item)* | `peppr_request_items` | Individual item within a ServiceRequest |

## Domain Ownership

```
Partner
  └── Property
        ├── Room ──────────────── Spot (QrCode)
        ├── ServiceTemplate ────── Template
        │     └── CatalogItem ──── Listing
        └── ServiceRequest ─────── Transaction
              ├── RequestItems ─── Line Items
              └── (Fulfillment) ── embedded in status
```

## What is Missing vs Genesis Canon

- **Payment domain** — no payment intent, gateway reference, or callback handling
- **Fulfillment domain** — fulfillment state is embedded in ServiceRequest.status, not a separate entity
- **Event catalog** — no explicit business event emission

## ServiceRequest Lifecycle (Transaction States)

```
PENDING
  │
  ├── CONFIRMED (operator accepts)
  │     │
  │     ├── IN_PROGRESS (fulfillment started)
  │     │     │
  │     │     └── COMPLETED (fulfillment done)
  │     │
  │     └── CANCELLED (operator or guest cancels)
  │
  └── CANCELLED (rejected before confirmation)
```
