'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import {
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
import { getDaysConsumed, getSlotsConsumed, toIsoDate } from '@/utils/bookingUtils';
import { SLOT_MINUTES } from '@/data/timeSlots';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeEndTime(startTime, slotsConsumed) {
  const m = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return '—';
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const total = h * 60 + min + slotsConsumed * SLOT_MINUTES;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const mer = endH >= 12 ? 'PM' : 'AM';
  const display = endH % 12 === 0 ? 12 : endH % 12;
  return `${display}:${String(endM).padStart(2, '0')} ${mer}`;
}

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

function getJobStatus(booking, nowMin) {
  const startMin = toMinutes(booking.time);
  const slots = getSlotsConsumed(booking.serviceDuration || '1 hr');
  const endMin = startMin + slots * SLOT_MINUTES;
  const isMultiDay = getDaysConsumed(booking.serviceDuration || '') > 1;
  if (nowMin < startMin) return 'upcoming';
  if (nowMin < endMin || isMultiDay) return 'active';
  return 'done';
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
// data or status string actually changes, not on every nowMin tick.
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
    cardClass: 'ring-1 ring-gold/40 shadow-xl shadow-gold/10',
  },
  done: {
    label: 'Done',
    dotClass: 'bg-[var(--color-success)]',
    textClass: 'text-[var(--color-success)]',
    cardClass: 'opacity-50',
  },
};

const JobCard = memo(function JobCard({ booking, catMap, status }) {
  const meta = STATUS_META[status] ?? STATUS_META.upcoming;
  const cat = catMap[booking.serviceCategory];
  const catColor = cat?.color ?? 'bg-white/10 text-cream';
  const catName = cat?.name ?? booking.serviceCategory ?? '—';
  const vehicle = [booking.vehicleYear, booking.vehicle].filter(Boolean).join(' ') || '—';

  return (
    <div
      className={`glass-card rounded-md p-6 flex flex-col gap-5 transition-all duration-500 ${meta.cardClass}`}
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

      {/* Vehicle */}
      <div className="flex items-center gap-2.5">
        <Car className="w-5 h-5 text-gold shrink-0" />
        <span className="text-cream text-lg font-medium leading-tight flex-1 min-w-0 truncate">
          {vehicle}
        </span>
        {booking.isVip && (
          <Crown className="w-4 h-4 text-gold shrink-0" aria-label="VIP member" />
        )}
      </div>

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
            {computeEndTime(booking.time, getSlotsConsumed(booking.serviceDuration || '1 hr'))}
          </div>
        </div>
      </div>

      {/* Duration */}
      <div className="flex items-center gap-2 text-cream/60">
        <Timer className="w-3.5 h-3.5 text-gold/60 shrink-0" />
        <span className="text-sm"><span className="text-muted">ETC</span> {booking.serviceDuration}</span>
      </div>

      {/* Detailers */}
      <div className="flex items-center gap-2.5 text-cream/80">
        <Users className="w-4 h-4 text-gold shrink-0" />
        <span className="text-sm">
          {booking.detailersAssigned ?? 1}{' '}
          {(booking.detailersAssigned ?? 1) === 1 ? 'Detailer' : 'Detailers'} Assigned
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
  const { bookings, serviceCategories, refetchBookings } = useApp();

  const [nowMin, setNowMin] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  // Status badge refresh every 60 s.
  // Skips the update while the page is hidden (TV browser sleep/background).
  // Immediately recalculates when the page becomes visible again so badges
  // are accurate the moment the screen wakes up.
  useEffect(() => {
    function tick() {
      if (document.visibilityState === 'hidden') return;
      const n = new Date();
      setNowMin(n.getHours() * 60 + n.getMinutes());
    }
    function onVisible() {
      if (document.visibilityState === 'visible') {
        const n = new Date();
        setNowMin(n.getHours() * 60 + n.getMinutes());
      }
    }
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  // Supabase Realtime — push-based booking updates.
  // No polling: the monitor receives an event the instant any booking is
  // inserted, updated, or deleted on any device, then re-fetches once.
  // Falls back to a 5-minute safety poll when Realtime is unavailable.
  useEffect(() => {
    if (!supabase) {
      const id = setInterval(() => refetchBookings(), 5 * 60_000);
      return () => clearInterval(id);
    }

    const channel = supabase
      .channel('monitor-bookings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => { refetchBookings(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [refetchBookings]);

  const today = toIsoDate(new Date());

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  const todayJobs = useMemo(() =>
    bookings
      .filter((b) => b.date === today && b.status !== 'cancelled' && b.status !== 'no_show')
      .sort((a, b) => toMinutes(a.time) - toMinutes(b.time)),
    [bookings, today]
  );

  const counts = useMemo(() => ({
    active:   todayJobs.filter((b) => getJobStatus(b, nowMin) === 'active').length,
    upcoming: todayJobs.filter((b) => getJobStatus(b, nowMin) === 'upcoming').length,
    done:     todayJobs.filter((b) => getJobStatus(b, nowMin) === 'done').length,
  }), [todayJobs, nowMin]);

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
                status={getJobStatus(b, nowMin)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer — fullscreen only */}
      {isFullscreen && (
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-between text-[11px] text-muted">
          <span>{todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''} today</span>
          <span>Live · Status refreshes every 60 s</span>
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
    <ProtectedRoute>
      <MonitorView />
    </ProtectedRoute>
  );
}
