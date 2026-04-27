import Link from 'next/link';
import {
  Award,
  Sparkles,
  Crown,
  ArrowRight,
  Star,
  Quote,
  Coffee,
  Calendar,
  Percent,
  Wifi,
  Cake,
} from 'lucide-react';
import { services, formatCurrency } from '@/data/services';

const features = [
  {
    icon: Award,
    title: 'Certified Detailers',
    body: 'Our team is trained and certified by international detailing institutes — every wash is artistry, not assembly-line.',
  },
  {
    icon: Sparkles,
    title: 'Premium Products',
    body: "Only Koch-Chemie, Gyeon, and Meguiar's flagship lines touch your paintwork. No supermarket shampoos. Ever.",
  },
  {
    icon: Crown,
    title: 'VIP Lounge',
    body: "A private members' lounge with espresso bar, plush leather, and silent WiFi. Wait the way you deserve.",
  },
];

const testimonials = [
  {
    name: 'Andres Mariano',
    car: '911 Carrera S Owner',
    quote:
      'I have been to every detailer in BGC. Don Miguel is the only one I trust with the Porsche. The finish is mirror-grade.',
    rating: 5,
  },
  {
    name: 'Patricia Lim',
    car: 'Range Rover Velar',
    quote:
      'The lounge alone is worth it. I came in for a wash and left feeling like I had spent the morning at a five-star hotel.',
    rating: 5,
  },
  {
    name: 'Miguel Tan',
    car: 'BMW M3 Competition',
    quote:
      'Ceramic coating turned out flawless. Six months in, still beading like the day I drove out. Worth every peso.',
    rating: 5,
  },
];

export default function LandingPage() {
  return (
    <div className="page-enter">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-obsidian">
        {/* Ambient motion — slow-drifting gold light orbs. Pure CSS, no
            assets. Replace with a real video later by reverting to a
            <video> element here. */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-obsidian via-[#0d0d10] to-[#13110a]" />
          <div className="hero-orb hero-orb--a" aria-hidden="true" />
          <div className="hero-orb hero-orb--b" aria-hidden="true" />
          <div className="hero-orb hero-orb--c" aria-hidden="true" />
          <div className="hero-sheen" aria-hidden="true" />
        </div>

        {/* Tint + vignette so the gold copy stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/80 via-obsidian/40 to-obsidian/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-32 md:pt-40 pb-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-gold/90 mb-6">
              <span className="w-8 h-px bg-gold" />
              Est. 2018 &middot; Manila
            </div>
            <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl leading-[1.05] mb-6">
              <span className="gold-shimmer">DON MIGUEL</span>
              <br />
              <span className="text-cream">DETAILING</span>
            </h1>
            <p className="text-cream/75 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
              Where your vehicle becomes a statement. Hand-crafted detailing
              and ceramic coating, reserved by appointment only.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/booking"
                className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-all shadow-lg shadow-gold/20"
              >
                Book an Appointment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/membership"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-cream/20 text-cream rounded-sm hover:border-gold hover:text-gold transition-all"
              >
                Explore Membership
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 text-muted text-xs tracking-widest uppercase animate-pulse">
          Scroll
        </div>
      </section>

      {/* WHY DON MIGUEL */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            The Difference
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">
            Why Don Miguel?
          </h2>
          <p className="text-muted">
            Three pillars define every detail we deliver.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 stagger">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="glass-card card-hover rounded-md p-8 animate-fade-in"
              >
                <div className="w-12 h-12 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-gold" />
                </div>
                <h3 className="font-serif text-2xl text-cream mb-3">
                  {f.title}
                </h3>
                <p className="text-muted leading-relaxed text-sm">{f.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* SERVICES PREVIEW */}
      <section className="py-20 md:py-28 bg-surface/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="flex items-end justify-between mb-10 flex-wrap gap-4">
            <div>
              <div className="text-gold text-xs tracking-[0.3em] uppercase mb-2">
                Signature Packages
              </div>
              <h2 className="font-serif text-4xl md:text-5xl text-cream">
                Our Services
              </h2>
            </div>
            <Link
              href="/services"
              className="text-sm text-cream/80 hover:text-gold inline-flex items-center gap-1 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-4 -mx-5 px-5">
            {services.map((s) => (
              <Link
                key={s.id}
                href={`/booking?service=${s.id}`}
                className="min-w-[280px] md:min-w-[320px] glass-card card-hover rounded-md p-6 group"
              >
                <div className="flex items-start justify-between mb-6">
                  <span className="text-xs uppercase tracking-widest text-gold/80">
                    {s.category}
                  </span>
                  {s.popular && (
                    <span className="vip-badge">Most Popular</span>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-cream mb-2">
                  {s.name}
                </h3>
                <div className="text-muted text-sm mb-5">{s.duration}</div>
                <div className="text-gold text-3xl font-light mb-6">
                  {formatCurrency(s.price)}
                </div>
                <div className="text-sm text-cream/70 group-hover:text-gold transition-colors flex items-center gap-1">
                  Reserve this package
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* VIP TEASER */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
              Members Only
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6">
              Step inside the lounge.
            </h2>
            <p className="text-muted text-lg mb-8 leading-relaxed">
              VIP membership unlocks a private waiting experience reserved for
              clients who treat their vehicles as more than transportation.
            </p>
            <ul className="space-y-3 mb-10">
              {[
                { icon: Coffee, text: 'Free barista-made coffee while you wait' },
                { icon: Calendar, text: 'Priority scheduling — first pick of slots' },
                { icon: Percent, text: '10% discount on every service, every visit' },
                { icon: Wifi, text: 'Members-only lounge with silent WiFi' },
                { icon: Cake, text: 'Birthday month special offer' },
              ].map(({ icon: I, text }) => (
                <li key={text} className="flex items-center gap-3 text-cream/85">
                  <I className="w-4 h-4 text-gold shrink-0" />
                  {text}
                </li>
              ))}
            </ul>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
            >
              Become a Member
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gold/10 blur-3xl rounded-full" />
            <div className="relative gold-gradient rounded-2xl p-8 aspect-[1.6/1] flex flex-col justify-between shadow-2xl shadow-black/50 transform md:rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-obsidian/70 text-[10px] tracking-[0.3em] uppercase">
                    Don Miguel
                  </div>
                  <div className="text-obsidian font-serif text-2xl">
                    VIP Member
                  </div>
                </div>
                <Crown className="w-7 h-7 text-obsidian" />
              </div>
              <div>
                <div className="text-obsidian/60 text-[10px] tracking-widest uppercase mb-1">
                  Member
                </div>
                <div className="font-serif text-xl text-obsidian mb-3">
                  YOUR NAME HERE
                </div>
                <div className="flex justify-between text-[10px] tracking-widest uppercase text-obsidian/70">
                  <span>Since 2026</span>
                  <span>No. 0001</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 md:py-32 bg-surface/30 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
              Words from clients
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream">
              Driven by trust.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 stagger">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="glass-card rounded-md p-7 animate-fade-in"
              >
                <Quote className="w-6 h-6 text-gold mb-4" />
                <p className="text-cream/85 leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 text-gold fill-gold"
                    />
                  ))}
                </div>
                <div className="text-cream font-medium">{t.name}</div>
                <div className="text-muted text-sm">{t.car}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
