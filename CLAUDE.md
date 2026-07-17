# CLAUDE.md — Samahuzai Carwash and Auto Detailing

> This file provides context, conventions, and instructions for AI coding agents working on this project. Read this before making any changes.

---

## Project Overview

**Samahuzai Carwash and Auto Detailing** is a premium auto detailing shop web application built with **Next.js 14 + Supabase + Tailwind CSS**. It features:

- Public-facing site with service catalog, VIP membership sign-up, and booking unavailable notice
- Admin dashboard for managing bookings, members, services, schedule, detailers, and shop settings
- Supabase PostgreSQL backend with Row Level Security and stored procedure RPCs
- Supabase Auth for admin authentication
- Resend SDK for transactional email (booking received, admin confirmation)
- Real-time shop monitor display via Supabase Realtime

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS (utility-first) + custom CSS vars |
| State | React Context API (`AppContext`) |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Email | Resend SDK (`resend` npm package) |
| Fonts | Google Fonts — Cormorant Garamond + DM Sans |
| Icons | Lucide React |
| Deployment | Vercel |

> ⚠️ No external UI libraries (no shadcn, MUI, Chakra, Radix). Tailwind + custom CSS only.

---

## Project Structure

```
/app                          # Next.js App Router pages
├── page.jsx                  # Landing page
├── services/page.jsx         # Public services catalog
├── booking/page.jsx          # Booking flow (admin-only; public sees unavailable notice)
├── membership/page.jsx       # VIP membership sign-up
├── confirmation/[bookingId]/ # Booking confirmation receipt
├── not-found.jsx             # 404 fallback page
├── layout.jsx                # Root layout (Providers, Toast, Navbar, Footer)
├── admin/
│   ├── login/page.jsx        # Supabase Auth login
│   ├── dashboard/page.jsx    # Stats, pending approvals, today's schedule
│   ├── bookings/page.jsx     # Booking table — filters, status, detailer assignment, CSV export
│   ├── schedule/page.jsx     # Weekly calendar grid (confirmed bookings only)
│   ├── monitor/page.jsx      # Shop Monitor — TV/tablet live view with Realtime
│   ├── members/page.jsx      # VIP member approval, car management
│   ├── cars/page.jsx         # Shared car catalog CRUD
│   ├── services/page.jsx     # Service package CRUD + drag reorder
│   ├── categories/page.jsx   # Service category CRUD (slug, color)
│   ├── coffees/page.jsx      # Coffee menu CRUD + availability toggle
│   ├── pos/page.jsx          # Barista Coffee POS — free-form coffee cart; tendering an order deducts ingredient stock (admin + super-admin)
│   ├── inventory/page.jsx    # Coffee ingredient inventory — items CRUD, restock/adjust, per-coffee recipes, movement log (super-admin only)
│   ├── detailers/page.jsx    # Detailer roster CRUD + drag reorder
│   └── settings/page.jsx     # Detailer pool size + default per booking
└── api/
    └── send-email/route.js   # Resend API route (server-side)

/src
├── components/
│   ├── AdminLayout.jsx       # Sidebar nav + header for all admin pages
│   ├── Navbar.jsx            # Public site top nav
│   ├── Footer.jsx            # Public site footer
│   ├── Toast.jsx             # Toast notification system
│   ├── ProtectedRoute.jsx    # Admin auth guard (redirects to login if no session)
│   └── Providers.jsx         # Wraps AppProvider + ToastProvider
├── context/
│   └── AppContext.jsx        # Global state — all DB fetches and mutations
├── data/
│   ├── services.js           # Static fallback service definitions + formatCurrency
│   └── timeSlots.js          # Time slot array (30-min increments) + SLOT_MINUTES
├── utils/
│   └── bookingUtils.js       # Slot logic, ID generation, date helpers
└── lib/
    ├── supabase.js           # Supabase client + fromRow/toRow camelCase helpers
    ├── sendEmail.js          # Client-side sendEmail() wrapper
    └── emailTemplates.js     # HTML email templates (bookingReceivedHtml, bookingConfirmationHtml)

/supabase
├── schema.sql                # Full DB schema — safe to re-run
└── migrations.sql            # Incremental migrations for existing DBs
```

---

## Design System

### CSS Variables (defined in `app/globals.css` or `index.css`)

```css
--color-obsidian: #0A0A0B      /* Primary background */
--color-surface: #141416       /* Card/panel background */
--color-surface-2: #1C1C1F     /* Elevated surfaces */
--color-gold: #C9A84C          /* Primary accent */
--color-gold-light: #E8C96A    /* Hover gold */
--color-cream: #F5F0E8         /* Primary text on dark */
--color-muted: #6B6B72         /* Secondary/muted text */
--color-success: #4CAF7D       /* Success states */
--color-danger: #E05252        /* Error/cancel states */
```

### Typography

- **Headings**: `Cormorant Garamond` — elegant, editorial serif (`font-serif` Tailwind class)
- **Body**: `DM Sans` — clean, modern, readable (default)
- Never use Inter, Roboto, Arial, or system-ui as primary fonts

### Key CSS Classes

| Class | Description |
|---|---|
| `.gold-shimmer` | Animated gold shimmer effect for hero headline |
| `.card-hover` | Subtle upward translate + gold glow on hover |
| `.glass-card` | Frosted glass surface effect |
| `.booking-step-indicator` | Gold connecting line between step numbers |
| `.admin-input` | Scoped via `<style jsx>` in admin forms |

---

## Database Schema

### Tables

| Table | Purpose |
|---|---|
| `bookings` | All customer appointments |
| `booking_day_slots` | Cross-date occupancy: one row per (booking, date, slot) a job touches — authoritative for capacity/conflict across days (long & multi-day sequential fill) |
| `members` | VIP membership applications |
| `services` | Service packages (admin-managed, DB-driven) |
| `service_categories` | Category definitions (name, slug, color) |
| `cars` | Shared vehicle catalog |
| `member_cars` | Junction: member ↔ car ownership |
| `coffees` | Coffee menu items |
| `detailers` | Shop detailer roster |
| `blocked_slots` | Admin-blocked time slots |
| `settings` | Singleton row: pool size, default detailers per booking, closing time (`closing_minutes`, minutes since midnight) |
| `inventory_items` | Coffee ingredient catalog + live stock (brand, uom, unit cost, stock_qty, low_stock_at) |
| `coffee_recipes` | Bill of materials: coffee ↔ ingredient + qty_per_serve |
| `inventory_transactions` | Signed stock movement log (restock / adjustment / consumption / initial) |
| `pos_orders` | Barista POS coffee orders (member snapshot, item_count, est. total_cost, served_by) |
| `pos_order_items` | Line items on a POS order: coffee_id + coffee_name + qty |

### Stored Procedures (RPCs)

| RPC | Purpose |
|---|---|
| `add_booking(p, p_occupies_slots, p_day_slots?)` | Atomic capacity-aware booking insert. `p_day_slots` is the cross-date plan `[{date, slots[]}]` — capacity/conflict are checked across every (date, slot) it touches, and the span is recorded in `booking_day_slots`. `p_occupies_slots` stays the day-1 list for the legacy column; null `p_day_slots` falls back to a single day. Persists `p->>'detailers_count'` (clamped to free capacity, floored at `min_detailers`) as the heads reserved. |
| `update_booking_detailers(p_id, p_detailer_ids, p_min_detailers)` | Safely reassign detailers on a booking. Capacity + per-detailer conflict are checked across the booking's **full `booking_day_slots` span** (same as `add_booking`), not just day 1. Keeps `detailers_count` in step with the named list |
| `update_settings(p_pool_size, p_default_per_booking, p_closing_minutes?)` | Validates and updates settings singleton (`p_closing_minutes` null = leave closing time unchanged) |
| `adjust_inventory_item(p_item_id, p_qty_change, p_reason, p_note)` | Signed stock delta (restock/adjustment) + logs a transaction (super-admin) |
| `consume_coffee_serve(p_booking_id, p_coffee_name)` | Legacy per-booking coffee deduction (idempotent via `bookings.coffee_served_at`). **No longer auto-called** — kept for reference; serving now happens in the POS. |
| `tender_pos_order(p_member_id, p_member_name, p_note, p_lines)` | Records a POS coffee order + deducts each coffee's recipe × qty from stock, logging a `consumption` movement per ingredient (super_admin + admin/barista via SECURITY DEFINER). Allows negative stock (flagged, not blocked). |

> `add_booking` uses `pg_advisory_xact_lock` to prevent race conditions when two customers book the same slot simultaneously.

> **Inventory deduction happens in the POS** (Phase 9): coffee stock is consumed when the barista tenders a `pos_order` via `tender_pos_order`, which deducts each drink's recipe × qty and logs a `consumption` movement per ingredient. Negative stock is allowed but flagged, never blocked. The old hook where `update_booking_status` called `consume_coffee_serve` on `completed` has been **removed** — marking a booking completed no longer touches inventory. Migrations: Phase 8 (inventory tables) + Phase 9 (POS) in `migrations.sql`.

### Booking Object Shape (camelCase in JS)

```js
{
  id: "OBS-20240315-4821",
  serviceId: 2,
  serviceName: "The Executive",
  servicePrice: 3500,
  serviceDuration: "4–5 hrs",
  serviceCategory: "full",         // slug string
  date: "2024-03-15",
  time: "10:00 AM",
  customerName: "Juan dela Cruz",
  email: "juan@email.com",
  phone: "09171234567",
  vehicle: "Toyota Fortuner",
  vehicleYear: "2019",
  notes: "Has a scratch on rear bumper",
  isVip: true,
  memberId: "abc-123",
  coffeeOrder: "Macchiato",
  status: "pending",               // pending | confirmed | cancelled | no_show | completed
  cancellationReason: null,
  detailersAssigned: ["uuid1"],    // uuid[] — the *specific* detailers named (may be empty)
  detailersCount: 1,               // heads reserved against the pool; always >= detailersAssigned.length
  occupiesSlots: ["10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM"],
  createdAt: "2024-03-10T09:30:00Z"
}
```

### Key DB Conventions

- `fromRow()` / `toRow()` in `src/lib/supabase.js` convert between snake_case (DB) and camelCase (JS) automatically
- Always use these helpers — never manually map column names
- Fetches use `.limit(500)` on services and `.limit(1000)` on bookings/members to override PostgREST defaults

---

## AppContext

All DB fetches and mutations live in `src/context/AppContext.jsx`. Components never call Supabase directly.

### State

```js
{
  services, bookings, members, blockedSlots,
  cars, memberCars, coffees, serviceCategories,
  detailers, settings,
  adminSession,   // boolean — true if Supabase Auth session exists
  hydrated,       // boolean — true once initial fetches complete
  toasts,
}
```

### Key Actions

```js
addBooking(booking)                          // calls add_booking RPC
updateBookingStatus(id, status, reason?)     // .update() on bookings
updateBookingDetailers(id, detailerIds[])    // calls update_booking_detailers RPC
deleteBooking(id)
addMember(member)
updateMemberStatus(id, status)
upsertService(service)                       // insert (add) or update (edit)
upsertServiceCategory(cat)
deleteServiceCategory(id)
upsertCar(car) / deleteCarFromCatalog(id)
addCarToMember(memberId, carId)
upsertCoffee(coffee) / deleteCoffee(id)
upsertDetailer(detailer) / deleteDetailer(id)
toggleBlockedSlot(date, time, label)
updateSettings(poolSize, defaultPerBooking)
signOut()
showToast(message, type)
```

---

## Core Business Logic

### Booking Rules

1. **Capacity check**: Each time slot supports up to `detailerPoolSize` detailers total. A service's `minDetailers` is the minimum required — the slot is blocked if fewer are available. Capacity is checked on **every day** a booking touches (see sequential fill below). Every capacity sum (client and DB) measures `bookings.detailers_count` — the heads a booking reserves — **never** `array_length(detailers_assigned, 1)`, which is NULL for a booking with no *specific* detailer named and would count it as zero. Naming a detailer is optional; the booking reserves `max(minDetailers, defaultDetailersPerBooking, named.length)` heads either way.
2. **Sequential day-fill** (`planBookingDays` in `bookingUtils.js`): every service is a total-hours budget (hour-based services use their upper-bound hours; day-based use **N × 8 fixed hours** via `HOURS_PER_SERVICE_DAY`). The budget fills working days one after another — day 1 from the chosen start time to the configured closing, the remainder rolling into the next day's opening, and so on. The final day may be **partial** (only the slots needed are blocked; the rest of that day stays open for others). A service that runs past closing is never rejected — it auto-rolls into the next working day.
3. **Cross-date occupancy**: the full (date, slot) span of a booking is stored in the `booking_day_slots` child table and drives capacity + per-detailer conflict enforcement in `add_booking`. `bookings.date` / `bookings.occupies_slots` remain the **day-1** values (for the schedule/monitor single-date views). Client-side, `refetchBookings` attaches each booking's `dayScheduleSlots` (date→slots map) so the pure availability helpers see multi-day spans.
4. **Pending by default**: New public bookings land as `status = 'pending'`. Admin must confirm — only then does the booking appear on the schedule and the customer gets a confirmation email.
5. **Disabled dates**: Past dates and Sundays are never selectable.
6. **Operating hours**: 7:00 AM – 5:00 PM, Mon – Sun (slots defined in `timeSlots.js`).

### Booking Flow (public, currently admin-only)

- `/booking` shows a "booking unavailable" page to unauthenticated users
- Authenticated admin sees the full 3-step flow: Service → Date & Time → Details
- Step 3 includes optional preferred detailer selection (chip buttons)
- VIP detection is automatic via email match against approved members

### Admin Confirmation Flow

- New bookings appear in "Pending Booking Approvals" on the dashboard
- Confirming sends a confirmation email via Resend
- Only confirmed (and completed) bookings appear on the Schedule and Shop Monitor

---

## Auth

- Admin **and** VIP members authenticate via the same **Supabase Auth** (`supabase.auth.signInWithPassword`). The *account type* is resolved by email, not by separate auth systems.
- `ProtectedRoute` wraps all `/admin/*` pages — redirects to `/admin/login` if no session, and bounces a **member** session to `/portal`.
- `MemberRoute` wraps all `/portal/*` pages — redirects to `/portal/login` if no session, bounces an **admin** to `/admin/dashboard`, and shows an inline "membership not active" notice for an authenticated user who isn't an approved member.
- Session timeout: 3-day absolute (enforced client-side in `ProtectedRoute` / `MemberRoute`, shared `obsidian_session_start` localStorage key).
- Create admin users in Supabase Dashboard → Authentication → Users. **VIP members self-register** at `/portal/signup` (see Member Portal below).

### Account-type resolution (AppContext)

`AppContext` derives `accountType` (`'admin' | 'member' | null`) plus `adminRole` and `currentMember` from the signed-in email:

1. email in `admin_users` → that row's role → `accountType = 'admin'`
2. else an **approved** member with that email → `currentMember` set → `accountType = 'member'`
3. else `admin_users` is empty → first non-member login is `super_admin` (bootstrap)
4. else (authenticated but neither) → **no access** (`accountType = null`)

> ⚠️ Rule 4 is stricter than the old "unlisted → least-privilege admin" behavior. It is required because member sign-up is public — an unknown authenticated user must NOT inherit admin access. Real admins are always seeded in `admin_users` (or are the bootstrap first user).

### Admin Roles (two tiers)

Two access levels, resolved by login-email match against the `admin_users` table:

- **`super_admin`** — the boss; unrestricted access to everything.
- **`admin`** — staff (e.g. a barista covering the shop). Can create and view
  bookings, the schedule, and the shop monitor, **advance booking status**
  (confirm / on-going / completed / no-show / cancel), **assign detailers**,
  **manage add-ons**, and **use the Coffee POS** (serve VIP coffee, which deducts
  ingredient stock via the `tender_pos_order` RPC). **Cannot** delete bookings,
  block schedule slots, or open sensitive pages (members, cars, coffees, services,
  categories, detailers, testimonials, add-ons catalog, inventory, settings, staff).

  Per-booking permission keys: `bookings.status`, `bookings.detailers`,
  `bookings.addons` (granted to admin); `bookings.edit` (delete + slot blocking,
  super only). Status/detailer/add-on writes go through `SECURITY DEFINER` RPCs
  (`update_booking_status`, `update_booking_detailers`, `update_booking_addons`)
  that each touch only their own column, so the `bookings` table UPDATE policy
  stays super-admin only.

How it works:

- Roles + permission keys live in `src/lib/permissions.js` (`ROLES`,
  `PERMISSIONS`, `can(role, permission)`). `super_admin` passes every check;
  `admin` is limited to an allowlist.
- `AppContext` resolves the current role into `adminRole`, plus helpers
  `can(permission)` and `isSuperAdmin`. Resolution: empty `admin_users` table →
  first signed-in user is `super_admin` (bootstrap); authenticated but unlisted
  → `admin` (least privilege).
- **UI gating**: `ProtectedRoute permission="..."` blocks whole pages (bouncing
  to `/admin/dashboard`), `AdminLayout` hides nav links the role can't use, and
  individual edit actions are wrapped in `can(...)` checks.
- **DB enforcement (RLS)**: role-based Row Level Security backs the UI. Reads
  stay open (no public-site / admin-UI regressions); sensitive **writes** require
  `is_super_admin()` — a `SECURITY DEFINER` SQL helper that matches the JWT email
  against `admin_users` (empty table → bootstrap super_admin). The `bookings`
  table UPDATE/DELETE policies are super-admin only; a plain `admin` performs
  status / detailer / add-on changes only through the `SECURITY DEFINER` RPCs
  noted above (each column-scoped). So an `admin` physically cannot delete
  bookings, edit other booking fields, manage members/cars/coffees/services/
  settings/staff, or block slots — even calling the API directly. Public
  submission flows keep anon write carve-outs (membership inserts, testimonial
  submissions, booking inserts). See the "Phase 3 — Role-based RLS" block (plus
  Phases 5–6 for the booking RPCs) in `migrations.sql`.
- The boss manages who is which via **Staff Access** (`/admin/staff`, super-admin
  only). Accounts are still *created* in the Supabase Dashboard; their role is
  *assigned* by email on this page (or directly in the `admin_users` table).
- **Per-admin booking-service allowlist**: on the Staff Access page, each `admin`
  row has a **Booking services** dialog to restrict which service packages that
  admin (e.g. a barista) can select in the booking flow. Stored in
  `admin_users.allowed_service_ids` (`integer[]`): `NULL` = no restriction (any
  service), an array = allowlist. Super admins are never restricted. Filtering is
  applied in `BookingFlow` via the exposed `currentAdmin.allowedServiceIds`; it is
  a UI convenience (booking inserts still go through the same RPC). Migration:
  Phase 10 in `migrations.sql`.
- DB: `admin_users (email unique, role, allowed_service_ids)` — see `schema.sql` /
  `migrations.sql`. Its own RLS is authenticated-read / super-admin-write.

---

## Email (Resend)

- Server-side route: `app/api/send-email/route.js`
- Client wrapper: `src/lib/sendEmail.js` — `sendEmail(to, subject, html, onError?)`
- Templates: `src/lib/emailTemplates.js`
- From address: `onboarding@resend.dev` (sandbox) — change to verified domain when ready
- Env var: `RESEND_API_KEY` (server-only, no `NEXT_PUBLIC_` prefix)

---

## Services

Services are stored in the DB and managed via the admin Services page. IDs are auto-incremented (`generated always as identity`). Sort order is auto-assigned via a DB trigger and reordered via drag-and-drop in the UI.

Categories are a separate `service_categories` table (slug → name + color). The category dropdown in the Add/Edit Service modal pulls from DB.

---

## Shop Monitor (`/admin/monitor`)

- Real-time TV/tablet display for shop staff
- Shows today's confirmed + completed bookings as cards
- Supabase Realtime (`postgres_changes`) pushes updates instantly — no polling
- Fullscreen toggle for wall-mounted displays
- Status badges: Upcoming / In Progress (pulsing gold) / Done
- Start time + Finish time via `computeBookingETC(booking)` — the **one** shared helper (`bookingUtils.js`) used by the monitor, `/live`, and `/schedule`. It reads the end of the last `occupiesSlots` entry, so it is lunch-gap aware. Never recompute a finish time as `getSlotsConsumed() * 60` — slots are `SLOT_MINUTES` (30) apart, and multiplying by 60 doubles every job (a "4–5 hrs" service reads as a 10-hour span).

---

## VIP Membership

- Members apply via `/membership` — applications land as `status = 'pending'`
- Admin approves/rejects from `/admin/members`
- VIP detection at booking time: email match against approved members
- Perks: free coffee, 10% discount, priority scheduling, lounge access, birthday special
- Visit-first policy: a notice on `/membership` tells users to visit in person first

---

## Member Portal (`/portal`)

Approved VIP members get a self-service portal. All pages are wrapped in
`MemberRoute` + `PortalLayout` (`src/components/`).

| Route | Purpose |
|---|---|
| `/portal/signup` | Self-service: an approved email sets a password (`memberSignUp` → `supabase.auth.signUp`). Honors the project's "Confirm email" setting. |
| `/portal/login` | Member sign-in. |
| `/portal` | Overview — membership card, perks, quick stats, next appointment, "Book a Detail" CTA. |
| `/portal/book` | The shared `BookingFlow` with `member` prop (email locked, fleet pre-loaded). Bookings land `pending` like every other flow. |
| `/portal/bookings` | Upcoming/Scheduled + History tabs (read-only — no self-cancel). |
| `/portal/fleet` | Add/edit/remove own cars, set plate, mark default. |
| `/portal/profile` | Edit name/nickname/phone (email locked) + change password. |

- **Booking flow is shared**: `src/components/booking/BookingFlow.jsx` is used by
  both `/booking` (admin) and `/portal/book` (member, via the `member` prop).
- **Member AppContext API**: `memberSignUp`, `updateOwnPassword`,
  `updateOwnMemberProfile` (whitelists name/nickname/phone only),
  `getBookingsForMember(member)`. Fleet reuses the existing
  `getCarsForMember` / `upsertCar` / `addCarToMember` / `updateMemberCarPlate` /
  `removeCarFromMember` / `setMemberCarOrder` actions.
- **RLS (Phase 4 in `migrations.sql` / `schema.sql`)**: helper
  `current_member_id()` maps JWT email → approved member id. Members can
  `update` their own `members` row (email/status locked by the
  `members_self_update_guard` trigger) and manage `member_cars` rows in their own
  fleet. `cars`/`bookings` writes need no change (already open enough; portal
  filters bookings client-side).

---

## Coding Conventions

### Component Rules
- Functional components only — no class components
- `'use client'` directive on all interactive components
- Named exports for all components except page default exports
- Tailwind classes for all styling — no separate CSS files per component
- CSS variables for brand colors — never hardcode hex values in JSX

### State Rules
- All DB state goes through `AppContext` — components never call Supabase directly
- UI state (modal open, step number, hover) can be local `useState`
- Never mutate state directly — always use context action functions

### Naming Conventions
```
Pages:        default export, PascalCase function name
Components:   PascalCase, named export
Utilities:    camelCase
Data files:   camelCase
CSS classes:  kebab-case
Constants:    SCREAMING_SNAKE_CASE
```

### Do's ✅
- Use Tailwind utility classes for layout and spacing
- Use CSS variables for brand colors
- Add `aria-label` to all icon-only buttons
- Always handle empty states in lists and tables
- Use `formatCurrency()` from `src/data/services.js` for all peso amounts
- Use `fromRow()` / `toRow()` for all DB row mapping

### Don'ts ❌
- Don't install UI component libraries
- Don't use inline `style={{}}` for brand colors
- Don't hardcode peso amounts as plain strings
- Don't call Supabase outside of `AppContext`
- Don't skip loading/empty states in admin tables

---

## Responsive Breakpoints

```
Mobile:  < 768px    Single column, stacked layout, hamburger nav
Tablet:  768–1024px 2-column grid, condensed sidebar
Desktop: > 1024px   Full layout, sidebar nav, multi-column grids
```

Admin tables must scroll horizontally on mobile (`overflow-x-auto`).

---

## Common Tasks for AI Agents

### Adding a new admin page
1. Create `app/admin/<name>/page.jsx`
2. Wrap content in `<ProtectedRoute>` and `<AdminLayout title="...">`
3. Add nav link to `src/components/AdminLayout.jsx` links array

### Adding a new service package
- Use the Admin → Services UI (DB-driven, no code change needed)
- Or insert directly via Supabase — ID and sort_order are auto-assigned

### Adding a new time slot
1. Add to the array in `src/data/timeSlots.js`
2. Verify it doesn't break `getSlotsConsumed` or multi-day logic in `bookingUtils.js`

### Re-enabling public online booking
In `app/booking/page.jsx`, change `BookingGate` to always render `<BookingFlow />` instead of checking `adminSession`.

### Running DB migrations
Paste the relevant block from `supabase/migrations.sql` into Supabase Dashboard → SQL Editor and run.

---

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service-role key — used by `app/api/admin/create-staff` to create staff login accounts from the Staff Access page. Bypasses RLS; never expose to the client. |
| `RESEND_API_KEY` | Server only | Resend email API key |
| `EMAIL_FROM` | Server only | Sender address (default: `onboarding@resend.dev`) |

---

## Known Limitations / Intentional Constraints

- **Online booking is disabled** for the public — shows an unavailable page. Admin can still access the booking flow.
- **Visit-first membership** — VIP applications require an in-person visit; the online form is a secondary step.
- **No payment integration** — booking is a reservation only.
- **Two-tier roles** — `super_admin` (full) and `admin` (bookings: create, view, status, detailers, add-ons; no delete; no sensitive pages). Resolved by email via the `admin_users` table; enforced both in the UI and at the DB via role-based RLS + column-scoped RPCs (see Admin Roles under Auth).
- **Email sender unverified** — using Resend sandbox domain; verify `samahuzai.ph` in Resend to use custom from address.

---

## Shop Info

| | |
|---|---|
| Address | Brgy. San Francisco Halang Rd, Biñan, Philippines 4024 |
| Phone | +63 964 886 3698 |
| Email | admin@samahuzai.com |
| Hours | Mon – Sun · 7:00 AM – 5:00 PM |
