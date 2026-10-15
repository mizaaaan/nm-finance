import { useTheme } from '../context/ThemeContext'

// Round sun/moon button, same look as the website's theme toggle.
// `onHero` = sitting on the blue hero bar (white outline instead of grey).
export default function ThemeToggle({ onHero = false }) {
  const { isDark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={`flex h-[34px] w-[34px] shrink-0 cursor-pointer items-center justify-center rounded-full border bg-transparent transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brass/60 ${
        onHero
          ? 'border-white/30 text-white/85 hover:border-white hover:text-white'
          : 'border-rule text-ink/70 hover:border-brass hover:text-brass'
      }`}
    >
      {isDark ? <MoonIcon className="h-4 w-4" /> : <SunIcon className="h-4 w-4" />}
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
