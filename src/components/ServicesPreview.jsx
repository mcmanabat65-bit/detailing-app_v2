'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { formatCurrency } from '@/data/services';
import { useApp } from '@/context/AppContext';

export function ServicesPreview({ services }) {
  const { adminSession } = useApp();

  return (
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
            {adminSession ? formatCurrency(s.price) : (
              <span className="text-muted text-base tracking-widest uppercase"></span>
            )}
          </div>
          <div className="text-sm text-cream/70 group-hover:text-gold transition-colors flex items-center gap-1">
            Reserve this package
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      ))}
    </div>
  );
}