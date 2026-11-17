export const ADMIN_EMAILS = ['md.mizan235@gmail.com']

export function isAdminUser(user) {
  if (!user) return false
  return user.role === 'admin' || ADMIN_EMAILS.includes(String(user.email || '').toLowerCase())
}

export function readUrlTokens() {
  return { recoveryToken: new URLSearchParams(window.location.search).get('token') }
}

export function clearUrlTokens() {
  window.history.replaceState({}, document.title, window.location.pathname)
}
