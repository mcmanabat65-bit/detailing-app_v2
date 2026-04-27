/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        obsidian: 'var(--color-obsidian)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        gold: 'var(--color-gold)',
        'gold-light': 'var(--color-gold-light)',
        cream: 'var(--color-cream)',
        muted: 'var(--color-muted)',
        success: 'var(--color-success)',
        danger: 'var(--color-danger)',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'serif'],
        sans: ['var(--font-sans)', 'DM Sans', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        shimmer: 'shimmer 4s linear infinite',
      },
    },
  },
  plugins: [],
};
