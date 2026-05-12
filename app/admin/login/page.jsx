'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, Sparkles } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { supabase } from '@/lib/supabase';

function LoginForm() {
  const { showToast } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creds, setCreds] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!supabase) {
      setError('Database not connected. Set Supabase env vars and reload.');
      setLoading(false);
      return;
    }

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: creds.email.trim(),
      password: creds.password,
    });

    setLoading(false);

    if (authError || !data.session) {
      setError('Invalid credentials. Try again.');
      return;
    }

    // Mark that we just logged in so ProtectedRoute skips its redirect check
    // for the brief window before onAuthStateChange updates adminSession.
    sessionStorage.setItem('obsidian_just_logged_in', '1');

    showToast('Welcome back, Admin.', 'success');
    const next = searchParams.get('next') || '/admin/dashboard';
    router.replace(next);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-20 bg-obsidian relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-20"
        style={{
          background:
            'radial-gradient(50% 50% at 50% 30%, rgba(0,112,74,0.25), transparent 60%)',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-md bg-gradient-to-br from-gold to-gold-light items-center justify-center shadow-lg shadow-gold/30 mb-4">
            <Sparkles className="w-5 h-5 text-obsidian" strokeWidth={2.5} />
          </div>
          <div className="font-serif text-3xl text-cream">Admin Console</div>
          <div className="text-muted text-sm mt-1">Samahuzai Carwash and Auto Detailing</div>
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
                value={creds.email}
                onChange={(e) => setCreds((c) => ({ ...c, email: e.target.value }))}
                className="w-full bg-surface/70 border border-white/10 rounded-sm py-2.5 pl-10 pr-3 text-cream"
                placeholder="admin@example.com"
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
                value={creds.password}
                onChange={(e) => setCreds((c) => ({ ...c, password: e.target.value }))}
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
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
