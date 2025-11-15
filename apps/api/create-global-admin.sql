-- Create the first global admin user
-- Password hash for "Op3ns3sam3@1" using bcrypt with 10 rounds
-- First create a special global admin tenant
INSERT OR IGNORE INTO tenants (
    id, 
    name, 
    subdomain, 
    created_at, 
    updated_at
) VALUES (
    'global-admin-tenant',
    'Global Administration',
    'global-admin',
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Then create the global admin user linked to this special tenant
INSERT INTO users (
    id, 
    tenant_id, 
    email, 
    name, 
    password_hash, 
    role, 
    is_global_admin, 
    created_at, 
    updated_at
) VALUES (
    'global-admin-1',
    'global-admin-tenant',
    'admin@finhome360.com',
    'Global Administrator',
    '$2b$10$yW7K.1MrBlTOK5vJzSCIwOOhjF/zA.6/sLP1Z8NnvEEPSyrLKyA.G',
    'admin',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);