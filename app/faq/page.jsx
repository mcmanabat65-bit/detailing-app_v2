'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ArrowRight } from 'lucide-react';

const faqs = [
  {
    category: 'Bookings & Scheduling',
    items: [
      {
        q: 'Do I need an appointment?',
        a: 'Yes — all services are by appointment only. This ensures our full attention is on your vehicle and that a detailer slot is reserved just for you. Walk-ins are not accepted.',
      },
      {
        q: 'How far in advance should I book?',
        a: 'We recommend booking at least 2–3 days ahead, especially for premium packages like Ceramic Coating or The Obsidian Elite. Same-day bookings are rarely available.',
      },
      {
        q: 'Can I reschedule or cancel my appointment?',
        a: 'Yes. Contact us as early as possible if you need to reschedule. Cancellations made less than 24 hours before your appointment may affect your priority status for future bookings.',
      },
      {
        q: 'Do you service motorcycles and big bikes?',
        a: 'Yes, we detail motorcycles and big bikes in addition to cars and SUVs. Select the correct vehicle type when booking so the right package and detailer are assigned.',
      },
    ],
  },
  {
    category: 'Services & Packages',
    items: [
      {
        q: 'What is the difference between a car wash and auto detailing?',
        a: 'A car wash is a quick exterior rinse. Auto detailing is a thorough, hand-crafted process — cleaning, polishing, and protecting every surface inside and out — using professional-grade products. The results last significantly longer.',
      },
      {
        q: 'How long does a detailing session take?',
        a: 'It depends on the package. The Essential takes 2–3 hours, The Executive 4–5 hours, and full-day packages like The Obsidian Elite or Ceramic Coating can run 6–8 hours or span 1–2 days. Exact times are listed on each service.',
      },
      {
        q: 'Is ceramic coating worth it?',
        a: 'For vehicles that stay on the road regularly, yes. Ceramic coating provides hydrophobic protection, UV resistance, and a deep gloss that lasts years — not weeks. We include paint correction before application to ensure a flawless base.',
      },
      {
        q: 'How often should I get my car detailed?',
        a: 'For most vehicles, a full detail every 3–6 months is ideal. If you drive daily or park outdoors, quarterly is better. Ceramic-coated vehicles need less frequent deep cleaning but benefit from periodic maintenance details.',
      },
      {
        q: 'Can I add extras to my package?',
        a: 'Yes. When confirming your booking, you can request add-ons such as engine bay cleaning, odor treatment, or headlight restoration. Our admin team will update your order accordingly.',
      },
    ],
  },
  {
    category: 'Pricing & Payment',
    items: [
      {
        q: 'How much do your services cost?',
        a: 'Our packages start at ₱1,500 for The Essential and go up to ₱12,000 for Ceramic Coating. Full pricing is visible after logging in or visiting our Services page. VIP members receive a 10% discount on every visit.',
      },
      {
        q: 'What payment methods do you accept?',
        a: 'We accept cash and major digital payment methods on-site. Payment is collected upon completion of service. No deposit is required to hold your booking.',
      },
      {
        q: 'Do you offer gift certificates?',
        a: 'Yes. Gift certificates for any package are available — contact us directly at hello@samahuzai.ph or visit the shop to purchase one.',
      },
    ],
  },
  {
    category: 'VIP Membership',
    items: [
      {
        q: 'What are the benefits of VIP membership?',
        a: 'VIP members enjoy a 10% discount on all services, priority scheduling, free barista-made coffee during their visit, access to the private members-only lounge, and a birthday month special offer.',
      },
      {
        q: 'How do I become a VIP member?',
        a: 'Visit us in person first so we can meet you — our membership is relationship-based, not transactional. After your first visit, you can submit your application online via the Membership page and our team will review it.',
      },
      {
        q: 'Is there a membership fee?',
        a: 'There is no annual fee. Membership is by invitation and application only, and approved members enjoy all perks at no extra cost beyond the services they book.',
      },
    ],
  },
  {
    category: 'At the Shop',
    items: [
      {
        q: 'Can I wait while my car is being detailed?',
        a: 'Absolutely. We have a comfortable waiting area on-site. VIP members have exclusive access to the private lounge with espresso, leather seating, and silent WiFi.',
      },
      {
        q: 'Where are you located?',
        a: 'We are located at Brgy. San Francisco, Halang Rd, Biñan, Laguna 4024. We are open Monday through Sunday, 7:00 AM to 5:00 PM.',
      },
      {
        q: 'What products do you use?',
        a: 'We use premium-grade professional detailing products including clay bars, ceramic-grade coatings, pH-balanced shampoos, and high-grade leather conditioners. We never use abrasive or generic consumer-grade products.',
      },
    ],
  },
];

function AccordionItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border-b border-white/8 last:border-0`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
        aria-expanded={open}
      >
        <span className={`text-sm md:text-base font-medium transition-colors ${open ? 'text-gold' : 'text-cream group-hover:text-gold'}`}>
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-gold' : 'text-muted'}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-muted text-sm leading-relaxed pb-5">{a}</p>
      </div>
    </div>
  );
}

export default function FaqPage() {
  return (
    <div className="page-enter pt-28 md:pt-36 pb-24">
      <div className="max-w-3xl mx-auto px-5 md:px-8">

        {/* Header */}
        <div className="mb-14">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            Got Questions?
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-cream mb-5">
            Frequently Asked Questions
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            Everything you need to know before your first visit — or your next one.
          </p>
        </div>

        {/* FAQ sections */}
        <div className="space-y-10">
          {faqs.map((section) => (
            <section key={section.category}>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-5 h-px bg-gold" />
                <h2 className="text-gold text-xs tracking-[0.25em] uppercase">
                  {section.category}
                </h2>
              </div>
              <div className="glass-card rounded-md px-6">
                {section.items.map((item) => (
                  <AccordionItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 glass-card rounded-md p-8 text-center">
          <h3 className="font-serif text-2xl text-cream mb-2">
            Still have questions?
          </h3>
          <p className="text-muted text-sm mb-6">
            Reach us at{' '}
            <a href="mailto:hello@samahuzai.ph" className="text-gold hover:underline">
              hello@samahuzai.ph
            </a>{' '}
            or call{' '}
            <a href="tel:+639276914863" className="text-gold hover:underline">
              +63 927 691 4863
            </a>
            .
          </p>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
          >
            Book an Appointment
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </div>
  );
}
