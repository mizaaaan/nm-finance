import postgres from 'postgres'

// One-time migration for existing databases: expands transactions.type so it
// accepts 'liability' and 'receivable' (new in the liability/receivable update).
// Fresh databases get the right constraint from db/schema.sql (via /api/init).
//
// Usage (from a shell that can reach your Netlify DB):
//   export NETLIFY_DB_URL="$(netlify env:get NETLIFY_DB_URL)"
//   node scripts/migrate-types.mjs
//
// or run `netlify database status --show-credentials` and export that URL.

const CONN = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL
if (!CONN) {
  console.error("No NETLIFY_DB_URL or DATABASE_URL found in this shell's environment.")
  console.error('Run: netlify env:get NETLIFY_DB_URL   (or) netlify database status --show-credentials')
  console.error('then re-run this script with that value exported, e.g.:')
  console.error('  export NETLIFY_DB_URL="<connection string>" && node scripts/migrate-types.mjs')
  process.exit(1)
}

const sql = postgres(CONN, { ssl: 'require', max: 1 })

try {
  await sql`ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check`
  await sql`
    ALTER TABLE transactions
      ADD CONSTRAINT transactions_type_check
      CHECK (type IN ('income', 'expense', 'contribution', 'dividend', 'liability', 'receivable'))
  `
  console.log('Migration applied: transactions.type now accepts liability and receivable.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await sql.end().catch(() => {})
}
