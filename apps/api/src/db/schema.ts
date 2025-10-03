import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

// Tenants Table
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Users Table
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Accounts Table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['checking', 'savings', 'credit', 'cash', 'investment', 'other'],
  }).notNull(),
  balance: real('balance').notNull().default(0),
  currency: text('currency').notNull().default('GBP'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Categories Table
export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  color: text('color').notNull(),
  icon: text('icon'),
  parentId: text('parent_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Transactions Table
export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  amount: real('amount').notNull(),
  description: text('description').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  type: text('type', { enum: ['income', 'expense', 'transfer'] }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Budgets Table
export const budgets = sqliteTable('budgets', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  amount: real('amount').notNull(),
  period: text('period', { enum: ['weekly', 'monthly', 'yearly'] }).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Bill Reminders Table
export const billReminders = sqliteTable('bill_reminders', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  amount: real('amount').notNull(),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
  frequency: text('frequency', { enum: ['once', 'weekly', 'monthly', 'yearly'] }).notNull(),
  reminderDays: integer('reminder_days').notNull().default(3),
  status: text('status', { enum: ['pending', 'paid', 'overdue'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Recurring Transactions Table
export const recurringTransactions = sqliteTable('recurring_transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  categoryId: text('category_id')
    .notNull()
    .references(() => categories.id),
  description: text('description').notNull(),
  amount: real('amount').notNull(),
  type: text('type', { enum: ['income', 'expense'] }).notNull(),
  frequency: text('frequency', { enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'] }).notNull(),
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  nextDate: integer('next_date', { mode: 'timestamp' }).notNull(),
  endDate: integer('end_date', { mode: 'timestamp' }),
  status: text('status', { enum: ['active', 'paused', 'completed'] }).notNull().default('active'),
  autoCreate: integer('auto_create', { mode: 'boolean' }).notNull().default(true),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Goals Table
export const goals = sqliteTable('goals', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  description: text('description'),
  targetAmount: real('target_amount').notNull(),
  currentAmount: real('current_amount').notNull().default(0),
  deadline: integer('deadline', { mode: 'timestamp' }),
  accountId: text('account_id').references(() => accounts.id),
  status: text('status', { enum: ['active', 'completed', 'abandoned'] }).notNull().default('active'),
  color: text('color').notNull(),
  icon: text('icon').notNull().default('🎯'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Goal Contributions Table
export const goalContributions = sqliteTable('goal_contributions', {
  id: text('id').primaryKey(),
  goalId: text('goal_id')
    .notNull()
    .references(() => goals.id),
  transactionId: text('transaction_id').references(() => transactions.id),
  amount: real('amount').notNull(),
  date: integer('date', { mode: 'timestamp' }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

// User Settings Table
export const userSettings = sqliteTable('user_settings', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id),
  currency: text('currency').notNull().default('GBP'),
  currencySymbol: text('currency_symbol').notNull().default('£'),
  language: text('language').notNull().default('en'),
  timezone: text('timezone').notNull().default('Europe/London'),
  dateFormat: text('date_format').notNull().default('DD/MM/YYYY'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Tenant Members Table (for multi-user access to tenants)
export const tenantMembers = sqliteTable('tenant_members', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull().default('member'),
  invitedBy: text('invited_by').references(() => users.id),
  invitedAt: integer('invited_at', { mode: 'timestamp' }).notNull(),
  joinedAt: integer('joined_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['pending', 'active', 'removed'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});
