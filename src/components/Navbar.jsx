'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Sparkles } from 'lucide-react';

const links = [
  { href: '/', label: 'Home' },
  { href: '/services', label: 'Services' },
  { href: '/booking', label: 'Book' },
  { href: '/membership', label: 'Membership' },
];

const isActiveLink = (pathname, href) =>
  href === '/' ? pathname === '/' : pathname?.startsWith(href);

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
          <div className="w-9 h-9 rounded-md bg-gradient-to-br from-gold to-gold-light flex items-center justify-center shadow-lg shadow-gold/20">
            <Sparkles className="w-4 h-4 text-obsidian" strokeWidth={2.5} />
          </div>
          <div className="leading-none">
            <div className="font-serif text-lg md:text-xl text-cream tracking-wide">
              DON MIGUEL
            </div>
            <div className="text-[10px] tracking-[0.25em] text-gold/80 uppercase">
              Detailing
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
                className={`text-sm tracking-wide transition-colors hover:text-gold ${
                  active ? 'text-gold' : 'text-cream/80'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/booking"
            className="px-5 py-2 bg-gold text-obsidian text-sm font-semibold rounded-sm hover:bg-gold-light transition-colors"
          >
            Reserve
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
                className={`text-base py-2 border-b border-white/5 ${
                  active ? 'text-gold' : 'text-cream/85'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link
            href="/booking"
            className="mt-2 px-5 py-3 bg-gold text-obsidian text-center font-semibold rounded-sm"
          >
            Reserve a Slot
          </Link>
        </nav>
      </div>
    </header>
  );
}
