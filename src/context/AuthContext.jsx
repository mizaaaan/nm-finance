import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  auth,
  clearUrlTokens,
  createUserFromOAuthHash,
  enabledProviders,
  isAdminUser,
  readUrlTokens
} from '../lib/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [notice, setNotice] = useState(null)

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

  const value = useMemo(
    () => ({
      user,
      loading,
      settings,
      notice,
      providers: enabledProviders(settings),
      autoconfirm: Boolean(settings?.autoconfirm),
      isAdmin: isAdminUser(user),
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
        if (current) await current.logout()
        setUser(null)
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
    [user, loading, settings, notice]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
