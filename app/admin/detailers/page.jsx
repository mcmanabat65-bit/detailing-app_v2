'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Pencil,
  Plus,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';

const ROLES = [
  'Detailer',
  'Senior Detailer',
  'Lead Detailer',
  'Paint Specialist',
  'Ceramic Coating Specialist',
  'Interior Specialist',
  'Shop Manager',
];

const EMPTY_FORM = { name: '', nickname: '', role: 'Detailer', isActive: true };

// ---------------------------------------------------------------------------
// Avatar — coloured circle with initials
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  'bg-blue-500/20 text-blue-300',
  'bg-purple-500/20 text-purple-300',
  'bg-gold/20 text-gold',
  'bg-green-500/20 text-green-300',
  'bg-pink-500/20 text-pink-300',
  'bg-orange-400/20 text-orange-300',
];

function Avatar({ name, size = 'md' }) {
  const initials = (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  const colorIdx = (name || '').charCodeAt(0) % AVATAR_COLORS.length;
  const dim = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-10 h-10 text-sm';
  return (
    <div className={`${dim} rounded-full flex items-center justify-center font-semibold shrink-0 ${AVATAR_COLORS[colorIdx]}`}>
      {initials}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add / Edit modal form
// ---------------------------------------------------------------------------
function DetailerForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, ...initial }));
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.role.trim()) e.role = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, name: form.name.trim(), nickname: form.nickname.trim() });
  };

  const isEdit = Boolean(initial?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Preview avatar */}
      <div className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-sm">
        <Avatar name={form.name || '?'} size="lg" />
        <div>
          <div className="text-cream font-medium">{form.name || 'New Detailer'}</div>
          {form.nickname && (
            <div className="text-muted text-sm">"{form.nickname}"</div>
          )}
          <div className="text-gold/80 text-xs mt-0.5">{form.role}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Full name */}
        <label className="block md:col-span-2">
          <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
            Full Name *
          </div>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="admin-input"
            placeholder="Juan dela Cruz"
          />
          {errors.name && (
            <div className="text-[11px] text-danger mt-1">{errors.name}</div>
          )}
        </label>

        {/* Nickname */}
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
            Nickname <span className="text-muted normal-case tracking-normal">(optional)</span>
          </div>
          <input
            type="text"
            value={form.nickname}
            onChange={(e) => set('nickname', e.target.value)}
            className="admin-input"
            placeholder="Kuya Juan"
          />
        </label>

        {/* Role */}
        <label className="block">
          <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
            Role / Specialty *
          </div>
          <select
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            className="admin-input"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
          {errors.role && (
            <div className="text-[11px] text-danger mt-1">{errors.role}</div>
          )}
        </label>
      </div>

      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <button
          type="button"
          onClick={() => set('isActive', !form.isActive)}
          className={`relative w-11 h-6 rounded-full transition-colors overflow-hidden ${form.isActive ? 'bg-gold' : 'bg-white/10'}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
        <span className="text-sm text-cream">
          {form.isActive ? 'Active — available for scheduling' : 'Inactive — not shown in scheduling'}
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-white/20 transition-colors text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 text-sm"
        >
          {isSaving ? 'Saving…' : (
            <>
              <Check className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Add Detailer'}
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .admin-input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 10px 12px;
          color: var(--color-cream);
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .admin-input:focus {
          outline: none;
          border-color: rgba(201, 168, 76, 0.5);
        }
        .admin-input option {
          background: #141416;
        }
      `}</style>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
function DetailersAdmin() {
  const { detailers, upsertDetailer, deleteDetailer, showToast } = useApp();

  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragFromIdx = useRef(null);

  const sorted = useMemo(
    () => [...detailers].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [detailers]
  );

  const active = sorted.filter((d) => d.isActive !== false);
  const inactive = sorted.filter((d) => d.isActive === false);

  // Reorder via drag or arrow buttons — reassigns sort_order 1…N
  const handleReorder = useCallback(async (fromIdx, toIdx) => {
    if (fromIdx === toIdx || reordering) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setReordering(true);
    const results = await Promise.all(
      reordered.map((d, i) =>
        d.sortOrder !== i + 1
          ? upsertDetailer({ ...d, sortOrder: i + 1 })
          : Promise.resolve({ ok: true })
      )
    );
    setReordering(false);
    const failed = results.find((r) => r?.error);
    if (failed) showToast(failed.error, 'error');
    else showToast('Order saved.', 'success');
  }, [sorted, reordering, upsertDetailer, showToast]);

  const handleToggleActive = async (detailer) => {
    const result = await upsertDetailer({ ...detailer, isActive: !detailer.isActive });
    if (result?.error) showToast(result.error, 'error');
    else showToast(detailer.isActive ? `${detailer.name} set to inactive.` : `${detailer.name} set to active.`, 'success');
  };

  const handleSave = async (data) => {
    setSaving(true);
    const result = await upsertDetailer({
      ...data,
      sortOrder: modal?.detailer?.sortOrder ?? sorted.length + 1,
    });
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(modal?.mode === 'edit' ? 'Detailer updated.' : 'Detailer added.', 'success');
    setModal(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteDetailer(confirmDelete.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`${confirmDelete.name} removed.`, 'success');
    setConfirmDelete(null);
  };

  const renderCard = (detailer, idx) => (
    <div
      key={detailer.id}
      draggable={!reordering}
      onDragStart={() => { dragFromIdx.current = idx; setDraggedIdx(idx); }}
      onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); dragFromIdx.current = null; }}
      onDragOver={(e) => { e.preventDefault(); if (dragFromIdx.current !== null) setDragOverIdx(idx); }}
      onDragLeave={() => setDragOverIdx(null)}
      onDrop={(e) => {
        e.preventDefault();
        if (dragFromIdx.current !== null && dragFromIdx.current !== idx) {
          handleReorder(dragFromIdx.current, idx);
        }
        dragFromIdx.current = null;
        setDraggedIdx(null);
        setDragOverIdx(null);
      }}
      className={`glass-card rounded-md p-4 flex items-center gap-4 transition-all ${
        draggedIdx === idx ? 'opacity-40 scale-[0.98]' : ''
      } ${dragOverIdx === idx && draggedIdx !== idx ? 'ring-1 ring-gold' : ''}`}
    >
      {/* Grip */}
      <button
        type="button"
        disabled={reordering}
        aria-label="Drag to reorder"
        className={`shrink-0 transition-colors ${reordering ? 'text-muted/20 cursor-not-allowed' : 'text-muted/40 hover:text-gold cursor-grab active:cursor-grabbing'}`}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Avatar */}
      <Avatar name={detailer.name} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-cream font-medium truncate">{detailer.name}</span>
          {detailer.nickname && (
            <span className="text-muted text-xs">"{detailer.nickname}"</span>
          )}
          {detailer.isActive === false && (
            <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded-sm bg-white/5 text-muted">
              Inactive
            </span>
          )}
        </div>
        <div className="text-gold/80 text-xs mt-0.5">{detailer.role}</div>
      </div>

      {/* Arrow reorder buttons */}
      <div className="hidden sm:flex flex-col gap-1">
        <button
          onClick={() => handleReorder(idx, idx - 1)}
          disabled={idx === 0 || reordering}
          aria-label="Move up"
          className="p-1 text-muted/40 hover:text-gold transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => handleReorder(idx, idx + 1)}
          disabled={idx === sorted.length - 1 || reordering}
          aria-label="Move down"
          className="p-1 text-muted/40 hover:text-gold transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => handleToggleActive(detailer)}
          aria-label={detailer.isActive !== false ? 'Set inactive' : 'Set active'}
          title={detailer.isActive !== false ? 'Set inactive' : 'Set active'}
          className={`p-2 rounded-sm border transition-colors ${
            detailer.isActive !== false
              ? 'border-white/10 text-[var(--color-success)] hover:border-danger/50 hover:text-danger'
              : 'border-white/10 text-muted hover:border-gold/50 hover:text-gold'
          }`}
        >
          {detailer.isActive !== false
            ? <UserCheck className="w-3.5 h-3.5" />
            : <UserX className="w-3.5 h-3.5" />
          }
        </button>
        <button
          onClick={() => setModal({ mode: 'edit', detailer })}
          aria-label="Edit"
          className="p-2 rounded-sm border border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setConfirmDelete(detailer)}
          aria-label="Delete"
          className="p-2 rounded-sm border border-white/10 text-cream/70 hover:border-danger/50 hover:text-danger transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout title="Detailers">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div className="text-muted text-sm">
          <span className="text-cream">{active.length}</span> active
          {inactive.length > 0 && (
            <>, <span className="text-cream">{inactive.length}</span> inactive</>
          )}
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Detailer
        </button>
      </div>

      {/* Active detailers */}
      {sorted.length === 0 ? (
        <div className="glass-card rounded-md py-20 text-center text-muted">
          No detailers yet. Add your first team member.
        </div>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
                Active ({active.length})
              </div>
              <div className="space-y-2">
                {sorted
                  .map((d, i) => ({ d, i }))
                  .filter(({ d }) => d.isActive !== false)
                  .map(({ d, i }) => renderCard(d, i))}
              </div>
            </section>
          )}

          {inactive.length > 0 && (
            <section>
              <div className="text-[10px] uppercase tracking-widest text-muted mb-3">
                Inactive ({inactive.length})
              </div>
              <div className="space-y-2 opacity-60">
                {sorted
                  .map((d, i) => ({ d, i }))
                  .filter(({ d }) => d.isActive === false)
                  .map(({ d, i }) => renderCard(d, i))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-5 pt-16 overflow-y-auto animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-md w-full max-w-lg p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-2xl text-cream">
                {modal.mode === 'edit' ? `Edit "${modal.detailer.name}"` : 'Add Detailer'}
              </h3>
              <button onClick={() => setModal(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <DetailerForm
              initial={modal.mode === 'edit' ? modal.detailer : undefined}
              onSave={handleSave}
              onCancel={() => setModal(null)}
              isSaving={saving}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          onClick={() => setConfirmDelete(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-md max-w-sm w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Remove detailer?</h3>
                <p className="text-muted text-sm mt-1">
                  <span className="text-cream">{confirmDelete.name}</span> will be removed from the team roster.
                </p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream ml-4">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-white/20 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-danger text-white font-semibold rounded-sm hover:bg-danger/80 transition-colors text-sm"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function DetailersPage() {
  return (
    <ProtectedRoute permission="detailers.manage">
      <DetailersAdmin />
    </ProtectedRoute>
  );
}
