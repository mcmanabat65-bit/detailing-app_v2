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

-- Auto-increment services.id (Phase 1.4)
-- services.id was a plain integer primary key — convert to auto-incrementing
-- so new services get their id assigned by the database automatically.
-- Also add a trigger to auto-assign sort_order = max(sort_order) + 1 on insert
-- so new services always appear last without the admin setting it manually.
alter table services alter column id add generated always as identity;
select setval(pg_get_serial_sequence('services', 'id'), (select coalesce(max(id), 0) from services));

create or replace function services_auto_sort_order()
returns trigger language plpgsql as $$
begin
  if new.sort_order = 0 or new.sort_order is null then
    select coalesce(max(sort_order), 0) + 1 into new.sort_order from services;
  end if;
  return new;
end;
$$;

drop trigger if exists services_auto_sort_order_trigger on services;
create trigger services_auto_sort_order_trigger
  before insert on services
  for each row execute function services_auto_sort_order();

-- Reload PostgREST schema cache after column additions
notify pgrst, 'reload schema';

-- Add detailers table (Phase 1.5)
create table if not exists detailers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text,
  role text not null default 'Detailer',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists detailers_sort_idx on detailers (sort_order, name);
alter table detailers enable row level security;
drop policy if exists "public all detailers" on detailers;
create policy "public all detailers" on detailers for all to anon, authenticated using (true) with check (true);
-- end: detailers table

-- Expand booking statuses: add pending (awaiting admin confirmation) and completed (service done)
-- Phase 2 — Admin Confirmation + Earnings Tracking
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'completed'));
alter table bookings alter column status set default 'pending';