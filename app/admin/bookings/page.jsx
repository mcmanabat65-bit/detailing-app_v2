'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  Download,
  Trash2,
  CheckCircle2,
  XCircle,
  Crown,
  Coffee,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { services, formatCurrency } from '@/data/services';
import { formatDateShort } from '@/utils/bookingUtils';

function BookingsTable() {
  const { bookings, updateBookingStatus, deleteBooking, showToast } = useApp();

  const [filters, setFilters] = useState({
    date: '',
    serviceId: 'all',
    status: 'all',
    q: '',
  });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (filters.date && b.date !== filters.date) return false;
      if (
        filters.serviceId !== 'all' &&
        Number(filters.serviceId) !== b.serviceId
      )
        return false;
      if (filters.status !== 'all' && b.status !== filters.status) return false;
      if (filters.q) {
        const q = filters.q.toLowerCase();
        const hay = `${b.customerName} ${b.id}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bookings, filters]);

  const exportCsv = () => {
    if (filtered.length === 0) {
      showToast('Nothing to export.', 'info');
      return;
    }
    const headers = [
      'Booking ID',
      'Customer',
      'Email',
      'Phone',
      'Service',
      'Price',
      'Date',
      'Time',
      'Vehicle',
      'VIP',
      'Coffee',
      'Status',
    ];
    const rows = filtered.map((b) => [
      b.id,
      b.customerName,
      b.email,
      b.phone,
      b.serviceName,
      b.servicePrice,
      b.date,
      b.time,
      `${b.vehicleYear || ''} ${b.vehicle || ''}`.trim(),
      b.isVip ? 'Yes' : 'No',
      b.coffeeOrder || '',
      b.status,
    ]);
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bookings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(
      `Exported ${filtered.length} booking${filtered.length === 1 ? '' : 's'}.`,
      'success'
    );
  };

  const resetFilters = () =>
    setFilters({ date: '', serviceId: 'all', status: 'all', q: '' });

  return (
    <AdminLayout title="Bookings">
      <div className="glass-card rounded-md p-4 md:p-5 mb-6">
        <div className="grid md:grid-cols-[1fr_auto_auto_auto] gap-3 items-stretch">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filters.q}
              onChange={(e) =>
                setFilters((f) => ({ ...f, q: e.target.value }))
              }
              placeholder="Search by customer name or booking ID…"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-sm text-cream"
            />
          </div>
          <input
            type="date"
            value={filters.date}
            onChange={(e) =>
              setFilters((f) => ({ ...f, date: e.target.value }))
            }
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          />
          <select
            value={filters.serviceId}
            onChange={(e) =>
              setFilters((f) => ({ ...f, serviceId: e.target.value }))
            }
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters((f) => ({ ...f, status: e.target.value }))
            }
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          >
            <option value="all">All status</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-muted">
            Showing <span className="text-cream">{filtered.length}</span> of{' '}
            {bookings.length}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="text-xs text-muted hover:text-gold"
            >
              Reset
            </button>
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

      <div className="glass-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium">Booking ID</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">VIP</th>
                <th className="px-4 py-3 font-medium">Coffee</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-mono text-xs text-gold/90">
                    {b.id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream">{b.customerName}</div>
                    <div className="text-xs text-muted">{b.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream">{b.serviceName}</div>
                    <div className="text-xs text-muted">
                      {formatCurrency(b.servicePrice)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cream/85">
                    {formatDateShort(b.date)}
                  </td>
                  <td className="px-4 py-3 text-cream/85">{b.time}</td>
                  <td className="px-4 py-3 text-cream/85 max-w-[180px] truncate">
                    {b.vehicleYear} {b.vehicle}
                  </td>
                  <td className="px-4 py-3">
                    {b.isVip ? (
                      <Crown className="w-4 h-4 text-gold" />
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {b.coffeeOrder ? (
                      <span className="inline-flex items-center gap-1 text-xs text-cream/85">
                        <Coffee className="w-3 h-3 text-gold" />
                        {b.coffeeOrder}
                      </span>
                    ) : (
                      <span className="text-muted/60">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {b.status !== 'confirmed' && (
                        <button
                          onClick={() =>
                            updateBookingStatus(b.id, 'confirmed')
                          }
                          aria-label="Mark confirmed"
                          className="p-2 text-success hover:bg-success/10 rounded-sm transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {b.status !== 'cancelled' && (
                        <button
                          onClick={() =>
                            updateBookingStatus(b.id, 'cancelled')
                          }
                          aria-label="Cancel booking"
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
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center text-muted">
                    No bookings match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                <h3 className="font-serif text-2xl text-cream">
                  Delete this booking?
                </h3>
                <p className="text-muted text-sm mt-1">
                  This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setConfirmDelete(null)}
                aria-label="Close"
                className="text-cream/70 hover:text-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-xs text-muted">{confirmDelete.id}</div>
              <div className="text-cream font-medium">
                {confirmDelete.customerName}
              </div>
              <div className="text-sm text-muted">
                {confirmDelete.serviceName} &middot;{' '}
                {formatDateShort(confirmDelete.date)} &middot;{' '}
                {confirmDelete.time}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteBooking(confirmDelete.id);
                  showToast('Booking deleted.', 'success');
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

function StatusBadge({ status }) {
  if (status === 'cancelled') {
    return (
      <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-danger/15 text-danger">
        Cancelled
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/15 text-success">
      Confirmed
    </span>
  );
}

export default function AdminBookingsPage() {
  return (
    <ProtectedRoute>
      <BookingsTable />
    </ProtectedRoute>
  );
}
