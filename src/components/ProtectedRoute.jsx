'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';

const SESSION_TIMEOUT_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SESSION_START_KEY = 'obsidian_session_start';

export function ProtectedRoute({ children, permission = null }) {
  const { adminSession, hydrated, signOut, adminRole, accountType, adminUsersHydrated, can } = useApp();
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
    if (!adminSession) {
      const next = encodeURIComponent(pathname || '/admin/dashboard');
      router.replace(`/admin/login?next=${next}`);
      return;
    }
    // Signed in, but as a member (or an account that is neither admin nor a
    // resolving role). Members belong in the portal; bounce them there.
    if (accountType === 'member') {
      router.replace('/portal');
      return;
    }
    // Signed in but resolved to no admin access at all (not an admin row, not an
    // approved member, and a super_admin already exists). Don't sit on a blank
    // ProtectedRoute — send them to the public site. adminUsersHydrated guards
    // against firing while the role is still resolving.
    if (accountType == null && adminUsersHydrated) {
      router.replace('/');
    }
  }, [hydrated, adminSession, accountType, adminUsersHydrated, pathname, router]);

  // Role-based gate: once the role has resolved, bounce admins who lack the
  // required permission back to the dashboard (which both roles can view).
  useEffect(() => {
    if (!hydrated || !adminSession) return;
    if (!permission) return;
    if (adminRole == null) return; // still resolving
    if (!can(permission)) router.replace('/admin/dashboard');
  }, [hydrated, adminSession, permission, adminRole, can, router]);

  if (!hydrated || !adminSession) return null;
  // Only admins render admin pages. While the role is still resolving
  // (accountType null) we hold off to avoid flashing the wrong UI.
  if (accountType !== 'admin') return null;
  // When a permission is required, wait for the role then enforce it.
  if (permission) {
    if (adminRole == null) return null;
    if (!can(permission)) return null;
  }

  return children;
}
