'use client';

import { useState } from 'react';
import {
  Coffee,
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

const EMPTY_FORM = { name: '', available: true, sortOrder: 0 };

function CoffeeForm({ initial, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState(initial ? { ...initial } : { ...EMPTY_FORM });
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setError('');
    onSave({ ...form, name: form.name.trim(), sortOrder: Number(form.sortOrder) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
          Coffee Name *
        </label>
        <input
          type="text"
          autoFocus
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors"
          placeholder="e.g. Macchiato"
        />
        {error && <div className="text-[11px] text-danger mt-1">{error}</div>}
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
          className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 px-3 text-sm text-cream focus:outline-none focus:border-gold/50 transition-colors"
          placeholder="0"
        />
        <div className="text-[11px] text-muted mt-1">Lower number = appears first in the dropdown</div>
      </div>

      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, available: !f.available }))}
          className={`w-10 h-6 rounded-full transition-colors relative shrink-0 overflow-hidden ${
            form.available ? 'bg-gold' : 'bg-white/10'
          }`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
            form.available ? 'translate-x-4' : 'translate-x-0'
          }`} />
        </button>
        <div>
          <div className="text-sm text-cream">Available</div>
          <div className="text-xs text-muted">Unavailable drinks are hidden from the booking form</div>
        </div>
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
              {initial ? 'Save Changes' : 'Add Coffee'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function CoffeesAdmin() {
  const { coffees, upsertCoffee, deleteCoffee, showToast } = useApp();

  const [modal, setModal] = useState(null); // null | { mode: 'add' | 'edit', coffee? }
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [saving, setSaving] = useState(false);

  const available = coffees.filter((c) => c.available !== false);
  const unavailable = coffees.filter((c) => c.available === false);

  const handleSave = async (data) => {
    setSaving(true);
    const result = await upsertCoffee(data);
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(modal?.mode === 'edit' ? 'Coffee updated.' : 'Coffee added.', 'success');
    setModal(null);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const result = await deleteCoffee(confirmDelete.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast(`"${confirmDelete.name}" removed.`, 'success');
    setConfirmDelete(null);
  };

  const toggleAvailable = async (coffee) => {
    const result = await upsertCoffee({ ...coffee, available: !coffee.available });
    if (result?.error) showToast(result.error, 'error');
    else showToast(
      coffee.available ? `"${coffee.name}" hidden from booking form.` : `"${coffee.name}" is now available.`,
      'info'
    );
  };

  return (
    <AdminLayout title="Coffee Menu">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="text-sm text-muted">
          <span className="text-cream">{available.length}</span> available &middot;{' '}
          <span className="text-cream">{unavailable.length}</span> hidden
        </div>
        <button
          onClick={() => setModal({ mode: 'add' })}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold text-obsidian font-semibold text-sm rounded-sm hover:bg-gold-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Coffee
        </button>
      </div>

      {coffees.length === 0 ? (
        <div className="glass-card rounded-md py-20 text-center text-muted">
          No coffees yet. Add your first drink to the menu.
        </div>
      ) : (
        <div className="glass-card rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-widest text-muted border-b border-white/5">
                <th className="px-4 py-3 font-medium w-8"></th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Sort</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coffees.map((c) => (
                <tr key={c.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-muted">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Coffee className="w-3.5 h-3.5 text-gold shrink-0" />
                      <span className="text-cream font-medium">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted text-xs">{c.sortOrder ?? 0}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleAvailable(c)}
                      className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-sm transition-colors ${
                        c.available !== false
                          ? 'bg-success/15 text-success hover:bg-success/25'
                          : 'bg-white/5 text-muted hover:bg-white/10'
                      }`}
                    >
                      {c.available !== false ? 'Available' : 'Hidden'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setModal({ mode: 'edit', coffee: c })}
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
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-muted mt-4">
        Click <span className="text-cream">Available</span> / <span className="text-cream">Hidden</span> to instantly toggle visibility in the booking form without deleting.
      </p>

      {/* Add / Edit modal */}
      {modal && (
        <div
          onClick={() => setModal(null)}
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-md w-full max-w-sm p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-2xl text-cream">
                {modal.mode === 'edit' ? `Edit "${modal.coffee.name}"` : 'Add Coffee'}
              </h3>
              <button onClick={() => setModal(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <CoffeeForm
              initial={modal.mode === 'edit' ? modal.coffee : undefined}
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
                <h3 className="font-serif text-2xl text-cream">Remove coffee?</h3>
                <p className="text-muted text-sm mt-1">This removes it from the menu permanently.</p>
              </div>
              <button onClick={() => setConfirmDelete(null)} aria-label="Close" className="text-cream/70 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-surface/60 rounded-sm p-4 mb-5 border border-white/5 flex items-center gap-2">
              <Coffee className="w-4 h-4 text-gold shrink-0" />
              <span className="text-cream font-medium">{confirmDelete.name}</span>
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

export default function AdminCoffeesPage() {
  return (
    <ProtectedRoute>
      <CoffeesAdmin />
    </ProtectedRoute>
  );
}
