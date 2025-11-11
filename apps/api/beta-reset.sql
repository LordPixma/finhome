-- ========================================
-- FINHOME BETA RESET SCRIPT
-- Purpose: Wipe ALL tenant/user data prior to closed beta while preserving
--          system configuration and global admin account.
-- ⚠️  WARNING: IRREVERSIBLE DELETION OF DATA ⚠️
-- ========================================
-- Date: 2025-11-11
-- Execution (production):
--   wrangler d1 execute finhome-db --file=beta-reset.sql --remote
-- (Optional dry run counts before execution provided separately.)
-- ========================================
-- Strategy:
-- 1. Disable FK constraints
-- 2. Delete dependent child tables first
-- 3. Delete core transactional & tenant-scoped tables
-- 4. Remove all non-global-admin users (legacy + new global_users model)
-- 5. Delete tenants
-- 6. Re-enable FK constraints
-- 7. Verification queries included at bottom (commented)
-- ========================================
-- PRESERVED TABLES / ROWS:
--   global_admin_settings      (system config)
--   global_features            (feature flags)
--   users (row where is_global_admin = 1)
--   global_users (row where is_global_admin = 1)
-- ========================================

PRAGMA foreign_keys = OFF;

-- ===== Dependent & peripheral data =====
DELETE FROM goal_contributions;
DELETE FROM user_settings;              -- per-tenant user prefs
DELETE FROM tenant_members;             -- legacy membership links
DELETE FROM tenant_users;               -- new multi-tenant user linkage
DELETE FROM user_sessions;              -- authentication sessions
DELETE FROM admin_sessions;             -- global admin session log
DELETE FROM global_admin_mfa;           -- reset MFA (forces fresh setup)
DELETE FROM transaction_sync_history;   -- historical sync logs
DELETE FROM bank_accounts;              -- linked provider accounts
DELETE FROM bank_connections;           -- open banking connections
DELETE FROM data_export_requests;       -- GDPR/export requests
DELETE FROM global_admin_actions;       -- admin audit trail
DELETE FROM security_incidents;         -- security events
DELETE FROM tenant_analytics;           -- aggregated analytics
DELETE FROM tenant_features;            -- per-tenant feature flags
DELETE FROM tenant_billing;             -- billing metadata
DELETE FROM system_metrics;             -- system telemetry
DELETE FROM import_logs;                -- file import log entries

-- ===== Core financial & planning data =====
DELETE FROM recurring_transactions;
DELETE FROM goals;
DELETE FROM bill_reminders;
DELETE FROM budgets;
DELETE FROM transactions;
DELETE FROM categories;
DELETE FROM accounts;

-- ===== Users (legacy + new global) except global admin =====
DELETE FROM users WHERE is_global_admin = 0 OR is_global_admin IS NULL;
DELETE FROM global_users WHERE is_global_admin = 0 OR is_global_admin IS NULL;

-- ===== Tenants =====
DELETE FROM tenants;

PRAGMA foreign_keys = ON;

-- ===== Optional vacuum (uncomment if needed) =====
-- VACUUM;  -- reclaim space (note: may not be supported in remote D1 execute)

-- ===== Verification Queries (run manually) =====
-- SELECT COUNT(*) AS tenants_count FROM tenants;              -- expect 0
-- SELECT COUNT(*) AS users_count FROM users;                  -- expect 1 (global admin)
-- SELECT COUNT(*) AS global_users_count FROM global_users;    -- expect 1 (global admin)
-- SELECT COUNT(*) AS accounts_count FROM accounts;            -- expect 0
-- SELECT COUNT(*) AS categories_count FROM categories;        -- expect 0
-- SELECT COUNT(*) AS transactions_count FROM transactions;    -- expect 0
-- SELECT COUNT(*) AS budgets_count FROM budgets;              -- expect 0
-- SELECT COUNT(*) AS goals_count FROM goals;                  -- expect 0
-- SELECT COUNT(*) AS bill_reminders_count FROM bill_reminders;-- expect 0
-- SELECT COUNT(*) AS recurring_count FROM recurring_transactions; -- 0
-- SELECT COUNT(*) AS tenant_users_count FROM tenant_users;    -- 0
-- SELECT COUNT(*) AS user_settings_count FROM user_settings;  -- 0
-- SELECT COUNT(*) AS bank_connections_count FROM bank_connections; -- 0
-- SELECT COUNT(*) AS bank_accounts_count FROM bank_accounts;  -- 0
-- SELECT COUNT(*) AS sync_history_count FROM transaction_sync_history; -- 0
-- SELECT COUNT(*) AS import_logs_count FROM import_logs;      -- 0
-- SELECT COUNT(*) AS data_exports_count FROM data_export_requests; -- 0
-- SELECT COUNT(*) AS admin_actions_count FROM global_admin_actions; -- 0
-- SELECT COUNT(*) AS security_incidents_count FROM security_incidents; -- 0
-- SELECT COUNT(*) AS tenant_features_count FROM tenant_features; -- 0
-- SELECT COUNT(*) AS tenant_billing_count FROM tenant_billing; -- 0
-- SELECT COUNT(*) AS analytics_count FROM tenant_analytics;   -- 0
-- SELECT COUNT(*) AS system_metrics_count FROM system_metrics; -- 0

-- ===== Post-reset notes =====
-- 1. Run reset-admin-password.sql to apply new password if needed.
-- 2. Clear KV namespaces (SESSIONS, CACHE) to invalidate any lingering tokens/cache.
-- 3. First registration after reset will create a brand-new tenant.
-- 4. Recreate sample data only if required for demos.
