'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Crown, Lock, Mail, MailCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function MemberSignupPage() {
  const { memberSignUp, adminSession, accountType, showToast } = useApp();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState(false);

  // If a session becomes active and resolves to a member, go to the portal.
  useEffect(() => {
    if (adminSession && accountType === 'member') router.replace('/portal');
  }, [adminSession, accountType, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    const result = await memberSignUp(form.email, form.password);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setConfirmEmail(true);
      showToast('Check your inbox to confirm your email.', 'info');
      return;
    }
    showToast('Account created — welcome.', 'success');
    // useEffect handles the redirect once accountType resolves to 'member'.
  };

  if (confirmEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center px-5 py-20 bg-obsidian">
        <div className="relative w-full max-w-md text-center glass-card rounded-md p-8">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-serif text-3xl text-cream mb-3">Confirm your email</h1>
          <p className="text-muted text-sm leading-relaxed mb-6">
            We sent a confirmation link to{' '}
            <span className="text-cream/80">{form.email}</span>. Click it, then
            sign in to access your portal.
          </p>
          <Link
            href="/portal/login"
            className="inline-block px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors text-sm"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

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
          <div className="font-serif text-3xl text-cream">Set up your login</div>
          <div className="text-muted text-sm mt-1">For approved VIP members</div>
        </div>

        <div className="mb-5 flex gap-3 bg-gold/5 border border-gold/20 rounded-md px-4 py-3 text-xs text-cream/70 leading-relaxed">
          <Check className="w-4 h-4 text-gold shrink-0 mt-0.5" />
          <span>
            Use the same email from your approved membership. If it isn&apos;t
            approved yet, the portal will stay locked until a manager approves
            you.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="glass-card rounded-md p-7 space-y-5">
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
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                placeholder="you@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                minLength={6}
                value={form.confirm}
                onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                placeholder="••••••••"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>

          <p className="text-center text-sm text-muted">
            Already have a login?{' '}
            <Link href="/portal/login" className="text-gold hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
