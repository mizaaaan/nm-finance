import { createHmac, timingSafeEqual } from 'node:crypto'

// Shared auth helpers for the API functions.
//
// Netlify Identity JWT (HS256, signed with the site's JWT secret) is sent as
// `Authorization: Bearer <token>`. In Functions v2, `context.clientContext`
// is NOT reliably populated, so we resolve the user three ways (in order):
//   1. context.clientContext.identity.user — when Netlify provides it
//   2. Manual JWT signature verification against the site's JWT secret
//      (process.env.JWT_SECRET — Netlify injects it when Identity is enabled)
//   3. The site's own Identity `/user` endpoint — validates the token
//      server-side and needs no secret or extra configuration
// Fail-closed: an unresolved request is rejected.

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

export function isAdmin(user) {
  if (!user) return false
  const roles = user.app_metadata?.roles
  if (Array.isArray(roles) && roles.includes('admin')) return true
  return adminEmails().includes(String(user.email || '').toLowerCase())
}

function jwtSecret() {
  return (
    process.env.JWT_SECRET ||
    process.env.NETLIFY_IDENTITY_JWT_SECRET ||
    process.env.IDENTITY_JWT_SECRET ||
    ''
  )
}

function bearerToken(req) {
  const header = req.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1].trim() : null
}

// Verify a Netlify Identity JWT (HS256) against the site's JWT secret.
// Returns the decoded payload, or null when the token is invalid/expired.
function verifyJwt(token) {
  const secret = jwtSecret()
  if (!secret) return null
  const parts = String(token).split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  try {
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
    const provided = Buffer.from(signature, 'base64url')
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.exp === 'number' && data.exp * 1000 < Date.now()) return null
    return data
  } catch {
    return null
  }
}

// Validate the token against the site's own Identity service (no secret
// required — Identity checks it server-side and returns the user).
async function identityIntrospection(token) {
  const base = process.env.URL || process.env.DEPLOY_URL || ''
  if (!base) return null
  try {
    const res = await fetch(`${base}/.netlify/identity/user`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) return null
    const data = await res.json()
    return data && data.email ? data : null
  } catch {
    return null
  }
}

async function authenticatedUser(req, context) {
  const clientUser = context?.clientContext?.identity?.user
  if (clientUser) {
    return { id: clientUser.id, email: clientUser.email, app_metadata: clientUser.app_metadata }
  }

  const token = bearerToken(req)
  if (!token) return null

  const payload = verifyJwt(token)
  if (payload) {
    return { id: payload.sub, email: payload.email, app_metadata: payload.app_metadata }
  }

  const introspected = await identityIntrospection(token)
  if (introspected) {
    return { id: introspected.id, email: introspected.email, app_metadata: introspected.app_metadata }
  }

  return null
}

// Requires any signed-in user. Returns a Response to short-circuit with, or
// null when the request may continue.
export async function requireUser(req, context) {
  const user = await authenticatedUser(req, context)
  if (!user) return json({ error: 'Sign in required to access this API.' }, 401)
  return null
}

// Requires an admin (writes, setup endpoints). Returns a Response to
// short-circuit with, or null when the request may continue.
export async function requireAdmin(req, context) {
  const user = await authenticatedUser(req, context)
  if (!user) return json({ error: 'Sign in required to access this API.' }, 401)
  if (!isAdmin(user)) return json({ error: 'Admin access required for this action.' }, 403)
  return null
}
