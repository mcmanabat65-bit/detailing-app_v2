'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Car,
  ChevronRight,
  Plus,
  Trash2,
  Star,
  Check,
  X,
  Pencil,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { MemberRoute } from '@/components/MemberRoute';
import { PortalLayout } from '@/components/PortalLayout';

const SIZE_OPTS = [
  { id: 'small', label: 'Small (compact, hatchback)' },
  { id: 'medium', label: 'Medium (sedan, small SUV)' },
  { id: 'large', label: 'Large (SUV, pickup, van)' },
  { id: 'xl', label: 'Extra large (truck, oversized)' },
];

const emptyCar = () => ({
  make: '',
  model: '',
  year: new Date().getFullYear(),
  size: 'medium',
  plateNumber: '',
});

function Fleet() {
  const {
    currentMember,
    getCarsForMember,
    upsertCar,
    addCarToMember,
    updateMemberCarPlate,
    removeCarFromMember,
    setMemberCarOrder,
    showToast,
  } = useApp();

  const member = currentMember;
  const cars = member ? getCarsForMember(member.id) : [];

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(emptyCar());
  const [saving, setSaving] = useState(false);
  const [editPlateId, setEditPlateId] = useState(null);
  const [plateDraft, setPlateDraft] = useState('');

  const updateForm = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.make.trim() || !form.model.trim()) {
      showToast('Make and model are required.', 'error');
      return;
    }
    setSaving(true);
    const car = await upsertCar({
      make: form.make,
      model: form.model,
      year: Number(form.year),
      size: form.size,
    });
    if (car?.error) {
      setSaving(false);
      showToast(car.error, 'error');
      return;
    }
    if (cars.some((c) => c.id === car.id)) {
      setSaving(false);
      showToast('That car is already in your fleet.', 'info');
      return;
    }
    const linked = await addCarToMember(member.id, car.id, form.plateNumber);
    setSaving(false);
    if (linked?.error) {
      showToast(linked.error, 'error');
      return;
    }
    showToast(`${form.make} ${form.model} added to your fleet.`, 'success');
    setForm(emptyCar());
    setAdding(false);
  };

  const handleRemove = async (linkId, label) => {
    if (!window.confirm(`Remove ${label} from your fleet?`)) return;
    const res = await removeCarFromMember(linkId);
    if (res?.error) showToast(res.error, 'error');
    else showToast('Car removed.', 'info');
  };

  const handleSavePlate = async (linkId) => {
    const res = await updateMemberCarPlate(linkId, plateDraft);
    if (res?.error) showToast(res.error, 'error');
    else showToast('Plate updated.', 'success');
    setEditPlateId(null);
    setPlateDraft('');
  };

  const handleMakeDefault = async (linkId) => {
    // Default = lowest sort_order. Put this car ahead of the current first.
    const minOrder = cars.length ? Math.min(...cars.map((c) => c.sortOrder ?? 0)) : 0;
    const res = await setMemberCarOrder(linkId, minOrder - 1);
    if (res?.error) showToast(res.error, 'error');
    else showToast('Default car updated.', 'success');
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <p className="text-muted text-sm">
          Your saved cars. The default car is pre-selected when you book.
        </p>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-obsidian text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add car
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="glass-card rounded-md p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-cream font-serif text-lg">Add a car</div>
            <button
              type="button"
              onClick={() => { setAdding(false); setForm(emptyCar()); }}
              className="text-muted hover:text-cream"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={form.make}
              onChange={(e) => updateForm('make', e.target.value)}
              className="portal-input"
              placeholder="Make (Toyota)"
            />
            <input
              type="text"
              value={form.model}
              onChange={(e) => updateForm('model', e.target.value)}
              className="portal-input"
              placeholder="Model (Fortuner)"
            />
            <input
              type="number"
              min={1900}
              max={2100}
              value={form.year}
              onChange={(e) => updateForm('year', e.target.value)}
              className="portal-input"
              placeholder="Year"
            />
            <select
              value={form.size}
              onChange={(e) => updateForm('size', e.target.value)}
              className="portal-input"
            >
              {SIZE_OPTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.plateNumber}
              onChange={(e) => updateForm('plateNumber', e.target.value.toUpperCase())}
              className="portal-input col-span-2"
              placeholder="Plate number (optional) — e.g. ABC-1234"
              maxLength={10}
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save car'}
          </button>
        </form>
      )}

      {cars.length === 0 && !adding ? (
        <div className="glass-card rounded-md p-10 text-center">
          <div className="w-12 h-12 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-4">
            <Car className="w-5 h-5 text-gold" />
          </div>
          <p className="text-muted text-sm">No cars saved yet. Add your first car.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cars.map((c, i) => (
            <div key={c.linkId} className="glass-card rounded-md p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/portal/fleet/${c.linkId}`}
                      className="inline-flex items-center gap-1 text-cream font-medium hover:text-gold transition-colors"
                    >
                      {c.year} {c.make} {c.model}
                      <ChevronRight className="w-4 h-4 text-muted" />
                    </Link>
                    {i === 0 && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 rounded-full px-2 py-0.5">
                        <Star className="w-3 h-3" />
                        Default
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-1 uppercase tracking-widest">
                    {c.size}
                  </div>

                  {editPlateId === c.linkId ? (
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={plateDraft}
                        onChange={(e) => setPlateDraft(e.target.value.toUpperCase())}
                        className="portal-input !py-1.5 max-w-[160px]"
                        placeholder="ABC-1234"
                        maxLength={10}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePlate(c.linkId)}
                        className="text-success hover:text-success/80"
                        aria-label="Save plate"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditPlateId(null); setPlateDraft(''); }}
                        className="text-muted hover:text-cream"
                        aria-label="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditPlateId(c.linkId); setPlateDraft(c.plateNumber || ''); }}
                      className="inline-flex items-center gap-1.5 text-xs text-cream/70 hover:text-gold transition-colors mt-2"
                    >
                      <Pencil className="w-3 h-3" />
                      {c.plateNumber ? `Plate: ${c.plateNumber}` : 'Add plate number'}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {i !== 0 && (
                    <button
                      onClick={() => handleMakeDefault(c.linkId)}
                      className="text-xs text-muted hover:text-gold transition-colors inline-flex items-center gap-1"
                      title="Make default"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(c.linkId, `${c.make} ${c.model}`)}
                    className="text-muted hover:text-danger transition-colors"
                    aria-label="Remove car"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .portal-input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
        }
        .portal-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}

export default function PortalFleetPage() {
  return (
    <MemberRoute>
      <PortalLayout title="My Fleet">
        <Fleet />
      </PortalLayout>
    </MemberRoute>
  );
}
