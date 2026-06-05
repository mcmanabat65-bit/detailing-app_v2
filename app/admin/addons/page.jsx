'use client';

import { useMemo, useRef, useState } from 'react';
import { GripVertical, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';

const EMPTY = { name: '', defaultPrice: '' };

function AddonForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({ name: initial?.name ?? '', defaultPrice: initial?.defaultPrice ?? initial?.default_price ?? '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (form.defaultPrice === '' || isNaN(Number(form.defaultPrice)) || Number(form.defaultPrice) < 0)
      e.defaultPrice = 'Must be 0 or more';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ id: initial?.id, name: form.name.trim(), defaultPrice: Number(form.defaultPrice) });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-start">
      <div className="flex-1 space-y-1">
        <input
          autoFocus
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Headlight Restoration"
          className="w-full bg-surface/70 border border-white/[0.08] rounded-sm px-3 py-2.5 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
        />
        {errors.name && <div className="text-[11px] text-danger">{errors.name}</div>}
      </div>
      <div className="w-full sm:w-36 space-y-1">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">₱</span>
          <input
            type="number"
            min="0"
            value={form.defaultPrice}
            onChange={(e) => set('defaultPrice', e.target.value)}
            placeholder="0"
            className="w-full bg-surface/70 border border-white/[0.08] rounded-sm pl-7 pr-3 py-2.5 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        {errors.defaultPrice && <div className="text-[11px] text-danger">{errors.defaultPrice}</div>}
      </div>
      <div className="flex gap-2 shrink-0">
        <button type="button" onClick={onCancel}
          className="px-3 py-2.5 border border-white/10 text-cream/70 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm">
          Cancel
        </button>
        <button type="submit" disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 text-sm">
          <Save className="w-3.5 h-3.5" />
          {isSaving ? 'Saving…' : initial?.id ? 'Save' : 'Add'}
        </button>
      </div>
    </form>
  );
}

function AddonsAdmin() {
  const { addonCatalog, upsertAddonCatalogItem, deleteAddonCatalogItem, reorderAddonCatalog, showToast } = useApp();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragFromIdx = useRef(null);

  const sorted = useMemo(() => [...addonCatalog].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [addonCatalog]);

  const handleSave = async (data) => {
    setSaving(true);
    const result = await upsertAddonCatalogItem(data);
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(data.id ? 'Add-on updated.' : 'Add-on added.', 'success');
    setAdding(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteAddonCatalogItem(confirmDelete.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`"${confirmDelete.name}" removed.`, 'info');
    setConfirmDelete(null);
  };

  const handleReorder = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const result = await reorderAddonCatalog(reordered.map((i) => i.id));
    if (result?.error) showToast(result.error, 'error');
  };

  return (
    <AdminLayout title="Add-Ons">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted text-sm max-w-lg">
          Quick-pick catalog of common extras. When adding add-ons to a booking, these appear as one-click options — the admin can also enter free-form items on the spot.
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors shrink-0">
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        )}
      </div>

      {adding && (
        <div className="glass-card rounded-md p-5 mb-4">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-3">New add-on</div>
          <AddonForm onSave={handleSave} onCancel={() => setAdding(false)} isSaving={saving} />
        </div>
      )}

      <div className="glass-card rounded-md overflow-hidden">
        {sorted.length === 0 ? (
          <div className="py-20 text-center text-muted">
            No add-ons yet — add your first quick-pick item.
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {sorted.map((item, idx) => (
              editing?.id === item.id ? (
                <li key={item.id} className="px-5 py-4">
                  <AddonForm
                    initial={item}
                    onSave={handleSave}
                    onCancel={() => setEditing(null)}
                    isSaving={saving}
                  />
                </li>
              ) : (
                <li
                  key={item.id}
                  draggable
                  onDragStart={() => { dragFromIdx.current = idx; setDraggedIdx(idx); }}
                  onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); dragFromIdx.current = null; }}
                  onDragOver={(e) => { e.preventDefault(); if (dragFromIdx.current !== null) setDragOverIdx(idx); }}
                  onDragLeave={() => setDragOverIdx(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFromIdx.current !== null && dragFromIdx.current !== idx) handleReorder(dragFromIdx.current, idx);
                    dragFromIdx.current = null; setDraggedIdx(null); setDragOverIdx(null);
                  }}
                  className={`flex items-center gap-3 px-5 py-4 transition-all ${
                    draggedIdx === idx ? 'opacity-40 scale-[0.98]' : ''
                  } ${dragOverIdx === idx && draggedIdx !== idx ? 'ring-1 ring-inset ring-gold' : ''}`}
                >
                  <button type="button" aria-label="Drag to reorder"
                    className="text-muted/40 hover:text-gold cursor-grab active:cursor-grabbing transition-colors shrink-0">
                    <GripVertical className="w-4 h-4" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-cream font-medium">{item.name}</div>
                  </div>
                  <div className="text-gold font-medium text-sm shrink-0">
                    {formatCurrency(item.defaultPrice ?? 0)}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditing(item)} aria-label="Edit"
                      className="p-2 text-cream/60 hover:text-gold hover:bg-gold/10 rounded-sm transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setConfirmDelete(item)} aria-label="Delete"
                      className="p-2 text-cream/60 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              )
            ))}
          </ul>
        )}
      </div>

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="glass-card rounded-md max-w-sm w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-xl text-cream">Remove add-on?</h3>
                <p className="text-muted text-sm mt-1">This only removes it from the quick-pick catalog. Existing bookings with this add-on are not affected.</p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-surface/60 rounded-sm px-4 py-3 mb-5 border border-white/5">
              <div className="text-cream font-medium">{confirmDelete.name}</div>
              <div className="text-sm text-gold">{formatCurrency(confirmDelete.defaultPrice ?? 0)}</div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2">
                <Trash2 className="w-4 h-4" />Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminAddonsPage() {
  return <ProtectedRoute><AddonsAdmin /></ProtectedRoute>;
}
