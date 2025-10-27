-- Fix the global admin user in production
UPDATE users 
SET 
    is_global_admin = 1,
    tenant_id = NULL,
    updated_at = strftime('%s', 'now')
WHERE email = 'admin@finhome360.com';