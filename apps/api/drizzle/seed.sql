-- Sample seed data for FamilyBudget
-- Run this after the initial migration to populate demo data

-- Insert sample tenant
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES 
  ('tenant-123', 'Demo Family', 'demo-family', strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert sample user (password would be hashed in production)
INSERT INTO users (id, tenant_id, email, name, password_hash, role, created_at, updated_at)
VALUES
  ('user-123', 'tenant-123', 'demo@example.com', 'Demo User', 'hashed-password', 'admin', strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert sample accounts
INSERT INTO accounts (id, tenant_id, name, type, balance, currency, created_at, updated_at)
VALUES
  ('acc-1', 'tenant-123', 'Checking Account', 'checking', 5000.00, 'USD', strftime('%s', 'now'), strftime('%s', 'now')),
  ('acc-2', 'tenant-123', 'Savings Account', 'savings', 15000.00, 'USD', strftime('%s', 'now'), strftime('%s', 'now')),
  ('acc-3', 'tenant-123', 'Credit Card', 'credit', -1200.00, 'USD', strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert sample categories
INSERT INTO categories (id, tenant_id, name, type, color, icon, parent_id, created_at, updated_at)
VALUES
  -- Income categories
  ('cat-1', 'tenant-123', 'Salary', 'income', '#10b981', '💰', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-2', 'tenant-123', 'Freelance', 'income', '#3b82f6', '💼', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Expense categories
  ('cat-3', 'tenant-123', 'Housing', 'expense', '#ef4444', '🏠', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-4', 'tenant-123', 'Food', 'expense', '#f59e0b', '🍔', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-5', 'tenant-123', 'Transportation', 'expense', '#8b5cf6', '🚗', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-6', 'tenant-123', 'Entertainment', 'expense', '#ec4899', '🎮', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-7', 'tenant-123', 'Utilities', 'expense', '#6366f1', '⚡', NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Sub-categories
  ('cat-8', 'tenant-123', 'Rent', 'expense', '#dc2626', '🏠', 'cat-3', strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-9', 'tenant-123', 'Groceries', 'expense', '#f97316', '🛒', 'cat-4', strftime('%s', 'now'), strftime('%s', 'now')),
  ('cat-10', 'tenant-123', 'Restaurants', 'expense', '#fb923c', '🍽️', 'cat-4', strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert sample transactions
INSERT INTO transactions (id, tenant_id, account_id, category_id, amount, description, date, type, notes, created_at, updated_at)
VALUES
  -- Income transactions
  ('txn-1', 'tenant-123', 'acc-1', 'cat-1', 5000.00, 'Monthly Salary', strftime('%s', '2024-01-01'), 'income', 'Regular monthly income', strftime('%s', 'now'), strftime('%s', 'now')),
  ('txn-2', 'tenant-123', 'acc-1', 'cat-2', 800.00, 'Freelance Project', strftime('%s', '2024-01-05'), 'income', 'Website design project', strftime('%s', 'now'), strftime('%s', 'now')),
  
  -- Expense transactions
  ('txn-3', 'tenant-123', 'acc-1', 'cat-8', 1500.00, 'Monthly Rent', strftime('%s', '2024-01-01'), 'expense', 'January rent payment', strftime('%s', 'now'), strftime('%s', 'now')),
  ('txn-4', 'tenant-123', 'acc-1', 'cat-9', 250.00, 'Grocery Shopping', strftime('%s', '2024-01-03'), 'expense', 'Weekly groceries', strftime('%s', 'now'), strftime('%s', 'now')),
  ('txn-5', 'tenant-123', 'acc-3', 'cat-10', 85.00, 'Dinner at Restaurant', strftime('%s', '2024-01-05'), 'expense', 'Family dinner', strftime('%s', 'now'), strftime('%s', 'now')),
  ('txn-6', 'tenant-123', 'acc-1', 'cat-5', 120.00, 'Gas Station', strftime('%s', '2024-01-06'), 'expense', 'Fill up tank', strftime('%s', 'now'), strftime('%s', 'now')),
  ('txn-7', 'tenant-123', 'acc-1', 'cat-7', 180.00, 'Electric Bill', strftime('%s', '2024-01-10'), 'expense', 'Monthly electricity', strftime('%s', 'now'), strftime('%s', 'now')),
  ('txn-8', 'tenant-123', 'acc-1', 'cat-6', 45.00, 'Movie Tickets', strftime('%s', '2024-01-12'), 'expense', 'Weekend entertainment', strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert sample budgets
INSERT INTO budgets (id, tenant_id, category_id, amount, period, start_date, end_date, created_at, updated_at)
VALUES
  ('bdg-1', 'tenant-123', 'cat-4', 500.00, 'monthly', strftime('%s', '2024-01-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('bdg-2', 'tenant-123', 'cat-5', 300.00, 'monthly', strftime('%s', '2024-01-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('bdg-3', 'tenant-123', 'cat-6', 200.00, 'monthly', strftime('%s', '2024-01-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now')),
  ('bdg-4', 'tenant-123', 'cat-7', 250.00, 'monthly', strftime('%s', '2024-01-01'), NULL, strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert sample bill reminders
INSERT INTO bill_reminders (id, tenant_id, name, amount, category_id, due_date, frequency, reminder_days, status, created_at, updated_at)
VALUES
  ('bill-1', 'tenant-123', 'Rent Payment', 1500.00, 'cat-8', strftime('%s', '2024-02-01'), 'monthly', 5, 'pending', strftime('%s', 'now'), strftime('%s', 'now')),
  ('bill-2', 'tenant-123', 'Electric Bill', 180.00, 'cat-7', strftime('%s', '2024-02-10'), 'monthly', 3, 'pending', strftime('%s', 'now'), strftime('%s', 'now')),
  ('bill-3', 'tenant-123', 'Internet Service', 60.00, 'cat-7', strftime('%s', '2024-02-15'), 'monthly', 3, 'pending', strftime('%s', 'now'), strftime('%s', 'now'));
