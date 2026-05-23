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
| `members` | VIP membership applications |
| `services` | Service packages (admin-managed, DB-driven) |
| `service_categories` | Category definitions (name, slug, color) |
| `cars` | Shared vehicle catalog |
| `member_cars` | Junction: member ↔ car ownership |
| `coffees` | Coffee menu items |
| `detailers` | Shop detailer roster |
| `blocked_slots` | Admin-blocked time slots |
| `settings` | Singleton row: pool size, default detailers per booking |

### Stored Procedures (RPCs)

| RPC | Purpose |
|---|---|
| `add_booking(p, p_occupies_slots)` | Atomic capacity-aware booking insert |
| `update_booking_detailers(p_id, p_detailer_ids, p_min_detailers)` | Safely reassign detailers on a booking |
| `update_settings(p_pool_size, p_default_per_booking)` | Validates and updates settings singleton |

> `add_booking` uses `pg_advisory_xact_lock` to prevent race conditions when two customers book the same slot simultaneously.

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
  detailersAssigned: ["uuid1"],    // uuid[] — actual detailer IDs
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

1. **Capacity check**: Each time slot supports up to `detailerPoolSize` detailers total. A service's `minDetailers` is the minimum required — the slot is blocked if fewer are available.
2. **Duration blocking**: `getSlotsConsumed(duration)` returns the number of 30-min slots a service occupies. All slots are stored in `occupies_slots[]` on the booking.
3. **Multi-day services**: Services with "day" in duration block entire days.
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

- Admin auth uses **Supabase Auth** (`supabase.auth.signInWithPassword`)
- `ProtectedRoute` wraps all `/admin/*` pages — redirects to `/admin/login` if no session
- A `obsidian_just_logged_in` sessionStorage flag prevents the 200ms race between login redirect and `onAuthStateChange` propagation
- Session timeout: 1 hour absolute (enforced client-side in `ProtectedRoute`)
- Create admin users in Supabase Dashboard → Authentication → Users

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
- Start time + End time computed from slot duration

---

## VIP Membership

- Members apply via `/membership` — applications land as `status = 'pending'`
- Admin approves/rejects from `/admin/members`
- VIP detection at booking time: email match against approved members
- Perks: free coffee, 10% discount, priority scheduling, lounge access, birthday special
- Visit-first policy: a notice on `/membership` tells users to visit in person first

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
| `RESEND_API_KEY` | Server only | Resend email API key |
| `EMAIL_FROM` | Server only | Sender address (default: `onboarding@resend.dev`) |

---

## Known Limitations / Intentional Constraints

- **Online booking is disabled** for the public — shows an unavailable page. Admin can still access the booking flow.
- **Visit-first membership** — VIP applications require an in-person visit; the online form is a secondary step.
- **No payment integration** — booking is a reservation only.
- **Single admin user** — auth is one Supabase Auth account, not role-based.
- **Email sender unverified** — using Resend sandbox domain; verify `samahuzai.ph` in Resend to use custom from address.

---

## Shop Info

| | |
|---|---|
| Address | Brgy. San Francisco Halang Rd, Biñan, Philippines 4024 |
| Phone | +63 927 691 4863 |
| Email | hello@samahuzai.ph |
| Hours | Mon – Sun · 7:00 AM – 5:00 PM |
