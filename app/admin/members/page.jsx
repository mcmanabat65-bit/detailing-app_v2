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
  History,
  Calendar,
  Clock,
  Car,
  Coffee,
  ChevronRight,
  ChevronLeft,
  Pencil,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { sendEmail } from '@/lib/sendEmail';
import { membershipStatusHtml } from '@/lib/emailTemplates';
import { formatCurrency } from '@/data/services';
import { formatDateLong, formatDateShort } from '@/utils/bookingUtils';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

const statusOf = (m) => m.status ?? 'approved';

function MembersAdmin() {
  const {
    members,
    bookings,
    cars,
    updateMember,
    updateMemberStatus,
    deleteMember,
    upsertCar,
    addCarToMember,
    removeCarFromMember,
    getCarsForMember,
    showToast,
  } = useApp();

  const [tab, setTab] = useState('all');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [historyMember, setHistoryMember] = useState(null);
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState('');

  const counts = useMemo(() => {
    const c = { all: members.length, pending: 0, approved: 0, rejected: 0 };
    for (const m of members) c[statusOf(m)] = (c[statusOf(m)] || 0) + 1;
    return c;
  }, [members]);

  const filtered = useMemo(() => {
    return members.filter((m) => {
      if (tab !== 'all' && statusOf(m) !== tab) return false;
      if (q && !`${m.name} ${m.email}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [members, tab, q]);

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const bookingsByEmail = useMemo(() => {
    const map = new Map();
    for (const b of bookings) {
      if (!b.email) continue;
      const k = b.email.trim().toLowerCase();
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(b);
    }
    // Sort each list newest first
    for (const [k, list] of map) {
      map.set(k, list.sort((a, b) => new Date(b.date) - new Date(a.date)));
    }
    return map;
  }, [bookings]);

  const memberBookings = useMemo(() => {
    if (!historyMember) return [];
    return bookingsByEmail.get(historyMember.email?.trim().toLowerCase()) || [];
  }, [historyMember, bookingsByEmail]);

  const decide = async (id, status, member) => {
    const result = await updateMemberStatus(id, status);
    if (result?.error) { showToast(result.error, 'error'); return; }
    if ((status === 'approved' || status === 'rejected') && member.email) {
      sendEmail(
        member.email,
        status === 'approved'
          ? 'Your VIP membership has been approved'
          : 'Your membership application update',
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

  // Aggregate stats for the history drawer
  const historyStats = useMemo(() => {
    const total = memberBookings.length;
    const confirmed = memberBookings.filter((b) => b.status === 'confirmed').length;
    const cancelled = memberBookings.filter((b) => b.status === 'cancelled').length;
    const spent = memberBookings
      .filter((b) => b.status !== 'cancelled')
      .reduce((s, b) => s + (b.servicePrice ?? 0), 0);
    return { total, confirmed, cancelled, spent };
  }, [memberBookings]);

  return (
    <AdminLayout title="Members">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <CountCard icon={Crown}        label="Total"    value={counts.all}     accent="text-cream" />
        <CountCard icon={Hourglass}    label="Pending"  value={counts.pending}  accent={counts.pending > 0 ? 'text-gold' : 'text-cream/60'} />
        <CountCard icon={CheckCircle2} label="Approved" value={counts.approved} accent="text-success" />
        <CountCard icon={XCircle}      label="Rejected" value={counts.rejected} accent="text-danger" />
      </div>

      {/* Filters */}
      <div className="glass-card rounded-md p-4 md:p-5 mb-6">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {STATUS_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); setPage(1); }}
                className={`px-3 py-2 text-xs uppercase tracking-widest rounded-sm border transition-all ${
                  tab === t.id
                    ? 'bg-gold text-obsidian border-gold'
                    : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'
                }`}
              >
                {t.label}
                <span className="ml-1.5 opacity-70 normal-case">({counts[t.id] ?? 0})</span>
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search name or email…"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-sm text-cream"
            />
          </div>
        </div>
      </div>

      {/* Table */}
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
              {paginated.map((m) => {
                const status = statusOf(m);
                const memberEmail = (m.email || '').trim().toLowerCase();
                const bookingCount = bookingsByEmail.get(memberEmail)?.length || 0;
                return (
                  <tr key={m.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Crown className="w-3.5 h-3.5 text-gold shrink-0" />
                        <div>
                          <div className="text-cream font-medium">
                            {m.name}
                            {m.nickname && (
                              <span className="ml-1.5 text-gold/70 text-xs font-normal">"{m.nickname}"</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted font-mono">{m.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-cream/85 text-xs flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gold" />{m.email}
                      </div>
                      <div className="text-cream/85 text-xs flex items-center gap-1.5 mt-1">
                        <Phone className="w-3 h-3 text-gold" />{m.phone}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={status} /></td>
                    <td className="px-4 py-3 text-cream/85">
                      {m.memberSince ? formatDateLong(m.memberSince.slice(0, 10)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-cream/85">
                      {m.decidedAt ? formatDateLong(m.decidedAt.slice(0, 10)) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setHistoryMember(m)}
                        className={`inline-flex items-center gap-1.5 text-sm transition-colors ${
                          bookingCount > 0
                            ? 'text-gold hover:text-gold-light'
                            : 'text-muted cursor-default'
                        }`}
                        disabled={bookingCount === 0}
                        title={bookingCount > 0 ? 'View booking history' : 'No bookings'}
                      >
                        <History className="w-3.5 h-3.5" />
                        {bookingCount}
                        {bookingCount > 0 && <ChevronRight className="w-3 h-3" />}
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

      {/* Booking History Drawer */}
      {historyMember && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setHistoryMember(null)}
            className="fixed inset-0 bg-black/60 z-40 animate-fade-in"
          />
          {/* Slide-in panel */}
          <aside className="fixed top-0 right-0 bottom-0 w-full max-w-xl z-50 bg-surface border-l border-white/10 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-5 border-b border-white/5">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Crown className="w-4 h-4 text-gold" />
                  <span className="font-serif text-xl text-cream">
                    {historyMember.name}
                    {historyMember.nickname && (
                      <span className="ml-1.5 text-gold/70 text-base font-sans font-normal">"{historyMember.nickname}"</span>
                    )}
                  </span>
                  <StatusBadge status={statusOf(historyMember)} />
                </div>
                <div className="text-xs text-muted">{historyMember.email}</div>
                {/* Inline nickname edit */}
                {editingNickname ? (
                  <form
                    className="flex items-center gap-2 mt-2"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const result = await updateMember(historyMember.id, { nickname: nicknameInput.trim() || null });
                      if (result?.error) { showToast(result.error, 'error'); return; }
                      setHistoryMember((m) => ({ ...m, nickname: nicknameInput.trim() || null }));
                      setEditingNickname(false);
                    }}
                  >
                    <input
                      autoFocus
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      placeholder="Nickname (optional)"
                      className="bg-obsidian/60 border border-white/10 rounded-sm px-2 py-1 text-cream text-xs focus:outline-none focus:border-gold/50 w-36"
                    />
                    <button type="submit" className="text-gold text-xs hover:text-gold-light">Save</button>
                    <button type="button" onClick={() => setEditingNickname(false)} className="text-muted text-xs hover:text-cream">Cancel</button>
                  </form>
                ) : (
                  <button
                    onClick={() => { setNicknameInput(historyMember.nickname || ''); setEditingNickname(true); }}
                    className="mt-1.5 text-[11px] text-muted hover:text-gold transition-colors flex items-center gap-1"
                  >
                    <Pencil className="w-3 h-3" />
                    {historyMember.nickname ? `Nickname: "${historyMember.nickname}"` : 'Add nickname'}
                  </button>
                )}
              </div>
              <button
                onClick={() => { setHistoryMember(null); setEditingNickname(false); }}
                aria-label="Close"
                className="text-cream/70 hover:text-cream mt-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-px bg-white/5 border-b border-white/5">
              {[
                { label: 'Total', value: historyStats.total, color: 'text-cream' },
                { label: 'Confirmed', value: historyStats.confirmed, color: 'text-success' },
                { label: 'Cancelled', value: historyStats.cancelled, color: 'text-danger' },
                { label: 'Total Spent', value: formatCurrency(historyStats.spent), color: 'text-gold' },
              ].map((s) => (
                <div key={s.label} className="bg-surface/80 px-4 py-3 text-center">
                  <div className={`font-serif text-lg leading-none ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Member's cars */}
            <MemberCarsPanel
              member={historyMember}
              cars={cars}
              ownedCars={getCarsForMember(historyMember.id)}
              upsertCar={upsertCar}
              addCarToMember={addCarToMember}
              removeCarFromMember={removeCarFromMember}
              showToast={showToast}
            />

            {/* Booking list */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {memberBookings.length === 0 ? (
                <div className="text-center text-muted py-16">No bookings found.</div>
              ) : (
                memberBookings.map((b) => (
                  <div
                    key={b.id}
                    className={`glass-card rounded-md p-4 border ${
                      b.status === 'cancelled'
                        ? 'border-danger/20'
                        : b.status === 'no_show'
                        ? 'border-gold/20'
                        : 'border-white/5'
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="text-cream font-medium">{b.serviceName}</div>
                        <div className="font-mono text-[11px] text-muted">{b.id}</div>
                      </div>
                      <BookingStatusBadge status={b.status} />
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-cream/75">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3 text-gold shrink-0" />
                        {formatDateShort(b.date)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-gold shrink-0" />
                        {b.time}
                      </div>
                      {(b.vehicle || b.vehicleYear) && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Car className="w-3 h-3 text-gold shrink-0" />
                          {b.vehicleYear} {b.vehicle}
                        </div>
                      )}
                      {b.coffeeOrder && (
                        <div className="flex items-center gap-1.5 col-span-2">
                          <Coffee className="w-3 h-3 text-gold shrink-0" />
                          {b.coffeeOrder}
                        </div>
                      )}
                    </div>

                    {/* Price + cancellation reason */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
                      <span className={`text-sm font-medium ${b.status === 'cancelled' ? 'line-through text-muted' : 'text-gold'}`}>
                        {formatCurrency(b.servicePrice)}
                      </span>
                      {b.status === 'cancelled' && b.cancellationReason && (
                        <span className="text-[11px] text-danger/80 bg-danger/10 px-2 py-0.5 rounded-sm">
                          {b.cancellationReason}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div onClick={(e) => e.stopPropagation()} className="glass-card gold-border rounded-md max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Delete this member?</h3>
                <p className="text-muted text-sm mt-1">
                  This removes the application entirely. Past bookings under their email are not affected.
                </p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
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
                  if (result?.error) showToast(result.error, 'error');
                  else showToast('Member deleted.', 'success');
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

const SIZE_OPTS = [
  { id: 'small',  label: 'Small' },
  { id: 'medium', label: 'Medium' },
  { id: 'large',  label: 'Large' },
  { id: 'xl',     label: 'XL' },
];

function MemberCarsPanel({
  member,
  cars,
  ownedCars,
  upsertCar,
  addCarToMember,
  removeCarFromMember,
  showToast,
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    make: '',
    model: '',
    year: new Date().getFullYear(),
    size: 'medium',
  });

  const ownedIds = new Set(ownedCars.map((c) => c.id));
  const unlinkedCatalog = cars.filter((c) => !ownedIds.has(c.id));

  const linkExisting = async (carId) => {
    setBusy(true);
    const result = await addCarToMember(member.id, carId);
    setBusy(false);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Car added to member.', 'success');
  };

  const submitNew = async (e) => {
    e.preventDefault();
    if (!draft.make.trim() || !draft.model.trim()) {
      showToast('Make and model are required.', 'error');
      return;
    }
    setBusy(true);
    const car = await upsertCar(draft);
    if (car?.error) {
      setBusy(false);
      showToast(car.error, 'error');
      return;
    }
    const linked = await addCarToMember(member.id, car.id);
    setBusy(false);
    if (linked?.error) {
      showToast(linked.error, 'error');
      return;
    }
    showToast('Car added to member.', 'success');
    setDraft({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      size: 'medium',
    });
    setAdding(false);
  };

  const unlink = async (linkId, label) => {
    setBusy(true);
    const result = await removeCarFromMember(linkId);
    setBusy(false);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`Removed ${label}.`, 'info');
  };

  return (
    <div className="px-5 py-4 border-b border-white/5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-widest text-muted flex items-center gap-1.5">
          <Car className="w-3 h-3 text-gold" />
          Cars ({ownedCars.length})
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="text-xs text-gold hover:text-gold-light"
        >
          {adding ? 'Cancel' : '+ Add car'}
        </button>
      </div>

      {ownedCars.length === 0 ? (
        <div className="text-xs text-muted">No cars linked yet.</div>
      ) : (
        <ul className="space-y-1.5 mb-3">
          {ownedCars.map((c, idx) => (
            <li
              key={c.linkId}
              className="flex items-center justify-between gap-2 bg-surface/60 border border-white/5 rounded-sm px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Car className="w-3 h-3 text-gold shrink-0" />
                <span className="text-cream text-sm truncate">
                  {c.year} {c.make} {c.model}
                </span>
                {idx === 0 && (
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-gold/15 text-gold">
                    Default
                  </span>
                )}
                <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-white/5 text-cream/70">
                  {c.size}
                </span>
              </div>
              <button
                onClick={() =>
                  unlink(c.linkId, `${c.year} ${c.make} ${c.model}`)
                }
                disabled={busy}
                aria-label="Remove from member"
                className="text-cream/60 hover:text-danger p-1 disabled:opacity-30"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="bg-surface/60 border border-white/5 rounded-sm p-3 space-y-3">
          {unlinkedCatalog.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">
                Pick from catalog
              </div>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    linkExisting(e.target.value);
                    e.target.value = '';
                    setAdding(false);
                  }
                }}
                disabled={busy}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream"
                defaultValue=""
              >
                <option value="">Select an existing car…</option>
                {unlinkedCatalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.year} {c.make} {c.model} ({c.size})
                  </option>
                ))}
              </select>
            </div>
          )}
          <form
            onSubmit={submitNew}
            className="space-y-2 pt-2 border-t border-white/5"
          >
            <div className="text-[10px] uppercase tracking-widest text-muted">
              Or add a new car
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={draft.make}
                onChange={(e) => setDraft({ ...draft, make: e.target.value })}
                placeholder="Make"
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream"
              />
              <input
                type="text"
                value={draft.model}
                onChange={(e) => setDraft({ ...draft, model: e.target.value })}
                placeholder="Model"
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream"
              />
              <input
                type="number"
                min={1900}
                max={2100}
                value={draft.year}
                onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                placeholder="Year"
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream"
              />
              <select
                value={draft.size}
                onChange={(e) => setDraft({ ...draft, size: e.target.value })}
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream"
              >
                {SIZE_OPTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full px-3 py-2 bg-gold text-obsidian text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50"
            >
              Add car
            </button>
          </form>
        </div>
      )}
    </div>
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
  if (status === 'approved') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/15 text-success">Approved</span>
  );
  if (status === 'rejected') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-danger/15 text-danger">Rejected</span>
  );
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-gold/15 text-gold">Pending</span>
  );
}

function BookingStatusBadge({ status }) {
  if (status === 'cancelled') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-danger/15 text-danger">Cancelled</span>
  );
  if (status === 'no_show') return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-gold/15 text-gold">No-show</span>
  );
  return (
    <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm bg-success/15 text-success">Confirmed</span>
  );
}

export default function AdminMembersPage() {
  return (
    <ProtectedRoute>
      <MembersAdmin />
    </ProtectedRoute>
  );
}
