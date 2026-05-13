'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  BadgeCheck,
  XCircle,
  Crown,
  Coffee,
  Users,
  Plus,
  UserX,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Play,
} from 'lucide-react';
import { sendEmail } from '@/lib/sendEmail';
import { bookingConfirmationHtml } from '@/lib/emailTemplates';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';
import { formatDateShort } from '@/utils/bookingUtils';

const CANCEL_REASONS = [
  'Customer request',
  'Schedule conflict',
  'Vehicle unavailable',
  'Weather conditions',
  'Staff unavailability',
  'Other',
];

function BookingsTable() {
  const {
    services,
    bookings,
    detailers,
    updateBookingStatus,
    updateBookingDetailers,
    deleteBooking,
    showToast,
  } = useApp();

  const activeDetailers = useMemo(
    () => (detailers || []).filter((d) => d.isActive !== false),
    [detailers]
  );

  const [detailerPickerBookingId, setDetailerPickerBookingId] = useState(null);

  const [filters, setFilters] = useState({
    date: '',
    serviceId: 'all',
    status: 'all',
    q: '',
  });
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [cancelModal, setCancelModal] = useState(null); // booking to cancel
  const [cancelReason, setCancelReason] = useState('Customer request');
  const [cancelCustom, setCancelCustom] = useState('');

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filters.date && b.date !== filters.date) return false;
      if (filters.serviceId !== 'all' && Number(filters.serviceId) !== b.serviceId) return false;
      if (filters.status !== 'all' && b.status !== filters.status) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        if (!`${b.customerName} ${b.id}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [bookings, filters]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setFilterAndReset = (updater) => {
    setFilters(updater);
    setPage(1);
  };

  const exportCsv = () => {
    if (filtered.length === 0) { showToast('Nothing to export.', 'info'); return; }
    const headers = ['Booking ID','Customer','Email','Phone','Service','Price','Date','Time','Detailers','Vehicle','VIP','Coffee','Status','Cancellation Reason'];
    const rows = filtered.map((b) => [
      b.id, b.customerName, b.email, b.phone, b.serviceName, b.servicePrice,
      b.date, b.time, Array.isArray(b.detailersAssigned) ? b.detailersAssigned.length : 0,
      `${b.vehicleYear || ''} ${b.vehicle || ''}`.trim(),
      b.isVip ? 'Yes' : 'No', b.coffeeOrder || '', b.status,
      b.cancellationReason || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${filtered.length} booking${filtered.length === 1 ? '' : 's'}.`, 'success');
  };

  const resetFilters = () => { setFilters({ date: '', serviceId: 'all', status: 'all', q: '' }); setPage(1); };

  const handleDetailerToggle = async (booking, detailerId) => {
    const current = Array.isArray(booking.detailersAssigned) ? booking.detailersAssigned : [];
    const next = current.includes(detailerId)
      ? current.filter((id) => id !== detailerId)
      : [...current, detailerId];
    if (next.length === 0) { showToast('At least one detailer must be assigned.', 'error'); return; }
    const result = await updateBookingDetailers(booking.id, next);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`${next.length} detailer${next.length === 1 ? '' : 's'} assigned.`, 'success');
  };

  const setStatus = async (id, status, successMessage) => {
    const booking = bookings.find((b) => b.id === id);
    const wasPending = booking?.status === 'pending';
    const result = await updateBookingStatus(id, status);
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

  const openCancelModal = (booking) => {
    setCancelModal(booking);
    setCancelReason('Customer request');
    setCancelCustom('');
  };

  const confirmCancel = async () => {
    if (!cancelModal) return;
    const reason = cancelReason === 'Other'
      ? (cancelCustom.trim() || 'Other')
      : cancelReason;
    const result = await updateBookingStatus(cancelModal.id, 'cancelled', reason);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Booking cancelled — detailers freed.', 'info');
    setCancelModal(null);
  };

  return (
    <AdminLayout title="Bookings">
      {/* Top actions */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="text-muted text-sm">
          Manage all customer bookings — review, reassign detailers, cancel, or
          create new bookings on behalf of a customer.
        </div>
        <Link
          href="/booking"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          New booking
        </Link>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-md p-4 md:p-5 mb-6">
        <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 items-stretch">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) => setFilterAndReset((f) => ({ ...f, q: e.target.value }))}
              placeholder="Search by customer name or booking ID…"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-sm text-cream"
            />
          </div>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => setFilterAndReset((f) => ({ ...f, date: e.target.value }))}
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          />
          <select
            value={filters.serviceId}
            onChange={(e) => setFilterAndReset((f) => ({ ...f, serviceId: e.target.value }))}
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilterAndReset((f) => ({ ...f, status: e.target.value }))}
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          >
            <option value="all">All status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="on-going">On-going</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-show</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted">
            Showing <span className="text-cream">{paginated.length}</span> of <span className="text-cream">{filtered.length}</span> filtered ({bookings.length} total)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={resetFilters} className="text-xs text-muted hover:text-gold">Reset</button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 text-xs px-3 py-2 border border-gold/40 text-gold rounded-sm hover:bg-gold/10 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1280px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium">Booking ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Detailers</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">VIP</th>
                <th className="px-4 py-3 font-medium">Coffee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((b) => {
                const assigned = Array.isArray(b.detailersAssigned) ? b.detailersAssigned : [];
                const isEditable = b.status === 'confirmed' || b.status === 'pending' || b.status === 'on-going';
                const isPickerOpen = detailerPickerBookingId === b.id;

                return (
                  <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-gold/90">{b.id}</td>
                    <td className="px-4 py-3">
                      <div className="text-cream">{b.customerName}</div>
                      <div className="text-xs text-muted">{b.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-cream">{b.serviceName}</div>
                      <div className="text-xs text-muted">{formatCurrency(b.servicePrice)}</div>
                    </td>
                    <td className="px-4 py-3 text-cream/85">{formatDateShort(b.date)}</td>
                    <td className="px-4 py-3 text-cream/85">{b.time}</td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          type="button"
                          disabled={!isEditable || activeDetailers.length === 0}
                          onClick={() => setDetailerPickerBookingId(isPickerOpen ? null : b.id)}
                          className="inline-flex items-center gap-1.5 text-sm text-cream/80 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          title={activeDetailers.length === 0 ? 'No detailers in roster' : 'Assign detailers'}
                        >
                          <Users className="w-3.5 h-3.5 text-gold shrink-0" />
                          {assigned.length === 0 ? (
                            <span className="text-muted text-xs">None</span>
                          ) : (
                            <span>{assigned.length}</span>
                          )}
                        </button>
                        {isPickerOpen && (
                          <div className="absolute left-0 top-7 z-20 bg-surface border border-white/10 rounded-sm shadow-xl p-3 min-w-[180px] space-y-1">
                            {activeDetailers.map((d) => {
                              const sel = assigned.includes(d.id);
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => handleDetailerToggle(b, d.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm text-left transition-colors ${
                                    sel ? 'bg-gold/10 text-gold' : 'text-cream/70 hover:bg-white/5 hover:text-cream'
                                  }`}
                                >
                                  <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-semibold shrink-0">
                                    {d.name.split(' ').slice(0, 2).map((w) => w[0]).join('')}
                                  </span>
                                  <span className="flex-1 truncate">{d.nickname ? `"${d.nickname}"` : d.name.split(' ')[0]}</span>
                                  {sel && <X className="w-3 h-3 shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-cream/85 max-w-[180px] truncate">
                      {b.vehicleYear} {b.vehicle}
                    </td>
                    <td className="px-4 py-3">
                      {b.isVip ? <Crown className="w-4 h-4 text-gold" /> : <span className="text-muted/60">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {b.coffeeOrder ? (
                        <span className="inline-flex items-center gap-1 text-xs text-cream/85">
                          <Coffee className="w-3 h-3 text-gold" />{b.coffeeOrder}
                        </span>
                      ) : <span className="text-muted/60">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <StatusBadge status={b.status} />
                        {b.status === 'cancelled' && b.cancellationReason && (
                          <div className="text-[10px] text-muted mt-1 max-w-[120px] truncate" title={b.cancellationReason}>
                            {b.cancellationReason}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {/* Confirm — pending only */}
                        {b.status === 'pending' && (
                          <button
                            onClick={() => setStatus(b.id, 'confirmed')}
                            aria-label="Mark confirmed"
                            title="Confirm booking"
                            className="p-2 text-success hover:bg-success/10 rounded-sm transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}
                        {/* Mark On-going — confirmed only */}
                        {b.status === 'confirmed' && (
                          <button
                            onClick={() => setStatus(b.id, 'on-going', 'Marked as on-going.')}
                            aria-label="Mark on-going"
                            title="Mark as on-going"
                            className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-sm transition-colors"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                        )}
                        {/* Mark Completed — on-going only */}
                        {b.status === 'on-going' && (
                          <button
                            onClick={() => setStatus(b.id, 'completed', 'Marked as completed.')}
                            aria-label="Mark completed"
                            title="Mark as completed"
                            className="p-2 text-gold hover:bg-gold/10 rounded-sm transition-colors"
                          >
                            <BadgeCheck className="w-4 h-4" />
                          </button>
                        )}
                        {/* No-show — pending or confirmed only */}
                        {(b.status === 'pending' || b.status === 'confirmed') && (
                          <button
                            onClick={() => setStatus(b.id, 'no_show', 'Marked as no-show — detailers freed.')}
                            aria-label="Mark no-show"
                            title="Mark no-show"
                            className="p-2 text-cream/70 hover:text-gold hover:bg-gold/10 rounded-sm transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                        {/* Cancel — not already cancelled or completed */}
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <button
                            onClick={() => openCancelModal(b)}
                            aria-label="Cancel booking"
                            title="Cancel booking"
                            className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(b)}
                          aria-label="Delete booking"
                          className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-16 text-center text-muted">
                    No bookings match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination page={safePage} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* Cancellation reason modal */}
      {cancelModal && (
        <div
          onClick={() => setCancelModal(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card gold-border rounded-md max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Cancel Booking</h3>
                <p className="text-muted text-sm mt-1">Please provide a reason for cancellation.</p>
              </div>
              <button onClick={() => setCancelModal(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-xs text-muted">{cancelModal.id}</div>
              <div className="text-cream font-medium">{cancelModal.customerName}</div>
              <div className="text-sm text-muted">
                {cancelModal.serviceName} &middot; {formatDateShort(cancelModal.date)} &middot; {cancelModal.time}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-2">
                Reason
              </label>
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
              <button
                onClick={() => setCancelModal(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
              >
                Go Back
              </button>
              <button
                onClick={confirmCancel}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card gold-border rounded-md max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Delete this booking?</h3>
                <p className="text-muted text-sm mt-1">This action cannot be undone.</p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-xs text-muted">{confirmDelete.id}</div>
              <div className="text-cream font-medium">{confirmDelete.customerName}</div>
              <div className="text-sm text-muted">
                {confirmDelete.serviceName} &middot; {formatDateShort(confirmDelete.date)} &middot; {confirmDelete.time}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const result = await deleteBooking(confirmDelete.id);
                  if (result?.error) showToast(result.error, 'error');
                  else showToast('Booking deleted.', 'success');
                  setConfirmDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2"
              >
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

function Pagination({ page, totalPages, onPageChange }) {
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
      pages.push(i);
    }
  }

  const items = [];
  let prev = null;
  for (const p of pages) {
    if (prev !== null && p - prev > 1) items.push('…');
    items.push(p);
    prev = p;
  }

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div className="text-xs text-muted">
        Page <span className="text-cream">{page}</span> of <span className="text-cream">{totalPages}</span>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {items.map((item, i) =>
          item === '…' ? (
            <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-muted text-xs">…</span>
          ) : (
            <button
              key={item}
              onClick={() => onPageChange(item)}
              className={`w-8 h-8 flex items-center justify-center rounded-sm border text-xs transition-colors ${
                item === page
                  ? 'bg-gold text-obsidian border-gold font-semibold'
                  : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'
              }`}
            >
              {item}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="Next page"
          className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

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

export default function AdminBookingsPage() {
  return (
    <ProtectedRoute>
      <BookingsTable />
    </ProtectedRoute>
  );
}
