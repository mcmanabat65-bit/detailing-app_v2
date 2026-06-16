'use client';

import { useCallback, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, Star, Eye, EyeOff, Quote, GripVertical, Check, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { AdminLayout } from '@/components/AdminLayout';
import { ProtectedRoute } from '@/components/ProtectedRoute';

const EMPTY = { name: '', car: '', quote: '', rating: 5, isVisible: true, sortOrder: 0 };

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star className={`w-5 h-5 transition-colors ${n <= (hovered || value) ? 'text-gold fill-gold' : 'text-white/20'}`} />
        </button>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-white/10 rounded-md w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="font-serif text-xl text-cream">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-cream transition-colors">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function TestimonialsPage() {
  const {
    testimonials,
    upsertTestimonial,
    approveTestimonial,
    rejectTestimonial,
    deleteTestimonial,
    reorderTestimonials,
    showToast,
  } = useApp();

  const [tab, setTab] = useState('approved'); // 'pending' | 'approved'
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [draggedIdx, setDraggedIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const dragFromIdx = useRef(null);

  const pending = testimonials.filter((t) => t.status === 'pending');
  const approved = [...testimonials.filter((t) => !t.status || t.status === 'approved')]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const handleReorder = useCallback(async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const reordered = [...approved];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const result = await reorderTestimonials(reordered.map((t) => t.id));
    if (result?.error) showToast(result.error, 'error');
  }, [approved, reorderTestimonials, showToast]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const openAdd = () => {
    setForm({ ...EMPTY, sortOrder: (approved.length + 1) * 10 });
    setModal('add');
  };

  const openEdit = (t) => {
    setForm({ id: t.id, name: t.name, car: t.car, quote: t.quote, rating: t.rating ?? 5, isVisible: t.isVisible !== false, sortOrder: t.sortOrder ?? 0 });
    setModal('edit');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    const result = await upsertTestimonial({ ...form, status: 'approved' });
    setSaving(false);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast(modal === 'add' ? 'Testimonial added.' : 'Testimonial updated.', 'success');
    setModal(null);
  };

  const handleApprove = async (t) => {
    const result = await approveTestimonial(t.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Testimonial approved and published.', 'success');
  };

  const handleReject = async (t) => {
    const result = await rejectTestimonial(t.id);
    if (result?.error) showToast(result.error, 'error');
    else showToast('Testimonial rejected.', 'success');
  };

  const handleDelete = async (id) => {
    const result = await deleteTestimonial(id);
    if (result?.error) { showToast(result.error, 'error'); return; }
    showToast('Testimonial deleted.', 'success');
    setConfirmDeleteId(null);
  };

  const handleToggleVisibility = async (t) => {
    const result = await upsertTestimonial({ ...t, isVisible: !t.isVisible });
    if (result?.error) showToast(result.error, 'error');
  };

  return (
    <ProtectedRoute permission="testimonials.manage">
      <AdminLayout title="Testimonials">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1 p-1 bg-white/5 rounded-sm">
              <button
                onClick={() => setTab('pending')}
                className={`px-4 py-1.5 text-sm rounded-sm transition-colors relative ${tab === 'pending' ? 'bg-surface text-cream' : 'text-muted hover:text-cream'}`}
              >
                Pending
                {pending.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-gold text-obsidian rounded-full font-semibold">{pending.length}</span>
                )}
              </button>
              <button
                onClick={() => setTab('approved')}
                className={`px-4 py-1.5 text-sm rounded-sm transition-colors ${tab === 'approved' ? 'bg-surface text-cream' : 'text-muted hover:text-cream'}`}
              >
                Approved
              </button>
            </div>
            {tab === 'approved' && (
              <button
                onClick={openAdd}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-obsidian text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Testimonial
              </button>
            )}
          </div>

          {/* Pending tab */}
          {tab === 'pending' && (
            pending.length === 0 ? (
              <div className="glass-card rounded-md p-12 text-center">
                <Quote className="w-8 h-8 text-gold/40 mx-auto mb-3" />
                <p className="text-muted">No pending submissions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((t) => (
                  <div key={t.id} className="glass-card rounded-md p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-cream font-medium">{t.name}</span>
                          <span className="text-muted text-xs">·</span>
                          <span className="text-muted text-xs">{t.car}</span>
                        </div>
                        <p className="text-cream/70 text-sm leading-relaxed mb-3">"{t.quote}"</p>
                        <div className="flex gap-0.5">
                          {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                            <Star key={i} className="w-3.5 h-3.5 text-gold fill-gold" />
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleApprove(t)}
                          aria-label="Approve"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 text-success text-xs rounded-sm hover:bg-success/20 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(t)}
                          aria-label="Reject"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-danger/10 text-danger text-xs rounded-sm hover:bg-danger/20 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Reject
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(t.id)}
                          aria-label="Delete"
                          className="text-muted hover:text-danger transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Approved tab */}
          {tab === 'approved' && (
            approved.length === 0 ? (
              <div className="glass-card rounded-md p-12 text-center">
                <Quote className="w-8 h-8 text-gold/40 mx-auto mb-3" />
                <p className="text-muted">No approved testimonials yet.</p>
              </div>
            ) : (
              <div className="glass-card rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left">
                        <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-medium">Client</th>
                        <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-medium">Quote</th>
                        <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-medium">Rating</th>
                        <th className="px-4 py-3 text-[11px] uppercase tracking-widest text-muted font-medium">Visible</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {approved.map((t, idx) => (
                        <tr
                          key={t.id}
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
                          className={`transition-colors ${draggedIdx === idx ? 'opacity-40' : 'hover:bg-white/[0.02]'} ${dragOverIdx === idx && draggedIdx !== idx ? 'outline outline-1 outline-gold/50' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-muted/40 cursor-grab active:cursor-grabbing shrink-0" />
                              <div>
                                <div className="text-cream font-medium">{t.name}</div>
                                <div className="text-muted text-xs mt-0.5">{t.car}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-xs">
                            <p className="text-cream/70 text-xs leading-relaxed line-clamp-2">"{t.quote}"</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex gap-0.5">
                              {Array.from({ length: t.rating ?? 5 }).map((_, i) => (
                                <Star key={i} className="w-3.5 h-3.5 text-gold fill-gold" />
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleVisibility(t)}
                              aria-label={t.isVisible !== false ? 'Hide' : 'Show'}
                              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-xs transition-colors ${t.isVisible !== false ? 'bg-success/10 text-success' : 'bg-white/5 text-muted'}`}
                            >
                              {t.isVisible !== false ? <><Eye className="w-3 h-3" /> Visible</> : <><EyeOff className="w-3 h-3" /> Hidden</>}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 justify-end">
                              <button onClick={() => openEdit(t)} aria-label="Edit" className="text-muted hover:text-gold transition-colors">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setConfirmDeleteId(t.id)} aria-label="Delete" className="text-muted hover:text-danger transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}
        </div>

        {/* Add / Edit Modal */}
        {(modal === 'add' || modal === 'edit') && (
          <Modal title={modal === 'add' ? 'Add Testimonial' : 'Edit Testimonial'} onClose={() => setModal(null)}>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Client Name *</label>
                <input type="text" required value={form.name} onChange={(e) => set('name', e.target.value)}
                  className="w-full bg-obsidian/60 border border-white/10 rounded-sm px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Juan dela Cruz" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Car / Description *</label>
                <input type="text" required value={form.car} onChange={(e) => set('car', e.target.value)}
                  className="w-full bg-obsidian/60 border border-white/10 rounded-sm px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold/50 transition-colors"
                  placeholder="Toyota Fortuner Owner" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">Quote *</label>
                <textarea required rows={4} value={form.quote} onChange={(e) => set('quote', e.target.value)}
                  className="w-full bg-obsidian/60 border border-white/10 rounded-sm px-3 py-2 text-cream text-sm focus:outline-none focus:border-gold/50 transition-colors resize-none"
                  placeholder="What did the client say?" />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-2">Rating</label>
                <StarPicker value={form.rating} onChange={(v) => set('rating', v)} />
              </div>
              <div className="flex items-center justify-end gap-3">
                <label className="text-[11px] uppercase tracking-widest text-cream/70">Visible on site</label>
                <button type="button" onClick={() => set('isVisible', !form.isVisible)}
                  className={`relative w-11 h-6 rounded-full transition-colors overflow-hidden ${form.isVisible ? 'bg-gold' : 'bg-white/10'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${form.isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 px-4 py-2.5 border border-white/10 text-cream/70 rounded-sm hover:border-white/20 transition-colors text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 text-sm">
                  {saving ? 'Saving…' : modal === 'add' ? 'Add' : 'Save Changes'}
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* Delete confirmation */}
        {confirmDeleteId && (
          <Modal title="Delete Testimonial" onClose={() => setConfirmDeleteId(null)}>
            <p className="text-cream/70 text-sm mb-6">This testimonial will be permanently removed. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteId(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/70 rounded-sm hover:border-white/20 transition-colors text-sm">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDeleteId)}
                className="flex-1 px-4 py-2.5 bg-danger text-white font-semibold rounded-sm hover:bg-danger/80 transition-colors text-sm">
                Delete
              </button>
            </div>
          </Modal>
        )}
      </AdminLayout>
    </ProtectedRoute>
  );
}
