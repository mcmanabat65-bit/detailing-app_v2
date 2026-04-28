'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  CalendarDays,
  CheckCircle2,
  Crown,
  TrendingUp,
  Clock,
  UserCheck,
  UserX,
  Hourglass,
  Mail,
  Phone,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { categoryColors } from '@/data/services';
import { formatDateLong, toIsoDate } from '@/utils/bookingUtils';
import { timeSlots } from '@/data/timeSlots';

function Dashboard() {
  const { bookings, members, updateMemberStatus, showToast } = useApp();
  const today = toIsoDate(new Date());

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed');
    const todayB = confirmed.filter((b) => b.date === today);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const weekB = confirmed.filter((b) => {
      const d = new Date(b.date);
      return d >= start && d <= end;
    });
    const cancelled = bookings.filter((b) => b.status === 'cancelled').length;
    const vip = confirmed.filter((b) => b.isVip).length;
    const pendingMembers = members.filter(
      (m) => (m.status ?? 'approved') === 'pending'
    );
    const approvedMembers = members.filter(
      (m) => (m.status ?? 'approved') === 'approved'
    );
    return {
      today: todayB.length,
      week: weekB.length,
      confirmed: confirmed.length,
      cancelled,
      vip,
      pendingMembers,
      approvedMembers: approvedMembers.length,
    };
  }, [bookings, today, members]);

  const decideMember = (id, status, name) => {
    updateMemberStatus(id, status);
    showToast(
      status === 'approved'
        ? `${name} approved as VIP.`
        : `${name}'s application rejected.`,
      status === 'approved' ? 'success' : 'info'
    );
  };

  const todayBookings = useMemo(
    () =>
      bookings
        .filter((b) => b.date === today && b.status !== 'cancelled')
        .sort((a, b) => timeSlots.indexOf(a.time) - timeSlots.indexOf(b.time)),
    [bookings, today]
  );

  return (
    <AdminLayout title="Dashboard">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        <StatCard
          icon={Calendar}
          label="Bookings Today"
          value={stats.today}
          accent="text-gold"
        />
        <StatCard
          icon={CalendarDays}
          label="Bookings This Week"
          value={stats.week}
          accent="text-cream"
        />
        <StatCard
          icon={CheckCircle2}
          label="Confirmed"
          value={stats.confirmed}
          accent="text-success"
          sub={`${stats.cancelled} cancelled`}
        />
        <StatCard
          icon={Crown}
          label="VIP Bookings"
          value={stats.vip}
          accent="text-gold"
          sub={`${stats.approvedMembers} approved members`}
        />
        <StatCard
          icon={Hourglass}
          label="Pending VIP"
          value={stats.pendingMembers.length}
          accent={
            stats.pendingMembers.length > 0 ? 'text-gold' : 'text-cream/60'
          }
          sub={
            stats.pendingMembers.length > 0
              ? 'Awaiting your approval'
              : 'Inbox clear'
          }
        />
      </div>

      {stats.pendingMembers.length > 0 && (
        <section className="glass-card rounded-md p-6 mb-6 border border-gold/30 animate-fade-in">
          <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
            <div>
              <h2 className="font-serif text-2xl text-cream flex items-center gap-2">
                <Hourglass className="w-5 h-5 text-gold" />
                Pending VIP Applications
              </h2>
              <div className="text-muted text-sm mt-1">
                Approve to unlock VIP perks for the customer at their next
                booking. Detection is by email, so the email below must match.
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-gold/15 border border-gold/40 text-gold">
              {stats.pendingMembers.length} waiting
            </span>
          </div>

          <ul className="divide-y divide-white/5">
            {stats.pendingMembers.map((m) => (
              <li
                key={m.id}
                className="py-4 grid md:grid-cols-[1fr_auto] gap-3 items-center"
              >
                <div className="min-w-0">
                  <div className="text-cream font-medium">{m.name}</div>
                  <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1 mt-1">
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-gold" />
                      {m.email}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-gold" />
                      {m.phone}
                    </span>
                    <span>
                      Applied {formatDateLong(m.memberSince.slice(0, 10))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => decideMember(m.id, 'rejected', m.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-white/10 rounded-sm text-cream/85 hover:border-danger/50 hover:text-danger transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    Reject
                  </button>
                  <button
                    onClick={() => decideMember(m.id, 'approved', m.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    Approve
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <section className="glass-card rounded-md p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-serif text-2xl text-cream">Today&apos;s Schedule</h2>
              <div className="text-muted text-sm">{formatDateLong(today)}</div>
            </div>
            <Link
              href="/admin/schedule"
              className="text-xs text-gold hover:text-gold-light"
            >
              Open full schedule →
            </Link>
          </div>

          <div className="space-y-2">
            {timeSlots.map((slot) => {
              const booked = todayBookings.find((b) => b.time === slot);
              return (
                <div
                  key={slot}
                  className="grid grid-cols-[80px_1fr] gap-3 items-center"
                >
                  <div className="text-muted text-xs uppercase tracking-widest">
                    {slot}
                  </div>
                  {booked ? (
                    <div
                      className="rounded-sm p-3 border-l-2 bg-surface/60 border border-white/5"
                      style={{
                        borderLeftColor:
                          categoryColors[booked.serviceCategory] || '#00704A',
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-cream text-sm font-medium truncate">
                          {booked.customerName}
                          {booked.isVip && (
                            <span className="ml-2 vip-badge">VIP</span>
                          )}
                        </div>
                        <div className="text-xs text-muted whitespace-nowrap">
                          {booked.serviceName}
                        </div>
                      </div>
                      <div className="text-xs text-muted mt-1 truncate">
                        {booked.vehicleYear} {booked.vehicle}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-sm p-3 border border-dashed border-white/5 text-muted text-xs">
                      Open
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {todayBookings.length === 0 && (
            <div className="text-center py-8 text-muted text-sm">
              No bookings today.
            </div>
          )}
        </section>

        <section className="glass-card rounded-md p-6">
          <h2 className="font-serif text-2xl text-cream mb-5">
            Recent Activity
          </h2>
          <div className="space-y-4">
            {bookings.slice(0, 6).map((b) => (
              <div
                key={b.id}
                className="flex items-start gap-3 pb-4 border-b border-white/5 last:border-0 last:pb-0"
              >
                <div
                  className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
                    b.status === 'cancelled'
                      ? 'bg-danger/15 text-danger'
                      : 'bg-gold/15 text-gold'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-cream truncate">
                    {b.customerName}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {b.serviceName} &middot; {b.date} &middot; {b.time}
                  </div>
                </div>
                <div
                  className={`text-[10px] uppercase tracking-widest shrink-0 ${
                    b.status === 'cancelled'
                      ? 'text-danger'
                      : 'text-success'
                  }`}
                >
                  {b.status}
                </div>
              </div>
            ))}
            {bookings.length === 0 && (
              <div className="text-muted text-sm text-center py-6">
                No activity yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="glass-card card-hover rounded-md p-5">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center ${accent}`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <TrendingUp className="w-3.5 h-3.5 text-success/60" />
      </div>
      <div className="font-serif text-3xl text-cream">{value}</div>
      <div className="text-xs text-muted uppercase tracking-widest mt-1">
        {label}
      </div>
      {sub && <div className="text-[11px] text-muted mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  );
}
