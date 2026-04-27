# CLAUDE.md — DON MIGUEL DETAILING

> This file provides context, conventions, and instructions for AI coding agents (Claude Code, Copilot, etc.) working on this project. Read this before making any changes.

---

## Project Overview

**DON MIGUEL DETAILING** is a premium auto detailing shop web application built with React + Vite + Tailwind CSS. It features:

- Public-facing site with service catalog and VIP membership
- Multi-step appointment booking with conflict prevention
- Separate admin dashboard for managing bookings and schedules
- Full localStorage persistence (no backend)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Styling | Tailwind CSS (utility-first) + custom CSS vars |
| State | React Context API (`AppContext`) |
| Persistence | `localStorage` only |
| Fonts | Google Fonts — Cormorant Garamond + DM Sans |
| Icons | Lucide React |
| Build | Vite |

> ⚠️ No external UI libraries (no shadcn, MUI, Chakra, Radix). Tailwind + custom CSS only.

---

## Project Structure

```
/src
├── components/
│   ├── Navbar.jsx           # Top navigation, mobile hamburger
│   ├── Footer.jsx           # Site footer
│   ├── Toast.jsx            # Custom toast notification system
│   └── ProtectedRoute.jsx   # Admin auth guard
│
├── pages/
│   ├── LandingPage.jsx      # Hero, features, services teaser, membership CTA
│   ├── ServicesPage.jsx     # Full service package grid
│   ├── BookingPage.jsx      # 3-step booking flow
│   ├── MembershipPage.jsx   # VIP perks + signup form
│   ├── ConfirmationPage.jsx # Booking success page
│   └── admin/
│       ├── AdminLogin.jsx       # Hardcoded auth form
│       ├── AdminDashboard.jsx   # Stats overview + today's schedule
│       ├── AdminBookings.jsx    # Booking table with filters + CSV export
│       └── AdminSchedule.jsx   # Weekly calendar grid view
│
├── context/
│   └── AppContext.jsx       # Global state: bookings, members, blocked slots, admin auth
│
├── data/
│   ├── services.js          # Service package definitions
│   └── timeSlots.js         # Available time slots config
│
├── utils/
│   └── bookingUtils.js      # Slot availability logic, ID generation
│
├── App.jsx                  # Route definitions
├── main.jsx                 # React entry point
└── index.css                # Tailwind directives + CSS vars + Google Fonts
```

---

## Design System

### CSS Variables (defined in `index.css`)

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

- **Headings**: `Cormorant Garamond` — elegant, editorial, serif
- **Body**: `DM Sans` — clean, modern, readable
- Never use Inter, Roboto, Arial, or system-ui as primary fonts in this project

### Key CSS Classes

| Class | Description |
|---|---|
| `.gold-shimmer` | Animated gold shimmer effect for hero headline |
| `.card-hover` | Subtle upward translate + gold glow on hover |
| `.glass-card` | Frosted glass surface effect |
| `.booking-step-indicator` | Gold connecting line between step numbers |
| `.vip-badge` | Inline gold VIP badge icon |

---

## State & Data

### AppContext Shape

```js
{
  bookings: [],          // All bookings array
  members: [],           // VIP members array
  blockedSlots: [],      // Admin-blocked time slots
  adminSession: false,   // Admin auth boolean
  
  addBooking(booking),
  updateBookingStatus(id, status),
  deleteBooking(id),
  addMember(member),
  toggleBlockedSlot(date, time, label),
  setAdminSession(bool)
}
```

### localStorage Keys

| Key | Contents |
|---|---|
| `obsidian_bookings` | Array of booking objects |
| `obsidian_members` | Array of VIP member objects |
| `obsidian_blocked_slots` | Array of blocked time slot objects |
| `obsidian_admin_session` | Boolean string `"true"` or `"false"` |

### Booking Object Shape

```js
{
  id: "OBS-20240315-4821",       // generateBookingId()
  serviceId: 2,
  serviceName: "The Executive",
  servicePrice: 3500,
  date: "2024-03-15",            // ISO date string YYYY-MM-DD
  time: "10:00 AM",
  customerName: "Juan dela Cruz",
  email: "juan@email.com",
  phone: "09171234567",
  vehicle: "2019 Toyota Fortuner",
  notes: "Has a scratch on rear bumper",
  isVip: true,
  coffeeOrder: "Macchiato",
  status: "confirmed",           // "confirmed" | "cancelled"
  createdAt: "2024-03-10T09:30:00Z"
}
```

---

## Core Business Logic

All booking conflict logic lives in `/src/utils/bookingUtils.js`.

### Rules

1. **No double booking**: A time slot on a given date can only hold ONE booking.
2. **Duration blocking**: Services longer than 4 hours block the next consecutive slot too.
3. **Disabled dates**: Past dates and Sundays are never selectable.
4. **Operating hours**: 8:00 AM – 4:00 PM (Mon–Sat).

### Key Functions

```js
// Returns array of available time slot strings for a given date + service duration
getAvailableSlots(date: string, serviceDuration: string): string[]

// Returns boolean — true if slot is free
isSlotAvailable(date: string, time: string, serviceDuration: string): boolean

// Returns formatted booking ID e.g. "OBS-20240315-4821"
generateBookingId(): string
```

---

## Admin Credentials

> Hardcoded — no backend auth. For demo/prototype purposes only.

```
Username: obsidian_admin
Password: detail2024!
```

Admin session is stored in localStorage as `obsidian_admin_session`. `ProtectedRoute.jsx` checks this before rendering any `/admin/*` route.

---

## Services Reference

Defined in `/src/data/services.js`. IDs are stable — do not change them as they're referenced in bookings.

| ID | Name | Price | Duration | Category |
|---|---|---|---|---|
| 1 | The Essential | ₱1,500 | 2–3 hrs | exterior |
| 2 | The Executive | ₱3,500 | 4–5 hrs | full |
| 3 | The Obsidian Elite | ₱6,000 | 6–8 hrs | premium |
| 4 | Paint Correction | ₱4,500 | 5–6 hrs | specialty |
| 5 | Ceramic Coating | ₱12,000 | 1–2 days | specialty |
| 6 | Interior Rescue | ₱2,500 | 3–4 hrs | interior |

---

## VIP Membership Perks

- Free coffee while waiting (Macchiato, Brewed Coffee, Cappuccino, Americano, Latte)
- 10% discount on all services
- Priority scheduling access
- Exclusive lounge with WiFi
- Birthday month special offer

VIP members can select their coffee order in Step 3 of the booking flow.

---

## Coding Conventions

### Component Rules
- Functional components only — no class components
- Use named exports for all components
- Co-locate component styles as Tailwind classes, not separate CSS files
- Use `CSS variables` for colors, never hardcode hex values in JSX

### State Rules
- All persistent state goes through `AppContext` — no local component state for booking/member data
- UI state (modal open, step number, hover) can be local `useState`
- Never mutate state directly — always use context action functions

### Naming Conventions
```
Components:   PascalCase     → BookingPage.jsx
Utilities:    camelCase      → bookingUtils.js
Data files:   camelCase      → services.js
CSS classes:  kebab-case     → .gold-shimmer
Constants:    SCREAMING_SNAKE → MAX_SLOTS_PER_DAY
```

### Do's ✅
- Use Tailwind utility classes for layout and spacing
- Use CSS variables for brand colors
- Keep components under 300 lines — split if larger
- Add `aria-label` to all icon-only buttons
- Always handle empty states in lists/tables

### Don'ts ❌
- Don't install UI component libraries
- Don't use inline `style={{}}` for colors — use CSS vars + Tailwind
- Don't hardcode Philippine Peso amounts as strings — use a `formatCurrency()` helper
- Don't skip loading/empty states in admin tables
- Don't use `any` patterns — keep data shapes consistent with the schemas above

---

## Responsive Breakpoints

```
Mobile:  < 768px   → Single column, stacked layout, hamburger nav
Tablet:  768–1024px → 2-column grid, condensed sidebar
Desktop: > 1024px  → Full layout, sidebar nav, multi-column grids
```

Admin tables must scroll horizontally on mobile (`overflow-x-auto`).

---

## Seed Data

On first load (empty localStorage), `AppContext` should auto-seed 5 sample bookings spread across the next 7 days so the admin dashboard has something to display. Seed data must use realistic Filipino names and vehicle models.

---

## Common Tasks for AI Agents

### Adding a new service package
1. Add entry to `/src/data/services.js` with a new unique `id`
2. No other files need changing — components read from `services.js` dynamically

### Adding a new time slot
1. Add to the array in `/src/data/timeSlots.js`
2. Verify it doesn't break duration-blocking logic in `bookingUtils.js`

### Changing admin credentials
1. Update the hardcoded check in `AdminLogin.jsx`
2. Note: this is a frontend-only demo — not production-safe

### Adding a new admin page
1. Create component in `/src/pages/admin/`
2. Wrap route in `<ProtectedRoute>` in `App.jsx`
3. Add nav link to admin sidebar in `AdminDashboard.jsx`

---

## Known Limitations

- **No real backend** — all data is localStorage only; clears on browser data wipe
- **Single device** — bookings don't sync across devices or users
- **No real auth** — admin credentials are hardcoded in the client bundle
- **No payment integration** — booking is a reservation only, no payment flow
- **No email/SMS confirmation** — confirmation page is the only receipt

These are intentional for the prototype. A production version would require a backend API, database, and auth service.

---

## Future Roadmap (Out of Scope for This Build)

- [ ] Laravel/FastAPI backend with PostgreSQL
- [ ] SMS confirmation via Semaphore (PH SMS gateway)
- [ ] Online payment via PayMongo
- [ ] Real admin auth with JWT
- [ ] Multi-branch support
- [ ] Loyalty points system
- [ ] WhatsApp/Messenger chatbot booking