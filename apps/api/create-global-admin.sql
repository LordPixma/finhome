-- Create the first global admin user
-- Password hash for "Admin123!@#" using bcrypt with 10 rounds
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
    NULL,
    'admin@finhome360.com',
    'Global Administrator',
    '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    'admin',
    1,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);