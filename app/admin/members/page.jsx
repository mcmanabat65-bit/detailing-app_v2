'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  ChevronRight,
  ChevronLeft,
  Pencil,
  Check,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { sendEmail } from '@/lib/sendEmail';
import { membershipStatusHtml } from '@/lib/emailTemplates';
import { formatDateLong } from '@/utils/bookingUtils';

const STATUS_TABS = [
  { id: 'all',      label: 'All' },
  { id: 'pending',  label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const statusOf = (m) => m.status ?? 'approved';

function MembersAdmin() {
  const router = useRouter();
  const {
    members,
    bookings,
    updateMember,
    updateMemberStatus,
    deleteMember,
    showToast,
  } = useApp();

  const [tab, setTab]               = useState('all');
  const [q, setQ]                   = useState('');
  const [page, setPage]             = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [editMember, setEditMember] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  const counts = useMemo(() => {
    const c = { all: members.length, pending: 0, approved: 0, rejected: 0 };
    for (const m of members) c[statusOf(m)] = (c[statusOf(m)] || 0) + 1;
    return c;
  }, [members]);

  const filtered = useMemo(() => members.filter((m) => {
    if (tab !== 'all' && statusOf(m) !== tab) return false;
    if (q && !`${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [members, tab, q]);

  const PAGE_SIZE   = 10;
  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage    = Math.min(page, totalPages);
  const paginated   = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Booking count per email for the list
  const bookingCountByEmail = useMemo(() => {
    const map = {};
    for (const b of bookings) {
      const k = (b.email || '').trim().toLowerCase();
      map[k] = (map[k] || 0) + 1;
    }
    return map;
  }, [bookings]);

  const decide = async (id, status, member) => {
    const result = await updateMemberStatus(id, status);
    if (result?.error) { showToast(result.error, 'error'); return; }
    if ((status === 'approved' || status === 'rejected') && member.email) {
      sendEmail(
        member.email,
        status === 'approved' ? 'Your VIP membership has been approved' : 'Your membership application update',
        membershipStatusHtml(member, status)
      );
    }
    showToast(
      status === 'approved' ? `${member.name} approved.`
        : status === 'rejected' ? `${member.name} rejected.`
        : `${member.name} reset to pending.`,
      status === 'approved' ? 'success' : 'info'
    );
  };

  return (
    <AdminLayout title="Members">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <CountCard icon={Crown}        label="Total"    value={counts.all}      accent="text-cream" />
        <CountCard icon={Hourglass}    label="Pending"  value={counts.pending}  accent={counts.pending > 0 ? 'text-gold' : 'text-cream/60'} />
        <CountCard icon={CheckCircle2} label="Approved" value={counts.approved} accent="text-success" />
        <CountCard icon={XCircle}      label="Rejected" value={counts.rejected} accent="text-danger" />
      </div>

      {/* Filters */}
      <div className="glass-card rounded-md p-4 md:p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button key={t.id} onClick={() => { setTab(t.id); setPage(1); }}
                className={`px-3 py-2 text-xs uppercase tracking-widest rounded-sm border transition-all ${
                  tab === t.id ? 'bg-gold text-obsidian border-gold' : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'
                }`}>
                {t.label} <span className="ml-1.5 opacity-70 normal-case">({counts[t.id] ?? 0})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search name or email…"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[760px]">
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
              {paginated.map((m) => {
                const status = statusOf(m);
                const bookingCount = bookingCountByEmail[(m.email || '').trim().toLowerCase()] ?? 0;
                return (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    {/* Name — clickable → member profile */}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/members/${m.id}`)}
                        className="flex items-center gap-2 text-left group"
                      >
                        <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
                        <div>
                          <div className="text-cream font-medium group-hover:text-gold transition-colors">
                            {m.name}
                            {m.nickname && <span className="ml-1.5 text-gold/70 text-xs font-normal">"{m.nickname}"</span>}
                          </div>
                          <div className="text-[11px] text-muted font-mono">{m.id}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-cream/85 text-xs flex items-center gap-1.5"><Mail className="w-3 h-3 text-gold" />{m.email}</div>
                      <div className="text-cream/85 text-xs flex items-center gap-1.5 mt-1"><Phone className="w-3 h-3 text-gold" />{m.phone}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3 text-cream/85 text-xs">{m.memberSince ? formatDateLong(m.memberSince.slice(0, 10)) : '—'}</td>
                    <td className="px-4 py-3 text-cream/85 text-xs">{m.decidedAt ? formatDateLong(m.decidedAt.slice(0, 10)) : '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/admin/members/${m.id}`)}
                        className={`text-sm transition-colors ${bookingCount > 0 ? 'text-gold hover:text-gold-light' : 'text-muted'}`}
                        title="View profile"
                      >
                        {bookingCount}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {status !== 'approved' && (
                          <button onClick={() => decide(m.id, 'approved', m)} aria-label="Approve" title="Approve"
                            className="p-2 text-success hover:bg-success/10 rounded-sm transition-colors">
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        {status !== 'rejected' && (
                          <button onClick={() => decide(m.id, 'rejected', m)} aria-label="Reject"
                            title={status === 'approved' ? 'Revoke approval' : 'Reject'}
                            className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors">
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => setEditMember(m)} aria-label="Edit member" title="Edit"
                          className="p-2 text-cream/70 hover:text-gold hover:bg-gold/10 rounded-sm transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setConfirmDelete(m)} aria-label="Delete member" title="Delete"
                          className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    {members.length === 0 ? 'No members yet.' : 'No members match your filters.'}
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

      {/* Edit modal */}
      {editMember && (
        <EditMemberModal
          member={editMember}
          saving={editSaving}
          onSave={async (fields) => {
            setEditSaving(true);
            const result = await updateMember(editMember.id, fields);
            setEditSaving(false);
            if (result?.error) { showToast(result.error, 'error'); return; }
            showToast('Member updated.', 'success');
            setEditMember(null);
          }}
          onClose={() => setEditMember(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="glass-card gold-border rounded-md max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Delete this member?</h3>
                <p className="text-muted text-sm mt-1">Removes the application entirely. Past bookings are not affected.</p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-cream font-medium">{confirmDelete.name}</div>
              <div className="text-sm text-muted">{confirmDelete.email}</div>
              <div className="text-xs text-muted">{confirmDelete.phone}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">Cancel</button>
              <button
                onClick={async () => {
                  const result = await deleteMember(confirmDelete.id);
                  if (result?.error) showToast(result.error, 'error');
                  else showToast('Member deleted.', 'success');
                  setConfirmDelete(null);
                }}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function CountCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="glass-card rounded-md p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-sm bg-white/5 flex items-center justify-center ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <div className="font-serif text-2xl text-cream leading-none">{value}</div>
        <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{label}</div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === 'approved') return <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/15 text-success">Approved</span>;
  if (status === 'rejected') return <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-danger/15 text-danger">Rejected</span>;
  return <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-gold/15 text-gold">Pending</span>;
}

function EditMemberModal({ member, saving, onSave, onClose }) {
  const [form, setForm] = useState({ name: member.name ?? '', email: member.email ?? '', phone: member.phone ?? '', nickname: member.nickname ?? '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Invalid email';
    if (!form.phone.trim()) e.phone = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), nickname: form.nickname.trim() || null });
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-2xl text-cream">Edit Member</h3>
            <div className="text-xs text-muted font-mono mt-0.5">{member.id}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'name',     label: 'Full Name *', type: 'text',  placeholder: 'Juan dela Cruz', error: errors.name },
            { key: 'email',    label: 'Email *',     type: 'email', placeholder: 'juan@email.com', error: errors.email },
            { key: 'phone',    label: 'Phone *',     type: 'text',  placeholder: '09171234567',    error: errors.phone },
            { key: 'nickname', label: 'Nickname',    type: 'text',  placeholder: 'e.g. Jun, Boss', error: null },
          ].map(({ key, label, type, placeholder, error }) => (
            <label key={key} className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">{label}</div>
              <input type={type} value={form[key]} onChange={(e) => set(key, e.target.value)}
                className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
                placeholder={placeholder} />
              {error && <div className="text-[11px] text-danger mt-1">{error}</div>}
            </label>
          ))}
          <div className="flex gap-3 pt-2 border-t border-white/5">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><Check className="w-4 h-4" />Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPageChange }) {
  const pages = [];
  const delta = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) pages.push(i);
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
      <div className="text-xs text-muted">Page <span className="text-cream">{page}</span> of <span className="text-cream">{totalPages}</span></div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(page - 1)} disabled={page === 1} aria-label="Previous page"
          className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        {items.map((item, i) =>
          item === '…'
            ? <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-muted text-xs">…</span>
            : <button key={item} onClick={() => onPageChange(item)}
                className={`w-8 h-8 flex items-center justify-center rounded-sm border text-xs transition-colors ${item === page ? 'bg-gold text-obsidian border-gold font-semibold' : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'}`}>
                {item}
              </button>
        )}
        <button onClick={() => onPageChange(page + 1)} disabled={page === totalPages} aria-label="Next page"
          className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function AdminMembersPage() {
  return (
    <ProtectedRoute>
      <MembersAdmin />
    </ProtectedRoute>
  );
}
