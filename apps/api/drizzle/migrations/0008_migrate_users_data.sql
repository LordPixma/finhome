-- Data migration: Move existing users to multi-tenant structure
-- This script migrates existing users from the old single-tenant structure to the new multi-tenant structure

-- Step 1: Migrate users to global_users
INSERT INTO global_users (
  id, email, password_hash, name, is_global_admin, 
  profile_picture_url, bio, phone_number, date_of_birth,
  address_line_1, address_line_2, city, state, postal_code, country,
  created_at, updated_at
)
SELECT 
  id, email, password_hash, name, is_global_admin,
  profile_picture_url, bio, phone_number, date_of_birth,
  address_line_1, address_line_2, city, state, postal_code, country,
  created_at, updated_at
FROM users;

-- Step 2: Create tenant_users entries for each user in their current tenant
INSERT INTO tenant_users (
  id, global_user_id, tenant_id, role, status,
  display_name, can_manage_accounts, can_manage_budgets, can_invite_members,
  joined_at, created_at, updated_at
)
SELECT 
  'tu_' || u.id as id,  -- Create unique tenant_user id
  u.id as global_user_id,
  u.tenant_id,
  CASE 
    WHEN u.is_global_admin = 1 THEN 'owner'
    ELSE 'owner'  -- All existing users become owners of their tenants
  END as role,
  'active' as status,
  u.name as display_name,
  1 as can_manage_accounts,
  1 as can_manage_budgets, 
  1 as can_invite_members,
  u.created_at as joined_at,
  u.created_at,
  u.updated_at
FROM users u;

-- Step 3: Update user_settings to reference the new tenant_users
UPDATE user_settings 
SET tenant_user_id = 'tu_' || tenant_user_id,
    tenant_id = (
      SELECT tenant_id 
      FROM users 
      WHERE users.id = REPLACE(user_settings.tenant_user_id, 'tu_', '')
    )
WHERE tenant_user_id IN (SELECT id FROM users);

-- Note: We don't drop the users table yet for safety
-- It can be dropped later after verifying the migration worked correctly