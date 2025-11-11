-- 0009_reintroduce_open_banking.sql
-- Reintroduce Open Banking tables for TrueLayer integration

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS bank_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'truelayer',
  provider_connection_id TEXT NOT NULL,
  institution_id TEXT,
  institution_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  last_sync_at INTEGER,
  last_error TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_tenant ON bank_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_status ON bank_connections(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_connections_provider ON bank_connections(provider, provider_connection_id);

CREATE TABLE IF NOT EXISTS bank_accounts (
  id TEXT PRIMARY KEY,
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
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_connection ON bank_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account ON bank_accounts(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bank_accounts_provider ON bank_accounts(provider_account_id);

CREATE TABLE IF NOT EXISTS transaction_sync_history (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  bank_account_id TEXT,
  sync_started_at INTEGER NOT NULL,
  sync_completed_at INTEGER,
  transactions_fetched INTEGER DEFAULT 0,
  transactions_imported INTEGER DEFAULT 0,
  transactions_skipped INTEGER DEFAULT 0,
  transactions_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress',
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_history_connection ON transaction_sync_history(connection_id);
CREATE INDEX IF NOT EXISTS idx_sync_history_status ON transaction_sync_history(status);
CREATE INDEX IF NOT EXISTS idx_sync_history_date ON transaction_sync_history(sync_started_at);

-- Ensure provider_transaction_id column exists on transactions table
-- Note: SQLite in D1 does not support IF NOT EXISTS for ALTER TABLE ADD COLUMN
ALTER TABLE transactions ADD COLUMN provider_transaction_id TEXT;
CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions(provider_transaction_id);
