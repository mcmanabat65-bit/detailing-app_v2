import Link from 'next/link';
import { Sparkles, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-obsidian flex flex-col items-center justify-center px-5 text-center">
      {/* Logo mark */}
      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center mb-8 shadow-lg shadow-gold/20">
        <Sparkles className="w-6 h-6 text-obsidian" strokeWidth={2.5} />
      </div>

      <div className="relative flex flex-col items-center">
        {/* 404 ghost text — sits behind, not overlapping content */}
        <div className="text-[160px] md:text-[220px] font-serif leading-none text-cream/[0.04] select-none pointer-events-none mb-[-60px] md:mb-[-80px]">
          404
        </div>

        <div className="text-gold text-xs tracking-[0.3em] uppercase mb-4">
          Page Not Found
        </div>
        <h1 className="font-serif text-4xl md:text-6xl text-cream mb-4 leading-tight">
          Lost in the detail?
        </h1>
        <p className="text-muted text-sm md:text-base max-w-md mx-auto leading-relaxed mb-10">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved.
          Let&apos;s get you back on the right road.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gold text-obsidian font-semibold rounded-sm hover:bg-gold-light transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
          <Link
            href="/booking"
            className="inline-flex items-center gap-2 px-6 py-3 border border-white/10 text-cream/80 rounded-sm hover:border-gold/50 hover:text-gold transition-colors text-sm"
          >
            Book an Appointment
          </Link>
        </div>
      </div>

      {/* Subtle divider */}
      <div className="absolute bottom-8 text-xs text-muted/40 tracking-widest uppercase">
        Samahuzai Carwash &amp; Auto Detailing
      </div>
    </div>
  );
}
