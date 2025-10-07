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

-- ========================================
-- 2. DELETE CORE TRANSACTION DATA
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
-- 3. DELETE ORGANIZATIONAL DATA
-- ========================================

-- Categories (depends on tenants)
DELETE FROM categories;

-- Accounts (depends on tenants)
DELETE FROM accounts;

-- Users (depends on tenants)
DELETE FROM users;

-- ========================================
-- 4. DELETE ROOT DATA
-- ========================================

-- Tenants (no dependencies)
DELETE FROM tenants;

-- Re-enable foreign key checks
PRAGMA foreign_keys = ON;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these after wipe to confirm all tables are empty:

-- SELECT COUNT(*) as tenants_count FROM tenants;
-- SELECT COUNT(*) as users_count FROM users;
-- SELECT COUNT(*) as accounts_count FROM accounts;
-- SELECT COUNT(*) as categories_count FROM categories;
-- SELECT COUNT(*) as transactions_count FROM transactions;
-- SELECT COUNT(*) as budgets_count FROM budgets;
-- SELECT COUNT(*) as bill_reminders_count FROM bill_reminders;
-- SELECT COUNT(*) as recurring_count FROM recurring_transactions;
-- SELECT COUNT(*) as goals_count FROM goals;
-- SELECT COUNT(*) as contributions_count FROM goal_contributions;
-- SELECT COUNT(*) as settings_count FROM user_settings;
-- SELECT COUNT(*) as members_count FROM tenant_members;

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
