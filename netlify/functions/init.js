import postgres from 'postgres'

// Applies the NM Finance schema idempotently (all statements are
// CREATE TABLE/INDEX IF NOT EXISTS). Keep in sync with db/schema.sql —
// that file is the source of truth.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'member',
  joined_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cars (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  registration_no TEXT UNIQUE,
  purchase_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date   DATE,
  status          TEXT NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense', 'contribution', 'dividend')),
  category      TEXT NOT NULL,
  amount        NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  txn_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  description   TEXT,
  car_id        INTEGER REFERENCES cars(id) ON DELETE SET NULL,
  member_id     INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_by    INTEGER REFERENCES members(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_member ON transactions(member_id);
`

const CONNECTION_STRING = process.env.NETLIFY_DB_URL || process.env.DATABASE_URL

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Use POST /api/init' }, 405)
  if (!CONNECTION_STRING) {
    return json({ error: 'Database not configured.' }, 500)
  }

  const sql = postgres(CONNECTION_STRING, { ssl: 'require', max: 1 })
  try {
    const statements = SCHEMA.split(';')
      .map((s) => s.replace(/--[^\n]*/g, '').trim())
      .filter(Boolean)
    for (const statement of statements) {
      await sql.unsafe(statement)
    }
    return json({ ok: true, applied: statements.length })
  } catch (error) {
    return json({ error: error.message }, 500)
  } finally {
    await sql.end().catch(() => {})
  }
}

export const config = { path: '/api/init' }
