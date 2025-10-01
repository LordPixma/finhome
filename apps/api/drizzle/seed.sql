-- Comprehensive seed data for FamilyBudget development/demo
-- Run this after migrations: wrangler d1 execute finhome-db --local --file=./drizzle/seed.sql
-- Or for production: wrangler d1 execute finhome-db --file=./drizzle/seed.sql

-- ============================================
-- DEMO TENANT: Demo Family
-- ============================================
INSERT INTO tenants (id, name, subdomain, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Demo Family', 'demofamily', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- USERS (password: 'password123')
-- Hash generated with: bcrypt.hash('password123', 10)
-- ============================================
INSERT INTO users (id, tenant_id, email, name, password_hash, role, created_at, updated_at) VALUES
-- Admin user
('650e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'admin@demofamily.com', 'John Doe', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin', strftime('%s', 'now'), strftime('%s', 'now')),
-- Member user
('650e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'jane@demofamily.com', 'Jane Doe', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'member', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- ACCOUNTS
-- ============================================
INSERT INTO accounts (id, tenant_id, name, type, balance, currency, created_at, updated_at) VALUES
('750e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Main Checking', 'checking', 5234.50, 'USD', strftime('%s', 'now'), strftime('%s', 'now')),
('750e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Savings Account', 'savings', 15000.00, 'USD', strftime('%s', 'now'), strftime('%s', 'now')),
('750e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Credit Card', 'credit', -1234.75, 'USD', strftime('%s', 'now'), strftime('%s', 'now')),
('750e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Cash Wallet', 'cash', 250.00, 'USD', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- CATEGORIES - INCOME
-- ============================================
INSERT INTO categories (id, tenant_id, name, type, color, icon, parent_id, created_at, updated_at) VALUES
('850e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Salary', 'income', '#4CAF50', '💰', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Freelance', 'income', '#8BC34A', '�', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Investment Returns', 'income', '#CDDC39', '📈', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Gifts', 'income', '#FFEB3B', '🎁', NULL, strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- CATEGORIES - EXPENSE
-- ============================================
INSERT INTO categories (id, tenant_id, name, type, color, icon, parent_id, created_at, updated_at) VALUES
('850e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440000', 'Groceries', 'expense', '#FF9800', '🛒', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440000', 'Utilities', 'expense', '#FF5722', '⚡', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440013', '550e8400-e29b-41d4-a716-446655440000', 'Transportation', 'expense', '#3F51B5', '🚗', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440014', '550e8400-e29b-41d4-a716-446655440000', 'Entertainment', 'expense', '#E91E63', '�', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440015', '550e8400-e29b-41d4-a716-446655440000', 'Healthcare', 'expense', '#9C27B0', '🏥', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440016', '550e8400-e29b-41d4-a716-446655440000', 'Dining Out', 'expense', '#F44336', '🍽️', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440017', '550e8400-e29b-41d4-a716-446655440000', 'Shopping', 'expense', '#2196F3', '🛍️', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440018', '550e8400-e29b-41d4-a716-446655440000', 'Insurance', 'expense', '#607D8B', '�️', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440019', '550e8400-e29b-41d4-a716-446655440000', 'Housing', 'expense', '#795548', '🏠', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('850e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440000', 'Uncategorized', 'expense', '#9E9E9E', '❓', NULL, strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- TRANSACTIONS - INCOME (Last 6 months)
-- ============================================
INSERT INTO transactions (id, tenant_id, account_id, category_id, amount, description, date, type, notes, created_at, updated_at) VALUES
-- September 2025
('950e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 4500.00, 'Monthly Salary - September', strftime('%s', '2025-09-01'), 'income', 'Regular paycheck', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440002', 750.00, 'Freelance Project', strftime('%s', '2025-09-15'), 'income', 'Website design', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440002', '850e8400-e29b-41d4-a716-446655440003', 125.50, 'Dividend Payment', strftime('%s', '2025-09-20'), 'income', 'Quarterly dividends', strftime('%s', 'now'), strftime('%s', 'now')),
-- August 2025
('950e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440001', 4500.00, 'Monthly Salary - August', strftime('%s', '2025-08-01'), 'income', 'Regular paycheck', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440002', 900.00, 'Consulting Work', strftime('%s', '2025-08-12'), 'income', 'IT consulting', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- TRANSACTIONS - EXPENSES (Last 6 months)
-- ============================================
INSERT INTO transactions (id, tenant_id, account_id, category_id, amount, description, date, type, notes, created_at, updated_at) VALUES
-- September 2025
('950e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440019', 1500.00, 'Rent Payment', strftime('%s', '2025-09-01'), 'expense', 'Monthly rent', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440011', 145.32, 'Whole Foods Market', strftime('%s', '2025-09-05'), 'expense', 'Weekly groceries', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440012', 89.50, 'Electric Company', strftime('%s', '2025-09-10'), 'expense', 'Monthly electricity', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440013', 65.00, 'Shell Gas Station', strftime('%s', '2025-09-12'), 'expense', 'Fill up', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440105', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440016', 85.75, 'Italian Restaurant', strftime('%s', '2025-09-14'), 'expense', 'Date night', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440106', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440011', 132.89, 'Trader Joes', strftime('%s', '2025-09-18'), 'expense', 'Weekly groceries', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440107', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440014', 45.00, 'Movie Theater', strftime('%s', '2025-09-21'), 'expense', 'Movie tickets', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440108', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440011', 89.45, 'Costco', strftime('%s', '2025-09-25'), 'expense', 'Bulk shopping', strftime('%s', 'now'), strftime('%s', 'now')),
-- August 2025
('950e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440019', 1500.00, 'Rent Payment', strftime('%s', '2025-08-01'), 'expense', 'Monthly rent', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440011', 158.45, 'Whole Foods', strftime('%s', '2025-08-07'), 'expense', 'Groceries', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440001', '850e8400-e29b-41d4-a716-446655440012', 92.75, 'Electric Bill', strftime('%s', '2025-08-10'), 'expense', 'Monthly electricity', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440017', 234.50, 'Amazon', strftime('%s', '2025-08-15'), 'expense', 'Home goods', strftime('%s', 'now'), strftime('%s', 'now')),
('950e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440003', '850e8400-e29b-41d4-a716-446655440016', 67.50, 'Sushi Restaurant', strftime('%s', '2025-08-20'), 'expense', 'Lunch', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- BUDGETS
-- ============================================
INSERT INTO budgets (id, tenant_id, category_id, amount, period, start_date, end_date, created_at, updated_at) VALUES
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', '850e8400-e29b-41d4-a716-446655440011', 600.00, 'monthly', strftime('%s', '2025-09-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', '850e8400-e29b-41d4-a716-446655440016', 300.00, 'monthly', strftime('%s', '2025-09-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('a50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', '850e8400-e29b-41d4-a716-446655440013', 250.00, 'monthly', strftime('%s', '2025-09-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now')),
('a50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', '850e8400-e29b-41d4-a716-446655440014', 200.00, 'monthly', strftime('%s', '2025-09-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- BILL REMINDERS
-- ============================================
INSERT INTO bill_reminders (id, tenant_id, name, amount, category_id, due_date, frequency, reminder_days, status, created_at, updated_at) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Electric Bill', 90.00, '850e8400-e29b-41d4-a716-446655440012', strftime('%s', '2025-10-10'), 'monthly', 3, 'pending', strftime('%s', 'now'), strftime('%s', 'now')),
('b50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440000', 'Internet Bill', 79.99, '850e8400-e29b-41d4-a716-446655440012', strftime('%s', '2025-10-15'), 'monthly', 5, 'pending', strftime('%s', 'now'), strftime('%s', 'now')),
('b50e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440000', 'Car Insurance', 125.00, '850e8400-e29b-41d4-a716-446655440018', strftime('%s', '2025-11-01'), 'monthly', 7, 'pending', strftime('%s', 'now'), strftime('%s', 'now')),
('b50e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440000', 'Gym Membership', 49.99, '850e8400-e29b-41d4-a716-446655440015', strftime('%s', '2025-10-01'), 'monthly', 3, 'pending', strftime('%s', 'now'), strftime('%s', 'now'));

-- ============================================
-- SEED DATA SUMMARY
-- ============================================
-- Tenant: Demo Family (demofamily)
-- Users: 
--   - admin@demofamily.com (password: password123) - Admin
--   - jane@demofamily.com (password: password123) - Member
-- Accounts: 4 (Checking, Savings, Credit Card, Cash)
-- Categories: 14 (4 income, 10 expense)
-- Transactions: 20+ (mix of income and expenses over 2 months)
-- Budgets: 4 (Groceries, Dining Out, Transportation, Entertainment)
-- Bill Reminders: 4 (Electric, Internet, Insurance, Gym)
-- ============================================
