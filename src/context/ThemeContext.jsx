import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

const ThemeContext = createContext(null)

const STORAGE_KEY = 'nm-theme'

function readStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function systemPrefersDark() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return false
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => readStoredTheme() || (systemPrefersDark() ? 'dark' : 'light'))
  // Whether the user has explicitly chosen — once they do, stop following the OS.
  const [explicit, setExplicit] = useState(() => readStoredTheme() !== null)
  const animTimer = useRef(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore write failures (private mode, storage quota, etc.) */
    }
  }, [theme])

  // Follow the OS preference live until the user makes an explicit choice.
  useEffect(() => {
    if (explicit || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e) => setTheme(e.matches ? 'dark' : 'light')
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [explicit])

  const toggle = useCallback(() => {
    const root = document.documentElement
    root.classList.add('theme-anim')
    setExplicit(true)
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
    window.clearTimeout(animTimer.current)
    animTimer.current = window.setTimeout(() => root.classList.remove('theme-anim'), 450)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
