-- =====================================================================
-- Samahuzai Carwash and Auto Detailing — Seed Data
-- Run AFTER schema.sql.
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Service Categories
-- ---------------------------------------------------------------------
insert into service_categories (name, slug, color, sort_order) values
  ('Exterior',  'exterior',  'bg-blue-500/15 text-blue-400',     1),
  ('Full',      'full',      'bg-success/15 text-success',       2),
  ('Premium',   'premium',   'bg-purple-500/15 text-purple-400', 3),
  ('Specialty', 'specialty', 'bg-gold/15 text-gold',             4),
  ('Interior',  'interior',  'bg-orange-400/15 text-orange-300', 5)
on conflict (lower(slug)) do nothing;

-- ---------------------------------------------------------------------
-- Coffees
-- ---------------------------------------------------------------------
insert into coffees (name, available, sort_order) values
  ('Macchiato',    true, 1),
  ('Brewed Coffee',true, 2),
  ('Cappuccino',   true, 3),
  ('Americano',    true, 4),
  ('Latte',        true, 5)
on conflict (lower(name)) do nothing;

-- ---------------------------------------------------------------------
-- Members (7 — mixed pending / approved / rejected)
-- ---------------------------------------------------------------------
insert into members (id, name, email, phone, member_since, status, decided_at) values
  ('MEM-seed-001', 'Juan dela Cruz',     'juan.delacruz@email.com',    '0917 123 4567', now() - interval '90 days', 'approved', now() - interval '89 days'),
  ('MEM-seed-002', 'Ramon Aquino',       'ramon.aquino@email.com',     '0920 333 1122', now() - interval '60 days', 'approved', now() - interval '60 days'),
  ('MEM-seed-003', 'Carlos Bautista',    'carlos.bautista@email.com',  '0917 990 8877', now() - interval '45 days', 'approved', now() - interval '44 days'),
  ('MEM-seed-004', 'Isabella Mendoza',   'isabella.mendoza@email.com', '0917 222 3344', now() - interval '2 days',  'pending',  null),
  ('MEM-seed-005', 'Miguel Tan',         'miguel.tan@email.com',       '0918 555 6677', now() - interval '1 day',   'pending',  null),
  ('MEM-seed-006', 'Patricia Lim',       'patricia.lim@email.com',     '0925 111 2233', now(),                      'pending',  null),
  ('MEM-seed-007', 'Mario Gomez',        'mario.gomez@email.com',      '0915 999 8877', now() - interval '15 days', 'rejected', now() - interval '14 days')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Bookings (13 total — 5 original + 8 new)
--
-- occupies_slots is precomputed on the 30-min slot grid (8:00 AM–4:30 PM,
-- no 12:xx slots). Slot counts by service duration:
--   id 1 Essential        2–3 hrs  →  6 slots
--   id 2 Executive        4–5 hrs  → 10 slots
--   id 3 Obsidian Elite   6–8 hrs  → 16 slots (full day)
--   id 4 Paint Correction 5–6 hrs  → 12 slots
--   id 6 Interior Rescue  3–4 hrs  →  8 slots
-- ---------------------------------------------------------------------
insert into bookings (
  id, service_id, service_name, service_price, service_duration, service_category,
  date, time, customer_name, email, phone, vehicle, vehicle_year, notes,
  is_vip, coffee_order, status, cancellation_reason, detailers_assigned, occupies_slots, created_at
) values

  -- ── Original 5 ──────────────────────────────────────────────────────

  ('OBS-seed-0001', 2, 'The Executive', 3500, '4–5 hrs', 'full',
   current_date + 1, '10:00 AM',
   'Juan dela Cruz', 'juan.delacruz@email.com', '0917 123 4567',
   'Toyota Fortuner', '2019', 'Small scratch on rear bumper.',
   true, 'Macchiato', 'confirmed', null, '{}'::uuid[],
   array['10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'],
   now() - interval '5 hours'),

  ('OBS-seed-0002', 1, 'The Essential', 1500, '2–3 hrs', 'exterior',
   current_date + 2, '9:00 AM',
   'Maria Santos', 'maria.santos@email.com', '0918 456 7890',
   'Honda CR-V', '2021', '',
   false, '', 'confirmed', null, '{}'::uuid[],
   array['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM'],
   now() - interval '4 hours'),

  ('OBS-seed-0003', 4, 'Paint Correction', 4500, '5–6 hrs', 'specialty',
   current_date + 3, '8:00 AM',
   'Ramon Aquino', 'ramon.aquino@email.com', '0920 333 1122',
   'BMW 320i', '2018', 'Pay extra attention to the wheels.',
   true, 'Cappuccino', 'confirmed', null, '{}'::uuid[],
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM'],
   now() - interval '3 hours'),

  ('OBS-seed-0004', 6, 'Interior Rescue', 2500, '3–4 hrs', 'interior',
   current_date + 4, '11:00 AM',
   'Liza Reyes', 'liza.reyes@email.com', '0925 789 1234',
   'Mazda 3', '2022', 'Pick-up at 5pm.',
   false, '', 'confirmed', null, '{}'::uuid[],
   array['11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'],
   now() - interval '2 hours'),

  ('OBS-seed-0005', 3, 'The Obsidian Elite', 6000, '6–8 hrs', 'premium',
   current_date + 6, '8:00 AM',
   'Carlos Bautista', 'carlos.bautista@email.com', '0917 990 8877',
   'Ford Ranger Raptor', '2020', 'Off-roading dust — needs deep clean.',
   true, 'Latte', 'confirmed', null, '{}'::uuid[],
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM'],
   now() - interval '1 hour'),

  -- ── New 8 ────────────────────────────────────────────────────────────

  ('OBS-seed-0006', 1, 'The Essential', 1500, '2–3 hrs', 'exterior',
   current_date - 2, '8:00 AM',
   'Angelo Villanueva', 'angelo.villanueva@email.com', '0917 234 5678',
   'Mitsubishi Montero', '2020', '',
   false, '', 'confirmed', null, '{}'::uuid[],
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM'],
   now() - interval '3 days'),

  ('OBS-seed-0007', 2, 'The Executive', 3500, '4–5 hrs', 'full',
   current_date - 3, '8:00 AM',
   'Sofia Dela Torre', 'sofia.delatorre@email.com', '0920 876 5432',
   'Toyota Corolla Cross', '2023', 'Recently bought, first full detail.',
   true, 'Americano', 'confirmed', null, '{}'::uuid[],
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM'],
   now() - interval '4 days'),

  ('OBS-seed-0008', 6, 'Interior Rescue', 2500, '3–4 hrs', 'interior',
   current_date - 4, '1:00 PM',
   'Noel Pascual', 'noel.pascual@email.com', '0915 321 6549',
   'Nissan Terra', '2021', 'Dog hair all over the seats.',
   false, '', 'cancelled', 'Customer request', '{}'::uuid[],
   array['1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM'],
   now() - interval '5 days'),

  ('OBS-seed-0009', 4, 'Paint Correction', 4500, '5–6 hrs', 'specialty',
   current_date - 5, '8:00 AM',
   'Kristine Padilla', 'kristine.padilla@email.com', '0918 112 2334',
   'Honda Civic', '2019', 'Several swirl marks on hood and roof.',
   false, '', 'confirmed', null, '{}'::uuid[],
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM'],
   now() - interval '6 days'),

  ('OBS-seed-0010', 2, 'The Executive', 3500, '4–5 hrs', 'full',
   current_date - 7, '10:00 AM',
   'Ricardo Flores', 'ricardo.flores@email.com', '0917 445 5566',
   'Hyundai Tucson', '2022', '',
   false, '', 'no_show', null, '{}'::uuid[],
   array['10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'],
   now() - interval '8 days'),

  ('OBS-seed-0011', 1, 'The Essential', 1500, '2–3 hrs', 'exterior',
   current_date - 8, '9:00 AM',
   'Maricel Ocampo', 'maricel.ocampo@email.com', '0925 667 7889',
   'Suzuki Swift', '2023', 'Just needs a quick wash before event.',
   false, '', 'confirmed', null, '{}'::uuid[],
   array['9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM'],
   now() - interval '9 days'),

  ('OBS-seed-0012', 3, 'The Obsidian Elite', 6000, '6–8 hrs', 'premium',
   current_date - 10, '8:00 AM',
   'Juan dela Cruz', 'juan.delacruz@email.com', '0917 123 4567',
   'Toyota Fortuner', '2019', 'Repeat client — VIP priority.',
   true, 'Macchiato', 'confirmed', null, '{}'::uuid[],
   array['8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM'],
   now() - interval '11 days'),

  ('OBS-seed-0013', 6, 'Interior Rescue', 2500, '3–4 hrs', 'interior',
   current_date - 12, '11:00 AM',
   'Carlos Bautista', 'carlos.bautista@email.com', '0917 990 8877',
   'Ford Ranger Raptor', '2020', 'Mud and sand from weekend trip.',
   true, 'Brewed Coffee', 'cancelled', 'Schedule conflict', '{}'::uuid[],
   array['11:00 AM','11:30 AM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM'],
   now() - interval '13 days')

on conflict (id) do nothing;
