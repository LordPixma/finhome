-- Global Admin Feature Migration
-- Add global admin support to users table and create admin audit tables

-- First, make tenantId nullable for global admin users
ALTER TABLE users RENAME TO users_temp;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES tenants(id),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'member')) NOT NULL,
  is_global_admin INTEGER DEFAULT 0,
  profile_picture_url TEXT,
  bio TEXT,
  phone_number TEXT,
  date_of_birth TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Copy data from old table to new table
INSERT INTO users SELECT 
  id,
  tenant_id,
  email,
  name,
  password_hash,
  role,
  0 as is_global_admin,
  profile_picture_url,
  bio,
  phone_number,
  date_of_birth,
  address_line_1,
  address_line_2,
  city,
  state,
  postal_code,
  country,
  created_at,
  updated_at
FROM users_temp;

-- Drop old table
DROP TABLE users_temp;

-- Create indexes
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_global_admin ON users(is_global_admin);

-- Create global admin action log table
CREATE TABLE global_admin_actions (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  details TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

-- Create indexes for global admin actions
CREATE INDEX idx_global_admin_actions_admin ON global_admin_actions(admin_user_id);
CREATE INDEX idx_global_admin_actions_action ON global_admin_actions(action);
CREATE INDEX idx_global_admin_actions_target ON global_admin_actions(target_type, target_id);
CREATE INDEX idx_global_admin_actions_date ON global_admin_actions(created_at);

-- Create global admin settings table
CREATE TABLE global_admin_settings (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  updated_by TEXT REFERENCES users(id),
  updated_at INTEGER NOT NULL
);

-- Create index for global admin settings
CREATE INDEX idx_global_admin_settings_key ON global_admin_settings(key);

-- Insert default global admin settings
INSERT INTO global_admin_settings (id, key, value, description, updated_at) VALUES
  ('maintenance_mode', 'maintenance_mode', 'false', 'Enable/disable maintenance mode across all tenants', strftime('%s', 'now')),
  ('max_tenants_per_user', 'max_tenants_per_user', '5', 'Maximum number of tenants a single user can create', strftime('%s', 'now')),
  ('tenant_trial_days', 'tenant_trial_days', '30', 'Default trial period for new tenants in days', strftime('%s', 'now')),
  ('max_users_per_tenant', 'max_users_per_tenant', '50', 'Maximum number of users allowed per tenant', strftime('%s', 'now')),
  ('email_notifications_enabled', 'email_notifications_enabled', 'true', 'Global toggle for email notifications', strftime('%s', 'now'));