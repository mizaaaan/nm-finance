-- Next Millionaire Finance database schema
-- Run this once against your Netlify DB (Postgres) instance.

CREATE TABLE IF NOT EXISTS members (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT UNIQUE,
  phone         TEXT,
  role          TEXT NOT NULL DEFAULT 'member',   -- 'member' | 'admin'
  joined_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cars (
  id              SERIAL PRIMARY KEY,
  name            TEXT NOT NULL,          -- e.g. "Toyota Axio - Silver"
  registration_no TEXT UNIQUE,
  purchase_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  purchase_date   DATE,
  status          TEXT NOT NULL DEFAULT 'active', -- 'active' | 'in_repair' | 'sold'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every income/expense line goes through this single table.
-- category defines what it is; type defines the money direction.
CREATE TABLE IF NOT EXISTS transactions (
  id            SERIAL PRIMARY KEY,
  type          TEXT NOT NULL CHECK (type IN ('income', 'expense', 'contribution', 'dividend')),
  category      TEXT NOT NULL,   -- 'driver_rent' | 'member_contribution' | 'other_income' |
                                  -- 'car_maintenance' | 'insurance' | 'registration' | 'fuel' | 'office_expense'
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

-- Seed starter categories reference (not enforced by FK, just documentation):
-- income:        driver_rent, other_income
-- contribution:  member_contribution
-- expense:       car_maintenance, insurance, registration, fuel, office_expense
-- dividend:      dividend_payout
