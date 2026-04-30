'use client';

import { useState } from 'react';
import {
  Coffee,
  Calendar,
  Percent,
  Wifi,
  Cake,
  Crown,
  Check,
  Sparkles,
  Car,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const SIZE_OPTS = [
  { id: 'small',  label: 'Small (compact, hatchback)' },
  { id: 'medium', label: 'Medium (sedan, small SUV)' },
  { id: 'large',  label: 'Large (SUV, pickup, van)' },
  { id: 'xl',     label: 'Extra large (truck, oversized)' },
];

const emptyCar = () => ({
  make: '',
  model: '',
  year: new Date().getFullYear(),
  size: 'medium',
});

const perks = [
  {
    icon: Coffee,
    title: 'Free Coffee, While You Wait',
    body: 'Macchiato, Brewed, Cappuccino, Americano, or Latte — barista pulled, on the house.',
  },
  {
    icon: Calendar,
    title: 'Priority Scheduling',
    body: 'Members get first pick of the calendar before slots are released to the public.',
  },
  {
    icon: Percent,
    title: '10% Off, Every Time',
    body: 'A standing 10% discount on every package, every visit. No coupon needed.',
  },
  {
    icon: Wifi,
    title: 'Members-Only Lounge',
    body: 'Premium WiFi, magazines, leather seating. The wait becomes its own experience.',
  },
  {
    icon: Cake,
    title: 'Birthday Month Special',
    body: 'A complimentary upgrade or surprise treatment during your birthday month.',
  },
];

export default function MembershipPage() {
  const { addMember, upsertCar, addCarToMember, showToast, members } = useApp();
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [memberCars, setMemberCars] = useState([emptyCar()]);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(null);

  const updateCar = (i, key, value) =>
    setMemberCars((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));
  const addCarRow = () => setMemberCars((cs) => [...cs, emptyCar()]);
  const removeCarRow = (i) =>
    setMemberCars((cs) => (cs.length === 1 ? cs : cs.filter((_, idx) => idx !== i)));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      showToast('Please complete the form.', 'error');
      return;
    }
    // Cars are optional — but any partially-filled row must be complete.
    const filled = memberCars.filter(
      (c) => c.make.trim() || c.model.trim()
    );
    for (const c of filled) {
      if (!c.make.trim() || !c.model.trim()) {
        showToast('Each car needs both make and model.', 'error');
        return;
      }
    }

    setSubmitting(true);
    const m = await addMember(form);
    if (!m || m.error) {
      setSubmitting(false);
      showToast(m?.error || 'Could not submit application.', 'error');
      return;
    }
    // Link any cars provided. Failures are surfaced but don't roll back the
    // member creation — admin can clean up from the dashboard.
    for (const car of filled) {
      const upserted = await upsertCar(car);
      if (upserted?.error) {
        showToast(`Could not save ${car.make} ${car.model}: ${upserted.error}`, 'error');
        continue;
      }
      const linked = await addCarToMember(m.id, upserted.id);
      if (linked?.error) {
        showToast(`Could not link ${car.make} ${car.model}: ${linked.error}`, 'error');
      }
    }

    setSubmitting(false);
    setSuccess(m);
    setForm({ name: '', email: '', phone: '' });
    setMemberCars([emptyCar()]);
    showToast('Application submitted — pending review.', 'success');
  };

  const memberSinceLabel = (iso) =>
    new Date(iso).toLocaleDateString('en-PH', {
      month: 'short',
      year: 'numeric',
    });

  return (
    <div className="page-enter pt-28 md:pt-36 pb-20">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            Members Club
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-cream mb-5">
            VIP Membership
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            A standing invitation to the lounge — priority access, free coffee,
            and a 10% discount on every detail.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-20 stagger">
          {perks.map((p) => {
            const I = p.icon;
            return (
              <div
                key={p.title}
                className="glass-card card-hover rounded-md p-7 animate-fade-in"
              >
                <div className="w-11 h-11 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center mb-5">
                  <I className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-serif text-xl text-cream mb-2">
                  {p.title}
                </h3>
                <p className="text-muted text-sm leading-relaxed">{p.body}</p>
              </div>
            );
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="absolute -inset-6 bg-gold/15 blur-3xl rounded-full" />
            <div className="relative gold-gradient rounded-2xl p-8 aspect-[1.6/1] flex flex-col justify-between shadow-2xl shadow-black/50">
              {success && (
                <div className="absolute top-4 right-4 px-2.5 py-1 rounded-full bg-obsidian/80 text-[10px] tracking-[0.2em] uppercase text-gold border border-gold/40">
                  Pending Approval
                </div>
              )}
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-obsidian/70 text-[10px] tracking-[0.3em] uppercase">
                    Samahuzai Carwash and Auto Detailing
                  </div>
                  <div className="text-obsidian font-serif text-2xl">
                    VIP Member
                  </div>
                </div>
                <Crown className="w-7 h-7 text-obsidian" />
              </div>
              <div>
                <div className="text-obsidian/60 text-[10px] tracking-widest uppercase mb-1">
                  Member
                </div>
                <div className="font-serif text-xl text-obsidian mb-3 truncate">
                  {success ? success.name.toUpperCase() : 'YOUR NAME HERE'}
                </div>
                <div className="flex justify-between text-[10px] tracking-widest uppercase text-obsidian/70">
                  <span>
                    Since{' '}
                    {success ? memberSinceLabel(success.memberSince) : '2026'}
                  </span>
                  <span>
                    No.{' '}
                    {String(members.length + (success ? 0 : 1)).padStart(4, '0')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-md p-8">
            {success ? (
              <div className="text-center py-6 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mx-auto mb-5">
                  <Check className="w-7 h-7 text-gold" />
                </div>
                <h2 className="font-serif text-3xl text-cream mb-2">
                  Application received, {success.name.split(' ')[0]}.
                </h2>
                <p className="text-muted mb-2">
                  A manager will review your application — usually within 24 hours.
                </p>
                <p className="text-muted text-sm mb-6">
                  Once approved, your VIP perks unlock automatically when you book under{' '}
                  <span className="text-cream/80">{success.email}</span>.
                </p>
                <button
                  onClick={() => setSuccess(null)}
                  className="px-5 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm"
                >
                  Submit another application
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-gold" />
                  <h2 className="font-serif text-2xl text-cream">
                    Become a Member
                  </h2>
                </div>
                <Field label="Full Name *">
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="member-input"
                    placeholder="Maria Santos"
                  />
                </Field>
                <Field label="Email *">
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="member-input"
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label="Phone *">
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    className="member-input"
                    placeholder="0917 123 4567"
                  />
                </Field>

                {/* Cars (optional) */}
                <div className="pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-[11px] uppercase tracking-widest text-cream/70 flex items-center gap-1.5">
                      <Car className="w-3 h-3 text-gold" />
                      Your cars (optional)
                    </div>
                    <button
                      type="button"
                      onClick={addCarRow}
                      className="text-xs text-gold hover:text-gold-light inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add another
                    </button>
                  </div>
                  <p className="text-[11px] text-muted mb-3 leading-relaxed">
                    Add the cars you own — the first one becomes your default
                    at booking.
                  </p>
                  <div className="space-y-3">
                    {memberCars.map((car, i) => (
                      <div
                        key={i}
                        className="bg-surface/50 border border-white/5 rounded-sm p-3 space-y-2"
                      >
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={car.make}
                            onChange={(e) => updateCar(i, 'make', e.target.value)}
                            className="member-input"
                            placeholder="Make (Toyota)"
                          />
                          <input
                            type="text"
                            value={car.model}
                            onChange={(e) => updateCar(i, 'model', e.target.value)}
                            className="member-input"
                            placeholder="Model (Fortuner)"
                          />
                          <input
                            type="number"
                            min={1900}
                            max={2100}
                            value={car.year}
                            onChange={(e) => updateCar(i, 'year', e.target.value)}
                            className="member-input"
                            placeholder="Year"
                          />
                          <select
                            value={car.size}
                            onChange={(e) => updateCar(i, 'size', e.target.value)}
                            className="member-input"
                          >
                            {SIZE_OPTS.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        {memberCars.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCarRow(i)}
                            className="text-xs text-muted hover:text-danger inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-5 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  {submitting ? 'Submitting…' : 'Activate Membership'}
                </button>
                <p className="text-[11px] text-muted text-center leading-relaxed">
                  Free to join. No commitment. Cancel anytime.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .member-input {
          width: 100%;
          background: rgba(20, 20, 22, 0.7);
          border: 1px solid rgba(245, 240, 232, 0.08);
          border-radius: 4px;
          padding: 11px 14px;
          color: var(--color-cream);
          font-size: 14px;
        }
        .member-input::placeholder {
          color: var(--color-muted);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
        {label}
      </div>
      {children}
    </label>
  );
}
