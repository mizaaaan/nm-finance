import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${
        isDark ? 'border-navy-light/50 bg-navy' : 'border-rule bg-card shadow-inner'
      }`}
    >
      <span
        className={`absolute left-0.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-sm transition-transform duration-300 ${
          isDark ? 'translate-x-6' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <MoonIcon className="h-3 w-3 text-navy" />
        ) : (
          <SunIcon className="h-3 w-3 text-brass" />
        )}
      </span>
    </button>
  )
}

function SunIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  )
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  )
}
