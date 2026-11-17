import { createContext, useContext, useEffect, useMemo, useState } from 'react'
<<<<<<< Updated upstream
import {
  auth,
  clearUrlTokens,
  createUserFromOAuthHash,
  enabledProviders,
  isAdminUser,
  readUrlTokens
} from '../lib/auth'
import { PREVIEW_MODE, PREVIEW_USER } from '../lib/preview'
import { SESSION_MODE } from '../lib/authMode'
=======
import { apiRequest } from '../lib/api'
import { clearUrlTokens, isAdminUser } from '../lib/auth'
>>>>>>> Stashed changes

const AuthContext = createContext(null)

/* ── Netlify Identity (default deployment) ─────────────────── */

function IdentityAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
<<<<<<< Updated upstream
    const safe = (fn) => {
      try {
        fn()
      } catch (err) {
        if (!cancelled) setNotice({ tone: 'error', message: err.message })
      }
    }

    async function init() {
      // Local review mode: there is no Identity endpoint to talk to, so skip it
      // entirely rather than collecting failed requests. Dev builds only.
      if (PREVIEW_MODE) {
        setUser(PREVIEW_USER)
        setLoading(false)
        return
      }

      const tokens = readUrlTokens()

      // Email confirmation link → confirm + sign in
      if (tokens.confirmationToken) {
        try {
          const confirmed = await auth.confirm(tokens.confirmationToken, true)
          safe(() => {
            setUser(confirmed)
            setNotice({ tone: 'success', message: 'Email confirmed — you’re signed in.' })
          })
        } catch (err) {
          safe(() => setNotice({ tone: 'error', message: err.message }))
        }
        clearUrlTokens()
      } else if (tokens.oauth) {
        // OAuth callback → build session from the hash tokens
        safe(() => {
          const oauthUser = createUserFromOAuthHash()
          if (oauthUser) setUser(oauthUser)
        })
        clearUrlTokens()
      }
      // A recovery token is intentionally left in the URL so LoginPage can
      // render the "set new password" form.

      // Restore any persisted session
      safe(() => setUser(auth.currentUser()))

      // Site auth settings (autoconfirm, external providers)
      try {
        const s = await auth.settings()
        safe(() => setSettings(s))
      } catch {
        // Identity not enabled yet — forms still render, calls surface errors
      }

      safe(() => setLoading(false))
    }

    init()
    return () => {
      cancelled = true
    }
=======
    apiRequest('/api/auth/me')
      .then(({ user: current }) => { if (!cancelled) setUser(current) })
      .catch(() => { if (!cancelled) setUser(null) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
>>>>>>> Stashed changes
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    settings: { disable_signup: false },
    notice,
    providers: [],
    autoconfirm: true,
    isAdmin: isAdminUser(user),
    clearNotice: () => setNotice(null),
    signIn: async (email, password) => {
      const result = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } })
      setUser(result.user)
      return result.user
    },
    signUp: async (email, password, metadata) => {
      const result = await apiRequest('/api/auth/signup', {
        method: 'POST', body: { email, password, name: metadata?.full_name || '' }
      })
      setUser(result.user)
      return result.user
    },
    signOut: async () => {
      try { await apiRequest('/api/auth/logout', { method: 'POST', body: {} }) }
      finally { setUser(null) }
    },
    sendRecovery: async (email) => apiRequest('/api/auth/forgot', { method: 'POST', body: { email } }),
    resetPassword: async (token, password) => {
      await apiRequest('/api/auth/reset', { method: 'POST', body: { token, password } })
      clearUrlTokens()
      setUser(null)
    },
    signInWithProvider: () => setNotice({ tone: 'error', message: 'External sign-in is not configured on this site.' })
  }), [user, loading, notice])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ── Self-hosted session auth (Hostinger build) ────────────── */

// The server returns { id, email, name, role }; the rest of the app expects the
// Netlify Identity user shape (user_metadata / app_metadata), so map it here.
function toSessionUser(data) {
  return {
    id: data.id,
    email: data.email,
    user_metadata: { full_name: data.name || data.email },
    app_metadata: { roles: data.role === 'admin' ? ['admin'] : [] }
  }
}

function SessionAuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/auth/me', { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => {
        if (!cancelled) setUser(data?.user ? toSessionUser(data.user) : null)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      settings: null,
      notice,
      providers: [],
      autoconfirm: false,
      isAdmin: isAdminUser(user),
      clearNotice: () => setNotice(null),

      signIn: async (email, password) => {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Sign in failed.')
        const next = toSessionUser(data.user)
        setUser(next)
        return next
      },

      signOut: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } finally {
          setUser(null)
        }
      },

      signUp: async () => {
        throw new Error('Accounts are created by an administrator.')
      },
      sendRecovery: async () => {
        throw new Error('Ask an administrator to reset your password.')
      },
      resetPassword: async () => {
        throw new Error('Ask an administrator to reset your password.')
      },
      signInWithProvider: () => {
        throw new Error('Social sign-in is not enabled on this site.')
      }
    }),
    [user, loading, notice]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/* ── pick the provider for this build ──────────────────────── */

export function AuthProvider({ children }) {
  return SESSION_MODE ? (
    <SessionAuthProvider>{children}</SessionAuthProvider>
  ) : (
    <IdentityAuthProvider>{children}</IdentityAuthProvider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
