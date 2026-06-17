'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Crown, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const SESSION_TIMEOUT_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const SESSION_START_KEY = 'obsidian_session_start';

/**
 * Gate for the member portal (/portal/*). Mirrors ProtectedRoute but requires
 * an approved-member session.
 *  - Not signed in        → /portal/login
 *  - Signed in as admin   → /admin/dashboard
 *  - Signed in, not yet an approved member → inline notice (no redirect loop)
 */
export function MemberRoute({ children }) {
  const { adminSession, hydrated, accountType, signOut } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Mirror the admin 3-day absolute timeout (shared localStorage key).
  useEffect(() => {
    if (adminSession) {
      if (!localStorage.getItem(SESSION_START_KEY)) {
        localStorage.setItem(SESSION_START_KEY, String(Date.now()));
      }
    } else {
      localStorage.removeItem(SESSION_START_KEY);
    }
  }, [adminSession]);

  useEffect(() => {
    if (!adminSession) return;
    const tick = () => {
      const start = Number(localStorage.getItem(SESSION_START_KEY) || 0);
      if (start && Date.now() - start >= SESSION_TIMEOUT_MS) signOut();
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [adminSession, signOut]);

  useEffect(() => {
    if (!hydrated) return;
    if (!adminSession) {
      const next = encodeURIComponent(pathname || '/portal');
      router.replace(`/portal/login?next=${next}`);
      return;
    }
    if (accountType === 'admin') router.replace('/admin/dashboard');
  }, [hydrated, adminSession, accountType, pathname, router]);

  if (!hydrated || !adminSession) return null;
  if (accountType === 'admin') return null;

  // Authenticated, but not (yet) an approved member. Could be: a sign-up whose
  // email isn't an approved member, or an approved member whose status was
  // changed. Show a friendly notice rather than bouncing in a loop.
  if (accountType !== 'member') {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center px-5 py-20">
        <div className="max-w-md w-full text-center glass-card rounded-md p-8">
          <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto mb-5">
            <Crown className="w-6 h-6 text-gold" />
          </div>
          <h1 className="font-serif text-3xl text-cream mb-3">
            Membership not active
          </h1>
          <p className="text-muted text-sm leading-relaxed mb-6">
            This email isn&apos;t linked to an approved VIP membership yet. VIP
            membership begins with a visit to the shop — once a manager approves
            your application, your portal unlocks automatically.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/membership"
              className="px-5 py-2.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors text-sm"
            >
              Learn about VIP membership
            </a>
            <button
              onClick={async () => {
                await signOut();
                router.replace('/portal/login');
              }}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
