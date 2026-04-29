import Link from 'next/link';
import Image from 'next/image';
import { Instagram, Facebook, MessageCircle, MapPin, Phone, Mail } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-obsidian/80 mt-24">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-14 grid md:grid-cols-4 gap-10">
        <div>
          <Image
            src="/logo.jpg"
            alt="Samahuzai Carwash & Auto Detailing"
            width={160}
            height={48}
            className="h-12 w-auto object-contain mb-4"
            style={{ mixBlendMode: 'screen' }}
          />
          <p className="text-sm text-muted leading-relaxed">
            Perfection is in the details. Premium detailing & ceramic
            coating for vehicles that demand more.
          </p>
        </div>

        <div>
          <h4 className="text-cream text-sm uppercase tracking-widest mb-4 font-sans font-semibold">
            Visit
          </h4>
          <ul className="space-y-3 text-sm text-muted">
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 text-gold shrink-0" />
              <span>
                Unit 12, Acacia Estates Drive,
                <br />
                Taguig City, Metro Manila
              </span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gold" />
              +63 917 555 0123
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gold" />
              hello@donmigueldetailing.ph
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-cream text-sm uppercase tracking-widest mb-4 font-sans font-semibold">
            Explore
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>
              <Link href="/services" className="hover:text-gold transition-colors">
                Services
              </Link>
            </li>
            <li>
              <Link href="/booking" className="hover:text-gold transition-colors">
                Book Appointment
              </Link>
            </li>
            <li>
              <Link href="/membership" className="hover:text-gold transition-colors">
                VIP Membership
              </Link>
            </li>
            <li>
              <Link href="/admin/login" className="hover:text-gold transition-colors">
                Admin
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-cream text-sm uppercase tracking-widest mb-4 font-sans font-semibold">
            Hours
          </h4>
          <ul className="space-y-2 text-sm text-muted">
            <li>Mon – Sat &middot; 8:00 AM – 5:00 PM</li>
            <li>Sun &middot; Closed</li>
          </ul>
          <div className="flex items-center gap-3 mt-5">
            <a
              aria-label="Instagram"
              href="#"
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/40 transition-colors"
            >
              <Instagram className="w-4 h-4" />
            </a>
            <a
              aria-label="Facebook"
              href="#"
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/40 transition-colors"
            >
              <Facebook className="w-4 h-4" />
            </a>
            <a
              aria-label="Messenger"
              href="#"
              className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-cream/70 hover:text-gold hover:border-gold/40 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5 py-5 text-center text-xs text-muted">
        © {new Date().getFullYear()} Samahuzai Carwash and Auto Detailing. All rights reserved.
      </div>
    </footer>
  );
}
