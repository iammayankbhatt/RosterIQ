/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pine: 'var(--pine)',
        forest: 'var(--forest)',
        teal: 'var(--teal)',
        saffron: 'var(--saffron)',
        mist: 'var(--mist)',
        paper: 'var(--paper)',
        terracotta: 'var(--terracotta)',
        stone: 'var(--stone)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // deliberately uneven corners, like a cut paper card
        card: '22px 10px 24px 12px',
        'card-alt': '10px 24px 12px 22px',
        chip: '12px 5px 12px 6px',
      },
      boxShadow: {
        warm: '0 1px 0 rgba(18,48,43,.04), 0 8px 24px -8px rgba(122,84,30,.18), 0 2px 6px rgba(122,84,30,.08)',
        lift: '0 2px 0 rgba(18,48,43,.05), 0 18px 36px -12px rgba(122,84,30,.28), 0 4px 10px rgba(122,84,30,.10)',
      },
    },
  },
  plugins: [],
}
