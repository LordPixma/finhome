-- Initial migration for FamilyBudget database schema
-- Created: 2024-01-01

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  -- Profile enhancement columns (included in initial schema for fresh DBs)
  profile_picture_url TEXT,
  bio TEXT,
  phone_number TEXT,
  date_of_birth TEXT, -- YYYY-MM-DD format
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('checking', 'savings', 'credit', 'cash', 'investment', 'other')),
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT NOT NULL,
  icon TEXT,
  parent_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  description TEXT NOT NULL,
  date INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  notes TEXT,
  -- Open Banking provider transaction identifier (nullable)
  provider_transaction_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  amount REAL NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('weekly', 'monthly', 'yearly')),
  start_date INTEGER NOT NULL,
  end_date INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Bill Reminders table
CREATE TABLE IF NOT EXISTS bill_reminders (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  category_id TEXT NOT NULL,
  due_date INTEGER NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('once', 'weekly', 'monthly', 'yearly')),
  reminder_days INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_tenant_id ON accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_id ON categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_id ON budgets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_tenant_id ON bill_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bill_reminders_due_date ON bill_reminders(due_date);
