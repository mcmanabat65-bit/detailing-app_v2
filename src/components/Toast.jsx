'use client';

import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const variants = {
  success: {
    icon: CheckCircle2,
    accent: 'border-success/40',
    iconColor: 'text-success',
  },
  error: {
    icon: XCircle,
    accent: 'border-danger/40',
    iconColor: 'text-danger',
  },
  info: {
    icon: Info,
    accent: 'border-gold/40',
    iconColor: 'text-gold',
  },
};

export function ToastContainer() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-sm w-[calc(100vw-2rem)] sm:w-auto">
      {toasts.map((t) => {
        const v = variants[t.variant] || variants.info;
        const Icon = v.icon;
        return (
          <div
            key={t.id}
            role="status"
            className={`glass-card gold-border ${v.accent} rounded-md px-4 py-3 flex items-start gap-3 shadow-2xl shadow-black/40 animate-slide-in-right`}
          >
            <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${v.iconColor}`} />
            <div className="text-sm text-cream flex-1 leading-snug">
              {t.message}
            </div>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="text-muted hover:text-cream transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
