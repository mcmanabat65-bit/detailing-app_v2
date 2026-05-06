import Link from 'next/link';
import {
  ArrowRight,
  Award,
  Sparkles,
  ShieldCheck,
  Heart,
  MapPin,
  Clock,
  Users,
  Quote,
} from 'lucide-react';

const values = [
  {
    icon: Award,
    title: 'Craftsmanship First',
    body: 'Every vehicle that enters our bay is treated as a commission, not a transaction. We take the time each finish demands — no rushed cuts, no shortcuts.',
  },
  {
    icon: ShieldCheck,
    title: 'Products We Trust',
    body: "We use Koch-Chemie, Gyeon, and Meguiar's flagship lines exclusively. If we wouldn't use it on our own car, it never touches yours.",
  },
  {
    icon: Heart,
    title: 'Client First, Always',
    body: 'From the moment you book to the moment you drive away, every touchpoint is designed around your comfort, your time, and your peace of mind.',
  },
  {
    icon: Users,
    title: 'Continuous Training',
    body: 'Our team holds international detailing certifications and trains regularly. The industry evolves — so do we.',
  },
];

const team = [
  {
    name: 'Mike Manabat',
    role: 'Founder & Head Detailer',
    bio: 'Started Samahuzai out of a deep obsession with luxury cars and a belief that Laguna deserved world-class detailing. 8 years in the trade.',
    initials: 'JE',
  },
  {
    name: 'Azi Acosta',
    role: 'Ceramic Coating Specialist',
    bio: 'Certified by Gyeon and CARPRO. Azi leads every multi-stage coating project and is the reason our ceramic results are flawless, every time.',
    initials: 'AA',
  },
  {
    name: 'Vince Tacloban',
    role: 'Paint Correction Lead',
    bio: "Two years competing in detailing competitions across Southeast Asia. Vince's eye for defect removal is unmatched in the region.",
    initials: 'VT',
  },
];

const milestones = [
  { year: '2024', event: 'First bay opened in General Trias, Cavite' },
  { year: '2025', event: 'Ceramic coating program launched; first 50 VIP members enrolled' },
  { year: '2026', event: 'New facility with dedicated VIP lounge and three detailing bays' },
];

export default function AboutPage() {
  return (
    <div className="page-enter">

      {/* PAGE HERO */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-32 overflow-hidden bg-obsidian">
        <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        <div className="relative max-w-4xl mx-auto px-5 md:px-8 text-center">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-4">
            Est. 2026 &middot; General Trias, Cavite
          </div>
          <h1 className="font-serif text-5xl md:text-7xl text-cream mb-6 leading-tight">
            Built on a<br />
            <span className="gold-shimmer">love for paint.</span>
          </h1>
          <p className="text-cream/70 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            Samahuzai Carwash and Auto Detailing was born from a single conviction —
            that every vehicle deserves to be treated like a work of art.
          </p>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
              Our Story
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6">
              From a single bay to a full studio.
            </h2>
            <div className="space-y-5 text-cream/75 leading-relaxed">
              <p>
                Samahuzai started in a rented single-bay garage in 2024. The founder,
                Mike Manabat, had spent years correcting paint on weekends for friends
                and colleagues who couldn&rsquo;t find a detailer willing to go deep enough.
              </p>
              <p>
                The name comes from a Tagalog word for &ldquo;accompaniment&rdquo; — a reminder
                that every detail we perform is a collaboration between our expertise and
                your trust. You bring us something you love. We bring it back better.
              </p>
              <p>
                Two years and a new facility later, Samahuzai Carwash and Auto Detailing
                has become the go-to studio for owners who take their paint seriously —
                from daily drivers to track-day machines.
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="absolute top-0 bottom-0 left-5 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" />
            <ul className="space-y-10 pl-12">
              {milestones.map((m) => (
                <li key={m.year} className="relative">
                  <div className="absolute -left-[2.65rem] w-4 h-4 rounded-full bg-obsidian border-2 border-gold" />
                  <div className="text-gold text-xs tracking-[0.25em] uppercase mb-1">
                    {m.year}
                  </div>
                  <div className="text-cream leading-relaxed">{m.event}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-24 md:py-32 bg-surface/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
              What We Stand For
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">
              The principles behind every wash.
            </h2>
            <p className="text-muted">
              Premium detailing is more than technique — it is a commitment to doing things right even when no one is watching.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 stagger">
            {values.map((v) => {
              const Icon = v.icon;
              return (
                <div
                  key={v.title}
                  className="glass-card card-hover rounded-md p-7 animate-fade-in"
                >
                  <div className="w-11 h-11 rounded-md bg-gold/10 border border-gold/20 flex items-center justify-center mb-5">
                    <Icon className="w-5 h-5 text-gold" />
                  </div>
                  <h3 className="font-serif text-xl text-cream mb-3">{v.title}</h3>
                  <p className="text-muted text-sm leading-relaxed">{v.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            The People
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-4">
            The hands behind the finish.
          </h2>
          <p className="text-muted">
            Every detailer on our floor is certified, passionate, and obsessed with getting it right.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 stagger">
          {team.map((member) => (
            <div
              key={member.name}
              className="glass-card card-hover rounded-md p-8 animate-fade-in flex flex-col"
            >
              <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mb-6 shadow-lg shadow-gold/20">
                <span className="font-serif text-xl text-obsidian font-semibold">
                  {member.initials}
                </span>
              </div>
              <h3 className="font-serif text-2xl text-cream mb-1">{member.name}</h3>
              <div className="text-gold text-xs tracking-widest uppercase mb-4">
                {member.role}
              </div>
              <p className="text-muted text-sm leading-relaxed flex-1">{member.bio}</p>
            </div>
          ))}
        </div>
      </section>

      {/* QUICK FACTS */}
      <section className="py-20 bg-surface/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-5 md:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5 rounded-md overflow-hidden">
            {[
              { value: '3', label: 'Detailing Bays' },
              { value: '500+', label: 'Cars Detailed' },
              { value: '100%', label: 'Appointment-Based' },
              { value: '2+', label: 'Years of Excellence' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-surface/80 px-8 py-10 text-center"
              >
                <div className="font-serif text-4xl md:text-5xl text-gold mb-2">
                  {stat.value}
                </div>
                <div className="text-muted text-xs uppercase tracking-widest">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCATION */}
      <section className="py-24 md:py-32 max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
              Find Us
            </div>
            <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6">
              Come see the studio.
            </h2>
            <p className="text-cream/70 leading-relaxed mb-8">
              We&rsquo;re appointment-only — every visit is planned so your car gets the
              full attention it deserves the moment it rolls in.
            </p>
            <ul className="space-y-4 mb-10">
              {[
                { icon: MapPin, text: 'General Trias, Cavite, Philippines' },
                { icon: Clock, text: 'Mon – Sat, 8:00 AM – 7:00 PM' },
                { icon: Sparkles, text: 'Appointment required — walk-ins not accepted' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-cream/80">
                  <Icon className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                  {text}
                </li>
              ))}
            </ul>
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
            >
              Reserve Your Slot
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Decorative card */}
          <div className="relative">
            <div className="absolute -inset-6 bg-gold/5 blur-3xl rounded-full" />
            <div className="relative glass-card rounded-md p-8 border border-gold/20 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-gold/15 flex items-center justify-center shrink-0">
                  <Quote className="w-5 h-5 text-gold" />
                </div>
                <div className="text-muted text-sm leading-relaxed">
                  &ldquo;Perfection is not a standard we aspire to — it is the only outcome we accept.&rdquo;
                </div>
              </div>
              <div className="border-t border-white/10 pt-5">
                <div className="text-cream font-medium text-sm">Mike Manabat</div>
                <div className="text-muted text-xs tracking-widest uppercase mt-0.5">
                  Founder, Samahuzai Carwash and Auto Detailing
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-24 md:py-32 bg-surface/30 border-t border-white/5">
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-4">
            Ready?
          </div>
          <h2 className="font-serif text-4xl md:text-5xl text-cream mb-6">
            Your car deserves better.
          </h2>
          <p className="text-muted text-lg mb-10 leading-relaxed">
            Browse our service packages and reserve your appointment today.
            VIP members get priority scheduling and 10% off every visit.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors shadow-lg shadow-gold/20"
            >
              Book an Appointment
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/membership"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-white/15 text-cream rounded-sm hover:border-gold hover:text-gold transition-colors"
            >
              Explore Membership
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
