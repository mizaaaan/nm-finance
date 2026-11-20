import postgres from 'postgres'
import { json, serverError } from './http.js'

// Netlify DB injects NETLIFY_DB_URL automatically. DATABASE_URL is accepted as
// a fallback so the app can run against any Postgres (local dev, tests).
export const connectionString = () => process.env.NETLIFY_DB_URL || process.env.DATABASE_URL

// TLS is required by default. Set DATABASE_SSL=false only for a local Postgres
// that has no TLS (development and automated tests).
function sslOption() {
  const value = String(process.env.DATABASE_SSL || '').toLowerCase()
  return ['false', 'off', 'disable', 'disabled', '0', 'no'].includes(value) ? false : 'require'
}

export function openDb() {
  return postgres(connectionString(), {
    ssl: sslOption(),
    max: 1,
    connect_timeout: 10,
    idle_timeout: 5
  })
}

// Runs `handler(sql)` with a short-lived connection (serverless-friendly) and
// turns the common Postgres failures into readable 4xx responses. Anything
// else is logged server-side and returned as a generic 500 — never the raw
// database error text.
export async function withDb(handler, where = 'api') {
  if (!connectionString()) {
    console.error(`[${where}] No database connection string (NETLIFY_DB_URL / DATABASE_URL) is set.`)
    return json({ error: 'The database is not configured for this site yet.' }, 503)
  }
  const sql = openDb()
  try {
    return await handler(sql)
  } catch (error) {
    return mapDbError(error, where)
  } finally {
    await sql.end({ timeout: 2 }).catch(() => {})
  }
}

export function mapDbError(error, where) {
  switch (error?.code) {
    case '23505': {
      const hint = `${error.constraint_name || ''} ${error.detail || ''}`
      const what = /email/i.test(hint) ? 'email address' : 'registration number'
      return json({ error: `That ${what} is already in use.` }, 409)
    }
    case '23503':
      return json({ error: 'The selected member or car no longer exists.' }, 400)
    case '22007':
    case '22008':
    case '22P02':
    case '22003':
    case '23514':
      return json({ error: 'Invalid value in the request.' }, 400)
    case '42P01': // undefined_table — schema not applied yet
      return json(
        {
          error:
            'The database has not been set up yet. An administrator can run the database setup from the dashboard.'
        },
        503
      )
    default:
      return serverError(error, where)
  }
}
