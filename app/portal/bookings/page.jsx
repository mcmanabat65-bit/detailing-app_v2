'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarPlus, Car, Clock, Coffee } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemberRoute } from '@/components/MemberRoute';
import { PortalLayout } from '@/components/PortalLayout';
import { formatCurrency } from '@/data/services';
import { formatDateLong, toIsoDate } from '@/utils/bookingUtils';

const STATUS_STYLES = {
  pending: 'bg-gold/15 text-gold',
  confirmed: 'bg-success/15 text-success',
  completed: 'bg-sky-400/15 text-sky-400',
  cancelled: 'bg-danger/15 text-danger',
  no_show: 'bg-white/10 text-muted',
};

function BookingCard({ b }) {
  return (
    <div className="glass-card rounded-md p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="text-cream font-serif text-lg">{b.serviceName}</div>
          <div className="text-sm text-muted mt-0.5">
            {formatDateLong(b.date)} · {b.time}
          </div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm shrink-0 ${
            STATUS_STYLES[b.status] || 'bg-white/10 text-muted'
          }`}
        >
          {b.status === 'no_show' ? 'no show' : b.status}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-cream/70">
        {b.vehicle && (
          <span className="inline-flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-gold" />
            {b.vehicle}
            {b.vehicleYear ? ` (${b.vehicleYear})` : ''}
          </span>
        )}
        {b.isVip && b.coffeeOrder && (
          <span className="inline-flex items-center gap-1.5">
            <Coffee className="w-3.5 h-3.5 text-gold" />
            {b.coffeeOrder}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-gold">
          {formatCurrency(b.servicePrice)}
        </span>
      </div>
      {b.cancellationReason && (
        <div className="mt-3 text-xs text-danger/80 bg-danger/5 border border-danger/20 rounded-sm px-3 py-2">
          {b.cancellationReason}
        </div>
      )}
    </div>
  );
}

function EmptyState({ children }) {
  return (
    <div className="glass-card rounded-md p-10 text-center">
      <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
        <Clock className="w-5 h-5 text-gold" />
      </div>
      <p className="text-muted text-sm">{children}</p>
    </div>
  );
}

function MyBookings() {
  const { currentMember, getBookingsForMember } = useApp();
  const [tab, setTab] = useState('upcoming');

  const todayIso = toIsoDate(new Date());
  const all = useMemo(
    () => (currentMember ? getBookingsForMember(currentMember) : []),
    [currentMember, getBookingsForMember]
  );

  const upcoming = useMemo(
    () =>
      all
        .filter(
          (b) => ['pending', 'confirmed'].includes(b.status) && b.date >= todayIso
        )
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [all, todayIso]
  );

  const history = useMemo(
    () =>
      all
        .filter(
          (b) =>
            ['completed', 'cancelled', 'no_show'].includes(b.status) ||
            (['pending', 'confirmed'].includes(b.status) && b.date < todayIso)
        )
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)),
    [all, todayIso]
  );

  const list = tab === 'upcoming' ? upcoming : history;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex bg-surface/60 border border-white/10 rounded-sm p-1">
          {[
            { id: 'upcoming', label: `Upcoming (${upcoming.length})` },
            { id: 'history', label: `History (${history.length})` },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-sm text-sm transition-colors ${
                tab === t.id ? 'bg-gold/20 text-gold' : 'text-muted hover:text-cream'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Link
          href="/portal/book"
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-obsidian text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors"
        >
          <CalendarPlus className="w-4 h-4" />
          Book
        </Link>
      </div>

      {list.length === 0 ? (
        <EmptyState>
          {tab === 'upcoming'
            ? 'No upcoming bookings. Book your next detail to see it here.'
            : 'No past bookings yet.'}
        </EmptyState>
      ) : (
        <div className="space-y-4">
          {list.map((b) => (
            <BookingCard key={b.id} b={b} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PortalBookingsPage() {
  return (
    <MemberRoute>
      <PortalLayout title="My Bookings">
        <MyBookings />
      </PortalLayout>
    </MemberRoute>
  );
}
