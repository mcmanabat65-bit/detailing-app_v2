'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Menu, X, Crown } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const links = [
  { href: '/', label: 'Home' },
  // { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  // { href: '/booking', label: 'Book' },
  { href: '/membership', label: 'Membership' },
  { href: '/faq', label: 'FAQ' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/live', label: 'Live', live: true },
];

const isActiveLink = (pathname, href) =>
  href === '/' ? pathname === '/' : pathname?.startsWith(href);

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { accountType } = useApp();
  const isMember = accountType === 'member';
  const memberLink = isMember
    ? { href: '/portal', label: 'My Account' }
    : { href: '/portal/login', label: 'Member Login' };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled
          ? 'bg-obsidian/85 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 md:h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-md overflow-hidden shadow-lg shadow-gold/20">
            <Image src="/samahuzai-logo.png" alt="Samahuzai logo" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <div className="leading-none">
            <div className="font-serif text-lg md:text-xl text-cream tracking-wide">
              Samahuzai Carwash &
            </div>
            <div className="text-[10px] tracking-[0.25em] text-gold/80 uppercase">
              Auto Detailing
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => {
            const active = isActiveLink(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm tracking-wide transition-colors hover:text-gold flex items-center gap-1.5 ${
                  active ? 'text-gold' : 'text-cream/80'
                }`}
              >
                {l.live && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
                )}
                {l.label}
              </Link>
            );
          })}
          <Link
            href={memberLink.href}
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-gold/40 text-gold text-sm font-semibold rounded-sm hover:bg-gold hover:text-obsidian transition-colors"
          >
            <Crown className="w-3.5 h-3.5" />
            {memberLink.label}
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="md:hidden text-cream p-2"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-[max-height,opacity] duration-300 bg-obsidian/95 backdrop-blur-lg ${
          open ? 'max-h-96 opacity-100 border-b border-white/5' : 'max-h-0 opacity-0'
        }`}
      >
        <nav className="px-5 py-6 flex flex-col gap-4">
          {links.map((l) => {
            const active = isActiveLink(pathname, l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-base py-2 border-b border-white/5 flex items-center gap-2 ${
                  active ? 'text-gold' : 'text-cream/85'
                }`}
              >
                {l.live && (
                  <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse shrink-0" />
                )}
                {l.label}
              </Link>
            );
          })}
          <Link
            href={memberLink.href}
            className="mt-2 px-5 py-3 bg-gold text-obsidian text-center font-semibold rounded-sm inline-flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4" />
            {memberLink.label}
          </Link>
        </nav>
      </div>
    </header>
  );
}
