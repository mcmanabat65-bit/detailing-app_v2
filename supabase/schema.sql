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

insert into services (id, name, price, duration, category, inclusions, popular, min_detailers, recommended_detailers, sort_order)
overriding system value
values
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
  car_id uuid,
  coffee_order text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'completed')),
  cancellation_reason text,
  detailers_assigned uuid[] not null default '{}',
  occupies_slots text[] not null default '{}',
  add_ons jsonb not null default '[]',
  nickname text,
  vehicle_type smallint not null default 1 check (vehicle_type in (1, 2)),
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
  vehicle_type smallint not null default 1 check (vehicle_type in (1, 2)),
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

-- Admin-recorded condition snapshot per car visit, linked to member_cars + optionally a booking.
-- Feeds the AI Intelligence Layer: health scores, condition trends, predictive recommendations.
create table if not exists car_condition_logs (
  id                 uuid primary key default gen_random_uuid(),
  member_car_id      uuid not null references member_cars(id) on delete cascade,
  booking_id         text references bookings(id) on delete set null,
  overall_rating     integer not null check (overall_rating between 1 and 10),
  exterior_rating    integer check (exterior_rating between 1 and 10),
  interior_rating    integer check (interior_rating between 1 and 10),
  exterior_condition text check (exterior_condition in ('excellent', 'good', 'fair', 'poor')),
  interior_condition text check (interior_condition in ('excellent', 'good', 'fair', 'poor')),
  mileage            integer check (mileage >= 0),
  notes              text,
  recorded_at        timestamptz not null default now()
);
create index if not exists car_condition_logs_member_car_idx on car_condition_logs (member_car_id);
create index if not exists car_condition_logs_booking_idx    on car_condition_logs (booking_id);
create index if not exists car_condition_logs_recorded_idx   on car_condition_logs (member_car_id, recorded_at desc);

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

-- Admin-managed catalog of common add-on services.
-- Quick-pick items shown when the admin adds extras to a booking.
create table if not exists addon_catalog (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  default_price integer not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists addon_catalog_name_lower_idx on addon_catalog (lower(name));
create index  if not exists addon_catalog_sort_idx             on addon_catalog (sort_order);

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
  v_conflict_names text;
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

  -- Per-detailer conflict guard: a specific detailer cannot be assigned to
  -- two bookings whose slots overlap on the same date.
  select string_agg(distinct dt.name, ', ') into v_conflict_names
  from bookings b
  cross join lateral unnest(b.detailers_assigned) as busy(id)
  join detailers dt on dt.id = busy.id
  where b.date = v_date
    and b.status not in ('cancelled', 'no_show')
    and b.occupies_slots && p_occupies_slots
    and busy.id = any (v_detailer_ids);

  if v_conflict_names is not null then
    return jsonb_build_object(
      'error',
      'Already booked at this time: ' || v_conflict_names || '. Choose a different detailer or time slot.'
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
    date, time, customer_name, nickname, email, phone, vehicle, vehicle_year, notes,
    is_vip, member_id, car_id, coffee_order, status, detailers_assigned, occupies_slots,
    vehicle_type
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
    nullif(p->>'nickname', ''),
    p->>'email',
    p->>'phone',
    p->>'vehicle',
    p->>'vehicle_year',
    p->>'notes',
    coalesce((p->>'is_vip')::boolean, false),
    nullif(p->>'member_id', ''),
    nullif(p->>'car_id', '')::uuid,
    p->>'coffee_order',
    coalesce(nullif(p->>'status', ''), 'pending'),
    v_clamped_ids,
    p_occupies_slots,
    coalesce((nullif(p->>'vehicle_type', ''))::smallint, 1)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_booking_detailers
-- ---------------------------------------------------------------------
-- SECURITY DEFINER so any signed-in staff (admin or super_admin) can assign
-- detailers without table-level UPDATE rights — it only writes detailers_assigned.
create or replace function update_booking_detailers(
  p_id text,
  p_detailer_ids uuid[],
  p_min_detailers int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pool int;
  v_used int;
  v_min int := 2147483647;
  v_count int;
  v_slot text;
  v_conflict_names text;
  v_booking bookings;
  v_row bookings;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;

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

  -- Per-detailer conflict guard: a specific detailer cannot be assigned to
  -- two bookings whose slots overlap on the same date.
  select string_agg(distinct dt.name, ', ') into v_conflict_names
  from bookings b
  cross join lateral unnest(b.detailers_assigned) as busy(id)
  join detailers dt on dt.id = busy.id
  where b.date = v_booking.date
    and b.id <> p_id
    and b.status not in ('cancelled', 'no_show')
    and b.occupies_slots && v_booking.occupies_slots
    and busy.id = any (p_detailer_ids);

  if v_conflict_names is not null then
    return jsonb_build_object(
      'error',
      'Already booked at this time: ' || v_conflict_names || '. Choose a different detailer.'
    );
  end if;

  update bookings set detailers_assigned = p_detailer_ids where id = p_id
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_booking_status
-- Controlled path for advancing a booking's lifecycle status. SECURITY
-- DEFINER so a plain `admin` (barista) can change status without table-level
-- UPDATE rights on bookings (which stays super-admin only). Only touches
-- status + cancellation_reason and writes the audit log. Other booking edits
-- (add-ons, detailer reassignment, delete) remain super-admin only.
-- ---------------------------------------------------------------------
create or replace function public.update_booking_status(
  p_id     text,
  p_status text,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text;
  v_row  bookings;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;
  if p_status not in ('pending','confirmed','on-going','completed','cancelled','no_show') then
    return jsonb_build_object('error', 'Invalid status.');
  end if;

  select status into v_from from bookings where id = p_id;
  if v_from is null then
    return jsonb_build_object('error', 'Booking not found.');
  end if;

  update bookings
     set status = p_status,
         cancellation_reason = case when p_status = 'cancelled' then p_reason else cancellation_reason end
   where id = p_id
   returning * into v_row;

  insert into booking_status_logs (booking_id, from_status, to_status, notes)
  values (p_id, v_from, p_status, p_reason);

  return to_jsonb(v_row);
end;
$$;
grant execute on function public.update_booking_status(text, text, text) to authenticated;
grant execute on function update_booking_detailers(text, uuid[], int) to authenticated;

-- ---------------------------------------------------------------------
-- RPC: update_booking_addons
-- Controlled path for editing a booking's add-ons. SECURITY DEFINER so any
-- signed-in staff can manage add-ons without table-level UPDATE rights — it
-- only writes the add_ons column.
-- ---------------------------------------------------------------------
create or replace function public.update_booking_addons(
  p_id     text,
  p_addons jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row bookings;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;
  if jsonb_typeof(p_addons) <> 'array' then
    return jsonb_build_object('error', 'Add-ons must be an array.');
  end if;

  update bookings set add_ons = p_addons where id = p_id
    returning * into v_row;
  if v_row is null then
    return jsonb_build_object('error', 'Booking not found.');
  end if;

  return to_jsonb(v_row);
end;
$$;
grant execute on function public.update_booking_addons(text, jsonb) to authenticated;

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
    select date, slot, sum(coalesce(array_length(detailers_assigned, 1), 0)) as slot_total
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
-- Admin roles — maps an admin's login email to a role.
--   super_admin : the boss; unrestricted.
--   admin       : limited staff (e.g. barista) — create/view bookings only.
-- Resolution is by email match against the logged-in Supabase Auth user.
-- If this table is EMPTY, the first logged-in user is treated as super_admin
-- (bootstrap), so the boss can sign in and assign roles via the Staff page.
-- Defined before RLS so is_super_admin() (below) can reference it.
-- ---------------------------------------------------------------------
create table if not exists admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null default 'admin' check (role in ('super_admin', 'admin')),
  created_at timestamptz not null default now()
);

-- Helper: is the *current* user a super admin?
-- SECURITY DEFINER so it can read admin_users regardless of that table's RLS.
-- Bootstrap: empty admin_users → any authenticated user counts as super_admin.
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
     and (
       exists (
         select 1 from admin_users
         where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
           and role = 'super_admin'
       )
       -- Bootstrap: "no super_admin configured" (not "table empty") so adding a
       -- plain admin can't lock the boss out before they add themselves.
       or not exists (select 1 from admin_users where role = 'super_admin')
     );
$$;

-- Helper: the approved member id for the *current* user (or null).
-- Backs member-portal RLS so a signed-in member can touch only their own rows.
-- SECURITY DEFINER so it reads members regardless of that table's RLS.
create or replace function public.current_member_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select id from members
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and status = 'approved'
  limit 1
$$;

-- Members may update their OWN row, but never their email (auth identity) or
-- status (admin-controlled). This trigger enforces that for non-super-admins.
create or replace function public.members_self_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    if new.email is distinct from old.email then
      raise exception 'Members cannot change their email.';
    end if;
    if new.status is distinct from old.status then
      raise exception 'Members cannot change their membership status.';
    end if;
    new.member_since := old.member_since;
    new.decided_at   := old.decided_at;
  end if;
  return new;
end;
$$;

drop trigger if exists members_self_update_guard on members;
create trigger members_self_update_guard
  before update on members
  for each row execute function public.members_self_update_guard();

-- ---------------------------------------------------------------------
-- Row Level Security (role-based — see migrations.sql Phase 3 for notes)
-- Reads stay open so the public site & admin UI keep working; sensitive
-- WRITES require a super_admin. Public flows keep their anon write carve-outs.
-- ---------------------------------------------------------------------
alter table bookings             enable row level security;
alter table members              enable row level security;
alter table blocked_slots        enable row level security;
alter table settings             enable row level security;
alter table services             enable row level security;
alter table cars                 enable row level security;
alter table member_cars          enable row level security;
alter table car_condition_logs   enable row level security;
alter table recurring_schedules  enable row level security;
alter table addon_catalog        enable row level security;
alter table coffees              enable row level security;
alter table service_categories   enable row level security;
alter table admin_users          enable row level security;

-- Drop any prior wide-open policies
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
drop policy if exists "public all member_cars"       on member_cars;
drop policy if exists "admin all car_condition_logs" on car_condition_logs;
drop policy if exists "public all recurring_schedules" on recurring_schedules;
drop policy if exists "public all addon_catalog"     on addon_catalog;
drop policy if exists "public all coffees"           on coffees;
drop policy if exists "public all service_categories" on service_categories;
drop policy if exists "admin all admin_users"        on admin_users;

-- Drop the role-based policy names too, so this script stays re-runnable.
do $$
declare
  r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in (
        'bookings','members','cars','member_cars','car_condition_logs',
        'admin_users','services','service_categories','coffees','addon_catalog',
        'settings','blocked_slots','recurring_schedules'
      )
  loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- bookings: anyone reads; anon + staff create; only super_admin edits/deletes
create policy "bookings_select" on bookings for select to anon, authenticated using (true);
create policy "bookings_insert" on bookings for insert to anon, authenticated with check (true);
create policy "bookings_update" on bookings for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "bookings_delete" on bookings for delete to authenticated using (is_super_admin());

-- members: anyone reads; anon applies; only super_admin manages
create policy "members_select"      on members for select to anon, authenticated using (true);
-- Public VIP application — anyone may submit a pending member row. Authenticated
-- is allowed too (a visitor may already hold a session, e.g. from a prior
-- portal sign-up); approvals/edits stay super_admin-only via members_update.
create policy "members_insert_anon" on members for insert to anon with check (true);
create policy "members_insert_auth" on members for insert to authenticated with check (true);
-- super_admin manages anyone; a member may update their own row (email/status
-- kept immutable by the members_self_update_guard trigger above).
create policy "members_update"      on members for update to authenticated using (is_super_admin() or id = current_member_id()) with check (is_super_admin() or id = current_member_id());
create policy "members_delete"      on members for delete to authenticated using (is_super_admin());

-- cars & member_cars: read open; anon + staff add (membership/booking); super edits/deletes
create policy "cars_select" on cars for select to anon, authenticated using (true);
create policy "cars_insert" on cars for insert to anon, authenticated with check (true);
create policy "cars_update" on cars for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "cars_delete" on cars for delete to authenticated using (is_super_admin());
create policy "member_cars_select" on member_cars for select to anon, authenticated using (true);
create policy "member_cars_insert" on member_cars for insert to anon, authenticated with check (true);
-- super_admin manages any fleet; a member may manage cars in their own fleet.
create policy "member_cars_update" on member_cars for update to authenticated using (is_super_admin() or member_id = current_member_id()) with check (is_super_admin() or member_id = current_member_id());
create policy "member_cars_delete" on member_cars for delete to authenticated using (is_super_admin() or member_id = current_member_id());

-- car_condition_logs: staff read (PII — no anon); super_admin writes
create policy "ccl_select" on car_condition_logs for select to authenticated using (true);
create policy "ccl_insert" on car_condition_logs for insert to authenticated with check (is_super_admin());
create policy "ccl_update" on car_condition_logs for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "ccl_delete" on car_condition_logs for delete to authenticated using (is_super_admin());

-- admin_users: any staff may read (role resolution); super_admin manages
create policy "admin_users_select" on admin_users for select to authenticated using (true);
create policy "admin_users_insert" on admin_users for insert to authenticated with check (is_super_admin());
create policy "admin_users_update" on admin_users for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "admin_users_delete" on admin_users for delete to authenticated using (is_super_admin());

-- Super-admin-managed catalogs (read open, writes super_admin only)
do $$
declare t text;
begin
  foreach t in array array[
    'services','service_categories','coffees','addon_catalog',
    'settings','blocked_slots','recurring_schedules'
  ] loop
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t||'_select', t);
    execute format('create policy %I on %I for insert to authenticated with check (is_super_admin())', t||'_insert', t);
    execute format('create policy %I on %I for update to authenticated using (is_super_admin()) with check (is_super_admin())', t||'_update', t);
    execute format('create policy %I on %I for delete to authenticated using (is_super_admin())', t||'_delete', t);
  end loop;
end $$;

-- Seed the boss account here (or do it from the in-app Staff page after first login):
--   insert into admin_users (email, role) values ('boss@samahuzai.com', 'super_admin')
--   on conflict (email) do update set role = excluded.role;

-- =====================================================================
-- ADMIN USER SETUP
-- Create your admin account via the Supabase Dashboard:
--   Authentication → Users → Add user
--   Email: admin@samahuzai.com  (or any email you prefer)
--   Password: (choose a strong password)
--   Toggle "Auto Confirm User": ON
-- Then assign its role in admin_users (or via the in-app Staff page).
-- =====================================================================
