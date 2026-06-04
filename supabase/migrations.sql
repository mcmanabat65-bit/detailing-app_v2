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