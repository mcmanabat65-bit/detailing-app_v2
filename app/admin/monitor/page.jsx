'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import {
  Bike,
  Car,
  CheckCircle2,
  Clock,
  Crown,
  Maximize2,
  Minimize2,
  Sparkles,
  Timer,
  Users,
  Zap,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';
import { bookingCoversDate, computeBookingETC, toIsoDate } from '@/utils/bookingUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toMinutes(timeStr = '') {
  const m = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

/** Format elapsed minutes between two ISO strings as "Xh Ym". */
function fmtElapsed(startIso, endIso) {
  if (!startIso) return null;
  const start = new Date(startIso);
  const end   = endIso ? new Date(endIso) : new Date();
  const mins  = Math.round((end - start) / 60_000);
  if (mins < 0) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Ticking elapsed timer for on-going bookings. Updates every 30s. */
function LiveElapsed({ startedAt }) {
  const [elapsed, setElapsed] = useState(() => fmtElapsed(startedAt));
  useEffect(() => {
    setElapsed(fmtElapsed(startedAt));
    const id = setInterval(() => setElapsed(fmtElapsed(startedAt)), 30_000);
    return () => clearInterval(id);
  }, [startedAt]);
  if (!elapsed) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 rounded-sm px-3 py-2">
      <Timer className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
      <div className="leading-none">
        <div className="text-[10px] uppercase tracking-widest text-amber-400/70 mb-0.5">Elapsed</div>
        <div className="text-amber-400 font-semibold text-sm tabular-nums">{elapsed}</div>
      </div>
    </div>
  );
}

// Status is driven by the explicit booking status set by the admin,
// not by clock time — so the monitor reflects the real shop floor state.
function getJobStatus(booking) {
  if (booking.status === 'on-going') return 'active';
  if (booking.status === 'completed') return 'done';
  return 'upcoming'; // confirmed
}

// ---------------------------------------------------------------------------
// Live clock
// Updates every second; immediately corrects on tab visibility restore
// so the clock is accurate when a smart TV browser wakes the tab back up.
// ---------------------------------------------------------------------------

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') setNow(new Date());
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return (
    <div className="text-right leading-none">
      <div className="font-serif text-4xl text-cream tabular-nums tracking-tight">
        {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </div>
      <div className="text-sm text-muted mt-1">
        {now.toLocaleDateString('en-PH', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single booking card — memoized so it only re-renders when its own
// data or status string actually changes.
// ---------------------------------------------------------------------------

const STATUS_META = {
  upcoming: {
    label: 'Upcoming',
    dotClass: 'bg-white/30',
    textClass: 'text-muted',
    cardClass: '',
  },
  active: {
    label: 'In Progress',
    dotClass: 'bg-gold animate-pulse',
    textClass: 'text-gold',
    cardClass: 'shadow-xl shadow-gold/10',
  },
  done: {
    label: 'Done',
    dotClass: 'bg-[var(--color-success)]',
    textClass: 'text-[var(--color-success)]',
    cardClass: 'opacity-50',
  },
};

// 1 = car, 2 = motorcycle
const VEHICLE_META = {
  1: {
    Icon: Car,
    iconClass: 'text-gold',
    borderClass: 'vehicle-border-car',
    badge: '4-Wheel',
    badgeClass: 'text-gold/70',
  },
  2: {
    Icon: Bike,
    iconClass: 'text-sky-400',
    borderClass: 'vehicle-border-bike',
    badge: 'Big Bike',
    badgeClass: 'text-sky-400/80',
  },
};

const JobCard = memo(function JobCard({ booking, catMap, status, detailerMap }) {
  const meta = STATUS_META[status] ?? STATUS_META.upcoming;
  const vtype = VEHICLE_META[booking.vehicleType] ?? VEHICLE_META[1];
  const cat = catMap[booking.serviceCategory];
  const catColor = cat?.color ?? 'bg-white/10 text-cream';
  const catName = cat?.name ?? booking.serviceCategory ?? '—';
  const vehicle = [booking.vehicleYear, booking.vehicle].filter(Boolean).join(' ') || '—';

  return (
    <div
      className={`glass-card rounded-md p-6 flex flex-col gap-5 transition-all duration-500 ${meta.cardClass} ${vtype.borderClass}`}
    >
      {/* Service name + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm mb-2 ${catColor}`}>
            {catName}
          </span>
          <h2 className="font-serif text-2xl text-cream leading-tight">
            {booking.serviceName}
          </h2>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
          <span className={`w-2 h-2 rounded-full shrink-0 ${meta.dotClass}`} />
          <span className={`text-[11px] uppercase tracking-widest font-medium ${meta.textClass}`}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Vehicle + customer */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex-1 min-w-0">
          <span className="text-cream text-lg font-medium leading-tight block truncate">
            {vehicle}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <vtype.Icon className={`w-3.5 h-3.5 ${vtype.iconClass} shrink-0`} />
            <span className={`text-[10px] uppercase tracking-widest ${vtype.badgeClass}`}>
              {vtype.badge}
            </span>
          </div>
        </div>
        {booking.isVip && (
          <Crown className="w-4 h-4 text-gold shrink-0 mt-0.5" aria-label="VIP member" />
        )}
      </div>
      {booking.nickname && (
        <div className="text-gold/80 text-sm leading-tight font-medium">
          "{booking.nickname}"
        </div>
      )}

      {/* Time block */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/[0.04] rounded-sm px-3 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">
            Start
          </div>
          <div className="flex items-center gap-1.5 text-cream font-semibold">
            <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
            {booking.time}
          </div>
        </div>
        <div className="bg-white/[0.04] rounded-sm px-3 py-3">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">
            Finish
          </div>
          <div className="flex items-center gap-1.5 text-cream font-semibold">
            <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
            {computeBookingETC(booking)}
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 text-cream/60">
        <Timer className="w-3.5 h-3.5 text-gold/60 shrink-0" />
        <span className="text-sm">
          <span className="text-muted">ETC</span> {booking.serviceDuration}
        </span>
      </div>

      {/* Actual task time */}
      {status === 'active' && booking.startedAt && (
        <LiveElapsed startedAt={booking.startedAt} />
      )}
      {status === 'done' && booking.startedAt && booking.completedAt && (
        <div className="flex items-center gap-2 bg-success/10 border border-success/20 rounded-sm px-3 py-2">
          <Timer className="w-3.5 h-3.5 text-success shrink-0" />
          <div className="leading-none">
            <div className="text-[10px] uppercase tracking-widest text-success/70 mb-0.5">Actual time</div>
            <div className="text-success font-semibold text-sm tabular-nums">
              {fmtElapsed(booking.startedAt, booking.completedAt)}
            </div>
          </div>
        </div>
      )}

      {/* Detailers */}
      <div className="flex items-start gap-2.5 text-cream/80">
        <Users className="w-4 h-4 text-gold shrink-0 mt-0.5" />
        <span className="text-sm">
          {Array.isArray(booking.detailersAssigned) && booking.detailersAssigned.length > 0
            ? booking.detailersAssigned.map((id) => detailerMap?.[id] || id).join(', ')
            : 'No detailer assigned'}
        </span>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 py-32 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-8 h-8 text-muted" />
      </div>
      <div className="font-serif text-3xl text-cream/60 mb-2">
        All Clear
      </div>
      <div className="text-muted text-sm">No active jobs scheduled for today.</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Monitor content
// ---------------------------------------------------------------------------

function MonitorContent({ isFullscreen, onToggle }) {
  const { bookings, serviceCategories, detailers, refetchBookings } = useApp();

  // Booking updates arrive via the global AppContext Realtime subscription.
  // This fallback poll only activates when Supabase is unavailable.
  useEffect(() => {
    if (supabase) return;
    const id = setInterval(() => refetchBookings(), 5 * 60_000);
    return () => clearInterval(id);
  }, [refetchBookings]);

  const today = toIsoDate(new Date());

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);


  // detailerId → name
  const detailerMap = useMemo(() => {
    const m = {};
    detailers.forEach((d) => { m[d.id] = d.nickname || d.name; });
    return m;
  }, [detailers]);

  const todayJobs = useMemo(() =>
    bookings
      .filter((b) => {
        if (b.status === 'cancelled' || b.status === 'no_show' || b.status === 'pending') return false;
        // An in-progress job stays on the monitor until it's marked done —
        // multi-day details (2–3+ days) keep showing every day they run, even
        // past their start date.
        if (b.status === 'on-going') return true;
        // Confirmed (upcoming) and completed jobs show on any day their
        // scheduled span covers — start date or a multi-day continuation day.
        return bookingCoversDate(b, today);
      })
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time)),
    [bookings, today]
  );

  const counts = useMemo(() => ({
    active:   todayJobs.filter((b) => getJobStatus(b) === 'active').length,
    upcoming: todayJobs.filter((b) => getJobStatus(b) === 'upcoming').length,
    done:     todayJobs.filter((b) => getJobStatus(b) === 'done').length,
  }), [todayJobs]);

  return (
    <div className={`flex flex-col min-h-full ${isFullscreen ? 'bg-obsidian' : ''}`}>

      {/* Monitor header */}
      <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b border-white/5 ${
        isFullscreen ? 'bg-surface/40' : 'bg-surface/20 rounded-md mb-6'
      }`}>
        {/* Branding */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-obsidian" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="font-serif text-lg text-cream">Samahuzai Carwash</div>
            <div className="text-[9px] tracking-[0.3em] text-gold uppercase mt-0.5">
              Shop Monitor
            </div>
          </div>
        </div>

        {/* Status pills */}
        <div className="hidden sm:flex items-center gap-3">
          {counts.active > 0 && (
            <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 rounded-sm px-3 py-1.5">
              <Zap className="w-3 h-3 text-gold" />
              <span className="text-gold text-xs font-semibold">
                {counts.active} In Progress
              </span>
            </div>
          )}
          {counts.upcoming > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-sm px-3 py-1.5">
              <Clock className="w-3 h-3 text-muted" />
              <span className="text-muted text-xs">
                {counts.upcoming} Upcoming
              </span>
            </div>
          )}
          {counts.done > 0 && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-sm px-3 py-1.5">
              <CheckCircle2 className="w-3 h-3 text-[var(--color-success)]" />
              <span className="text-[var(--color-success)] text-xs">
                {counts.done} Done
              </span>
            </div>
          )}
        </div>

        {/* Clock + toggle */}
        <div className="flex items-center gap-6">
          <LiveClock />
          <button
            onClick={onToggle}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="p-2.5 border border-white/10 rounded-sm text-muted hover:text-gold hover:border-gold/50 transition-colors shrink-0"
          >
            {isFullscreen
              ? <Minimize2 className="w-4 h-4" />
              : <Maximize2 className="w-4 h-4" />
            }
          </button>
        </div>
      </div>

      {/* Jobs grid */}
      <div className={`flex-1 ${isFullscreen ? 'px-6 py-6' : ''}`}>
        {todayJobs.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {todayJobs.map((b) => (
              <JobCard
                key={b.id}
                booking={b}
                catMap={catMap}
                status={getJobStatus(b)}
                detailerMap={detailerMap}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer — fullscreen only */}
      {isFullscreen && (
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-[11px] text-muted">
          <span>{todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''} today</span>
          <span>Live · Updates instantly when admin changes a booking status</span>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view — handles fullscreen toggle
// ---------------------------------------------------------------------------

function MonitorView() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const enterFullscreen = () => {
    setIsFullscreen(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const exitFullscreen = () => {
    setIsFullscreen(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  };

  const toggle = isFullscreen ? exitFullscreen : enterFullscreen;

  // Sync state when user presses Esc (browser exits fullscreen natively)
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-obsidian overflow-auto flex flex-col">
        <MonitorContent isFullscreen onToggle={toggle} />
      </div>
    );
  }

  return (
    <AdminLayout title="Shop Monitor">
      <MonitorContent isFullscreen={false} onToggle={toggle} />
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Page export
// ---------------------------------------------------------------------------

export default function MonitorPage() {
  return (
    <ProtectedRoute permission="monitor.view">
      <MonitorView />
    </ProtectedRoute>
  );
}
