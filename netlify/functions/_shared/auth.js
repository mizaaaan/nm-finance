// Shared auth helpers for the API functions.
//
// Netlify verifies the Identity JWT automatically and injects the signed-in
// user via context.clientContext.identity — no manual signature checking.
// Fail-closed: any request without a verified user is rejected.

// Emails that always have admin power, even without a Netlify Identity role.
// Add more comma-separated emails in the Netlify env var ADMIN_EMAILS, or
// grant the 'admin' role to a user in the Netlify dashboard (Identity → user).
// Keep the default list in sync with src/lib/auth.js (ADMIN_EMAILS).
const DEFAULT_ADMIN_EMAILS = ['md.mizan235@gmail.com']

const json = (body, status) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

function adminEmails() {
  return [...DEFAULT_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...configuredAdminEmails()]
}

export function identityUser(context) {
  return context?.clientContext?.identity?.user || null
}

export function isAdmin(user) {
  if (!user) return false
  const roles = user.app_metadata?.roles
  if (Array.isArray(roles) && roles.includes('admin')) return true
  return adminEmails().includes(String(user.email || '').toLowerCase())
}

// Requires any signed-in user. Returns a Response to short-circuit with, or
// null when the request may continue.
export function requireUser(context) {
  const user = identityUser(context)
  if (!user) return json({ error: 'Sign in required to access this API.' }, 401)
  return null
}

// Requires an admin (writes, setup endpoints). Returns a Response to
// short-circuit with, or null when the request may continue.
export function requireAdmin(context) {
  const user = identityUser(context)
  if (!user) return json({ error: 'Sign in required to access this API.' }, 401)
  if (!isAdmin(user)) return json({ error: 'Admin access required for this action.' }, 403)
  return null
}
