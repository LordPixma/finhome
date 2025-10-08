-- Migration: Add Open Banking tables
-- Created: 2025-10-08
-- Description: Tables for TrueLayer bank connections, linked accounts, and sync history

-- Bank connections table (stores TrueLayer connection data)
CREATE TABLE bank_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'truelayer',
  provider_connection_id TEXT NOT NULL, -- TrueLayer's connection ID
  institution_id TEXT, -- Bank identifier (e.g., 'monzo', 'barclays')
  institution_name TEXT, -- Display name
  access_token TEXT, -- Encrypted token
  refresh_token TEXT, -- Encrypted refresh token
  token_expires_at INTEGER, -- Unix timestamp
  status TEXT NOT NULL DEFAULT 'active', -- active, disconnected, expired, error
  last_sync_at INTEGER, -- Last successful sync timestamp
  last_error TEXT, -- Last error message if any
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for faster lookups
CREATE INDEX idx_bank_connections_tenant ON bank_connections(tenant_id);
CREATE INDEX idx_bank_connections_user ON bank_connections(user_id);
CREATE INDEX idx_bank_connections_status ON bank_connections(status);
CREATE UNIQUE INDEX idx_bank_connections_provider ON bank_connections(provider, provider_connection_id);

-- Linked bank accounts (maps TrueLayer accounts to Finhome accounts)
CREATE TABLE bank_accounts (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  account_id TEXT NOT NULL, -- Links to accounts table
  provider_account_id TEXT NOT NULL, -- TrueLayer's account ID
  account_number TEXT, -- Masked account number (e.g., ****1234)
  sort_code TEXT, -- UK sort code
  iban TEXT, -- International accounts
  account_type TEXT, -- 'checking', 'savings', 'credit_card'
  currency TEXT DEFAULT 'GBP',
  sync_from_date INTEGER, -- Sync transactions from this date onwards
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX idx_bank_accounts_connection ON bank_accounts(connection_id);
CREATE INDEX idx_bank_accounts_account ON bank_accounts(account_id);
CREATE UNIQUE INDEX idx_bank_accounts_provider ON bank_accounts(provider_account_id);

-- Transaction sync history (audit trail)
CREATE TABLE transaction_sync_history (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  bank_account_id TEXT,
  sync_started_at INTEGER NOT NULL,
  sync_completed_at INTEGER,
  transactions_fetched INTEGER DEFAULT 0,
  transactions_imported INTEGER DEFAULT 0,
  transactions_skipped INTEGER DEFAULT 0, -- Duplicates
  transactions_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'in_progress', -- in_progress, completed, failed
  error_message TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (connection_id) REFERENCES bank_connections(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
);

CREATE INDEX idx_sync_history_connection ON transaction_sync_history(connection_id);
CREATE INDEX idx_sync_history_status ON transaction_sync_history(status);
CREATE INDEX idx_sync_history_date ON transaction_sync_history(sync_started_at);

-- Add provider_transaction_id to transactions table for deduplication
ALTER TABLE transactions ADD COLUMN provider_transaction_id TEXT;
CREATE INDEX idx_transactions_provider ON transactions(provider_transaction_id);
