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

-- =====================================================================
-- Phase 5 — Booking status changes by plain admins
-- =====================================================================
-- A plain `admin` (barista) may advance a booking's lifecycle status, but must
-- NOT be able to edit other booking fields (the bookings UPDATE policy stays
-- super_admin only). This SECURITY DEFINER RPC is the controlled path: it only
-- touches `status` + `cancellation_reason`, writes the audit log, and authorizes
-- any signed-in staff member. Other edits (add-ons, detailer reassignment,
-- delete) remain super-admin only because they go through the table directly.
-- Idempotent — safe to re-run.
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
  -- Any authenticated staff (admin or super_admin) may change status.
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
         cancellation_reason = case
           when p_status = 'cancelled' then p_reason
           else cancellation_reason
         end
   where id = p_id
   returning * into v_row;

  insert into booking_status_logs (booking_id, from_status, to_status, notes)
  values (p_id, v_from, p_status, p_reason);

  return to_jsonb(v_row);
end;
$$;

-- Staff only — execute granted to authenticated (the function itself rejects anon).
grant execute on function public.update_booking_status(text, text, text) to authenticated;

notify pgrst, 'reload schema';

-- =====================================================================
-- Phase 6 — Detailer assignment + add-ons by plain admins
-- =====================================================================
-- Let a plain `admin` (barista) assign detailers and edit add-ons. Both go
-- through SECURITY DEFINER RPCs that only touch their one column, so the
-- bookings table UPDATE policy can stay super-admin only (delete/other-field
-- edits remain blocked for admins). Idempotent — safe to re-run.

-- Re-create update_booking_detailers as SECURITY DEFINER + staff auth check.
-- (Only writes detailers_assigned; keeps the capacity + conflict guards.)
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
    return jsonb_build_object('error', 'Service requires at least ' || p_min_detailers || ' detailer(s).');
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
    return jsonb_build_object('error', 'Only ' || v_min || ' detailer(s) available across this booking''s hours.');
  end if;

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
    return jsonb_build_object('error', 'Already booked at this time: ' || v_conflict_names || '. Choose a different detailer.');
  end if;

  update bookings set detailers_assigned = p_detailer_ids where id = p_id
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;
grant execute on function update_booking_detailers(text, uuid[], int) to authenticated;

-- Add-ons: SECURITY DEFINER, only writes the add_ons column.
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

-- =====================================================================
-- Phase 7 — Fix update_settings peak-demand check for uuid[] detailers
-- ---------------------------------------------------------------------
-- update_settings predates Phase 2.1 (detailers_assigned int -> uuid[]).
-- It still summed the column directly (sum(detailers_assigned)), which now
-- fails with "function sum(uuid[]) does not exist". Count the array length
-- per booking instead, matching add_booking / update_booking_detailers.
-- =====================================================================
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

-- =====================================================================
-- Phase 8 — Coffee ingredient inventory
-- ---------------------------------------------------------------------
-- Tracks the shop's coffee consumables (beans, milk, syrups, cups, …),
-- a per-coffee recipe (bill of materials), and every stock movement.
-- When a VIP booking with a coffee_order is marked 'completed', the
-- update_booking_status RPC calls consume_coffee_serve() to deduct the
-- recipe quantities and log the movement — once per booking.
-- =====================================================================

-- Ingredient catalog. Mirrors the reference sheet:
--   brand · item name · description · type · uom · pack volume · unit cost.
-- Plus live stock tracking: stock_qty (in `uom`) and a low-stock threshold.
create table if not exists inventory_items (
  id            uuid primary key default gen_random_uuid(),
  brand         text,
  name          text not null,
  description   text,
  type          text,
  uom           text not null default 'pc',      -- unit of measure (Grams, Liter, Pc…)
  pack_volume   numeric(12,2),                    -- VOLUME column: pack/size the unit cost refers to
  unit_cost     numeric(12,4) not null default 0, -- A/V: cost per 1 `uom`
  stock_qty     numeric(14,3) not null default 0, -- current on-hand quantity, in `uom`
  low_stock_at  numeric(14,3) not null default 0, -- reorder threshold (0 = no alert)
  is_active     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists inventory_items_sort_idx   on inventory_items (sort_order);
create index if not exists inventory_items_active_idx  on inventory_items (is_active);

-- Bill of materials: how much of each ingredient one serve of a coffee uses.
-- coffee_id → coffees(id); qty_per_serve is expressed in the item's `uom`.
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

-- Every stock movement. reason: 'restock' | 'adjustment' | 'consumption' | 'initial'.
-- qty_change is signed (+in / -out). booking_id set for consumption tied to a serve.
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

-- Marks a booking whose coffee serve has already been deducted, so re-marking
-- 'completed' (or status flip-flops) never double-deducts.
alter table bookings add column if not exists coffee_served_at timestamptz;

alter table inventory_items        enable row level security;
alter table coffee_recipes         enable row level security;
alter table inventory_transactions enable row level security;

-- Reads open to any signed-in staff (no anon — internal stock data).
-- Writes: super_admin directly; a plain admin only via the consume RPC below.
drop policy if exists "inventory_items_select"        on inventory_items;
drop policy if exists "inventory_items_insert"        on inventory_items;
drop policy if exists "inventory_items_update"        on inventory_items;
drop policy if exists "inventory_items_delete"        on inventory_items;
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

-- ---------------------------------------------------------------------
-- RPC: adjust_inventory_item — restock / manual adjustment (super_admin)
-- Applies a signed delta to stock_qty and logs a transaction atomically.
-- ---------------------------------------------------------------------
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
     set stock_qty = stock_qty + p_qty_change,
         updated_at = now()
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

-- ---------------------------------------------------------------------
-- RPC: consume_coffee_serve — deduct a coffee's recipe from stock
-- SECURITY DEFINER so a plain admin (barista) advancing a booking to
-- 'completed' can deduct stock without table-level write rights on the
-- inventory tables. Idempotent per booking via bookings.coffee_served_at.
-- Returns { ok, deducted:[{name, qty, uom}], warnings:[...] }.
-- Never blocks the serve — negative stock is allowed but flagged.
-- ---------------------------------------------------------------------
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

  -- Idempotency: only deduct once per booking.
  select coffee_served_at into v_already from bookings where id = p_booking_id;
  if v_already is not null then
    return jsonb_build_object('ok', true, 'skipped', 'already served');
  end if;

  select id into v_coffee_id from coffees
   where lower(name) = lower(btrim(p_coffee_name)) limit 1;

  if v_coffee_id is null then
    -- Unknown drink (e.g. renamed/removed) — mark served, nothing to deduct.
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
-- update_booking_status — now also deducts the coffee serve on 'completed'.
-- Re-created to call consume_coffee_serve for coffee orders. The deduct is
-- best-effort: it never aborts the status change.
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
  v_from   text;
  v_coffee text;
  v_row    bookings;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Not authenticated.');
  end if;
  if p_status not in ('pending','confirmed','on-going','completed','cancelled','no_show') then
    return jsonb_build_object('error', 'Invalid status.');
  end if;

  select status, coffee_order into v_from, v_coffee from bookings where id = p_id;
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

  -- NOTE: Coffee inventory is NOT deducted on completion. Serving a VIP's
  -- coffee (and the stock deduction) now happens in the barista POS via
  -- tender_pos_order (see Phase 9 below). v_coffee is intentionally unused.

  return to_jsonb(v_row);
end;
$$;
grant execute on function public.update_booking_status(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Seed — reference-sheet coffee ingredients (optional starter data).
-- Mapping from the sheet: VOLUME -> pack_volume, A/V (cost per uom) -> unit_cost.
-- Opening stock is seeded at one pack_volume and logged as an 'initial' movement;
-- low-stock alert defaults to 10% of a pack. Idempotent: guarded by (brand, name)
-- so re-running won't duplicate. Delete this block if you'd rather start empty.
-- ---------------------------------------------------------------------
do $$
declare
  v_id  uuid;
  v_qty numeric;
  rec   record;
begin
  for rec in
    select * from (values
      ('Artisanal',            'Coffee Beans',  'Coffee Beans',  'Beans',     'Grams', 1000::numeric, 0.95::numeric, 1),
      ('Jolly Cow',            'Barista Milk',  'Fresh Milk',    'Milk',      'Liter', 1000,          0.08,          2),
      ('Jolly Cow',            'Condense Milk', 'Condense Milk', 'Milk',      'Liter', 1000,          0.14,          3),
      ('Easy Brand Signature', 'Hazelnut',      'Hazelnut',      'Syrup',     'Liter', 1000,          0.24,          4),
      ('Easy Brand Signature', 'Caramel',       'Caramel',       'Sauce',     'Liter', 1000,          0.47,          5),
      ('Generic',              'Creamer',       'Powder',        'Creamer',   'Pc',    100,           0.25,          6),
      ('Generic',              'Sugar',         'Powder',        'Sugar',     'Pc',    100,           0.25,          7),
      ('Generic',              'Paper Cup',     'Paper Cup',     'Paper Cup', 'Pc',    100,           5.15,          8),
      ('Generic',              'Stirrer',       'Stirrer',       'Stirrer',   'Pc',    100,           0.00,          9)
    ) as t(brand, name, description, type, uom, pack_volume, unit_cost, sort_order)
  loop
    -- Skip if an item with the same (brand, name) already exists.
    if exists (
      select 1 from inventory_items
      where lower(coalesce(brand,'')) = lower(coalesce(rec.brand,''))
        and lower(name) = lower(rec.name)
    ) then
      continue;
    end if;

    v_qty := rec.pack_volume;  -- opening stock = one full pack

    insert into inventory_items (brand, name, description, type, uom, pack_volume, unit_cost, stock_qty, low_stock_at, sort_order)
    values (rec.brand, rec.name, rec.description, rec.type, rec.uom, rec.pack_volume, rec.unit_cost, v_qty,
            round(rec.pack_volume * 0.10, 3), rec.sort_order)
    returning id into v_id;

    insert into inventory_transactions (item_id, qty_change, reason, note)
    values (v_id, v_qty, 'initial', 'Opening stock (seed)');
  end loop;
end $$;

-- =====================================================================
-- Phase 9 — Barista POS (coffee serving moved out of booking completion)
-- ---------------------------------------------------------------------
-- A standalone register for the barista to serve VIP members' coffee.
-- Tendering an order deducts each coffee's recipe from inventory and logs
-- a 'consumption' movement per ingredient. This REPLACES the old behavior
-- where marking a booking 'completed' auto-deducted the coffee (the hook
-- has been removed from update_booking_status above).
-- =====================================================================
create table if not exists pos_orders (
  id            uuid primary key default gen_random_uuid(),
  member_id     text references members(id) on delete set null,
  member_name   text,
  note          text,
  item_count    integer not null default 0,
  total_cost    numeric(14,4) not null default 0,
  served_by     text,
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

drop policy if exists "pos_orders_select" on pos_orders;
create policy "pos_orders_select" on pos_orders for select to authenticated using (true);
drop policy if exists "pos_orders_delete" on pos_orders;
create policy "pos_orders_delete" on pos_orders for delete to authenticated using (is_super_admin());

drop policy if exists "pos_order_items_select" on pos_order_items;
create policy "pos_order_items_select" on pos_order_items for select to authenticated using (true);

-- RPC: tender_pos_order — record a coffee order + deduct ingredients.
-- SECURITY DEFINER so a plain admin (barista) can deduct stock without
-- table-level write rights. Negative stock is allowed but flagged.
create or replace function public.tender_pos_order(
  p_member_id   text,
  p_member_name text,
  p_note        text,
  p_lines       jsonb
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

  update pos_orders set item_count = v_count, total_cost = v_total where id = v_order_id;

  return jsonb_build_object(
    'ok', true, 'order_id', v_order_id,
    'deducted', v_deducted, 'warnings', v_warnings);
end;
$$;
grant execute on function public.tender_pos_order(text, text, text, jsonb) to authenticated;

-- =====================================================================
-- Phase 10 — Per-admin booking-service allowlist
-- =====================================================================
-- Lets a super_admin restrict which service packages a plain `admin` (e.g. a
-- barista) may select in the booking flow. Column semantics:
--   allowed_service_ids = NULL  → no restriction (may pick any service)
--   allowed_service_ids = '{}'  → an explicit empty allowlist (may pick none)
--   allowed_service_ids = {1,4} → may only pick services with those ids
--
-- Only affects the booking-flow service picker; it is a UI convenience scoped by
-- role (super_admin is never restricted). Re-runnable.

alter table admin_users
  add column if not exists allowed_service_ids integer[];

notify pgrst, 'reload schema';

notify pgrst, 'reload schema';

-- =====================================================================
-- Phase 11 — Task timing: started_at / completed_at on bookings
-- ---------------------------------------------------------------------
-- Records the exact wall-clock timestamp when a booking transitions to
-- 'on-going' (work starts) and to 'completed' (work ends). Enables
-- reporting on actual service duration vs. the estimated service duration.
-- Re-runnable. Run after Phase 10 has been applied.
-- =====================================================================

-- Two nullable timestamptz columns — null until the status event fires.
alter table bookings add column if not exists started_at   timestamptz;
alter table bookings add column if not exists completed_at timestamptz;

-- Re-create update_booking_status to stamp started_at / completed_at.
-- Only writes the column once — transitioning back to on-going after
-- completion is edge-case; the first on-going stamp is preserved unless
-- the field is null (so re-opening a booking re-stamps correctly).
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
  v_from   text;
  v_row    bookings;
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
     set status              = p_status,
         cancellation_reason = case
           when p_status = 'cancelled' then p_reason
           else cancellation_reason
         end,
         -- Stamp started_at the first time the job goes on-going.
         started_at          = case
           when p_status = 'on-going' and started_at is null then now()
           else started_at
         end,
         -- Stamp completed_at when marked completed; clear it if re-opened.
         completed_at        = case
           when p_status = 'completed' then now()
           when p_status in ('on-going','confirmed','pending') then null
           else completed_at
         end
   where id = p_id
   returning * into v_row;

  insert into booking_status_logs (booking_id, from_status, to_status, notes)
  values (p_id, v_from, p_status, p_reason);

  return to_jsonb(v_row);
end;
$$;
grant execute on function public.update_booking_status(text, text, text) to authenticated;

notify pgrst, 'reload schema';
-- =====================================================================
-- Phase 12 — Configurable closing time
-- ---------------------------------------------------------------------
-- The booking-grid slots run to 7:00 PM so staff can extend long jobs
-- into the evening, but the shop's default closing cutoff (past which a
-- booking counts as "overflow" and prompts extend-or-tomorrow) is now
-- configurable in Settings instead of a hardcoded 5:00 PM. Stored as
-- minutes since midnight (1020 = 5:00 PM). Re-runnable.
-- =====================================================================

alter table settings
  add column if not exists closing_minutes integer not null default 1020
  check (closing_minutes between 1 and 1439);

-- Re-create update_settings to accept an optional p_closing_minutes.
-- Null leaves the existing value untouched (so older callers still work).
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

  select closing_minutes into v_closing from settings where id = 1;
  if p_closing_minutes is not null then
    if p_closing_minutes < 1 or p_closing_minutes > 1439 then
      return jsonb_build_object('error', 'Closing time must be a valid time of day.');
    end if;
    v_closing := p_closing_minutes;
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
        closing_minutes = v_closing,
        updated_at = now()
    where id = 1
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- =====================================================================
-- Phase 13 — Cross-date booking occupancy (long/multi-day sequential fill)
-- ---------------------------------------------------------------------
-- A service is now a total-hours budget that fills working days one after
-- another: day 1 from the chosen start to closing, the remainder rolling to
-- the next day's opening, and so on (final day may be partial). To enforce
-- capacity + detailer conflicts across every day a job touches, occupancy is
-- recorded per (booking, date, slot) in booking_day_slots. bookings.date /
-- bookings.occupies_slots stay as the day-1 values for the schedule/monitor.
-- Re-runnable. Run after Phase 12.
-- =====================================================================

create table if not exists booking_day_slots (
  booking_id text not null references bookings (id) on delete cascade,
  date date not null,
  slot text not null,
  primary key (booking_id, date, slot)
);
create index if not exists booking_day_slots_date_idx on booking_day_slots (date);

-- Backfill existing bookings as single-day occupancy (their current shape).
insert into booking_day_slots (booking_id, date, slot)
select b.id, b.date, s.slot
from bookings b
cross join lateral unnest(b.occupies_slots) as s(slot)
on conflict do nothing;

-- RLS for the child table (mirrors bookings).
alter table booking_day_slots enable row level security;
drop policy if exists "booking_day_slots_select" on booking_day_slots;
drop policy if exists "booking_day_slots_insert" on booking_day_slots;
drop policy if exists "booking_day_slots_update" on booking_day_slots;
drop policy if exists "booking_day_slots_delete" on booking_day_slots;
create policy "booking_day_slots_select" on booking_day_slots for select to anon, authenticated using (true);
create policy "booking_day_slots_insert" on booking_day_slots for insert to anon, authenticated with check (true);
create policy "booking_day_slots_update" on booking_day_slots for update to authenticated using (is_super_admin()) with check (is_super_admin());
create policy "booking_day_slots_delete" on booking_day_slots for delete to authenticated using (is_super_admin());

-- Rewrite add_booking to accept the cross-date plan (p_day_slots) and enforce
-- capacity/conflict across all (date, slot) pairs. Backward compatible: when
-- p_day_slots is null it synthesizes a single day from p_occupies_slots.
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
  v_requested int;
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

  if p_day_slots is not null and jsonb_array_length(p_day_slots) > 0 then
    v_plan := p_day_slots;
  else
    v_plan := jsonb_build_array(
      jsonb_build_object('date', to_char(v_date, 'YYYY-MM-DD'), 'slots', to_jsonb(p_occupies_slots))
    );
  end if;

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
  v_requested := coalesce(array_length(v_detailer_ids, 1), 0);
  if v_requested < 1 then v_requested := 1; end if;

  for v_cell in
    select (elem->>'date')::date as d, s.slot
    from jsonb_array_elements(v_plan) elem
    cross join lateral jsonb_array_elements_text(elem->'slots') s(slot)
  loop
    select coalesce(sum(array_length(b.detailers_assigned, 1)), 0) into v_used
    from booking_day_slots bds
    join bookings b on b.id = bds.booking_id
    where bds.date = v_cell.d
      and bds.slot = v_cell.slot
      and b.status not in ('cancelled', 'no_show');
    v_min := least(v_min, v_pool - v_used);
  end loop;

  if v_min < v_min_detailers then
    return jsonb_build_object('error', 'This time slot just filled up. Please choose another.');
  end if;

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
    v_id, (p->>'service_id')::int, p->>'service_name', (p->>'service_price')::int,
    p->>'service_duration', p->>'service_category', v_date, p->>'time',
    p->>'customer_name', nullif(p->>'nickname', ''), p->>'email', p->>'phone',
    p->>'vehicle', p->>'vehicle_year', p->>'notes',
    coalesce((p->>'is_vip')::boolean, false), nullif(p->>'member_id', ''),
    nullif(p->>'car_id', '')::uuid, p->>'coffee_order',
    coalesce(nullif(p->>'status', ''), 'pending'), v_clamped_ids, p_occupies_slots,
    coalesce((nullif(p->>'vehicle_type', ''))::smallint, 1)
  )
  returning * into v_row;

  insert into booking_day_slots (booking_id, date, slot)
  select v_id, (elem->>'date')::date, s.slot
  from jsonb_array_elements(v_plan) elem
  cross join lateral jsonb_array_elements_text(elem->'slots') s(slot)
  on conflict do nothing;

  return to_jsonb(v_row);
end;
$$;
