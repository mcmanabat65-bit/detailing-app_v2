'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Car,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Crown,
  ExternalLink,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Repeat,
  ToggleLeft,
  ToggleRight,
  Trash2,
  UserCheck,
  UserX,
  X,
  XCircle,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { sendEmail } from '@/lib/sendEmail';
import { membershipStatusHtml } from '@/lib/emailTemplates';
import { formatCurrency } from '@/data/services';
import { formatDateLong, formatDateShort, snapTimeToGrid } from '@/utils/bookingUtils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const statusOf = (m) => m?.status ?? 'approved';

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
  const map = {
    confirmed:  'bg-success/15 text-success',
    completed:  'bg-blue-500/15 text-blue-400',
    cancelled:  'bg-danger/15 text-danger',
    no_show:    'bg-gold/15 text-gold',
    pending:    'bg-white/10 text-cream/70',
    'on-going': 'bg-amber-400/15 text-amber-400',
  };
  const label = { confirmed: 'Confirmed', completed: 'Completed', cancelled: 'Cancelled', no_show: 'No-show', pending: 'Pending', 'on-going': 'On-going' };
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${map[status] ?? 'bg-white/10 text-cream/70'}`}>
      {label[status] ?? status}
    </span>
  );
}

const BOOKING_TABS = [
  { id: 'all', label: 'All' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'no_show', label: 'No-show' },
];

const SIZE_OPTS = ['small', 'medium', 'large', 'xl'];

// ---------------------------------------------------------------------------
// Edit Member Modal
// ---------------------------------------------------------------------------
function EditMemberModal({ member, saving, onSave, onClose }) {
  const [form, setForm] = useState({
    name: member.name ?? '',
    email: member.email ?? '',
    phone: member.phone ?? '',
    nickname: member.nickname ?? '',
  });
  const [errors, setErrors] = useState({});
  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

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
            { key: 'name', label: 'Full Name *', type: 'text', placeholder: 'Juan dela Cruz', error: errors.name },
            { key: 'email', label: 'Email *', type: 'email', placeholder: 'juan@email.com', error: errors.email },
            { key: 'phone', label: 'Phone *', type: 'text', placeholder: '09171234567', error: errors.phone },
            { key: 'nickname', label: 'Nickname', type: 'text', placeholder: 'e.g. Jun, Boss', error: null },
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

// ---------------------------------------------------------------------------
// Car Fleet Panel
// ---------------------------------------------------------------------------
function CarFleetPanel({ member, cars, ownedCars, upsertCar, addCarToMember, updateMemberCarPlate, removeCarFromMember, onViewCar, showToast, readOnly = false }) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ make: '', model: '', year: new Date().getFullYear(), size: 'medium', plateNumber: '' });
  const [editingPlate, setEditingPlate] = useState(null); // { linkId, value }

  const ownedIds = new Set(ownedCars.map((c) => c.id));
  const unlinkedCatalog = cars.filter((c) => !ownedIds.has(c.id));

  const linkExisting = async (carId) => {
    setBusy(true);
    const result = await addCarToMember(member.id, carId);
    setBusy(false);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Car added to fleet.', 'success');
  };

  const submitNew = async (e) => {
    e.preventDefault();
    if (!draft.make.trim() || !draft.model.trim()) { showToast('Make and model are required.', 'error'); return; }
    setBusy(true);
    const car = await upsertCar(draft);
    if (car?.error) { setBusy(false); showToast(car.error, 'error'); return; }
    const linked = await addCarToMember(member.id, car.id, draft.plateNumber);
    setBusy(false);
    if (linked?.error) { showToast(linked.error, 'error'); return; }
    showToast('Car added to fleet.', 'success');
    setDraft({ make: '', model: '', year: new Date().getFullYear(), size: 'medium', plateNumber: '' });
    setAdding(false);
  };

  const savePlate = async (linkId) => {
    const result = await updateMemberCarPlate(linkId, editingPlate.value);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Plate number updated.', 'success');
    setEditingPlate(null);
  };

  const unlink = async (linkId, label) => {
    setBusy(true);
    const result = await removeCarFromMember(linkId);
    setBusy(false);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`Removed ${label}.`, 'info');
  };

  return (
    <div className="glass-card rounded-md p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Car className="w-4 h-4 text-gold" />
          <span className="text-cream font-medium">Car Fleet</span>
          <span className="text-xs text-muted">({ownedCars.length})</span>
        </div>
        {!readOnly && (
          <button onClick={() => setAdding((v) => !v)} className="text-xs text-gold hover:text-gold-light transition-colors flex items-center gap-1">
            <Plus className="w-3.5 h-3.5" />
            {adding ? 'Cancel' : 'Add car'}
          </button>
        )}
      </div>

      {ownedCars.length === 0 ? (
        <div className="text-xs text-muted py-4 text-center">No cars linked yet.</div>
      ) : (
        <ul className="space-y-2 mb-3">
          {ownedCars.map((c, idx) => (
            <li key={c.linkId} className="bg-surface/60 border border-white/5 rounded-sm px-3 py-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Car className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span className="text-cream text-sm truncate">{c.year} {c.make} {c.model}</span>
                  {idx === 0 && <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-gold/15 text-gold shrink-0">Default</span>}
                  <span className="text-[9px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-white/5 text-cream/70 shrink-0">{c.size}</span>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => onViewCar(c.id)} aria-label="View car details" title="View car details"
                      className="text-cream/50 hover:text-gold p-1 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => unlink(c.linkId, `${c.year} ${c.make} ${c.model}`)} disabled={busy}
                      aria-label="Remove" className="text-cream/50 hover:text-danger p-1 disabled:opacity-30 transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              {/* Plate — read-only display, or inline editing */}
              {readOnly ? (
                c.plateNumber ? (
                  <span className="inline-block font-mono text-[11px] px-1.5 py-0.5 rounded-sm bg-white/5 text-cream/70">{c.plateNumber}</span>
                ) : (
                  <span className="text-[11px] text-muted/60 italic">No plate number</span>
                )
              ) : editingPlate?.linkId === c.linkId ? (
                <form onSubmit={(e) => { e.preventDefault(); savePlate(c.linkId); }} className="flex items-center gap-2">
                  <input autoFocus type="text" value={editingPlate.value} maxLength={10}
                    onChange={(e) => setEditingPlate({ ...editingPlate, value: e.target.value.toUpperCase() })}
                    placeholder="e.g. ABC-1234"
                    className="flex-1 bg-obsidian/60 border border-gold/40 rounded-sm px-2 py-1 text-cream text-xs font-mono focus:outline-none focus:border-gold/70" />
                  <button type="submit" className="text-gold text-xs hover:text-gold-light px-2 py-1 transition-colors">Save</button>
                  <button type="button" onClick={() => setEditingPlate(null)} className="text-muted text-xs hover:text-cream transition-colors">Cancel</button>
                </form>
              ) : (
                <button onClick={() => setEditingPlate({ linkId: c.linkId, value: c.plateNumber || '' })}
                  className="flex items-center gap-1.5 text-[11px] group transition-colors">
                  {c.plateNumber
                    ? <span className="font-mono px-1.5 py-0.5 rounded-sm bg-white/5 text-cream/70 group-hover:text-gold group-hover:bg-gold/10 transition-colors">{c.plateNumber}</span>
                    : <span className="text-muted/60 italic group-hover:text-gold transition-colors">+ Add plate number</span>}
                  <Pencil className="w-2.5 h-2.5 text-muted/40 group-hover:text-gold transition-colors" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {!readOnly && adding && (
        <div className="bg-surface/60 border border-white/5 rounded-sm p-3 space-y-3">
          {unlinkedCatalog.length > 0 && (
            <div>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-1.5">Pick from catalog</div>
              <select onChange={(e) => { if (e.target.value) { linkExisting(e.target.value); e.target.value = ''; setAdding(false); } }}
                disabled={busy} defaultValue=""
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream focus:outline-none focus:border-gold/50">
                <option value="">Select an existing car…</option>
                {unlinkedCatalog.map((c) => (
                  <option key={c.id} value={c.id}>{c.year} {c.make} {c.model} ({c.size})</option>
                ))}
              </select>
            </div>
          )}
          <form onSubmit={submitNew} className="space-y-2 pt-2 border-t border-white/5">
            <div className="text-[10px] uppercase tracking-widest text-muted">Or add a new car</div>
            <div className="grid grid-cols-2 gap-2">
              {['make', 'model'].map((f) => (
                <input key={f} type="text" value={draft[f]} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })}
                  placeholder={f.charAt(0).toUpperCase() + f.slice(1)}
                  className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50" />
              ))}
              <input type="number" min={1900} max={2100} value={draft.year} onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                placeholder="Year"
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream focus:outline-none focus:border-gold/50" />
              <select value={draft.size} onChange={(e) => setDraft({ ...draft, size: e.target.value })}
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream focus:outline-none focus:border-gold/50">
                {SIZE_OPTS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
              <input type="text" value={draft.plateNumber || ''} maxLength={10}
                onChange={(e) => setDraft({ ...draft, plateNumber: e.target.value.toUpperCase() })}
                placeholder="Plate (optional)"
                className="bg-surface/70 border border-white/10 rounded-sm py-2 px-2 text-sm text-cream placeholder-[var(--color-muted)] font-mono focus:outline-none focus:border-gold/50 col-span-2" />
            </div>
            <button type="submit" disabled={busy}
              className="w-full px-3 py-2 bg-gold text-obsidian text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50">
              Add car
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
const PAGE_SIZE = 10;

function MemberDetailContent() {
  const { memberId } = useParams();
  const router = useRouter();
  const {
    members, bookings, cars, memberCars, services,
    updateMember, updateMemberStatus, deleteMember,
    upsertCar, addCarToMember, updateMemberCarPlate, removeCarFromMember, getCarsForMember,
    getRecurringSchedulesForMember, addRecurringSchedule,
    updateRecurringSchedule, deleteRecurringSchedule, generateRecurringBookings,
    showToast, can,
  } = useApp();

  const canManage = can('members.manage');

  const [editOpen, setEditOpen]             = useState(false);
  const [editSaving, setEditSaving]         = useState(false);
  const [bookingTab, setBookingTab]         = useState('all');
  const [bookingPage, setBookingPage]       = useState(1);
  const [confirmDelete, setConfirmDelete]   = useState(false);
  const [scheduleModal, setScheduleModal]   = useState(null); // null | { mode:'add'|'edit', schedule? }
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [generating, setGenerating]         = useState(false);
  const [generateResult, setGenerateResult] = useState(null); // null | { created, skipped }

  const member = useMemo(() => members.find((m) => m.id === memberId) ?? null, [members, memberId]);
  const status = statusOf(member);
  const ownedCars = useMemo(() => (member ? getCarsForMember(member.id) : []), [member, getCarsForMember]);
  const memberSchedules = useMemo(() => (member ? getRecurringSchedulesForMember(member.id) : []), [member, getRecurringSchedulesForMember]);

  const memberBookings = useMemo(() => {
    if (!member?.email) return [];
    const key = member.email.trim().toLowerCase();
    return bookings
      .filter((b) => (b.email || '').trim().toLowerCase() === key)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [member, bookings]);

  const stats = useMemo(() => {
    const confirmed  = memberBookings.filter((b) => b.status === 'confirmed').length;
    const completed  = memberBookings.filter((b) => b.status === 'completed').length;
    const cancelled  = memberBookings.filter((b) => b.status === 'cancelled').length;
    const no_show    = memberBookings.filter((b) => b.status === 'no_show').length;
    const spent      = memberBookings.filter((b) => !['cancelled'].includes(b.status)).reduce((s, b) => s + (b.servicePrice ?? 0), 0);
    return { total: memberBookings.length, confirmed, completed, cancelled, no_show, spent };
  }, [memberBookings]);

  const filteredBookings = useMemo(() => {
    if (bookingTab === 'all') return memberBookings;
    return memberBookings.filter((b) => b.status === bookingTab);
  }, [memberBookings, bookingTab]);

  const totalBookingPages = Math.max(1, Math.ceil(filteredBookings.length / PAGE_SIZE));
  const safePage = Math.min(bookingPage, totalBookingPages);
  const pagedBookings = filteredBookings.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const decide = async (newStatus) => {
    if (!member) return;
    const result = await updateMemberStatus(member.id, newStatus);
    if (result?.error) { showToast(result.error, 'error'); return; }
    if ((newStatus === 'approved' || newStatus === 'rejected') && member.email) {
      sendEmail(
        member.email,
        newStatus === 'approved' ? 'Your VIP membership has been approved' : 'Your membership application update',
        membershipStatusHtml(member, newStatus)
      );
    }
    showToast(newStatus === 'approved' ? `${member.name} approved.` : newStatus === 'rejected' ? `${member.name} rejected.` : `${member.name} reset to pending.`, newStatus === 'approved' ? 'success' : 'info');
  };

  const handleSaveEdit = async (fields) => {
    setEditSaving(true);
    const result = await updateMember(member.id, fields);
    setEditSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast('Member updated.', 'success');
    setEditOpen(false);
  };

  const handleDelete = async () => {
    const result = await deleteMember(member.id);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast('Member deleted.', 'success');
    router.push('/admin/members');
  };

  if (!member) {
    return (
      <AdminLayout title="Member Profile">
        <div className="text-center py-24 text-muted">Member not found.</div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Member Profile">
      {/* Back nav */}
      <button
        onClick={() => router.push('/admin/members')}
        className="inline-flex items-center gap-2 text-muted hover:text-gold text-sm mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Members
      </button>

      {/* Header */}
      <div className="glass-card rounded-md p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-gold" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-serif text-2xl text-cream">{member.name}</h1>
                {member.nickname && <span className="text-gold/80 font-sans text-base">"{member.nickname}"</span>}
                <StatusBadge status={status} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-muted">
                <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-gold" />{member.email}</span>
                <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-gold" />{member.phone}</span>
                <span className="font-mono">{member.id}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-gold" />Applied: {member.memberSince ? formatDateLong(member.memberSince.slice(0, 10)) : '—'}</span>
                {member.decidedAt && <span>Decided: {formatDateLong(member.decidedAt.slice(0, 10))}</span>}
              </div>
            </div>
          </div>

          {/* Actions */}
          {canManage && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {status !== 'approved' && (
                <button onClick={() => decide('approved')} title="Approve"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-success/40 text-success rounded-sm hover:bg-success/10 transition-colors">
                  <UserCheck className="w-3.5 h-3.5" />Approve
                </button>
              )}
              {status !== 'rejected' && (
                <button onClick={() => decide('rejected')} title={status === 'approved' ? 'Revoke' : 'Reject'}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-white/10 text-cream/70 rounded-sm hover:border-danger/40 hover:text-danger transition-colors">
                  <UserX className="w-3.5 h-3.5" />{status === 'approved' ? 'Revoke' : 'Reject'}
                </button>
              )}
              <button onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-white/10 text-cream/70 rounded-sm hover:border-gold/50 hover:text-gold transition-colors">
                <Pencil className="w-3.5 h-3.5" />Edit
              </button>
              <button onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border border-white/10 text-cream/70 rounded-sm hover:border-danger/40 hover:text-danger transition-colors">
                <Trash2 className="w-3.5 h-3.5" />Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total',     value: stats.total,                 color: 'text-cream' },
          { label: 'Confirmed', value: stats.confirmed,             color: 'text-success' },
          { label: 'Completed', value: stats.completed,             color: 'text-blue-400' },
          { label: 'Cancelled', value: stats.cancelled,             color: 'text-danger' },
          { label: 'No-show',   value: stats.no_show,               color: 'text-gold' },
          { label: 'Total Spent', value: formatCurrency(stats.spent), color: 'text-gold' },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-md px-4 py-3 text-center">
            <div className={`font-serif text-xl leading-none ${s.color}`}>{s.value}</div>
            <div className="text-[10px] text-muted uppercase tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Info + Fleet */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Contact info */}
        <div className="glass-card rounded-md p-5 space-y-3">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-1">Member Info</div>
          {[
            { icon: Crown,    label: 'Full Name',    value: member.name + (member.nickname ? ` "${member.nickname}"` : '') },
            { icon: Mail,     label: 'Email',        value: member.email },
            { icon: Phone,    label: 'Phone',        value: member.phone },
            { icon: Calendar, label: 'Applied',      value: member.memberSince ? formatDateLong(member.memberSince.slice(0, 10)) : '—' },
            { icon: CheckCircle2, label: 'Decided',  value: member.decidedAt ? formatDateLong(member.decidedAt.slice(0, 10)) : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <Icon className="w-3.5 h-3.5 text-gold mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
                <div className="text-sm text-cream break-words">{value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Car fleet */}
        <CarFleetPanel
          member={member}
          cars={cars}
          ownedCars={ownedCars}
          upsertCar={upsertCar}
          addCarToMember={addCarToMember}
          updateMemberCarPlate={updateMemberCarPlate}
          removeCarFromMember={removeCarFromMember}
          onViewCar={(carId) => router.push(`/admin/members/${member.id}/cars/${carId}`)}
          showToast={showToast}
          readOnly={!canManage}
        />
      </div>

      {/* Recurring Schedules */}
      <RecurringSchedulesSection
        member={member}
        schedules={memberSchedules}
        ownedCars={ownedCars}
        services={services}
        readOnly={!canManage}
        onAdd={() => setScheduleModal({ mode: 'add' })}
        onEdit={(s) => setScheduleModal({ mode: 'edit', schedule: s })}
        onDelete={async (id) => {
          const r = await deleteRecurringSchedule(id);
          if (r?.error) showToast(r.error, 'error');
          else showToast('Schedule removed.', 'info');
        }}
        onToggle={async (s) => {
          const r = await updateRecurringSchedule(s.id, { isActive: !s.isActive });
          if (r?.error) showToast(r.error, 'error');
        }}
        generating={generating}
        onGenerate={async (weeks) => {
          setGenerating(true);
          const result = await generateRecurringBookings(member.id, weeks);
          setGenerating(false);
          if (result?.error) { showToast(result.error, 'error'); return; }
          if (result?.empty) { showToast('No active recurring schedules to generate from.', 'info'); return; }
          setGenerateResult(result);
        }}
      />

      {/* Booking history */}
      <div className="glass-card rounded-md overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gold" />
            <span className="text-cream font-medium">Booking History</span>
            <span className="text-xs text-muted">({memberBookings.length})</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {BOOKING_TABS.map((t) => {
              const count = t.id === 'all' ? memberBookings.length : memberBookings.filter((b) => b.status === t.id).length;
              return (
                <button key={t.id} onClick={() => { setBookingTab(t.id); setBookingPage(1); }}
                  className={`px-3 py-1.5 text-[11px] uppercase tracking-widest rounded-sm border transition-all ${bookingTab === t.id ? 'bg-gold text-obsidian border-gold' : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'}`}>
                  {t.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium">Booking ID</th>
                <th className="px-4 py-3 font-medium">Date & Time</th>
                <th className="px-4 py-3 font-medium">Service</th>
                <th className="px-4 py-3 font-medium">Vehicle</th>
                <th className="px-4 py-3 font-medium">Coffee</th>
                <th className="px-4 py-3 font-medium text-right">Price</th>
                <th className="px-4 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {pagedBookings.map((b) => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-mono text-[11px] text-gold/80">{b.id}</td>
                  <td className="px-4 py-3">
                    <div className="text-cream text-xs">{formatDateShort(b.date)}</div>
                    <div className="text-muted text-[11px] flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{b.time}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream">{b.serviceName}</div>
                    <div className="text-muted text-xs">{b.serviceDuration}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-cream/85 text-xs flex items-center gap-1">
                      <Car className="w-3 h-3 text-gold shrink-0" />
                      {b.vehicleYear} {b.vehicle}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {b.coffeeOrder ? (
                      <div className="text-cream/70 text-xs flex items-center gap-1">
                        <Coffee className="w-3 h-3 text-gold shrink-0" />{b.coffeeOrder}
                      </div>
                    ) : <span className="text-muted text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-sm font-medium ${b.status === 'cancelled' ? 'line-through text-muted' : 'text-gold'}`}>
                      {formatCurrency(b.servicePrice)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <BookingStatusBadge status={b.status} />
                    {b.status === 'cancelled' && b.cancellationReason && (
                      <div className="text-[10px] text-danger/70 mt-1">{b.cancellationReason}</div>
                    )}
                  </td>
                </tr>
              ))}
              {pagedBookings.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted">
                    {memberBookings.length === 0 ? 'No bookings found for this member.' : 'No bookings in this category.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalBookingPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
            <span className="text-xs text-muted">
              Page <span className="text-cream">{safePage}</span> of <span className="text-cream">{totalBookingPages}</span>
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setBookingPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                aria-label="Previous" className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setBookingPage((p) => Math.min(totalBookingPages, p + 1))} disabled={safePage === totalBookingPages}
                aria-label="Next" className="w-8 h-8 flex items-center justify-center rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold disabled:opacity-30 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditMemberModal
          member={member}
          saving={editSaving}
          onSave={handleSaveEdit}
          onClose={() => setEditOpen(false)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div onClick={() => setConfirmDelete(false)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="glass-card gold-border rounded-md max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Delete this member?</h3>
                <p className="text-muted text-sm mt-1">This removes the application entirely. Past bookings are not affected.</p>
              </div>
              <button onClick={() => setConfirmDelete(false)} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-cream font-medium">{member.name}</div>
              <div className="text-sm text-muted">{member.email}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit schedule modal */}
      {scheduleModal && (
        <ScheduleModal
          mode={scheduleModal.mode}
          initial={scheduleModal.schedule}
          ownedCars={ownedCars}
          services={services}
          saving={scheduleSaving}
          onSave={async (fields) => {
            setScheduleSaving(true);
            let result;
            if (scheduleModal.mode === 'edit') {
              result = await updateRecurringSchedule(scheduleModal.schedule.id, fields);
            } else {
              result = await addRecurringSchedule({ ...fields, memberId: member.id });
            }
            setScheduleSaving(false);
            if (result?.error) { showToast(result.error, 'error'); return; }
            showToast(scheduleModal.mode === 'edit' ? 'Schedule updated.' : 'Schedule added.', 'success');
            setScheduleModal(null);
          }}
          onClose={() => setScheduleModal(null)}
        />
      )}

      {/* Generate result */}
      {generateResult && (
        <GenerateResultModal
          result={generateResult}
          onClose={() => setGenerateResult(null)}
        />
      )}
    </AdminLayout>
  );
}

// ---------------------------------------------------------------------------
// Day helpers
// ---------------------------------------------------------------------------
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKS_OPTIONS = [
  { value: 2, label: 'Next 2 weeks' },
  { value: 4, label: 'Next 4 weeks' },
  { value: 8, label: 'Next 8 weeks' },
];

// ---------------------------------------------------------------------------
// RecurringSchedulesSection
// ---------------------------------------------------------------------------
function RecurringSchedulesSection({ member, schedules, ownedCars, services, onAdd, onEdit, onDelete, onToggle, generating, onGenerate, readOnly = false }) {
  const [weeksAhead, setWeeksAhead] = useState(4);

  const activeCount = schedules.filter((s) => s.isActive).length;

  return (
    <div className="glass-card rounded-md overflow-hidden mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Repeat className="w-4 h-4 text-gold" />
          <span className="text-cream font-medium">Recurring Schedules</span>
          {schedules.length > 0 && (
            <span className="text-xs text-muted">({activeCount} active of {schedules.length})</span>
          )}
        </div>
        {!readOnly && (
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 text-xs text-gold hover:text-gold-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add schedule
          </button>
        )}
      </div>

      {schedules.length === 0 ? (
        <div className="px-5 py-10 text-center text-muted text-sm">
          No recurring schedules yet.{!readOnly && ' Add one to pre-book detailing slots for this member.'}
        </div>
      ) : (
        <div className="divide-y divide-white/5">
          {schedules.map((s) => {
            const car = ownedCars.find((c) => c.id === s.carId);
            const svc = services.find((sv) => sv.id === s.serviceId);
            return (
              <div key={s.id} className={`px-5 py-4 flex items-start gap-4 ${!s.isActive ? 'opacity-50' : ''}`}>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-cream font-medium text-sm">
                      {car ? `${car.year} ${car.make} ${car.model}` : 'Any car'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-sm bg-gold/10 text-gold uppercase tracking-widest">
                      Every {DAYS[s.dayOfWeek]}
                    </span>
                    {!s.isActive && (
                      <span className="text-[10px] px-2 py-0.5 rounded-sm bg-white/5 text-muted uppercase tracking-widest">Paused</span>
                    )}
                  </div>
                  <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-gold" />{s.preferredTime}</span>
                    <span className="flex items-center gap-1"><Car className="w-3 h-3 text-gold" />{svc?.name ?? `Service #${s.serviceId}`}</span>
                    {s.notes && <span className="italic text-muted/70">"{s.notes}"</span>}
                  </div>
                </div>
                {!readOnly && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => onToggle(s)} aria-label={s.isActive ? 'Pause' : 'Activate'}
                      title={s.isActive ? 'Pause' : 'Activate'}
                      className="p-1.5 text-cream/50 hover:text-gold transition-colors">
                      {s.isActive
                        ? <ToggleRight className="w-5 h-5 text-gold" />
                        : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button onClick={() => onEdit(s)} aria-label="Edit" title="Edit"
                      className="p-1.5 text-cream/50 hover:text-gold transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onDelete(s.id)} aria-label="Delete" title="Delete"
                      className="p-1.5 text-cream/50 hover:text-danger transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Generate bookings footer */}
      {!readOnly && activeCount > 0 && (
        <div className="px-5 py-4 border-t border-white/5 flex flex-wrap items-center gap-3">
          <RefreshCw className={`w-4 h-4 text-gold shrink-0 ${generating ? 'animate-spin' : ''}`} />
          <span className="text-sm text-cream/80">Generate bookings:</span>
          <div className="flex flex-wrap gap-2 flex-1">
            {WEEKS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onGenerate(opt.value)}
                disabled={generating}
                className="px-3 py-1.5 text-xs border border-white/10 text-cream/70 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {generating ? 'Generating…' : opt.label}
              </button>
            ))}
          </div>
          <p className="w-full text-[11px] text-muted leading-relaxed">
            Creates confirmed bookings for all active schedules. Already-booked slots are skipped automatically.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScheduleModal — add or edit a recurring schedule
// ---------------------------------------------------------------------------
const DAY_OPTS = DAYS.map((d, i) => ({ value: i, label: d }));

function ScheduleModal({ mode, initial, ownedCars, services, saving, onSave, onClose }) {
  const [form, setForm] = useState({
    carId:         initial?.carId         ?? (ownedCars[0]?.id ?? ''),
    serviceId:     initial?.serviceId     ?? (services[0]?.id  ?? ''),
    dayOfWeek:     initial?.dayOfWeek     ?? 1,
    preferredTime: initial?.preferredTime ?? '9:00 AM',
    isActive:      initial?.isActive      ?? true,
    notes:         initial?.notes         ?? '',
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Convert HH:MM time input → "9:00 AM" format
  const fromTimeInput = (val) => {
    if (!val) return '';
    const [h, m] = val.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour   = h % 12 || 12;
    // Snap to the 30-min grid — recurring bookings share the same bucketed
    // capacity model, so an off-grid preferred time must pin to a slot.
    return snapTimeToGrid(`${hour}:${String(m).padStart(2, '0')} ${period}`);
  };

  // Convert "9:00 AM" → "09:00" for input value
  const toTimeInput = (str) => {
    if (!str) return '';
    const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!match) return '';
    let h = parseInt(match[1], 10);
    const m = match[2];
    const p = match[3].toUpperCase();
    if (p === 'PM' && h !== 12) h += 12;
    if (p === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2, '0')}:${m}`;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.serviceId) return;
    onSave({
      carId:         form.carId || null,
      serviceId:     Number(form.serviceId),
      dayOfWeek:     Number(form.dayOfWeek),
      preferredTime: form.preferredTime,
      isActive:      form.isActive,
      notes:         form.notes.trim() || null,
    });
  };

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md w-full max-w-md p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-serif text-2xl text-cream">
              {mode === 'edit' ? 'Edit Schedule' : 'Add Recurring Schedule'}
            </h3>
            <p className="text-xs text-muted mt-0.5">Bookings are generated manually from the profile page.</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Car */}
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Vehicle</div>
            <select value={form.carId} onChange={(e) => set('carId', e.target.value)}
              className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]">
              <option value="">— No specific car —</option>
              {ownedCars.map((c, i) => (
                <option key={c.id} value={c.id}>
                  {c.year} {c.make} {c.model} ({c.size}){i === 0 ? ' — default' : ''}
                </option>
              ))}
            </select>
          </label>

          {/* Service */}
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Service Package *</div>
            <select required value={form.serviceId} onChange={(e) => set('serviceId', e.target.value)}
              className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]">
              <option value="">Choose a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>

          {/* Day + Time */}
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Day of Week *</div>
              <select value={form.dayOfWeek} onChange={(e) => set('dayOfWeek', Number(e.target.value))}
                className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]">
                {DAY_OPTS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Preferred Time *</div>
              <input type="time" required min="07:00" max="17:00" step={1800}
                value={toTimeInput(form.preferredTime)}
                onChange={(e) => set('preferredTime', fromTimeInput(e.target.value))}
                className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors [color-scheme:dark]" />
            </label>
          </div>

          {/* Notes */}
          <label className="block">
            <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Notes (optional)</div>
            <input type="text" value={form.notes} onChange={(e) => set('notes', e.target.value)}
              placeholder="e.g. Full detail, check undercarriage"
              className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors" />
          </label>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => set('isActive', !form.isActive)}
              className={`w-10 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${form.isActive ? 'bg-gold' : 'bg-white/10'}`}>
              <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <div>
              <div className="text-sm text-cream">Active</div>
              <div className="text-xs text-muted">Inactive schedules are excluded from booking generation.</div>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-white/5">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <><Check className="w-4 h-4" />{mode === 'edit' ? 'Save Changes' : 'Add Schedule'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GenerateResultModal
// ---------------------------------------------------------------------------
function GenerateResultModal({ result, onClose }) {
  const { created, skipped } = result;
  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in overflow-y-auto">
      <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md w-full max-w-lg p-6 my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-serif text-2xl text-cream">Bookings Generated</h3>
          <button onClick={onClose} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="bg-success/10 border border-success/20 rounded-sm px-4 py-3 text-center">
            <div className="font-serif text-3xl text-success">{created.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted mt-1">Created</div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-sm px-4 py-3 text-center">
            <div className="font-serif text-3xl text-cream/60">{skipped.length}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted mt-1">Skipped</div>
          </div>
        </div>

        {created.length > 0 && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest text-success mb-2">Created bookings</div>
            <ul className="space-y-1 max-h-48 overflow-y-auto">
              {created.map((c, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-cream/80 bg-success/5 border border-success/10 rounded-sm px-3 py-2">
                  <Check className="w-3 h-3 text-success shrink-0" />
                  <span className="font-mono text-success/80">{c.date}</span>
                  <span className="text-muted">·</span>
                  <span>{c.car}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">{c.service}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {skipped.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-2">Skipped</div>
            <ul className="space-y-1 max-h-36 overflow-y-auto">
              {skipped.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-muted bg-white/5 border border-white/5 rounded-sm px-3 py-2">
                  <X className="w-3 h-3 text-danger/60 shrink-0" />
                  <span className="font-mono">{s.date}</span>
                  <span>·</span>
                  <span>{s.car}</span>
                  <span className="text-danger/60">— {s.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onClose}
          className="w-full px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors">
          Done
        </button>
      </div>
    </div>
  );
}

export default function MemberDetailPage() {
  return (
    <ProtectedRoute permission="members.view">
      <MemberDetailContent />
    </ProtectedRoute>
  );
}
