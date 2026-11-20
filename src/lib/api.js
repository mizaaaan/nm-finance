import { auth } from './auth'

export class ApiError extends Error {
  constructor(message, status, code) {
    super(message)
    this.status = status
    this.code = code
  }
}

// The signed-in user's Netlify Identity JWT (auto-refreshes if expired), or
// null when nobody is logged in. The API rejects requests without it.
export async function authToken() {
  try {
    const user = auth.currentUser()
    if (!user) return null
    return await user.jwt()
  } catch {
    return null
  }
}

// Called when the API says our session is no longer valid (401) while a user
// is still "signed in" locally — AuthContext registers a handler that signs
// them out so they land on the login screen instead of a page full of errors.
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

// A request that never reached a JSON API (network failure, dev server without
// netlify dev, or the SPA fallback returning HTML) — callers may treat this as
// "endpoint not available" and fall back to an empty state.
async function readBody(res) {
  const text = await res.text()
  try {
    return { data: JSON.parse(text), isJson: true }
  } catch {
    return { data: null, isJson: false }
  }
}

const DEFAULT_TIMEOUT_MS = 30000

export async function apiRequest(path, { method = 'GET', body, signal } = {}) {
  const token = await authToken()

  // Never hang forever: abort after 30s unless the caller supplied its own signal.
  let timer
  let requestSignal = signal
  if (!requestSignal) {
    const controller = new AbortController()
    timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS)
    requestSignal = controller.signal
  }

  let res
  try {
    res = await fetch(path, {
      method,
      signal: requestSignal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    const err = new Error('Could not reach the server. Check your connection and try again.')
    err.isUnreachable = true
    throw err
  } finally {
    clearTimeout(timer)
  }

  const { data, isJson } = await readBody(res)

  if (!res.ok) {
    if (res.status === 401 && auth.currentUser()) onUnauthorized?.()
    if (!isJson) throw new ApiError(`The server responded ${res.status}.`, res.status)
    throw new ApiError(data?.error || `The server responded ${res.status}.`, res.status, data?.code)
  }

  if (!isJson) {
    const err = new Error('The server did not return a valid response.')
    err.isUnreachable = true
    throw err
  }

  return data
}
