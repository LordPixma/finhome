-- Global Admin Migration - Fixed Column Mapping
-- Add global admin support to users table and create admin tables

-- Step 1: Create new users table with global admin support
CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,  -- Made nullable for global admins
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_global_admin BOOLEAN NOT NULL DEFAULT false,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Step 2: Copy existing data with correct column mapping
INSERT INTO users_new (
    id, tenant_id, email, name, password_hash, role, is_global_admin, created_at, updated_at
)
SELECT 
    id, tenant_id, email, name, password_hash, role, false, created_at, updated_at
FROM users;

-- Step 3: Drop old table and rename new one
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- Step 4: Recreate indexes
CREATE UNIQUE INDEX users_email_unique ON users(email);
CREATE INDEX users_tenant_id_index ON users(tenant_id);
CREATE INDEX users_is_global_admin_index ON users(is_global_admin);

-- Step 5: Create global admin audit table
CREATE TABLE global_admin_actions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Step 6: Create global admin settings table  
CREATE TABLE global_admin_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Step 7: Create indexes for admin tables
CREATE INDEX global_admin_actions_admin_id_index ON global_admin_actions(admin_id);
CREATE INDEX global_admin_actions_created_at_index ON global_admin_actions(created_at);
CREATE INDEX global_admin_actions_action_index ON global_admin_actions(action);
CREATE UNIQUE INDEX global_admin_settings_key_unique ON global_admin_settings(key);

-- Step 8: Insert default global admin settings
INSERT INTO global_admin_settings (id, key, value, description, created_at, updated_at) VALUES
    ('setting_1', 'maintenance_mode', 'false', 'Enable/disable maintenance mode for all tenants', strftime('%s', 'now'), strftime('%s', 'now')),
    ('setting_2', 'new_registrations', 'true', 'Allow new tenant registrations', strftime('%s', 'now'), strftime('%s', 'now')),
    ('setting_3', 'max_tenants', '1000', 'Maximum number of tenants allowed', strftime('%s', 'now'), strftime('%s', 'now'));