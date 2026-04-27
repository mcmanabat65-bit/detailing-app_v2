'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export function ProtectedRoute({ children }) {
  const { adminSession, hydrated } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !adminSession) {
      const next = encodeURIComponent(pathname || '/admin/dashboard');
      router.replace(`/admin/login?next=${next}`);
    }
  }, [hydrated, adminSession, pathname, router]);

  // While we don't know yet (server render or pre-hydration), render nothing
  // to avoid a flash of protected content.
  if (!hydrated || !adminSession) return null;

  return children;
}
