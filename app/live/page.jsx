'use client';

import { memo, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarCheck,
  Car,
  Clock,
  Timer,
  Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { getSlotsConsumed, toIsoDate } from '@/utils/bookingUtils';

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

function computeEndTime(startTime, slotsConsumed) {
  const m = startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return '—';
  let h = parseInt(m[1]);
  const min = parseInt(m[2]);
  const period = m[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const total = h * 60 + min + slotsConsumed * 60;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  const mer = endH >= 12 ? 'PM' : 'AM';
  const display = endH % 12 === 0 ? 12 : endH % 12;
  return `${display}:${String(endM).padStart(2, '0')} ${mer}`;
}

// ---------------------------------------------------------------------------
// Live job card — public-facing, no customer personal data shown
// ---------------------------------------------------------------------------

const LiveCard = memo(function LiveCard({ booking, catMap }) {
  const isActive = booking.status === 'on-going';
  const cat = catMap[booking.serviceCategory];
  const catColor = cat?.color ?? 'bg-white/10 text-cream';
  const catName = cat?.name ?? booking.serviceCategory ?? '—';
  const vehicle = [booking.vehicleYear, booking.vehicle].filter(Boolean).join(' ') || '—';
  const slots = getSlotsConsumed(booking.serviceDuration || '1 hr');
  const endTime = computeEndTime(booking.time, slots);

  return (
    <div
      className={`glass-card rounded-md p-6 flex flex-col gap-4 transition-all duration-500 ${
        isActive
          ? 'ring-1 ring-gold/30 shadow-lg shadow-gold/5'
          : 'opacity-75'
      }`}
    >
      {/* Category tag + status */}
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${catColor}`}>
          {catName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isActive ? 'bg-gold animate-pulse' : 'bg-white/25'
            }`}
          />
          <span
            className={`text-[10px] uppercase tracking-widest font-medium ${
              isActive ? 'text-gold' : 'text-muted'
            }`}
          >
            {isActive ? 'In Progress' : 'Upcoming'}
          </span>
        </div>
      </div>

      {/* Vehicle — the hero element */}
      <div>
        <div className="font-serif text-2xl md:text-3xl text-cream leading-tight">
          {vehicle}
        </div>
        <div className="text-sm text-muted mt-1">{booking.serviceName}</div>
      </div>

      {/* Divider */}
      <div className="border-t border-white/5" />

      {/* Time range */}
      <div className="flex items-center gap-2 text-sm text-cream/70">
        <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
        <span className="tabular-nums">{booking.time}</span>
        <span className="text-muted mx-0.5">→</span>
        <span className="tabular-nums">{endTime}</span>
        <span className="text-muted ml-auto flex items-center gap-1 text-[11px]">
          <Timer className="w-3 h-3" />
          {booking.serviceDuration}
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
    <div className="flex flex-col items-center justify-center py-28 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <CalendarCheck className="w-8 h-8 text-muted" />
      </div>
      <div className="font-serif text-3xl text-cream/60 mb-2">All Bays Open</div>
      <div className="text-muted text-sm mb-8 max-w-xs">
        No active jobs right now — we&apos;re ready to take your car.
      </div>
      <Link
        href="/booking"
        className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
      >
        Book Your Detail
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LivePage() {
  const { bookings, serviceCategories } = useApp();

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  const today = toIsoDate(new Date());

  const liveJobs = useMemo(() =>
    bookings
      .filter((b) =>
        b.date === today &&
        (b.status === 'confirmed' || b.status === 'on-going')
      )
      .sort((a, b) => {
        // on-going first, then chronologically
        if (a.status === 'on-going' && b.status !== 'on-going') return -1;
        if (b.status === 'on-going' && a.status !== 'on-going') return 1;
        return toMinutes(a.time) - toMinutes(b.time);
      }),
    [bookings, today]
  );

  const activeCount = liveJobs.filter((b) => b.status === 'on-going').length;
  const upcomingCount = liveJobs.filter((b) => b.status === 'confirmed').length;

  return (
    <div className="min-h-screen bg-obsidian">
      <div className="max-w-6xl mx-auto px-5 md:px-8 pt-28 md:pt-36 pb-20">

        {/* Page header */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-5">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-gold">Live Now</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl text-cream mb-4 leading-tight">
            Live at the Shop
          </h1>
          <p className="text-muted text-base max-w-md">
            A real-time look at what&apos;s in our bays today. Updates the moment our
            team starts a job.
          </p>

          {/* Status summary */}
          {liveJobs.length > 0 && (
            <div className="flex items-center gap-3 mt-7 flex-wrap">
              {activeCount > 0 && (
                <div className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 rounded-sm px-3 py-1.5">
                  <Zap className="w-3 h-3 text-gold" />
                  <span className="text-gold text-xs font-semibold">
                    {activeCount} In Progress
                  </span>
                </div>
              )}
              {upcomingCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-sm px-3 py-1.5">
                  <Clock className="w-3 h-3 text-muted" />
                  <span className="text-muted text-xs">
                    {upcomingCount} Upcoming
                  </span>
                </div>
              )}
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-sm px-3 py-1.5">
                <Car className="w-3 h-3 text-muted" />
                <span className="text-muted text-xs">
                  {liveJobs.length} car{liveJobs.length !== 1 ? 's' : ''} today
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Job grid or empty state */}
        {liveJobs.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {liveJobs.map((b) => (
                <LiveCard key={b.id} booking={b} catMap={catMap} />
              ))}
            </div>

            {/* CTA */}
            <div className="mt-16 pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <div className="font-serif text-2xl text-cream mb-1">Ready for your turn?</div>
                <div className="text-muted text-sm">
                  Book your detail and we&apos;ll get your car in top shape.
                </div>
              </div>
              <Link
                href="/booking"
                className="shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                Book Your Detail
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
