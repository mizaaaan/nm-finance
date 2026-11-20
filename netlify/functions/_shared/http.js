import { randomBytes } from 'node:crypto'

// Shared HTTP helpers for the API functions.

export const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers }
  })

// Unexpected failure: log the real error for the site owner (Netlify function
// logs) and give the user a generic message plus a short reference they can
// quote. Internal details (SQL text, stack traces, host names) never leave the
// server.
export function serverError(error, where) {
  const ref = randomBytes(4).toString('hex')
  console.error(`[${where}] ref=${ref}`, error)
  return json(
    { error: `Something went wrong on the server (reference ${ref}). Please try again.` },
    500
  )
}

const MAX_BODY_BYTES = 100 * 1024

// Reads and parses a JSON request body. Returns { body } on success or
// { response } (a ready-to-return 4xx) when the body is missing, too large,
// malformed, or not a JSON object — so handlers never run on silently-empty input.
export async function readJson(req) {
  let text
  try {
    text = await req.text()
  } catch {
    return { response: json({ error: 'Could not read the request body.' }, 400) }
  }
  if (text.length > MAX_BODY_BYTES) {
    return { response: json({ error: 'Request body is too large.' }, 413) }
  }
  if (!text.trim()) return { response: json({ error: 'A JSON request body is required.' }, 400) }
  let body
  try {
    body = JSON.parse(text)
  } catch {
    return { response: json({ error: 'The request body is not valid JSON.' }, 400) }
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { response: json({ error: 'The request body must be a JSON object.' }, 400) }
  }
  return { body }
}
