# Samahuzai Carwash and Auto Detailing
### *Perfection is in the details.*

> A premium auto detailing shop web app with VIP membership, appointment booking, and a full admin dashboard — built with Next.js 14 + Supabase + Tailwind CSS.

---

## Features

### Customer-Facing
- **Landing Page** — Hero section, service previews, VIP membership teaser
- **Services Catalog** — All packages with pricing, duration, and category badges
- **VIP Membership** — Perks overview with a visit-first notice (online signup coming soon)
- **Booking** — Admin-only for now; public visitors see a "visit us in person" page at `/booking`
- **Booking Confirmation** — Unique booking ID, full summary, shareable receipt

### Admin Dashboard
- **Overview** — Today's confirmed bookings, weekly stats, earnings, VIP count
- **Bookings Manager** — Full table with search, status filters, CSV export, detailer assignment
- **Schedule Calendar** — Weekly grid (Mon–Sat, 8AM–5PM), confirmed bookings only, color-coded by category
- **Shop Monitor** — Live Realtime view of today's active bookings with end-time and ETC duration
- **Slot Blocking** — Manually block time slots (lunch, maintenance, etc.)
- **Detailers** — Manage the detailer roster (name, nickname, role, active status, sort order)
- **Service Categories** — CRUD for booking category labels and colors
- **Cars** — Vehicle reference list management
- **Coffees** — Manage the complimentary coffee menu for VIP members
- **Members** — Approve/reject VIP membership applications
- **Settings** — Detailer pool size and other shop-wide configuration
- **Protected Routes** — All `/admin/*` routes gated behind Supabase Auth; 1-hour session timeout

---

## Tech Stack

| | |
|---|---|
| **Framework** | Next.js 14 (App Router) |
| **Database** | Supabase (PostgreSQL + Row-Level Security) |
| **Auth** | Supabase Auth (`signInWithPassword` + `onAuthStateChange`) |
| **Realtime** | Supabase Realtime (`postgres_changes`) |
| **Styling** | Tailwind CSS + Custom CSS Variables |
| **State** | React Context API (`AppContext`) |
| **Fonts** | Cormorant Garamond + DM Sans (Google Fonts) |
| **Icons** | Lucide React |
| **Email** | Resend (booking confirmations) |

---

## Getting Started

### Prerequisites

- Node.js `>= 18.x`
- npm `>= 9.x`
- A [Supabase](https://supabase.com) project with the schema from `supabase/schema.sql` applied

### Installation

```bash
git clone https://github.com/jehnsen/detailing-app.git
cd detailing-app
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
RESEND_API_KEY=your_resend_api_key
```

### Database Setup

1. Open your Supabase project's **SQL Editor**
2. Run `supabase/schema.sql` to create all tables, RPCs, RLS policies, and seed data
3. If upgrading an existing database, run `supabase/migrations.sql` instead

### Run Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

---

## Project Structure

```
detailing-app/
├── app/
│   ├── (public)/
│   │   ├── page.jsx              # Landing page
│   │   ├── services/page.jsx     # Services catalog
│   │   ├── booking/page.jsx      # Booking flow (admin) / unavailable page (public)
│   │   ├── membership/page.jsx   # VIP membership info
│   │   └── confirmation/[id]/    # Booking confirmation
│   ├── admin/
│   │   ├── login/page.jsx        # Admin login (Supabase Auth)
│   │   ├── dashboard/page.jsx    # Stats overview + today's schedule
│   │   ├── bookings/page.jsx     # Booking manager
│   │   ├── schedule/page.jsx     # Weekly calendar
│   │   ├── monitor/page.jsx      # Live shop monitor (Realtime)
│   │   ├── detailers/page.jsx    # Detailer roster
│   │   ├── categories/page.jsx   # Service categories
│   │   ├── cars/page.jsx         # Vehicle reference
│   │   ├── coffees/page.jsx      # Coffee menu
│   │   ├── members/page.jsx      # VIP membership approvals
│   │   └── settings/page.jsx     # Shop settings
│   ├── api/
│   │   └── send-confirmation/    # Resend email API route
│   └── layout.jsx                # Root layout with AppContext provider
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Toast.jsx
│   │   └── ProtectedRoute.jsx    # Admin auth guard (1-hr session timeout)
│   ├── context/
│   │   └── AppContext.jsx        # Global state; sole Supabase interface
│   └── lib/
│       └── supabase.js           # Supabase client + camelCase/snake_case helpers
├── supabase/
│   ├── schema.sql                # Full DB schema (idempotent)
│   └── migrations.sql            # Upgrade scripts for existing DBs
├── CLAUDE.md
├── README.md
├── tailwind.config.js
├── next.config.js
└── package.json
```

---

## Services & Pricing

| Package | Price | Duration | Category |
|---|---|---|---|
| The Essential | ₱1,500 | 2–3 hrs | Exterior |
| The Executive | ₱3,500 | 4–5 hrs | Full |
| The Obsidian Elite | ₱6,000 | 6–8 hrs | Premium |
| Paint Correction | ₱4,500 | 5–6 hrs | Specialty |
| Ceramic Coating | ₱12,000 | 1–2 days | Specialty |
| Interior Rescue | ₱2,500 | 3–4 hrs | Interior |

Service categories, names, and pricing are managed from the admin dashboard and stored in Supabase.

---

## Admin Access

Admin login uses **Supabase Auth** — credentials are managed in your Supabase project's Authentication dashboard, not hardcoded in the app.

| Field | Value |
|---|---|
| URL | `/admin/login` |
| Auth provider | Supabase email + password |
| Session timeout | 1 hour (absolute, enforced client-side) |

---

## Booking Rules

- Operating hours: **8:00 AM – 4:00 PM, Monday to Saturday**
- Sundays and past dates are disabled
- New bookings default to **`pending`** status — admin must confirm before they appear on the schedule
- Slot capacity is enforced server-side via a `pg_advisory_xact_lock` RPC (`add_booking`) to prevent race conditions
- Long services block consecutive 30-minute slots to prevent overlaps
- Each booking ID format: `OBS-YYYYMMDD-XXXX`
- Detailers are assigned per booking as a `uuid[]` array, enabling per-detailer task history

### Booking Status Flow

```
pending → confirmed → completed
       ↘ cancelled
       ↘ no_show
```

Only `confirmed` and `completed` bookings appear on the schedule calendar and shop monitor.

---

## VIP Membership

VIP members enjoy:

- Free coffee while waiting (Macchiato, Brewed Coffee, Cappuccino, Americano, Latte)
- Discount on selected services
- Priority scheduling access
- Exclusive lounge with WiFi
- Birthday month special offer

> **For now, VIP membership requires a personal visit to the shop.** Admin approves membership applications from the `/admin/members` page. Online self-signup is planned for a future release.

**Shop address:** Brgy. San Francisco Halang Rd, Biñan, Philippines 4024 · Mon–Sun, 7:00 AM–5:00 PM

---

## Database Schema (Key Tables)

| Table | Purpose |
|---|---|
| `bookings` | All appointments — status, detailers, slots |
| `services` | Service packages (auto-increment id, drag-reorder) |
| `service_categories` | Category labels and badge colors |
| `detailers` | Detailer roster (uuid pk, active flag, sort order) |
| `members` | VIP membership applications and approvals |
| `coffees` | Complimentary coffee menu |
| `cars` | Vehicle reference list |
| `settings` | Shop-wide config (detailer pool size, etc.) |
| `blocked_slots` | Admin-blocked date/time slots |

### Key RPCs

| Function | Purpose |
|---|---|
| `add_booking(p jsonb, p_occupies_slots text[])` | Atomic booking insert with capacity check |
| `update_booking_detailers(p_id, p_detailer_ids uuid[], p_min_detailers)` | Safely reassign detailers |
| `update_settings(p_detailer_pool_size int)` | Update shop settings |

---

## Design System

### Color Palette

| Name | Hex | Usage |
|---|---|---|
| Obsidian | `#0A0A0B` | Primary background |
| Surface | `#141416` | Cards, panels |
| Surface 2 | `#1C1C1F` | Elevated surfaces |
| Gold | `#C9A84C` | Primary accent |
| Gold Light | `#E8C96A` | Hover state |
| Cream | `#F5F0E8` | Primary text |
| Muted | `#6B6B72` | Secondary text |
| Success | `#4CAF7D` | Confirmed / success |
| Danger | `#E05252` | Cancelled / errors |

### Typography

- **Display / Headings**: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) — elegant, editorial serif
- **Body / UI**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) — clean, geometric sans-serif

---

## Route Map

| Route | Page | Protected |
|---|---|---|
| `/` | Landing Page | No |
| `/services` | Services Catalog | No |
| `/booking` | Booking flow (admin) / Unavailable notice (public) | Partial |
| `/membership` | VIP Membership info | No |
| `/confirmation/[id]` | Booking Confirmation | No |
| `/admin/login` | Admin Login | No |
| `/admin/dashboard` | Dashboard Overview | Yes |
| `/admin/bookings` | Booking Manager | Yes |
| `/admin/schedule` | Schedule Calendar | Yes |
| `/admin/monitor` | Live Shop Monitor | Yes |
| `/admin/detailers` | Detailer Roster | Yes |
| `/admin/categories` | Service Categories | Yes |
| `/admin/cars` | Vehicle Reference | Yes |
| `/admin/coffees` | Coffee Menu | Yes |
| `/admin/members` | VIP Membership Approvals | Yes |
| `/admin/settings` | Shop Settings | Yes |

---

## Responsive Design

| Breakpoint | Layout |
|---|---|
| Mobile `< 768px` | Single column, hamburger nav, stacked form steps |
| Tablet `768–1024px` | 2-column grids, condensed admin sidebar |
| Desktop `> 1024px` | Full multi-column layout, persistent sidebar |

Admin tables scroll horizontally on mobile.

---

## Known Limitations

- **Online booking is currently disabled for the public** — customers must visit the shop in person
- **VIP membership requires a personal visit** — no self-service online signup yet
- **Single Supabase project** — no multi-branch / multi-bay support
- **No payment integration** — booking is a reservation only; payment collected at the shop
- **No SMS confirmation** — email confirmation via Resend only

---

## Roadmap

- [ ] Re-enable public online booking with customer-facing flow
- [ ] Self-service VIP membership signup with Supabase Auth
- [ ] SMS confirmation via [Semaphore](https://semaphore.co) (PH)
- [ ] Online payment via [PayMongo](https://paymongo.com)
- [ ] Per-detailer task history and earnings reports
- [ ] Multi-branch / multi-bay support
- [ ] Customer loyalty points system
- [ ] WhatsApp/Messenger booking chatbot

---

# 

The cause: half-hour slots multiplied by 60 minutes
getSlotsConsumed() returns a count of 30-minute slots, but the Shop Monitor and /live computed the finish time as slots × 60. That doubles every job's displayed length:

Service	Monitor showed	Actual
1 hr @ 8:00 AM	10:00 AM (2h span)	9:00 AM
4–5 hrs @ 8:00 AM	6:00 PM (10h span)	2:00 PM
2–3 hrs @ 9:00 AM	3:00 PM (6h span)	12:00 PM
That middle row is the "10hrs" they're seeing — a 4–5 hr service renders as a 10-hour span. The offending line was const SLOT_MIN = 60 in monitor/page.jsx:35, duplicated as slotsConsumed * 60 in live/page.jsx:39.

Notably, the public /schedule page already had this right — it read the end of the last occupied slot instead of doing arithmetic. The bug was in the two copies that drifted.

The fix
Rather than patch 60 → 30 in two places and leave three near-identical copies to drift again, I moved the correct implementation into computeBookingETC(booking) in bookingUtils.js and pointed the monitor, /live, and /schedule at it. It reads the end of the last occupiesSlots entry, which also makes it lunch-gap aware — the arithmetic version couldn't be, since it doesn't know the 12–1 break exists.

Verified: an 11:30 AM 1.5hr job now correctly finishes at 2:00 PM (skipping lunch) rather than 1:00 PM. Bad input returns — instead of a garbage time. next build compiles, and no computeEndTime/SLOT_MIN = 60 references remain.

Two things worth knowing
This was display-only. Booking capacity, conflicts, and occupies_slots were always computed correctly via SLOT_MINUTES — so no stored data is wrong, and nothing needs backfilling. Only the monitor and live screens lied about finish times.

A job starting near closing shows its day-1 finish. A 1hr job at 4:30 PM displays "Finish 5:00 PM" because only one slot fits before closing and the rest rolls to tomorrow morning (the rollover you confirmed is intended). The monitor is a single-day view, so that's consistent — but staff reading it won't see that the job continues tomorrow. Tell me if you want the card to flag a rollover.