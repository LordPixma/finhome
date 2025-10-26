-- Create a special tenant for global admin users on production
INSERT OR IGNORE INTO tenants (
    id,
    name,
    subdomain,
    created_at,
    updated_at
) VALUES (
    'global-admin-tenant',
    'Global Admin Tenant',
    'global-admin',
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Create global admin user with the special tenant
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
    'global-admin-tenant',
    'admin@finhome360.com',
    'Global Administrator',
    '$2b$10$Ybgtx.BOwDfkCALP/mLtUe31XzRSbf0o/YQzJA1SUjSOef59M3vHi',
    'admin',
    strftime('%s', 'now'),
    strftime('%s', 'now'),
    1
);