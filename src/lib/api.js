export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// A request that never reached a JSON API (network failure, dev server without
// netlify dev, or the SPA fallback returning HTML) — callers may treat this as
// "endpoint not available" and fall back to sample data.
async function readBody(res) {
  const text = await res.text()
  try {
    return { data: JSON.parse(text), isJson: true }
  } catch {
    return { data: null, isJson: false }
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  let res
  try {
    res = await fetch(path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch {
    const err = new Error('Could not reach the API.')
    err.isUnreachable = true
    throw err
  }

  const { data, isJson } = await readBody(res)

  if (!res.ok) {
    if (!isJson) throw new ApiError(`The API responded ${res.status}.`, res.status)
    throw new ApiError(data?.error || `The API responded ${res.status}.`, res.status)
  }

  if (!isJson) {
    const err = new Error('The API is not reachable (non-JSON response).')
    err.isUnreachable = true
    throw err
  }

  return data
}
