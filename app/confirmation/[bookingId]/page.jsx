'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Check,
  Hourglass,
  Calendar,
  Clock,
  Car,
  User,
  Coffee,
  Crown,
  Printer,
  Home,
  Plus,
  Hash,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';
import { formatDateLong } from '@/utils/bookingUtils';

export default function ConfirmationPage() {
  const params = useParams();
  const bookingId = params?.bookingId;
  const { bookings, hydrated } = useApp();
  const booking = bookings.find((b) => b.id === bookingId);

  // Wait for hydration before claiming "not found" — the bookings list is
  // empty during SSR / first render.
  if (!hydrated) {
    return (
      <div className="page-enter pt-32 pb-20 max-w-2xl mx-auto px-5 text-center">
        <div className="text-muted text-sm">Loading…</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="page-enter pt-32 pb-20 max-w-2xl mx-auto px-5 text-center">
        <h1 className="font-serif text-4xl text-cream mb-3">
          Booking not found
        </h1>
        <p className="text-muted mb-8">
          We couldn&apos;t find a reservation with ID <strong>{bookingId}</strong>.
        </p>
        <Link
          href="/booking"
          className="inline-block px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
        >
          Make a new booking
        </Link>
      </div>
    );
  }

  const isPending = booking.status === 'pending';

  return (
    <div className="page-enter pt-28 md:pt-36 pb-20">
      <div className="max-w-2xl mx-auto px-5">
        <div className="text-center mb-10 no-print">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${
              isPending
                ? 'bg-gold/15 border border-gold/30'
                : 'bg-success/15 border border-success/30'
            }`}
          >
            {isPending ? (
              <Hourglass className="w-7 h-7 text-gold" />
            ) : (
              <Check className="w-7 h-7 text-success" />
            )}
          </div>
          <h1 className="font-serif text-4xl md:text-5xl text-cream mb-3">
            {isPending ? 'Booking Received' : 'Reservation Confirmed'}
          </h1>
          <p className="text-muted">
            {isPending ? (
              <>
                Your request is <strong className="text-gold">pending admin confirmation</strong>.
                We&apos;ll email you at{' '}
                <strong className="text-cream/80">{booking.email}</strong> once approved.
              </>
            ) : (
              <>
                We&apos;ve sent a copy to{' '}
                <strong className="text-cream/80">{booking.email}</strong>.
              </>
            )}
          </p>
        </div>

        <div className="glass-card print-card rounded-md p-7 md:p-9 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/10 rounded-full blur-3xl no-print" />

          <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/10">
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">
                Booking ID
              </div>
              <div className="font-mono text-cream text-lg flex items-center gap-1">
                <Hash className="w-4 h-4 text-gold" />
                {booking.id}
              </div>
            </div>
            {booking.isVip && (
              <span className="vip-badge">
                <Crown className="w-3 h-3" /> VIP
              </span>
            )}
          </div>

          <div className="mb-6">
            <div className="text-xs uppercase tracking-widest text-gold/80 mb-1">
              {booking.serviceCategory}
            </div>
            <div className="font-serif text-3xl text-cream mb-1">
              {booking.serviceName}
            </div>
            <div className="text-gold text-2xl font-light">
              {formatCurrency(booking.servicePrice)}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-5 mb-6">
            <Detail icon={Calendar} label="Date">
              {formatDateLong(booking.date)}
            </Detail>
            <Detail icon={Clock} label="Time">
              {booking.time} &middot; {booking.serviceDuration}
            </Detail>
            <Detail icon={User} label="Customer">
              {booking.customerName}
            </Detail>
            <Detail icon={Car} label="Vehicle">
              {booking.vehicleYear} {booking.vehicle}
            </Detail>
            {booking.isVip && booking.coffeeOrder && (
              <Detail icon={Coffee} label="Your Coffee">
                {booking.coffeeOrder}
              </Detail>
            )}
          </div>

          {booking.notes && (
            <div className="bg-surface/50 border border-white/5 rounded-sm p-4 mb-2">
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1">
                Special Notes
              </div>
              <div className="text-cream/85 text-sm">{booking.notes}</div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3 mt-8 no-print">
          <Link
            href="/"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
          <Link
            href="/booking"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
          >
            <Plus className="w-4 h-4" />
            Book Another
          </Link>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
            aria-label="Print receipt"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, children }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted mb-1 flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-gold" />
        {label}
      </div>
      <div className="text-cream">{children}</div>
    </div>
  );
}
