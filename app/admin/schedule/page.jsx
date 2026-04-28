'use client';

import { useMemo, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Crown,
  Coffee,
  Lock,
  Plus,
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
  const { bookings, blockedSlots, toggleBlockedSlot, showToast } = useApp();
  const [anchor, setAnchor] = useState(new Date());
  const [drawer, setDrawer] = useState(null);
  const [blockForm, setBlockForm] = useState({ date: '', time: '', label: '' });

  const week = useMemo(() => weekDates(anchor), [anchor]);

  const cells = useMemo(() => {
    const map = {};
    for (const d of week) {
      const iso = toIsoDate(d);
      map[iso] = {};
    }
    for (const b of bookings) {
      if (b.status === 'cancelled') continue;
      if (!map[b.date]) continue;
      const consumed = getSlotsConsumed(b.serviceDuration || '1 hr');
      const startIdx = timeSlots.indexOf(b.time);
      if (startIdx === -1) continue;
      for (let i = 0; i < consumed; i++) {
        const t = timeSlots[startIdx + i];
        if (!t) break;
        if (!map[b.date][t]) {
          map[b.date][t] = {
            kind: 'booking',
            booking: b,
            isStart: i === 0,
            span: consumed,
          };
        }
      }
    }
    for (const blk of blockedSlots) {
      if (!map[blk.date]) continue;
      if (!map[blk.date][blk.time]) {
        map[blk.date][blk.time] = { kind: 'block', block: blk };
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

  const handleBlockSubmit = (e) => {
    e.preventDefault();
    if (!blockForm.date || !blockForm.time) {
      showToast('Pick a date and time first.', 'error');
      return;
    }
    toggleBlockedSlot(
      blockForm.date,
      blockForm.time,
      blockForm.label || 'Unavailable'
    );
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
                    return (
                      <div
                        key={`${iso}-${time}`}
                        className="border-l border-white/5 p-1.5 min-h-[60px] relative"
                      >
                        {cell?.kind === 'booking' && cell.isStart && (
                          <button
                            onClick={() =>
                              setDrawer({ type: 'booking', data: cell.booking })
                            }
                            className="absolute inset-1.5 rounded-sm text-left p-2 text-xs text-cream hover:scale-[1.02] transition-transform"
                            style={{
                              background: `linear-gradient(135deg, ${
                                categoryColors[cell.booking.serviceCategory] ||
                                '#00704A'
                              }33, ${
                                categoryColors[cell.booking.serviceCategory] ||
                                '#00704A'
                              }15)`,
                              borderLeft: `3px solid ${
                                categoryColors[cell.booking.serviceCategory] ||
                                '#00704A'
                              }`,
                              height: `calc(${cell.span} * 60px - 12px)`,
                              zIndex: 2,
                            }}
                          >
                            <div className="font-medium truncate flex items-center gap-1">
                              {cell.booking.customerName}
                              {cell.booking.isVip && (
                                <Crown className="w-3 h-3 text-gold" />
                              )}
                            </div>
                            <div className="text-[10px] opacity-80 truncate">
                              {cell.booking.serviceName}
                            </div>
                          </button>
                        )}
                        {cell?.kind === 'block' && (
                          <button
                            onClick={() =>
                              setDrawer({ type: 'block', data: cell.block })
                            }
                            className="absolute inset-1.5 rounded-sm text-left p-2 text-xs text-cream/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                          >
                            <div className="flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              <span className="truncate">{cell.block.label}</span>
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
                  onClick={() => {
                    toggleBlockedSlot(
                      drawer.data.date,
                      drawer.data.time,
                      drawer.data.label
                    );
                    showToast('Block removed.', 'success');
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
