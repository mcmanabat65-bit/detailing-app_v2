'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Crown, Mail, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/portal/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Something went wrong. Try again.');
        setLoading(false);
        return;
      }
      // Generic success regardless of whether the email exists.
      setSent(true);
    } catch {
      setError('Network error. Check your connection and try again.');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-20 bg-obsidian relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 30%, rgba(201,168,76,0.25), transparent 60%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-md bg-gradient-to-br from-gold to-gold-light items-center justify-center shadow-lg shadow-gold/30 mb-4">
            <Crown className="w-5 h-5 text-obsidian" strokeWidth={2.5} />
          </div>
          <div className="font-serif text-3xl text-cream">Reset Password</div>
          <div className="text-muted text-sm mt-1">Samahuzai Carwash and Auto Detailing</div>
        </div>

        {sent ? (
          <div className="glass-card rounded-md p-7 text-center space-y-4">
            <p className="text-cream font-medium">Check your inbox.</p>
            <p className="text-muted text-sm leading-relaxed">
              If an approved member account exists for{' '}
              <span className="text-cream">{email.trim()}</span>, we&apos;ve sent a
              password reset link. It expires in 1 hour.
            </p>
            <Link
              href="/portal/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-md p-7 space-y-5">
            <p className="text-muted text-sm leading-relaxed">
              Enter the email on your member account and we&apos;ll send you a link
              to set a new password.
            </p>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                  placeholder="you@email.com"
                />
              </div>
            </div>

            {error && (
              <div className="text-danger text-sm bg-danger/10 border border-danger/30 rounded-sm px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-5 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>

            <p className="text-center text-sm text-muted">
              <Link href="/portal/login" className="text-gold hover:underline">
                Back to sign in
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
