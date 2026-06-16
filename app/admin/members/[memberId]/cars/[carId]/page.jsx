'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Car,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Lightbulb,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';
import { formatDateShort } from '@/utils/bookingUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const SIZE_LABELS = { small: 'Small', medium: 'Medium', large: 'Large', xl: 'Extra Large' };

const CONDITION_COLORS = {
  excellent: 'text-success bg-success/10',
  good:      'text-blue-400 bg-blue-400/10',
  fair:      'text-gold bg-gold/10',
  poor:      'text-danger bg-danger/10',
};

function scoreColor(n) {
  if (n >= 8) return 'text-success';
  if (n >= 5) return 'text-gold';
  return 'text-danger';
}

function ScoreDots({ value, max = 10 }) {
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`w-3 h-1.5 rounded-full transition-colors ${
            i < value
              ? value >= 8 ? 'bg-success' : value >= 5 ? 'bg-gold' : 'bg-danger'
              : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  );
}

function ConditionBadge({ value }) {
  if (!value) return <span className="text-muted text-[10px]">—</span>;
  return (
    <span className={`text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${CONDITION_COLORS[value] ?? 'bg-white/5 text-muted'}`}>
      {value}
    </span>
  );
}

function BookingStatusBadge({ status }) {
  const map = {
    confirmed: 'bg-success/15 text-success',
    completed: 'bg-blue-500/15 text-blue-400',
    cancelled: 'bg-danger/15 text-danger',
    no_show:   'bg-gold/15 text-gold',
    pending:   'bg-white/10 text-cream/70',
  };
  const label = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show', pending: 'Pending' };
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${map[status] ?? 'bg-white/10 text-cream/70'}`}>
      {label[status] ?? status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add Condition Log Modal
// ---------------------------------------------------------------------------
const CONDITION_OPTS = ['excellent', 'good', 'fair', 'poor'];
const emptyLog = (bookingId = null, recordedAt = null) => ({
  overallRating:     7,
  exteriorRating:    '',
  interiorRating:    '',
  exteriorCondition: '',
  interiorCondition: '',
  mileage:           '',
  notes:             '',
  bookingId:         bookingId ?? '',
  recordedAt:        recordedAt ?? new Date().toISOString().slice(0, 10),
});

function AddConditionLogModal({ memberCarId, prefill, saving, onSave, onClose }) {
  const [form, setForm] = useState(emptyLog(prefill?.bookingId, prefill?.recordedAt));
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.overallRating) return;
    onSave({
      memberCarId,
      bookingId:         form.bookingId || null,
      overallRating:     Number(form.overallRating),
      exteriorRating:    form.exteriorRating ? Number(form.exteriorRating) : null,
      interiorRating:    form.interiorRating ? Number(form.interiorRating) : null,
      exteriorCondition: form.exteriorCondition || null,
      interiorCondition: form.interiorCondition || null,
      mileage:           form.mileage ? Number(form.mileage) : null,
      notes:             form.notes.trim() || null,
      recordedAt:        new Date(form.recordedAt).toISOString(),
    });
  };

  const ratingInput = (key, label) => (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">{label}</div>
      <div className="flex items-center gap-3">
        <input
          type="range" min={1} max={10} step={1}
          value={form[key] || 5}
          onChange={(e) => set(key, e.target.value)}
          className="flex-1 accent-[var(--color-gold)]"
        />
        <span className={`font-mono text-sm w-6 text-right ${scoreColor(Number(form[key] || 5))}`}>
          {form[key] || 5}
        </span>
      </div>
    </label>
  );

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-5 pt-16 animate-fade-in overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md w-full max-w-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-2xl text-cream">Log Condition</h3>
            {prefill?.bookingId && (
              <div className="text-xs text-muted font-mono mt-0.5">{prefill.bookingId}</div>
            )}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Overall */}
          <div>
            <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-2">Overall Rating * <span className={`normal-case font-mono ${scoreColor(Number(form.overallRating))}`}>{form.overallRating}/10</span></div>
            <input
              type="range" min={1} max={10} step={1} required
              value={form.overallRating}
              onChange={(e) => set('overallRating', e.target.value)}
              className="w-full accent-[var(--color-gold)]"
            />
            <ScoreDots value={Number(form.overallRating)} />
          </div>

          {/* Exterior + Interior ratings */}
          <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
            {ratingInput('exteriorRating', 'Exterior Rating (optional)')}
            {ratingInput('interiorRating', 'Interior Rating (optional)')}
          </div>

          {/* Condition selects */}
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { key: 'exteriorCondition', label: 'Exterior Condition' },
              { key: 'interiorCondition', label: 'Interior Condition' },
            ].map(({ key, label }) => (
              <label key={key} className="block">
                <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">{label}</div>
                <select
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
                >
                  <option value="">— Select —</option>
                  {CONDITION_OPTS.map((o) => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          {/* Mileage + Date */}
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Mileage (km, optional)</div>
              <input
                type="number" min={0} value={form.mileage}
                onChange={(e) => set('mileage', e.target.value)}
                placeholder="e.g. 45000"
                className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
              />
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Date Recorded</div>
              <input
                type="date" value={form.recordedAt}
                onChange={(e) => set('recordedAt', e.target.value)}
                className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]"
              />
            </label>
          </div>

          {/* Notes */}
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Admin Notes (optional)</div>
            <textarea
              rows={2} value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="e.g. Light swirl marks on hood, recommend clay bar next visit"
              className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors resize-none"
            />
          </label>

          <div className="flex gap-3 pt-1 border-t border-white/5">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><Check className="w-4 h-4" />Save Log</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vehicle Health & Insights section
// ---------------------------------------------------------------------------
function VehicleHealthSection({ logs, carBookings, memberCarId, onAddLog, onDeleteLog }) {
  const latest = logs[0] ?? null;

  // Spend by service category
  const spendByCategory = useMemo(() => {
    const active = carBookings.filter((b) => b.status !== 'cancelled');
    const map = {};
    for (const b of active) {
      const cat = b.serviceCategory || 'other';
      map[cat] = (map[cat] || 0) + (b.servicePrice ?? 0);
    }
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .map(([cat, amount]) => ({ cat, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
      .sort((a, b) => b.amount - a.amount);
  }, [carBookings]);

  // Rule-based recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    const completed = carBookings.filter((b) => b.status === 'completed');
    if (completed.length > 0) {
      const lastDate = new Date(completed[0].date);
      const daysSince = Math.floor((Date.now() - lastDate) / 86400000);
      if (daysSince > 90) recs.push(`Last service was ${daysSince} days ago — a maintenance visit is overdue.`);
      else if (daysSince > 60) recs.push(`Last service was ${daysSince} days ago — consider scheduling soon.`);

      const hasCeramic = completed.some((b) => (b.serviceCategory || '').toLowerCase() === 'specialty' && (b.serviceName || '').toLowerCase().includes('ceramic'));
      if (hasCeramic) {
        const lastCeramic = completed.find((b) => (b.serviceName || '').toLowerCase().includes('ceramic'));
        const daysCeramic = Math.floor((Date.now() - new Date(lastCeramic.date)) / 86400000);
        if (daysCeramic > 180) recs.push(`Ceramic coating was applied ${daysCeramic} days ago — consider a refresh or inspection.`);
      }
    }

    if (latest) {
      if (latest.exteriorCondition === 'poor' || (latest.exteriorRating && latest.exteriorRating <= 4))
        recs.push('Exterior condition is poor — exterior detailing or paint correction recommended.');
      else if (latest.exteriorCondition === 'fair' || (latest.exteriorRating && latest.exteriorRating <= 6))
        recs.push('Exterior condition is fair — a full exterior detail would restore the finish.');
      if (latest.interiorCondition === 'poor' || (latest.interiorRating && latest.interiorRating <= 4))
        recs.push('Interior condition is poor — deep interior cleaning recommended.');
    }

    return recs;
  }, [carBookings, latest]);

  return (
    <div className="glass-card rounded-md overflow-hidden mb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gold" />
          <span className="text-cream font-medium">Vehicle Health & Insights</span>
        </div>
        <button
          onClick={() => onAddLog(null)}
          className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />Add log
        </button>
      </div>

      <div className="p-5 space-y-6">
        {/* Health score + Spend side by side */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Health Score */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-3">Current Health Score</div>
            {latest ? (
              <div className="flex items-end gap-4">
                <div>
                  <div className={`font-serif text-5xl leading-none ${scoreColor(latest.overallRating)}`}>
                    {latest.overallRating}
                    <span className="text-2xl text-muted">/10</span>
                  </div>
                  <ScoreDots value={latest.overallRating} />
                  <div className="text-[11px] text-muted mt-2">
                    Recorded {formatDateShort(latest.recordedAt.slice(0, 10))}
                  </div>
                </div>
                {logs.length > 1 && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-muted uppercase tracking-widest">vs prev</div>
                    <div className={`text-sm font-medium ${latest.overallRating >= logs[1].overallRating ? 'text-success' : 'text-danger'}`}>
                      {latest.overallRating >= logs[1].overallRating ? '▲' : '▼'} {Math.abs(latest.overallRating - logs[1].overallRating)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted py-4">
                No condition data yet.{' '}
                <button onClick={() => onAddLog(null)} className="text-gold hover:text-gold-light transition-colors">Add the first log.</button>
              </div>
            )}

            {/* Exterior / Interior breakdown */}
            {latest && (latest.exteriorCondition || latest.interiorCondition) && (
              <div className="mt-4 space-y-2">
                {latest.exteriorCondition && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted w-20">Exterior</span>
                    <ConditionBadge value={latest.exteriorCondition} />
                    {latest.exteriorRating && <span className={`font-mono ${scoreColor(latest.exteriorRating)}`}>{latest.exteriorRating}/10</span>}
                  </div>
                )}
                {latest.interiorCondition && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted w-20">Interior</span>
                    <ConditionBadge value={latest.interiorCondition} />
                    {latest.interiorRating && <span className={`font-mono ${scoreColor(latest.interiorRating)}`}>{latest.interiorRating}/10</span>}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spend by category */}
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-3">Spend by Service Type</div>
            {spendByCategory.length > 0 ? (
              <div className="space-y-2.5">
                {spendByCategory.map(({ cat, amount, pct }) => (
                  <div key={cat}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-cream/80 capitalize">{cat}</span>
                      <span className="text-gold font-medium">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold/60 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted">No service spend recorded yet.</div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-gold/5 border border-gold/15 rounded-sm p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs text-gold font-medium uppercase tracking-widest mb-1">
              <Lightbulb className="w-3.5 h-3.5" />
              Recommendations
            </div>
            <ul className="space-y-1.5">
              {recommendations.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-cream/75">
                  <span className="text-gold mt-0.5 shrink-0">·</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Condition log history */}
        {logs.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-3">Condition History ({logs.length})</div>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="bg-surface/50 border border-white/5 rounded-sm px-3 py-2.5 flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-mono text-sm font-semibold ${scoreColor(log.overallRating)}`}>
                        {log.overallRating}/10
                      </span>
                      <span className="text-[11px] text-muted">{formatDateShort(log.recordedAt.slice(0, 10))}</span>
                      {log.exteriorCondition && <ConditionBadge value={log.exteriorCondition} />}
                      {log.interiorCondition && <ConditionBadge value={log.interiorCondition} />}
                      {log.mileage && <span className="text-[11px] text-muted">{log.mileage.toLocaleString()} km</span>}
                      {log.bookingId && (
                        <span className="text-[10px] font-mono text-muted/60">{log.bookingId}</span>
                      )}
                    </div>
                    {log.notes && <div className="text-xs text-cream/60 truncate">{log.notes}</div>}
                  </div>
                  <button
                    onClick={() => onDeleteLog(log.id)}
                    aria-label="Delete log"
                    className="text-cream/30 hover:text-danger p-1 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Service history table
// ---------------------------------------------------------------------------
const BOOKING_TABS = [
  { id: 'all',       label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no_show',   label: 'No-show' },
];
const PAGE_SIZE = 10;

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function CarDetailContent() {
  const { memberId, carId } = useParams();
  const router = useRouter();
  const {
    members, cars, memberCars, bookings,
    getConditionLogsForCar, addCarConditionLog, deleteCarConditionLog,
    showToast,
  } = useApp();

  const [tab, setTab]         = useState('all');
  const [page, setPage]       = useState(1);
  const [logModal, setLogModal] = useState(null); // null | { bookingId?, recordedAt? }
  const [logSaving, setLogSaving] = useState(false);

  const member = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);
  const car    = useMemo(() => cars.find((c) => c.id === carId) ?? null, [cars, carId]);
  const link   = useMemo(
    () => memberCars.find((mc) => mc.memberId === memberId && mc.carId === carId) ?? null,
    [memberCars, memberId, carId]
  );
  const conditionLogs = useMemo(
    () => (link ? getConditionLogsForCar(link.id) : []),
    [link, getConditionLogsForCar]
  );

  // Booking IDs already logged — prevents duplicate log prompt
  const loggedBookingIds = useMemo(
    () => new Set(conditionLogs.map((l) => l.bookingId).filter(Boolean)),
    [conditionLogs]
  );

  // Match bookings by email + vehicle text + year
  const carBookings = useMemo(() => {
    if (!member || !car) return [];
    const emailKey   = (member.email || '').trim().toLowerCase();
    const vehicleKey = `${car.make} ${car.model}`.toLowerCase();
    const yearKey    = String(car.year);
    return bookings
      .filter((b) => {
        if ((b.email || '').trim().toLowerCase() !== emailKey) return false;
        if ((b.vehicle || '').toLowerCase() !== vehicleKey) return false;
        if (b.vehicleYear && b.vehicleYear !== yearKey) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [bookings, member, car]);

  const stats = useMemo(() => {
    const active     = carBookings.filter((b) => b.status !== 'cancelled');
    const completed  = carBookings.filter((b) => b.status === 'completed');
    const totalSpent = active.reduce((s, b) => s + (b.servicePrice ?? 0), 0);
    const svcCount   = {};
    for (const b of active) if (b.serviceName) svcCount[b.serviceName] = (svcCount[b.serviceName] || 0) + 1;
    const topService = Object.entries(svcCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { total: carBookings.length, completed: completed.length, totalSpent, lastBooking: carBookings[0] ?? null, topService };
  }, [carBookings]);

  const filteredBookings = useMemo(() => {
    if (tab === 'all') return carBookings;
    return carBookings.filter((b) => b.status === tab);
  }, [carBookings, tab]);

  const totalPages    = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const safePage      = Math.min(page, totalPages);
  const pagedBookings = filteredBookings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSaveLog = async (logData) => {
    setLogSaving(true);
    const result = await addCarConditionLog(logData);
    setLogSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast('Condition log saved.', 'success');
    setLogModal(null);
  };

  const handleDeleteLog = async (id) => {
    const result = await deleteCarConditionLog(id);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Log removed.', 'info');
  };

  if (!member || !car) {
    return (
      <AdminLayout title="Car Details">
        <div className="text-center py-24 text-muted">Car or member not found.</div>
      </AdminLayout>
    );
  }

  const isDefault   = (link?.sortOrder ?? 1) === 0;
  const plateNumber = link?.plateNumber ?? null;
  const carLabel    = `${car.year} ${car.make} ${car.model}`;

  return (
    <AdminLayout title="Car Details">
      {/* Back nav */}
      <button
        onClick={() => router.push(`/admin/members/${memberId}`)}
        className="inline-flex items-center gap-2 text-muted hover:text-gold text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {member.name}
      </button>

      {/* Car header */}
      <div className="glass-card rounded-md p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
            <Car className="w-5 h-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-2xl text-cream">{carLabel}</h1>
              {isDefault && <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-gold/15 text-gold">Default</span>}
              <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-white/5 text-cream/70">
                {SIZE_LABELS[car.size] ?? car.size}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted">
              {plateNumber && (
                <span className="font-mono text-cream/70 bg-white/5 px-2 py-0.5 rounded-sm border border-white/10">{plateNumber}</span>
              )}
              <span className="flex items-center gap-1.5">
                <Crown className="w-3 h-3 text-gold" />
                {member.name}
                {member.nickname && <span className="text-gold/70 ml-0.5">"{member.nickname}"</span>}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Services', value: stats.total,                                                          color: 'text-cream' },
          { label: 'Completed',      value: stats.completed,                                                      color: 'text-blue-400' },
          { label: 'Total Spent',    value: formatCurrency(stats.totalSpent),                                     color: 'text-gold' },
          { label: 'Last Service',   value: stats.lastBooking ? formatDateShort(stats.lastBooking.date) : '—',    color: 'text-cream/80' },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-md px-4 py-3 text-center">
            <div className={`font-serif text-xl leading-none ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Most booked service callout */}
      {stats.topService && (
        <div className="glass-card rounded-md px-5 py-3 mb-6 flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-gold shrink-0" />
          <span className="text-sm text-cream/80">Most booked service for this car:</span>
          <span className="text-sm text-gold font-medium">{stats.topService}</span>
        </div>
      )}

      {/* Vehicle Health & Insights */}
      {link && (
        <VehicleHealthSection
          logs={conditionLogs}
          carBookings={carBookings}
          memberCarId={link.id}
          onAddLog={(prefill) => setLogModal(prefill ?? {})}
          onDeleteLog={handleDeleteLog}
        />
      )}

      {/* Service history table */}
      <div className="glass-card rounded-md overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-cream font-medium">Service History</span>
            <span className="text-xs text-muted">({carBookings.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BOOKING_TABS.map((t) => {
              const count = t.id === 'all' ? carBookings.length : carBookings.filter((b) => b.status === t.id).length;
              return (
                <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-widest rounded-sm border transition-all ${tab === t.id ? 'bg-gold text-obsidian border-gold' : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'}`}>
                  {t.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium">Booking ID</th>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedBookings.map((b) => {
                const isCompleted    = b.status === 'completed';
                const alreadyLogged  = loggedBookingIds.has(b.id);
                return (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="font-mono text-[11px] text-gold/80">{b.id}</div>
                      {isCompleted && link && (
                        <button
                          onClick={() => setLogModal({ bookingId: b.id, recordedAt: b.date })}
                          className={`mt-1 inline-flex items-center gap-1 text-[10px] transition-colors ${alreadyLogged ? 'text-success/70 cursor-default' : 'text-gold hover:text-gold-light'}`}
                          disabled={alreadyLogged}
                          title={alreadyLogged ? 'Condition logged' : 'Log condition'}
                        >
                          {alreadyLogged
                            ? <><Check className="w-2.5 h-2.5" />Logged</>
                            : <><Pencil className="w-2.5 h-2.5" />Log condition</>}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-cream text-xs">{formatDateShort(b.date)}</div>
                      <div className="text-muted text-[11px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{b.time}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-cream">{b.serviceName}</div>
                      <div className="text-muted text-xs">{b.serviceDuration}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <span className="text-cream/60 text-xs line-clamp-2">{b.notes || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`text-sm font-medium ${b.status === 'cancelled' ? 'line-through text-muted' : 'text-gold'}`}>
                        {formatCurrency(b.servicePrice)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <BookingStatusBadge status={b.status} />
                      {b.status === 'cancelled' && b.cancellationReason && (
                        <div className="text-[10px] text-danger/70 mt-1">{b.cancellationReason}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {pagedBookings.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center text-muted">
                    {carBookings.length === 0 ? 'No service history for this car yet.' : 'No bookings in this category.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span className="text-xs text-muted">
              Page <span className="text-cream">{safePage}</span> of <span className="text-cream">{totalPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                aria-label="Previous page"
                className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                aria-label="Next page"
                className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log condition modal */}
      {logModal !== null && link && (
        <AddConditionLogModal
          memberCarId={link.id}
          prefill={logModal}
          saving={logSaving}
          onSave={handleSaveLog}
          onClose={() => setLogModal(null)}
        />
      )}
    </AdminLayout>
  );
}

export default function CarDetailPage() {
  return (
    <ProtectedRoute permission="cars.manage">
      <CarDetailContent />
    </ProtectedRoute>
  );
}
