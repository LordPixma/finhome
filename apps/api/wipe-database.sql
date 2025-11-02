-- ========================================
-- FINHOME DATABASE WIPE SCRIPT
-- Purpose: Clean all user data for BETA release
-- ⚠️  WARNING: THIS WILL DELETE ALL DATA ⚠️
-- ========================================
-- Date: 2025-10-07
-- Execution: Run via `wrangler d1 execute`
-- ========================================

-- IMPORTANT: This script truncates ALL user data in the correct order
-- to respect foreign key constraints. Run with EXTREME CAUTION!

-- Disable foreign key checks temporarily (SQLite specific)
PRAGMA foreign_keys = OFF;

-- ========================================
-- 1. DELETE DEPENDENT DATA FIRST
-- ========================================

-- Goal contributions (depends on goals & transactions)
DELETE FROM goal_contributions;

-- User settings (depends on users)
DELETE FROM user_settings;

-- Tenant members (depends on tenants & users)
DELETE FROM tenant_members;

-- Admin sessions (depends on users)
DELETE FROM admin_sessions;

-- Global admin MFA (depends on users)
DELETE FROM global_admin_mfa;

-- Transaction sync history (depends on bank_connections, bank_accounts)
DELETE FROM transaction_sync_history;

-- Bank accounts (depends on bank_connections, accounts)
DELETE FROM bank_accounts;

-- Bank connections (depends on tenants, users)
DELETE FROM bank_connections;

-- Data export requests (depends on tenants, users)
DELETE FROM data_export_requests;

-- Global admin actions (depends on users)
DELETE FROM global_admin_actions;

-- Security incidents (depends on tenants, users)
DELETE FROM security_incidents;

-- ========================================
-- 2. DELETE ANALYTICS & BILLING DATA
-- ========================================

-- Tenant analytics (depends on tenants)
DELETE FROM tenant_analytics;

-- Tenant features (depends on tenants)
DELETE FROM tenant_features;

-- Tenant billing (depends on tenants)
DELETE FROM tenant_billing;

-- System metrics (independent)
DELETE FROM system_metrics;

-- ========================================
-- 3. DELETE CORE TRANSACTION DATA
-- ========================================

-- Recurring transactions (depends on accounts, categories)
DELETE FROM recurring_transactions;

-- Goals (depends on accounts)
DELETE FROM goals;

-- Bill reminders (depends on categories)
DELETE FROM bill_reminders;

-- Budgets (depends on categories)
DELETE FROM budgets;

-- Transactions (depends on accounts & categories)
DELETE FROM transactions;

-- ========================================
-- 4. DELETE ORGANIZATIONAL DATA
-- ========================================

-- Categories (depends on tenants)
DELETE FROM categories;

-- Accounts (depends on tenants)
DELETE FROM accounts;

-- Users (depends on tenants)
DELETE FROM users;

-- ========================================
-- 5. DELETE ROOT DATA
-- ========================================

-- Tenants (no dependencies)
DELETE FROM tenants;

-- ========================================
-- 6. PRESERVE GLOBAL SETTINGS
-- ========================================
-- Note: We keep global_admin_settings and global_features
-- as these are system configuration, not user data

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after wipe to confirm all tables are empty:

-- Core Data
-- SELECT COUNT(*) as tenants_count FROM tenants;
-- SELECT COUNT(*) as users_count FROM users;
-- SELECT COUNT(*) as accounts_count FROM accounts;
-- SELECT COUNT(*) as categories_count FROM categories;
-- SELECT COUNT(*) as transactions_count FROM transactions;

-- Financial Data
-- SELECT COUNT(*) as budgets_count FROM budgets;
-- SELECT COUNT(*) as bill_reminders_count FROM bill_reminders;
-- SELECT COUNT(*) as recurring_count FROM recurring_transactions;
-- SELECT COUNT(*) as goals_count FROM goals;
-- SELECT COUNT(*) as contributions_count FROM goal_contributions;

-- User & Tenant Data
-- SELECT COUNT(*) as settings_count FROM user_settings;
-- SELECT COUNT(*) as members_count FROM tenant_members;

-- Banking Data
-- SELECT COUNT(*) as bank_connections_count FROM bank_connections;
-- SELECT COUNT(*) as bank_accounts_count FROM bank_accounts;
-- SELECT COUNT(*) as sync_history_count FROM transaction_sync_history;

-- Admin & Analytics
-- SELECT COUNT(*) as admin_sessions_count FROM admin_sessions;
-- SELECT COUNT(*) as admin_mfa_count FROM global_admin_mfa;
-- SELECT COUNT(*) as admin_actions_count FROM global_admin_actions;
-- SELECT COUNT(*) as tenant_analytics_count FROM tenant_analytics;
-- SELECT COUNT(*) as tenant_features_count FROM tenant_features;
-- SELECT COUNT(*) as tenant_billing_count FROM tenant_billing;
-- SELECT COUNT(*) as security_incidents_count FROM security_incidents;
-- SELECT COUNT(*) as data_exports_count FROM data_export_requests;
-- SELECT COUNT(*) as system_metrics_count FROM system_metrics;

-- ========================================
-- RESET NOTES
-- ========================================
-- After running this script:
-- 1. All user data will be deleted
-- 2. The database schema remains intact
-- 3. First user registration will be tenant owner
-- 4. Queue bindings remain (no impact)
-- 5. KV stores (CACHE, SESSIONS) should also be cleared manually
-- ========================================
