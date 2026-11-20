import { authorize } from './_shared/auth.js'
import { withDb } from './_shared/db.js'
import { resetEnabled } from './_shared/features.js'
import { json, readJson } from './_shared/http.js'

// POST /api/reset — permanently wipes every member, car and transaction (and
// restarts their id counters). There is no undo, so three things must all hold:
//   1. the site owner switched it on (env ENABLE_DATA_RESET=true — off by default),
//   2. the caller is an admin,
//   3. the request body carries { "confirm": "RESET" }.
// Every wipe is logged (who, when) in the Netlify function logs.
export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Use POST /api/reset.' }, 405)

  const { response: denied, user } = await authorize(req, context, 'admin')
  if (denied) return denied

  if (!resetEnabled()) {
    return json(
      {
        error:
          'Resetting all data is switched off on this site. The site owner can enable it by setting ENABLE_DATA_RESET=true.'
      },
      403
    )
  }

  const parsed = await readJson(req)
  if (parsed.response) return parsed.response
  if (parsed.body.confirm !== 'RESET') {
    return json({ error: 'Send { "confirm": "RESET" } to confirm that all data should be deleted.' }, 400)
  }

  return withDb(async (sql) => {
    await sql`TRUNCATE TABLE transactions, cars, members RESTART IDENTITY CASCADE`
    console.warn(`[reset] ALL DATA WIPED by ${user.email} at ${new Date().toISOString()}`)
    return json({ ok: true })
  }, 'api/reset')
}

export const config = { path: '/api/reset' }
