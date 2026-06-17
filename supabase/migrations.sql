-- =====================================================================
-- Samahuzai Carwash and Auto Detailing — Migrations
-- Run these if upgrading an existing database (schema already applied).
-- Each statement is idempotent — safe to re-run.
-- =====================================================================

-- Add cancellation_reason column (Phase 1 → Phase 1.1)
alter table bookings add column if not exists cancellation_reason text;

-- Recurring schedules (Phase 2 — member profile)
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
alter table recurring_schedules enable row level security;
drop policy if exists "public all recurring_schedules" on recurring_schedules;
create policy "public all recurring_schedules" on recurring_schedules for all to anon, authenticated using (true) with check (true);

-- Add description column to services
alter table services add column if not exists description text;

-- Add plate_number to member_cars (per-member vehicle, not the shared catalog)
alter table member_cars add column if not exists plate_number text;

-- Add-ons: per-booking extras + admin catalog
alter table bookings add column if not exists add_ons jsonb not null default '[]';

create table if not exists addon_catalog (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  default_price integer not null default 0,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create unique index if not exists addon_catalog_name_lower_idx on addon_catalog (lower(name));
create index  if not exists addon_catalog_sort_idx             on addon_catalog (sort_order);
alter table addon_catalog enable row level security;
drop policy if exists "public all addon_catalog" on addon_catalog;
create policy "public all addon_catalog" on addon_catalog for all to anon, authenticated using (true) with check (true);

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
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'services' and column_name = 'id' and is_identity = 'YES'
  ) then
    execute 'alter table services alter column id add generated always as identity';
  end if;
end $$;
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

-- Enable Supabase Realtime for bookings (Phase 1.6 — Shop Monitor live updates)
-- Required for postgres_changes subscriptions in the monitor page.
-- Safe to re-run — ADD TABLE is idempotent on the publication.
alter publication supabase_realtime add table bookings;

-- Phase 2.1 — Change detailers_assigned from integer count to uuid[] array
-- This lets bookings record which specific detailers are assigned, enabling
-- per-detailer task history tracking. Count is now array_length(detailers_assigned, 1).
alter table bookings drop constraint if exists bookings_detailers_assigned_check;
alter table bookings alter column detailers_assigned type uuid[] using '{}'::uuid[];
alter table bookings alter column detailers_assigned set default '{}'::uuid[];

-- Replace add_booking RPC: detailers_assigned now accepts a uuid[] in the payload
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

-- Replace update_booking_detailers RPC: now accepts uuid[] instead of int count
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

notify pgrst, 'reload schema';

-- Expand booking statuses: add pending (awaiting admin confirmation) and completed (service done)
-- Phase 2 — Admin Confirmation + Earnings Tracking
alter table bookings drop constraint if exists bookings_status_check;
alter table bookings add constraint bookings_status_check
  check (status in ('pending', 'confirmed', 'on-going', 'cancelled', 'no_show', 'completed'));
alter table bookings alter column status set default 'pending';

-- Add testimonials table (Phase 2.2)
create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  car text not null,
  quote text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  is_visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists testimonials_sort_idx on testimonials (sort_order, created_at);
alter table testimonials enable row level security;
drop policy if exists "public read testimonials" on testimonials;
create policy "public read testimonials" on testimonials for select to anon, authenticated using (true);
drop policy if exists "admin all testimonials" on testimonials;
create policy "admin all testimonials" on testimonials for all to authenticated using (true) with check (true);

-- Seed default testimonials (safe to re-run)
insert into testimonials (name, car, quote, rating, is_visible, sort_order) values
  ('Jehnsen Enrique', 'Nissan Navara Owner', 'I have been to every detailer in BGC. Samahuzai Carwash and Auto Detailing is the only one I trust with my Navara. The finish is mirror-grade.', 5, true, 1),
  ('Azi Acosta', 'Range Rover Velar', 'The lounge alone is worth it. I came in for a wash and left feeling like I had spent the morning at a five-star hotel.', 5, true, 2),
  ('Vince Tacloban', 'BMW M3 Competition', 'Ceramic coating turned out flawless. Six months in, still beading like the day I drove out. Worth every peso.', 5, true, 3);

notify pgrst, 'reload schema';

-- Add nickname to members (Phase 2.3)
-- Run this separately AFTER schema.sql has been applied (members table must exist).
alter table members add column if not exists nickname text;

notify pgrst, 'reload schema';

-- Add status column to testimonials (Phase 2.4)
-- pending = submitted by public, awaiting admin review
-- approved = admin approved, visible on site (subject to is_visible toggle)
alter table testimonials add column if not exists status text not null default 'approved'
  check (status in ('pending', 'approved', 'rejected'));

-- Allow anonymous users to insert (submit) testimonials
drop policy if exists "public submit testimonials" on testimonials;
create policy "public submit testimonials" on testimonials
  for insert to anon with check (status = 'pending');

-- Existing seed rows default to approved so they remain visible
update testimonials set status = 'approved' where status is null or status = '';

notify pgrst, 'reload schema';

-- Add nickname to bookings (Phase 2.5a)
alter table bookings add column if not exists nickname text;


-- Booking audit log (Phase 2.5b)
-- Records every status transition for a booking.
-- from_status is null when the booking is first created.
create table if not exists booking_status_logs (
  id          uuid primary key default gen_random_uuid(),
  booking_id  text not null references bookings(id) on delete cascade,
  from_status text,
  to_status   text not null,
  notes       text,
  changed_at  timestamptz not null default now()
);
create index if not exists bsl_booking_idx on booking_status_logs (booking_id, changed_at);
alter table booking_status_logs enable row level security;
drop policy if exists "admin all booking_status_logs" on booking_status_logs;
create policy "admin all booking_status_logs" on booking_status_logs
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';

-- Phase 3 — AI Intelligence Layer
-- car_id FK on bookings: links a booking to the exact catalog car serviced.
-- Nullable — existing rows stay null; new VIP bookings can populate it going forward.
alter table bookings add column if not exists car_id uuid references cars(id) on delete set null;
create index if not exists bookings_car_idx on bookings (car_id);

-- car_condition_logs: admin-recorded condition snapshot after each service visit.
-- Linked to a member_cars row (member + car) and optionally to a specific booking.
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
alter table car_condition_logs enable row level security;
drop policy if exists "admin all car_condition_logs" on car_condition_logs;
create policy "admin all car_condition_logs" on car_condition_logs
  for all to authenticated using (true) with check (true);

notify pgrst, 'reload schema';

-- Phase 4 — wire car_id through add_booking RPC
-- Re-creates the function so new bookings can store the catalog car that was serviced.
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

  v_clamped_ids := v_detailer_ids[1:least(v_requested, v_min)];

  v_id := coalesce(
    nullif(p->>'id', ''),
    'OBS-' || to_char(v_date, 'YYYYMMDD') || '-' || lpad((1000 + floor(random() * 9000))::int::text, 4, '0')
  );

  insert into bookings (
    id, service_id, service_name, service_price, service_duration, service_category,
    date, time, customer_name, email, phone, vehicle, vehicle_year, notes,
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

notify pgrst, 'reload schema';

-- Phase 5 — Vehicle type color coding (monitor differentiation)
-- Distinguishes 4-wheel cars from big bikes / motorcycles on the shop monitor.
-- Phase 5 — Vehicle type is a property of the car catalog, not the booking form.
-- The booking inherits vehicle_type from the selected car at booking time.
-- 1 = car (4-wheel), 2 = motorcycle (big bike)
alter table cars    add column if not exists vehicle_type smallint not null default 1 check (vehicle_type in (1, 2));
alter table bookings add column if not exists vehicle_type smallint not null default 1 check (vehicle_type in (1, 2));

-- Phase 6 — per-detailer schedule conflict guard
-- Capacity checks were aggregate-only (heads vs pool size): nothing stopped a
-- *specific* detailer from being assigned to two bookings whose slots overlap.
-- Both RPCs now reject any detailer ID that already appears on an overlapping
-- active booking on the same date.
-- Also fixes add_booking dropping the nickname field on insert.
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
  v_conflict_names text;
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

-- Admin roles (Phase 3 — super_admin vs admin access tiers)
-- Maps an admin's login email to a role. Resolution is by email match against
-- the logged-in Supabase Auth user. When this table is empty the first
-- logged-in user is treated as super_admin (bootstrap).
create table if not exists admin_users (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  role       text not null default 'admin' check (role in ('super_admin', 'admin')),
  created_at timestamptz not null default now()
);
alter table admin_users enable row level security;
drop policy if exists "admin all admin_users" on admin_users;
-- Authenticated only — admin emails/roles are not exposed to anonymous visitors.
create policy "admin all admin_users" on admin_users for all to authenticated using (true) with check (true);

-- Seed the boss account (replace the email). Safe to re-run.
--   insert into admin_users (email, role) values ('boss@samahuzai.com', 'super_admin')
--   on conflict (email) do update set role = excluded.role;

notify pgrst, 'reload schema';

-- =====================================================================
-- Phase 3 — Role-based Row Level Security (defense in depth)
-- =====================================================================
-- Goal: a plain `admin` (e.g. the barista) can READ what the UI needs and
-- CREATE bookings, but cannot perform sensitive WRITES — even if they bypass
-- the UI and call the API directly. Only a `super_admin` can edit/cancel/delete
-- bookings or manage members, cars, coffees, services, settings, staff, etc.
--
-- Design:
--   * SELECT stays open (anon + authenticated) to avoid any public-site or
--     admin-UI read regressions (matches prior behaviour). Two exceptions keep
--     their stricter prior reads: car_condition_logs and admin_users
--     (authenticated only).
--   * WRITES are role-gated via is_super_admin(). Public submission flows keep
--     their anon carve-outs: membership (members/cars/member_cars inserts),
--     testimonial submissions, and booking inserts.
-- Idempotent — safe to re-run.
-- =====================================================================

-- Helper: is the *current* user a super admin?
-- SECURITY DEFINER so it can read admin_users regardless of that table's RLS.
-- Bootstrap: when NO super_admin is configured yet, any authenticated user
-- counts as super_admin so the boss can sign in and assign the first roles
-- (and can't lock themselves out by adding a plain admin before adding self).
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
       or not exists (select 1 from admin_users where role = 'super_admin')
     );
$$;

-- Drop every legacy wide-open / prior policy we are replacing -------------------
drop policy if exists "public all bookings"            on bookings;
drop policy if exists "public all members"             on members;
drop policy if exists "public all blocked_slots"       on blocked_slots;
drop policy if exists "public all settings"            on settings;
drop policy if exists "public all services"            on services;
drop policy if exists "public all cars"                on cars;
drop policy if exists "public all coffees"             on coffees;
drop policy if exists "public all member_cars"         on member_cars;
drop policy if exists "admin all car_condition_logs"   on car_condition_logs;
drop policy if exists "public all recurring_schedules" on recurring_schedules;
drop policy if exists "public all addon_catalog"       on addon_catalog;
drop policy if exists "public all service_categories"  on service_categories;
drop policy if exists "public all detailers"           on detailers;
drop policy if exists "public read testimonials"       on testimonials;
drop policy if exists "admin all testimonials"         on testimonials;
drop policy if exists "public submit testimonials"     on testimonials;
drop policy if exists "admin all booking_status_logs"  on booking_status_logs;
drop policy if exists "admin all admin_users"          on admin_users;

-- bookings: anyone reads; anon + staff create; only super_admin edits/deletes ---
drop policy if exists "bookings_select" on bookings;
drop policy if exists "bookings_insert" on bookings;
drop policy if exists "bookings_update" on bookings;
drop policy if exists "bookings_delete" on bookings;
create policy "bookings_select" on bookings for select to anon, authenticated using (true);
create policy "bookings_insert" on bookings for insert to anon, authenticated with check (true);
create policy "bookings_update" on bookings for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "bookings_delete" on bookings for delete to authenticated using (is_super_admin());

-- booking_status_logs: staff read; only super_admin writes ---------------------
drop policy if exists "bsl_select" on booking_status_logs;
drop policy if exists "bsl_insert" on booking_status_logs;
drop policy if exists "bsl_update" on booking_status_logs;
drop policy if exists "bsl_delete" on booking_status_logs;
create policy "bsl_select" on booking_status_logs for select to authenticated using (true);
create policy "bsl_insert" on booking_status_logs for insert to authenticated with check (is_super_admin());
create policy "bsl_update" on booking_status_logs for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "bsl_delete" on booking_status_logs for delete to authenticated using (is_super_admin());

-- members: anyone reads; anon applies (public form); only super_admin manages ---
drop policy if exists "members_select"      on members;
drop policy if exists "members_insert_anon" on members;
drop policy if exists "members_insert_auth" on members;
drop policy if exists "members_update"      on members;
drop policy if exists "members_delete"      on members;
create policy "members_select"      on members for select to anon, authenticated using (true);
create policy "members_insert_anon" on members for insert to anon with check (true);
create policy "members_insert_auth" on members for insert to authenticated with check (is_super_admin());
create policy "members_update"      on members for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "members_delete"      on members for delete to authenticated using (is_super_admin());

-- cars: read open; anon + staff may add (membership / booking auto-save);
-- only super_admin edits/deletes the shared catalog ----------------------------
drop policy if exists "cars_select" on cars;
drop policy if exists "cars_insert" on cars;
drop policy if exists "cars_update" on cars;
drop policy if exists "cars_delete" on cars;
create policy "cars_select" on cars for select to anon, authenticated using (true);
create policy "cars_insert" on cars for insert to anon, authenticated with check (true);
create policy "cars_update" on cars for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "cars_delete" on cars for delete to authenticated using (is_super_admin());

-- member_cars: read open; anon + staff may link (membership / booking);
-- only super_admin edits/removes ----------------------------------------------
drop policy if exists "member_cars_select" on member_cars;
drop policy if exists "member_cars_insert" on member_cars;
drop policy if exists "member_cars_update" on member_cars;
drop policy if exists "member_cars_delete" on member_cars;
create policy "member_cars_select" on member_cars for select to anon, authenticated using (true);
create policy "member_cars_insert" on member_cars for insert to anon, authenticated with check (true);
create policy "member_cars_update" on member_cars for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "member_cars_delete" on member_cars for delete to authenticated using (is_super_admin());

-- testimonials: read open; anon submits as pending; super_admin manages --------
drop policy if exists "testimonials_select"      on testimonials;
drop policy if exists "testimonials_insert_anon" on testimonials;
drop policy if exists "testimonials_insert_auth" on testimonials;
drop policy if exists "testimonials_update"      on testimonials;
drop policy if exists "testimonials_delete"      on testimonials;
create policy "testimonials_select"      on testimonials for select to anon, authenticated using (true);
create policy "testimonials_insert_anon" on testimonials for insert to anon with check (status = 'pending');
create policy "testimonials_insert_auth" on testimonials for insert to authenticated with check (is_super_admin());
create policy "testimonials_update"      on testimonials for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "testimonials_delete"      on testimonials for delete to authenticated using (is_super_admin());

-- Super-admin-managed catalogs (read open, writes super_admin only) ------------
-- services, service_categories, coffees, detailers, addon_catalog,
-- settings, blocked_slots, recurring_schedules
do $$
declare t text;
begin
  foreach t in array array[
    'services','service_categories','coffees','detailers','addon_catalog',
    'settings','blocked_slots','recurring_schedules'
  ] loop
    execute format('drop policy if exists %I on %I', t||'_select', t);
    execute format('drop policy if exists %I on %I', t||'_insert', t);
    execute format('drop policy if exists %I on %I', t||'_update', t);
    execute format('drop policy if exists %I on %I', t||'_delete', t);
    execute format('create policy %I on %I for select to anon, authenticated using (true)', t||'_select', t);
    execute format('create policy %I on %I for insert to authenticated with check (is_super_admin())', t||'_insert', t);
    execute format('create policy %I on %I for update to authenticated using (is_super_admin()) with check (is_super_admin())', t||'_update', t);
    execute format('create policy %I on %I for delete to authenticated using (is_super_admin())', t||'_delete', t);
  end loop;
end $$;

-- car_condition_logs: staff read; super_admin writes (PII — no anon read) ------
drop policy if exists "ccl_select" on car_condition_logs;
drop policy if exists "ccl_insert" on car_condition_logs;
drop policy if exists "ccl_update" on car_condition_logs;
drop policy if exists "ccl_delete" on car_condition_logs;
create policy "ccl_select" on car_condition_logs for select to authenticated using (true);
create policy "ccl_insert" on car_condition_logs for insert to authenticated with check (is_super_admin());
create policy "ccl_update" on car_condition_logs for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "ccl_delete" on car_condition_logs for delete to authenticated using (is_super_admin());

-- admin_users: any staff may read (needed for role resolution);
-- only super_admin manages (bootstrap: first user when table is empty) ---------
drop policy if exists "admin_users_select" on admin_users;
drop policy if exists "admin_users_insert" on admin_users;
drop policy if exists "admin_users_update" on admin_users;
drop policy if exists "admin_users_delete" on admin_users;
create policy "admin_users_select" on admin_users for select to authenticated using (true);
create policy "admin_users_insert" on admin_users for insert to authenticated with check (is_super_admin());
create policy "admin_users_update" on admin_users for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "admin_users_delete" on admin_users for delete to authenticated using (is_super_admin());

-- =====================================================================
-- Phase 4 — Member portal (self-service VIP login)
-- =====================================================================
-- Approved VIP members can now sign in (Supabase Auth) and manage their own
-- profile, fleet, and bookings. This block lets a signed-in member touch ONLY
-- their own rows, on top of the existing super_admin write policies.
--
-- Run this block in Supabase SQL Editor on existing databases. Re-runnable.
--
-- NOTE: anyone can create a Supabase Auth account, but portal ACCESS is gated
-- in the app by current_member_id() resolving to an approved member. These
-- policies make that the DB boundary too.

-- Helper: the approved member id for the *current* JWT email (or null).
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

-- Public VIP application: allow authenticated users to submit a pending member
-- row too (a visitor may already hold a session from a prior portal sign-up, so
-- the single-step membership form would otherwise hit RLS). Approvals/edits stay
-- super_admin-only via members_update below. Mirrors bookings/cars insert policy.
drop policy if exists "members_insert_auth" on members;
create policy "members_insert_auth" on members for insert to authenticated with check (true);

-- members: a member may update their OWN row (in addition to super_admin).
-- A BEFORE UPDATE trigger keeps email + status immutable for non-super-admins
-- so a member can't change the email tied to their login or self-approve.
drop policy if exists "members_update"      on members;
drop policy if exists "members_self_update" on members;
create policy "members_update" on members
  for update to authenticated
  using (is_super_admin() or id = current_member_id())
  with check (is_super_admin() or id = current_member_id());

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
    -- Preserve admin-managed bookkeeping columns on self-updates.
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

-- member_cars: a member may manage cars in their OWN fleet (insert was already
-- open to authenticated; tighten update/delete to own rows or super_admin).
drop policy if exists "member_cars_update" on member_cars;
drop policy if exists "member_cars_delete" on member_cars;
create policy "member_cars_update" on member_cars
  for update to authenticated
  using (is_super_admin() or member_id = current_member_id())
  with check (is_super_admin() or member_id = current_member_id());
create policy "member_cars_delete" on member_cars
  for delete to authenticated
  using (is_super_admin() or member_id = current_member_id());

-- cars (catalog) + bookings: no change. cars insert + bookings insert/select
-- are already open enough for members to add catalog cars and create/read their
-- own bookings (the portal filters bookings client-side by member). Member
-- self-cancel of bookings is intentionally NOT enabled here.

notify pgrst, 'reload schema';