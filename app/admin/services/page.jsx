'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  GripVertical,
  Users,
  Clock,
  Tag,
  ChevronDown,
  ChevronUp,
  Check,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  duration: '',
  category: '',
  popular: false,
  minDetailers: 1,
  recommendedDetailers: 1,
  inclusions: [''],
};

function FormField({ label, children, error, hint }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">{label}</div>
      {children}
      {hint && !error && <div className="text-[11px] text-muted mt-1">{hint}</div>}
      {error && <div className="text-[11px] text-danger mt-1">{error}</div>}
    </label>
  );
}

function ServiceForm({ initial, onSave, onCancel, isSaving, categories }) {
  const defaultCategory = categories[0]?.slug ?? '';

  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    category: defaultCategory,
    ...initial,
    inclusions: initial?.inclusions?.length ? [...initial.inclusions] : [''],
  }));
  const [errors, setErrors] = useState({});

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const setInclusion = (i, val) =>
    setForm((f) => {
      const inc = [...f.inclusions];
      inc[i] = val;
      return { ...f, inclusions: inc };
    });

  const addInclusion = () =>
    setForm((f) => ({ ...f, inclusions: [...f.inclusions, ''] }));

  const removeInclusion = (i) =>
    setForm((f) => ({
      ...f,
      inclusions: f.inclusions.filter((_, idx) => idx !== i),
    }));

  const moveInclusion = (i, dir) =>
    setForm((f) => {
      const inc = [...f.inclusions];
      const j = i + dir;
      if (j < 0 || j >= inc.length) return f;
      [inc[i], inc[j]] = [inc[j], inc[i]];
      return { ...f, inclusions: inc };
    });

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) <= 0)
      e.price = 'Must be a positive number';
    if (!form.duration.trim()) e.duration = 'Required';
    if (Number(form.minDetailers) < 1) e.minDetailers = 'Min 1';
    if (Number(form.recommendedDetailers) < Number(form.minDetailers))
      e.recommendedDetailers = 'Must be ≥ min detailers';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      price: Number(form.price),
      minDetailers: Number(form.minDetailers),
      recommendedDetailers: Number(form.recommendedDetailers),
      inclusions: form.inclusions.filter((s) => s.trim()),
    });
  };

  const isEdit = Boolean(initial?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="grid md:grid-cols-2 gap-4">
        <FormField label="Service Name *" error={errors.name}>
          <input
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="admin-input"
            placeholder="The Essential"
          />
        </FormField>

        <FormField label="Description" hint="Short tagline shown on the public services page">
          <textarea
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            className="admin-input resize-none"
            rows={2}
            placeholder="A thorough exterior refresh to keep your ride looking sharp."
          />
        </FormField>

        <FormField label="Price (₱) *" error={errors.price}>
          <input
            type="number"
            min="1"
            value={form.price}
            onChange={(e) => set('price', e.target.value)}
            className="admin-input"
            placeholder="1500"
          />
        </FormField>

        <FormField label="Duration *" error={errors.duration}
          hint="e.g. 2–3 hrs, 1–2 days">
          <input
            type="text"
            value={form.duration}
            onChange={(e) => set('duration', e.target.value)}
            className="admin-input"
            placeholder="2–3 hrs"
          />
        </FormField>

        <FormField label="Category *">
          <div className="relative">
            <select
              value={form.category}
              onChange={(e) => set('category', e.target.value)}
              className="admin-input appearance-none pr-9"
            >
              {categories.length === 0 && (
                <option value="">No categories — add one first</option>
              )}
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          </div>
        </FormField>

        <FormField label="Min Detailers *" error={errors.minDetailers}>
          <input
            type="number"
            min="1"
            value={form.minDetailers}
            onChange={(e) => set('minDetailers', e.target.value)}
            className="admin-input"
          />
        </FormField>

        <FormField label="Recommended Detailers *" error={errors.recommendedDetailers}>
          <input
            type="number"
            min="1"
            value={form.recommendedDetailers}
            onChange={(e) => set('recommendedDetailers', e.target.value)}
            className="admin-input"
          />
        </FormField>
      </div>

      {/* Popular toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => set('popular', !form.popular)}
          className={`w-10 h-6 rounded-full transition-colors relative overflow-hidden shrink-0 ${
            form.popular ? 'bg-gold' : 'bg-white/10'
          }`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            form.popular ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
        <div>
          <div className="text-sm text-cream">Mark as Popular</div>
          <div className="text-xs text-muted">Shows a &quot;Popular&quot; badge on the public site</div>
        </div>
      </div>

      {/* Inclusions */}
      <div>
        <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-3">
          What&apos;s Included
        </div>
        <div className="space-y-2">
          {form.inclusions.map((inc, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex flex-col gap-0.5">
                <button type="button" onClick={() => moveInclusion(i, -1)} disabled={i === 0}
                  className="text-muted hover:text-cream disabled:opacity-20 transition-colors">
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button type="button" onClick={() => moveInclusion(i, 1)} disabled={i === form.inclusions.length - 1}
                  className="text-muted hover:text-cream disabled:opacity-20 transition-colors">
                  <ChevronDown className="w-3 h-3" />
                </button>
              </div>
              <input
                type="text"
                value={inc}
                onChange={(e) => setInclusion(i, e.target.value)}
                placeholder={`Inclusion ${i + 1}`}
                className="admin-input flex-1"
              />
              <button type="button" onClick={() => removeInclusion(i)}
                disabled={form.inclusions.length === 1}
                aria-label="Remove inclusion"
                className="p-2 text-muted hover:text-danger disabled:opacity-20 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addInclusion}
          className="mt-3 text-xs text-gold hover:text-gold-light flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add inclusion
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-white/5">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {isSaving ? (
            'Saving…'
          ) : (
            <>
              <Check className="w-4 h-4" />
              {isEdit ? 'Save Changes' : 'Add Service'}
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
        .admin-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </form>
  );
}

function ServicesAdmin() {
  const { services, upsertService, reorderServices, deleteService, serviceCategories, showToast } = useApp();

  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [query, setQuery] = useState('');
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragFromIdx = useRef(null);

  const sorted = useMemo(
    () => [...services].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [services]
  );

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.category || '').toLowerCase().includes(q) ||
        (catMap[s.category]?.name || '').toLowerCase().includes(q)
    );
  }, [sorted, query, catMap]);

  const getCatColor = (slug) => catMap[slug]?.color ?? 'bg-white/10 text-cream';

  const isSearching = query.trim() !== '';

  const handleReorder = useCallback(async (fromIdx, toIdx) => {
    if (fromIdx === toIdx || isSearching || reordering) return;
    const reordered = [...sorted];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setReordering(true);
    const result = await reorderServices(reordered.map((s) => s.id));
    setReordering(false);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Service order saved.', 'success');
  }, [sorted, isSearching, reordering, reorderServices, showToast]);

  const openAdd = () => setModal({ mode: 'add' });
  const openEdit = (svc) => setModal({ mode: 'edit', service: svc });
  const closeModal = () => setModal(null);

  const handleSave = async (data) => {
    setSaving(true);
    const result = await upsertService(modal?.mode === 'edit' ? { ...data, id: modal.service.id } : data);
    setSaving(false);
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(modal?.mode === 'edit' ? 'Service updated.' : 'Service added.', 'success');
    closeModal();
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteService(confirmDelete.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`"${confirmDelete.name}" deleted.`, 'success');
    setConfirmDelete(null);
  };

  return (
    <AdminLayout title="Services">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services…"
            className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-9 pr-3 text-sm text-cream placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-3 sm:ml-auto">
          {/* <div className="text-sm text-muted whitespace-nowrap">
            <span className="text-cream">{filtered.length}</span>
            {query ? ` of ${services.length}` : ''} service{services.length !== 1 ? 's' : ''}
          </div> */}
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </button>
        </div>
      </div>

      {/* Reorder hint */}
      {isSearching && (
        <p className="text-[11px] text-muted mb-4 flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3 text-gold/70 shrink-0" />
          Clear search to drag or reorder services.
        </p>
      )}

      {/* Service cards */}
      {filtered.length === 0 ? (
        <div className="glass-card rounded-md py-20 text-center text-muted">
          {query ? `No services match "${query}".` : 'No services yet. Add your first service package.'}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((svc, idx) => (
            <div
              key={svc.id}
              draggable={!isSearching && !reordering}
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
              className={`glass-card rounded-md p-5 flex flex-col gap-4 transition-all ${
                draggedIdx === idx ? 'opacity-40 scale-[0.98]' : ''
              } ${dragOverIdx === idx && draggedIdx !== idx ? 'ring-1 ring-gold' : ''}`}
            >
              {/* Top */}
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  aria-label="Drag to reorder"
                  disabled={isSearching || reordering}
                  className={`mt-1 shrink-0 transition-colors ${
                    isSearching || reordering
                      ? 'text-muted/20 cursor-not-allowed'
                      : 'text-muted/50 hover:text-gold cursor-grab active:cursor-grabbing'
                  }`}
                >
                  <GripVertical className="w-4 h-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${getCatColor(svc.category)}`}>
                      {catMap[svc.category]?.name ?? svc.category}
                    </span>
                    {svc.popular && (
                      <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm bg-gold/15 text-gold flex items-center gap-1">
                        <Star className="w-2.5 h-2.5" />
                        Popular
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-xl text-cream mt-1 leading-tight">{svc.name}</h3>
                </div>
                <div className="text-[10px] text-muted font-mono bg-white/5 rounded-sm px-1.5 py-0.5 shrink-0">
                  ID {svc.id}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-white/[0.03] rounded-sm py-2">
                  <div className="text-gold font-semibold">{formatCurrency(svc.price)}</div>
                  <div className="text-muted text-[10px] mt-0.5">Price</div>
                </div>
                <div className="bg-white/[0.03] rounded-sm py-2 flex flex-col items-center">
                  <div className="text-cream flex items-center gap-1">
                    <Clock className="w-3 h-3 text-gold" />
                    {svc.duration}
                  </div>
                  <div className="text-muted text-[10px] mt-0.5">Duration</div>
                </div>
                <div className="bg-white/[0.03] rounded-sm py-2 flex flex-col items-center">
                  <div className="text-cream flex items-center gap-1">
                    <Users className="w-3 h-3 text-gold" />
                    {svc.minDetailers}–{svc.recommendedDetailers}
                  </div>
                  <div className="text-muted text-[10px] mt-0.5">Detailers</div>
                </div>
              </div>

              {/* Inclusions */}
              {svc.inclusions?.length > 0 && (
                <ul className="space-y-1.5">
                  {svc.inclusions.map((inc, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-cream/75">
                      <Tag className="w-3 h-3 text-gold/60 shrink-0 mt-0.5" />
                      {inc}
                    </li>
                  ))}
                </ul>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-auto pt-2 border-t border-white/5">
                <button
                  onClick={() => handleReorder(idx, idx - 1)}
                  disabled={idx === 0 || isSearching || reordering}
                  aria-label="Move up"
                  className="px-2.5 py-2 text-xs border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleReorder(idx, idx + 1)}
                  disabled={idx === filtered.length - 1 || isSearching || reordering}
                  aria-label="Move down"
                  className="px-2.5 py-2 text-xs border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => openEdit(svc)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => setConfirmDelete(svc)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs border border-white/10 text-cream/80 rounded-sm hover:border-danger/50 hover:text-danger transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div
          onClick={closeModal}
          className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-5 pt-16 animate-fade-in overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-md w-full max-w-2xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-2xl text-cream">
                {modal.mode === 'edit' ? `Edit "${modal.service.name}"` : 'Add New Service'}
              </h3>
              <button onClick={closeModal} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <ServiceForm
              initial={modal.mode === 'edit' ? modal.service : undefined}
              onSave={handleSave}
              onCancel={closeModal}
              isSaving={saving}
              categories={serviceCategories}
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
            className="glass-card rounded-md max-w-md w-full p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">Delete service?</h3>
                <p className="text-muted text-sm mt-1">
                  This removes the service from the catalog. Existing bookings that reference it are not affected.
                </p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 space-y-1">
              <div className="text-cream font-medium">{confirmDelete.name}</div>
              <div className="text-sm text-muted">
                {formatCurrency(confirmDelete.price)} &middot; {confirmDelete.duration} &middot; {confirmDelete.category}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2.5 bg-danger text-white rounded-sm hover:bg-danger/90 transition-colors inline-flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminServicesPage() {
  return (
    <ProtectedRoute>
      <ServicesAdmin />
    </ProtectedRoute>
  );
}
