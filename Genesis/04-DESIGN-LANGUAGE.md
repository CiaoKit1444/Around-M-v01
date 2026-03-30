# Peppr Around — Design Language

> *"Design is not decoration. It is the system through which users understand what they can do, what is happening, and what they should do next."*

---

## Philosophy

The Peppr Around design language is built on a single premise: **operational clarity over aesthetic novelty**. The platform is used by hotel staff under time pressure, in noisy environments, on screens of varying quality. Every design decision must pass the question: *"Does this help a staff member act faster and with more confidence?"*

This does not mean the platform is plain. It means that visual richness is earned — it must serve a functional purpose. Colour communicates status. Weight communicates hierarchy. Spacing communicates grouping. Animation communicates state change. Nothing is decorative.

---

## Visual Identity

### Colour System

The platform uses a **dark-first** design with a purple accent. The dark background reduces eye strain during long shifts. The purple accent is distinctive and memorable — it is the Peppr brand colour.

| Token | Value | Usage |
|---|---|---|
| `--background` | `#0F0F11` (near-black) | Page background |
| `--card` | `#1A1A1F` | Card and panel surfaces |
| `--border` | `#2A2A35` | Subtle dividers |
| `--foreground` | `#F0F0F5` | Primary text |
| `--muted-foreground` | `#8A8A9A` | Secondary text, labels |
| `--primary` | `#7C3AED` (Peppr Purple) | Primary actions, active states |
| `--primary-foreground` | `#FFFFFF` | Text on primary backgrounds |
| `--accent` | `#9D5CF5` | Hover states, highlights |
| `--destructive` | `#EF4444` | Delete, revoke, reject actions |
| `--success` | `#22C55E` | Completed, active, confirmed states |
| `--warning` | `#F59E0B` | Pending, attention required |
| `--info` | `#3B82F6` | Informational, in-progress |

**Status colour mapping** — this is the most critical part of the colour system. Every status in the request lifecycle has a consistent colour:

| Status | Colour | Rationale |
|---|---|---|
| Pending | Amber (`--warning`) | Requires attention — warm, urgent |
| Confirmed | Blue (`--info`) | Acknowledged — calm, in motion |
| In Progress | Purple (`--primary`) | Active — brand colour, energy |
| Completed | Green (`--success`) | Done — positive, resolved |
| Rejected | Red (`--destructive`) | Terminal negative state |
| Cancelled | Grey (`--muted`) | Terminal neutral state |

### Typography

The platform uses **Geist** (by Vercel) as the primary typeface. Geist is a geometric sans-serif designed for screen readability at small sizes — essential for dense data tables and card grids.

| Scale | Size | Weight | Usage |
|---|---|---|---|
| `text-xs` | 12px | 400 | Timestamps, metadata, badges |
| `text-sm` | 14px | 400 | Body text, table cells, form labels |
| `text-base` | 16px | 400 | Default body text |
| `text-lg` | 18px | 600 | Section headers, card titles |
| `text-xl` | 20px | 700 | Page titles |
| `text-2xl` | 24px | 700 | Dashboard metric numbers |

### Spacing

The platform uses an **8px base grid**. All spacing values are multiples of 8px (or 4px for fine adjustments). This creates visual rhythm and prevents the "random spacing" problem where every component has slightly different padding.

---

## Component Patterns

### The Card

Cards are the primary container for entity data (partners, properties, rooms, requests). A well-formed card has:
- A **header** with the entity name (bold, truncated at 1 line) and a status badge
- A **body** with 2–4 key metadata fields (icon + label pairs)
- A **footer** with action buttons (Edit, View, Delete)
- A **selected state** with a solid purple fill and white text (not just a border change)

The selected state deserves special attention. In the Setup Hierarchy, selecting a partner highlights all its properties. The selected card must be visually unmistakable — a border change is not enough. The card background must change.

### The PageHeader

Every page has a `PageHeader` component at the top with:
- A **title** (the page name, not a generic label)
- A **subtitle** (one sentence describing what this page is for)
- **Action buttons** on the right (primary action first, secondary actions after)
- An optional **breadcrumb** for pages that are nested within a hierarchy

The subtitle is not optional. It is the first thing a new staff member reads. It must answer the question: *"What do I do on this page?"*

### The EmptyState

Every list or grid has an empty state. A well-formed empty state has:
- An **icon** (relevant to the entity type)
- A **title** (what is missing, e.g. "No partners yet")
- A **description** (why it is empty and what to do, e.g. "Add your first partner to start setting up properties and rooms")
- A **call-to-action button** (the primary action that creates the first item)

An empty state without a call-to-action is a dead end. The user must always know what to do next.

### The HierarchyToolbar

The `HierarchyToolbar` component is used on all three hierarchy management pages. It has three elements in a single row:
- A **search input** (debounced 300ms, with recent searches dropdown on focus)
- A **Sort By selector** (ID / Name / Last Update)
- An **Asc/Desc toggle button** (arrow icon, toggles direction)

The toolbar is always visible — it does not collapse or hide. Staff should be able to filter and sort without scrolling.

### The Inbox EnvelopeRow

The inbox uses an email-style envelope row pattern. Each row has:
- An **avatar** (property initial letter, coloured by property)
- A **subject line** (bold if unread, normal weight if read)
- A **preview snippet** (first 60 characters of the notification body, muted text)
- A **timestamp** (relative time, e.g. "3m ago")
- An **unread dot** (small purple circle, visible only if unread)

Clicking a row slides in a `DetailPane` from the right. The detail pane has the full message body, a metadata strip (property, room, request number, timestamp), and action buttons.

---

## Layout Principles

### The Dashboard Layout

All admin and staff pages use `DashboardLayout` — a persistent sidebar on the left and a scrollable content area on the right. The sidebar contains:
- The Peppr logo at the top
- Navigation groups (Overview, Operations, Service Management, etc.)
- The current user's name and role at the bottom
- A sign-out button

The content area has a `PageHeader` at the top and the page content below. There is no secondary navigation inside the content area — all navigation is in the sidebar.

### The Responsive Grid

Card grids use a responsive column system:

| Viewport | Columns | Cards per page |
|---|---|---|
| < 600px (mobile) | 1 | 6 |
| 600–900px (tablet) | 2 | 6 |
| 900px+ (desktop) | 3 | 6 |

The page size of 6 (3 × 2) is the canonical desktop layout. On mobile, 6 cards in a single column is a long scroll — consider reducing to 4 on mobile in a future iteration.

### The Guest Microsite

The guest microsite uses a **mobile-first, single-column layout** with a fixed header (property name + logo) and a fixed footer (cart summary). The content area scrolls. The design is intentionally simpler than the admin back-office — guests are on mobile, in a hurry, and unfamiliar with the platform.

---

## Interaction Principles

### Feedback Is Mandatory

Every user action must produce immediate feedback. The three feedback types are:
- **Optimistic update** — the UI changes immediately, before the server responds (for reversible operations)
- **Loading state** — a spinner or skeleton appears while the server is processing (for irreversible operations)
- **Toast notification** — a brief message confirms success or explains failure (for all mutations)

An action without feedback is an action that the user will repeat, assuming it did not work.

### Destructive Actions Require Confirmation

Any action that deletes, revokes, or permanently changes data must be confirmed in a dialog. The dialog must:
- Name the specific item being affected (not just "this item")
- Describe the consequence (not just "are you sure?")
- Have a clearly destructive primary button (red, labelled with the action verb, e.g. "Revoke QR Code")
- Have a clearly safe secondary button ("Cancel")

### Progressive Disclosure

Complex workflows are broken into steps. The user sees only what they need to act on at each step. The Setup Hierarchy is the canonical example: the user selects a partner, then sees that partner's properties, then selects a property, then sees that property's rooms. The full hierarchy is always visible in the breadcrumb, but the user acts on one level at a time.

---

## Copy Principles

### Verb-First Action Labels

All action buttons use verb-first imperative phrasing. The verb names the action, not the object.

| Avoid | Use instead |
|---|---|
| "QR Code" (button) | "Generate QR Code" |
| "Partner" (button) | "Add Partner" |
| "Submit" (generic) | "Submit Service Request" |
| "OK" | "Confirm" or the specific action |

### Status Labels Describe What Happens Next

Status labels must answer: *"What is happening right now, and what happens next?"*

| Avoid | Use instead |
|---|---|
| "Pending" | "Awaiting staff confirmation" |
| "In Progress" | "Your request is being prepared" |
| "Completed" | "Your request has been fulfilled" |

### Empty States Are Invitations

Empty state messages must invite the user to take action, not just report the absence of data.

| Avoid | Use instead |
|---|---|
| "No partners found" | "No partners yet — add your first partner to start setting up properties and rooms" |
| "No requests" | "All clear — no pending requests at this property" |

---

## Accessibility Baseline

The platform targets **WCAG 2.1 AA** compliance. The minimum requirements are:
- Colour contrast ratio ≥ 4.5:1 for body text, ≥ 3:1 for large text
- All interactive elements reachable by keyboard (Tab, Enter, Space, Escape)
- Visible focus rings on all focusable elements
- All images have `alt` text
- Form inputs have associated `label` elements

The dark theme with Peppr Purple accent was tested for contrast compliance. The amber warning colour (`#F59E0B`) on a dark background passes AA at body text sizes.

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
