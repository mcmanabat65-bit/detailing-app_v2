-- =====================================================================
-- Samahuzai Carwash and Auto Detailing — Phase 1 schema
-- Run this in the Supabase SQL Editor (Project → SQL → New query → Run).
-- Safe to re-run: DROPs are guarded with IF EXISTS, INSERTs use upsert.
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
  email text not null,
  phone text not null,
  member_since timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_at timestamptz
);

create unique index if not exists members_email_lower_idx on members (lower(email));
create index if not exists members_status_idx on members (status);

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
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled', 'no_show')),
  detailers_assigned integer not null default 1 check (detailers_assigned >= 1),
  occupies_slots text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists bookings_date_idx on bookings (date);
create index if not exists bookings_status_idx on bookings (status);
create index if not exists bookings_email_idx on bookings (lower(email));

create table if not exists blocked_slots (
  id text primary key,
  date date not null,
  time text not null,
  label text not null default 'Unavailable',
  created_at timestamptz not null default now()
);

create unique index if not exists blocked_slots_date_time_idx on blocked_slots (date, time);

-- ---------------------------------------------------------------------
-- RPC: add_booking — atomic capacity-aware insert.
-- Locks the date with an advisory transaction lock so concurrent submits
-- can't both claim the last detailer slot.
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
  v_requested int;
  v_clamped int;
  v_id text;
  v_date date;
  v_row bookings;
begin
  v_date := (p->>'date')::date;
  perform pg_advisory_xact_lock(hashtext(v_date::text));

  select detailer_pool_size into v_pool from settings where id = 1;
  v_min_detailers := coalesce((p->>'min_detailers')::int, 1);
  v_requested := coalesce((p->>'detailers_assigned')::int, 1);

  -- For each slot the new booking would occupy, sum already-assigned
  -- detailers across active bookings whose ranges include that slot.
  foreach v_slot in array p_occupies_slots loop
    select coalesce(sum(detailers_assigned), 0) into v_used
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

  v_clamped := least(v_requested, v_min);
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
    coalesce(nullif(p->>'status', ''), 'confirmed'),
    v_clamped,
    p_occupies_slots
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_booking_detailers — admin ratchets a booking's detailer
-- count. The booking's own current allocation is excluded from "used".
-- ---------------------------------------------------------------------
create or replace function update_booking_detailers(
  p_id text,
  p_count int,
  p_min_detailers int
) returns jsonb
language plpgsql
as $$
declare
  v_pool int;
  v_used int;
  v_min int := 2147483647;
  v_slot text;
  v_booking bookings;
  v_row bookings;
begin
  if p_count < 1 then
    return jsonb_build_object('error', 'Detailer count must be at least 1.');
  end if;

  select * into v_booking from bookings where id = p_id;
  if v_booking is null then
    return jsonb_build_object('error', 'Booking not found.');
  end if;

  if p_count < p_min_detailers then
    return jsonb_build_object(
      'error',
      'Service requires at least ' || p_min_detailers || ' detailer(s).'
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(v_booking.date::text));

  select detailer_pool_size into v_pool from settings where id = 1;

  foreach v_slot in array v_booking.occupies_slots loop
    select coalesce(sum(detailers_assigned), 0) into v_used
    from bookings
    where date = v_booking.date
      and id <> p_id
      and status not in ('cancelled', 'no_show')
      and v_slot = any (occupies_slots);
    v_min := least(v_min, v_pool - v_used);
  end loop;

  if p_count > v_min then
    return jsonb_build_object(
      'error',
      'Only ' || v_min || ' detailer(s) available across this booking''s hours.'
    );
  end if;

  update bookings set detailers_assigned = p_count where id = p_id
    returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

-- ---------------------------------------------------------------------
-- RPC: update_settings — guarded settings write. Refuses to shrink the
-- pool below the busiest single (date,time) cell already in use.
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

  -- Peak detailers in any single (date,slot) cell
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
-- RLS — Phase 1 keeps everything open to anon since admin auth is still
-- hardcoded in the client. Tighten when admin auth migrates to Supabase.
-- ---------------------------------------------------------------------
alter table bookings enable row level security;
alter table members enable row level security;
alter table blocked_slots enable row level security;
alter table settings enable row level security;

drop policy if exists "anon all bookings" on bookings;
drop policy if exists "anon all members" on members;
drop policy if exists "anon all blocked_slots" on blocked_slots;
drop policy if exists "anon all settings" on settings;

create policy "anon all bookings"      on bookings      for all to anon using (true) with check (true);
create policy "anon all members"       on members       for all to anon using (true) with check (true);
create policy "anon all blocked_slots" on blocked_slots for all to anon using (true) with check (true);
create policy "anon all settings"      on settings      for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------
-- Seed data — same fixtures the JS used to seed into localStorage.
-- 5 bookings spread across the next week, 7 members in mixed states.
-- Re-run safe via on conflict do nothing.
-- ---------------------------------------------------------------------
insert into members (id, name, email, phone, member_since, status, decided_at) values
  ('MEM-seed-001', 'Juan dela Cruz',     'juan.delacruz@email.com',   '0917 123 4567', now() - interval '90 days', 'approved', now() - interval '89 days'),
  ('MEM-seed-002', 'Ramon Aquino',       'ramon.aquino@email.com',    '0920 333 1122', now() - interval '60 days', 'approved', now() - interval '60 days'),
  ('MEM-seed-003', 'Carlos Bautista',    'carlos.bautista@email.com', '0917 990 8877', now() - interval '45 days', 'approved', now() - interval '44 days'),
  ('MEM-seed-004', 'Isabella Mendoza',   'isabella.mendoza@email.com','0917 222 3344', now() - interval '2 days',  'pending',  null),
  ('MEM-seed-005', 'Miguel Tan',         'miguel.tan@email.com',      '0918 555 6677', now() - interval '1 days',  'pending',  null),
  ('MEM-seed-006', 'Patricia Lim',       'patricia.lim@email.com',    '0925 111 2233', now(),                       'pending',  null),
  ('MEM-seed-007', 'Mario Gomez',        'mario.gomez@email.com',     '0915 999 8877', now() - interval '15 days', 'rejected', now() - interval '14 days')
on conflict (id) do nothing;

-- For seed bookings the occupies_slots array is precomputed against the
-- 30-min slot grid (8:00 AM..4:30 PM, no 12:xx). Service durations:
--   id 1 Essential       2–3 hrs → 6 slots
--   id 2 Executive       4–5 hrs → 10 slots
--   id 3 Obsidian Elite  6–8 hrs → 16 slots (whole day)
--   id 4 Paint Correction 5–6 hrs → 12 slots
--   id 6 Interior Rescue 3–4 hrs → 8 slots
insert into bookings (
  id, service_id, service_name, service_price, service_duration, service_category,
  date, time, customer_name, email, phone, vehicle, vehicle_year, notes,
  is_vip, coffee_order, status, detailers_assigned, occupies_slots, created_at
) values
  ('OBS-seed-0001', 2, 'The Executive', 3500, '4–5 hrs', 'full',
   current_date + 1, '10:00 AM',
   'Juan dela Cruz', 'juan.delacruz@email.com', '0917 123 4567',
   '2019 Toyota Fortuner', '2019', 'Has a small scratch on the rear bumper.',
   true, 'Macchiato', 'confirmed', 2,
   array['10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'],
   now() - interval '0 hours'),

  ('OBS-seed-0002', 1, 'The Essential', 1500, '2–3 hrs', 'exterior',
   current_date + 2, '9:00 AM',
   'Maria Santos', 'maria.santos@email.com', '0918 456 7890',
   '2021 Honda CR-V', '2021', '',
   false, '', 'confirmed', 1,
   array['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM'],
   now() - interval '1 hours'),

  ('OBS-seed-0003', 4, 'Paint Correction', 4500, '5–6 hrs', 'specialty',
   current_date + 3, '8:00 AM',
   'Ramon Aquino', 'ramon.aquino@email.com', '0920 333 1122',
   '2018 BMW 320i', '2018', 'Please pay extra attention to the wheels.',
   true, 'Cappuccino', 'confirmed', 2,
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM'],
   now() - interval '2 hours'),

  ('OBS-seed-0004', 6, 'Interior Rescue', 2500, '3–4 hrs', 'interior',
   current_date + 4, '11:00 AM',
   'Liza Reyes', 'liza.reyes@email.com', '0925 789 1234',
   '2022 Mazda 3', '2022', 'Pick-up at 5pm.',
   false, '', 'confirmed', 1,
   array['11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'],
   now() - interval '3 hours'),

  ('OBS-seed-0005', 3, 'The Obsidian Elite', 6000, '6–8 hrs', 'premium',
   current_date + 6, '8:00 AM',
   'Carlos Bautista', 'carlos.bautista@email.com', '0917 990 8877',
   '2020 Ford Ranger Raptor', '2020', 'Off-roading dust — needs deep clean.',
   true, 'Latte', 'confirmed', 3,
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM'],
   now() - interval '4 hours')
on conflict (id) do nothing;
