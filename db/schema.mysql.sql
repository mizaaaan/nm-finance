-- Next Millionaire Finance — MySQL schema (Hostinger)
--
-- Applied automatically by the Node server on first boot (server/index.js →
-- ensureSchema), or manually with `npm run db:setup`.
-- PostgreSQL version for Netlify lives in db/schema.sql.

CREATE TABLE IF NOT EXISTS members (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(160) NOT NULL,
  email         VARCHAR(190) NULL,
  phone         VARCHAR(60) NULL,
  role          VARCHAR(16) NOT NULL DEFAULT 'member',
  joined_date   DATE NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_members_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cars (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  name            VARCHAR(160) NOT NULL,
  registration_no VARCHAR(60) NULL,
  purchase_price  DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_date   DATE NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'active',
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_cars_registration (registration_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS transactions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  type          VARCHAR(16) NOT NULL,
  category      VARCHAR(48) NOT NULL,
  amount        DECIMAL(12,2) NOT NULL,
  txn_date      DATE NOT NULL,
  description   TEXT NULL,
  car_id        INT NULL,
  member_id     INT NULL,
  created_by    INT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_transactions_date (txn_date),
  KEY idx_transactions_type (type),
  KEY idx_transactions_member (member_id),
  CONSTRAINT fk_tx_car FOREIGN KEY (car_id) REFERENCES cars (id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_member FOREIGN KEY (member_id) REFERENCES members (id) ON DELETE SET NULL,
  CONSTRAINT fk_tx_creator FOREIGN KEY (created_by) REFERENCES members (id) ON DELETE SET NULL,
  CONSTRAINT chk_tx_type CHECK (type IN ('income', 'expense', 'contribution', 'dividend', 'liability', 'receivable')),
  CONSTRAINT chk_tx_amount CHECK (amount > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sign-in accounts for the self-hosted server (the members table above is the
-- ledger's participant list). Passwords are scrypt hashes, never plain text.
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(190) NOT NULL,
  name          VARCHAR(160) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(16) NOT NULL DEFAULT 'member',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
