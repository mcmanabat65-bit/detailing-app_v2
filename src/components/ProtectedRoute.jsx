'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const SESSION_TIMEOUT_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SESSION_START_KEY = 'obsidian_session_start';

export function ProtectedRoute({ children }) {
  const { adminSession, hydrated, signOut } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Record session start time on login; clear on logout.
  // Uses localStorage so it persists across browser restarts and tab closes.
  useEffect(() => {
    if (adminSession) {
      if (!localStorage.getItem(SESSION_START_KEY)) {
        localStorage.setItem(SESSION_START_KEY, String(Date.now()));
      }
    } else {
      localStorage.removeItem(SESSION_START_KEY);
    }
  }, [adminSession]);

  // Enforce 3-day absolute timeout, checked every minute.
  useEffect(() => {
    if (!adminSession) return;
    const tick = () => {
      const start = Number(localStorage.getItem(SESSION_START_KEY) || 0);
      if (start && Date.now() - start >= SESSION_TIMEOUT_MS) {
        signOut();
      }
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [adminSession, signOut]);

  useEffect(() => {
    if (!hydrated) return;
    if (adminSession) return;
    const next = encodeURIComponent(pathname || '/admin/dashboard');
    router.replace(`/admin/login?next=${next}`);
  }, [hydrated, adminSession, pathname, router]);

  if (!hydrated || !adminSession) return null;

  return children;
}
