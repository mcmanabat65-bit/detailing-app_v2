'use client';

import { usePathname } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';
import { isSupabaseConfigured } from '@/lib/supabase';

export function Providers({ children }) {
  const pathname = usePathname();
  // Admin console and member portal both supply their own layout chrome, so the
  // public Navbar/Footer are suppressed there.
  const isAppShell =
    pathname?.startsWith('/admin') || pathname?.startsWith('/portal');

  return (
    <AppProvider>
      {!isSupabaseConfigured && <SupabaseBanner />}
      <SupabaseErrorBanner />
      {!isAppShell && <Navbar />}
      {children}
      {!isAppShell && <Footer />}
      <ToastContainer />
    </AppProvider>
  );
}

function SupabaseErrorBanner() {
  const { supabaseError } = useApp();
  if (!supabaseError) return null;
  return (
    <div className="bg-danger/15 border-b border-danger/40 text-center text-xs px-4 py-2 text-cream/90">
      <span className="font-semibold text-danger">Database unreachable.</span>{' '}
      {supabaseError}{' '}
      <button
        onClick={() => window.location.reload()}
        className="underline text-gold/90 hover:text-gold ml-1"
      >
        Reload
      </button>
    </div>
  );
}

function SupabaseBanner() {
  return (
    <div className="bg-danger/15 border-b border-danger/40 text-center text-xs px-4 py-2 text-cream/90">
      <span className="font-semibold text-danger">Database not connected.</span>{' '}
      Set <code className="text-gold/90">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
      <code className="text-gold/90">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in{' '}
      <code className="text-gold/90">.env.local</code>, run{' '}
      <code className="text-gold/90">supabase/schema.sql</code>, then restart the
      dev server.
    </div>
  );
}
