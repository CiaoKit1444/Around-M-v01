# Peppr Around — Lessons Learned

> *"Every mistake we made was a lesson we earned. This document exists so the next version of this platform does not have to earn the same lessons twice."*

---

## How to Read This Document

This is an honest retrospective. Each lesson is categorised as either a **mistake** (something we did wrong and corrected), a **discovery** (something we learned that was not obvious at the start), or a **principle** (a rule that emerged from repeated experience). The lessons are grouped by domain.

---

## Architecture & Technology

### Mistake: Starting with a Python/FastAPI Backend

The platform was originally built with a FastAPI backend (Python) serving a React frontend. This created a persistent type-safety gap: the frontend TypeScript types had to be manually maintained to match the Python Pydantic models. Every API change required updating two separate type systems. Silent type drift caused runtime errors that were hard to trace.

**What we did:** Migrated to a pure TypeScript stack (tRPC + Express) in Phase 70. The migration took significant effort but eliminated the type gap permanently.

**Lesson:** For a product built by a small team where the same person touches both frontend and backend, a shared-type RPC layer (tRPC, GraphQL with codegen) is not a luxury — it is a prerequisite for sustainable velocity. The cost of the migration was higher than the cost of starting with tRPC would have been.

---

### Mistake: Hardcoded Property IDs in Early Phases

In the early phases (1–23), many components used a hardcoded `propertyId` of `"pr-001"`. This was a shortcut taken during rapid prototyping that became a critical bug when the platform was connected to real data. A full audit was required in Phase 24 to find and replace every hardcoded reference.

**What we did:** Built a `useActiveProperty()` hook that reads the property from the authenticated user context, with a fallback to the first available property for super-admins.

**Lesson:** Never hardcode entity IDs, even in prototype phases. The cost of replacing them later is always higher than the cost of wiring them correctly from the start. If the real value is not available yet, use a clearly-named constant (`DEFAULT_PROPERTY_ID`) that can be found and replaced with a single grep.

---

### Mistake: Storing Demo Data in Component State

In phases 1–25, many pages rendered demo data from hardcoded arrays inside the component file. This created a false sense of completeness — the UI looked finished but was not connected to any real data source. When real data was wired up, the UI often broke because the demo data had different shapes than the real API responses.

**What we did:** Replaced all demo data with real tRPC queries, adding loading and empty states.

**Lesson:** Demo data in component state is technical debt that compounds. A page with a loading skeleton and an empty state is more honest and more useful than a page with hardcoded fake data. Build the real data layer first, even if it means the UI is empty for a while.

---

### Discovery: SSE Is Better Than WebSockets for This Use Case

The real-time requirements of the platform (new requests appearing in the queue, presence indicators on detail pages) were initially assumed to require WebSockets. After evaluating the actual data flow, SSE was chosen instead.

The key insight was that the data flow is **asymmetric**: the server pushes state changes to the client, but the client does not push raw events back to the server. Clients mutate state through tRPC mutations (HTTP), not through the real-time channel. SSE is a perfect fit for this pattern — it is simpler, requires no protocol upgrade, and reconnects automatically.

**Lesson:** Before choosing WebSockets, ask whether the real-time channel is truly bidirectional. If the client only needs to receive server-pushed updates, SSE is simpler and more reliable.

---

### Mistake: Not Setting Up CI from the Beginning

The GitHub CI pipeline (unit tests + integration tests) was set up in Phase 28. Before that, there was no automated gate on code quality. Several regressions were introduced and caught only by manual testing.

**What we did:** Added a `vitest` test suite and a GitHub Actions workflow that runs on every push to `main`.

**Lesson:** CI should be the first thing set up after the project scaffold, not the last. The cost of writing tests is always lower when the code is fresh. Tests written after the fact are always harder to write and less complete.

---

### Mistake: GitHub Repository Secrets Not Configured

The CI pipeline failed on commit `b8aaff5` because `JWT_SECRET` and `SSO_BRIDGE_SECRET` were not set as GitHub repository secrets. The tests passed locally but failed in CI because the environment was not configured.

**Lesson:** When setting up CI, immediately document all required environment variables and add them to the CI environment. Create a `.env.example` file that lists every required variable (without values) so that any new environment (CI, staging, production) can be configured from a checklist.

---

## Data Modelling

### Principle: The Hierarchy Is the Schema

The three-level hierarchy (Partner → Property → Room) is not just a UI concept — it is the load-bearing structure of the entire data model. Every table that stores business data has a `property_id` or `partner_id` foreign key. This was not planned from the start; it emerged from repeated experience of needing to scope data to a property.

**Lesson:** Identify the primary tenancy boundary early and encode it in every table from the beginning. Adding `property_id` to a table that was created without it is a migration that touches every query and every index.

---

### Mistake: Not Separating Request Events from Request State

In early phases, the status of a service request was a single `status` field on the `peppr_service_requests` table. This was simple but made it impossible to answer questions like "how long did this request spend in the Pending state?" or "who confirmed this request and when?"

**What we did:** Added `peppr_request_events` — an immutable append-only table that records every status transition with actor, timestamp, and reason. The `status` field on the request remains for fast querying, but the events table is the source of truth for the audit trail.

**Lesson:** For any entity that has a lifecycle (states it moves through), model the transitions as events from the beginning. The state field is a cache of the latest event. This pattern is the foundation of audit trails, SLA tracking, and analytics.

---

### Discovery: Guest Sessions Are More Powerful Than Guest Accounts

The original design assumed guests would need to create accounts to track their requests. This created friction — guests on a short stay are unwilling to create accounts for a single interaction.

The session model (anonymous session created on QR scan, persisted in localStorage) proved to be both simpler and more powerful. A guest can track all their requests from a single scan without any registration. The session expires with the stay. There is no password to forget and no account to delete.

**Lesson:** For hospitality use cases, anonymous sessions with a clear expiry are preferable to guest accounts. The QR code is the identity. The session is the continuity.

---

## Frontend Development

### Mistake: Building Pages Before Establishing the Layout

In the early phases, individual pages were built before a consistent layout wrapper was established. This led to pages with inconsistent navigation patterns, missing back buttons, and dead-end routes where the user could not return to the previous context.

**What we did:** Established `DashboardLayout` as the standard wrapper for all admin/staff pages. All new pages are built inside this wrapper.

**Lesson:** Define the layout and navigation structure before building any pages. A page without an escape route is a trap. The layout is the skeleton; the pages are the organs. Build the skeleton first.

---

### Mistake: Infinite Query Loops from Unstable References

Several pages suffered from infinite re-fetch loops caused by creating new objects or arrays inside the render function and passing them as query inputs. Each render created a new reference, which tRPC interpreted as a changed input, triggering a new fetch.

```tsx
// ❌ This causes infinite re-fetches
const { data } = trpc.rooms.list.useQuery({ ids: [1, 2, 3] });

// ✅ Stabilise with useMemo
const ids = useMemo(() => [1, 2, 3], []);
const { data } = trpc.rooms.list.useQuery({ ids });
```

**Lesson:** Any object or array passed as a tRPC query input must have a stable reference. Use `useState` for values that are initialised once, and `useMemo` for derived values. This is a React fundamentals issue that is amplified by tRPC's input-change detection.

---

### Discovery: Optimistic Updates Are Essential for List Operations

The initial implementation of list mutations (add item, delete item, toggle status) used `invalidate()` to refresh the list after every mutation. This caused a visible flash — the item would disappear and reappear after the server responded.

Switching to optimistic updates (update the cache immediately, roll back on error) made the UI feel instantaneous. The pattern is more complex to implement but the user experience improvement is significant.

**Lesson:** For list operations, toggles, and profile edits, always use optimistic updates. For critical operations (payments, auth), use `invalidate` with explicit loading states. The distinction is: optimistic for reversible operations, pessimistic for irreversible ones.

---

### Mistake: Not Accounting for the Sidebar in the Setup Hierarchy Page

When the Setup Hierarchy page's partner card grid was redesigned with a 5-column layout, the grid overflowed the viewport because the sidebar was not accounted for in the column width calculation. The fix required changing to a 3-column layout with responsive breakpoints.

**Lesson:** Always design responsive grids in the context of the actual layout (sidebar + content area), not in isolation. The available width for a content area inside a dashboard layout is approximately `viewport - sidebar - padding`, not `viewport`. Design for the real container, not the full screen.

---

## Operations & Security

### Mistake: Deferring Security Until Late in the Project

OWASP security hardening was done in Phases 42–45, after the core product was built. This meant that security controls (rate limiting, JWT revocation, 2FA, security headers) were retrofitted onto an existing system rather than designed in from the start.

**What we did:** Added Helmet.js, Redis-backed rate limiting, JWT blacklisting, 2FA, and a full OWASP audit. The system is now compliant, but the retrofit required touching many files.

**Lesson:** Security is not a phase — it is a constraint. Add security headers, rate limiting, and input validation from the first day. The cost of retrofitting security is always higher than the cost of building it in.

---

### Principle: Redis Is the Right Tool for Ephemeral Security State

JWT revocation, rate limit counters, 2FA tokens, and session blacklists all share a common property: they are ephemeral (they expire), they need to be checked on every request (they must be fast), and they do not need to be durable (losing them on a Redis restart is acceptable). Redis is the correct tool for all of these use cases.

**Lesson:** Do not store ephemeral security state in the primary database. The primary database is for durable business data. Redis is for fast, expiring security state.

---

### Discovery: The Inbox Is a Product, Not a Feature

The notification inbox started as a simple bell icon with a dropdown. Over 8 phases (Phase 30–76), it evolved into a full email-style inbox with envelope rows, a detail pane, archive management, group collapse, property filtering, mute toggle, sound alerts, and batch dismiss.

This evolution revealed that the inbox is not a notification delivery mechanism — it is the primary interface through which staff manage their workload. Every request that needs attention appears in the inbox. The inbox is the front office, not the front office page.

**Lesson:** In an interrupt-driven operational system, the notification inbox is the most important surface. Design it as a first-class product from the beginning, not as a utility feature bolted on later.

---

## Copywriting & Communication

### Principle: Every Status Must Describe the Next Action

Status labels that only name the current state ("Pending", "In Progress") are less useful than labels that describe what happens next ("Awaiting staff confirmation", "Your request is being prepared"). The guest tracking page was rewritten in Phase 78 to follow this principle throughout.

**Lesson:** Write status labels from the user's perspective, not the system's perspective. The user does not care what state the system is in — they care what is going to happen next and what they need to do (if anything).

---

### Mistake: Accumulating Stale Copy Over 78 Phases

As the platform evolved, many labels, tooltips, empty states, and error messages became stale — they referred to features that had been renamed, workflows that had been changed, or concepts that no longer existed. The Phase 78 copywriting audit found over 80 issues across 10 files.

**Lesson:** Copy is code. It needs to be maintained with the same discipline as code. Every time a feature is renamed or a workflow is changed, the copy that describes it must be updated in the same commit. Stale copy is a form of technical debt that erodes user trust.

---

## Summary Table

| Category | Mistake / Discovery / Principle | Impact | Phase Fixed |
|---|---|---|---|
| Architecture | Python/FastAPI backend | High — type drift, maintenance burden | Phase 70 |
| Architecture | Hardcoded property IDs | Critical — production data scoping failure | Phase 24 |
| Architecture | Demo data in component state | Medium — false completeness | Phases 25–30 |
| Architecture | No CI from the start | High — regressions not caught | Phase 28 |
| Data | No request event log | High — no audit trail, no SLA tracking | Phase 15+ |
| Frontend | Pages before layout | Medium — navigation dead-ends | Phase 6 |
| Frontend | Unstable query references | High — infinite re-fetch loops | Multiple |
| Frontend | 5-column grid in sidebar layout | Low — visual overflow | Phase 77c |
| Security | Security deferred to late phases | High — retrofit cost | Phases 42–45 |
| Copy | Stale labels after 78 phases | Medium — user confusion | Phase 78 |
| Discovery | SSE > WebSockets for this pattern | Positive — simpler, more reliable | Phase 19 |
| Discovery | Anonymous sessions > guest accounts | Positive — zero friction for guests | Phase 7 |
| Discovery | Inbox is a first-class product | Positive — core staff workflow surface | Phases 30–76 |

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
