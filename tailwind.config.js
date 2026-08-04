/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F1F3D',   // deep ledger navy — primary
          light: '#1B3A6B'
        },
        brass: {
          DEFAULT: '#C9A227',   // brass/gold accent — money, growth
          light: '#E6C55C'
        },
        paper: '#F7F5F0',        // warm off-white background, like ledger paper
        rule: '#DCD7C9',         // hairline rule color
        loss: '#B3261E',
        gain: '#1E7A4C'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
