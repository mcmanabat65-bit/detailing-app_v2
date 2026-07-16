'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Users,
  Save,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { DEFAULT_SETTINGS, getSlotsConsumed } from '@/utils/bookingUtils';
import { timeSlots, GRID_END_MINUTES } from '@/data/timeSlots';

// Minutes-since-midnight <-> "HH:MM" for <input type="time">.
const minutesToTimeInput = (mins) => {
  const m = Number(mins);
  if (!Number.isFinite(m)) return '';
  const h = Math.floor(m / 60);
  const min = m % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
};
const timeInputToMinutes = (val) => {
  const [h, m] = String(val).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
};
// 1020 -> "5:00 PM" for display copy.
const minutesToLabel = (mins) => {
  const m = Number(mins);
  if (!Number.isFinite(m)) return '';
  const h24 = Math.floor(m / 60);
  const min = m % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, '0')} ${period}`;
};

function SettingsForm() {
  const { settings, updateSettings, bookings, detailers, hydrated, showToast } =
    useApp();

  // The pool size is no longer typed by hand — it mirrors the live count of
  // active detailers managed on the Detailers page.
  const poolSize = useMemo(
    () => detailers.filter((d) => d.isActive !== false).length,
    [detailers]
  );

  const [defaultDet, setDefaultDet] = useState(
    settings.defaultDetailersPerBooking
  );
  const [closingMins, setClosingMins] = useState(
    settings.closingMinutes ?? DEFAULT_SETTINGS.closingMinutes
  );

  useEffect(() => {
    setDefaultDet(settings.defaultDetailersPerBooking);
    setClosingMins(settings.closingMinutes ?? DEFAULT_SETTINGS.closingMinutes);
  }, [settings]);

  // Across all active bookings, find the busiest (date,time) cell — that
  // is the floor below which the pool cannot shrink without leaving an
  // existing booking over-capacity.
  const peakUsage = useMemo(() => {
    if (!hydrated) return { peak: 0, when: null };
    const totals = new Map();
    for (const b of bookings) {
      if (b.status === 'cancelled' || b.status === 'no_show') continue;
      const startIdx = timeSlots.indexOf(b.time);
      if (startIdx < 0) continue;
      const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
      const headcount = Array.isArray(b.detailersAssigned) ? b.detailersAssigned.length : (Number(b.detailersAssigned) || 1);
      for (let i = 0; i < consumed && startIdx + i < timeSlots.length; i++) {
        const key = `${b.date}|${timeSlots[startIdx + i]}`;
        totals.set(key, (totals.get(key) || 0) + headcount);
      }
    }
    let peak = 0;
    let when = null;
    for (const [key, v] of totals.entries()) {
      if (v > peak) {
        peak = v;
        when = key;
      }
    }
    return { peak, when };
  }, [bookings, hydrated]);

  // Can't shrink the pool below what existing bookings already need.
  const poolBlockedByPeak = poolSize > 0 && poolSize < peakUsage.peak;

  // Keep the saved pool size in lock-step with the active detailer count.
  // Skip when there are no active detailers (avoid zeroing capacity) or when
  // doing so would leave existing bookings over capacity.
  useEffect(() => {
    if (!hydrated) return;
    if (poolSize < 1) return;
    if (poolSize === settings.detailerPoolSize) return;
    if (poolBlockedByPeak) return;
    updateSettings({ detailerPoolSize: poolSize });
    // updateSettings intentionally omitted — its identity changes on each
    // settings refetch; the equality guards above prevent a re-sync loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, poolSize, settings.detailerPoolSize, poolBlockedByPeak]);

  const savedClosing = settings.closingMinutes ?? DEFAULT_SETTINGS.closingMinutes;
  const dirty =
    Number(defaultDet) !== settings.defaultDetailersPerBooking ||
    Number(closingMins) !== savedClosing;

  const handleSave = async (e) => {
    e.preventDefault();
    const result = await updateSettings({
      defaultDetailersPerBooking: Number(defaultDet),
      closingMinutes: Number(closingMins),
    });
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Settings saved.', 'success');
  };

  const handleReset = () => {
    setDefaultDet(DEFAULT_SETTINGS.defaultDetailersPerBooking);
    setClosingMins(DEFAULT_SETTINGS.closingMinutes);
  };

  return (
    <AdminLayout title="Settings">
      <div className="grid lg:grid-cols-[1fr_340px] gap-6 max-w-5xl">
        <form onSubmit={handleSave} className="glass-card rounded-md p-6 md:p-8 space-y-6">
          <div>
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-2">
              Capacity
            </div>
            <h2 className="font-serif text-2xl text-cream">Detailer Pool</h2>
            <p className="text-muted text-sm mt-1">
              Configure how many detailers are available shop-wide. Each booking
              consumes some of this pool for the hours it occupies.
            </p>
          </div>

          <Field
            label="Total detailers in the shop"
            hint="Auto-counted from your active detailers on the Detailers page. Add, remove, or deactivate detailers there to change this."
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 w-32 px-4 py-2.5 rounded-sm bg-surface-2 border border-white/10">
                <Users className="w-4 h-4 text-gold" />
                <span className="font-serif text-2xl text-cream leading-none">
                  {poolSize}
                </span>
              </div>
              <span className="text-xs text-muted">
                active {poolSize === 1 ? 'detailer' : 'detailers'}
              </span>
            </div>
          </Field>

          <Field
            label="Default detailers per new booking"
            hint="Auto-assigned when a customer books. Admin can adjust per booking. Must not exceed the pool size."
          >
            <input
              type="number"
              min={1}
              max={Number(poolSize) || 50}
              value={defaultDet}
              onChange={(e) => setDefaultDet(e.target.value)}
              className="input w-32"
              required
            />
          </Field>

          {poolBlockedByPeak && (
            <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-3 flex gap-3 text-sm text-cream/90">
              <AlertTriangle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div>
                Existing bookings already need <b>{peakUsage.peak}</b> detailers
                in one hour, but only <b>{poolSize}</b> are active. The saved
                pool stays at <b>{settings.detailerPoolSize}</b> until you
                reactivate detailers or reassign those bookings.
              </div>
            </div>
          )}

          <div className="border-t border-white/5 pt-6">
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-2">
              Operating hours
            </div>
            <h2 className="font-serif text-2xl text-cream">Closing time</h2>
            <p className="text-muted text-sm mt-1">
              The shop opens at 8:00 AM. A booking that would finish after the
              closing time is flagged so staff can choose to extend into the
              evening or move it to the next day.
            </p>
          </div>

          <Field
            label="Closing time"
            hint={`Services must finish by this time by default. Staff can still extend a long job past closing on a per-booking basis (up to ${minutesToLabel(GRID_END_MINUTES)}).`}
          >
            <div className="relative w-40">
              <Clock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="time"
                value={minutesToTimeInput(closingMins)}
                min="08:00"
                max={minutesToTimeInput(GRID_END_MINUTES)}
                onChange={(e) => {
                  const mins = timeInputToMinutes(e.target.value);
                  if (mins != null) setClosingMins(mins);
                }}
                className="input w-full pl-9 [color-scheme:dark]"
                required
              />
            </div>
          </Field>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={!dirty || Number(defaultDet) > Number(poolSize || 50)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              Save changes
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to defaults
            </button>
          </div>
        </form>

        <aside className="glass-card rounded-md p-6 h-fit space-y-5">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">
              Current pool
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-gold/15 text-gold flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="font-serif text-3xl text-cream leading-none">
                  {settings.detailerPoolSize}
                </div>
                <div className="text-xs text-muted mt-1">detailers</div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-5">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Peak demand
            </div>
            {peakUsage.peak > 0 ? (
              <>
                <div className="text-cream text-lg font-medium">
                  {peakUsage.peak} of {settings.detailerPoolSize} detailers
                </div>
                {peakUsage.when && (
                  <div className="text-xs text-muted mt-1">
                    {peakUsage.when.split('|').join(' · ')}
                  </div>
                )}
              </>
            ) : (
              <div className="text-muted text-sm">
                No active bookings yet.
              </div>
            )}
          </div>

          <div className="border-t border-white/5 pt-5 text-xs text-muted leading-relaxed">
            Min/recommended detailers are configured per-service in code (see
            <code className="text-gold/80 mx-1">/src/data/services.js</code>).
            Bookings are auto-assigned the higher of the service minimum and
            this default.
          </div>
        </aside>
      </div>
    </AdminLayout>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
        {label}
      </div>
      {children}
      {hint && <div className="text-xs text-muted mt-1.5">{hint}</div>}
      <style jsx>{`
        :global(.input) {
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
      `}</style>
    </label>
  );
}

export default function AdminSettingsPage() {
  return (
    <ProtectedRoute permission="settings.view">
      <SettingsForm />
    </ProtectedRoute>
  );
}
