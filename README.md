# Samahuzai Carwash and Auto Detailing
### *Perfection is in the details.*

> A premium auto detailing shop web app with VIP membership, appointment booking, and an admin dashboard — built with React + Vite + Tailwind CSS.

---

## ✨ Features

### Customer-Facing
- **Landing Page** — Hero section, service previews, VIP membership teaser, testimonials
- **Services Catalog** — All 6 packages with pricing, duration, and inclusions
- **Multi-Step Booking** — 3-step flow: select service → pick date/time → enter details
- **Conflict-Free Scheduling** — Booked slots are automatically disabled for other users
- **VIP Membership** — Signup form with perks including free coffee selection while waiting
- **Booking Confirmation** — Unique booking ID, full summary, printable receipt view

### Admin Dashboard
- **Overview** — Today's bookings, weekly stats, VIP count at a glance
- **Bookings Manager** — Full table with search, filters, status toggles, CSV export
- **Schedule View** — Weekly calendar grid (Mon–Sat, 8AM–5PM) with color-coded blocks
- **Slot Blocking** — Manually block time slots (lunch, meetings, maintenance)
- **Protected Routes** — Admin section gated behind login

---

## 🛠️ Tech Stack

| | |
|---|---|
| **Framework** | React 18 + Vite |
| **Routing** | React Router v6 |
| **Styling** | Tailwind CSS + Custom CSS Variables |
| **State** | React Context API |
| **Persistence** | localStorage (no backend) |
| **Fonts** | Cormorant Garamond + DM Sans (Google Fonts) |
| **Icons** | Lucide React |

---

## 🚀 Getting Started

### Prerequisites

- Node.js `>= 18.x`
- npm `>= 9.x`

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/obsidian-detail-co.git
cd obsidian-detail-co

# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🗂️ Project Structure

```
obsidian-detail-co/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── Navbar.jsx
│   │   ├── Footer.jsx
│   │   ├── Toast.jsx
│   │   └── ProtectedRoute.jsx
│   ├── pages/
│   │   ├── LandingPage.jsx
│   │   ├── ServicesPage.jsx
│   │   ├── BookingPage.jsx
│   │   ├── MembershipPage.jsx
│   │   ├── ConfirmationPage.jsx
│   │   └── admin/
│   │       ├── AdminLogin.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── AdminBookings.jsx
│   │       └── AdminSchedule.jsx
│   ├── context/
│   │   └── AppContext.jsx
│   ├── data/
│   │   ├── services.js
│   │   └── timeSlots.js
│   ├── utils/
│   │   └── bookingUtils.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── CLAUDE.md
├── README.md
├── index.html
├── tailwind.config.js
├── vite.config.js
└── package.json
```

---

## 📦 Services & Pricing

| Package | Price | Duration | Category |
|---|---|---|---|
| The Essential | ₱1,500 | 2–3 hrs | Exterior |
| The Executive ⭐ | ₱3,500 | 4–5 hrs | Full Detail |
| The Obsidian Elite | ₱6,000 | 6–8 hrs | Premium |
| Paint Correction | ₱4,500 | 5–6 hrs | Specialty |
| Ceramic Coating | ₱12,000 | 1–2 days | Specialty |
| Interior Rescue | ₱2,500 | 3–4 hrs | Interior |

---

## 🔐 Admin Access

> For demo/prototype purposes only. Not for production use.

| Field | Value |
|---|---|
| URL | `/admin/login` |
| Username | `obsidian_admin` |
| Password | `detail2024!` |

---

## 💎 VIP Membership

VIP members enjoy the following perks when booking:

- ☕ **Free coffee** while waiting in the lounge
  - *Macchiato, Brewed Coffee, Cappuccino, Americano, Latte*
- 🏷️ **10% discount** on all services
- ⚡ **Priority scheduling** access
- 📶 **Exclusive lounge** with premium WiFi
- 🎂 **Birthday month** special offer

Members can select their coffee order during the booking flow (Step 3).

---

## 🗓️ Booking Rules

- Operating hours: **8:00 AM – 4:00 PM, Monday to Saturday**
- Sundays and past dates are disabled
- Time slots are automatically disabled once booked
- Long services (4+ hrs) block consecutive slots to prevent overlaps
- Each booking generates a unique ID in the format: `OBS-YYYYMMDD-XXXX`

---

## 🎨 Design System

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
| Success | `#4CAF7D` | Confirmed status |
| Danger | `#E05252` | Cancelled / errors |

### Typography

- **Display / Headings**: [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) — elegant, editorial serif
- **Body / UI**: [DM Sans](https://fonts.google.com/specimen/DM+Sans) — clean, geometric sans-serif

---

## 💾 Data Persistence

All data is stored in the browser's `localStorage`. No backend or API required.

| Key | Contents |
|---|---|
| `obsidian_bookings` | All appointment bookings |
| `obsidian_members` | VIP member registrations |
| `obsidian_blocked_slots` | Admin-blocked time slots |
| `obsidian_admin_session` | Admin authentication state |

> **Note:** Data is device-specific and will be lost if browser storage is cleared.

On first load with no existing data, the app seeds 5 sample bookings across the next 7 days for admin dashboard demonstration.

---

## 📱 Responsive Design

| Breakpoint | Layout |
|---|---|
| Mobile `< 768px` | Single column, hamburger nav, stacked form steps |
| Tablet `768–1024px` | 2-column grids, condensed admin sidebar |
| Desktop `> 1024px` | Full multi-column layout, persistent sidebar |

---

## 🗺️ Route Map

| Route | Page | Protected |
|---|---|---|
| `/` | Landing Page | No |
| `/services` | Services Catalog | No |
| `/booking` | Appointment Booking | No |
| `/membership` | VIP Membership | No |
| `/confirmation/:id` | Booking Confirmation | No |
| `/admin/login` | Admin Login | No |
| `/admin/dashboard` | Admin Dashboard | ✅ Yes |
| `/admin/bookings` | Booking Manager | ✅ Yes |
| `/admin/schedule` | Schedule Calendar | ✅ Yes |

---

## ⚠️ Known Limitations

This is a **frontend prototype** — the following are intentional limitations:

- No real backend — data doesn't sync across devices or users
- Admin credentials are hardcoded in the client bundle
- No payment processing — booking is a reservation only
- No email/SMS confirmation system
- Data loss on browser storage wipe

---

## 🔭 Roadmap

Planned for future production version:

- [ ] Laravel/FastAPI REST API backend
- [ ] PostgreSQL database
- [ ] Real JWT-based admin authentication
- [ ] SMS confirmation via [Semaphore](https://semaphore.co) (PH)
- [ ] Online payment via [PayMongo](https://paymongo.com)
- [ ] Multi-branch / multi-bay support
- [ ] Customer loyalty points system
- [ ] WhatsApp/Messenger booking chatbot

---

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

Please read `CLAUDE.md` before contributing — it contains coding conventions, data schemas, and architectural decisions that must be followed.

---

## 📄 License

MIT License — see `LICENSE` for details.

---

## feature branch changes:
- changed the yellow color to starbucks green color
- admin approval on VIP membership registration
- added /admin/members page


original themecolor:
--color-gold: #C9A84C;
--color-gold-light: #E8C96A;

1.Do you have a Supabase project already? - Yes just leave the NEXT_PUBLIC_SUPABASE_URL  and the NEXT_PUBLIC_SUPABASE_ANON_KEY empty for now

2.Scope — full cutover
3.Admin auth - Keep the hardcoded credentials for now
4.recommended
5.recommended


carlos.bautista@email.com

0917 990 8877




## NOTE:
run line 12-15 in /supabase/migrations 

-added admin confirmation flow
-Earnings on dashboard
-added about page