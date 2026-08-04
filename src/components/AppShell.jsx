import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <GridIcon />, to: '/' },
  { id: 'ledger', label: 'Ledger', icon: <LedgerIcon />, to: '/ledger' },
  { id: 'members', label: 'Members', icon: <UsersIcon />, to: '/members' },
  { id: 'cars', label: 'Cars', icon: <CarIcon />, to: '/cars' }
]

export default function AppShell({ children }) {
  const { user, signOut } = useAuth()
  const name = user?.user_metadata?.full_name || user?.email
  const initials = (name || '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="flex min-h-dvh bg-paper">
      {/* ── Sidebar (desktop) ── */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-rule bg-card/60 md:flex">
        <div className="border-b border-rule px-6 py-5">
          <p className="tabular text-[10px] uppercase tracking-[0.22em] text-brass">
            Next Millionaire MBS
          </p>
          <p className="font-display mt-1 text-xl leading-none text-ink">NM Finance</p>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${
                  isActive
                    ? 'bg-navy text-white'
                    : 'text-ink/55 transition-colors hover:bg-ink/5 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={isActive ? 'text-brass' : ''}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-rule p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brass/15 text-xs font-semibold text-brass">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{name}</p>
              <p className="tabular truncate text-xs text-ink/40">{user?.email}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-rule bg-card/60 px-3 py-2.5">
            <span className="text-xs font-medium text-ink/70">Dark mode</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-rule bg-card/70 px-3 py-2 text-sm font-medium text-ink/70 transition-all hover:border-loss/40 hover:text-loss"
          >
            <LogoutIcon />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between gap-3 border-b border-rule bg-card/60 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="tabular truncate text-[10px] uppercase tracking-[0.2em] text-brass">
              NM Finance
            </p>
            <p className="font-display truncate text-lg leading-none text-ink">
              Next Millionaire MBS
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-md border border-rule bg-card/70 px-3 py-1.5 text-xs font-medium text-ink/70 transition-colors hover:text-loss"
            >
              <LogoutIcon className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="scrollbar-none flex gap-2 overflow-x-auto border-b border-rule px-4 py-2.5 md:hidden">
          {NAV.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2 text-xs font-medium ${
                  isActive ? 'bg-navy text-white' : 'bg-card/70 text-ink/55'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </div>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:px-10">{children}</main>
      </div>
    </div>
  )
}

/* ── inline icons ── */

function IconBase({ children, className = 'h-4 w-4' }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function GridIcon() {
  return (
    <IconBase>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </IconBase>
  )
}

function LedgerIcon() {
  return (
    <IconBase>
      <path d="M4 4h16v16H4z" />
      <path d="M8 9h8M8 13h5" />
    </IconBase>
  )
}

function UsersIcon() {
  return (
    <IconBase>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 5a3.5 3.5 0 0 1 0 6.5M17.5 14.5c2.2.7 4 2.4 4 5.5" />
    </IconBase>
  )
}

function CarIcon() {
  return (
    <IconBase>
      <path d="M5 11 6.5 6.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11" />
      <path d="M4 11h16a1 1 0 0 1 1 1v4h-2.5" />
      <rect x="3" y="11" width="18" height="5" rx="1" />
      <circle cx="7.5" cy="17.5" r="1.8" />
      <circle cx="16.5" cy="17.5" r="1.8" />
    </IconBase>
  )
}

function LogoutIcon({ className }) {
  return (
    <IconBase className={className || 'h-4 w-4'}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </IconBase>
  )
}
