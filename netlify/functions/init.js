import { authorize } from './_shared/auth.js'
import { withDb } from './_shared/db.js'
import { json } from './_shared/http.js'
import { SCHEMA } from './_shared/schema.js'

// POST /api/init — applies the database schema (see _shared/schema.js).
// Idempotent and non-destructive: it only creates what is missing. Admin only.
export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Use POST /api/init.' }, 405)
  const { response: denied } = await authorize(req, context, 'admin')
  if (denied) return denied

  return withDb(async (sql) => {
    const statements = SCHEMA.split(';')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter(Boolean)
    for (const statement of statements) {
      await sql.unsafe(statement)
    }
    return json({ ok: true, applied: statements.length })
  }, 'api/init')
}

export const config = { path: '/api/init' }
