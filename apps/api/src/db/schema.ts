import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

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
}, (table) => ({
  tenantIdx: index('idx_users_tenant').on(table.tenantId),
  emailIdx: index('idx_users_email').on(table.email),
}));

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
}, (table) => ({
  tenantIdx: index('idx_accounts_tenant').on(table.tenantId),
  typeIdx: index('idx_accounts_type').on(table.type),
}));

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
}, (table) => ({
  tenantTypeIdx: index('idx_categories_tenant_type').on(table.tenantId, table.type),
  parentIdx: index('idx_categories_parent').on(table.parentId),
}));

// Transactions Table (CRITICAL: Most queried table, needs extensive indexing)
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
}, (table) => ({
  // Composite indexes for common query patterns (tenant + date/category/type)
  tenantDateIdx: index('idx_transactions_tenant_date').on(table.tenantId, table.date),
  tenantCategoryIdx: index('idx_transactions_tenant_category').on(table.tenantId, table.categoryId),
  tenantTypeIdx: index('idx_transactions_tenant_type').on(table.tenantId, table.type),
  // Single column indexes
  accountIdx: index('idx_transactions_account').on(table.accountId),
  dateIdx: index('idx_transactions_date').on(table.date),
  categoryIdx: index('idx_transactions_category').on(table.categoryId),
}));

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
}, (table) => ({
  tenantIdx: index('idx_budgets_tenant').on(table.tenantId),
  categoryIdx: index('idx_budgets_category').on(table.categoryId),
  periodIdx: index('idx_budgets_period').on(table.period),
  startDateIdx: index('idx_budgets_start_date').on(table.startDate),
}));

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
}, (table) => ({
  tenantIdx: index('idx_bill_reminders_tenant').on(table.tenantId),
  dueDateIdx: index('idx_bill_reminders_due_date').on(table.dueDate),
  statusIdx: index('idx_bill_reminders_status').on(table.status),
  tenantStatusIdx: index('idx_bill_reminders_tenant_status').on(table.tenantId, table.status),
}));

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
}, (table) => ({
  tenantIdx: index('idx_recurring_tenant').on(table.tenantId),
  nextDateIdx: index('idx_recurring_next_date').on(table.nextDate),
  statusIdx: index('idx_recurring_status').on(table.status),
  autoCreateIdx: index('idx_recurring_auto_create').on(table.autoCreate),
}));

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
}, (table) => ({
  tenantStatusIdx: index('idx_goals_tenant_status').on(table.tenantId, table.status),
  deadlineIdx: index('idx_goals_deadline').on(table.deadline),
  accountIdx: index('idx_goals_account').on(table.accountId),
}));

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
}, (table) => ({
  goalIdx: index('idx_goal_contributions_goal').on(table.goalId),
  dateIdx: index('idx_goal_contributions_date').on(table.date),
  transactionIdx: index('idx_goal_contributions_transaction').on(table.transactionId),
}));

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
}, (table) => ({
  userIdx: index('idx_user_settings_user').on(table.userId),
}));

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
}, (table) => ({
  tenantIdx: index('idx_tenant_members_tenant').on(table.tenantId),
  userIdx: index('idx_tenant_members_user').on(table.userId),
  tenantStatusIdx: index('idx_tenant_members_tenant_status').on(table.tenantId, table.status),
}));
