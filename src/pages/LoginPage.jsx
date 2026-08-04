import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { readUrlTokens } from '../lib/auth'
import Splash from '../components/Splash'
import Spinner from '../components/Spinner'
import ThemeToggle from '../components/ThemeToggle'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const MODES = [
  { id: 'signin', label: 'Sign in' },
  { id: 'signup', label: 'Create account' }
]

export default function LoginPage() {
  const {
    user,
    loading,
    settings,
    notice,
    clearNotice,
    providers,
    autoconfirm,
    signIn,
    signUp,
    sendRecovery,
    resetPassword,
    signInWithProvider
  } = useAuth()

  const urlTokens = useMemo(() => readUrlTokens(), [])
  const [mode, setMode] = useState(urlTokens.recoveryToken ? 'reset' : 'signin')
  const [form, setForm] = useState({ email: '', password: '', confirm: '', name: '', newPassword: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [success, setSuccess] = useState(null)

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }))

  const switchMode = (m) => {
    setMode(m)
    setError(null)
    setSuccess(null)
    clearNotice()
  }

  if (loading) return <Splash label="Opening the ledger…" />

  // Already signed in → dashboard. (Except when resetting a password.)
  if (user && mode !== 'reset') return <Navigate to="/" replace />

  async function handleSignIn(e) {
    e.preventDefault()
    if (!EMAIL_RE.test(form.email)) return setError('Enter a valid email address.')
    if (!form.password) return setError('Enter your password.')
    setBusy(true)
    setError(null)
    try {
      await signIn(form.email.trim(), form.password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Enter your name.')
    if (!EMAIL_RE.test(form.email)) return setError('Enter a valid email address.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await signUp(form.email.trim(), form.password, { full_name: form.name.trim() })
      if (!autoconfirm) {
        setSuccess(`Confirmation email sent to ${form.email.trim()}. Check your inbox to activate your account.`)
      }
      // autoconfirm sites sign you in → the redirect above handles it
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleForgot(e) {
    e.preventDefault()
    if (!EMAIL_RE.test(form.email)) return setError('Enter a valid email address.')
    setBusy(true)
    setError(null)
    try {
      await sendRecovery(form.email.trim())
      setSuccess(`Password reset link sent to ${form.email.trim()}.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    if (form.newPassword.length < 6) return setError('Password must be at least 6 characters.')
    if (form.newPassword !== form.confirm) return setError('Passwords do not match.')
    setBusy(true)
    setError(null)
    try {
      await resetPassword(urlTokens.recoveryToken, form.newPassword)
      // New session is set → the redirect above takes over
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const identityUnreachable = !loading && settings === null

  return (
    <div className="relative min-h-dvh bg-paper lg:flex">
      {/* theme toggle — floats top-right on every screen size */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      {/* ── Brand panel ─────────────────────────────────────────── */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-navy p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to bottom, transparent 0 47px, #F7F5F0 47px 48px)'
          }}
        />
        <div className="relative">
          <p className="tabular text-[11px] uppercase tracking-[0.24em] text-brass">
            Next Millionaire MBS
          </p>
          <h1 className="font-display mt-3 text-5xl">NM Finance</h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/60">
            The monthly balance accountability ledger for the group — rent income,
            member contributions, and car expenses, all in one place.
          </p>
        </div>

        {/* decorative ledger snapshot */}
        <div className="relative max-w-sm rounded-xl border border-white/10 bg-white/[0.04] p-6">
          <p className="tabular text-[10px] uppercase tracking-[0.2em] text-white/40">
            Company ledger · snapshot
          </p>
          <ul className="mt-5 space-y-3">
            {[
              ['Rent income', '2,450,000.00'],
              ['Member contributions', '1,180,000.00'],
              ['Car expenses', '−486,250.00'],
              ['Dividends paid', '−300,000.00']
            ].map(([label, value]) => (
              <li key={label} className="flex items-baseline justify-between gap-4">
                <span className="text-sm text-white/60">{label}</span>
                <span className="tabular text-sm text-white/90">{value}</span>
              </li>
            ))}
            <li className="mt-4 flex items-baseline justify-between gap-4 border-t border-white/10 pt-4">
              <span className="text-sm text-white/70">Net balance</span>
              <span className="tabular text-xl font-medium text-brass">2,843,750.00</span>
            </li>
          </ul>
        </div>

        <p className="relative tabular text-[11px] uppercase tracking-[0.2em] text-white/40">
          Balance · Accountability · Growth
        </p>
      </aside>

      {/* ── Auth card ───────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* mobile brand */}
          <div className="mb-8 text-center lg:hidden">
            <p className="tabular text-[10px] uppercase tracking-[0.24em] text-brass">
              Next Millionaire MBS
            </p>
            <h1 className="font-display mt-1 text-2xl text-ink sm:text-3xl">NM Finance</h1>
          </div>

          <div className="rounded-2xl border border-rule bg-card/70 p-6 shadow-[0_24px_60px_-32px_rgba(15,31,61,0.35)] backdrop-blur sm:p-8">
            {/* banners */}
            {identityUnreachable && (
              <div className="mb-6 rounded-md border border-brass/30 bg-brass/10 px-3 py-2.5 text-xs leading-relaxed text-ink/70">
                <span className="font-semibold text-ink">Identity not reachable yet.</span>{' '}
                Enable Netlify Identity in the dashboard, or use <span className="tabular">netlify dev</span> locally.
              </div>
            )}
            {notice && (
              <div
                className={`mb-4 flex items-start gap-2 border-l-2 px-3 py-2.5 text-sm ${
                  notice.tone === 'success'
                    ? 'border-gain bg-gain/5 text-gain'
                    : 'border-loss bg-loss/5 text-loss'
                }`}
              >
                <span>{notice.message}</span>
              </div>
            )}
            {error && (
              <div role="alert" className="mb-4 flex items-start gap-2 border-l-2 border-loss bg-loss/5 px-3 py-2.5 text-sm text-loss">
                <span>{error}</span>
              </div>
            )}

            {success ? (
              /* success panel */
              <div className="py-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gain/10 text-gain">
                  <CheckIcon />
                </div>
                <h2 className="font-display mt-4 text-2xl text-ink">Check your inbox</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/60">{success}</p>
                {(mode === 'forgot' || mode === 'signup') && (
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="mt-6 text-sm font-medium text-ink underline decoration-brass decoration-2 underline-offset-4 transition hover:text-ink-light"
                  >
                    Back to sign in
                  </button>
                )}
              </div>
            ) : mode === 'reset' ? (
              /* ── reset password ── */
              <form onSubmit={handleReset} className="space-y-6">
                <div>
                  <p className="tabular text-[10px] uppercase tracking-[0.24em] text-brass">Password recovery</p>
                  <h2 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Set a new password</h2>
                </div>
                <Field id="newPassword" label="New password" type="password" value={form.newPassword}
                  onChange={set('newPassword')} autoComplete="new-password" />
                <Field id="confirm" label="Confirm password" type="password" value={form.confirm}
                  onChange={set('confirm')} autoComplete="new-password" />
                <SubmitButton busy={busy} label="Update password" />
              </form>
            ) : (
              <>
                {/* tabs */}
                <div className="mb-8 grid grid-cols-2 gap-1 rounded-lg border border-rule bg-card/60 p-1">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => switchMode(m.id)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${
                        mode === m.id
                          ? 'bg-navy text-white shadow-sm'
                          : 'text-ink/50 hover:text-ink'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {mode === 'signin' && (
                  <form onSubmit={handleSignIn} className="space-y-6">
                    <div>
                      <p className="tabular text-[10px] uppercase tracking-[0.24em] text-brass">Welcome back</p>
                      <h2 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Sign in to your ledger</h2>
                    </div>
                    <Field id="email" label="Email" type="email" value={form.email}
                      onChange={set('email')} autoComplete="email" placeholder="you@example.com" inputMode="email" />
                    <div>
                      <Field id="password" label="Password" type="password" value={form.password}
                        onChange={set('password')} autoComplete="current-password" />
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="mt-2 text-xs font-medium text-ink/50 underline decoration-rule underline-offset-4 transition hover:text-ink"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <SubmitButton busy={busy} label="Sign in" />
                  </form>
                )}

                {mode === 'signup' && (
                  <form onSubmit={handleSignUp} className="space-y-6">
                    <div>
                      <p className="tabular text-[10px] uppercase tracking-[0.24em] text-brass">Join the ledger</p>
                      <h2 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Open an account</h2>
                    </div>
                    {settings?.disable_signup ? (
                      <p className="rounded-md border border-rule bg-paper px-3 py-2.5 text-sm text-ink/60">
                        New sign-ups are closed on this site. Ask an admin to invite you.
                      </p>
                    ) : (
                      <>
                        <Field id="name" label="Name" value={form.name} onChange={set('name')}
                          autoComplete="name" placeholder="e.g. Ade Johnson" />
                        <Field id="email" label="Email" type="email" value={form.email}
                          onChange={set('email')} autoComplete="email" placeholder="you@example.com" inputMode="email" />
                        <Field id="password" label="Password" type="password" value={form.password}
                          onChange={set('password')} autoComplete="new-password" />
                        <Field id="confirm" label="Confirm password" type="password" value={form.confirm}
                          onChange={set('confirm')} autoComplete="new-password" />
                        <SubmitButton busy={busy} label="Create account" />
                        <p className="text-xs leading-relaxed text-ink/40">
                          {autoconfirm
                            ? 'Accounts on this site are activated automatically.'
                            : 'A confirmation email will be sent to activate your account.'}
                        </p>
                      </>
                    )}
                  </form>
                )}

                {/* external providers */}
                {mode === 'signin' && providers.length > 0 && (
                  <div className="mt-8">
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-ink/40">
                      <span className="h-px flex-1 bg-rule" />
                      or continue with
                      <span className="h-px flex-1 bg-rule" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      {providers.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => signInWithProvider(p)}
                          className="flex items-center justify-center gap-2 rounded-md border border-rule bg-card/70 px-3 py-2.5 text-sm capitalize text-ink/80 transition-all hover:border-ink/40 hover:bg-card hover:text-ink"
                        >
                          <ProviderIcon provider={p} />
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {mode === 'forgot' && (
                  <form onSubmit={handleForgot} className="space-y-6">
                    <div>
                      <p className="tabular text-[10px] uppercase tracking-[0.24em] text-brass">Password recovery</p>
                      <h2 className="font-display mt-1 text-2xl text-ink sm:text-3xl">Reset your password</h2>
                      <p className="mt-2 text-sm text-ink/60">
                        Enter your account email and we’ll send you a reset link.
                      </p>
                    </div>
                    <Field id="email" label="Email" type="email" value={form.email}
                      onChange={set('email')} autoComplete="email" placeholder="you@example.com" inputMode="email" />
                    <SubmitButton busy={busy} label="Send recovery email" />
                    <button
                      type="button"
                      onClick={() => switchMode('signin')}
                      className="w-full text-center text-sm font-medium text-ink/50 underline decoration-rule underline-offset-4 transition hover:text-ink"
                    >
                      Back to sign in
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          <p className="mt-6 text-center text-xs text-ink/40">
            Secured by <span className="text-ink/60">Netlify Identity</span>
          </p>
        </div>
      </main>
    </div>
  )
}

/* ── small building blocks ─────────────────────────────────── */

function Field({ id, label, type = 'text', value, onChange, placeholder, autoComplete, inputMode }) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  return (
    <label htmlFor={id} className="block">
      <span className="tabular block text-[11px] uppercase tracking-[0.18em] text-ink/50">
        {label}
      </span>
      <span className="relative mt-2 block">
        <input
          id={id}
          type={isPassword && show ? 'text' : type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          className="w-full border-b border-rule bg-transparent py-2.5 text-ink outline-none transition-colors placeholder:text-ink/25 focus:border-brass hover:border-ink/30"
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((s) => !s)}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-ink/40 transition-colors hover:text-ink/70"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
      </span>
    </label>
  )
}

function SubmitButton({ busy, label }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="flex w-full items-center justify-center gap-2 rounded-md bg-brass px-4 py-3 text-sm font-semibold text-navy shadow-sm transition-all hover:bg-brass-light active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {busy && <Spinner className="h-4 w-4" />}
      {busy ? 'Working…' : label}
    </button>
  )
}

function ProviderIcon({ provider }) {
  const common = 'h-4 w-4 shrink-0'
  if (provider === 'github') {
    return (
      <svg className={common} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
    )
  }
  if (provider === 'google') {
    return (
      <svg className={common} viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" />
      </svg>
    )
  }
  return (
    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink/10 text-[10px] font-bold text-ink/70 uppercase">
      {provider[0]}
    </span>
  )
}

function CheckIcon() {
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.53 13.53 0 0 0 2 11s3.5 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  )
}
