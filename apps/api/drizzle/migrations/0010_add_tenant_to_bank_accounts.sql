-- 0010_add_tenant_to_bank_accounts.sql
-- Add tenant_id column to bank_accounts table for multi-tenancy compliance

PRAGMA foreign_keys = ON;

-- Step 1: Add tenant_id column (nullable initially)
ALTER TABLE bank_accounts ADD COLUMN tenant_id TEXT;

-- Step 2: Populate tenant_id from bank_connections
UPDATE bank_accounts
SET tenant_id = (
  SELECT bc.tenant_id
  FROM bank_connections bc
  WHERE bc.id = bank_accounts.connection_id
);

-- Step 3: Verify all rows have tenant_id (this will fail if any rows are missing)
-- This is a safety check to ensure data integrity
SELECT CASE
  WHEN COUNT(*) > 0 THEN RAISE(ABORT, 'Some bank_accounts rows are missing tenant_id')
  ELSE 0
END
FROM bank_accounts
WHERE tenant_id IS NULL;

-- Step 4: Add NOT NULL constraint by recreating the table
-- SQLite doesn't support adding NOT NULL to existing columns directly
CREATE TABLE bank_accounts_new (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  connection_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  account_number TEXT,
  sort_code TEXT,
  iban TEXT,
  account_type TEXT,
  currency TEXT DEFAULT 'GBP',
  sync_from_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

-- Copy data to new table
INSERT INTO bank_accounts_new
SELECT 
  id,
  tenant_id,
  connection_id,
  account_id,
  provider_account_id,
  account_number,
  sort_code,
  iban,
  account_type,
  currency,
  sync_from_date,
  created_at,
  updated_at
FROM bank_accounts;

-- Drop old table
DROP TABLE bank_accounts;

-- Rename new table
ALTER TABLE bank_accounts_new RENAME TO bank_accounts;

-- Recreate indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_tenant ON bank_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON bank_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account ON bank_accounts(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_provider ON bank_accounts(provider_account_id);
