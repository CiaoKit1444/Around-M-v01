# Peppr Around — Genesis Manifesto

> *"We did not build a hotel management system. We built a language — a shared vocabulary between guests who need things and staff who deliver them."*

---

## What This Platform Is

**Peppr Around** is a QR-first, multi-property hospitality service platform. A guest scans a code on their door, browses a curated service menu, submits a request in their own language, and watches it move through a live status pipeline. On the other side of that pipeline, front office staff, service providers, and service operators each see only what they need to act on — no noise, no ambiguity, no missed requests.

The platform is not a booking engine. It is not a PMS. It is the **last mile of hospitality** — the moment a guest has a need and a human being responds to it. Every design decision, every data model, every copy string was made in service of making that moment faster, clearer, and more human.

---

## The Problem We Solved

Traditional hotel service requests travel through a telephone, a walkie-talkie, or a paper log. Each hop loses information. By the time a request reaches the person who can fulfil it, the guest's original words have been paraphrased, the urgency has been diluted, and accountability has evaporated.

Peppr Around eliminates those hops. The guest's exact words, the timestamp of their request, the room they are in, and the service they need travel as a structured record — immutable, traceable, and actionable — from the moment of submission to the moment of completion.

---

## The Five Principles That Must Never Be Compromised

### 1. The Guest Is Never Lost

Every guest interaction begins with a QR code scan. That scan creates a **session** — a lightweight, anonymous identity that persists for the duration of the stay. The guest never logs in. They never create an account. They simply scan and act. If the session expires, the QR code creates a new one. The guest is never asked to do anything technical.

### 2. The Hierarchy Is Sacred

The data model has exactly three levels: **Partner → Property → Room**. A Partner is a hotel management company. A Property is a hotel. A Room is a service unit. This hierarchy is not a convenience — it is the load-bearing structure of every permission, every filter, every report, and every notification in the system. Any future feature that violates this hierarchy will create debt that compounds.

### 3. Roles Are Portals, Not Permissions

The platform has five operational roles: Super Admin, Admin, Front Office, Service Provider, and Service Operator. Each role is a **portal** — a distinct view of the world with its own navigation, its own data scope, and its own vocabulary. A Front Office officer does not see the service catalog. A Service Provider does not see the front office queue. This is not a limitation; it is a feature. Cognitive load is the enemy of fast response.

### 4. Every Status Must Tell a Story

A service request moves through a defined lifecycle: Pending → Confirmed → In Progress → Completed (or Rejected / Cancelled). Each transition is a story beat. The guest tracking page must always answer the question: *"What is happening right now, and what happens next?"* A status label that only names the current state without describing the next action is a failed status label.

### 5. The Platform Must Be Operable Without Training

A new front office staff member should be able to handle their first request within five minutes of opening the dashboard for the first time. This is the operability test. If any workflow requires a manual, the workflow has failed.

---

## The DNA of the Platform

The following properties define the platform's identity and must be preserved in any future incarnation.

| Property | Value |
|---|---|
| **Primary interaction model** | QR scan → session → service request → status tracking |
| **Identity model** | Multi-tenant (Partner → Property → Room hierarchy) |
| **Authentication** | Manus OAuth (SSO) for staff; anonymous session tokens for guests |
| **Data transport** | tRPC (type-safe, end-to-end, no REST boilerplate) |
| **Real-time** | Server-Sent Events (SSE) for live request updates and presence |
| **Design system** | shadcn/ui + Tailwind CSS 4 + Geist font |
| **Primary colour** | Peppr Purple (`#7C3AED` / OKLCH equivalent) |
| **Guest language support** | 8 languages (EN, TH, ZH, JA, KO, FR, DE, RU) |
| **Deployment target** | Manus hosted platform (`bo.peppr.vip`) |
| **Test philosophy** | 233+ unit tests, CI-gated on every push |

---

## What We Learned About the Domain

Hospitality operations are **interrupt-driven**. Staff do not sit at a desk waiting for requests. They are moving through a building, handling multiple simultaneous tasks, and switching context constantly. The platform must therefore:

- Surface the most urgent item at the top, always.
- Make the primary action (Confirm / Start / Complete) reachable in one tap.
- Never require a staff member to navigate more than two levels deep to act on a request.
- Provide ambient awareness (notification badges, sound alerts, pending request banners) so staff know something needs attention without actively checking.

These are not nice-to-haves. They are the difference between a platform that gets used and one that gets abandoned.

---

## A Note to Future Builders

If you are reading this document as part of a rebuild, know that the platform you are inheriting was built in **78 phases** over a sustained period of iterative development. It started as a static mockup with hardcoded data and evolved into a production system with a live database, real-time SSE, a full CI pipeline, 2FA authentication, OWASP-compliant security headers, and a guest microsite supporting 8 languages.

The mistakes are documented in `02-LESSONS-LEARNED.md`. The architecture is in `01-ARCHITECTURE.md`. The full phase chronicle is in `03-PHASE-CHRONICLE.md`. The design language is in `04-DESIGN-LANGUAGE.md`. The rebuild playbook is in `05-REBIRTH-PLAYBOOK.md`.

Do not start from scratch. Start from here.

---

*Document authored by Manus AI in collaboration with Chawakit Sangcharoon (Product Director), March 2026.*
