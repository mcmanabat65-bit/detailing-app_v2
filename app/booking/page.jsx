'use client';

import { Suspense } from 'react';
import { ArrowLeft, Calendar, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BookingFlow } from '@/components/booking/BookingFlow';

function BookingUnavailable() {
  return (
    <div className="min-h-screen bg-obsidian flex items-center justify-center px-5 py-20">
      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-6">
          <Calendar className="w-7 h-7 text-gold" />
        </div>
        <h1 className="font-serif text-4xl text-cream mb-4">
          Online Booking Unavailable
        </h1>
        <p className="text-muted text-lg leading-relaxed mb-8">
          We're not accepting online bookings at the moment. To schedule an appointment, please visit us at the shop and our team will be happy to assist you.
        </p>
        <div className="glass-card rounded-md p-6 text-left space-y-4 mb-8">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-gold shrink-0 mt-0.5" />
            <span className="text-cream/80 text-sm">Mon – Sun · 7:00 AM – 5:00 PM</span>
          </div>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </a>
      </div>
    </div>
  );
}

// Public online booking is disabled — only admins use this flow. VIP members
// book from their portal (/portal/book).
function BookingGate() {
  const { accountType, hydrated } = useApp();
  if (!hydrated) return null;
  if (accountType !== 'admin') return <BookingUnavailable />;
  return (
    <Suspense fallback={null}>
      <BookingFlow />
    </Suspense>
  );
}

export default function BookingPage() {
  return <BookingGate />;
}
