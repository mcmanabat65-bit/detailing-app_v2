'use client';

import { usePathname } from 'next/navigation';
import { AppProvider } from '@/context/AppContext';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ToastContainer } from '@/components/Toast';
import { isSupabaseConfigured } from '@/lib/supabase';

export function Providers({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  return (
    <AppProvider>
      {!isSupabaseConfigured && <SupabaseBanner />}
      {!isAdmin && <Navbar />}
      {children}
      {!isAdmin && <Footer />}
      <ToastContainer />
    </AppProvider>
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
