'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, ArrowRight, Star } from 'lucide-react';
import { formatCurrency } from '@/data/services';
import { useApp } from '@/context/AppContext';

export default function ServicesPage() {
  const { services, serviceCategories } = useApp();
  const [filter, setFilter] = useState('all');

  const catMap = useMemo(() => {
    const m = {};
    serviceCategories.forEach((c) => { m[c.slug] = c; });
    return m;
  }, [serviceCategories]);

  // Only show tabs for categories that have at least one service, in sort_order.
  const filterTabs = useMemo(() => {
    const used = new Set(services.map((s) => s.category));
    const active = serviceCategories.filter((c) => used.has(c.slug));
    return [{ slug: 'all', name: 'All' }, ...active];
  }, [services, serviceCategories]);

  const visible = useMemo(
    () => (filter === 'all' ? services : services.filter((s) => s.category === filter)),
    [filter, services]
  );

  return (
    <div className="page-enter pt-28 md:pt-36 pb-20">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="max-w-3xl mb-12">
          <div className="text-gold text-xs tracking-[0.3em] uppercase mb-3">
            The Catalogue
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-cream mb-5">
            Signature Detailing Packages
          </h1>
          <p className="text-muted text-lg leading-relaxed">
            From a quick polish to a full ceramic transformation — every package
            is delivered by certified detailers using only premium-grade products.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-10">
          {filterTabs.map((c) => (
            <button
              key={c.slug}
              onClick={() => setFilter(c.slug)}
              className={`px-4 py-2 text-sm rounded-sm border transition-all ${
                filter === c.slug
                  ? 'bg-gold text-obsidian border-gold'
                  : 'border-white/10 text-cream/70 hover:border-gold/50 hover:text-gold'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 stagger">
          {visible.map((s) => (
            <article
              key={s.id}
              className={`glass-card card-hover rounded-md p-7 flex flex-col animate-fade-in relative overflow-hidden ${
                s.popular ? 'gold-border' : ''
              }`}
            >
              {s.popular && (
                <div className="absolute top-4 right-4 vip-badge">
                  <Star className="w-3 h-3 fill-obsidian" />
                  Popular
                </div>
              )}

              <div className="text-xs uppercase tracking-widest text-gold/80 mb-2">
                {catMap[s.category]?.name ?? s.category}
              </div>
              <h2 className="font-serif text-3xl text-cream mb-2">{s.name}</h2>
              <div className="flex items-center gap-2 text-muted text-sm mb-5">
                <Clock className="w-3.5 h-3.5" />
                {s.duration}
              </div>

              <div className="text-gold text-4xl font-light mb-6">
                {formatCurrency(s.price)}
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {s.inclusions.map((inc) => (
                  <li
                    key={inc}
                    className="flex items-start gap-2 text-sm text-cream/85"
                  >
                    <Check className="w-4 h-4 text-gold mt-0.5 shrink-0" />
                    <span>{inc}</span>
                  </li>
                ))}
              </ul>

              {/* <Link
                href={`/booking?service=${s.id}`}
                className="group inline-flex items-center justify-center gap-2 w-full px-5 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors"
              >
                Book This Package
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link> */}
            </article>
          ))}
        </div>

        {visible.length === 0 && (
          <div className="text-center py-20 text-muted">
            No packages in this category yet.
          </div>
        )}
      </div>
    </div>
  );
}
