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
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

const SIZE_OPTS = [
  { id: 'small',  label: 'Small (compact, hatchback)' },
  { id: 'medium', label: 'Medium (sedan, small SUV)' },
  { id: 'large',  label: 'Large (SUV, pickup, van)' },
  { id: 'xl',     label: 'Extra large (truck, oversized)' },
];

// Strips everything except digits, removes +63 country code and leading 0
// so "09171234567", "+639171234567", "0917-123-4567" all normalize to "9171234567"
const normalizePhone = (phone) => {
  let p = String(phone || '').replace(/\D/g, '');
  if (p.startsWith('63') && p.length >= 11) p = p.slice(2);
  if (p.startsWith('0')) p = p.slice(1);
  return p;
};

const emptyCar = () => ({
  make: '',
  model: '',
  year: new Date().getFullYear(),
  size: 'medium',
  plateNumber: '',
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
  const [phoneWarning, setPhoneWarning] = useState(null); // existing member with same phone

  const updateCar = (i, key, value) =>
    setMemberCars((cs) => cs.map((c, idx) => (idx === i ? { ...c, [key]: value } : c)));
  const addCarRow = () => setMemberCars((cs) => [...cs, emptyCar()]);
  const removeCarRow = (i) =>
    setMemberCars((cs) => (cs.length === 1 ? cs : cs.filter((_, idx) => idx !== i)));

  const doSubmit = async () => {
    const filled = memberCars.filter((c) => c.make.trim() || c.model.trim());
    setSubmitting(true);
    const m = await addMember(form);
    if (!m || m.error) {
      setSubmitting(false);
      showToast(m?.error || 'Could not submit application.', 'error');
      return;
    }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      showToast('Please complete the form.', 'error');
      return;
    }

    // Cars: any partially-filled row must be complete
    const filled = memberCars.filter((c) => c.make.trim() || c.model.trim());
    for (const c of filled) {
      if (!c.make.trim() || !c.model.trim()) {
        showToast('Each car needs both make and model.', 'error');
        return;
      }
    }

    // Hard block — email already registered
    const emailLower = form.email.trim().toLowerCase();
    if (members.some((m) => (m.email || '').trim().toLowerCase() === emailLower)) {
      showToast('This email is already registered.', 'error');
      return;
    }

    // Soft warning — same normalized phone found on another member
    const normPhone = normalizePhone(form.phone);
    const phoneMatch = members.find((m) => normalizePhone(m.phone) === normPhone);
    if (phoneMatch) {
      setPhoneWarning(phoneMatch);
      return; // pause — wait for user to confirm or cancel
    }

    await doSubmit();
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

        {/* Visit-first notice */}
        <div className="max-w-3xl mx-auto mb-12 flex gap-4 bg-gold/5 border border-gold/20 rounded-md px-6 py-5">
          <Crown className="w-5 h-5 text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-cream font-medium mb-1">Visit us in person first</p>
            <p className="text-muted text-sm leading-relaxed">
              For the time being, VIP membership begins with a personal visit to our shop. Come by, meet the team, and let us get to know you and your vehicle before we welcome you into the club. Walk-ins are always welcome during operating hours.
            </p>
            <p className="text-gold/80 text-xs mt-2.5 font-medium tracking-wide">
              Brgy. San Francisco Halang Rd, Biñan, Philippines 4024 · Mon – Sun, 7:00 AM – 5:00 PM
            </p>
          </div>
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
                          <input
                            type="text"
                            value={car.plateNumber || ''}
                            onChange={(e) => updateCar(i, 'plateNumber', e.target.value.toUpperCase())}
                            className="member-input col-span-2"
                            placeholder="Plate number (optional) — e.g. ABC-1234"
                            maxLength={10}
                          />
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

      {/* Phone duplicate soft-warning modal */}
      {phoneWarning && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-5 animate-fade-in">
          <div className="glass-card rounded-md max-w-md w-full p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-sm bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-serif text-xl text-cream">Possible duplicate</h3>
                <p className="text-muted text-sm mt-1 leading-relaxed">
                  A VIP member with this phone number already exists in our records.
                </p>
              </div>
            </div>

            <div className="bg-surface/60 border border-white/5 rounded-sm p-4 mb-5 space-y-1">
              <div className="text-cream font-medium">{phoneWarning.name}</div>
              <div className="text-xs text-muted">{phoneWarning.email}</div>
              <div className="text-xs mt-1">
                <span className={`uppercase tracking-widest text-[10px] px-2 py-0.5 rounded-sm ${
                  phoneWarning.status === 'approved'  ? 'bg-success/15 text-success' :
                  phoneWarning.status === 'rejected'  ? 'bg-danger/15 text-danger' :
                                                        'bg-gold/15 text-gold'
                }`}>
                  {phoneWarning.status}
                </span>
              </div>
            </div>

            <p className="text-sm text-cream/70 mb-5 leading-relaxed">
              Is this a different person sharing the same number, or a re-application?
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setPhoneWarning(null)}
                className="flex-1 px-4 py-2.5 border border-white/10 text-cream/85 rounded-sm hover:border-gold/50 hover:text-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => { setPhoneWarning(null); await doSubmit(); }}
                className="flex-1 px-4 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                Yes, continue anyway
              </button>
            </div>
          </div>
        </div>
      )}

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
