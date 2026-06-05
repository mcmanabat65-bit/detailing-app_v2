'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  CalendarDays,
  Users,
  UserCog,
  LogOut,
  Menu,
  Monitor,
  Settings as SettingsIcon,
  X,
  Wrench,
  Car,
  Coffee,
  Tag,
  Quote,
  ListPlus,
} from 'lucide-react';
import Image from 'next/image';
import { useApp } from '@/context/AppContext';

const links = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/bookings', label: 'Bookings', icon: ClipboardList },
  { href: '/admin/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/admin/members', label: 'VIP Members', icon: Users },
  { href: '/admin/detailers', label: 'Detailers', icon: UserCog },
  { href: '/admin/monitor', label: 'Shop Monitor', icon: Monitor },
  { href: '/admin/cars', label: 'Cars', icon: Car },
  { href: '/admin/services', label: 'Services', icon: Wrench },
  { href: '/admin/addons', label: 'Add-Ons', icon: ListPlus },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/coffees', label: 'Coffee Menu', icon: Coffee },
  { href: '/admin/testimonials', label: 'Testimonials', icon: Quote },
  { href: '/admin/settings', label: 'Settings', icon: SettingsIcon },
];

export function AdminLayout({ children, title }) {
  const { signOut, showToast } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    showToast('Signed out.', 'info');
    router.push('/admin/login');
  };

  const isActive = (href) =>
    pathname === href || pathname?.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-obsidian flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/5 bg-surface/30 sticky top-0 h-screen overflow-y-auto">
        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 px-6 h-20 border-b border-white/5"
        >
          <div className="w-12 h-12 rounded-md overflow-hidden shadow-lg shadow-gold/20 shrink-0">
            <Image src="/samahuzai-logo.png" alt="Samahuzai logo" width={48} height={48} className="w-full h-full object-cover" />
          </div>
          <div className="leading-none">
            <div className="font-serif text-lg text-cream">Samahuzai Carwash and Auto Detailing</div>
            <div className="text-[9px] tracking-[0.3em] text-gold uppercase">
              Admin Console
            </div>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-6 space-y-1">
          {links.map((l) => {
            const I = l.icon;
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm transition-colors ${
                  active
                    ? 'bg-gold/10 text-gold border-l-2 border-gold'
                    : 'text-cream/70 hover:bg-white/5 hover:text-cream border-l-2 border-transparent'
                }`}
              >
                <I className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm text-cream/70 hover:bg-danger/10 hover:text-danger transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 z-40"
        />
      )}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-64 z-50 bg-surface border-r border-white/10 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/5">
          <div className="font-serif text-cream">Admin Console</div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            className="text-cream"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {links.map((l) => {
            const I = l.icon;
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm ${
                  active ? 'bg-gold/10 text-gold' : 'text-cream/70'
                }`}
              >
                <I className="w-4 h-4" />
                {l.label}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-sm text-sm text-cream/70 hover:text-danger"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 md:h-20 px-5 md:px-8 flex items-center justify-between border-b border-white/5 bg-obsidian/80 backdrop-blur-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="md:hidden text-cream"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-serif text-xl md:text-2xl text-cream">
              {title}
            </h1>
          </div>
          <Link
            href="/"
            className="text-xs text-muted hover:text-gold transition-colors"
          >
            ← View public site
          </Link>
        </header>

        <main className="flex-1 px-5 md:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
