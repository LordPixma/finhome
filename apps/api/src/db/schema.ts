import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core';

// Tenants Table
export const tenants = sqliteTable('tenants', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  subdomain: text('subdomain').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Global Users Table (unique users across all tenants)
export const globalUsers = sqliteTable('global_users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  isGlobalAdmin: integer('is_global_admin', { mode: 'boolean' }).default(false),
  // Profile fields (shared across tenants)
  profilePictureUrl: text('profile_picture_url'),
  bio: text('bio'),
  phoneNumber: text('phone_number'),
  dateOfBirth: text('date_of_birth'), // YYYY-MM-DD format
  // Address fields
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  emailIdx: index('idx_global_users_email').on(table.email),
  globalAdminIdx: index('idx_global_users_global_admin').on(table.isGlobalAdmin),
}));

// Tenant Users Table (links global users to specific tenants)
export const tenantUsers = sqliteTable('tenant_users', {
  id: text('id').primaryKey(),
  globalUserId: text('global_user_id')
    .notNull()
    .references(() => globalUsers.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  role: text('role', { enum: ['owner', 'admin', 'member'] }).notNull(),
  status: text('status', { enum: ['active', 'inactive', 'suspended'] }).notNull().default('active'),
  // Tenant-specific settings
  displayName: text('display_name'), // Override name for this tenant
  // Permissions specific to this tenant
  canManageAccounts: integer('can_manage_accounts', { mode: 'boolean' }).default(false),
  canManageBudgets: integer('can_manage_budgets', { mode: 'boolean' }).default(false),
  canInviteMembers: integer('can_invite_members', { mode: 'boolean' }).default(false),
  
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  globalUserIdx: index('idx_tenant_users_global').on(table.globalUserId),
  tenantIdx: index('idx_tenant_users_tenant').on(table.tenantId),
  roleIdx: index('idx_tenant_users_role').on(table.role),
  statusIdx: index('idx_tenant_users_status').on(table.status),
  uniqueUserTenant: index('idx_tenant_users_unique').on(table.globalUserId, table.tenantId),
}));

// User Sessions Table (multi-tenant authentication)
export const userSessions = sqliteTable('user_sessions', {
  id: text('id').primaryKey(),
  globalUserId: text('global_user_id')
    .notNull()
    .references(() => globalUsers.id),
  currentTenantId: text('current_tenant_id')
    .references(() => tenants.id), // Can be NULL for tenant selection
  accessTokenHash: text('access_token_hash').notNull(),
  refreshTokenHash: text('refresh_token_hash').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  globalUserIdx: index('idx_user_sessions_global_user').on(table.globalUserId),
  tenantIdx: index('idx_user_sessions_tenant').on(table.currentTenantId),
  accessTokenIdx: index('idx_user_sessions_access_token').on(table.accessTokenHash),
}));

// Legacy Users Table (will be deprecated after migration)
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .references(() => tenants.id),
  email: text('email').notNull(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  // Global admin flag
  isGlobalAdmin: integer('is_global_admin', { mode: 'boolean' }).default(false),
  // Profile fields
  profilePictureUrl: text('profile_picture_url'),
  bio: text('bio'),
  phoneNumber: text('phone_number'),
  dateOfBirth: text('date_of_birth'), // YYYY-MM-DD format
  // Address fields
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  city: text('city'),
  state: text('state'),
  postalCode: text('postal_code'),
  country: text('country'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_users_tenant').on(table.tenantId),
  emailIdx: index('idx_users_email').on(table.email),
  globalAdminIdx: index('idx_users_global_admin').on(table.isGlobalAdmin),
}));

// Accounts Table
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['current', 'savings', 'credit', 'cash', 'investment', 'other'],
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
  providerTransactionId: text('provider_transaction_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  // Composite indexes for common query patterns (tenant + date/category/type)
  tenantDateIdx: index('idx_transactions_tenant_date').on(table.tenantId, table.date),
  tenantCategoryIdx: index('idx_transactions_tenant_category').on(table.tenantId, table.categoryId),
  providerIdx: index('idx_transactions_provider').on(table.providerTransactionId),
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
  tenantUserId: text('tenant_user_id')
    .notNull()
    .unique()
    .references(() => tenantUsers.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  currency: text('currency').notNull().default('GBP'),
  currencySymbol: text('currency_symbol').notNull().default('£'),
  language: text('language').notNull().default('en'),
  timezone: text('timezone').notNull().default('Europe/London'),
  dateFormat: text('date_format').notNull().default('DD/MM/YYYY'),
  onboardingComplete: integer('onboarding_complete', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantUserIdx: index('idx_user_settings_tenant_user').on(table.tenantUserId),
  tenantIdx: index('idx_user_settings_tenant').on(table.tenantId),
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

// Bank Connections Table (Open Banking integration)
// Open Banking tables removed in Bankless Edition (Nov 2025):
// - bank_connections
// - bank_accounts
// - transaction_sync_history
// See Docs/DEPRECATIONS.md and migration 0005_drop_open_banking.sql

// Global Admin Action Log Table
export const globalAdminActions = sqliteTable('global_admin_actions', {
  id: text('id').primaryKey(),
  adminUserId: text('admin_user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(), // e.g., 'tenant_created', 'user_suspended', 'tenant_deleted'
  targetType: text('target_type').notNull(), // 'tenant', 'user', 'system'
  targetId: text('target_id'), // ID of the affected resource
  details: text('details'), // JSON string with additional details
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  adminIdx: index('idx_global_admin_actions_admin').on(table.adminUserId),
  actionIdx: index('idx_global_admin_actions_action').on(table.action),
  targetIdx: index('idx_global_admin_actions_target').on(table.targetType, table.targetId),
  dateIdx: index('idx_global_admin_actions_date').on(table.createdAt),
}));

// Global Admin Settings Table
export const globalAdminSettings = sqliteTable('global_admin_settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  description: text('description'),
  updatedBy: text('updated_by').references(() => users.id),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  keyIdx: index('idx_global_admin_settings_key').on(table.key),
}));

// MFA for Global Admins
export const globalAdminMFA = sqliteTable('global_admin_mfa', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  secret: text('secret').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  backupCodes: text('backup_codes'), // JSON array
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdx: index('idx_global_admin_mfa_user').on(table.userId),
}));

// Tenant Analytics
export const tenantAnalytics = sqliteTable('tenant_analytics', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  date: text('date').notNull(), // YYYY-MM-DD
  activeUsers: integer('active_users').default(0),
  totalTransactions: integer('total_transactions').default(0),
  totalAmount: real('total_amount').default(0.0),
  apiRequests: integer('api_requests').default(0),
  storageUsed: integer('storage_used').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantDateIdx: index('idx_tenant_analytics_tenant_date').on(table.tenantId, table.date),
}));

// Tenant Feature Flags
export const tenantFeatures = sqliteTable('tenant_features', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().references(() => tenants.id),
  featureKey: text('feature_key').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  config: text('config'), // JSON
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantFeatureIdx: index('idx_tenant_features_tenant_feature').on(table.tenantId, table.featureKey),
}));

// Global Feature Flags
export const globalFeatures = sqliteTable('global_features', {
  id: text('id').primaryKey(),
  featureKey: text('feature_key').notNull().unique(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  rolloutPercentage: integer('rollout_percentage').default(100),
  config: text('config'), // JSON
  description: text('description'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  featureKeyIdx: index('idx_global_features_key').on(table.featureKey),
}));

// Admin Sessions
export const adminSessions = sqliteTable('admin_sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  locationInfo: text('location_info'), // JSON
  loginAt: integer('login_at', { mode: 'timestamp' }).notNull(),
  logoutAt: integer('logout_at', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  mfaVerified: integer('mfa_verified', { mode: 'boolean' }).notNull().default(false),
}, (table) => ({
  userActiveIdx: index('idx_admin_sessions_user_active').on(table.userId, table.isActive),
}));

// Security Incidents
export const securityIncidents = sqliteTable('security_incidents', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  severity: text('severity').notNull(),
  tenantId: text('tenant_id').references(() => tenants.id),
  userId: text('user_id').references(() => users.id),
  description: text('description').notNull(),
  metadata: text('metadata'), // JSON
  status: text('status').notNull().default('open'),
  assignedTo: text('assigned_to').references(() => users.id),
  resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  severityStatusIdx: index('idx_security_incidents_severity_status').on(table.severity, table.status),
}));

// System Metrics
export const systemMetrics = sqliteTable('system_metrics', {
  id: text('id').primaryKey(),
  metricName: text('metric_name').notNull(),
  metricValue: real('metric_value').notNull(),
  metricType: text('metric_type').notNull(),
  tags: text('tags'), // JSON
  timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  nameTimestampIdx: index('idx_system_metrics_name_timestamp').on(table.metricName, table.timestamp),
}));

// Tenant Billing
export const tenantBilling = sqliteTable('tenant_billing', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().unique().references(() => tenants.id),
  planType: text('plan_type').notNull().default('free'),
  billingEmail: text('billing_email'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

// Data Export Requests
export const dataExportRequests = sqliteTable('data_export_requests', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id),
  userId: text('user_id').references(() => users.id),
  requestType: text('request_type').notNull(),
  email: text('email').notNull(),
  status: text('status').notNull().default('pending'),
  fileUrl: text('file_url'),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  requestedBy: text('requested_by').notNull().references(() => users.id),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  statusIdx: index('idx_data_export_status').on(table.status, table.createdAt),
}));

// Import Logs Table
export const importLogs = sqliteTable('import_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  accountId: text('account_id').references(() => accounts.id),
  fileName: text('file_name').notNull(),
  fileSize: integer('file_size').notNull(), // in bytes
  fileType: text('file_type').notNull(),
  status: text('status', { enum: ['processing', 'success', 'partial', 'failed'] }).notNull(),
  transactionsImported: integer('transactions_imported').notNull().default(0),
  transactionsFailed: integer('transactions_failed').notNull().default(0),
  transactionsTotal: integer('transactions_total').notNull().default(0),
  errorMessage: text('error_message'),
  errorDetails: text('error_details'), // JSON string with detailed errors
  processingTimeMs: integer('processing_time_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
}, (table) => ({
  tenantIdx: index('idx_import_logs_tenant').on(table.tenantId),
  userIdx: index('idx_import_logs_user').on(table.userId),
  statusIdx: index('idx_import_logs_status').on(table.status),
  tenantDateIdx: index('idx_import_logs_tenant_date').on(table.tenantId, table.createdAt),
}));

