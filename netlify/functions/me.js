import { accessLevel, resolveUser } from './_shared/auth.js'
import { json } from './_shared/http.js'
import { resetEnabled } from './_shared/features.js'

// GET /api/me — who the server thinks you are, and what you may do.
// The browser uses this (instead of a copy of the admin list) to decide which
// buttons to show, so the rules live in exactly one place: the server.
// Signed-in but unapproved accounts get a 200 with access: 'none' so the app
// can show a clear "waiting for approval" screen.
export default async (req, context) => {
  if (req.method !== 'GET') return json({ error: 'Method not allowed.' }, 405)
  const user = await resolveUser(req, context)
  if (!user) return json({ error: 'Sign in required to access this API.', code: 'SIGN_IN_REQUIRED' }, 401)
  return json({
    email: user.email,
    name: user.name,
    access: accessLevel(user), // 'admin' | 'member' | 'none'
    features: { reset: resetEnabled() }
  })
}

export const config = { path: '/api/me' }
