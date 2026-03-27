# ADR-002: Migrate Guest Microsite from ky/REST to tRPC Public Procedures

| Field | Value |
|-------|-------|
| **Status** | Proposed |
| **Date** | 2026-03-27 |
| **Deciders** | Peppr Around Engineering |
| **Supersedes** | — |
| **Superseded by** | — |
| **Related** | ADR-001 (tRPC as primary API layer) |

---

## Context

As documented in ADR-001, the guest microsite was intentionally excluded from the initial tRPC migration. At the time, the guest surface was a thin REST client using `ky` that called eleven Express route handlers in `server/routes/guest.ts`, all mounted under `/api/v1/public/*`. The rationale for the exclusion was that the guest endpoints are unauthenticated, the REST shape was stable, and the migration cost was not justified for the scope of that sprint.

Since then, the guest microsite has grown significantly. It now spans five pages (`ScanLandingPage`, `ServiceMenuPage`, `RequestPage`, `TrackRequestPage`, `GuestHistoryPage`), a shared `useGuestSession` hook, a `GuestFontSizeSwitcher` component, and a `GuestCMSTab` preview feature. The `guestApi` client in `client/src/lib/api/endpoints.ts` exposes seven methods; the `qrPublicApi` exposes two more. A `cmsPublic` tRPC router already exists and serves the `/guest/preview` page via `publicProcedure`, demonstrating that tRPC and unauthenticated access are fully compatible.

The current REST layer has several friction points that motivate migration. The `guestApi` methods return `any`-typed responses because the Express handlers write `res.json(...)` with no shared type contract. Any change to a handler's response shape is invisible to the TypeScript compiler until a runtime error surfaces in the browser. Error handling is inconsistent — some handlers return `{ detail: "..." }`, others previously returned `{ error: "..." }` (normalised in Phase 21, but the risk of regression remains). Adding a new guest endpoint requires changes in four places: the Express handler, the route mount, the `guestApi` client method, and the consuming React component, with no compile-time verification that all four are in sync.

---

## Decision

Guest microsite endpoints will be migrated to **tRPC `publicProcedure`** definitions, grouped under a `guest` namespace in the main `appRouter`. The migration will be incremental — one endpoint group per sprint — to avoid a big-bang rewrite that would block other feature work.

The `cmsPublic` router demonstrates the target pattern: a `publicProcedure` with a Zod input schema, a typed return value inferred from Drizzle, and a React component that calls `trpc.cmsPublic.getPublicPreview.useQuery(...)`. The guest migration will follow the same pattern.

The `ky`-based `guestApi` and `qrPublicApi` clients will be deprecated incrementally as their corresponding tRPC procedures are added, and removed entirely once all eleven REST handlers have been migrated.

---

## Migration Plan

The eleven REST handlers in `server/routes/guest.ts` map to the following proposed tRPC procedures under the `guest` namespace:

| Current REST endpoint | Proposed tRPC procedure | Priority |
|-----------------------|-------------------------|----------|
| `POST /sessions` | `guest.createSession` | High — called on every QR scan |
| `GET /sessions/:id` | `guest.getSession` | High — used by `useGuestSession` hook |
| `PATCH /sessions/:id/font-size` | `guest.updateFontSize` | Medium |
| `GET /sessions/:id/validate` | `guest.validateSession` | High — auth gate for restricted QR |
| `GET /sessions/:id/menu` | `guest.getMenu` | High — service menu data |
| `POST /sessions/:id/requests` | `guest.submitRequest` | High — core guest action |
| `GET /sessions/:id/requests` | `guest.listRequests` | Medium — guest history |
| `GET /requests/:number` | `guest.getRequest` | High — request tracking |
| `GET /properties/:id/branding` | `guest.getBranding` | Medium — already partially covered by `cmsPublic.getPublicPreview` |
| `GET /qr/:qrCodeId/status` | `guest.getQrStatus` | High — first call on scan |
| `POST /qr/validate-token` | `guest.validateToken` | Medium — restricted QR token check |

The `getBranding` procedure will be consolidated with `cmsPublic.getPublicPreview` to avoid duplication — the preview endpoint already returns branding data, so the standalone branding REST handler can be removed after the guest pages are updated to use the preview procedure's response shape.

Each migration step follows this sequence: add the tRPC `publicProcedure` in `server/guestRouter.ts` (new file), update the consuming React component to call `trpc.guest.*.useQuery/useMutation`, write a vitest test for the new procedure, then mark the corresponding REST handler as `@deprecated` in `server/routes/guest.ts`. The REST handler is removed only after the vitest test and a manual smoke test confirm the tRPC procedure is correct.

---

## Consequences

### Positive

End-to-end type safety for all guest interactions eliminates the `any`-typed `guestApi` responses. A change to a session's response shape in `server/guestRouter.ts` will immediately surface as a TypeScript error in every consuming component. The `ky` dependency can be removed from `package.json` once the migration is complete, reducing bundle size. Guest procedures will benefit from tRPC's built-in error handling (`TRPCError`) and Zod input validation, replacing the manual `if (!session) return res.status(404)` pattern scattered across eleven handlers.

### Negative / Trade-offs

The migration introduces a temporary period where both REST and tRPC paths exist for the same data. During this window, a bug fix must be applied in two places. This risk is mitigated by the incremental approach — each endpoint is migrated and the REST handler deprecated atomically within a single sprint, keeping the dual-path window as short as possible.

The guest SSE streams (`/api/sse/front-office` and `/api/sse/guest/:requestId`) are **out of scope** for this ADR. Server-Sent Events are not supported by tRPC's HTTP transport and will remain as Express routes indefinitely.

---

## Implementation Notes

The new `server/guestRouter.ts` file should follow the same structure as `server/cmsRouter.ts`. All procedures use `publicProcedure` from `server/_core/trpc.ts`. Input validation uses Zod schemas defined inline or in `shared/types.ts`. The router is registered in `server/routers.ts` under the `guest` namespace.

The `useGuestSession` hook in `client/src/_core/hooks/` should be updated to call `trpc.guest.getSession.useQuery(...)` rather than `guestApi.getSession(...)` once the `getSession` procedure is available. This is the highest-leverage change because `useGuestSession` is consumed by all five guest pages.

---

## Related Decisions

- **ADR-001:** tRPC as the primary API layer — establishes the pattern this ADR extends to the guest surface
- **ADR-003:** Drizzle column naming normalisation — should be completed before this migration to avoid a second round of type changes in the new guest procedures
