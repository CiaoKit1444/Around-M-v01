# Peppr Around — Future Roadmap

> *"These are the features we knew we wanted, the ideas we validated, and the improvements we discovered — but did not build in v1. This is where v2 begins."*

---

## How to Read This Document

Every item in this roadmap was either explicitly requested, identified during a usability review, or discovered as a natural extension of an existing feature. Items are grouped by domain and prioritised within each group using a **P1 / P2 / P3** scale:

- **P1 — High impact, low complexity.** Build these in the first sprint of v2. They are quick wins that significantly improve the experience.
- **P2 — High impact, medium complexity.** Build these in the second or third sprint. They require design and backend work but are well-understood.
- **P3 — Strategic.** These are larger investments that require product validation before committing engineering time.

---

## Domain 1: Setup Hierarchy

### P1 — URL-Persisted Filter State

**What:** Encode the current search query, page number, sort field, and sort direction into the URL as query parameters (e.g. `?search=grand&page=2&sort=name&order=asc`).

**Why:** Staff frequently need to return to a specific filtered view after navigating away — for example, after editing a partner and returning to the list. Without URL persistence, the filter state is lost and the user must re-enter it. This is a high-friction pattern that occurs dozens of times per shift.

**How:** Use `wouter`'s `useSearch()` hook to read and write query params. Debounce writes to avoid polluting the browser history on every keystroke. The `HierarchyToolbar` component already has all the state — it just needs to be synchronised with the URL.

---

### P1 — Active Filter Chips

**What:** Show dismissible chips below the `HierarchyToolbar` when a non-default filter is active (e.g. `Search: grand`, `Sort: Name ↑`). Each chip has an × button that clears that specific filter.

**Why:** Staff cannot always tell at a glance whether the list they are looking at is filtered. A chip row makes the active filters explicit and provides a one-click way to clear them without scrolling back to the toolbar.

**How:** Read the current filter state from the `HierarchyToolbar` props and render a chip row below the toolbar when any filter is non-default. The chip row is zero-height when no filters are active.

---

### P2 — Inline Quick-Edit Popover

**What:** Add a small popover on the Edit icon of each card that lets staff update the most common fields without navigating to the full edit page. For partners: status, contact person. For properties: city, country. For rooms: template assignment, status.

**Why:** The most common edit operation is a single-field change (e.g. changing a room's template, updating a partner's status). Navigating to the full edit page for a single-field change is a high-friction pattern. The popover reduces this to two clicks.

**How:** Use a `Popover` from `@radix-ui/react-popover` triggered by the Edit icon. The popover contains a minimal form with only the most commonly edited fields. On save, it calls the existing `crud.*.update` tRPC mutation and closes.

---

### P2 — Responsive Grid Breakpoints for Service Areas

**What:** Apply the same `xs/sm/md` responsive column breakpoints to the Service Areas (Properties) section within the Setup Hierarchy page. Currently it uses `auto-fill minmax(220px, 1fr)` which produces inconsistent column counts across screen sizes.

**Why:** The partner grid and the service areas grid are visually inconsistent on the same page. The partner grid uses the 3-column responsive system; the service areas grid uses a different layout algorithm.

---

## Domain 2: Search & Discovery

### P1 — Search Result Highlighting in the Spotlight

**What:** The global Spotlight (⌘K) already highlights tokens in the section-level search results. Extend the same `HighlightText` component to the Spotlight result rows so that matched tokens are highlighted in the name and subtitle of each result.

**Why:** When a search matches a secondary field (e.g. a partner's email rather than its name), the user cannot tell why the result appeared. Highlighting the matched text in the result row makes the relevance immediately visible.

---

### P1 — Global Search Result Count Badges

**What:** Show a small count chip next to each group header in the Spotlight (e.g. "Partners 3 / 4") indicating how many results were returned and how many total exist. If the total exceeds the displayed count, add a "See all →" link that navigates to the full page with the search pre-filled.

**Why:** Staff need to know whether the Spotlight is showing all matching results or just a sample. Without a count, a user who sees 4 partner results does not know if there are 4 or 40.

---

### P2 — Recent Searches Across Entities

**What:** Extend the recent searches feature from per-entity (each hierarchy page has its own history) to cross-entity (the Spotlight maintains a unified recent searches history that includes results from all entity types).

**Why:** Staff often search for the same term across multiple entity types (e.g. "Grand" to find all Grand-branded partners, properties, and rooms). A unified recent searches history in the Spotlight reduces repetitive typing.

---

### P2 — Keyboard Shortcut `/` to Focus Section Search

**What:** When focus is inside the Setup Hierarchy page, pressing `/` should jump the cursor directly into the currently active section's search input (partner search if the partner section is active, property search if a partner is selected, etc.).

**Why:** Power users — particularly property managers who manage large portfolios — navigate the hierarchy dozens of times per shift. The `/` shortcut is a widely recognised convention (GitHub, Linear, Notion) that eliminates the need to reach for the mouse.

---

## Domain 3: Front Office Operations

### P1 — Browser Push Notifications

**What:** When the browser tab is backgrounded or minimised, fall back to the Web Push API to deliver a system-level notification for new high-priority requests. The notification includes the property name, room number, and request type. Clicking it brings the tab to the foreground and opens the request detail.

**Why:** Front office staff frequently have the dashboard open in a background tab while working in another application. The in-app sound alert and inbox badge are not visible when the tab is backgrounded. Browser push notifications ensure that no high-priority request is missed.

**How:** Use the `Notification` Web API with `ServiceWorker` registration. Request permission on first login. Store the push subscription in the database against the user record. The server sends a push when a new request is created with `priority: high`.

---

### P1 — Notification Labels / Priority Tags

**What:** Let staff tag any inbox notification with a coloured label (e.g. Urgent, Follow-up, Done, VIP) directly from the detail pane. Add a label filter chip row above the inbox list so staff can filter to only labelled notifications.

**Why:** In a busy property with 50+ active requests, staff need a way to mark notifications for follow-up without dismissing them. Labels provide a lightweight triage system without requiring a full task management feature.

---

### P2 — SLA Escalation Alerts

**What:** When a request's SLA deadline is within 10 minutes and it has not been confirmed, automatically escalate it: change the inbox row background to amber, play a distinct sound alert, and send a push notification to all front office staff at the property.

**Why:** SLA breaches are the most operationally damaging outcome for a hotel's service reputation. Passive indicators (a red badge) are not sufficient when a shift is busy. Active escalation ensures that no SLA breach goes unnoticed.

---

### P2 — Shift Handoff Summary Email

**What:** At the end of each shift (configurable time per property), automatically generate a shift summary email and send it to the outgoing shift manager. The email includes: total requests handled, average response time, SLA compliance rate, open requests being handed over, and any notes added during the shift.

**Why:** The shift handoff page already exists in the UI. Automating the summary email removes the manual step of exporting and sending the report, and ensures continuity between shifts even when the handoff is rushed.

---

## Domain 4: Guest Experience

### P1 — Guest Feedback After Completion

**What:** After a request is marked Completed, the guest receives a push notification (or sees a prompt on the tracking page) asking for a 1–5 star rating and an optional comment. The rating is stored against the request and surfaced in the analytics dashboard.

**Why:** Guest satisfaction data is the most valuable operational metric for a hotel. Currently the platform has no feedback loop — staff complete requests but never know if the guest was satisfied. A lightweight post-completion rating takes less than 10 seconds for the guest and provides actionable data for property managers.

---

### P1 — Guest Request Amendment

**What:** Allow guests to amend a submitted request (change quantity, add a note, change preferred time) up until the point it is confirmed by staff. After confirmation, amendments are locked and the guest must contact the front office.

**Why:** Guests frequently realise they made a mistake immediately after submitting a request. Currently they have no way to correct it without calling the front office. Self-service amendment reduces front office interruptions and improves guest satisfaction.

---

### P2 — Repeat Order (Order Again)

**What:** On the guest tracking page and order history, add an "Order Again" button that pre-fills the cart with the same items from a previous request. The guest can adjust quantities before submitting.

**Why:** Repeat orders are common in hospitality (same breakfast order every morning, same towel request). Pre-filling the cart from a previous order reduces the number of taps required from 8–10 to 2–3.

---

### P3 — Native Mobile App (PWA)

**What:** Package the guest microsite as a Progressive Web App (PWA) with an `Add to Home Screen` prompt. The PWA provides a native-app-like experience: full-screen mode, offline capability for the service menu (cached on first load), and push notifications without requiring a browser tab.

**Why:** A PWA eliminates the app store barrier while providing a significantly better experience than a browser tab. For guests who stay more than one night, the home screen icon is a persistent reminder of the service.

---

## Domain 5: Administration & Security

### P2 — Admin Audit Log UI

**What:** Build a dedicated Audit Log page in the admin back-office that surfaces the `peppr_request_events` table in a searchable, filterable timeline. Staff can filter by actor, event type, property, and date range. Each event shows the actor, timestamp, previous state, new state, and reason.

**Why:** The audit log data already exists in the database (added in Phase 15). It is currently only accessible via direct database queries. A UI surface makes it accessible to property managers for compliance and dispute resolution without requiring database access.

---

### P2 — Role-Based Access Control Expansion

**What:** Expand the current two-role system (admin / user) to a four-role system: Super Admin (full platform access), Property Manager (full access to their assigned properties), Front Office Staff (request management only), and Read-Only (analytics and reports only).

**Why:** The current system grants all authenticated users the same level of access within their property. In practice, front office staff should not be able to modify service templates or QR codes. Property managers should not be able to modify other properties' settings. The role expansion enforces the principle of least privilege.

---

### P3 — Multi-Tenant White-Label

**What:** Allow the platform to be deployed as a white-label product for hotel management companies. Each hotel management company gets its own subdomain, logo, colour scheme, and isolated data partition. The super-admin console allows creating and managing tenants.

**Why:** The three-level hierarchy (Partner → Property → Room) already maps naturally to a multi-tenant model: a hotel management company is a tenant, its brands are partners, its hotels are properties, and its rooms are rooms. The data isolation is already enforced by `property_id` foreign keys. The white-label layer is primarily a branding and routing concern.

---

## Domain 6: Analytics & Reporting

### P2 — Exportable Reports (CSV / PDF)

**What:** Add export buttons to the analytics dashboard that generate a CSV or PDF report for the currently displayed date range and property filter. The PDF report uses the property's branding (logo, colours).

**Why:** Property managers are required to submit operational reports to hotel owners and management companies. Currently they must screenshot the dashboard or manually copy data. A one-click export reduces this to a single action.

---

### P2 — Cohort Analysis: Guest Return Rate

**What:** Track whether guests who used the service request system return for a second stay (identified by phone number or email). Show a "Guest Return Rate" metric on the analytics dashboard.

**Why:** The ultimate measure of the platform's value to a hotel is whether it improves guest retention. A guest who had a seamless service experience is more likely to return. This metric connects the operational data to the business outcome.

---

### P3 — Predictive Demand Forecasting

**What:** Use historical request data to predict demand for each service category by day of week, time of day, and season. Surface predictions as a "Demand Forecast" widget on the front office dashboard so staff can prepare for busy periods.

**Why:** Hotels with predictable demand patterns (business hotels with Monday–Thursday peaks, resort hotels with weekend peaks) can significantly improve service quality by staffing proactively rather than reactively.

---

## Prioritisation Summary

| Priority | Count | Estimated effort |
|---|---|---|
| P1 (Quick wins) | 8 items | 1–2 days each |
| P2 (Medium investment) | 10 items | 3–5 days each |
| P3 (Strategic) | 4 items | 2–4 weeks each |

**Recommended v2 Sprint 1 (P1 items only):**

1. URL-persisted filter state in HierarchyToolbar
2. Active filter chips below the toolbar
3. Search result highlighting in the Spotlight
4. Global search result count badges
5. Browser push notifications for high-priority requests
6. Notification labels / priority tags
7. Guest feedback after completion
8. Guest request amendment

These 8 items can be delivered in approximately 10 working days and will produce a measurable improvement in staff efficiency and guest satisfaction.

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
