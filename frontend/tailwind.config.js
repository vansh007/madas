/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        bg: { DEFAULT: '#08090c', 1: '#0d0f14', 2: '#13151c', 3: '#1a1d26', 4: '#232730' },
        mint: { DEFAULT: '#00e5c7', dim: '#007a6a', glow: 'rgba(0,229,199,0.10)' },
        amber: { DEFAULT: '#f5a623', dim: '#8a5e14' },
        rose: { DEFAULT: '#f47272', dim: '#8a3a3a' },
        txt: { DEFAULT: '#e8eaf0', 2: '#8b90a0', 3: '#555a6a' },
        border: { DEFAULT: '#1e2230', bright: '#2a2f3e' },
      },
      animation: {
        'scan': 'scan 4s linear infinite',
        'ping-slow': 'ping 3s cubic-bezier(0, 0, 0.2, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'dash': 'dash 1.5s ease-in-out infinite',
      },
      keyframes: {
        scan: { '0%': { transform: 'translateY(-100%)' }, '100%': { transform: 'translateY(100%)' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        dash: { '0%': { strokeDashoffset: '8' }, '100%': { strokeDashoffset: '0' } },
      },
    },
  },
  plugins: [],
}
