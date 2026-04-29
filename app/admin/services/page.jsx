'use client';

import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/data/services';

const CATEGORIES = ['exterior', 'full', 'premium', 'specialty', 'interior'];

const CATEGORY_COLORS = {
  exterior:  'bg-blue-500/15 text-blue-400',
  full:      'bg-success/15 text-success',
  premium:   'bg-purple-500/15 text-purple-400',
  specialty: 'bg-gold/15 text-gold',
  interior:  'bg-orange-400/15 text-orange-300',
};

const EMPTY_FORM = {
  id: '',
  name: '',
  price: '',
  duration: '',
  category: 'exterior',
  popular: false,
  minDetailers: 1,
  recommendedDetailers: 1,
  sortOrder: 0,
  inclusions: [''],
};

function ServiceForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
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
    if (!form.id || isNaN(Number(form.id)) || Number(form.id) <= 0)
      e.id = 'Must be a positive integer';
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
      id: Number(form.id),
      price: Number(form.price),
      minDetailers: Number(form.minDetailers),
      recommendedDetailers: Number(form.recommendedDetailers),
      sortOrder: Number(form.sortOrder) || 0,
      inclusions: form.inclusions.filter((s) => s.trim()),
    });
  };

  const isEdit = Boolean(initial?.id);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="grid md:grid-cols-2 gap-4">
        <FormField label="Service ID *" error={errors.id}
          hint={isEdit ? 'Cannot change ID of existing service' : 'Unique integer (e.g. 7)'}>
          <input
            type="number"
            min="1"
            value={form.id}
            onChange={(e) => set('id', e.target.value)}
            disabled={isEdit}
            className="admin-input disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="7"
          />
        </FormField>

        <FormField label="Service Name *" error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="admin-input"
            placeholder="The Essential"
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
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="admin-input"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Sort Order" hint="Lower = appears first">
          <input
            type="number"
            min="0"
            value={form.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
            className="admin-input"
          />
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
          className={`w-10 h-6 rounded-full transition-colors relative ${
            form.popular ? 'bg-gold' : 'bg-white/10'
          }`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
            form.popular ? 'translate-x-5' : 'translate-x-1'
          }`} />
        </button>
        <div>
          <div className="text-sm text-cream">Mark as Popular</div>
          <div className="text-xs text-muted">Shows a "Popular" badge on the public site</div>
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
    </form>
  );
}

function ServicesAdmin() {
  const { services, upsertService, deleteService, showToast } = useApp();

  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', service?: {} }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(
    () => [...services].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [services]
  );

  const openAdd = () => setModal({ mode: 'add' });
  const openEdit = (svc) => setModal({ mode: 'edit', service: svc });
  const closeModal = () => setModal(null);

  const handleSave = async (data) => {
    setSaving(true);
    const result = await upsertService(data);
    setSaving(false);
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(
      modal?.mode === 'edit' ? 'Service updated.' : 'Service added.',
      'success'
    );
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
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted">
          <span className="text-cream">{services.length}</span> service{services.length !== 1 ? 's' : ''} configured
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Service
        </button>
      </div>

      {/* Service cards */}
      {sorted.length === 0 ? (
        <div className="glass-card rounded-md py-20 text-center text-muted">
          No services yet. Add your first service package.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((svc) => (
            <div key={svc.id} className="glass-card rounded-md p-5 flex flex-col gap-4">
              {/* Top */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm ${CATEGORY_COLORS[svc.category] ?? 'bg-white/10 text-cream'}`}>
                      {svc.category}
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
          border-color: rgba(0, 112, 74, 0.5);
        }
        .admin-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </AdminLayout>
  );
}

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

export default function AdminServicesPage() {
  return (
    <ProtectedRoute>
      <ServicesAdmin />
    </ProtectedRoute>
  );
}
