'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Crown,
  ListPlus,
  Loader2,
  Play,
  Plus,
  Trash2,
  UserX,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';
import { formatDateLong, getBusyDetailerIds } from '@/utils/bookingUtils';
import { sendEmail } from '@/lib/sendEmail';
import { bookingConfirmationHtml } from '@/lib/emailTemplates';

const CANCEL_REASONS = [
  'Customer request',
  'Schedule conflict',
  'Vehicle unavailable',
  'Weather conditions',
  'Staff unavailability',
  'Other',
];

function StatusBadge({ status }) {
  if (status === 'pending') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-gold/15 text-gold border border-gold/30">Pending</span>
  );
  if (status === 'confirmed') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/15 text-success">Confirmed</span>
  );
  if (status === 'on-going') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-amber-400/15 text-amber-400 border border-amber-400/30">On-going</span>
  );
  if (status === 'completed') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/25 text-success border border-success/40">Completed</span>
  );
  if (status === 'cancelled') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-danger/15 text-danger">Cancelled</span>
  );
  if (status === 'no_show') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-muted/20 text-muted">No-show</span>
  );
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-white/5 text-muted">{status}</span>
  );
}

function SectionLabel({ children }) {
  return <div className="text-[10px] uppercase tracking-widest text-muted mb-3">{children}</div>;
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-muted text-sm shrink-0">{label}</span>
      <div className="text-cream text-sm text-right">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add-Ons inline panel
// ---------------------------------------------------------------------------
function AddOnsPanel({ booking, catalog, onSave }) {
  const [addOns, setAddOns] = useState(() =>
    Array.isArray(booking.addOns) ? booking.addOns.map((a) => ({ ...a })) : []
  );
  const [custom, setCustom] = useState({ name: '', price: '' });
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const addFromCatalog = (item) => {
    if (addOns.some((a) => a.name === item.name)) return;
    setAddOns((prev) => [...prev, { name: item.name, price: item.defaultPrice ?? 0, notes: '' }]);
    setDirty(true);
  };

  const addCustom = () => {
    if (!custom.name.trim()) return;
    setAddOns((prev) => [...prev, { name: custom.name.trim(), price: Number(custom.price) || 0, notes: '' }]);
    setCustom({ name: '', price: '' });
    setDirty(true);
  };

  const update = (i, key, val) => {
    setAddOns((prev) => prev.map((a, idx) => idx === i ? { ...a, [key]: val } : a));
    setDirty(true);
  };

  const remove = (i) => {
    setAddOns((prev) => prev.filter((_, idx) => idx !== i));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(addOns.map((a) => ({ name: a.name, price: Number(a.price) || 0, notes: a.notes || '' })));
    setSaving(false);
    setDirty(false);
  };

  const addOnsTotal = addOns.reduce((s, a) => s + (Number(a.price) || 0), 0);

  return (
    <div className="space-y-4">
      {/* Quick-pick from catalog */}
      {catalog.length > 0 && (
        <div>
          <SectionLabel>Quick add from catalog</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {catalog.map((item) => {
              const added = addOns.some((a) => a.name === item.name);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addFromCatalog(item)}
                  disabled={added}
                  className={`text-xs px-3 py-1.5 rounded-sm border transition-colors ${
                    added
                      ? 'border-gold/30 bg-gold/10 text-gold/50 cursor-not-allowed'
                      : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'
                  }`}
                >
                  {item.name} · {formatCurrency(item.defaultPrice ?? 0)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom entry */}
      <div>
        <SectionLabel>Add custom</SectionLabel>
        <div className="flex gap-2">
          <input
            type="text"
            value={custom.name}
            onChange={(e) => setCustom((c) => ({ ...c, name: e.target.value }))}
            onKeyDown={(e) => e.key === 'Enter' && addCustom()}
            placeholder="Service / item name"
            className="flex-1 bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
          />
          <div className="relative w-28">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₱</span>
            <input
              type="number"
              min="0"
              value={custom.price}
              onChange={(e) => setCustom((c) => ({ ...c, price: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && addCustom()}
              placeholder="0"
              className="w-full bg-surface/70 border border-white/[0.08] rounded-sm pl-7 pr-3 py-2 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={addCustom}
            disabled={!custom.name.trim()}
            aria-label="Add item"
            className="px-3 py-2 bg-white/5 border border-white/10 text-cream/70 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-30"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Current add-ons */}
      {addOns.length > 0 ? (
        <div>
          <SectionLabel>Added ({addOns.length})</SectionLabel>
          <div className="space-y-2">
            {addOns.map((a, i) => (
              <div key={i} className="flex items-center gap-2 bg-surface/60 border border-white/5 rounded-sm px-3 py-2">
                <span className="flex-1 text-sm text-cream truncate">{a.name}</span>
                <div className="relative w-24 shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted text-xs">₱</span>
                  <input
                    type="number"
                    min="0"
                    value={a.price}
                    onChange={(e) => update(i, 'price', e.target.value)}
                    className="w-full bg-transparent border border-white/10 rounded-sm pl-5 pr-2 py-1 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors"
                  />
                </div>
                <button onClick={() => remove(i)} aria-label="Remove" className="text-muted/50 hover:text-danger transition-colors p-1">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="py-5 text-center text-muted text-sm border border-dashed border-white/10 rounded-sm">
          No add-ons yet.
        </div>
      )}

      {/* Pricing summary */}
      <div className="bg-surface/60 rounded-sm px-4 py-3 border border-white/5 space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Package</span>
          <span className="text-cream">{formatCurrency(booking.servicePrice || 0)}</span>
        </div>
        {addOns.map((a, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted">↳ {a.name}</span>
            <span className="text-gold/80">{formatCurrency(Number(a.price) || 0)}</span>
          </div>
        ))}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <span className="text-cream font-medium">Total</span>
          <span className="text-gold font-serif text-lg">{formatCurrency((booking.servicePrice || 0) + addOnsTotal)}</span>
        </div>
      </div>

      {dirty && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : <><Check className="w-4 h-4" />Save Add-Ons</>}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main detail component
// ---------------------------------------------------------------------------
function BookingDetailView() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId;

  const {
    bookings, services, detailers, addonCatalog,
    updateBookingStatus, updateBookingDetailers, updateBookingAddOns,
    fetchBookingLogs, deleteBooking, showToast,
  } = useApp();

  const booking = useMemo(() => bookings.find((b) => b.id === bookingId) ?? null, [bookings, bookingId]);

  // Status history
  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);

  useEffect(() => {
    if (!bookingId) return;
    setLogsLoading(true);
    fetchBookingLogs(bookingId).then((result) => {
      setLogs(result || []);
      setLogsLoading(false);
    });
  }, [bookingId, fetchBookingLogs, booking?.status]);

  // Detailer assignment
  const activeDetailers = useMemo(() => detailers.filter((d) => d.isActive !== false), [detailers]);
  const [selectedDetailerIds, setSelectedDetailerIds] = useState([]);
  const [detailersDirty, setDetailersDirty] = useState(false);
  const [detailerSaving, setDetailerSaving] = useState(false);

  useEffect(() => {
    if (booking) {
      setSelectedDetailerIds(booking.detailersAssigned || []);
      setDetailersDirty(false);
    }
  }, [booking?.id]);

  // Detailers committed to another booking that overlaps this one's slots —
  // they can be unassigned here but not newly assigned.
  const busyDetailerIds = useMemo(
    () =>
      booking
        ? getBusyDetailerIds(booking.date, booking.time, booking.serviceDuration, {
            bookings,
            excludeBookingId: booking.id,
          })
        : new Set(),
    [booking, bookings]
  );

  const toggleDetailer = (id) => {
    if (!selectedDetailerIds.includes(id) && busyDetailerIds.has(id)) {
      showToast('That detailer already has an overlapping booking at this time.', 'error');
      return;
    }
    setSelectedDetailerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setDetailersDirty(true);
  };

  const saveDetailers = async () => {
    if (selectedDetailerIds.length === 0) { showToast('At least one detailer must be assigned.', 'error'); return; }
    setDetailerSaving(true);
    const result = await updateBookingDetailers(bookingId, selectedDetailerIds);
    setDetailerSaving(false);
    if (result?.error) showToast(result.error, 'error');
    else { showToast('Detailers updated.', 'success'); setDetailersDirty(false); }
  };

  // Status transitions
  const [statusPending, setStatusPending] = useState(false);

  const setStatus = async (status, successMessage) => {
    if (statusPending) return;
    setStatusPending(true);
    const wasPending = booking.status === 'pending';
    const result = await updateBookingStatus(bookingId, status);
    setStatusPending(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    if (status === 'confirmed' && wasPending && booking) {
      sendEmail(
        booking.email,
        `Booking confirmed — ${booking.serviceName} on ${booking.date}`,
        bookingConfirmationHtml({
          id: booking.id,
          customerName: booking.customerName,
          serviceName: booking.serviceName,
          servicePrice: booking.servicePrice,
          date: booking.date,
          time: booking.time,
          vehicle: booking.vehicle,
          vehicleYear: booking.vehicleYear,
          isVip: booking.isVip,
          coffeeOrder: booking.coffeeOrder,
        })
      );
    }
    if (successMessage) showToast(successMessage, 'info');
  };

  // Cancel modal
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('Customer request');
  const [cancelCustom, setCancelCustom] = useState('');

  const openCancel = () => { setCancelOpen(true); setCancelReason('Customer request'); setCancelCustom(''); };

  const confirmCancel = async () => {
    const reason = cancelReason === 'Other' ? (cancelCustom.trim() || 'Other') : cancelReason;
    const result = await updateBookingStatus(bookingId, 'cancelled', reason);
    if (result?.error) showToast(result.error, 'error');
    else { showToast('Booking cancelled.', 'info'); setCancelOpen(false); }
  };

  // Delete modal
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const result = await deleteBooking(bookingId);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast('Booking deleted.', 'success');
    router.push('/admin/bookings');
  };

  // Not found
  if (!booking) {
    return (
      <AdminLayout title="Booking Details">
        <div className="text-center py-24 text-muted">
          <div className="font-mono text-cream mb-2">{bookingId}</div>
          Booking not found or still loading.
          <Link href="/admin/bookings" className="block mt-4 text-gold hover:underline text-sm">← Back to bookings</Link>
        </div>
      </AdminLayout>
    );
  }

  const addOnsTotal = (booking.addOns || []).reduce((s, a) => s + (Number(a.price) || 0), 0);
  const grandTotal = (booking.servicePrice || 0) + addOnsTotal;
  const isEditable = ['pending', 'confirmed', 'on-going'].includes(booking.status);
  const service = services.find((s) => s.id === booking.serviceId);

  return (
    <AdminLayout title="Booking Details">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          onClick={() => router.push('/admin/bookings')}
          aria-label="Back to bookings"
          className="p-2 border border-white/10 rounded-sm text-muted hover:text-gold hover:border-gold/50 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-base text-gold">{booking.id}</span>
            <StatusBadge status={booking.status} />
            {booking.isVip && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-gold border border-gold/30 bg-gold/10 rounded-sm px-2 py-0.5">
                <Crown className="w-3 h-3" /> VIP
              </span>
            )}
          </div>
          <div className="text-muted text-xs mt-0.5">
            Created{' '}
            {new Date(booking.createdAt).toLocaleString('en-PH', {
              month: 'short', day: 'numeric', year: 'numeric',
              hour: 'numeric', minute: '2-digit', hour12: true,
            })}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-6 items-start">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-5">

          {/* Customer */}
          <section className="glass-card rounded-md p-6">
            <h2 className="font-serif text-lg text-cream mb-4">Customer</h2>
            <div className="space-y-0">
              <DetailRow label="Name">
                <span className="text-cream">
                  {booking.customerName}
                  {booking.nickname && (
                    <span className="text-gold/70 ml-1.5">"{booking.nickname}"</span>
                  )}
                </span>
              </DetailRow>
              <DetailRow label="Email">
                <a href={`mailto:${booking.email}`} className="text-gold hover:underline">{booking.email}</a>
              </DetailRow>
              <DetailRow label="Phone">
                <a href={`tel:${booking.phone}`} className="text-cream hover:text-gold transition-colors">{booking.phone}</a>
              </DetailRow>
              {booking.isVip && (
                <DetailRow label="Member ID">
                  {booking.memberId ? (
                    <Link href="/admin/members" className="text-gold text-xs hover:underline font-mono">{booking.memberId}</Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </DetailRow>
              )}
            </div>
          </section>

          {/* Service & Pricing */}
          <section className="glass-card rounded-md p-6">
            <h2 className="font-serif text-lg text-cream mb-4">Service &amp; Pricing</h2>
            <div className="space-y-0 mb-5">
              <DetailRow label="Package">
                <div>
                  <div className="text-cream">{booking.serviceName}</div>
                  {service && (
                    <div className="text-muted text-xs mt-0.5">{service.duration}</div>
                  )}
                </div>
              </DetailRow>
              <DetailRow label="Package price">{formatCurrency(booking.servicePrice || 0)}</DetailRow>
              {(booking.addOns || []).map((a, i) => (
                <DetailRow key={i} label={`↳ ${a.name}`}>
                  <span className="text-gold/80">{formatCurrency(Number(a.price) || 0)}</span>
                </DetailRow>
              ))}
              <DetailRow label="Total">
                <span className="text-gold font-serif text-base">{formatCurrency(grandTotal)}</span>
              </DetailRow>
            </div>

            {/* Add-Ons panel */}
            <div className="border-t border-white/5 pt-5">
              <div className="flex items-center gap-2 mb-4">
                <ListPlus className="w-4 h-4 text-gold" />
                <h3 className="text-cream text-sm font-medium">Manage Add-Ons</h3>
              </div>
              <AddOnsPanel
                booking={booking}
                catalog={addonCatalog}
                onSave={async (addOns) => {
                  const result = await updateBookingAddOns(booking.id, addOns);
                  if (result?.error) showToast(result.error, 'error');
                  else showToast('Add-ons saved.', 'success');
                }}
              />
            </div>
          </section>

          {/* Vehicle */}
          <section className="glass-card rounded-md p-6">
            <h2 className="font-serif text-lg text-cream mb-4">Vehicle</h2>
            <div className="space-y-0 mb-4">
              <DetailRow label="Vehicle">
                <span className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-gold shrink-0" />
                  {booking.vehicleYear} {booking.vehicle}
                </span>
              </DetailRow>
              {booking.notes && (
                <DetailRow label="Notes">
                  <span className="text-cream/80 text-right max-w-[200px]">{booking.notes}</span>
                </DetailRow>
              )}
            </div>
            {(booking.occupiesSlots || []).length > 0 && (
              <div>
                <SectionLabel>Slots occupied</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {(booking.occupiesSlots || []).map((slot) => (
                    <span key={slot} className="text-[11px] px-2 py-0.5 rounded-sm bg-white/5 border border-white/10 text-cream/70">
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Detailers */}
          {activeDetailers.length > 0 && (
            <section className="glass-card rounded-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg text-cream flex items-center gap-2">
                  <Users className="w-4 h-4 text-gold" />
                  Detailers
                </h2>
                {isEditable && detailersDirty && (
                  <button
                    onClick={saveDetailers}
                    disabled={detailerSaving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold text-obsidian text-xs font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60"
                  >
                    {detailerSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    Save
                  </button>
                )}
              </div>
              {isEditable ? (
                <div className="flex flex-wrap gap-2">
                  {activeDetailers.map((d) => {
                    const selected = selectedDetailerIds.includes(d.id);
                    const busy = !selected && busyDetailerIds.has(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        disabled={busy}
                        onClick={() => toggleDetailer(d.id)}
                        title={busy ? 'Already booked at this time' : undefined}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                          busy
                            ? 'bg-white/[0.02] border-white/5 text-muted/60 cursor-not-allowed'
                            : selected
                            ? 'bg-gold/15 border-gold/60 text-gold'
                            : 'bg-white/[0.04] border-white/10 text-cream/70 hover:border-white/20 hover:text-cream'
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
                          {d.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                        </span>
                        {d.nickname ? `"${d.nickname}"` : d.name.split(' ')[0]}
                        {busy && <span className="text-[10px] uppercase tracking-wide text-danger/80">Busy</span>}
                        {selected && <Check className="w-3 h-3 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(booking.detailersAssigned || []).length === 0 ? (
                    <span className="text-muted text-sm">No detailers assigned.</span>
                  ) : (
                    (booking.detailersAssigned || []).map((id) => {
                      const d = detailers.find((x) => x.id === id);
                      return d ? (
                        <span key={id} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm border border-white/10 bg-white/[0.04] text-cream/70">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
                            {d.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                          </span>
                          {d.nickname ? `"${d.nickname}"` : d.name.split(' ')[0]}
                        </span>
                      ) : null;
                    })
                  )}
                </div>
              )}
            </section>
          )}

          {/* Status History */}
          <section className="glass-card rounded-md p-6">
            <h2 className="font-serif text-lg text-cream mb-5">Status History</h2>
            {logsLoading ? (
              <div className="text-muted text-sm text-center py-8">Loading…</div>
            ) : logs.length === 0 ? (
              <div className="text-muted text-sm text-center py-8">No status changes recorded yet.</div>
            ) : (
              <ol className="relative border-l border-white/10 space-y-6 ml-2">
                {logs.map((log) => (
                  <li key={log.id} className="ml-5">
                    <span className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full bg-surface border border-white/20 ring-4 ring-surface">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold" />
                    </span>
                    <div className="glass-card rounded-sm px-4 py-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {log.fromStatus ? (
                          <>
                            <StatusBadge status={log.fromStatus} />
                            <span className="text-muted text-xs">→</span>
                          </>
                        ) : (
                          <span className="text-muted text-xs italic">Created</span>
                        )}
                        <StatusBadge status={log.toStatus} />
                      </div>
                      {log.notes && (
                        <p className="text-muted text-xs mt-1">Note: {log.notes}</p>
                      )}
                      <p className="text-muted text-[11px] mt-1.5">
                        {new Date(log.changedAt).toLocaleString('en-PH', {
                          month: 'short', day: 'numeric', year: 'numeric',
                          hour: 'numeric', minute: '2-digit', hour12: true,
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <aside className="space-y-4 sticky top-6">

          {/* Booking summary */}
          <div className="glass-card rounded-md p-5">
            <h2 className="font-serif text-base text-cream mb-3">Booking</h2>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="text-muted">Date</span>
                <span className="ml-auto text-cream">{formatDateLong(booking.date)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-3.5 h-3.5 text-gold shrink-0" />
                <span className="text-muted">Time</span>
                <span className="ml-auto text-cream">{booking.time}</span>
              </div>
              {booking.coffeeOrder && (
                <div className="flex items-center gap-2 text-sm">
                  <Coffee className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span className="text-muted">Coffee</span>
                  <span className="ml-auto text-cream">{booking.coffeeOrder}</span>
                </div>
              )}
            </div>
            {booking.status === 'cancelled' && booking.cancellationReason && (
              <div className="mt-3 pt-3 border-t border-white/5">
                <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Cancellation reason</div>
                <div className="text-sm text-cream/80">{booking.cancellationReason}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="glass-card rounded-md p-5 space-y-2">
            <h2 className="font-serif text-base text-cream mb-3">Actions</h2>

            {booking.status === 'pending' && (
              <button
                onClick={() => setStatus('confirmed')}
                disabled={statusPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-success/15 border border-success/30 text-success rounded-sm hover:bg-success/25 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Booking
              </button>
            )}

            {booking.status === 'confirmed' && (
              <button
                onClick={() => setStatus('on-going', 'Marked as on-going.')}
                disabled={statusPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-400/15 border border-amber-400/30 text-amber-400 rounded-sm hover:bg-amber-400/25 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <Play className="w-4 h-4" />
                Mark On-going
              </button>
            )}

            {booking.status === 'on-going' && (
              <button
                onClick={() => setStatus('completed', 'Marked as completed.')}
                disabled={statusPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gold/15 border border-gold/30 text-gold rounded-sm hover:bg-gold/25 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <BadgeCheck className="w-4 h-4" />
                Mark Completed
              </button>
            )}

            {(booking.status === 'pending' || booking.status === 'confirmed') && (
              <button
                onClick={() => setStatus('no_show', 'Marked as no-show — detailers freed.')}
                disabled={statusPending}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-cream/70 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-50 text-sm"
              >
                <UserX className="w-4 h-4" />
                Mark No-show
              </button>
            )}

            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <button
                onClick={openCancel}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-cream/70 rounded-sm hover:border-danger/50 hover:text-danger transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                Cancel Booking
              </button>
            )}

            <div className="pt-2 border-t border-white/5">
              <button
                onClick={() => setDeleteOpen(true)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-white/10 text-cream/50 rounded-sm hover:border-danger/50 hover:text-danger transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Booking
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Cancel modal */}
      {cancelOpen && (
        <div onClick={() => setCancelOpen(false)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Cancel Booking</h3>
                <p className="text-muted text-sm mt-1">Please provide a reason for cancellation.</p>
              </div>
              <button onClick={() => setCancelOpen(false)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <div className="grid grid-cols-2 gap-2 mb-3">
                {CANCEL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCancelReason(r)}
                    className={`text-sm px-3 py-2 rounded-sm border text-left transition-colors ${
                      cancelReason === r
                        ? 'border-gold bg-gold/10 text-gold'
                        : 'border-white/10 text-cream/70 hover:border-white/30'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {cancelReason === 'Other' && (
                <textarea
                  value={cancelCustom}
                  onChange={(e) => setCancelCustom(e.target.value)}
                  placeholder="Describe the reason…"
                  rows={3}
                  className="w-full bg-surface/70 border border-white/10 rounded-sm py-2 px-3 text-sm text-cream resize-none"
                />
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setCancelOpen(false)} className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
                Go Back
              </button>
              <button onClick={confirmCancel} className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteOpen && (
        <div onClick={() => setDeleteOpen(false)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Delete this booking?</h3>
                <p className="text-muted text-sm mt-1">This action cannot be undone.</p>
              </div>
              <button onClick={() => setDeleteOpen(false)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-xs text-muted">{booking.id}</div>
              <div className="text-cream font-medium">{booking.customerName}</div>
              <div className="text-sm text-muted">{booking.serviceName} · {booking.date} · {booking.time}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteOpen(false)} className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function BookingDetailPage() {
  return (
    <ProtectedRoute>
      <BookingDetailView />
    </ProtectedRoute>
  );
}
