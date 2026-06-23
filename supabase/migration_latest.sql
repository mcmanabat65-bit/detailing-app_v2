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

notify pgrst, 'reload schema';

-- Vehicle type color coding (monitor differentiation)
-- Distinguishes 4-wheel cars from big bikes / motorcycles on the shop monitor.
-- Phase 5 — Vehicle type is a property of the car catalog, not the booking form.
-- The booking inherits vehicle_type from the selected car at booking time.
-- 1 = car (4-wheel), 2 = motorcycle (big bike)
alter table cars    add column if not exists vehicle_type smallint not null default 1 check (vehicle_type in (1, 2));
alter table bookings add column if not exists vehicle_type smallint not null default 1 check (vehicle_type in (1, 2));


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

notify pgrst, 'reload schema';

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
-- Bootstrap: when admin_users is empty, any authenticated user counts as
-- super_admin so the boss can sign in and assign the first roles.
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
       or not exists (select 1 from admin_users)
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

notify pgrst, 'reload schema';

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

-- =====================================================================
-- Phase 6 — Member portal (self-service VIP login)
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

notify pgrst, 'reload schema';