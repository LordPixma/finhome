-- 0010_add_tenant_to_sync_history.sql
-- Add tenantId column to transaction_sync_history table for multi-tenant isolation

PRAGMA foreign_keys = ON;

-- Add tenantId column to transaction_sync_history
ALTER TABLE transaction_sync_history ADD COLUMN tenant_id TEXT NOT NULL DEFAULT '';

-- Create index on tenantId
CREATE INDEX IF NOT EXISTS idx_sync_history_tenant ON transaction_sync_history(tenant_id);

-- Note: The default value '' is a temporary placeholder for the migration.
-- All new inserts must include the actual tenantId.
-- Existing rows (if any) will need to be updated manually or cleaned up.
