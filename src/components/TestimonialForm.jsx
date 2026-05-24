'use client';

import { useState } from 'react';
import { Star, Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className="transition-transform hover:scale-110"
        >
          <Star className={`w-6 h-6 transition-colors ${n <= (hovered || value) ? 'text-gold fill-gold' : 'text-white/20'}`} />
        </button>
      ))}
    </div>
  );
}

export function TestimonialForm() {
  const { submitTestimonial } = useApp();
  const [form, setForm] = useState({ name: '', car: '', quote: '', rating: 5 });
  const [status, setStatus] = useState(null); // null | 'submitting' | 'success' | 'error'
  const [errorMsg, setErrorMsg] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('submitting');
    const result = await submitTestimonial(form);
    if (result?.error) {
      setErrorMsg(result.error);
      setStatus('error');
    } else {
      setStatus('success');
    }
  };

  if (status === 'success') {
    return (
      <div className="glass-card rounded-md p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-success/10 border border-success/20 flex items-center justify-center mx-auto mb-4">
          <Star className="w-5 h-5 text-success fill-success" />
        </div>
        <h3 className="font-serif text-2xl text-cream mb-2">Thank you!</h3>
        <p className="text-muted text-sm leading-relaxed">
          Your review has been submitted and is pending approval. We appreciate you taking the time to share your experience.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="glass-card rounded-md p-7 space-y-5">
      <div>
        <h3 className="font-serif text-2xl text-cream mb-1">Share your experience</h3>
        <p className="text-muted text-sm">Your review will appear on the website after approval.</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-cream/60 mb-1.5">Your Name *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Juan dela Cruz"
            className="w-full bg-obsidian/60 border border-white/10 rounded-sm px-3 py-2.5 text-cream text-sm placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-widest text-cream/60 mb-1.5">Vehicle *</label>
          <input
            type="text"
            required
            value={form.car}
            onChange={(e) => set('car', e.target.value)}
            placeholder="Toyota Fortuner"
            className="w-full bg-obsidian/60 border border-white/10 rounded-sm px-3 py-2.5 text-cream text-sm placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-widest text-cream/60 mb-1.5">Your Review *</label>
        <textarea
          required
          rows={4}
          value={form.quote}
          onChange={(e) => set('quote', e.target.value)}
          placeholder="Tell us about your experience…"
          className="w-full bg-obsidian/60 border border-white/10 rounded-sm px-3 py-2.5 text-cream text-sm placeholder-[var(--color-muted)] focus:outline-none focus:border-gold/50 transition-colors resize-none"
        />
      </div>

      <div>
        <label className="block text-[11px] uppercase tracking-widest text-cream/60 mb-2">Rating</label>
        <StarPicker value={form.rating} onChange={(v) => set('rating', v)} />
      </div>

      {status === 'error' && (
        <p className="text-danger text-sm">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 text-sm"
      >
        <Send className="w-4 h-4" />
        {status === 'submitting' ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
