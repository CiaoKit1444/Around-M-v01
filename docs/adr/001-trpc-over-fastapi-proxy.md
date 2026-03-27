# ADR-001: tRPC as the Primary API Layer, with FastAPI Proxy Retained for Guest Microsite

| Field | Value |
|-------|-------|
| **Status** | Accepted |
| **Date** | 2026-03-27 |
| **Deciders** | Peppr Around Engineering |
| **Supersedes** | — |
| **Superseded by** | — |

---

## Context

Peppr Around was originally built on a **Python FastAPI** backend. The admin dashboard and guest microsite both called FastAPI REST endpoints directly, with an Express.js layer acting as a thin reverse proxy (`server/apiProxy.ts`). This architecture created several friction points as the product matured:

The FastAPI service ran as a separate process that the Node.js host had to keep alive, health-check, and route traffic through. Any FastAPI downtime surfaced as opaque 502 errors in the admin UI. Shared types between the frontend and backend required manual synchronisation — a TypeScript interface on the client had to be kept in sync with a Pydantic model on the server by hand, with no compile-time guarantee. Adding a new admin feature meant writing a FastAPI route, a Pydantic schema, an Express proxy rule, a TypeScript type, and a React hook — five touch points for what should be a single concern. The guest microsite's `apiClient` (ky-based) called REST endpoints whose shape was defined only in FastAPI, making refactoring risky.

The team evaluated three options:

| Option | Description | Verdict |
|--------|-------------|---------|
| **A — Keep FastAPI proxy** | Maintain the Express proxy and continue adding FastAPI routes | Rejected — growing operational burden, no type safety |
| **B — Full REST in Express** | Replace FastAPI with Express REST routes, keep ky client | Considered — reduces ops burden but still no end-to-end types |
| **C — tRPC in Express** | Add tRPC procedures directly in Express, migrate admin UI to tRPC hooks | **Accepted** |

---

## Decision

**New admin features are built as tRPC procedures** defined in `server/routers.ts` (and split into sub-files as they grow). The React admin UI calls them via `trpc.*.useQuery / useMutation` hooks generated from the same type definitions. No separate REST contract file, no Axios/ky wrapper, no manual type synchronisation.

The **guest microsite REST layer** (`/api/v1/public/*`, served by Express route handlers in `server/routes/guest.ts`) is retained as-is. The guest pages use a lightweight `apiClient` (ky) that calls these endpoints. This is a deliberate exception: the guest microsite is a public-facing, unauthenticated surface where tRPC's cookie-based auth context is not applicable, and the REST shape is stable enough that the migration cost is not justified at this stage.

The **FastAPI process** is no longer started or health-checked. `server/apiProxy.ts` and `server/index.ts` (the old static-file stub) are archived with deprecation notices. The `[Overseer] ✗ fastapi not healthy` log messages are expected and benign — the overseer still attempts health checks against the now-absent FastAPI service, but these failures have no effect on the running application.

---

## Consequences

### Positive

End-to-end type safety for all admin procedures eliminates an entire class of runtime type mismatch bugs. A new admin feature requires changes in exactly two files: `server/routers.ts` (procedure) and `client/src/pages/Feature.tsx` (UI). The Express server is the single Node.js process — no FastAPI subprocess to manage, no proxy latency, no 502 errors from a dead upstream. Drizzle ORM replaces raw SQL strings with a typed query builder, and `pnpm db:push` handles schema migrations in a single command.

### Negative / Trade-offs

The guest microsite REST layer remains a separate concern. It uses `apiClient` (ky) rather than tRPC hooks, meaning guest-facing procedures are not type-checked end-to-end. This is an accepted trade-off until a future decision is made to migrate the guest microsite to tRPC public procedures (see `cmsPublic` router, which already demonstrates the pattern for the preview endpoint).

The `peppr_users` table and several `peppr_*` tables are migrated from FastAPI's SQLAlchemy models. Some columns retain snake_case naming from the original Python models rather than the camelCase convention used in the newer Drizzle tables (`users`, `pepprPropertyBanners`). This inconsistency is documented in `docs/schema.md` and will be normalised in a future migration.

---

## Implementation Notes

The canonical API surface is documented in `docs/routes.md`. The tRPC router namespace map is in that document's first section. The Drizzle schema is documented in `docs/schema.md`.

When adding a new feature, the decision tree is:

1. **Admin-only, authenticated** → tRPC `protectedProcedure` in `server/routers.ts`
2. **Admin-only, owner-only** → tRPC `adminProcedure` pattern (see README)
3. **Public guest endpoint** → Express route in `server/routes/guest.ts`, mounted under `/api/v1/public`
4. **Public read-only data for preview/sharing** → tRPC `publicProcedure` in `cmsPublic` router

The `cmsPublic` router (`server/cmsRouter.ts`) is the recommended path for new public tRPC procedures, as it demonstrates that tRPC and public access are not mutually exclusive.

---

## Related Decisions

- **ADR-002 (planned):** Guest microsite migration from ky/REST to tRPC public procedures
- **ADR-003 (planned):** Drizzle column naming normalisation (snake_case legacy → camelCase)
