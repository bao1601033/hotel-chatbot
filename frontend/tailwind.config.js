/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      colors: {
        sand: {
          50:  '#faf8f5',
          100: '#f5f0e8',
          200: '#ece3d4',
          300: '#ddd0b8',
          400: '#c9b898',
          500: '#b5a07a',
        },
        ocean: {
          500: '#2563a8',
          600: '#1d4f8a',
          700: '#163c6e',
        }
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease forwards',
        'fade-in':    'fadeIn 0.3s ease forwards',
        'scale-in':   'scaleIn 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'skeleton':   'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:   { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        scaleIn:  { '0%': { opacity: 0, transform: 'scale(0.92)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        skeleton: { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
      },
      boxShadow: {
        'card':  '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        'modal': '0 24px 80px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
}
