// The database schema, applied idempotently by POST /api/init (every statement
// is CREATE … IF NOT EXISTS, so re-running it is safe and never touches data).
//
// db/schema.sql is the human-readable copy of this same schema, and a test
// (test/schema.test.js) fails if the two ever drift apart — change both together.
export const SCHEMA = `
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
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense', 'contribution', 'dividend', 'liability', 'receivable')),
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
