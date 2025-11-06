-- Migration: User Settings and Tenant Members
-- Created: 2025-10-03

-- Idempotent create: User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  currency TEXT NOT NULL DEFAULT 'GBP',
  currency_symbol TEXT NOT NULL DEFAULT '£',
  language TEXT NOT NULL DEFAULT 'en',
  timezone TEXT NOT NULL DEFAULT 'Europe/London',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/YYYY',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Idempotent create: Tenant Members Table
CREATE TABLE IF NOT EXISTS tenant_members (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by TEXT REFERENCES users(id),
  invited_at INTEGER NOT NULL,
  joined_at INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'removed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_tenant_id ON tenant_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_members_status ON tenant_members(status);

-- Update default currency for accounts table
-- Note: This only affects new accounts. Existing accounts will keep their currency.
-- If you want to update existing accounts, run a separate UPDATE statement.
