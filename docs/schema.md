# Database Schema Reference

> **Source of truth:** `drizzle/schema.ts` — MySQL/TiDB via Drizzle ORM.
> All timestamps are stored in UTC. All UUIDs use `varchar(36)`. Monetary values use `decimal(12,2)`.
> This document is auto-derived from the schema; update it whenever `drizzle/schema.ts` changes.

---

## Table of Contents

1. [Auth & Identity](#1-auth--identity)
2. [Organisation Hierarchy](#2-organisation-hierarchy)
3. [Rooms & QR Infrastructure](#3-rooms--qr-infrastructure)
4. [Service Catalogue & Templates](#4-service-catalogue--templates)
5. [Guest Sessions & Requests](#5-guest-sessions--requests)
6. [Fulfilment: Assignments, Tickets & Operators](#6-fulfilment-assignments-tickets--operators)
7. [Payments & Audit](#7-payments--audit)
8. [CMS: Banners & Greetings](#8-cms-banners--greetings)
9. [Entity Relationship Summary](#9-entity-relationship-summary)

---

## 1. Auth & Identity

### `users`

Core user table backing the Manus OAuth flow. Every admin who signs in via Manus SSO gets a row here.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | Auto-increment surrogate key |
| `openId` | `varchar(64)` UNIQUE | — | — | Manus OAuth subject identifier |
| `name` | `text` | ✓ | — | Display name from OAuth profile |
| `email` | `varchar(320)` | ✓ | — | Email from OAuth profile |
| `loginMethod` | `varchar(64)` | ✓ | — | e.g. `oauth`, `sso` |
| `role` | `enum('user','admin')` | — | `user` | Platform-level role gate |
| `fontSizePref` | `enum('S','M','L','XL')` | — | `M` | Admin UI accessibility preference |
| `createdAt` | `timestamp` | — | `NOW()` | |
| `updatedAt` | `timestamp` | — | `NOW() ON UPDATE` | |
| `lastSignedIn` | `timestamp` | — | `NOW()` | |

### `peppr_users`

Migrated FastAPI user table. Supports password-based auth, 2FA, SSO, and account lockout. Linked to `users` via `manus_open_id`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `user_id` | `varchar(36)` PK | — | — | UUID |
| `email` | `varchar(255)` UNIQUE | — | — | |
| `password_hash` | `text` | — | — | bcrypt |
| `full_name` | `varchar(255)` | — | — | |
| `mobile` | `varchar(20)` | ✓ | — | |
| `role` | `varchar(50)` | — | `USER` | Legacy role string |
| `position_id` | `varchar(100)` | ✓ | — | FK → `peppr_staff_positions.id` (soft) |
| `partner_id` | `varchar(36)` | ✓ | — | FK → `peppr_partners.id` (soft) |
| `property_id` | `varchar(36)` | ✓ | — | FK → `peppr_properties.id` (soft) |
| `email_verified` | `boolean` | — | `false` | |
| `status` | `varchar(20)` | — | `ACTIVE` | `ACTIVE \| INACTIVE \| LOCKED` |
| `failed_login_attempts` | `int` | — | `0` | Resets on successful login |
| `locked_until` | `timestamp` | ✓ | — | Set on brute-force lockout |
| `last_login_at` | `timestamp` | ✓ | — | |
| `requires_2fa` | `boolean` | — | `false` | |
| `twofa_enabled` | `boolean` | — | `false` | |
| `twofa_secret` | `text` | ✓ | — | TOTP secret (encrypted at rest) |
| `twofa_method` | `varchar(20)` | ✓ | — | `totp \| sms` |
| `twofa_backup_codes` | `json` | ✓ | — | Array of hashed backup codes |
| `sso_provider` | `varchar(50)` | ✓ | — | e.g. `google`, `manus` |
| `sso_provider_id` | `varchar(255)` | ✓ | — | Subject from SSO provider |
| `manus_open_id` | `varchar(64)` | ✓ | — | Links to `users.openId` |
| `reset_token_hash` | `text` | ✓ | — | Password reset token (hashed) |
| `reset_token_expires_at` | `timestamp` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_user_roles`

Multi-role binding table. A user can hold multiple roles, each scoped to a partner or property.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | |
| `user_id` | `varchar(36)` | — | — | FK → `peppr_users.user_id` |
| `role_id` | `varchar(100)` | — | — | e.g. `SUPER_ADMIN`, `PROPERTY_ADMIN`, `STAFF`, `FRONT_OFFICE` |
| `partner_id` | `varchar(36)` | ✓ | — | Scope for `PARTNER_ADMIN` role |
| `property_id` | `varchar(36)` | ✓ | — | Scope for property-level roles |
| `granted_at` | `timestamp` | — | `NOW()` | |
| `granted_by` | `varchar(36)` | ✓ | — | FK → `peppr_users.user_id` (soft) |

**Role hierarchy:** `SUPER_ADMIN` > `SYSTEM_ADMIN` > `ADMIN` > `PARTNER_ADMIN` > `PROPERTY_ADMIN` > `STAFF` / `FRONT_OFFICE`

### `peppr_sso_allowlist`

Allowlist of email addresses permitted to use SSO login.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | |
| `email` | `varchar(255)` UNIQUE | — | — | |
| `note` | `text` | ✓ | — | Admin note |
| `added_by` | `varchar(36)` | ✓ | — | FK → `peppr_users.user_id` (soft) |
| `status` | `varchar(20)` | — | `ACTIVE` | `ACTIVE \| REMOVED` |
| `created_at` | `timestamp` | — | `NOW()` | |
| `removed_at` | `timestamp` | ✓ | — | |

---

## 2. Organisation Hierarchy

### `peppr_partners`

Top-level organisation (hotel group, management company).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `name` | `varchar(255)` | — | — | |
| `email` | `varchar(255)` | — | — | Primary contact email |
| `phone` | `varchar(50)` | ✓ | — | |
| `address` | `text` | ✓ | — | |
| `contact_person` | `varchar(255)` | ✓ | — | |
| `status` | `varchar(20)` | — | `active` | `active \| inactive` |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_properties`

Individual property (hotel, resort, serviced apartment) belonging to a partner.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `partner_id` | `varchar(36)` | — | — | FK → `peppr_partners.id` |
| `name` | `varchar(255)` | — | — | |
| `type` | `varchar(50)` | — | — | e.g. `hotel`, `resort`, `serviced_apartment` |
| `address` | `text` | — | — | |
| `city` | `varchar(100)` | — | — | |
| `country` | `varchar(100)` | — | — | |
| `timezone` | `varchar(50)` | — | `UTC` | IANA timezone string |
| `currency` | `varchar(10)` | — | `THB` | ISO 4217 |
| `phone` | `varchar(50)` | ✓ | — | |
| `email` | `varchar(255)` | ✓ | — | |
| `status` | `varchar(20)` | — | `active` | `active \| inactive` |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_property_config`

One-to-one configuration row per property. Controls branding, limits, feature flags, and i18n greeting content.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | |
| `property_id` | `varchar(36)` UNIQUE | — | — | FK → `peppr_properties.id` |
| `logo_url` | `text` | ✓ | — | CDN URL |
| `primary_color` | `varchar(20)` | ✓ | — | Hex or CSS color |
| `secondary_color` | `varchar(20)` | ✓ | — | |
| `welcome_message` | `text` | ✓ | — | Legacy plain-text welcome (superseded by `greeting_config`) |
| `qr_validation_limit` | `int` | ✓ | `100` | Max QR validations per day |
| `service_catalog_limit` | `int` | ✓ | `50` | Max catalog items shown |
| `request_submission_limit` | `int` | ✓ | `10` | Max requests per session |
| `enable_guest_cancellation` | `boolean` | — | `true` | |
| `enable_alternative_proposals` | `boolean` | — | `false` | |
| `enable_direct_messaging` | `boolean` | — | `false` | |
| `greeting_config` | `json` | ✓ | — | Map of locale → `{ title, body }`. Supported locales: `en`, `th`, `ja`, `zh`, `ko`, `fr`, `de`, `ar` |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

---

## 3. Rooms & QR Infrastructure

### `peppr_rooms`

Individual room or space within a property.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `room_number` | `varchar(50)` | — | — | Human-readable identifier |
| `floor` | `varchar(20)` | ✓ | — | |
| `zone` | `varchar(50)` | ✓ | — | Wing, building, etc. |
| `room_type` | `varchar(50)` | — | — | e.g. `Standard`, `Deluxe`, `Suite` |
| `template_id` | `varchar(36)` | ✓ | — | FK → `peppr_service_templates.id` (soft) |
| `status` | `varchar(20)` | — | `active` | `active \| inactive` |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_qr_codes`

QR code record linking a physical code to a room. The `qr_code_id` is the value encoded in the QR image.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | Internal UUID (used for deep-links) |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `room_id` | `varchar(36)` | — | — | FK → `peppr_rooms.id` |
| `qr_code_id` | `varchar(100)` UNIQUE | — | — | Public code encoded in the QR image |
| `access_type` | `varchar(20)` | — | `public` | `public \| restricted` |
| `status` | `varchar(20)` | — | `active` | `active \| revoked` |
| `last_scanned` | `timestamp` | ✓ | — | |
| `scan_count` | `int` | — | `0` | |
| `expires_at` | `timestamp` | ✓ | — | Null = never expires |
| `revoked_reason` | `text` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_stay_tokens`

Short-lived tokens issued by front office to grant access to restricted QR codes.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | |
| `token` | `varchar(100)` UNIQUE | — | — | Opaque token presented by guest |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `room_id` | `varchar(36)` | — | — | FK → `peppr_rooms.id` |
| `room_number` | `varchar(50)` | ✓ | — | Denormalised for display |
| `expires_at` | `timestamp` | — | — | |
| `status` | `varchar(20)` | — | `active` | `active \| used \| expired \| revoked` |
| `created_at` | `timestamp` | — | `NOW()` | |

---

## 4. Service Catalogue & Templates

### `peppr_service_providers`

External vendor or internal department that fulfils service requests.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `name` | `varchar(255)` | — | — | |
| `email` | `varchar(255)` | — | — | |
| `phone` | `varchar(50)` | ✓ | — | |
| `category` | `varchar(100)` | — | — | e.g. `Housekeeping`, `F&B`, `Maintenance` |
| `service_area` | `varchar(255)` | — | — | |
| `contact_person` | `varchar(255)` | ✓ | — | |
| `rating` | `decimal(3,2)` | ✓ | — | 0.00 – 5.00 |
| `status` | `varchar(20)` | — | `active` | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_catalog_items`

Individual purchasable or requestable service item.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `provider_id` | `varchar(36)` | — | — | FK → `peppr_service_providers.id` |
| `name` | `varchar(255)` | — | — | |
| `description` | `text` | ✓ | — | |
| `sku` | `varchar(100)` | — | — | |
| `category` | `varchar(100)` | — | — | |
| `price` | `decimal(12,2)` | — | — | |
| `currency` | `varchar(10)` | — | `THB` | |
| `unit` | `varchar(50)` | — | `each` | e.g. `each`, `hour`, `night` |
| `duration_minutes` | `int` | ✓ | — | For time-based services |
| `terms` | `text` | ✓ | — | |
| `status` | `varchar(20)` | — | `active` | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_service_templates`

Named bundle of catalog items assigned to rooms. Controls what guests see in the service menu.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `name` | `varchar(255)` | — | — | |
| `description` | `text` | ✓ | — | |
| `tier` | `varchar(50)` | — | — | e.g. `Standard`, `Premium`, `VIP` |
| `status` | `varchar(20)` | — | `active` | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_template_items`

Junction table: many-to-many between `peppr_service_templates` and `peppr_catalog_items`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `template_id` | `varchar(36)` | — | — | FK → `peppr_service_templates.id` |
| `catalog_item_id` | `varchar(36)` | — | — | FK → `peppr_catalog_items.id` |
| `sort_order` | `int` | — | `0` | Display order within template |
| `created_at` | `timestamp` | — | `NOW()` | |

### `peppr_room_template_assignments`

Audit log of template assignments to rooms. The current assignment is the latest row for a given `room_id`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | |
| `room_id` | `varchar(36)` | — | — | FK → `peppr_rooms.id` |
| `template_id` | `varchar(36)` | — | — | FK → `peppr_service_templates.id` |
| `assigned_at` | `timestamp` | — | `NOW()` | |

---

## 5. Guest Sessions & Requests

### `peppr_guest_sessions`

Created when a guest scans a QR code. Tracks the guest's active session, locale preference, and font size.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID — used as session token in cookie |
| `qr_code_id` | `varchar(36)` | — | — | FK → `peppr_qr_codes.id` |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `room_id` | `varchar(36)` | — | — | FK → `peppr_rooms.id` |
| `guest_name` | `varchar(255)` | ✓ | — | Provided by guest at scan |
| `access_type` | `varchar(20)` | — | — | `public \| restricted` |
| `status` | `varchar(20)` | — | `ACTIVE` | `ACTIVE \| EXPIRED \| REVOKED` |
| `expires_at` | `timestamp` | — | — | |
| `font_size_pref` | `enum('S','M','L','XL')` | — | `M` | Guest accessibility preference |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_service_requests`

A service request submitted by a guest. Contains pricing, status lifecycle, and SLA tracking.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_number` | `varchar(50)` UNIQUE | — | — | Human-readable reference (e.g. `REQ-20240327-0001`) |
| `session_id` | `varchar(36)` | — | — | FK → `peppr_guest_sessions.id` |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `room_id` | `varchar(36)` | — | — | FK → `peppr_rooms.id` |
| `guest_name` | `varchar(255)` | ✓ | — | Denormalised from session |
| `guest_phone` | `varchar(50)` | ✓ | — | |
| `guest_notes` | `text` | ✓ | — | |
| `preferred_datetime` | `timestamp` | ✓ | — | Guest's requested delivery time |
| `subtotal` | `decimal(12,2)` | — | `0` | |
| `discount_amount` | `decimal(12,2)` | — | `0` | |
| `total_amount` | `decimal(12,2)` | — | `0` | |
| `currency` | `varchar(10)` | — | `THB` | |
| `status` | `varchar(30)` | — | `SUBMITTED` | See status lifecycle below |
| `status_reason` | `text` | ✓ | — | |
| `matching_mode` | `varchar(10)` | — | `auto` | `auto \| manual` |
| `sla_deadline` | `timestamp` | ✓ | — | Calculated at submission |
| `assigned_provider_id` | `varchar(36)` | ✓ | — | FK → `peppr_service_providers.id` (soft) |
| `auto_confirmed` | `boolean` | — | `false` | |
| `confirmed_at` | `timestamp` | ✓ | — | |
| `completed_at` | `timestamp` | ✓ | — | |
| `cancelled_at` | `timestamp` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

**Request status lifecycle:**

```
SUBMITTED → CONFIRMED → DISPATCHED → RUNNING ⇄ PENDING → COMPLETED
         ↘ REJECTED
SUBMITTED / CONFIRMED / DISPATCHED / RUNNING / PENDING → CANCELLED
COMPLETED → DISPUTED
```

### `peppr_request_items`

Line items within a service request.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_id` | `varchar(36)` | — | — | FK → `peppr_service_requests.id` |
| `item_id` | `varchar(36)` | ✓ | — | FK → `peppr_catalog_items.id` (soft) |
| `template_item_id` | `varchar(36)` | ✓ | — | FK → `peppr_template_items.id` (soft) |
| `item_name` | `varchar(255)` | — | — | Snapshot at time of request |
| `item_category` | `varchar(100)` | — | — | |
| `unit_price` | `decimal(12,2)` | — | — | Snapshot at time of request |
| `quantity` | `int` | — | `1` | |
| `included_quantity` | `int` | — | `0` | Free-of-charge quantity |
| `billable_quantity` | `int` | — | `1` | `quantity - included_quantity` |
| `line_total` | `decimal(12,2)` | — | — | `billable_quantity × unit_price` |
| `currency` | `varchar(10)` | — | `THB` | |
| `guest_notes` | `text` | ✓ | — | Per-item note from guest |
| `status` | `varchar(20)` | — | `PENDING` | |
| `created_at` | `timestamp` | — | `NOW()` | |

---

## 6. Fulfilment: Assignments, Tickets & Operators

### `peppr_sp_assignments` *(legacy — superseded by SP Tickets)*

Original whole-request SP assignment. Kept for backward compatibility. At MVP, only one row per request has `is_active = true`.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_id` | `varchar(36)` | — | — | FK → `peppr_service_requests.id` |
| `provider_id` | `varchar(36)` | — | — | FK → `peppr_service_providers.id` |
| `is_active` | `boolean` | — | `true` | |
| `assigned_at` | `timestamp` | — | `NOW()` | |
| `accepted_at` | `timestamp` | ✓ | — | |
| `rejected_at` | `timestamp` | ✓ | — | |
| `rejection_reason` | `text` | ✓ | — | |
| `estimated_arrival` | `timestamp` | ✓ | — | |
| `assigned_staff_name` | `varchar(200)` | ✓ | — | |
| `delivery_notes` | `text` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_sp_tickets`

Per-item ticket assigned to a service provider. Replaces `peppr_sp_assignments` for granular fulfilment tracking.

**Lifecycle:** `OPEN → CONFIRMED → DISPATCHED → RUNNING ⇄ PENDING → CLOSED` (any state → `CANCELLED`)

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_id` | `varchar(36)` | — | — | FK → `peppr_service_requests.id` |
| `provider_id` | `varchar(36)` | — | — | FK → `peppr_service_providers.id` |
| `item_ids` | `json` | — | `[]` | Array of `peppr_request_items.id` |
| `status` | `varchar(20)` | — | `OPEN` | See lifecycle above |
| `sp_admin_notes` | `text` | ✓ | — | |
| `decline_reason` | `text` | ✓ | — | |
| `accepted_at` | `timestamp` | ✓ | — | |
| `dispatched_at` | `timestamp` | ✓ | — | |
| `closed_at` | `timestamp` | ✓ | — | |
| `cancelled_at` | `timestamp` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_service_operators`

Field staff managed by a service provider admin.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `provider_id` | `varchar(36)` | — | — | FK → `peppr_service_providers.id` |
| `user_id` | `varchar(36)` | — | — | FK → `peppr_users.user_id` |
| `display_name` | `varchar(200)` | — | — | |
| `specialisation` | `varchar(50)` | — | `GENERAL` | e.g. `GENERAL`, `PLUMBING`, `ELECTRICAL` |
| `status` | `varchar(20)` | — | `ACTIVE` | `ACTIVE \| INACTIVE \| ON_DUTY \| OFF_DUTY` |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_so_jobs`

Individual job dispatched to a service operator from a ticket.

**Lifecycle:** `DISPATCHED → RUNNING ⇄ PENDING → CLOSED \| CANCELLED`

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `ticket_id` | `varchar(36)` | — | — | FK → `peppr_sp_tickets.id` |
| `operator_id` | `varchar(36)` | — | — | FK → `peppr_service_operators.id` |
| `status` | `varchar(20)` | — | `DISPATCHED` | |
| `stage_notes` | `text` | ✓ | — | |
| `stage_history` | `json` | — | `[]` | Array of `{ status, timestamp, note }` |
| `assigned_at` | `timestamp` | — | `NOW()` | |
| `started_at` | `timestamp` | ✓ | — | |
| `completed_at` | `timestamp` | ✓ | — | |
| `cancelled_at` | `timestamp` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_staff_positions`

Job positions (titles/departments) available at a property.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `title` | `varchar(255)` | — | — | |
| `department` | `varchar(100)` | — | — | |
| `property_id` | `varchar(36)` | ✓ | — | Null = global position |
| `status` | `varchar(20)` | — | `active` | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_staff_members`

Junction: a user assigned to a position at a property.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `user_id` | `varchar(36)` | — | — | FK → `peppr_users.user_id` |
| `position_id` | `varchar(36)` | — | — | FK → `peppr_staff_positions.id` |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `status` | `varchar(20)` | — | `active` | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

---

## 7. Payments & Audit

### `peppr_payments`

Payment record for a service request. Supports QR-based payment gateways (Omise, PromptPay).

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_id` | `varchar(36)` | — | — | FK → `peppr_service_requests.id` |
| `method` | `varchar(20)` | — | — | `omise_qr \| promptpay_qr` |
| `amount` | `varchar(20)` | — | — | Decimal string e.g. `"350.00"` |
| `currency` | `varchar(3)` | — | `THB` | |
| `gateway_ref` | `varchar(200)` | ✓ | — | |
| `gateway_charge_id` | `varchar(200)` | ✓ | — | |
| `status` | `varchar(20)` | — | `PENDING` | `PENDING \| PAID \| FAILED \| REFUNDED` |
| `qr_payload` | `text` | ✓ | — | Raw QR string |
| `qr_data_url` | `text` | ✓ | — | Base64 PNG for display |
| `expires_at` | `timestamp` | ✓ | — | |
| `paid_at` | `timestamp` | ✓ | — | |
| `confirmed_at` | `timestamp` | ✓ | — | |
| `failed_at` | `timestamp` | ✓ | — | |
| `failure_reason` | `text` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

### `peppr_request_events`

Append-only state-transition audit log for service requests.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_id` | `varchar(36)` | — | — | FK → `peppr_service_requests.id` |
| `from_state` | `varchar(50)` | ✓ | — | Null for initial SUBMITTED event |
| `to_state` | `varchar(50)` | — | — | |
| `actor_id` | `varchar(36)` | ✓ | — | |
| `actor_type` | `varchar(20)` | — | — | `guest \| staff \| sp \| system` |
| `note` | `text` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |

### `peppr_request_notes`

Internal and guest-visible notes attached to a request.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `request_id` | `varchar(36)` | — | — | FK → `peppr_service_requests.id` |
| `author_id` | `varchar(36)` | ✓ | — | Null for system notes |
| `author_type` | `varchar(20)` | — | — | `staff \| sp \| system` |
| `content` | `text` | — | — | |
| `is_internal` | `boolean` | — | `true` | False = visible to guest |
| `created_at` | `timestamp` | — | `NOW()` | |

### `peppr_audit_events`

Platform-wide audit log for security-sensitive actions.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `int` PK AI | — | — | |
| `actor_type` | `varchar(20)` | — | `USER` | `USER \| SYSTEM` |
| `actor_id` | `varchar(36)` | ✓ | — | |
| `action` | `varchar(50)` | — | — | e.g. `LOGIN`, `ROLE_GRANT`, `QR_REVOKE` |
| `resource_type` | `varchar(50)` | ✓ | — | |
| `resource_id` | `varchar(36)` | ✓ | — | |
| `details` | `json` | ✓ | — | Arbitrary context |
| `ip_address` | `varchar(45)` | ✓ | — | IPv4 or IPv6 |
| `user_agent` | `text` | ✓ | — | |
| `created_at` | `timestamp` | — | `NOW()` | |

---

## 8. CMS: Banners & Greetings

### `peppr_property_banners`

Banner slides shown in the guest QR hero carousel. Supports scheduling, locale targeting, and CTA links.

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| `id` | `varchar(36)` PK | — | — | UUID |
| `property_id` | `varchar(36)` | — | — | FK → `peppr_properties.id` |
| `type` | `varchar(30)` | — | `announcement` | `default \| announcement \| promotion` |
| `title` | `varchar(200)` | — | — | Short headline |
| `body` | `text` | ✓ | — | Sub-headline or body text |
| `image_url` | `text` | ✓ | — | CDN URL; falls back to gradient |
| `link_url` | `text` | ✓ | — | CTA destination |
| `link_label` | `varchar(100)` | ✓ | — | CTA button label |
| `locale` | `varchar(10)` | ✓ | — | Null = all locales. Supported: `en`, `th`, `ja`, `zh`, `ko`, `fr`, `de`, `ar` |
| `sort_order` | `int` | — | `0` | Ascending display order |
| `is_active` | `boolean` | — | `true` | |
| `starts_at` | `timestamp` | ✓ | — | Scheduled publish start |
| `ends_at` | `timestamp` | ✓ | — | Scheduled publish end |
| `created_at` | `timestamp` | — | `NOW()` | |
| `updated_at` | `timestamp` | — | `NOW() ON UPDATE` | |

> **Greeting config** is stored as a JSON column on `peppr_property_config.greeting_config` rather than a separate table. Shape: `Record<locale, { title: string; body: string }>`.

---

## 9. Entity Relationship Summary

The diagram below shows the primary foreign-key relationships. Soft references (denormalised copies or optional FKs) are omitted for clarity.

```
peppr_partners
  └── peppr_properties (partner_id)
        ├── peppr_property_config (property_id, 1:1)
        ├── peppr_property_banners (property_id, 1:N)
        ├── peppr_rooms (property_id, 1:N)
        │     ├── peppr_qr_codes (room_id, 1:N)
        │     │     └── peppr_guest_sessions (qr_code_id → peppr_qr_codes.id, N:1)
        │     │           └── peppr_service_requests (session_id, 1:N)
        │     │                 ├── peppr_request_items (request_id, 1:N)
        │     │                 ├── peppr_sp_assignments (request_id, 1:N) [legacy]
        │     │                 ├── peppr_sp_tickets (request_id, 1:N)
        │     │                 │     └── peppr_so_jobs (ticket_id, 1:N)
        │     │                 ├── peppr_payments (request_id, 1:N)
        │     │                 ├── peppr_request_events (request_id, 1:N)
        │     │                 └── peppr_request_notes (request_id, 1:N)
        │     └── peppr_room_template_assignments (room_id, 1:N)
        │           └── peppr_service_templates (template_id)
        │                 ├── peppr_template_items (template_id, 1:N)
        │                 │     └── peppr_catalog_items (catalog_item_id)
        │                 │           └── peppr_service_providers (provider_id)
        │                 └── peppr_sp_tickets (provider_id → peppr_service_providers)
        ├── peppr_stay_tokens (property_id, 1:N)
        └── peppr_staff_members (property_id, 1:N)
              ├── peppr_users (user_id)
              └── peppr_staff_positions (position_id)

peppr_service_operators (provider_id → peppr_service_providers, user_id → peppr_users)
  └── peppr_so_jobs (operator_id)

users (Manus OAuth) ←→ peppr_users (manus_open_id)
peppr_user_roles (user_id → peppr_users, partner_id / property_id scope)
peppr_sso_allowlist (standalone)
peppr_audit_events (standalone)
```

---

*Last updated: 2026-03-27. Maintained by the Peppr Around engineering team.*
