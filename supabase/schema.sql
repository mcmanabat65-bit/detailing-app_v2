-- =====================================================================
-- Samahuzai Carwash and Auto Detailing — Schema
-- Run FIRST in Supabase SQL Editor.
-- Safe to re-run: all creates are guarded with IF EXISTS / OR REPLACE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

create table if not exists settings (
  id integer primary key default 1,
  detailer_pool_size integer not null default 5 check (detailer_pool_size >= 1),
  default_detailers_per_booking integer not null default 1 check (default_detailers_per_booking >= 1),
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id) values (1) on conflict (id) do nothing;

create table if not exists members (
  id text primary key,
  name text not null,
  nickname text,
  email text not null,
  phone text not null,
  member_since timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_at timestamptz
);

create unique index if not exists members_email_lower_idx on members (lower(email));
create index if not exists members_status_idx on members (status);

create table if not exists services (
  id integer primary key generated always as identity,
  name text not null,
  description text,
  price integer not null,
  duration text not null,
  category text not null,
  inclusions text[] not null default '{}',
  popular boolean not null default false,
  min_detailers integer not null default 1,
  recommended_detailers integer not null default 1,
  sort_order integer not null default 0
);

insert into services (id, name, price, duration, category, inclusions, popular, min_detailers, recommended_detailers, sort_order) values
  (1, 'The Essential',      1500,  '2–3 hrs',  'exterior', array['Exterior Hand Wash','Tire Dressing','Window Cleaning','Interior Vacuum'],                                                               false, 1, 1, 1),
  (2, 'The Executive',      3500,  '4–5 hrs',  'full',     array['Full Exterior Detail','Clay Bar Treatment','Interior Deep Clean','Dashboard Polish','Leather Conditioning','Engine Bay Cleaning'],      true,  1, 2, 2),
  (3, 'The Obsidian Elite', 6000,  '6–8 hrs',  'premium',  array['Everything in Executive','Paint Correction','Ceramic Coating Prep','Odor Elimination','Headlight Restoration','VIP Lounge Priority'],  false, 2, 3, 3),
  (4, 'Paint Correction',   4500,  '5–6 hrs',  'specialty',array['Multi-stage paint correction','Swirl mark removal','Oxidation treatment','Final polish & seal'],                                       false, 1, 2, 4),
  (5, 'Ceramic Coating',    12000, '1–2 days', 'specialty',array['Surface decontamination','Paint correction','Professional ceramic coat application','2-year protection warranty'],                     false, 2, 3, 5),
  (6, 'Interior Rescue',    2500,  '3–4 hrs',  'interior', array['Deep vacuum','Shampoo carpets & seats','Steam clean vents','Stain treatment','Deodorize & sanitize'],                                  false, 1, 1, 6)
on conflict (id) do nothing;

create table if not exists bookings (
  id text primary key,
  service_id integer not null,
  service_name text not null,
  service_price integer not null,
  service_duration text not null,
  service_category text,
  date date not null,
  time text not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  vehicle text,
  vehicle_year text,
  notes text,
  is_vip boolean not null default false,
  member_id text,
  coffee_order text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  cancellation_reason text,
  detailers_assigned uuid[] not null default '{}',
  occupies_slots text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx   on bookings (date);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_email_idx  on bookings (lower(email));

create table if not exists blocked_slots (
  id text primary key,
  date date not null,
  time text not null,
  label text not null default 'Unavailable',
  created_at timestamptz not null default now()
);

create unique index if not exists blocked_slots_date_time_idx on blocked_slots (date, time);

create table if not exists coffees (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists coffees_name_lower_idx on coffees (lower(name));
create index if not exists coffees_sort_idx on coffees (sort_order);

-- Service categories — admin-managed list that populates the category
-- dropdown when adding / editing services.
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

-- The cars table is a shared CATALOG of vehicles selectable at booking
-- time. Membership ownership lives in the member_cars junction below.
create table if not exists cars (
  id uuid primary key default gen_random_uuid(),
  make text not null,
  year integer not null check (year >= 1900 and year <= 2100),
  model text not null,
  size text not null check (size in ('small', 'medium', 'large', 'xl')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migration: an earlier draft scoped cars per-member. If those structures
-- still exist on this database, drop them so cars becomes a global catalog.
do $$ begin
  if exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'cars_member_id_fkey' and table_name = 'cars'
  ) then
    alter table cars drop constraint cars_member_id_fkey;
  end if;
end $$;
drop index if exists cars_member_idx;
drop index if exists cars_member_make_model_year_idx;
alter table cars drop column if exists member_id;

create index        if not exists cars_make_idx           on cars (lower(make));
create index        if not exists cars_model_idx          on cars (lower(model));
create unique index if not exists cars_make_model_year_idx
  on cars (lower(make), lower(model), year);

-- Junction: which catalog cars each member owns. Sort order determines
-- the default-selected car in the booking flow.
create table if not exists member_cars (
  id uuid primary key default gen_random_uuid(),
  member_id text not null references members(id) on delete cascade,
  car_id uuid not null references cars(id) on delete cascade,
  plate_number text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (member_id, car_id)
);

create index if not exists member_cars_member_idx on member_cars (member_id);
create index if not exists member_cars_car_idx    on member_cars (car_id);

-- Recurring detailing schedules per VIP member.
-- Each row = one day-of-week + time + service combo for a specific car.
-- day_of_week: 0 = Sunday … 6 = Saturday (matches JS getDay()).
create table if not exists recurring_schedules (
  id             uuid primary key default gen_random_uuid(),
  member_id      text not null references members(id) on delete cascade,
  car_id         uuid references cars(id) on delete set null,
  service_id     integer not null references services(id) on delete restrict,
  day_of_week    integer not null check (day_of_week between 0 and 6),
  preferred_time text not null,
  is_active      boolean not null default true,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists recurring_schedules_member_idx on recurring_schedules (member_id);
create index if not exists recurring_schedules_active_idx on recurring_schedules (member_id, is_active);

-- ---------------------------------------------------------------------
-- RPC: add_booking — atomic capacity-aware insert
-- ---------------------------------------------------------------------
create or replace function add_booking(
  p jsonb,
  p_occupies_slots text[]
) returns jsonb
language plpgsql
as $$
declare
  v_pool int;
  v_used int;
  v_min int := 2147483647;
  v_slot text;
  v_min_detailers int;
  v_detailer_ids uuid[];
  v_requested int;
  v_clamped_ids uuid[];
  v_id text;
  v_date date;
  v_row bookings;
begin
  v_date := (p->>'date')::date;
  perform pg_advisory_xact_lock(hashtext(v_date::text));

  select detailer_pool_size into v_pool from settings where id = 1;
  v_min_detailers := coalesce((p->>'min_detailers')::int, 1);

  -- Parse the detailer IDs array from the payload
  v_detailer_ids := coalesce(
    (select array_agg(v::uuid) from jsonb_array_elements_text(p->'detailers_assigned') v),
    '{}'::uuid[]
  );
  v_requested := coalesce(array_length(v_detailer_ids, 1), 0);
  if v_requested < 1 then v_requested := 1; end if;

  foreach v_slot in array p_occupies_slots loop
    select coalesce(sum(array_length(detailers_assigned, 1)), 0) into v_used
    from bookings
    where date = v_date
      and status not in ('cancelled', 'no_show')
      and v_slot = any (occupies_slots);
    v_min := least(v_min, v_pool - v_used);
  end loop;

  if v_min < v_min_detailers then
    return jsonb_build_object(
      'error',
      'This time slot just filled up. Please choose another.'
    );
  end if;

  -- Clamp to available capacity
  v_clamped_ids := v_detailer_ids[1:least(v_requested, v_min)];

  v_id := coalesce(
    nullif(p->>'id', ''),
    'OBS-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0')
  );

  insert into bookings (
    id, service_id, service_name, service_price, service_duration, service_category,
    date, time, customer_name, email, phone, vehicle, vehicle_year, notes,
    is_vip, member_id, coffee_order, status, detailers_assigned, occupies_slots
  ) values (
    v_id,
    (p->>'service_id')::int,
    p->>'service_name',
    (p->>'service_price')::int,
    p->>'service_duration',
    p->>'service_category',
    v_date,
    p->>'time',
    p->>'customer_name',
    p->>'email',
    p->>'phone',
    p->>'vehicle',
    p->>'vehicle_year',
    p->>'notes',
    coalesce((p->>'is_vip')::boolean, false),
    nullif(p->>'member_id', ''),
    p->>'coffee_order',
    coalesce(nullif(p->>'status', ''), 'pending'),
    v_clamped_ids,
    p_occupies_slots
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_booking_detailers
-- ---------------------------------------------------------------------
create or replace function update_booking_detailers(
  p_id text,
  p_detailer_ids uuid[],
  p_min_detailers int
) returns jsonb
language plpgsql
as $$
declare
  v_pool int;
  v_used int;
  v_min int := 2147483647;
  v_count int;
  v_slot text;
  v_booking bookings;
  v_row bookings;
begin
  v_count := coalesce(array_length(p_detailer_ids, 1), 0);

  if v_count < 1 then
    return jsonb_build_object('error', 'At least one detailer must be assigned.');
  end if;

  select * into v_booking from bookings where id = p_id;
  if v_booking is null then
    return jsonb_build_object('error', 'Booking not found.');
  end if;

  if v_count < p_min_detailers then
    return jsonb_build_object(
      'error',
      'Service requires at least ' || p_min_detailers || ' detailer(s).'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_booking.date::text));

  select detailer_pool_size into v_pool from settings where id = 1;

  foreach v_slot in array v_booking.occupies_slots loop
    select coalesce(sum(array_length(detailers_assigned, 1)), 0) into v_used
    from bookings
    where date = v_booking.date
      and id <> p_id
      and status not in ('cancelled', 'no_show')
      and v_slot = any (occupies_slots);
    v_min := least(v_min, v_pool - v_used);
  end loop;

  if v_count > v_min then
    return jsonb_build_object(
      'error',
      'Only ' || v_min || ' detailer(s) available across this booking''s hours.'
    );
  end if;

  update bookings set detailers_assigned = p_detailer_ids where id = p_id
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_settings
-- ---------------------------------------------------------------------
create or replace function update_settings(
  p_pool_size int,
  p_default_per_booking int
) returns jsonb
language plpgsql
as $$
declare
  v_peak int;
  v_row settings;
begin
  if p_pool_size < 1 then
    return jsonb_build_object('error', 'Pool size must be at least 1.');
  end if;
  if p_default_per_booking < 1 then
    return jsonb_build_object('error', 'Default detailers per booking must be at least 1.');
  end if;
  if p_default_per_booking > p_pool_size then
    return jsonb_build_object('error', 'Default detailers per booking cannot exceed pool size.');
  end if;

  select coalesce(max(slot_total), 0) into v_peak
  from (
    select date, slot, sum(detailers_assigned) as slot_total
    from (
      select b.date, unnest(b.occupies_slots) as slot, b.detailers_assigned
      from bookings b
      where b.status not in ('cancelled', 'no_show')
    ) t
    group by date, slot
  ) s;

  if p_pool_size < v_peak then
    return jsonb_build_object(
      'error',
      'Pool size cannot drop below ' || v_peak || ' — existing bookings already use that many detailers in one hour.'
    );
  end if;

  update settings
    set detailer_pool_size = p_pool_size,
        default_detailers_per_booking = p_default_per_booking,
        updated_at = now()
    where id = 1
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table bookings           enable row level security;
alter table members            enable row level security;
alter table blocked_slots      enable row level security;
alter table settings           enable row level security;
alter table services           enable row level security;
alter table cars               enable row level security;
alter table member_cars           enable row level security;
alter table recurring_schedules   enable row level security;
alter table coffees               enable row level security;
alter table service_categories enable row level security;

drop policy if exists "anon all bookings"            on bookings;
drop policy if exists "anon all members"             on members;
drop policy if exists "anon all blocked_slots"       on blocked_slots;
drop policy if exists "anon all settings"            on settings;
drop policy if exists "anon all services"            on services;
drop policy if exists "public all bookings"          on bookings;
drop policy if exists "public all members"           on members;
drop policy if exists "public all blocked_slots"     on blocked_slots;
drop policy if exists "public all settings"          on settings;
drop policy if exists "public all services"          on services;
drop policy if exists "public all cars"              on cars;
drop policy if exists "public all member_cars"           on member_cars;
drop policy if exists "public all recurring_schedules"   on recurring_schedules;
drop policy if exists "public all coffees"               on coffees;
drop policy if exists "public all service_categories" on service_categories;

create policy "public all bookings"           on bookings           for all to anon, authenticated using (true) with check (true);
create policy "public all members"            on members            for all to anon, authenticated using (true) with check (true);
create policy "public all blocked_slots"      on blocked_slots      for all to anon, authenticated using (true) with check (true);
create policy "public all settings"           on settings           for all to anon, authenticated using (true) with check (true);
create policy "public all services"           on services           for all to anon, authenticated using (true) with check (true);
create policy "public all cars"               on cars               for all to anon, authenticated using (true) with check (true);
create policy "public all coffees"            on coffees            for all to anon, authenticated using (true) with check (true);
create policy "public all member_cars"           on member_cars           for all to anon, authenticated using (true) with check (true);
create policy "public all recurring_schedules"   on recurring_schedules   for all to anon, authenticated using (true) with check (true);
create policy "public all service_categories"    on service_categories    for all to anon, authenticated using (true) with check (true);

-- =====================================================================
-- ADMIN USER SETUP
-- Create your admin account via the Supabase Dashboard:
--   Authentication → Users → Add user
--   Email: admin@samahuzai.com  (or any email you prefer)
--   Password: (choose a strong password)
--   Toggle "Auto Confirm User": ON
-- =====================================================================
