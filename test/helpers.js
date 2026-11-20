import { createHmac } from 'node:crypto'

export const JWT_SECRET = 'test-secret-not-for-production'

const b64 = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')

// Builds a signed HS256 JWT like the ones Netlify Identity issues.
export function signJwt(payload = {}, { secret = JWT_SECRET, header = { alg: 'HS256', typ: 'JWT' }, expiresIn = 3600 } = {}) {
  const body = { sub: 'user-1', exp: Math.floor(Date.now() / 1000) + expiresIn, ...payload }
  if (payload.exp === null) delete body.exp
  const head = b64(header)
  const data = b64(body)
  const signature = createHmac('sha256', secret).update(`${head}.${data}`).digest('base64url')
  return `${head}.${data}.${signature}`
}

export const tokens = {
  admin: () => signJwt({ email: 'admin@example.com' }),
  member: () => signJwt({ email: 'member@example.com' }),
  roleAdmin: () => signJwt({ email: 'boss@example.com', app_metadata: { roles: ['admin'] } }),
  roleMember: () => signJwt({ email: 'reader@example.com', app_metadata: { roles: ['member'] } }),
  stranger: () => signJwt({ email: 'stranger@example.com' })
}

// Calls a Netlify function handler the way the platform does.
export async function call(handler, method, path, { token, body, rawBody } = {}) {
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (rawBody !== undefined) payload = rawBody
  else if (body !== undefined) payload = JSON.stringify(body)
  if (payload !== undefined) headers['Content-Type'] = 'application/json'
  const res = await handler(new Request(`http://localhost${path}`, { method, headers, body: payload }), {})
  const text = await res.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    /* non-JSON */
  }
  return { status: res.status, data, text }
}

// Sets the environment variables the functions read; returns a restore function.
export function setEnv(values) {
  const previous = {}
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key]
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
