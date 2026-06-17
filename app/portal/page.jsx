'use client';

import Link from 'next/link';
import {
  CalendarPlus,
  Car,
  Clock,
  Coffee,
  Crown,
  Percent,
  Wifi,
  Cake,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemberRoute } from '@/components/MemberRoute';
import { PortalLayout } from '@/components/PortalLayout';
import { formatDateLong, toIsoDate } from '@/utils/bookingUtils';

const perks = [
  { icon: Coffee, label: 'Free coffee every visit' },
  { icon: Percent, label: '10% off every package' },
  { icon: Calendar, label: 'Priority scheduling' },
  { icon: Wifi, label: 'Members-only lounge' },
  { icon: Cake, label: 'Birthday month special' },
];

function Overview() {
  const { currentMember, getCarsForMember, getBookingsForMember } = useApp();
  const member = currentMember;

  const cars = member ? getCarsForMember(member.id) : [];
  const myBookings = member ? getBookingsForMember(member) : [];
  const todayIso = toIsoDate(new Date());

  const upcoming = myBookings
    .filter(
      (b) => ['pending', 'confirmed'].includes(b.status) && b.date >= todayIso
    )
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const next = upcoming[0] || null;

  const memberSinceLabel = member?.memberSince
    ? new Date(member.memberSince).toLocaleDateString('en-PH', {
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h2 className="font-serif text-3xl text-cream mb-1">
          Welcome back, {member?.name?.split(' ')[0] || 'Member'}.
        </h2>
        <p className="text-muted text-sm">
          Manage your bookings, fleet, and VIP perks all in one place.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Membership card */}
        <div className="relative">
          <div className="absolute -inset-4 bg-gold/15 blur-3xl rounded-full" />
          <div className="relative gold-gradient rounded-2xl p-7 aspect-[1.6/1] flex flex-col justify-between shadow-2xl shadow-black/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-obsidian/70 text-[10px] tracking-[0.3em] uppercase">
                  Samahuzai Carwash and Auto Detailing
                </div>
                <div className="text-obsidian font-serif text-2xl">VIP Member</div>
              </div>
              <Crown className="w-7 h-7 text-obsidian" />
            </div>
            <div>
              <div className="text-obsidian/60 text-[10px] tracking-widest uppercase mb-1">
                Member
              </div>
              <div className="font-serif text-xl text-obsidian mb-3 truncate">
                {(member?.name || '').toUpperCase()}
              </div>
              <div className="flex justify-between text-[10px] tracking-widest uppercase text-obsidian/70">
                <span>Since {memberSinceLabel}</span>
                <span>{member?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats + CTA */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Link href="/portal/fleet" className="glass-card card-hover rounded-md p-5 block">
              <div className="flex items-center gap-2 text-gold mb-2">
                <Car className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-widest">Fleet</span>
              </div>
              <div className="text-3xl font-light text-cream">{cars.length}</div>
              <div className="text-xs text-muted">car{cars.length === 1 ? '' : 's'} saved</div>
            </Link>
            <Link href="/portal/bookings" className="glass-card card-hover rounded-md p-5 block">
              <div className="flex items-center gap-2 text-gold mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-widest">Upcoming</span>
              </div>
              <div className="text-3xl font-light text-cream">{upcoming.length}</div>
              <div className="text-xs text-muted">booking{upcoming.length === 1 ? '' : 's'}</div>
            </Link>
          </div>

          <div className="glass-card rounded-md p-5">
            <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-2">
              Next appointment
            </div>
            {next ? (
              <div>
                <div className="text-cream font-medium">{next.serviceName}</div>
                <div className="text-sm text-muted mt-0.5">
                  {formatDateLong(next.date)} · {next.time}
                </div>
                <span
                  className={`inline-block mt-2 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${
                    next.status === 'confirmed'
                      ? 'bg-success/15 text-success'
                      : 'bg-gold/15 text-gold'
                  }`}
                >
                  {next.status}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted">No upcoming bookings yet.</p>
            )}
          </div>

          <Link
            href="/portal/book"
            className="w-full px-5 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors inline-flex items-center justify-center gap-2"
          >
            <CalendarPlus className="w-4 h-4" />
            Book a Detail
          </Link>
        </div>
      </div>

      {/* Perks */}
      <div className="glass-card rounded-md p-6">
        <div className="text-cream font-serif text-xl mb-4">Your VIP perks</div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {perks.map((p) => {
            const I = p.icon;
            return (
              <div key={p.label} className="flex items-center gap-3 text-sm text-cream/80">
                <span className="w-9 h-9 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                  <I className="w-4 h-4 text-gold" />
                </span>
                {p.label}
              </div>
            );
          })}
          <Link
            href="/portal/bookings"
            className="flex items-center gap-2 text-sm text-gold hover:text-gold-light transition-colors"
          >
            View booking history
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function PortalOverviewPage() {
  return (
    <MemberRoute>
      <PortalLayout title="Overview">
        <Overview />
      </PortalLayout>
    </MemberRoute>
  );
}
