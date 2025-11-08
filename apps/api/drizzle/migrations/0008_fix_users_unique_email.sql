-- Fix legacy users table unique constraint
-- Problem: The composite unique index on (tenant_id, email) allows multiple users 
-- with NULL tenant_id (global admins) to share the same email address.
-- Solution: Replace with a simple unique constraint on email, matching the 
-- pattern used in global_users table.

-- Drop the old composite unique index
DROP INDEX IF EXISTS uniq_users_tenant_email;

-- Create new unique index on email alone
CREATE UNIQUE INDEX uniq_users_email ON users(email);
