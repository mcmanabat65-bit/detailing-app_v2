'use client';

import { useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Car,
  X,
  Save,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';

const SIZES = [
  { id: 'small',  label: 'Small',  hint: 'Compact, hatchback, coupe' },
  { id: 'medium', label: 'Medium', hint: 'Sedan, small SUV' },
  { id: 'large',  label: 'Large',  hint: 'Large SUV, pickup, van' },
  { id: 'xl',     label: 'Extra Large', hint: 'Truck, oversized' },
];

const SIZE_LABEL = SIZES.reduce((m, s) => ((m[s.id] = s.label), m), {});

const SIZE_BADGE = {
  small:  'bg-blue-500/15 text-blue-400',
  medium: 'bg-success/15 text-success',
  large:  'bg-gold/15 text-gold',
  xl:     'bg-purple-500/15 text-purple-400',
};

const EMPTY = { id: null, make: '', year: new Date().getFullYear(), model: '', size: 'medium' };

function CarForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial }));
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e = {};
    if (!form.make.trim()) e.make = 'Required';
    if (!form.model.trim()) e.model = 'Required';
    const yr = Number(form.year);
    if (!Number.isFinite(yr) || yr < 1900 || yr > 2100) e.year = '1900–2100';
    if (!SIZES.some((s) => s.id === form.size)) e.size = 'Pick a size';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({
      id: form.id || undefined,
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      size: form.size,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Make *" error={errors.make}>
          <input
            type="text"
            value={form.make}
            onChange={(e) => set('make', e.target.value)}
            placeholder="Toyota"
            className="input"
          />
        </Field>
        <Field label="Model *" error={errors.model}>
          <input
            type="text"
            value={form.model}
            onChange={(e) => set('model', e.target.value)}
            placeholder="Fortuner"
            className="input"
          />
        </Field>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Year *" error={errors.year}>
          <input
            type="number"
            min={1900}
            max={2100}
            value={form.year}
            onChange={(e) => set('year', e.target.value)}
            className="input"
          />
        </Field>
        <Field label="Size *" error={errors.size}>
          <select
            value={form.size}
            onChange={(e) => set('size', e.target.value)}
            className="input"
          >
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label} — {s.hint}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving…' : form.id ? 'Save changes' : 'Add car'}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
        }
      `}</style>
    </form>
  );
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
        {label}
      </div>
      {children}
      {error && (
        <div className="text-xs text-danger mt-1.5">{error}</div>
      )}
    </label>
  );
}

function CarsAdmin() {
  const { cars, upsertCar, deleteCar, showToast, hydrated } = useApp();
  const [q, setQ] = useState('');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [editing, setEditing] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    return cars.filter((c) => {
      if (sizeFilter !== 'all' && c.size !== sizeFilter) return false;
      if (q) {
        const needle = q.toLowerCase();
        const hay = `${c.make} ${c.model} ${c.year}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [cars, q, sizeFilter]);

  const handleSave = async (payload) => {
    setIsSaving(true);
    const result = await upsertCar(payload);
    setIsSaving(false);
    if (result?.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast(payload.id ? 'Car updated.' : 'Car added.', 'success');
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteCar(confirmDelete.id);
    if (result?.error) {
      showToast(result.error, 'error');
    } else {
      showToast('Car deleted.', 'success');
    }
    setConfirmDelete(null);
  };

  return (
    <AdminLayout title="Cars">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="text-muted text-sm">
          Reference catalog of car makes, models, years, and sizes.
        </div>
        <button
          onClick={() => setEditing(EMPTY)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add car
        </button>
      </div>

      <div className="glass-card rounded-md p-4 md:p-5 mb-6">
        <div className="grid md:grid-cols-[1fr_auto] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search make, model, or year…"
              className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-sm text-cream"
            />
          </div>
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream"
          >
            <option value="all">All sizes</option>
            {SIZES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-muted mt-3">
          Showing <span className="text-cream">{filtered.length}</span> of{' '}
          {cars.length}
        </div>
      </div>

      <div className="glass-card rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium">Make</th>
                <th className="px-4 py-3 font-medium">Model</th>
                <th className="px-4 py-3 font-medium">Year</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Car className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span className="text-cream">{c.make}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-cream/85">{c.model}</td>
                  <td className="px-4 py-3 text-cream/85">{c.year}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm ${SIZE_BADGE[c.size] || 'bg-white/10 text-cream/85'}`}
                    >
                      {SIZE_LABEL[c.size] || c.size}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(c)}
                        aria-label="Edit"
                        title="Edit"
                        className="p-2 text-cream/70 hover:text-gold hover:bg-gold/10 rounded-sm transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(c)}
                        aria-label="Delete"
                        title="Delete"
                        className="p-2 text-cream/70 hover:text-danger hover:bg-danger/10 rounded-sm transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center text-muted">
                    {!hydrated
                      ? 'Loading cars…'
                      : cars.length === 0
                        ? 'No cars yet — add the first one.'
                        : 'No cars match your filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <div
          onClick={() => !isSaving && setEditing(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card gold-border rounded-md max-w-2xl w-full p-6 md:p-8"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="font-serif text-2xl text-cream">
                  {editing.id ? 'Edit car' : 'Add a car'}
                </h3>
                <p className="text-muted text-sm mt-1">
                  Captured for the shop reference catalog.
                </p>
              </div>
              <button
                onClick={() => !isSaving && setEditing(null)}
                aria-label="Close"
                className="text-cream/70 hover:text-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CarForm
              initial={editing}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              isSaving={isSaving}
            />
          </div>
        </div>
      )}

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
                  Delete this car?
                </h3>
                <p className="text-muted text-sm mt-1">
                  Removes it from the catalog. Existing bookings are not
                  affected.
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
              <div className="text-cream font-medium">
                {confirmDelete.year} {confirmDelete.make} {confirmDelete.model}
              </div>
              <div className="text-xs text-muted">
                {SIZE_LABEL[confirmDelete.size] || confirmDelete.size}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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

export default function AdminCarsPage() {
  return (
    <ProtectedRoute>
      <CarsAdmin />
    </ProtectedRoute>
  );
}
