/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — values live in src/index.css under :root and .dark
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-light': 'rgb(var(--ink-light) / <alpha-value>)',
        brass: 'rgb(var(--brass) / <alpha-value>)',
        'brass-light': 'rgb(var(--brass-light) / <alpha-value>)',
        paper: 'rgb(var(--paper) / <alpha-value>)',
        rule: 'rgb(var(--rule) / <alpha-value>)',
        loss: 'rgb(var(--loss) / <alpha-value>)',
        gain: 'rgb(var(--gain) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)', // card surface (white in light mode)
        navy: 'rgb(var(--navy) / <alpha-value>)', // deep surface that stays dark in both modes
        'navy-light': 'rgb(var(--navy-light) / <alpha-value>)'
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
