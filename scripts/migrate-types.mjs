import postgres from 'postgres'

// One-time migration for existing databases: expands transactions.type so it
// accepts 'liability' and 'receivable' (new in the liability/receivable update).
// Fresh databases get the right constraint from db/schema.sql (via /api/init).
//
// Atomic & idempotent: it runs inside a single DO block, drops any existing
// type check that doesn't allow the new types (regardless of its name), and
// only adds the expanded constraint when one isn't already present. Safe to
// run more than once.
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
  await sql.unsafe(`
    DO $$
    DECLARE
      c record;
    BEGIN
      -- Drop every CHECK constraint on transactions that restricts 'type' but
      -- doesn't already allow the new types (handles non-standard names too).
      FOR c IN
        SELECT conname, def FROM (
          SELECT conname, pg_get_constraintdef(oid) AS def
          FROM pg_constraint
          WHERE conrelid = 'transactions'::regclass AND contype = 'c'
        ) checks
        WHERE checks.def ILIKE '%type%'
      LOOP
        IF position('liability' in c.def) = 0 THEN
          EXECUTE format('ALTER TABLE transactions DROP CONSTRAINT %I', c.conname);
        END IF;
      END LOOP;

      -- Add the expanded constraint only if none covering the new types exists.
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'transactions'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) LIKE '%liability%'
      ) THEN
        ALTER TABLE transactions
          ADD CONSTRAINT transactions_type_check
          CHECK (type IN ('income', 'expense', 'contribution', 'dividend', 'liability', 'receivable'));
      END IF;
    END $$;
  `)
  console.log('Migration applied: transactions.type now accepts liability and receivable.')
} catch (err) {
  console.error('Migration failed:', err.message)
  process.exit(1)
} finally {
  await sql.end().catch(() => {})
}
