/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['"Share Tech Mono"', '"Courier New"', 'monospace'],
      },
      colors: {
        space: {
          950: '#020509',
          900: '#060d1a',
          800: '#0a1628',
          700: '#111f36',
          600: '#1a2f50',
        },
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.5s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s ease forwards',
        'card-reveal': 'cardReveal 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
      },
      keyframes: {
        pulseGlow: {
          from: { opacity: '0.6', filter: 'brightness(0.9)' },
          to:   { opacity: '1',   filter: 'brightness(1.2)' },
        },
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-8px)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        cardReveal: {
          from: { opacity: '0', transform: 'scale(0.85) rotateY(30deg)' },
          to:   { opacity: '1', transform: 'scale(1) rotateY(0deg)' },
        },
      },
    },
  },
  plugins: [],
}
