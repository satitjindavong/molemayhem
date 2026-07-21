/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        game: ['"Baloo 2"', '"Comic Sans MS"', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'pop-up': {
          '0%': { transform: 'translateY(100%) scale(0.8)', opacity: '0' },
          '60%': { transform: 'translateY(-8%) scale(1.05)' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        'burrow': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(110%)', opacity: '0' },
        },
        'hit-spin': {
          '0%': { transform: 'rotate(0deg) scale(1)' },
          '50%': { transform: 'rotate(-12deg) scale(1.1)' },
          '100%': { transform: 'translateY(110%) rotate(6deg) scale(0.9)', opacity: '0' },
        },
        'shake': {
          '0%,100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px) rotate(-4deg)' },
          '40%': { transform: 'translateX(6px) rotate(4deg)' },
          '60%': { transform: 'translateX(-4px) rotate(-2deg)' },
          '80%': { transform: 'translateX(4px) rotate(2deg)' },
        },
        'float-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-60px) scale(1.4)', opacity: '0' },
        },
        'rainbow': {
          '0%': { boxShadow: '0 0 0 4px #ff6b6b, 0 0 30px 6px #ff6b6b' },
          '25%': { boxShadow: '0 0 0 4px #feca57, 0 0 30px 6px #feca57' },
          '50%': { boxShadow: '0 0 0 4px #48dbfb, 0 0 30px 6px #48dbfb' },
          '75%': { boxShadow: '0 0 0 4px #ff9ff3, 0 0 30px 6px #ff9ff3' },
          '100%': { boxShadow: '0 0 0 4px #1dd1a1, 0 0 30px 6px #1dd1a1' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10%) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(600px) rotate(720deg)', opacity: '0' },
        },
        'wobble': {
          '0%,100%': { transform: 'translateY(0) rotate(-2deg)' },
          '50%': { transform: 'translateY(-6px) rotate(2deg)' },
        },
        'drift': {
          '0%': { transform: 'translateX(-10%)' },
          '100%': { transform: 'translateX(110%)' },
        },
      },
      animation: {
        'pop-up': 'pop-up 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'burrow': 'burrow 0.25s ease-in forwards',
        'hit-spin': 'hit-spin 0.5s ease-in forwards',
        'shake': 'shake 0.4s ease-in-out',
        'float-up': 'float-up 0.8s ease-out forwards',
        'rainbow': 'rainbow 0.6s linear infinite',
        'wobble': 'wobble 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
