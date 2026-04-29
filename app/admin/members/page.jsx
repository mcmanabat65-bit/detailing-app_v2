'use client';

import { useMemo, useState } from 'react';
import {
  Search,
  UserCheck,
  UserX,
  Trash2,
  Crown,
  Hourglass,
  CheckCircle2,
  XCircle,
  X,
  Mail,
  Phone,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatDateLong } from '@/utils/bookingUtils';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const statusOf = (m) => m.status ?? 'approved';

function MembersAdmin() {
  const { members, bookings, updateMemberStatus, deleteMember, showToast } =
    useApp();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const counts = useMemo(() => {
    const c = { all: members.length, pending: 0, approved: 0, rejected: 0 };
    for (const m of members) c[statusOf(m)] = (c[statusOf(m)] || 0) + 1;
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (tab !== 'all' && statusOf(m) !== tab) return false;
      if (q) {
        const hay = `${m.name} ${m.email}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [members, tab, q]);

  // Cheap join: how many bookings each VIP has made under their email.
  const bookingCountByEmail = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      if (!b.email) continue;
      const k = b.email.trim().toLowerCase();
      map.set(k, (map.get(k) || 0) + 1);
    }
    return map;
  }, [bookings]);

  const decide = async (id, status, name) => {
    const result = await updateMemberStatus(id, status);
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(
      status === 'approved'
        ? `${name} approved.`
        : status === 'rejected'
          ? `${name} rejected.`
          : `${name} reset to pending.`,
      status === 'approved' ? 'success' : 'info'
    );
  };

  return (
    <AdminLayout title="Members">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <CountCard
          icon={Crown}
          label="Total"
          value={counts.all}
          accent="text-cream"
        />
        <CountCard
          icon={Hourglass}
          label="Pending"
          value={counts.pending}
          accent={counts.pending > 0 ? 'text-gold' : 'text-cream/60'}
        />
        <CountCard
          icon={CheckCircle2}
          label="Approved"
          value={counts.approved}
          accent="text-success"
        />
        <CountCard
          icon={XCircle}
          label="Rejected"
          value={counts.rejected}
          accent="text-danger"
        />
      </div>

      <div className="glass-card rounded-md p-4 md:p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs uppercase tracking-widest rounded-sm border transition-all ${
                  tab === t.id
                    ? 'bg-gold text-obsidian border-gold'
                    : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'
                }`}
              >
                {t.label}
                <span className="ml-1.5 opacity-70 normal-case">
                  ({counts[t.id] ?? 0})
                </span>
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email…"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-sm text-cream"
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Contact</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Applied</th>
                <th className="px-4 py-3 font-medium">Decided</th>
                <th className="px-4 py-3 font-medium">Bookings</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const status = statusOf(m);
                const bookingCount =
                  bookingCountByEmail.get(
                    (m.email || '').trim().toLowerCase()
                  ) || 0;
                return (
                  <tr
                    key={m.id}
                    className="border-b border-white/5 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3">
                      <div className="text-cream font-medium">{m.name}</div>
                      <div className="text-[11px] text-muted font-mono">
                        {m.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-cream/85 text-xs flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gold" />
                        {m.email}
                      </div>
                      <div className="text-cream/85 text-xs flex items-center gap-1.5 mt-1">
                        <Phone className="w-3 h-3 text-gold" />
                        {m.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={status} />
                    </td>
                    <td className="px-4 py-3 text-cream/85">
                      {m.memberSince
                        ? formatDateLong(m.memberSince.slice(0, 10))
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-cream/85">
                      {m.decidedAt
                        ? formatDateLong(m.decidedAt.slice(0, 10))
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-cream/85">{bookingCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {status !== 'approved' && (
                          <button
                            onClick={() => decide(m.id, 'approved', m.name)}
                            aria-label="Approve"
                            title="Approve"
                            className="p-2 text-success hover:bg-success/10 rounded-sm transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {status !== 'rejected' && (
                          <button
                            onClick={() => decide(m.id, 'rejected', m.name)}
                            aria-label="Reject"
                            title={
                              status === 'approved'
                                ? 'Revoke approval'
                                : 'Reject'
                            }
                            className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmDelete(m)}
                          aria-label="Delete member"
                          title="Delete"
                          className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    {members.length === 0
                      ? 'No members yet.'
                      : 'No members match your filters.'}
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
                  Delete this member?
                </h3>
                <p className="text-muted text-sm mt-1">
                  This removes the application entirely. Past bookings under
                  their email are not affected.
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
              <div className="text-cream font-medium">{confirmDelete.name}</div>
              <div className="text-sm text-muted">{confirmDelete.email}</div>
              <div className="text-xs text-muted">{confirmDelete.phone}</div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const result = await deleteMember(confirmDelete.id);
                  if (result?.error) {
                    showToast(result.error, 'error');
                  } else {
                    showToast('Member deleted.', 'success');
                  }
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

function CountCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-card rounded-md p-4 flex items-center gap-3">
      <div
        className={`w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center ${accent}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="font-serif text-2xl text-cream leading-none">
          {value}
        </div>
        <div className="text-[10px] text-muted uppercase tracking-widest mt-1">
          {label}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'approved') {
    return (
      <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/15 text-success">
        Approved
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-danger/15 text-danger">
        Rejected
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-gold/15 text-gold">
      Pending
    </span>
  );
}

export default function AdminMembersPage() {
  return (
    <ProtectedRoute>
      <MembersAdmin />
    </ProtectedRoute>
  );
}
