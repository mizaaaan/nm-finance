import { useAuth } from '../context/AuthContext'
import ThemeToggle from './ThemeToggle'

// Shown instead of the app when a signed-in account can't be let in:
//   kind="pending" — the account exists but no administrator has approved it yet
//   kind="error"   — we couldn't find out (server unreachable); safe to retry
export default function AccessGate({ kind }) {
  const { user, signOut, retryAccess, accessError } = useAuth()
  const pending = kind === 'pending'

  return (
    <div className="relative flex min-h-dvh items-center justify-center bg-paper px-6 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md rounded-2xl border border-rule bg-card/70 p-8 text-center shadow-[0_24px_60px_-32px_rgba(13,40,67,0.25)]">
        <p className="tabular text-[11px] uppercase tracking-[0.06em] text-brass">Next Millionaire Finance</p>
        <h1 className="font-display mt-2 text-2xl text-ink sm:text-3xl">
          {pending ? 'Waiting for approval' : 'Couldn’t check your access'}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ink/65">
          {pending ? (
            <>
              You’re signed in as <span className="font-medium text-ink">{user?.email}</span>, but an
              administrator hasn’t approved this account yet. Ask them to give you access, then
              check again.
            </>
          ) : (
            <>{accessError || 'The server could not be reached.'} Check your connection and try again.</>
          )}
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={retryAccess}
            className="rounded-lg border border-transparent bg-brass px-4 py-2.5 text-sm font-medium text-navy shadow-sm transition-all hover:border-brass hover:bg-transparent hover:text-brass"
          >
            {pending ? 'Check again' : 'Try again'}
          </button>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg border border-rule bg-card/70 px-4 py-2.5 text-sm font-medium text-ink/70 transition-colors hover:border-loss/40 hover:text-loss"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
