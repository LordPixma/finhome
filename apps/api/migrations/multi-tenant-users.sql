-- Multi-tenant User Support Migration
-- This migration implements the ability for users to be part of multiple tenants

-- 1. Create global_users table for unique user identities
CREATE TABLE global_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_global_admin INTEGER DEFAULT 0,
  -- Profile fields (shared across tenants)
  profile_picture_url TEXT,
  bio TEXT,
  phone_number TEXT,
  date_of_birth TEXT,
  -- Address fields
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for email lookups
CREATE INDEX idx_global_users_email ON global_users(email);
CREATE INDEX idx_global_users_global_admin ON global_users(is_global_admin);

-- 2. Create tenant_users table to link global users to tenants
CREATE TABLE tenant_users (
  id TEXT PRIMARY KEY,
  global_user_id TEXT NOT NULL REFERENCES global_users(id),
  tenant_id TEXT NOT NULL REFERENCES tenants(id),
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  -- Tenant-specific settings
  display_name TEXT, -- Override name for this tenant
  -- Permissions/preferences specific to this tenant
  can_manage_accounts INTEGER DEFAULT 0,
  can_manage_budgets INTEGER DEFAULT 0,
  can_invite_members INTEGER DEFAULT 0,
  
  joined_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  UNIQUE(global_user_id, tenant_id)
);

-- Indexes for tenant_users
CREATE INDEX idx_tenant_users_global ON tenant_users(global_user_id);
CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(role);
CREATE INDEX idx_tenant_users_status ON tenant_users(status);

-- 3. Create user_sessions table for multi-tenant authentication
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  global_user_id TEXT NOT NULL REFERENCES global_users(id),
  current_tenant_id TEXT REFERENCES tenants(id), -- Can be NULL for tenant selection
  access_token_hash TEXT NOT NULL,
  refresh_token_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Index for session lookups
CREATE INDEX idx_user_sessions_global_user ON user_sessions(global_user_id);
CREATE INDEX idx_user_sessions_tenant ON user_sessions(current_tenant_id);
CREATE INDEX idx_user_sessions_access_token ON user_sessions(access_token_hash);

-- 4. Update user_settings to reference tenant_users instead of users
ALTER TABLE user_settings RENAME COLUMN user_id TO tenant_user_id;

-- Note: The existing users table will be gradually migrated to this new structure
-- Existing users will be:
-- 1. Migrated to global_users (one record per unique email)
-- 2. Linked via tenant_users (maintaining their current tenant association)
-- 3. user_settings updated to reference tenant_users.id instead of users.id

-- Migration data transformation will be handled in application code
-- to ensure proper handling of duplicate emails across tenants