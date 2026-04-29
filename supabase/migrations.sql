-- =====================================================================
-- Samahuzai Carwash and Auto Detailing — Migrations
-- Run these if upgrading an existing database (schema already applied).
-- Each statement is idempotent — safe to re-run.
-- =====================================================================

-- Add cancellation_reason column (Phase 1 → Phase 1.1)
alter table bookings add column if not exists cancellation_reason text;

-- Reload PostgREST schema cache after column additions
notify pgrst, 'reload schema';
