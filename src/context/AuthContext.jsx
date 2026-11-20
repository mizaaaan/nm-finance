import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  auth,
  clearUrlTokens,
  createUserFromOAuthHash,
  enabledProviders,
  readUrlTokens
} from '../lib/auth'
import { ApiError, apiRequest, setUnauthorizedHandler } from '../lib/api'

const AuthContext = createContext(null)

const NO_FEATURES = { reset: false }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [notice, setNotice] = useState(null)

  // What the SERVER says this account may do (GET /api/me):
  //   access: 'admin' (read + write) | 'member' (read only) | 'none' (not approved yet)
  //   accessStatus: 'idle' (signed out) | 'loading' | 'ready' | 'error'
  const [access, setAccess] = useState(null)
  const [features, setFeatures] = useState(NO_FEATURES)
  const [accessStatus, setAccessStatus] = useState('idle')
  const [accessError, setAccessError] = useState(null)
  const [accessTick, setAccessTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    const safe = (fn) => {
      try {
        fn()
      } catch (err) {
        if (!cancelled) setNotice({ tone: 'error', message: err.message })
      }
    }

    async function init() {
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
  }, [])

  // The API rejected our session (expired / revoked): sign out locally and say why.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setUser(null)
      setNotice({ tone: 'error', message: 'Your session has expired. Please sign in again.' })
      try {
        auth.currentUser()?.clearSession?.()
      } catch {
        /* nothing to clear */
      }
    })
    return () => setUnauthorizedHandler(null)
  }, [])

  // Ask the server what this account may do whenever the signed-in user changes.
  useEffect(() => {
    if (!user) {
      setAccess(null)
      setFeatures(NO_FEATURES)
      setAccessStatus('idle')
      setAccessError(null)
      return undefined
    }
    let cancelled = false
    setAccessStatus('loading')
    setAccessError(null)
    apiRequest('/api/me')
      .then((me) => {
        if (cancelled) return
        setAccess(me.access)
        setFeatures({ ...NO_FEATURES, ...(me.features || {}) })
        setAccessStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof ApiError && err.status === 401) return // handled by the unauthorized handler
        setAccess(null)
        setAccessError(err.message)
        setAccessStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [user, accessTick])

  const retryAccess = useCallback(() => setAccessTick((t) => t + 1), [])

  const value = useMemo(
    () => ({
      user,
      loading,
      settings,
      notice,
      providers: enabledProviders(settings),
      autoconfirm: Boolean(settings?.autoconfirm),
      access,
      accessStatus,
      accessError,
      retryAccess,
      features,
      // Admin = may add / edit / delete. Decided by the server, not the browser.
      isAdmin: access === 'admin',
      clearNotice: () => setNotice(null),

      signIn: async (email, password) => {
        const u = await auth.login(email, password, true)
        setUser(u)
        return u
      },

      signUp: async (email, password, metadata) => {
        const res = await auth.signup(email, password, metadata)
        // Auto-confirm sites sign you straight in
        if (res.confirmed_at || settings?.autoconfirm) {
          const u = await auth.login(email, password, true)
          setUser(u)
        }
        return res
      },

      signOut: async () => {
        const current = auth.currentUser()
        try {
          if (current) await current.logout()
        } finally {
          // Always clear the local session, even if the network call failed.
          setUser(null)
        }
      },

      sendRecovery: async (email) => auth.requestPasswordRecovery(email),

      resetPassword: async (token, password) => {
        const u = await auth.recover(token, true)
        await u.update({ password })
        clearUrlTokens()
        setUser(auth.currentUser() || u)
      },

      signInWithProvider: (provider) => {
        window.location.assign(auth.loginExternalUrl(provider))
      }
    }),
    [user, loading, settings, notice, access, accessStatus, accessError, retryAccess, features]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
