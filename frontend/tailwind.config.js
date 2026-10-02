/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0b0f19',
          card: '#111827',
          border: '#1f293d',
          accent: '#3b82f6',
          cyan: '#06b6d4',
          safe: '#10b981',
          caution: '#f59e0b',
          danger: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-safe': '0 0 25px -5px rgba(16, 185, 129, 0.4)',
        'glow-caution': '0 0 25px -5px rgba(245, 158, 11, 0.4)',
        'glow-danger': '0 0 25px -5px rgba(239, 68, 68, 0.4)',
        'glow-cyan': '0 0 25px -5px rgba(6, 182, 212, 0.4)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan-line': 'scanline 2s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(0%)' },
          '100%': { transform: 'translateY(1000%)' },
        }
      }
    },
  },
  plugins: [],
}
