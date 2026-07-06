import Link from 'next/link';
import { HeroVideo } from '@/components/HeroVideo';
import { ServicesPreview } from '@/components/ServicesPreview';
import { TestimonialForm } from '@/components/TestimonialForm';
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
import { fetchServices, fetchTestimonials } from '@/lib/supabase-server';

const features = [
  {
    icon: Award,
    title: 'Experienced Detailers',
    bullets: [
      { heading: 'Masters of the Shine', desc: 'Our seasoned pros bring years of expertise to every vehicle, delivering flawless finishes and showroom-level care.' },
      { heading: 'Detail Obsessed', desc: 'From hidden crevices to paint perfection, nothing escapes their trained eye.' },
      { heading: 'Trusted Results', desc: 'Passion, skill, and precision — your car deserves nothing less.' },
    ],
  },
  {
    icon: Sparkles,
    title: 'Premium Products',
    bullets: [
      { heading: 'Top-Tier Care', desc: 'We use only premium-grade products for unmatched shine and protection.' },
      { heading: 'Built to Last', desc: 'Advanced coatings and finishes keep your car looking new, longer.' },
      { heading: 'Safe & Effective', desc: 'Gentle on your vehicle, tough on dirt.' },
    ],
  },
  {
    icon: Crown,
    title: 'VIP Lounge',
    body: "A private members' lounge with espresso bar, plush leather, and silent WiFi. Wait the way you deserve.",
  },
];

export default async function LandingPage() {
  const [services, testimonials] = await Promise.all([fetchServices(), fetchTestimonials()]);
  return (
    <div className="page-enter">
      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden bg-obsidian">
        {/* Full-bleed background video — crossfades between two clips */}
        <HeroVideo />

        {/* Layered cinematic overlays — keep these for premium quality */}
        {/* Deep left-to-right shadow so left-aligned copy always pops */}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/90 via-obsidian/55 to-obsidian/10" style={{ zIndex: 3 }} />
        {/* Bottom vignette grounds the section into the page */}
        <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-transparent to-obsidian/30" style={{ zIndex: 3 }} />
        {/* Subtle gold tint on the right — harmonises with brand colour */}
        <div className="absolute inset-0 bg-gradient-to-bl from-[#00704A]/10 via-transparent to-transparent" style={{ zIndex: 3 }} />
        {/* Fine horizontal scanline texture for cinematic depth */}
        <div className="absolute inset-0 hero-scanlines" aria-hidden="true" style={{ zIndex: 4 }} />
        {/* Gold sheen sweep — reused from CSS, still looks great on video */}
        <div className="hero-sheen" aria-hidden="true" style={{ zIndex: 5 }} />

        <div className="relative max-w-7xl mx-auto px-5 md:px-8 pt-32 md:pt-40 pb-20" style={{ zIndex: 10 }}>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-xs tracking-[0.3em] uppercase text-gold/90 mb-6">
              <span className="w-8 h-px bg-gold" />
              Est. 2026 &middot; Biñan, Laguna
            </div>
            <h1 className="font-serif text-4xl md:text-6xl lg:text-7xl leading-[1.1] mb-6">
              <span className="gold-shimmer">SAMAHUZAI</span>
              <br />
              <span className="text-cream">CARWASH &</span>
              <br />
              <span className="text-cream">AUTO DETAILING</span>
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

        <div className="hidden md:block absolute bottom-8 left-1/2 -translate-x-1/2 text-muted text-xs tracking-widest uppercase animate-pulse" style={{ zIndex: 10 }}>
          Scroll
        </div>
      </section>

      {/* WHY Samahuzai Carwash and Auto Detailing */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            The Difference
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">
            Why Samahuzai Carwash and Auto Detailing?
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
                {f.bullets ? (
                  <ul className="space-y-3">
                    {f.bullets.map((b) => (
                      <li key={b.heading} className="flex items-start gap-2.5">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                        <div>
                          <span className="text-cream text-sm font-medium">{b.heading}</span>
                          <p className="text-muted text-sm leading-relaxed mt-0.5">{b.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted leading-relaxed text-sm">{f.body}</p>
                )}
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

          <ServicesPreview services={services} />
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
                { icon: Coffee, text: 'Free barista-made coffee while you wait (7:00 AM – 10:00 AM)' },
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
                    Samahuzai Carwash and Auto Detailing
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
      <section className="pt-24 md:pt-32 pb-14 bg-surface/30 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
              Words from clients
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream">
              Driven by trust.
            </h2>
          </div>

          <div className="flex gap-5 overflow-x-auto hide-scrollbar pb-4 -mx-5 px-5">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="min-w-[300px] w-[300px] md:min-w-[380px] md:w-[380px] glass-card rounded-md p-7 flex-shrink-0 animate-fade-in"
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

          <div className="mt-14 border-t border-white/10 pt-14 max-w-2xl mx-auto">
            <TestimonialForm />
          </div>
        </div>
      </section>
    </div>
  );
}
