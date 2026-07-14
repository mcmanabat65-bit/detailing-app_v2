'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Coffee,
  Users,
  Sparkles,
  Wifi,
  Music,
  Sofa,
  Heart,
  ArrowRight,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';

// ---------------------------------------------------------------------------
// Gallery collections
// ---------------------------------------------------------------------------
// Each item can optionally carry a real `src` (drop photos into
// /public/baristarkada and set the path). When `src` is missing we render a
// premium gradient tile with a label + emoji so the page looks finished before
// the real photos land. Add/replace freely — the grid and lightbox adapt.
const COLLECTIONS = [
  { key: 'all', label: 'All' },
  { key: 'brews', label: 'The Brews' },
  { key: 'corner', label: 'Hangout Corner' },
  { key: 'barkada', label: 'The Barkada' },
  { key: 'moments', label: 'Moments' },
];

// Photos are pulled from Unsplash (see next.config.js remotePatterns). `tone`
// + `emoji` remain as a graceful fallback if an image fails to load.
const U = (id, w = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const PHOTOS = [
  // Titles are matched to the actual Unsplash subject (verified).
  { id: 1, collection: 'brews', title: 'Latte Art, Freshly Pulled', emoji: '☕', tone: 'from-[#3a2a18] to-[#1a120a]', span: 'md:col-span-2 md:row-span-2', src: U('photo-1587080413959-06b859fb107d', 1400) },
  { id: 2, collection: 'corner', title: 'The Coffee Bar', emoji: '🛋️', tone: 'from-[#12332a] to-[#0a1a14]', src: U('photo-1442975631115-c4f7b05b8a2c') },
  { id: 3, collection: 'barkada', title: 'Barista at Work', emoji: '🤝', tone: 'from-[#2a2410] to-[#14100a]', src: U('photo-1442512595331-e89e73853f31') },
  { id: 4, collection: 'brews', title: 'Cold Brew on Ice', emoji: '🧊', tone: 'from-[#14263a] to-[#0a141f]', src: U('photo-1461023058943-07fcbe16d735') },
  { id: 5, collection: 'moments', title: 'Latte Trio', emoji: '🌇', tone: 'from-[#3a2818] to-[#1f150a]', span: 'md:row-span-2', src: U('photo-1509042239860-f550ce710b93') },
  { id: 6, collection: 'corner', title: 'Window Bar Seats', emoji: '🪟', tone: 'from-[#1a2f2a] to-[#0c1714]', src: U('photo-1554118811-1e0d58224f24') },
  { id: 7, collection: 'corner', title: 'Order at the Counter', emoji: '👋', tone: 'from-[#33261a] to-[#17110a]', src: U('photo-1559305616-3f99cd43e353') },
  { id: 8, collection: 'brews', title: 'Ground, Beans & Brew', emoji: '🎨', tone: 'from-[#2a1f2f] to-[#150f17]', span: 'md:col-span-2', src: U('photo-1495474472287-4d71bcdd2085', 1400) },
  { id: 9, collection: 'brews', title: 'Premium Beans of the Week', emoji: '🫘', tone: 'from-[#2f2013] to-[#170f09]', src: U('photo-1517668808822-9ebb02f2a0e6') },
  { id: 10, collection: 'corner', title: 'The Espresso Station', emoji: '📚', tone: 'from-[#122a33] to-[#0a1519]', src: U('photo-1453614512568-c4024d13c247') },
  { id: 11, collection: 'barkada', title: 'Cheers, Barkada!', emoji: '🫶', tone: 'from-[#332a1a] to-[#17130a]', src: U('photo-1511920170033-f8396924c348') },
  { id: 12, collection: 'moments', title: 'Detailing Day Chill', emoji: '🚗', tone: 'from-[#1a2733] to-[#0c1319]', src: U('photo-1580654712603-eb43273aff33') },
];

const PERKS = [
  { icon: Sofa, title: 'Comfy hangout corner', text: 'Sink into the lounge while your ride gets the royal treatment.' },
  { icon: Wifi, title: 'Free fast Wi-Fi', text: 'Work, scroll, or catch up — the connection is on us.' },
  { icon: Music, title: 'Good tunes, always', text: 'A curated playlist that keeps the barkada vibe alive.' },
  { icon: Coffee, title: 'Barista-crafted brews', text: 'Every cup pulled with care by your friendly baristarkada.' },
];

// ---------------------------------------------------------------------------
// Tile — either a real photo or a premium gradient placeholder.
// ---------------------------------------------------------------------------
function PhotoTile({ photo, onOpen, index }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{ animationDelay: `${index * 0.05}s` }}
      className={`group relative overflow-hidden rounded-xl border border-white/10 animate-fade-in ${photo.span || ''}`}
    >
      {photo.src ? (
        <Image
          src={photo.src}
          alt={photo.title}
          fill
          sizes="(max-width: 768px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-110"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${photo.tone} transition-transform duration-500 group-hover:scale-110`}>
          <div className="absolute inset-0 flex items-center justify-center text-5xl md:text-6xl opacity-80 transition-transform duration-500 group-hover:scale-110">
            {photo.emoji}
          </div>
          {/* soft grain / sheen */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
        </div>
      )}

      {/* gradient scrim + caption */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-70 group-hover:opacity-90 transition-opacity" />
      <div className="absolute left-0 right-0 bottom-0 p-4 text-left translate-y-1 group-hover:translate-y-0 transition-transform">
        <div className="text-[10px] uppercase tracking-widest text-gold/90 mb-0.5">
          {COLLECTIONS.find((c) => c.key === photo.collection)?.label}
        </div>
        <div className="text-cream font-serif text-lg leading-tight">{photo.title}</div>
      </div>
      <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur border border-white/15 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Camera className="w-3.5 h-3.5 text-cream" />
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Lightbox
// ---------------------------------------------------------------------------
function Lightbox({ photos, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, onPrev, onNext]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 animate-fade-in"
    >
      <button onClick={onClose} aria-label="Close" className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-cream transition-colors">
        <X className="w-5 h-5" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onPrev(); }}
        aria-label="Previous"
        className="absolute left-3 md:left-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-cream transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onNext(); }}
        aria-label="Next"
        className="absolute right-3 md:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-cream transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <figure onClick={(e) => e.stopPropagation()} className="max-w-3xl w-full">
        <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {photo.src ? (
            <Image src={photo.src} alt={photo.title} fill sizes="90vw" className="object-cover" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${photo.tone} flex items-center justify-center text-8xl`}>
              {photo.emoji}
            </div>
          )}
        </div>
        <figcaption className="mt-4 text-center">
          <div className="text-[11px] uppercase tracking-widest text-gold/90">
            {COLLECTIONS.find((c) => c.key === photo.collection)?.label}
          </div>
          <div className="font-serif text-2xl text-cream mt-1">{photo.title}</div>
          <div className="text-xs text-muted mt-1">{index + 1} / {photos.length}</div>
        </figcaption>
      </figure>
    </div>
  );
}

export default function BaristarkadaPage() {
  const { coffees } = useApp();
  const [active, setActive] = useState('all');
  const [lightbox, setLightbox] = useState(null); // index into `filtered`

  const filtered = useMemo(
    () => (active === 'all' ? PHOTOS : PHOTOS.filter((p) => p.collection === active)),
    [active]
  );

  // Keep the lightbox valid when the filter changes underneath it.
  useEffect(() => { setLightbox(null); }, [active]);

  const menu = useMemo(
    () => coffees.filter((c) => c.available !== false).map((c) => c.name),
    [coffees]
  );

  const openAt = (i) => setLightbox(i);
  const prev = () => setLightbox((i) => (i - 1 + filtered.length) % filtered.length);
  const next = () => setLightbox((i) => (i + 1) % filtered.length);

  return (
    <div className="page-enter min-h-screen">
      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden pt-32 md:pt-44 pb-20 md:pb-28">
        <div className="hero-orb hero-orb--a" />
        <div className="hero-orb hero-orb--b" />
        <div className="hero-orb hero-orb--c" />
        <div className="hero-sheen" />

        <div className="relative max-w-5xl mx-auto px-5 md:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 bg-gold/5 text-gold text-xs tracking-[0.2em] uppercase mb-6 animate-fade-in">
            <Coffee className="w-3.5 h-3.5" />
            The Coffee Shop
          </div>
          <h1 className="font-serif text-6xl md:text-8xl leading-[0.95] mb-5">
            <span className="gold-shimmer">Baristarkada</span>
          </h1>
          <p className="text-cream/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Where your <span className="text-gold">barista</span> is also your{' '}
            <span className="text-gold">barkada</span>. Grab a cup, kick back, and
            hang out — while your ride gets the detail it deserves.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
            <a
              href="#gallery"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-full hover:bg-gold-light transition-colors"
            >
              <Camera className="w-4 h-4" />
              Peek Inside
            </a>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 px-6 py-3 border border-gold/40 text-gold rounded-full hover:bg-gold hover:text-obsidian transition-colors"
            >
              <Heart className="w-4 h-4" />
              Join the VIP Club
            </Link>
          </div>

          {/* playful floating chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-10 text-xs">
            {['#kwentuhan', '#kapehan', '#chill', '#barkadagoals', '#hangout'].map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-cream/70">
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ================= VIBE / STORY ================= */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">The Vibe</div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-5 leading-tight">
              Detailing takes time.<br />So we made the wait worth it.
            </h2>
            <p className="text-cream/75 leading-relaxed mb-4">
              While the crew works its magic on your car, the Baristarkada corner is
              your home base. Order a hand-crafted brew, claim the comfy sofa, and
              let time pass the fun way — with good coffee and even better company.
            </p>
            <p className="text-cream/75 leading-relaxed">
              No rush, no awkward waiting room. Just that easy{' '}
              <span className="text-gold">barkada</span> feeling — the kind where
              the baristas know your order and your kwento.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {PERKS.map(({ icon: Icon, title, text }) => (
              <div key={title} className="glass-card card-hover rounded-xl p-5">
                <div className="w-11 h-11 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <div className="font-serif text-lg text-cream mb-1">{title}</div>
                <div className="text-xs text-muted leading-relaxed">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section id="gallery" className="max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16 scroll-mt-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-gold text-xs tracking-[0.3em] uppercase mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            The Gallery
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-cream">
            Snapshots from the corner
          </h2>
          <p className="text-cream/70 mt-3 max-w-xl mx-auto">
            Tap any photo to view it up close. New collections drop as the
            barkada grows.
          </p>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {COLLECTIONS.map((c) => {
            const on = active === c.key;
            return (
              <button
                key={c.key}
                onClick={() => setActive(c.key)}
                className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                  on
                    ? 'bg-gold text-obsidian border-gold font-semibold'
                    : 'bg-white/[0.03] text-cream/75 border-white/10 hover:border-gold/40 hover:text-gold'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Masonry-ish grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 auto-rows-[200px] md:auto-rows-[260px] [grid-auto-flow:dense]">
          {filtered.map((photo, i) => (
            <PhotoTile key={photo.id} photo={photo} index={i} onOpen={() => openAt(i)} />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-muted py-16">No photos in this collection yet.</div>
        )}
      </section>

      {/* ================= MENU PEEK ================= */}
      <section className="max-w-5xl mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="glass-card rounded-2xl p-8 md:p-10 relative overflow-hidden">
          <div className="hero-orb hero-orb--b !opacity-30" />
          <div className="relative">
            <div className="flex items-center gap-2 text-gold text-xs tracking-[0.3em] uppercase mb-3">
              <Coffee className="w-3.5 h-3.5" />
              On the Menu
            </div>
            <h2 className="font-serif text-3xl md:text-4xl text-cream mb-6">
              What&apos;s brewing today
            </h2>

            {menu.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                {menu.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/10 text-cream/85 hover:border-gold/40 transition-colors"
                  >
                    <Coffee className="w-3.5 h-3.5 text-gold" />
                    {name}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-muted">Our menu is being freshly ground — check back soon.</p>
            )}

            <div className="mt-8 flex items-center gap-3 text-sm text-cream/70">
              <Users className="w-4 h-4 text-gold shrink-0" />
              <span>
                Every cup is crafted with <span className="text-gold">premium beans and ingredients</span> —
                priced to match.{' '}
                <Link href="/membership" className="text-gold hover:underline">
                  Become a VIP member
                </Link>
                {' '}for priority service and exclusive perks.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <h2 className="font-serif text-4xl md:text-5xl text-cream mb-5">
          Come for the detail.<br />Stay for the barkada.
        </h2>
        <p className="text-cream/75 max-w-xl mx-auto mb-8">
          Book your car in, then pull up a seat. The kettle&apos;s always on at
          Baristarkada.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/services"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-semibold rounded-full hover:bg-gold-light transition-colors"
          >
            View Detailing Services
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/15 text-cream/85 rounded-full hover:border-gold/50 hover:text-gold transition-colors"
          >
            Got questions?
          </Link>
        </div>
      </section>

      {lightbox !== null && (
        <Lightbox
          photos={filtered}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
}
