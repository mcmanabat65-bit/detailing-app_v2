'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Crown, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/context/AppContext';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useApp();
  // 'checking' → verifying the recovery link · 'ready' → show form ·
  // 'invalid' → no valid session · 'done' → password updated
  const [phase, setPhase] = useState('checking');
  const [pw, setPw] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Recovery links land here one of two ways:
  //  · implicit flow  → tokens in the URL hash (#access_token=…&refresh_token=…)
  //  · PKCE flow       → a ?code=… query param the SSR client exchanges itself
  // Establish the recovery session before showing the form so we know the link
  // is valid. We parse the hash explicitly because the SSR browser client does
  // not always auto-consume hash tokens.
  useEffect(() => {
    if (!supabase) {
      setPhase('invalid');
      return;
    }

    const establish = async () => {
      // 1. Implicit flow: tokens in the URL hash.
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : '';
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      const hashError = params.get('error_description') || params.get('error');

      if (access_token && refresh_token) {
        const { error: setErr } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        // Clear the tokens from the address bar once consumed.
        window.history.replaceState(null, '', window.location.pathname);
        setPhase(setErr ? 'invalid' : 'ready');
        return;
      }
      if (hashError) {
        setPhase('invalid');
        return;
      }

      // 2. PKCE / already-established: a session may already exist (the SSR
      //    client exchanges a ?code=… param on load).
      const { data } = await supabase.auth.getSession();
      setPhase(data.session ? 'ready' : 'invalid');
    };

    establish();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (pw.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (pw.password !== pw.confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: pw.password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message || 'Could not update password. Try again.');
      return;
    }

    setPhase('done');
    showToast('Password updated.', 'success');
    setTimeout(() => router.replace('/portal'), 1500);
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
          <div className="font-serif text-3xl text-cream">New Password</div>
          <div className="text-muted text-sm mt-1">Samahuzai Carwash and Auto Detailing</div>
        </div>

        {phase === 'checking' && (
          <div className="glass-card rounded-md p-7 text-center">
            <p className="text-muted text-sm">Verifying your reset link…</p>
          </div>
        )}

        {phase === 'invalid' && (
          <div className="glass-card rounded-md p-7 text-center space-y-4">
            <p className="text-cream font-medium">This link isn&apos;t valid.</p>
            <p className="text-muted text-sm leading-relaxed">
              Your reset link may have expired or already been used. Request a new
              one to continue.
            </p>
            <Link
              href="/portal/forgot-password"
              className="inline-block px-5 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm"
            >
              Request a new link
            </Link>
          </div>
        )}

        {phase === 'done' && (
          <div className="glass-card rounded-md p-7 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-success mx-auto" />
            <p className="text-cream font-medium">Password updated.</p>
            <p className="text-muted text-sm">Taking you to your portal…</p>
          </div>
        )}

        {phase === 'ready' && (
          <form onSubmit={handleSubmit} className="glass-card rounded-md p-7 space-y-5">
            <div>
              <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  autoFocus
                  required
                  value={pw.password}
                  onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
                  className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                  placeholder="At least 6 characters"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] uppercase tracking-widest text-cream/70 mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gold absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
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
              {loading ? 'Updating…' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
