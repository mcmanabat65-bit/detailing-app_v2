'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Crown,
  Coffee,
  Lock,
  Plus,
  Users,
  Trash2,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { timeSlots } from '@/data/timeSlots';
import { categoryColors } from '@/data/services';
import {
  formatDateLong,
  getSlotsConsumed,
  toIsoDate,
} from '@/utils/bookingUtils';

const weekDates = (anchor) => {
  const d = new Date(anchor);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return Array.from({ length: 6 }, (_, i) => {
    const x = new Date(monday);
    x.setDate(monday.getDate() + i);
    return x;
  });
};

function Schedule() {
  const { bookings, blockedSlots, settings, toggleBlockedSlot, showToast } =
    useApp();
  const [anchor, setAnchor] = useState(new Date());
  const [drawer, setDrawer] = useState(null);
  const [blockForm, setBlockForm] = useState({ date: '', time: '', label: '' });

  const week = useMemo(() => weekDates(anchor), [anchor]);
  const poolSize = settings?.detailerPoolSize ?? 5;

  // cells[date][time] = {
  //   bookings: [{ booking, isStart, span }],   // may be empty
  //   block:    { ...block } | null,
  //   used:     number,                           // detailers in use
  // }
  const cells = useMemo(() => {
    const map = {};
    for (const d of week) {
      const iso = toIsoDate(d);
      map[iso] = {};
      for (const t of timeSlots) {
        map[iso][t] = { bookings: [], block: null, used: 0, minNeeded: 0 };
      }
    }
    for (const b of bookings) {
      if (b.status === 'cancelled' || b.status === 'no_show') continue;
      if (!map[b.date]) continue;
      const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
      const startIdx = timeSlots.indexOf(b.time);
      if (startIdx === -1) continue;
      const headcount = Number(b.detailersAssigned) || 1;
      const minReq = Number(b.minDetailers) || 1;
      for (let i = 0; i < consumed; i++) {
        const t = timeSlots[startIdx + i];
        if (!t) break;
        const cell = map[b.date][t];
        cell.bookings.push({ booking: b, isStart: i === 0, span: consumed });
        cell.used += headcount;
        cell.minNeeded += minReq;
      }
    }
    for (const blk of blockedSlots) {
      if (!map[blk.date]) continue;
      if (map[blk.date][blk.time]) {
        map[blk.date][blk.time].block = blk;
      }
    }
    return map;
  }, [week, bookings, blockedSlots]);

  const weekLabel = `${week[0].toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  })} – ${week[5].toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;

  const handleBlockSubmit = async (e) => {
    e.preventDefault();
    if (!blockForm.date || !blockForm.time) {
      showToast('Pick a date and time first.', 'error');
      return;
    }
    const result = await toggleBlockedSlot(
      blockForm.date,
      blockForm.time,
      blockForm.label || 'Unavailable'
    );
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Slot updated.', 'success');
    setBlockForm({ date: '', time: '', label: '' });
  };

  const today = toIsoDate(new Date());

  return (
    <AdminLayout title="Schedule">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const d = new Date(anchor);
              d.setDate(d.getDate() - 7);
              setAnchor(d);
            }}
            aria-label="Previous week"
            className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center text-cream/80 hover:border-gold/50 hover:text-gold"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="font-serif text-xl text-cream flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            {weekLabel}
          </div>
          <button
            onClick={() => {
              const d = new Date(anchor);
              d.setDate(d.getDate() + 7);
              setAnchor(d);
            }}
            aria-label="Next week"
            className="w-9 h-9 rounded-sm border border-white/10 flex items-center justify-center text-cream/80 hover:border-gold/50 hover:text-gold"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="text-xs text-muted hover:text-gold ml-2"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <Legend swatch="#00704A" label="Full" />
          <Legend swatch={categoryColors.exterior} label="Exterior" />
          <Legend swatch={categoryColors.interior} label="Interior" />
          <Legend swatch={categoryColors.specialty} label="Specialty" />
          <Legend swatch={categoryColors.premium} label="Premium" />
          <Legend swatch="#3a3a40" label="Blocked" />
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        <div className="glass-card rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[80px_repeat(6,_1fr)] border-b border-white/5">
                <div className="p-3" />
                {week.map((d) => {
                  const iso = toIsoDate(d);
                  const isToday = iso === today;
                  return (
                    <div
                      key={iso}
                      className={`p-3 text-center border-l border-white/5 ${
                        isToday ? 'bg-gold/5' : ''
                      }`}
                    >
                      <div className="text-[10px] uppercase tracking-widest text-muted">
                        {d.toLocaleDateString('en-PH', { weekday: 'short' })}
                      </div>
                      <div
                        className={`font-serif text-lg ${
                          isToday ? 'text-gold' : 'text-cream'
                        }`}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {timeSlots.map((time) => (
                <div
                  key={time}
                  className="grid grid-cols-[80px_repeat(6,_1fr)] border-b border-white/5"
                >
                  <div className="p-3 text-xs text-muted uppercase tracking-widest">
                    {time}
                  </div>
                  {week.map((d) => {
                    const iso = toIsoDate(d);
                    const cell = cells[iso]?.[time];
                    const used = cell?.used || 0;
                    const minNeeded = cell?.minNeeded || 0;
                    const remaining = Math.max(0, poolSize - used);
                    const understaffed = used > 0 && used < minNeeded;
                    const startsHere = (cell?.bookings || []).filter(
                      (e) => e.isStart
                    );
                    const passThrough = (cell?.bookings || []).filter(
                      (e) => !e.isStart
                    );
                    return (
                      <div
                        key={`${iso}-${time}`}
                        className="border-l border-white/5 p-1.5 min-h-[80px] relative space-y-1"
                      >
                        {used > 0 && (
                          <div
                            title={
                              understaffed
                                ? `${used}/${poolSize} assigned — below minimum ${minNeeded} required`
                                : `${used}/${poolSize} detailers in use, ${remaining} free`
                            }
                            className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-muted"
                          >
                            {understaffed ? (
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            ) : (
                              <Users className="w-2.5 h-2.5 text-gold/70" />
                            )}
                            <span className={understaffed ? 'text-amber-400' : 'text-gold/80'}>
                              {used}
                            </span>
                            <span>/{poolSize}</span>
                            {understaffed && (
                              <span className="text-amber-400/80">
                                (min {minNeeded})
                              </span>
                            )}
                            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden ml-1">
                              <div
                                className={`h-full ${understaffed ? 'bg-amber-400/70' : 'bg-gold/60'}`}
                                style={{
                                  width: `${Math.min(100, (used / poolSize) * 100)}%`,
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {startsHere.map(({ booking, span }) => {
                          const assigned = booking.detailersAssigned ?? 1;
                          const minDet = booking.minDetailers ?? 1;
                          const bookingUnderstaffed = assigned < minDet;
                          return (
                          <button
                            key={booking.id}
                            onClick={() =>
                              setDrawer({ type: 'booking', data: booking })
                            }
                            className="block w-full rounded-sm text-left p-1.5 text-[11px] text-cream hover:translate-x-0.5 transition-transform"
                            style={{
                              background: `linear-gradient(135deg, ${
                                categoryColors[booking.serviceCategory] ||
                                '#00704A'
                              }33, ${
                                categoryColors[booking.serviceCategory] ||
                                '#00704A'
                              }15)`,
                              borderLeft: `3px solid ${
                                bookingUnderstaffed
                                  ? '#f59e0b'
                                  : categoryColors[booking.serviceCategory] ||
                                    '#00704A'
                              }`,
                            }}
                          >
                            <div className="font-medium truncate flex items-center gap-1">
                              {booking.customerName}
                              {booking.isVip && (
                                <Crown className="w-2.5 h-2.5 text-gold" />
                              )}
                            </div>
                            <div className="text-[9px] opacity-80 flex items-center justify-between gap-2">
                              <span className="truncate">
                                {booking.serviceName}
                              </span>
                              <span
                                className={`inline-flex items-center gap-0.5 shrink-0 ${
                                  bookingUnderstaffed ? 'text-amber-400' : 'text-gold/85'
                                }`}
                                title={
                                  bookingUnderstaffed
                                    ? `${assigned} assigned — needs at least ${minDet}`
                                    : `${assigned} detailer${assigned === 1 ? '' : 's'} assigned`
                                }
                              >
                                <Users className="w-2.5 h-2.5" />
                                {assigned}
                                {minDet > 1 && (
                                  <span className="text-[8px] opacity-70">
                                    /{minDet}min
                                  </span>
                                )}
                                {span > 1 ? ` · ${span}h` : ''}
                              </span>
                            </div>
                          </button>
                          );
                        })}

                        {passThrough.map(({ booking }) => (
                          <div
                            key={`pt-${booking.id}`}
                            className="rounded-sm px-1.5 py-1 text-[9px] uppercase tracking-widest text-muted/70 border-l-2"
                            style={{
                              borderColor:
                                categoryColors[booking.serviceCategory] ||
                                '#00704A',
                              background: 'rgba(255,255,255,0.02)',
                            }}
                          >
                            ↳ {booking.customerName.split(' ')[0]} continues
                          </div>
                        ))}

                        {cell?.block && (
                          <button
                            onClick={() =>
                              setDrawer({ type: 'block', data: cell.block })
                            }
                            title={cell.block.label || 'Blocked'}
                            className="block w-full rounded-sm text-left p-1.5 text-[11px] text-cream/90 hover:opacity-80 transition-opacity"
                            style={{
                              background: '#3a3a40',
                              borderLeft: '3px solid #6B6B72',
                            }}
                          >
                            <div className="flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-cream/50 shrink-0" />
                              <span className="truncate font-medium">
                                {cell.block.label || 'Blocked'}
                              </span>
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="glass-card rounded-md p-5 h-fit">
          <h3 className="font-serif text-xl text-cream mb-1">Block a slot</h3>
          <p className="text-xs text-muted mb-4">
            Reserve a time for lunch breaks, staff meetings, or maintenance.
          </p>
          <form onSubmit={handleBlockSubmit} className="space-y-3">
            <input
              type="date"
              value={blockForm.date}
              onChange={(e) =>
                setBlockForm((b) => ({ ...b, date: e.target.value }))
              }
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
            />
            <select
              value={blockForm.time}
              onChange={(e) =>
                setBlockForm((b) => ({ ...b, time: e.target.value }))
              }
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
            >
              <option value="">Select time…</option>
              {timeSlots.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={blockForm.label}
              onChange={(e) =>
                setBlockForm((b) => ({ ...b, label: e.target.value }))
              }
              placeholder="Label (e.g. Lunch break)"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
            />
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
            >
              <Plus className="w-4 h-4" />
              Block / Unblock
            </button>
          </form>

          {blockedSlots.length > 0 && (
            <div className="mt-6 pt-5 border-t border-white/5">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
                Active blocks
              </div>
              <ul className="space-y-2 max-h-60 overflow-y-auto">
                {blockedSlots.map((b) => (
                  <li
                    key={b.id}
                    className="flex items-center justify-between text-xs bg-surface/50 border border-white/5 rounded-sm px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-cream truncate">{b.label}</div>
                      <div className="text-muted">
                        {b.date} &middot; {b.time}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleBlockedSlot(b.date, b.time, b.label)}
                      aria-label="Remove block"
                      className="text-muted hover:text-danger p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {drawer && (
        <div
          onClick={() => setDrawer(null)}
          className="fixed inset-0 bg-black/70 z-50 flex justify-end animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface w-full max-w-md h-full overflow-y-auto border-l border-white/10 p-6 animate-slide-in-right"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="font-serif text-2xl text-cream">
                {drawer.type === 'booking' ? 'Booking Details' : 'Blocked Slot'}
              </div>
              <button
                onClick={() => setDrawer(null)}
                aria-label="Close"
                className="text-cream/70 hover:text-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {drawer.type === 'booking' ? (
              <div className="space-y-4 text-sm">
                <Info label="Booking ID" value={drawer.data.id} mono />
                <Info label="Customer" value={drawer.data.customerName} />
                <Info label="Email" value={drawer.data.email} />
                <Info label="Phone" value={drawer.data.phone} />
                <Info
                  label="Vehicle"
                  value={`${drawer.data.vehicleYear} ${drawer.data.vehicle}`}
                />
                <Info label="Service" value={drawer.data.serviceName} />
                <Info label="Duration" value={drawer.data.serviceDuration} />
                <Info
                  label="Detailers assigned"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-gold" />
                      {drawer.data.detailersAssigned ?? 1}
                    </span>
                  }
                />
                <Info label="Date" value={formatDateLong(drawer.data.date)} />
                <Info label="Time" value={drawer.data.time} />
                {drawer.data.isVip && (
                  <Info
                    label="VIP"
                    value={
                      <span className="inline-flex items-center gap-1.5 text-gold">
                        <Crown className="w-3.5 h-3.5" />
                        Yes &middot; <Coffee className="w-3.5 h-3.5" />{' '}
                        {drawer.data.coffeeOrder || '—'}
                      </span>
                    }
                  />
                )}
                {drawer.data.notes && (
                  <Info label="Notes" value={drawer.data.notes} />
                )}
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <Info label="Label" value={drawer.data.label} />
                <Info label="Date" value={formatDateLong(drawer.data.date)} />
                <Info label="Time" value={drawer.data.time} />
                <button
                  onClick={async () => {
                    const result = await toggleBlockedSlot(
                      drawer.data.date,
                      drawer.data.time,
                      drawer.data.label
                    );
                    if (result?.error) {
                      showToast(result.error, 'error');
                    } else {
                      showToast('Block removed.', 'success');
                    }
                    setDrawer(null);
                  }}
                  className="w-full mt-4 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove block
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function Info({ label, value, mono }) {
  return (
    <div className="border-b border-white/5 pb-3">
      <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
        {label}
      </div>
      <div className={`text-cream ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </div>
    </div>
  );
}

function Legend({ swatch, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-sm inline-block"
        style={{ background: swatch }}
      />
      <span className="text-muted">{label}</span>
    </div>
  );
}

export default function AdminSchedulePage() {
  return (
    <ProtectedRoute>
      <Schedule />
    </ProtectedRoute>
  );
}
