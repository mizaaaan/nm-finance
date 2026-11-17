import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashPassword } from './auth.js'

// The MySQL schema lives in db/schema.mysql.sql so there is one source of truth
// for the tables. It is applied on boot (all statements are IF NOT EXISTS), by
// `npm run db:setup`, or from the admin-only POST /api/init route.
export const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))

export async function applySchema(pool) {
  const source = await readFile(path.join(ROOT, 'db', 'schema.mysql.sql'), 'utf8')
  const statements = source
    .split(';')
    .map((statement) => statement.replace(/--[^\n]*/g, '').trim())
    .filter(Boolean)
  for (const statement of statements) await pool.query(statement)
  return statements.length
}

// First-boot admin: only runs while the users table is empty, so it can never
// overwrite a password you have since changed.
export async function ensureAdmin(pool) {
  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
  const password = process.env.ADMIN_PASSWORD || ''
  if (!email || !password) return null

  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users')
  if (Number(rows[0].count) > 0) return null

  await pool.query(
    'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
    [email, process.env.ADMIN_NAME || 'Administrator', hashPassword(password), 'admin']
  )
  return email
}
