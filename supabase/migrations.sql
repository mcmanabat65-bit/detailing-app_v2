-- =====================================================================
-- Samahuzai Carwash and Auto Detailing — Migrations
-- Run these if upgrading an existing database (schema already applied).
-- Each statement is idempotent — safe to re-run.
-- =====================================================================

-- Add cancellation_reason column (Phase 1 → Phase 1.1)
alter table bookings add column if not exists cancellation_reason text;

-- Add coffees table (Phase 1.2)
create table if not exists coffees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists coffees_name_lower_idx on coffees (lower(name));
create index if not exists coffees_sort_idx on coffees (sort_order);
alter table coffees enable row level security;
drop policy if exists "public all coffees" on coffees;
create policy "public all coffees" on coffees for all to anon, authenticated using (true) with check (true);

-- Seed default coffees (safe to re-run)
insert into coffees (name, available, sort_order) values
  ('Macchiato',    true, 1),
  ('Brewed Coffee',true, 2),
  ('Cappuccino',   true, 3),
  ('Americano',    true, 4),
  ('Latte',        true, 5)
on conflict (lower(name)) do nothing;

-- Add service_categories table (Phase 1.3)
create table if not exists service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  color text not null default 'bg-white/10 text-cream',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists service_categories_slug_idx on service_categories (lower(slug));
create index if not exists service_categories_sort_idx on service_categories (sort_order);
alter table service_categories enable row level security;
drop policy if exists "public all service_categories" on service_categories;
create policy "public all service_categories" on service_categories for all to anon, authenticated using (true) with check (true);

-- Seed default service categories (safe to re-run)
insert into service_categories (name, slug, color, sort_order) values
  ('Exterior',  'exterior',  'bg-blue-500/15 text-blue-400',     1),
  ('Full',      'full',      'bg-success/15 text-success',       2),
  ('Premium',   'premium',   'bg-purple-500/15 text-purple-400', 3),
  ('Specialty', 'specialty', 'bg-gold/15 text-gold',             4),
  ('Interior',  'interior',  'bg-orange-400/15 text-orange-300', 5)
on conflict (lower(slug)) do nothing;

-- Reload PostgREST schema cache after column additions
notify pgrst, 'reload schema';
