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
  check (status in ('pending', 'confirmed', 'cancelled', 'no_show', 'completed'));
alter table bookings alter column status set default 'pending';