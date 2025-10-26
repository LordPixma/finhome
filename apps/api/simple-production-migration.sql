-- Simple Global Admin Setup for Production
-- Just add the is_global_admin column without recreating the table

-- Step 1: Add is_global_admin column (will fail silently if it already exists)
ALTER TABLE users ADD COLUMN is_global_admin BOOLEAN DEFAULT false;

-- Step 2: Create global admin audit table
CREATE TABLE IF NOT EXISTS global_admin_actions (
    id TEXT PRIMARY KEY,
    admin_user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at INTEGER NOT NULL
);

-- Step 3: Create global admin settings table  
CREATE TABLE IF NOT EXISTS global_admin_settings (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Step 4: Create indexes for admin tables
CREATE INDEX IF NOT EXISTS global_admin_actions_admin_user_id_index ON global_admin_actions(admin_user_id);
CREATE INDEX IF NOT EXISTS global_admin_actions_created_at_index ON global_admin_actions(created_at);
CREATE INDEX IF NOT EXISTS global_admin_actions_action_index ON global_admin_actions(action);
CREATE UNIQUE INDEX IF NOT EXISTS global_admin_settings_key_unique ON global_admin_settings(key);

-- Step 5: Insert default global admin settings
INSERT OR IGNORE INTO global_admin_settings (id, key, value, description, created_at, updated_at) VALUES
    ('setting_1', 'maintenance_mode', 'false', 'Enable/disable maintenance mode for all tenants', strftime('%s', 'now'), strftime('%s', 'now')),
    ('setting_2', 'new_registrations', 'true', 'Allow new tenant registrations', strftime('%s', 'now'), strftime('%s', 'now')),
    ('setting_3', 'max_tenants', '1000', 'Maximum number of tenants allowed', strftime('%s', 'now'), strftime('%s', 'now'));