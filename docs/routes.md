# Server Route Map

> Generated: 2026-03-27 | Phase 22 normalization
>
> This document is the single source of truth for all API surface area in the Peppr Around Admin server.
> Update it whenever a new procedure or route is added.

---

## Conventions

| Symbol | Meaning |
|--------|---------|
| 🔒 | Requires `requireAuth` middleware (Express) or `protectedProcedure` (tRPC) |
| 🌐 | Public — no authentication required |
| 🛡️ | Admin-only (role check inside procedure) |

All tRPC procedures are accessible at `POST /api/trpc/<namespace>.<procedure>`.
All Express REST routes are prefixed with `/api/v1/` unless otherwise noted.

---

## tRPC Namespaces

### `auth` — Authentication & Session

| Procedure | Auth | Description |
|-----------|------|-------------|
| `auth.me` | 🌐 | Returns current user or null |
| `auth.pepprProfile` | 🔒 | Returns full Peppr profile with roles |
| `auth.logout` | 🔒 | Clears session cookie |

### `crud.partners` — Partner CRUD

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.partners.list` | 🔒 | Paginated list with search/filter |
| `crud.partners.get` | 🔒 | Single partner by ID |
| `crud.partners.create` | 🔒 | Create new partner |
| `crud.partners.update` | 🔒 | Update partner fields |
| `crud.partners.deactivate` | 🔒 | Soft-deactivate partner |

### `crud.properties` — Property CRUD

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.properties.list` | 🔒 | Paginated list with search/filter |
| `crud.properties.get` | 🔒 | Single property by ID |
| `crud.properties.create` | 🔒 | Create new property |
| `crud.properties.update` | 🔒 | Update property fields |
| `crud.properties.deactivate` | 🔒 | Soft-deactivate property |

### `crud.rooms` — Room CRUD

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.rooms.list` | 🔒 | Paginated list with search/filter |
| `crud.rooms.get` | 🔒 | Single room by ID (joins QR code + property) |
| `crud.rooms.create` | 🔒 | Create single room |
| `crud.rooms.bulkCreate` | 🔒 | Bulk create rooms (range or CSV) |
| `crud.rooms.update` | 🔒 | Update room fields (returns template_name) |
| `crud.rooms.assignTemplate` | 🔒 | Assign service template to room |
| `crud.rooms.removeTemplate` | 🔒 | Remove service template from room |

### `crud.providers` — Service Provider CRUD

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.providers.list` | 🔒 | Paginated list |
| `crud.providers.get` | 🔒 | Single provider by ID |
| `crud.providers.create` | 🔒 | Create provider |
| `crud.providers.update` | 🔒 | Update provider |
| `crud.providers.deactivate` | 🔒 | Soft-deactivate provider |

### `crud.catalog` — Service Catalog CRUD

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.catalog.list` | 🔒 | Paginated list |
| `crud.catalog.get` | 🔒 | Single catalog item by ID |
| `crud.catalog.create` | 🔒 | Create catalog item |
| `crud.catalog.update` | 🔒 | Update catalog item |
| `crud.catalog.deactivate` | 🔒 | Soft-deactivate catalog item |

### `crud.templates` — Service Template CRUD

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.templates.list` | 🔒 | Paginated list |
| `crud.templates.get` | 🔒 | Single template with items |
| `crud.templates.create` | 🔒 | Create template |
| `crud.templates.update` | 🔒 | Update template |
| `crud.templates.addItem` | 🔒 | Add catalog item to template |
| `crud.templates.removeItem` | 🔒 | Remove item from template |

### `crud.assignments` — Bulk Template Assignments

| Procedure | Auth | Description |
|-----------|------|-------------|
| `crud.assignments.listByRoom` | 🔒 | List assignments for a room |
| `crud.assignments.listByTemplate` | 🔒 | List assignments for a template |
| `crud.assignments.bulkAssign` | 🔒 | Bulk assign template to multiple rooms |

### `qr` — QR Code Management

| Procedure | Auth | Description |
|-----------|------|-------------|
| `qr.list` | 🔒 | Paginated list with search/filter/status |
| `qr.get` | 🔒 | Single QR code by DB ID |
| `qr.generate` | 🔒 | Generate one or more QR codes |
| `qr.updateAccess` | 🔒 | Change access type (public/restricted) |
| `qr.activate` | 🔒 | Activate a QR code |
| `qr.deactivate` | 🔒 | Deactivate a QR code |
| `qr.suspend` | 🔒 | Suspend a QR code |
| `qr.resume` | 🔒 | Resume a suspended QR code |
| `qr.revoke` | 🔒 | Permanently revoke a QR code |
| `qr.extend` | 🔒 | Extend QR code expiry |
| `qr.bulkUpdateAccess` | 🔒 | Bulk change access type |
| `qr.bulkRevoke` | 🔒 | Bulk revoke QR codes |
| `qr.bulkExtend` | 🔒 | Bulk extend QR code expiry |
| `qr.activeTokens` | 🔒 | List active stay tokens for a QR |

### `users` — User Management

| Procedure | Auth | Description |
|-----------|------|-------------|
| `users.list` | 🔒 | Paginated user list |
| `users.get` | 🔒 | Single user by ID |
| `users.invite` | 🔒 | Invite new user by email |
| `users.update` | 🔒 | Update user fields |
| `users.deactivate` | 🔒 | Deactivate user |
| `users.reactivate` | 🔒 | Reactivate user |

### `staff` — Staff Positions & Members

| Procedure | Auth | Description |
|-----------|------|-------------|
| `staff.listPositions` | 🔒 | Paginated staff positions |
| `staff.getPosition` | 🔒 | Single position by ID |
| `staff.createPosition` | 🔒 | Create staff position |
| `staff.updatePosition` | 🔒 | Update staff position |
| `staff.listMembers` | 🔒 | Paginated staff members |
| `staff.getMember` | 🔒 | Single member by ID |
| `staff.assignMember` | 🔒 | Assign member to position |
| `staff.updateMember` | 🔒 | Update member details |
| `staff.deactivateMember` | 🔒 | Deactivate staff member |

### `requests` — Service Requests

| Procedure | Auth | Description |
|-----------|------|-------------|
| `requests.submitCart` | 🌐 | Guest submits a service request cart |
| `requests.getRequest` | 🔒 | Get request by ID |
| `requests.listByProperty` | 🔒 | List requests for a property |
| `requests.assignProvider` | 🔒 | Assign provider to request |
| `requests.acceptJob` | 🔒 | Provider accepts job |
| `requests.rejectJob` | 🔒 | Provider rejects job |
| `requests.markInProgress` | 🔒 | Mark request in-progress |
| `requests.markCompleted` | 🔒 | Mark request completed |
| `requests.confirmFulfilled` | 🔒 | Confirm fulfillment |
| `requests.raiseDispute` | 🔒 | Raise a dispute |
| `requests.cancelRequest` | 🔒 | Cancel a request |
| `requests.addNote` | 🔒 | Add internal staff note |
| `requests.setMatchingMode` | 🔒 | Set provider matching mode |
| `requests.listSpJobs` | 🔒 | List SP jobs |
| `requests.getByRefNo` | 🔒 | Get request by reference number |
| `requests.initiatePayment` | 🔒 | Initiate payment for request |
| `requests.pollPayment` | 🔒 | Poll payment status |
| `requests.simulatePayment` | 🔒 | Simulate payment (dev/test) |
| `requests.sendPaymentSms` | 🔒 | Send payment SMS to guest |
| `requests.resolveDispute` | 🔒 | Resolve a dispute |

### `reports` — Analytics & Reports

| Procedure | Auth | Description |
|-----------|------|-------------|
| `reports.revenue.get` | 🔒 | Revenue report data |
| `reports.satisfaction.get` | 🔒 | Guest satisfaction report |
| `reports.staffAnalytics.get` | 🔒 | Staff performance analytics |
| `reports.requestAnalytics.get` | 🔒 | Request analytics |
| `reports.auditLog.list` | 🔒 | Audit log with filtering |

### `rbac` — Role-Based Access Control

| Procedure | Auth | Description |
|-----------|------|-------------|
| `rbac.myRoles` | 🔒 | Current user's assigned roles |
| `rbac.switchRole` | 🔒 | Switch active role context |
| `rbac.listUsers` | 🛡️ | List users with roles |
| `rbac.assignRole` | 🛡️ | Assign role to user |
| `rbac.revokeRole` | 🛡️ | Revoke role from user |
| `rbac.ssoAllowlist` | 🛡️ | List SSO allowlist entries |
| `rbac.addSsoAllowlist` | 🛡️ | Add SSO allowlist entry |
| `rbac.removeSsoAllowlist` | 🛡️ | Remove SSO allowlist entry |
| `rbac.getUserRoles` | 🔒 | Get roles for a specific user |
| `rbac.roleDefinitions` | 🔒 | List all role definitions |

### `spTickets` — Service Provider Tickets

| Procedure | Auth | Description |
|-----------|------|-------------|
| `spTickets.createTicket` | 🔒 | Create SP ticket |
| `spTickets.listInbound` | 🔒 | List inbound tickets |
| `spTickets.listByProvider` | 🔒 | List tickets for a provider |
| `spTickets.acceptTicket` | 🔒 | Accept a ticket |
| `spTickets.declineTicket` | 🔒 | Decline a ticket |
| `spTickets.dispatchTicket` | 🔒 | Dispatch a ticket |
| `spTickets.getSoJob` | 🔒 | Get SO job by ID |
| `spTickets.listSoJobs` | 🔒 | List SO jobs |
| `spTickets.advanceSoJobStage` | 🔒 | Advance SO job stage |
| `spTickets.assignItemsToSp` | 🔒 | Assign items to SP |
| `spTickets.listTicketsForRequest` | 🔒 | List tickets for a request |
| `spTickets.updateJobStage` | 🔒 | Update job stage |

### `serviceOperators` — Service Operators

| Procedure | Auth | Description |
|-----------|------|-------------|
| `serviceOperators.listByProvider` | 🔒 | List operators for a provider |
| `serviceOperators.createOperator` | 🔒 | Create operator |
| `serviceOperators.updateOperator` | 🔒 | Update operator |
| `serviceOperators.deleteOperator` | 🔒 | Delete operator |
| `serviceOperators.getMyJobs` | 🔒 | Get jobs assigned to current operator |
| `serviceOperators.getJob` | 🔒 | Get single job |

### `cms` — Content Management (Admin)

| Procedure | Auth | Description |
|-----------|------|-------------|
| `cms.uploadBannerImage` | 🔒 | Upload banner image to S3 |
| `cms.listBanners` | 🔒 | List banners for a property |
| `cms.createBanner` | 🔒 | Create banner |
| `cms.updateBanner` | 🔒 | Update banner |
| `cms.deleteBanner` | 🔒 | Delete banner |
| `cms.reorderBanners` | 🔒 | Reorder banners by sort order |
| `cms.getGreeting` | 🔒 | Get greeting config for a property |
| `cms.setGreeting` | 🔒 | Set greeting config for a property |
| `cms.getPublicPreview` | 🔒 | Get preview data (banners + greeting + branding) |

### `cmsPublic` — CMS Public (No Auth)

| Procedure | Auth | Description |
|-----------|------|-------------|
| `cmsPublic.getPublicPreview` | 🌐 | Shareable guest preview — banners + greeting + branding |

### `preferences` — User Preferences

| Procedure | Auth | Description |
|-----------|------|-------------|
| `preferences.getFontSize` | 🔒 | Get current user's font size preference |
| `preferences.setFontSize` | 🔒 | Set current user's font size preference |

### `stayTokens` — Stay Token Management

| Procedure | Auth | Description |
|-----------|------|-------------|
| `stayTokens.listByRoom` | 🔒 | List stay tokens for a room |
| `stayTokens.generateTestToken` | 🔒 | Generate a test stay token (dev) |

### `system` — System Utilities

| Procedure | Auth | Description |
|-----------|------|-------------|
| `system.notifyOwner` | 🔒 | Send notification to project owner |

---

## Express REST Routes

> All routes below are mounted under `/api/v1/` unless noted.
> All routes require `requireAuth` middleware unless marked 🌐.

### `/api/v1/partners`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | 🔒 | List partners |
| GET | `/:id` | 🔒 | Get partner |
| POST | `/` | 🔒 | Create partner |
| PUT | `/:id` | 🔒 | Update partner |
| POST | `/:id/deactivate` | 🔒 | Deactivate partner |
| DELETE | `/:id` | 🔒 | Delete partner |

### `/api/v1/properties`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | 🔒 | List properties |
| GET | `/:id` | 🔒 | Get property |
| POST | `/` | 🔒 | Create property |
| PUT | `/:id` | 🔒 | Update property |
| PUT | `/:id/config` | 🔒 | Update property config |
| PATCH | `/:id/configuration` | 🔒 | Partial update property config |
| POST | `/:id/deactivate` | 🔒 | Deactivate property |
| DELETE | `/:id` | 🔒 | Delete property |

### `/api/v1/rooms`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | 🔒 | List rooms |
| GET | `/:id` | 🔒 | Get room |
| POST | `/` | 🔒 | Create room |
| POST | `/bulk` | 🔒 | Bulk create rooms |
| PUT | `/:id` | 🔒 | Update room |
| POST | `/:id/template` | 🔒 | Assign template |
| POST | `/bulk-assign-template` | 🔒 | Bulk assign template |
| DELETE | `/:id/template` | 🔒 | Remove template |
| POST | `/:id/deactivate` | 🔒 | Deactivate room |

### `/api/v1/qr-codes`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/` | 🔒 | List QR codes |
| GET | `/:id` | 🔒 | Get QR code |
| POST | `/` | 🔒 | Create QR code |
| POST | `/bulk-generate` | 🔒 | Bulk generate QR codes |
| POST | `/:id/revoke` | 🔒 | Revoke QR code |
| GET | `/validate/:qrCodeId` | 🌐 | Validate QR code (public) |

### `/api/v1/front-office`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/stay-tokens` | 🔒 | List stay tokens |
| POST | `/stay-tokens` | 🔒 | Create stay token |
| POST | `/stay-tokens/bulk` | 🔒 | Bulk create stay tokens |
| POST | `/stay-tokens/:id/revoke` | 🔒 | Revoke stay token |
| GET | `/sessions` | 🔒 | List guest sessions |
| POST | `/sessions` | 🌐 | Create guest session (scan) |
| GET | `/requests` | 🔒 | List requests |
| GET | `/requests/:id` | 🔒 | Get request |
| POST | `/requests` | 🌐 | Submit request (guest) |
| PATCH | `/requests/:id/status` | 🔒 | Update request status |

### `/api/v1/public` — Guest Public Endpoints (No Auth)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/sessions` | 🌐 | Create guest session |
| GET | `/sessions/:id` | 🌐 | Get session details |
| PATCH | `/sessions/:id/font-size` | 🌐 | Update session font size preference |
| GET | `/sessions/:id/validate` | 🌐 | Validate session token |
| GET | `/sessions/:id/menu` | 🌐 | Get service menu for session |
| POST | `/sessions/:id/requests` | 🌐 | Submit service request |
| GET | `/sessions/:id/requests` | 🌐 | List requests for session |
| GET | `/requests/:number` | 🌐 | Get request by reference number |
| PATCH | `/requests/:number/modify` | 🌐 | Modify request notes |
| POST | `/requests/:number/feedback` | 🌐 | Submit feedback for request |
| GET | `/properties/:id/branding` | 🌐 | Get property branding config |
| GET | `/qr/:qrCodeId/status` | 🌐 | Get QR code status |
| POST | `/qr/validate-token` | 🌐 | Validate stay token for restricted QR |

---

## OAuth Endpoints (Framework-managed)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/oauth/login` | Redirect to Manus OAuth login |
| GET | `/api/oauth/callback` | OAuth callback — sets session cookie |
| POST | `/api/oauth/logout` | Clear session cookie |

---

## Server-Sent Events (SSE)

### `/api/sse/front-office` — Real-time Front Office Stream

| Field | Value |
|-------|-------|
| Method | `GET` |
| Auth | 🔒 `requireAuth` |
| Query params | `propertyId` (optional) — scopes events to a single property |
| Content-Type | `text/event-stream` |
| Managed by | `server/_core/index.ts` (SSE manager singleton) |

The client opens a persistent `EventSource` connection. The server pushes named events as JSON payloads.

| Event name | Payload shape | Description |
|------------|---------------|-------------|
| `status_update` | `{ requestId, status, updatedAt }` | Request status changed (confirm, reject, complete, cancel, dispute) |
| `presence:join` | `{ userId, userName, propertyId, entityType, entityId, joinedAt }` | Staff member started viewing an entity (collaboration indicator) |
| `presence:leave` | `{ userId, propertyId, entityType, entityId }` | Staff member stopped viewing an entity |
| `connected` | `{ message: "SSE connected" }` | Sent once on connection establishment |

**Scoping:** When `propertyId` is provided as a query param, `presence:join` and `presence:leave` events are broadcast only to connections with the same `propertyId`. `status_update` events are always broadcast to all connections for the relevant property.

**Guest SSE** (`/api/sse/guest/:requestId`) is a separate lightweight stream used by `TrackRequestPage` to receive live status updates for a single request without requiring admin auth.

### `/api/sse/guest/:requestId` — Guest Request Status Stream

| Field | Value |
|-------|-------|
| Method | `GET` |
| Auth | 🌐 None (public) |
| Path param | `requestId` — the UUID of the service request to track |
| Content-Type | `text/event-stream` |
| Managed by | `server/_core/index.ts` (same SSE manager, separate namespace) |

| Event name | Payload shape | Description |
|------------|---------------|-------------|
| `status_update` | `{ requestId, status, updatedAt }` | Request status changed; triggers UI refresh in `TrackRequestPage` |
| `connected` | `{ message: "SSE connected", requestId }` | Sent once on connection establishment |

**Scoping:** Events are broadcast only to connections subscribed to the specific `requestId`. No admin auth cookie is required — the connection is keyed by the public request UUID.

---

## Notes

- **tRPC vs REST**: New features should use tRPC procedures. The Express REST routes (`/api/v1/*`) are a legacy layer from the FastAPI proxy migration and are kept for compatibility with the guest microsite's `apiClient` (ky-based).
- **Guest microsite**: All guest pages use `apiClient` (ky) calling `/api/v1/public/*` or tRPC via `cmsPublic.*`. No admin auth is required.
- **Route map maintenance**: Update this file whenever a new tRPC procedure or Express route is added. The canonical path convention is documented in `server/routes/index.ts`.
