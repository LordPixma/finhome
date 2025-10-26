-- Create global admin user on production
INSERT INTO users (
    id, 
    tenant_id, 
    email, 
    name, 
    password_hash, 
    role, 
    created_at, 
    updated_at,
    is_global_admin
) VALUES (
    'global-admin-prod-1',
    NULL,
    'admin@finhome360.com',
    'Global Administrator',
    '$2b$10$Ybgtx.BOwDfkCALP/mLtUe31XzRSbf0o/YQzJA1SUjSOef59M3vHi',
    'admin',
    strftime('%s', 'now'),
    strftime('%s', 'now'),
    1
);