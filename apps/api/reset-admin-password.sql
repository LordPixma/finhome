-- ========================================
-- FINHOME RESET ADMIN PASSWORD
-- Purpose: Set password for global admin account
-- Admin user: admin@finhome360.com
-- New password hash generated with bcrypt (10 rounds)
-- Date: 2025-11-11
-- ========================================

-- Ensure the admin row exists and is marked as global admin
UPDATE users
SET 
  password_hash = '$2b$10$yW7K.1MrBlTOK5vJzSCIwOOhjF/zA.6/sLP1Z8NnvEEPSyrLKyA.G',
  is_global_admin = 1,
  tenant_id = NULL,
  updated_at = strftime('%s','now')
WHERE email = 'admin@finhome360.com';

-- Optional (if using the new global_users table as canonical source)
-- UPDATE global_users
-- SET 
--   password_hash = '$2b$10$yW7K.1MrBlTOK5vJzSCIwOOhjF/zA.6/sLP1Z8NnvEEPSyrLKyA.G',
--   is_global_admin = 1,
--   updated_at = strftime('%s','now')
-- WHERE email = 'admin@finhome360.com';

-- Verification
-- SELECT id, email, is_global_admin FROM users WHERE email = 'admin@finhome360.com';
