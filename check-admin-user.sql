-- Check the current global admin user
SELECT id, email, name, tenant_id, role, is_global_admin, created_at 
FROM users 
WHERE email = 'admin@finhome360.com';