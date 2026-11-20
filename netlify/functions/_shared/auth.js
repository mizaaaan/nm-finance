import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { json } from './http.js'

// Shared auth helpers for the API functions.
//
// WHO IS SIGNED IN
// Netlify Identity issues a JWT (HS256) that the browser sends as
// `Authorization: Bearer <token>`. In Functions v2 `context.clientContext` is
// not reliably populated, so the user is resolved three ways, in order:
//   1. context.clientContext.identity.user — when Netlify provides it
//   2. Local JWT signature verification against the site's JWT secret
//      (env JWT_SECRET) — only when that variable is set
//   3. The site's own Identity `/user` endpoint — validates the token
//      server-side and needs no secret (results are cached for 30 seconds)
// Fail-closed: a request that can't be resolved is rejected.
//
// WHAT THEY MAY DO — three access levels:
//   admin  → read + write (add / edit / delete, setup, reset)
//   member → read only
//   none   → signed in, but not approved: no access to any data
//
// An account is an ADMIN when it has the Netlify Identity role `admin`, or its
// email is listed in the ADMIN_EMAILS environment variable.
// An account is a MEMBER when it has the role `member`, or its email is listed
// in MEMBER_EMAILS. (ALLOW_ANY_SIGNED_IN_USER=true restores the old behaviour
// where every signed-in account may read — only use it with invite-only sign-up.)
// There are no accounts hard-coded in the source.

const csv = (value) =>
  String(value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)

export const adminEmails = () => csv(process.env.ADMIN_EMAILS)
export const memberEmails = () => csv(process.env.MEMBER_EMAILS)
const anySignedInMayRead = () => process.env.ALLOW_ANY_SIGNED_IN_USER === 'true'

const rolesOf = (user) =>
  Array.isArray(user?.app_metadata?.roles)
    ? user.app_metadata.roles.map((role) => String(role).toLowerCase())
    : []

// 'admin' | 'member' | 'none'
export function accessLevel(user) {
  if (!user) return 'none'
  const email = String(user.email || '').toLowerCase()
  const roles = rolesOf(user)
  if (roles.includes('admin') || (email && adminEmails().includes(email))) return 'admin'
  if (roles.includes('member') || (email && memberEmails().includes(email)) || anySignedInMayRead()) {
    return 'member'
  }
  return 'none'
}

export const isAdmin = (user) => accessLevel(user) === 'admin'

/* ── resolving the signed-in user ────────────────────────────────────── */

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
// Returns the decoded payload, or null when the token is invalid or expired.
// A token without an `exp` claim is rejected — sessions must expire.
export function verifyJwt(token, secret = jwtSecret()) {
  if (!secret) return null
  const parts = String(token).split('.')
  if (parts.length !== 3) return null
  const [header, payload, signature] = parts
  try {
    if (JSON.parse(Buffer.from(header, 'base64url').toString('utf8')).alg !== 'HS256') return null
    const expected = createHmac('sha256', secret).update(`${header}.${payload}`).digest()
    const provided = Buffer.from(signature, 'base64url')
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (typeof data.exp !== 'number' || data.exp * 1000 <= Date.now()) return null
    return data
  } catch {
    return null
  }
}

// Validate the token against the site's own Identity service (no secret
// required). Successful lookups are cached briefly so a page that fires
// several API calls at once only asks Identity once.
const INTROSPECTION_TTL_MS = 30_000
const introspectionCache = new Map()

async function identityIntrospection(token) {
  const base = process.env.URL || process.env.DEPLOY_URL || ''
  if (!base) return null
  const key = createHash('sha256').update(token).digest('hex')
  const hit = introspectionCache.get(key)
  if (hit && hit.until > Date.now()) return hit.user
  try {
    const res = await fetch(`${base}/.netlify/identity/user`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000)
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data || !data.email) return null
    if (introspectionCache.size >= 200) introspectionCache.delete(introspectionCache.keys().next().value)
    introspectionCache.set(key, { user: data, until: Date.now() + INTROSPECTION_TTL_MS })
    return data
  } catch {
    return null
  }
}

const normalise = (raw) => ({
  id: raw.id ?? raw.sub ?? null,
  email: raw.email || '',
  name: raw.user_metadata?.full_name || null,
  app_metadata: raw.app_metadata || {}
})

// The signed-in user for this request, or null.
export async function resolveUser(req, context) {
  const clientUser = context?.clientContext?.identity?.user
  if (clientUser) return normalise(clientUser)

  const token = bearerToken(req)
  if (!token) return null

  const payload = verifyJwt(token)
  if (payload) return normalise(payload)

  const introspected = await identityIntrospection(token)
  return introspected ? normalise(introspected) : null
}

/* ── guards ──────────────────────────────────────────────────────────── */

// Checks the request against the access level it needs:
//   need = 'read'  → admin or member
//   need = 'admin' → admin only
// Returns { user, access } to continue, or { response } — a ready-made
// 401/403 to return as-is.
export async function authorize(req, context, need = 'read') {
  const user = await resolveUser(req, context)
  if (!user) {
    return { response: json({ error: 'Sign in required to access this API.', code: 'SIGN_IN_REQUIRED' }, 401) }
  }
  const access = accessLevel(user)
  if (access === 'none') {
    console.warn(`[auth] signed-in account is not approved yet: ${user.email || user.id}`)
    return {
      response: json(
        {
          error: 'Your account is signed in but has not been approved yet. Ask a site administrator to give you access.',
          code: 'ACCESS_PENDING'
        },
        403
      )
    }
  }
  if (need === 'admin' && access !== 'admin') {
    return { response: json({ error: 'Admin access required for this action.', code: 'ADMIN_REQUIRED' }, 403) }
  }
  return { user, access }
}
