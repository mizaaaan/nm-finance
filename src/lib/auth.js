import GoTrue, { User } from 'gotrue-js'

// Netlify Identity lives at a same-origin endpoint, so this works both in
// production (https://<site>.netlify.app/.netlify/identity) and under
// `netlify dev` (http://localhost:8888/.netlify/identity).
export const auth = new GoTrue({
  APIUrl: `${window.location.origin}/.netlify/identity`,
  audience: '',
  setCookie: false
})

export const EXTERNAL_PROVIDERS = ['google', 'github', 'gitlab', 'bitbucket', 'facebook']

// Accounts that always have admin power, even without a Netlify Identity role.
// Keep in sync with the default list in netlify/functions/_shared/auth.js, and
// add more there (or via the ADMIN_EMAILS env var / dashboard roles).
export const ADMIN_EMAILS = ['md.mizan235@gmail.com']

// True when this signed-in user may edit data. Non-admins are read-only;
// the server enforces the same rule independently of this helper.
export function isAdminUser(user) {
  if (!user) return false
  const roles = user.app_metadata?.roles
  if (Array.isArray(roles) && roles.includes('admin')) return true
  return ADMIN_EMAILS.includes(String(user.email || '').toLowerCase())
}

// Which OAuth providers are switched on in the Netlify dashboard (if any).
export function enabledProviders(settings) {
  if (!settings || !settings.external) return []
  return EXTERNAL_PROVIDERS.filter((p) => settings.external[p])
}

// Netlify Identity emails land on the site with a token in the URL hash:
//   #confirmation_token=...  (signup confirmation)
//   #recovery_token=...      (password reset)
// OAuth sign-in returns #access_token=...&user=...
export function readUrlTokens() {
  const hash = window.location.hash
  if (!hash) return {}
  const params = new URLSearchParams(hash.slice(1))
  return {
    confirmationToken: params.get('confirmation_token'),
    recoveryToken: params.get('recovery_token'),
    oauth: params.has('access_token')
  }
}

export function clearUrlTokens() {
  window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
}

// GoTrue's implicit OAuth flow drops tokens into the URL hash. Build the
// session manually (same mechanism the library uses internally) and persist
// it so a page refresh keeps the user signed in.
export function createUserFromOAuthHash() {
  const params = new URLSearchParams(window.location.hash.slice(1))
  const accessToken = params.get('access_token')
  if (!accessToken) return null

  let userData = {}
  try {
    userData = JSON.parse(params.get('user') || '{}')
  } catch {
    userData = {}
  }

  const token = {
    access_token: accessToken,
    expires_in: Number(params.get('expires_in')) || 3600,
    refresh_token: params.get('refresh_token') || '',
    token_type: 'bearer'
  }

  const user = new User(auth.api, token, auth.audience || '')
  user._saveUserData(userData)
  user._saveSession()
  return user
}
