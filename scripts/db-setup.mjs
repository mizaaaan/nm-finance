import { closePool, getPool } from '../server/db.js'
import { applySchema, ensureAdmin } from '../server/schema.js'

// Applies db/schema.mysql.sql and creates the first admin account.
// The server does the same on boot; this script is for running the setup by
// hand, e.g. against a fresh database:
//
//   DB_HOST=localhost DB_NAME=… DB_USER=… DB_PASSWORD=… \
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run db:setup
try {
  const pool = getPool()
  const applied = await applySchema(pool)
  console.log(`Schema applied: ${applied} statements.`)
  const admin = await ensureAdmin(pool)
  console.log(
    admin
      ? `Created the first admin account: ${admin}`
      : 'Admin account skipped — either users already exist or ADMIN_EMAIL/ADMIN_PASSWORD are not set.'
  )
  await closePool()
} catch (error) {
  console.error(`Setup failed: ${error.message}`)
  process.exit(1)
}
