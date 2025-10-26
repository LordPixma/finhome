-- Global Admin Migration for Production - Existing Schema
-- Add global admin support to existing production users table

-- Step 1: Add is_global_admin column if it doesn't exist
ALTER TABLE users ADD COLUMN is_global_admin BOOLEAN DEFAULT false;

-- Step 2: Make tenant_id nullable for global admins
-- Note: SQLite doesn't support ALTER COLUMN, so we need to recreate the table

-- Create new users table with correct structure for production
CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,  -- Made nullable for global admins
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
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
    is_global_admin BOOLEAN NOT NULL DEFAULT false
);

-- Copy existing data from old table to new table
INSERT INTO users_new (
    id, tenant_id, email, name, password_hash, role, created_at, updated_at,
    profile_picture_url, bio, phone_number, date_of_birth, address_line_1,
    address_line_2, city, state, postal_code, country, is_global_admin
)
SELECT 
    id, tenant_id, email, name, password_hash, role, created_at, updated_at,
    profile_picture_url, bio, phone_number, date_of_birth, address_line_1,
    address_line_2, city, state, postal_code, country, false
FROM users;

-- Drop old table and rename new one
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Recreate indexes
CREATE UNIQUE INDEX users_email_unique ON users(email);
CREATE INDEX users_tenant_id_index ON users(tenant_id);
CREATE INDEX users_is_global_admin_index ON users(is_global_admin);

-- Create global admin audit table
CREATE TABLE IF NOT EXISTS global_admin_actions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create global admin settings table  
CREATE TABLE IF NOT EXISTS global_admin_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Create indexes for admin tables
CREATE INDEX IF NOT EXISTS global_admin_actions_admin_id_index ON global_admin_actions(admin_id);
CREATE INDEX IF NOT EXISTS global_admin_actions_created_at_index ON global_admin_actions(created_at);
CREATE INDEX IF NOT EXISTS global_admin_actions_action_index ON global_admin_actions(action);
CREATE UNIQUE INDEX IF NOT EXISTS global_admin_settings_key_unique ON global_admin_settings(key);

-- Insert default global admin settings
INSERT OR IGNORE INTO global_admin_settings (id, key, value, description, created_at, updated_at) VALUES
    ('setting_1', 'maintenance_mode', 'false', 'Enable/disable maintenance mode for all tenants', strftime('%s', 'now'), strftime('%s', 'now')),
    ('setting_2', 'new_registrations', 'true', 'Allow new tenant registrations', strftime('%s', 'now'), strftime('%s', 'now')),
    ('setting_3', 'max_tenants', '1000', 'Maximum number of tenants allowed', strftime('%s', 'now'), strftime('%s', 'now'));