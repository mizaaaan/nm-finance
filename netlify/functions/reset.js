import postgres from 'postgres'
import { requireAdmin } from './_shared/auth.js'

const CONNECTION_STRING = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  })

// Permanently wipes every member, car, and transaction (and resets their
// auto-increment counters) so the company can start fresh. Admin only —
// there is no undo.
export default async (req, context) => {
  if (req.method !== 'POST') return json({ error: 'Use POST /api/reset' }, 405)
  const denied = await requireAdmin(req, context)
  if (denied) return denied

  if (!CONNECTION_STRING) return json({ error: 'Database not configured.' }, 500)

  const sql = postgres(CONNECTION_STRING, { ssl: 'require', max: 1 })
  try {
    await sql`TRUNCATE TABLE transactions, cars, members RESTART IDENTITY CASCADE`
    return json({ ok: true })
  } catch (error) {
    return json({ error: error.message }, 500)
  } finally {
    await sql.end().catch(() => {})
  }
}

export const config = { path: '/api/reset' }
