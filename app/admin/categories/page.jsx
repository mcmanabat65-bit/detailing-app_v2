'use client';

import { useState } from 'react';
import {
  Tag,
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useApp } from '@/context/AppContext';

const PRESET_COLORS = [
  { label: 'Blue',   value: 'bg-blue-500/15 text-blue-400' },
  { label: 'Green',  value: 'bg-success/15 text-success' },
  { label: 'Purple', value: 'bg-purple-500/15 text-purple-400' },
  { label: 'Gold',   value: 'bg-gold/15 text-gold' },
  { label: 'Orange', value: 'bg-orange-400/15 text-orange-300' },
  { label: 'Red',    value: 'bg-danger/15 text-danger' },
  { label: 'Teal',   value: 'bg-teal-500/15 text-teal-400' },
  { label: 'Gray',   value: 'bg-white/10 text-cream' },
];

const EMPTY_FORM = { name: '', slug: '', color: PRESET_COLORS[0].value, sortOrder: 0 };

function CategoryBadge({ color, name }) {
  return (
    <span className={`text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-sm font-medium ${color}`}>
      {name}
    </span>
  );
}

function CategoryForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(
    initial
      ? { name: initial.name, slug: initial.slug, color: initial.color, sortOrder: initial.sortOrder ?? 0 }
      : { ...EMPTY_FORM }
  );
  const [errors, setErrors] = useState({});
  const [slugEdited, setSlugEdited] = useState(Boolean(initial));

  const autoSlug = (name) =>
    name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const setName = (val) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: slugEdited ? f.slug : autoSlug(val),
    }));
  };

  const setSlug = (val) => {
    setSlugEdited(true);
    setForm((f) => ({ ...f, slug: val }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.slug.trim()) e.slug = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave({ ...form, sortOrder: Number(form.sortOrder) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
            Name *
          </label>
          <input
            type="text"
            autoFocus
            value={form.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Exterior"
            className="field-input"
          />
          {errors.name && <div className="text-[11px] text-danger mt-1">{errors.name}</div>}
        </div>

        <div>
          <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
            Slug *
          </label>
          <input
            type="text"
            value={form.slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. exterior"
            className="field-input"
          />
          {errors.slug
            ? <div className="text-[11px] text-danger mt-1">{errors.slug}</div>
            : <div className="text-[11px] text-muted mt-1">Lowercase, no spaces (auto-filled)</div>
          }
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
          Color
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setForm((f) => ({ ...f, color: p.value }))}
              className={`px-3 py-1.5 rounded-sm text-[11px] tracking-widest uppercase transition-all border ${
                form.color === p.value
                  ? `${p.value} border-white/30 ring-1 ring-white/20`
                  : `${p.value} border-transparent opacity-60 hover:opacity-100`
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11px] text-muted">Preview:</span>
          <CategoryBadge color={form.color} name={form.name || 'Category'} />
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
          Sort Order
        </label>
        <input
          type="number"
          min="0"
          value={form.sortOrder}
          onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
          className="field-input w-32"
        />
        <div className="text-[11px] text-muted mt-1">Lower number = appears first in dropdown</div>
      </div>

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
          {isSaving ? 'Saving…' : (
            <>
              <Check className="w-4 h-4" />
              {initial ? 'Save Changes' : 'Add Category'}
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .field-input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 10px 12px;
          color: var(--color-cream);
          font-size: 14px;
          transition: border-color 0.2s;
        }
        .field-input:focus {
          outline: none;
          border-color: rgba(201, 168, 76, 0.5);
        }
        .field-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </form>
  );
}

function CategoriesAdmin() {
  const { serviceCategories, upsertServiceCategory, deleteServiceCategory, showToast } = useApp();

  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data) => {
    setSaving(true);
    const result = await upsertServiceCategory({ ...modal?.category, ...data });
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(modal?.mode === 'edit' ? 'Category updated.' : 'Category added.', 'success');
    setModal(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteServiceCategory(confirmDelete.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`"${confirmDelete.name}" removed.`, 'success');
    setConfirmDelete(null);
  };

  return (
    <AdminLayout title="Service Categories">
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted">
          <span className="text-cream">{serviceCategories.length}</span>{' '}
          {serviceCategories.length === 1 ? 'category' : 'categories'} configured
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {serviceCategories.length === 0 ? (
        <div className="glass-card rounded-md py-20 text-center text-muted">
          No categories yet. Add your first service category.
        </div>
      ) : (
        <div className="glass-card rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium">Sort</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {serviceCategories.map((cat) => (
                <tr key={cat.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-muted">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span className="text-cream font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted font-mono text-xs">{cat.slug}</td>
                  <td className="px-4 py-3">
                    <CategoryBadge color={cat.color} name={cat.name} />
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{cat.sortOrder ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ mode: 'edit', category: cat })}
                        aria-label="Edit"
                        title="Edit"
                        className="p-2 text-cream/70 hover:text-gold hover:bg-gold/10 rounded-sm transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(cat)}
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
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-4">
        Categories appear in the <span className="text-cream">Category</span> dropdown when adding or editing a service.
      </p>

      {/* Add / Edit modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-md w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-2xl text-cream">
                {modal.mode === 'edit' ? `Edit "${modal.category.name}"` : 'Add Category'}
              </h3>
              <button onClick={() => setModal(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CategoryForm
              initial={modal.mode === 'edit' ? modal.category : undefined}
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
                <h3 className="font-serif text-2xl text-cream">Remove category?</h3>
                <p className="text-muted text-sm mt-1">
                  This removes it from the category list. Existing services keep their category value.
                </p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 flex items-center gap-3">
              <CategoryBadge color={confirmDelete.color} name={confirmDelete.name} />
              <span className="text-muted text-xs font-mono">{confirmDelete.slug}</span>
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
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

export default function AdminCategoriesPage() {
  return (
    <ProtectedRoute>
      <CategoriesAdmin />
    </ProtectedRoute>
  );
}
