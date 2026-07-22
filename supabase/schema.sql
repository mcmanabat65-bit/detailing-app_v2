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
  -- Default closing cutoff as minutes since midnight (1020 = 5:00 PM). A booking
  -- whose end time crosses this counts as "overflow" unless staff opt to extend.
  closing_minutes integer not null default 1020 check (closing_minutes between 1 and 1439),
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
  -- Heads this booking reserves against the pool. `detailers_assigned` is the
  -- optional list of *specific* detailers and is always a subset, so
  -- detailers_count >= array_length(detailers_assigned, 1). Every capacity sum
  -- reads this column — never array_length, which is NULL for an unassigned
  -- booking and would silently count it as zero.
  detailers_count integer not null default 1 check (detailers_count >= 1),
  occupies_slots text[] not null default '{}',
  add_ons jsonb not null default '[]',
  nickname text,
  vehicle_type smallint not null default 1 check (vehicle_type in (1, 2)),
  coffee_served_at timestamptz,
  started_at   timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx   on bookings (date);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_email_idx  on bookings (lower(email));

-- Cross-date occupancy: one row per (booking, date, slot) the job touches.
-- A short booking has rows only on its start date; a long/multi-day booking
-- has rows spanning several dates (with partial first/last days). This is the
-- authoritative record for capacity + detailer-conflict checks across days.
-- `bookings.date` / `bookings.occupies_slots` stay as the day-1 values for the
-- schedule/monitor views that key off a single date.
create table if not exists booking_day_slots (
  booking_id text not null references bookings (id) on delete cascade,
  date date not null,
  slot text not null,
  primary key (booking_id, date, slot)
);
create index if not exists booking_day_slots_date_idx on booking_day_slots (date);

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
  selling_price numeric(10,2) not null default 0,
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
-- `p_day_slots` is the cross-date plan: a jsonb array of { "date", "slots":[] }.
-- Capacity and per-detailer conflict are checked across EVERY (date, slot) pair
-- the job touches, not just the start date. `p_occupies_slots` is retained as
-- the day-1 slot list for the legacy `bookings.occupies_slots` column. When
-- `p_day_slots` is null/empty it falls back to a single day built from
-- `p_occupies_slots` on the start date (backward compatible).
create or replace function add_booking(
  p jsonb,
  p_occupies_slots text[],
  p_day_slots jsonb default null
) returns jsonb
language plpgsql
as $$
declare
  v_pool int;
  v_used int;
  v_min int := 2147483647;
  v_min_detailers int;
  v_detailer_ids uuid[];
  v_named int;
  v_headcount int;
  v_clamped_ids uuid[];
  v_conflict_names text;
  v_id text;
  v_date date;
  v_row bookings;
  v_plan jsonb;
  v_cell record;
  v_d date;
begin
  v_date := (p->>'date')::date;

  -- Normalize the plan: use p_day_slots when given, else synthesize one day
  -- from p_occupies_slots on the start date.
  if p_day_slots is not null and jsonb_array_length(p_day_slots) > 0 then
    v_plan := p_day_slots;
  else
    v_plan := jsonb_build_array(
      jsonb_build_object('date', to_char(v_date, 'YYYY-MM-DD'), 'slots', to_jsonb(p_occupies_slots))
    );
  end if;

  -- Lock every distinct date the job touches (sorted, to avoid deadlocks).
  for v_d in
    select distinct (elem->>'date')::date as d
    from jsonb_array_elements(v_plan) elem
    order by d
  loop
    perform pg_advisory_xact_lock(hashtext(v_d::text));
  end loop;

  select detailer_pool_size into v_pool from settings where id = 1;
  v_min_detailers := coalesce((p->>'min_detailers')::int, 1);

  v_detailer_ids := coalesce(
    (select array_agg(v::uuid) from jsonb_array_elements_text(p->'detailers_assigned') v),
    '{}'::uuid[]
  );
  v_named := coalesce(array_length(v_detailer_ids, 1), 0);

  -- Heads this booking reserves: whatever the caller asked for, but never
  -- fewer than the named detailers or the service's minimum.
  v_headcount := greatest(
    coalesce((p->>'detailers_count')::int, 1),
    v_named,
    v_min_detailers,
    1
  );

  -- Capacity: for every (date, slot) in the plan, how many detailers are free?
  for v_cell in
    select (elem->>'date')::date as d, s.slot
    from jsonb_array_elements(v_plan) elem
    cross join lateral jsonb_array_elements_text(elem->'slots') s(slot)
  loop
    select coalesce(sum(b.detailers_count), 0) into v_used
    from booking_day_slots bds
    join bookings b on b.id = bds.booking_id
    where bds.date = v_cell.d
      and bds.slot = v_cell.slot
      and b.status not in ('cancelled', 'no_show');
    v_min := least(v_min, v_pool - v_used);
  end loop;

  -- Gate on the service minimum (mirrors the client's availability check),
  -- then trim the reservation to what is actually free.
  if v_min < v_min_detailers then
    return jsonb_build_object(
      'error',
      'This time slot just filled up. Please choose another.'
    );
  end if;
  v_headcount := greatest(least(v_headcount, v_min), v_min_detailers);

  -- Per-detailer conflict: a requested detailer must not already occupy any
  -- (date, slot) this job touches.
  select string_agg(distinct dt.name, ', ') into v_conflict_names
  from jsonb_array_elements(v_plan) elem
  cross join lateral jsonb_array_elements_text(elem->'slots') s(slot)
  join booking_day_slots bds
    on bds.date = (elem->>'date')::date and bds.slot = s.slot
  join bookings b on b.id = bds.booking_id and b.status not in ('cancelled', 'no_show')
  cross join lateral unnest(b.detailers_assigned) as busy(id)
  join detailers dt on dt.id = busy.id
  where busy.id = any (v_detailer_ids);

  if v_conflict_names is not null then
    return jsonb_build_object(
      'error',
      'Already booked at this time: ' || v_conflict_names || '. Choose a different detailer or time slot.'
    );
  end if;

  v_clamped_ids := v_detailer_ids[1:least(v_named, v_headcount)];

  v_id := coalesce(
    nullif(p->>'id', ''),
    'OBS-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0')
  );

  insert into bookings (
    id, service_id, service_name, service_price, service_duration, service_category,
    date, time, customer_name, nickname, email, phone, vehicle, vehicle_year, notes,
    is_vip, member_id, car_id, coffee_order, status, detailers_assigned, detailers_count,
    occupies_slots, vehicle_type
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
    v_headcount,
    p_occupies_slots,
    coalesce((nullif(p->>'vehicle_type', ''))::smallint, 1)
  )
  returning * into v_row;

  -- Record the full cross-date occupancy.
  insert into booking_day_slots (booking_id, date, slot)
  select v_id, (elem->>'date')::date, s.slot
  from jsonb_array_elements(v_plan) elem
  cross join lateral jsonb_array_elements_text(elem->'slots') s(slot)
  on conflict do nothing;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_booking_detailers
-- ---------------------------------------------------------------------
-- SECURITY DEFINER so any signed-in staff (admin or super_admin) can assign
-- detailers without table-level UPDATE rights — it only writes
-- detailers_assigned + detailers_count.
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
  v_conflict_names text;
  v_booking bookings;
  v_row bookings;
  v_span jsonb;
  v_cell record;
  v_d date;
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

  -- The booking's full cross-date span as [{date, slot}] — matching what
  -- add_booking enforces. Checking only bookings.date + occupies_slots would
  -- miss the continuation days of a job that rolls past closing. Falls back to
  -- the day-1 columns for bookings created before booking_day_slots existed.
  select coalesce(
    (select jsonb_agg(jsonb_build_object('date', bds.date, 'slot', bds.slot))
       from booking_day_slots bds
      where bds.booking_id = p_id),
    (select jsonb_agg(jsonb_build_object('date', v_booking.date, 'slot', s.slot))
       from unnest(v_booking.occupies_slots) as s(slot))
  ) into v_span;

  if v_span is null then
    return jsonb_build_object('error', 'Booking has no scheduled slots.');
  end if;

  -- Lock every distinct date the job touches (sorted, to avoid deadlocks).
  for v_d in
    select distinct (elem->>'date')::date as d
    from jsonb_array_elements(v_span) elem
    order by d
  loop
    perform pg_advisory_xact_lock(hashtext(v_d::text));
  end loop;

  select detailer_pool_size into v_pool from settings where id = 1;

  for v_cell in
    select (elem->>'date')::date as d, elem->>'slot' as slot
    from jsonb_array_elements(v_span) elem
  loop
    select coalesce(sum(b.detailers_count), 0) into v_used
    from booking_day_slots bds
    join bookings b on b.id = bds.booking_id
    where bds.date = v_cell.d
      and bds.slot = v_cell.slot
      and b.id <> p_id
      and b.status not in ('cancelled', 'no_show');
    v_min := least(v_min, v_pool - v_used);
  end loop;

  if v_count > v_min then
    return jsonb_build_object(
      'error',
      'Only ' || v_min || ' detailer(s) available across this booking''s hours.'
    );
  end if;

  -- Per-detailer conflict guard: a requested detailer must not already occupy
  -- any (date, slot) in this booking's span.
  select string_agg(distinct dt.name, ', ') into v_conflict_names
  from jsonb_array_elements(v_span) elem
  join booking_day_slots bds
    on bds.date = (elem->>'date')::date and bds.slot = elem->>'slot'
  join bookings b
    on b.id = bds.booking_id
   and b.id <> p_id
   and b.status not in ('cancelled', 'no_show')
  cross join lateral unnest(b.detailers_assigned) as busy(id)
  join detailers dt on dt.id = busy.id
  where busy.id = any (p_detailer_ids);

  if v_conflict_names is not null then
    return jsonb_build_object(
      'error',
      'Already booked at this time: ' || v_conflict_names || '. Choose a different detailer.'
    );
  end if;

  update bookings
    set detailers_assigned = p_detailer_ids,
        detailers_count = greatest(v_count, p_min_detailers, 1)
    where id = p_id
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

  -- NOTE: Coffee inventory is NOT deducted here. Serving a VIP's coffee (and the
  -- resulting stock deduction) happens in the barista POS via tender_pos_order.
  -- See "Barista POS" further below.

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
  p_default_per_booking int,
  p_closing_minutes int default null
) returns jsonb
language plpgsql
as $$
declare
  v_peak int;
  v_row settings;
  v_closing int;
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

  -- Null = leave closing time unchanged; otherwise validate the new value.
  select closing_minutes into v_closing from settings where id = 1;
  if p_closing_minutes is not null then
    if p_closing_minutes < 1 or p_closing_minutes > 1439 then
      return jsonb_build_object('error', 'Closing time must be a valid time of day.');
    end if;
    v_closing := p_closing_minutes;
  end if;

  -- Peak heads in any one (date, slot) — measured across every date a job
  -- touches (booking_day_slots), using the same headcount the capacity checks
  -- use.
  select coalesce(max(slot_total), 0) into v_peak
  from (
    select bds.date, bds.slot, sum(b.detailers_count) as slot_total
    from booking_day_slots bds
    join bookings b on b.id = bds.booking_id
    where b.status not in ('cancelled', 'no_show')
    group by bds.date, bds.slot
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
        closing_minutes = v_closing,
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
  -- Booking-flow service allowlist for plain admins. NULL = no restriction
  -- (may pick any service); an array limits the picker to those service ids.
  -- Ignored for super_admin. See Phase 10 in migrations.sql.
  allowed_service_ids integer[],
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

-- booking_day_slots: mirrors bookings — open read, open insert (public booking
-- flow writes these via add_booking), super-admin-only update/delete. Rows also
-- cascade-delete with their parent booking.
alter table booking_day_slots enable row level security;
drop policy if exists "booking_day_slots_select" on booking_day_slots;
drop policy if exists "booking_day_slots_insert" on booking_day_slots;
drop policy if exists "booking_day_slots_update" on booking_day_slots;
drop policy if exists "booking_day_slots_delete" on booking_day_slots;
create policy "booking_day_slots_select" on booking_day_slots for select to anon, authenticated using (true);
create policy "booking_day_slots_insert" on booking_day_slots for insert to anon, authenticated with check (true);
create policy "booking_day_slots_update" on booking_day_slots for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "booking_day_slots_delete" on booking_day_slots for delete to authenticated using (is_super_admin());

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

-- ---------------------------------------------------------------------
-- Coffee ingredient inventory (see migrations.sql Phase 8 for notes)
-- ---------------------------------------------------------------------
create table if not exists inventory_items (
  id            uuid primary key default gen_random_uuid(),
  brand         text,
  name          text not null,
  description   text,
  type          text,
  uom           text not null default 'pc',
  pack_volume   numeric(12,2),
  unit_cost     numeric(12,4) not null default 0,
  stock_qty     numeric(14,3) not null default 0,
  low_stock_at  numeric(14,3) not null default 0,
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists inventory_items_sort_idx   on inventory_items (sort_order);
create index if not exists inventory_items_active_idx  on inventory_items (is_active);

create table if not exists coffee_recipes (
  id            uuid primary key default gen_random_uuid(),
  coffee_id     uuid not null references coffees(id) on delete cascade,
  item_id       uuid not null references inventory_items(id) on delete cascade,
  qty_per_serve numeric(14,3) not null default 0 check (qty_per_serve >= 0),
  created_at    timestamptz not null default now(),
  unique (coffee_id, item_id)
);
create index if not exists coffee_recipes_coffee_idx on coffee_recipes (coffee_id);
create index if not exists coffee_recipes_item_idx   on coffee_recipes (item_id);

create table if not exists inventory_transactions (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references inventory_items(id) on delete cascade,
  qty_change   numeric(14,3) not null,
  reason       text not null default 'adjustment'
               check (reason in ('restock', 'adjustment', 'consumption', 'initial')),
  booking_id   text references bookings(id) on delete set null,
  coffee_name  text,
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists inventory_tx_item_idx    on inventory_transactions (item_id, created_at desc);
create index if not exists inventory_tx_booking_idx on inventory_transactions (booking_id);
create index if not exists inventory_tx_reason_idx  on inventory_transactions (reason);

alter table bookings add column if not exists coffee_served_at timestamptz;

alter table inventory_items        enable row level security;
alter table coffee_recipes         enable row level security;
alter table inventory_transactions enable row level security;

drop policy if exists "inventory_items_select" on inventory_items;
drop policy if exists "inventory_items_insert" on inventory_items;
drop policy if exists "inventory_items_update" on inventory_items;
drop policy if exists "inventory_items_delete" on inventory_items;
create policy "inventory_items_select" on inventory_items for select to authenticated using (true);
create policy "inventory_items_insert" on inventory_items for insert to authenticated with check (is_super_admin());
create policy "inventory_items_update" on inventory_items for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "inventory_items_delete" on inventory_items for delete to authenticated using (is_super_admin());

drop policy if exists "coffee_recipes_select" on coffee_recipes;
drop policy if exists "coffee_recipes_insert" on coffee_recipes;
drop policy if exists "coffee_recipes_update" on coffee_recipes;
drop policy if exists "coffee_recipes_delete" on coffee_recipes;
create policy "coffee_recipes_select" on coffee_recipes for select to authenticated using (true);
create policy "coffee_recipes_insert" on coffee_recipes for insert to authenticated with check (is_super_admin());
create policy "coffee_recipes_update" on coffee_recipes for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "coffee_recipes_delete" on coffee_recipes for delete to authenticated using (is_super_admin());

drop policy if exists "inventory_tx_select" on inventory_transactions;
drop policy if exists "inventory_tx_insert" on inventory_transactions;
drop policy if exists "inventory_tx_delete" on inventory_transactions;
create policy "inventory_tx_select" on inventory_transactions for select to authenticated using (true);
create policy "inventory_tx_insert" on inventory_transactions for insert to authenticated with check (is_super_admin());
create policy "inventory_tx_delete" on inventory_transactions for delete to authenticated using (is_super_admin());

create or replace function public.adjust_inventory_item(
  p_item_id   uuid,
  p_qty_change numeric,
  p_reason    text default 'adjustment',
  p_note      text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row inventory_items;
begin
  if not is_super_admin() then
    return jsonb_build_object('error', 'Not authorized.');
  end if;
  if p_reason not in ('restock', 'adjustment', 'initial') then
    return jsonb_build_object('error', 'Invalid reason.');
  end if;

  update inventory_items
     set stock_qty = stock_qty + p_qty_change, updated_at = now()
   where id = p_item_id
   returning * into v_row;

  if v_row is null then
    return jsonb_build_object('error', 'Item not found.');
  end if;

  insert into inventory_transactions (item_id, qty_change, reason, note)
  values (p_item_id, p_qty_change, p_reason, p_note);

  return to_jsonb(v_row);
end;
$$;
grant execute on function public.adjust_inventory_item(uuid, numeric, text, text) to authenticated;

create or replace function public.consume_coffee_serve(
  p_booking_id  text,
  p_coffee_name text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coffee_id uuid;
  v_already   timestamptz;
  r           record;
  v_deducted  jsonb := '[]'::jsonb;
  v_warnings  jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;
  if p_coffee_name is null or btrim(p_coffee_name) = '' then
    return jsonb_build_object('ok', true, 'skipped', 'no coffee ordered');
  end if;

  select coffee_served_at into v_already from bookings where id = p_booking_id;
  if v_already is not null then
    return jsonb_build_object('ok', true, 'skipped', 'already served');
  end if;

  select id into v_coffee_id from coffees
   where lower(name) = lower(btrim(p_coffee_name)) limit 1;

  if v_coffee_id is null then
    update bookings set coffee_served_at = now() where id = p_booking_id;
    return jsonb_build_object('ok', true, 'warnings',
      jsonb_build_array('No menu match for "' || p_coffee_name || '" — no recipe deducted.'));
  end if;

  for r in
    select cr.item_id, cr.qty_per_serve, i.name, i.uom, i.stock_qty
    from coffee_recipes cr
    join inventory_items i on i.id = cr.item_id
    where cr.coffee_id = v_coffee_id and cr.qty_per_serve > 0
  loop
    update inventory_items
       set stock_qty = stock_qty - r.qty_per_serve, updated_at = now()
     where id = r.item_id;

    insert into inventory_transactions (item_id, qty_change, reason, booking_id, coffee_name)
    values (r.item_id, -r.qty_per_serve, 'consumption', p_booking_id, p_coffee_name);

    v_deducted := v_deducted || jsonb_build_object(
      'name', r.name, 'qty', r.qty_per_serve, 'uom', r.uom);

    if r.stock_qty - r.qty_per_serve < 0 then
      v_warnings := v_warnings || to_jsonb('"' || r.name || '" is now oversold (negative stock).');
    end if;
  end loop;

  update bookings set coffee_served_at = now() where id = p_booking_id;

  return jsonb_build_object('ok', true, 'deducted', v_deducted, 'warnings', v_warnings);
end;
$$;
grant execute on function public.consume_coffee_serve(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Barista POS — free-form coffee orders (see migrations.sql Phase 9)
-- A standalone register for the barista to serve VIP members' coffee.
-- Tendering an order deducts each coffee's recipe from inventory and logs
-- a 'consumption' movement per ingredient. Orders are the source of truth
-- for coffee serving; booking completion no longer deducts stock.
-- ---------------------------------------------------------------------
create table if not exists pos_orders (
  id            uuid primary key default gen_random_uuid(),
  member_id     text references members(id) on delete set null,
  member_name   text,                 -- snapshot (walk-in or member name)
  note          text,
  item_count    integer not null default 0,
  total_cost    numeric(14,4) not null default 0,  -- estimated ingredient cost
  selling_total numeric(14,2) not null default 0,  -- customer-facing selling price total
  served_by     text,                 -- JWT email of the barista who tendered
  created_at    timestamptz not null default now()
);
create index if not exists pos_orders_created_idx on pos_orders (created_at desc);
create index if not exists pos_orders_member_idx  on pos_orders (member_id);

create table if not exists pos_order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references pos_orders(id) on delete cascade,
  coffee_id    uuid references coffees(id) on delete set null,
  coffee_name  text not null,
  qty          integer not null default 1 check (qty > 0),
  created_at   timestamptz not null default now()
);
create index if not exists pos_order_items_order_idx on pos_order_items (order_id);

alter table pos_orders      enable row level security;
alter table pos_order_items enable row level security;

-- Reads open to any signed-in staff. Writes go only through tender_pos_order
-- (SECURITY DEFINER), so no direct insert/update policy is granted.
drop policy if exists "pos_orders_select" on pos_orders;
create policy "pos_orders_select" on pos_orders for select to authenticated using (true);
drop policy if exists "pos_orders_delete" on pos_orders;
create policy "pos_orders_delete" on pos_orders for delete to authenticated using (is_super_admin());

drop policy if exists "pos_order_items_select" on pos_order_items;
create policy "pos_order_items_select" on pos_order_items for select to authenticated using (true);

-- ---------------------------------------------------------------------
-- RPC: tender_pos_order — record a coffee order + deduct ingredients.
-- SECURITY DEFINER so a plain admin (barista) can deduct stock without
-- table-level write rights on inventory. Any authenticated staff may
-- tender. Negative stock is allowed but flagged (never blocks a serve).
--
-- p_lines: jsonb array of { coffee_id (uuid|null), coffee_name, qty }.
-- Returns { ok, order_id, deducted:[{name,qty,uom}], warnings:[...] }.
-- ---------------------------------------------------------------------
create or replace function public.tender_pos_order(
  p_member_id    text,
  p_member_name  text,
  p_note         text,
  p_lines        jsonb,
  p_selling_total numeric(14,2) default 0
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id  uuid;
  v_email     text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_line      jsonb;
  v_coffee_id uuid;
  v_qty       integer;
  v_name      text;
  v_count     integer := 0;
  r           record;
  v_deducted  jsonb := '[]'::jsonb;
  v_warnings  jsonb := '[]'::jsonb;
  v_total     numeric(14,4) := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    return jsonb_build_object('error', 'Add at least one coffee to the order.');
  end if;

  insert into pos_orders (member_id, member_name, note, served_by)
  values (p_member_id, nullif(btrim(p_member_name), ''), nullif(btrim(p_note), ''), nullif(v_email, ''))
  returning id into v_order_id;

  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_qty  := greatest(1, coalesce((v_line ->> 'qty')::int, 1));
    v_name := btrim(coalesce(v_line ->> 'coffee_name', ''));
    if v_name = '' then continue; end if;

    -- Resolve the coffee id (prefer the supplied id, else match by name).
    begin
      v_coffee_id := nullif(v_line ->> 'coffee_id', '')::uuid;
    exception when others then
      v_coffee_id := null;
    end;
    if v_coffee_id is null then
      select id into v_coffee_id from coffees where lower(name) = lower(v_name) limit 1;
    end if;

    insert into pos_order_items (order_id, coffee_id, coffee_name, qty)
    values (v_order_id, v_coffee_id, v_name, v_qty);
    v_count := v_count + v_qty;

    if v_coffee_id is null then
      v_warnings := v_warnings || to_jsonb('No menu match for "' || v_name || '" — no recipe deducted.');
      continue;
    end if;

    -- Deduct each recipe ingredient × qty from stock.
    for r in
      select cr.item_id, cr.qty_per_serve, i.name, i.uom, i.unit_cost, i.stock_qty
      from coffee_recipes cr
      join inventory_items i on i.id = cr.item_id
      where cr.coffee_id = v_coffee_id and cr.qty_per_serve > 0
    loop
      update inventory_items
         set stock_qty = stock_qty - (r.qty_per_serve * v_qty), updated_at = now()
       where id = r.item_id;

      insert into inventory_transactions (item_id, qty_change, reason, coffee_name, note)
      values (r.item_id, -(r.qty_per_serve * v_qty), 'consumption', v_name, 'POS ' || v_order_id::text);

      v_deducted := v_deducted || jsonb_build_object(
        'name', r.name, 'qty', r.qty_per_serve * v_qty, 'uom', r.uom);
      v_total := v_total + (coalesce(r.unit_cost, 0) * r.qty_per_serve * v_qty);

      if r.stock_qty - (r.qty_per_serve * v_qty) < 0 then
        v_warnings := v_warnings || to_jsonb('"' || r.name || '" is now oversold (negative stock).');
      end if;
    end loop;
  end loop;

  update pos_orders set item_count = v_count, total_cost = v_total, selling_total = coalesce(p_selling_total, 0) where id = v_order_id;

  return jsonb_build_object(
    'ok', true, 'order_id', v_order_id,
    'deducted', v_deducted, 'warnings', v_warnings);
end;
$$;
grant execute on function public.tender_pos_order(text, text, text, jsonb) to authenticated;

-- =====================================================================
-- ADMIN USER SETUP
-- Create your admin account via the Supabase Dashboard:
--   Authentication → Users → Add user
--   Email: admin@samahuzai.com  (or any email you prefer)
--   Password: (choose a strong password)
--   Toggle "Auto Confirm User": ON
-- Then assign its role in admin_users (or via the in-app Staff page).
-- =====================================================================
