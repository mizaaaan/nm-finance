import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'

// Session auth for the self-hosted (Hostinger) deployment.
//
// Accounts live in the `users` table; the session is a signed, HttpOnly cookie
// holding the user id and an expiry, so no server-side session store is needed.
// SESSION_SECRET must be a long random string set in the hosting environment —
// without it, cookies are refused rather than signed with a default.

const COOKIE = 'nm_session'
const MAX_AGE = 60 * 60 * 24 * 30 // 30 days

export class AuthConfigError extends Error {}

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 24) {
    throw new AuthConfigError(
      'SESSION_SECRET is missing or too short. Set a random value of at least 24 characters in the hosting environment.'
    )
  }
  return value
}

/* ── passwords ─────────────────────────────────────────────── */

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(String(password), salt, 64).toString('hex')
  return `scrypt$${salt}$${hash}`
}

export function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'hex')
  const actual = scryptSync(String(password), salt, 64)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/* ── cookies ───────────────────────────────────────────────── */

const sign = (value) => createHmac('sha256', secret()).update(value).digest('base64url')

function parseCookies(header) {
  const out = {}
  String(header || '')
    .split(';')
    .forEach((part) => {
      const index = part.indexOf('=')
      if (index < 0) return
      out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim())
    })
  return out
}

function cookieAttributes(req) {
  const secure = req.secure || process.env.COOKIE_SECURE === '1'
  return `Path=/; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`
}

export function setSessionCookie(req, res, userId) {
  const expires = Date.now() + MAX_AGE * 1000
  const payload = `${userId}.${expires}`
  const token = `${payload}.${sign(payload)}`
  res.setHeader(
    'Set-Cookie',
    `${COOKIE}=${token}; Max-Age=${MAX_AGE}; ${cookieAttributes(req)}`
  )
}

export function clearSessionCookie(req, res) {
  res.setHeader('Set-Cookie', `${COOKIE}=; Max-Age=0; ${cookieAttributes(req)}`)
}

export function sessionUserId(req) {
  const token = parseCookies(req.headers.cookie)[COOKIE]
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [id, expires, signature] = parts
  const payload = `${id}.${expires}`
  let expected
  try {
    expected = sign(payload)
  } catch {
    return null
  }
  if (signature.length !== expected.length) return null
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null
  if (!Number(expires) || Number(expires) < Date.now()) return null
  return Number(id) || null
}

/* ── request guards ────────────────────────────────────────── */

export function isAdminEmail(email) {
  const allowed = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  return allowed.includes(String(email || '').toLowerCase())
}

export const isAdmin = (user) => Boolean(user) && (user.role === 'admin' || isAdminEmail(user.email))

export function requireUser(pool) {
  return async (req, res, next) => {
    try {
      const id = sessionUserId(req)
      if (!id) return res.status(401).json({ error: 'Sign in required to access this API.' })
      const [rows] = await pool.query('SELECT id, email, name, role FROM users WHERE id = ?', [id])
      if (!rows.length) return res.status(401).json({ error: 'Sign in required to access this API.' })
      req.user = rows[0]
      next()
    } catch (error) {
      next(error)
    }
  }
}

export function requireAdmin(pool) {
  return async (req, res, next) => {
    try {
      const id = sessionUserId(req)
      if (!id) return res.status(401).json({ error: 'Sign in required to access this API.' })
      const [rows] = await pool.query('SELECT id, email, name, role FROM users WHERE id = ?', [id])
      if (!rows.length) return res.status(401).json({ error: 'Sign in required to access this API.' })
      req.user = rows[0]
      if (!isAdmin(rows[0])) return res.status(403).json({ error: 'Admin access required for this action.' })
      next()
    } catch (error) {
      next(error)
    }
  }
}
