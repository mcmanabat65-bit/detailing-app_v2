'use client';

import { useMemo, useState } from 'react';
import {
  Bike,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Timer,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { categoryColors } from '@/data/services';
import {
  computeBookingETC,
  getSlotsConsumed,
  nearestSlotAtOrBefore,
  toIsoDate,
} from '@/utils/bookingUtils';
import { timeSlots } from '@/data/timeSlots';

const weekDates = (anchor) => {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
};

// Build cells[isoDate][time] = { starts: booking | null, passThrough: booking | null }
function buildCells(week, bookings) {
  const map = {};
  for (const d of week) {
    const iso = toIsoDate(d);
    map[iso] = {};
    for (const t of timeSlots) {
      map[iso][t] = { starts: null, passThrough: null };
    }
  }
  for (const b of bookings) {
    if (b.status === 'cancelled' || b.status === 'no_show' || b.status === 'pending') continue;
    if (!map[b.date]) continue;
    const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
    let startIdx = timeSlots.indexOf(b.time);
    if (startIdx === -1) {
      const nearest = nearestSlotAtOrBefore(b.time);
      startIdx = nearest ? timeSlots.indexOf(nearest) : -1;
    }
    if (startIdx === -1) continue;
    for (let i = 0; i < consumed; i++) {
      const t = timeSlots[startIdx + i];
      if (!t) break;
      const cell = map[b.date][t];
      if (i === 0) cell.starts = b;
      else if (!cell.passThrough) cell.passThrough = b;
    }
  }
  return map;
}

function StartCard({ booking, catMap }) {
  const color = categoryColors[booking.serviceCategory] || '#00704A';
  const catName = catMap[booking.serviceCategory]?.name ?? booking.serviceCategory ?? '—';
  const vehicle = [booking.vehicleYear, booking.vehicle].filter(Boolean).join(' ') || '—';
  const etc = computeBookingETC(booking);
  const VehicleIcon = booking.vehicleType === 2 ? Bike : Car;

  return (
    <div
      className="rounded-sm p-2 text-xs w-full"
      style={{ background: `${color}18`, borderLeft: `3px solid ${color}` }}
    >
      <div className="text-[9px] uppercase tracking-widest mb-1" style={{ color }}>
        {catName}
      </div>
      <div className="text-cream font-medium text-[11px] leading-tight mb-1.5 truncate">
        {booking.serviceName}
      </div>
      <div className="flex items-center gap-1 text-cream/70 text-[10px] mb-1.5">
        <VehicleIcon className="w-2.5 h-2.5 shrink-0" style={{ color }} />
        <span className="truncate">{vehicle}</span>
      </div>
      <div className="flex items-center gap-1 text-muted text-[10px]">
        <Clock className="w-2 h-2 shrink-0" />
        <span>{booking.time}</span>
        <span className="text-muted/40 mx-0.5">→</span>
        <Timer className="w-2 h-2 shrink-0" />
        <span>{etc}</span>
      </div>
      {booking.isVip && booking.nickname && (
        <div className="mt-1 flex items-center gap-1 text-gold/80 text-[10px]">
          <Crown className="w-2 h-2 shrink-0" />
          <span className="truncate">&ldquo;{booking.nickname}&rdquo;</span>
        </div>
      )}
    </div>
  );
}

export default function PublicSchedulePage() {
  const { bookings, serviceCategories } = useApp();
  const [anchor, setAnchor] = useState(new Date());

  const week = useMemo(() => weekDates(anchor), [anchor]);
  const today = toIsoDate(new Date());

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  const cells = useMemo(() => buildCells(week, bookings), [week, bookings]);

  const weekLabel = `${week[0].toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric',
  })} – ${week[6].toLocaleDateString('en-PH', {
    month: 'short', day: 'numeric', year: 'numeric',
  })}`;

  const prevWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() - 7);
    setAnchor(d);
  };

  const nextWeek = () => {
    const d = new Date(anchor);
    d.setDate(d.getDate() + 7);
    setAnchor(d);
  };

  return (
    <div className="page-enter pt-28 md:pt-36 pb-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="mb-10">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">Live from the Shop</div>
          <h1 className="font-serif text-5xl md:text-6xl text-cream mb-4">Shop Schedule</h1>
          <p className="text-muted text-lg leading-relaxed max-w-xl">
            See what&apos;s on the floor this week. Confirmed bookings only — updated in real time.
          </p>
        </div>

        {/* Week nav */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={prevWeek}
            aria-label="Previous week"
            className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center text-cream/80 hover:border-gold/50 hover:text-gold transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="font-serif text-lg text-cream flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            {weekLabel}
          </div>
          <button
            onClick={nextWeek}
            aria-label="Next week"
            className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center text-cream/80 hover:border-gold/50 hover:text-gold transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="text-xs text-muted hover:text-gold ml-1 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Grid */}
        <div className="glass-card rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">

              {/* Day headers — time gutter + 7 days */}
              <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-white/5">
                <div className="p-3" />
                {week.map((d) => {
                  const iso = toIsoDate(d);
                  const isToday = iso === today;
                  return (
                    <div
                      key={iso}
                      className={`p-3 text-center border-l border-white/5 ${isToday ? 'bg-gold/5' : ''}`}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-muted">
                        {d.toLocaleDateString('en-PH', { weekday: 'short' })}
                      </div>
                      <div className={`font-serif text-xl ${isToday ? 'text-gold' : 'text-cream'}`}>
                        {d.getDate()}
                      </div>
                      {isToday && (
                        <div className="text-[9px] uppercase tracking-widest text-gold/60 mt-0.5">
                          Today
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Time slot rows */}
              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-white/5 last:border-0"
                >
                  {/* Time label */}
                  <div className="p-2 text-[10px] text-muted uppercase tracking-widest flex items-start justify-end pr-3 pt-3">
                    {time}
                  </div>

                  {/* Day cells */}
                  {week.map((d) => {
                    const iso = toIsoDate(d);
                    const cell = cells[iso]?.[time];
                    const isToday = iso === today;
                    const color = cell?.starts
                      ? categoryColors[cell.starts.serviceCategory] || '#00704A'
                      : cell?.passThrough
                      ? categoryColors[cell.passThrough.serviceCategory] || '#00704A'
                      : null;

                    return (
                      <div
                        key={`${iso}-${time}`}
                        className={`border-l border-white/5 p-1 min-h-[56px] ${isToday ? 'bg-gold/[0.015]' : ''}`}
                      >
                        {cell?.starts ? (
                          <StartCard booking={cell.starts} catMap={catMap} />
                        ) : cell?.passThrough ? (
                          <div
                            className="h-full min-h-[48px] rounded-sm opacity-40"
                            style={{
                              background: `${color}12`,
                              borderLeft: `2px solid ${color}`,
                            }}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
          {Object.entries(categoryColors).map(([slug, color]) => {
            const name = catMap[slug]?.name ?? slug.charAt(0).toUpperCase() + slug.slice(1);
            return (
              <div key={slug} className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-3 h-3 rounded-sm inline-block" style={{ background: color }} />
                {name}
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Crown className="w-3 h-3 text-gold" />
            VIP member
          </div>
        </div>

        <p className="mt-6 text-xs text-muted/50 text-center">
          Vehicle details are shown without personally identifiable information.
          Contact us to check availability.
        </p>

      </div>
    </div>
  );
}
