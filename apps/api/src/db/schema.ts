import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
  uniqueUserTenant: uniqueIndex('uniq_tenant_users_user_tenant').on(table.globalUserId, table.tenantId),
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
  uniqueTenantEmail: uniqueIndex('uniq_users_tenant_email').on(table.tenantId, table.email),
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
  // Composite indexes for common query patterns (tenant + date/category/type/account)
  tenantDateIdx: index('idx_transactions_tenant_date').on(table.tenantId, table.date),
  tenantCategoryIdx: index('idx_transactions_tenant_category').on(table.tenantId, table.categoryId),
  tenantAccountIdx: index('idx_transactions_tenant_account').on(table.tenantId, table.accountId),
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
  category: text('category', {
    enum: ['emergency', 'vacation', 'home', 'education', 'vehicle', 'investment', 'wedding', 'retirement', 'other']
  }),
  status: text('status', { enum: ['active', 'completed', 'abandoned'] }).notNull().default('active'),
  color: text('color').notNull(),
  icon: text('icon').notNull().default('🎯'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantStatusIdx: index('idx_goals_tenant_status').on(table.tenantId, table.status),
  deadlineIdx: index('idx_goals_deadline').on(table.deadline),
  accountIdx: index('idx_goals_account').on(table.accountId),
  categoryIdx: index('idx_goals_category').on(table.category),
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
  dashboardTourCompleted: integer('dashboard_tour_completed', { mode: 'boolean' }).notNull().default(false),
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
  uniqueMemberPerTenant: uniqueIndex('uniq_tenant_members_user_tenant').on(table.tenantId, table.userId),
}));

// Bank Connections Table (Open Banking integration with TrueLayer)
export const bankConnections = sqliteTable('bank_connections', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  provider: text('provider').notNull().default('truelayer'),
  providerConnectionId: text('provider_connection_id').notNull(),
  institutionId: text('institution_id'),
  institutionName: text('institution_name'),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),
  status: text('status', { enum: ['active', 'disconnected', 'expired', 'error'] }).notNull().default('active'),
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
  lastError: text('last_error'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_bank_connections_tenant').on(table.tenantId),
  tenantStatusIdx: index('idx_bank_connections_tenant_status').on(table.tenantId, table.status),
  userIdx: index('idx_bank_connections_user').on(table.userId),
  statusIdx: index('idx_bank_connections_status').on(table.status),
  providerConnectionIdx: index('idx_bank_connections_provider').on(table.provider, table.providerConnectionId),
}));

// Bank Accounts Table (linked accounts from TrueLayer)
export const bankAccounts = sqliteTable('bank_accounts', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id')
    .notNull()
    .references(() => bankConnections.id),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id),
  providerAccountId: text('provider_account_id').notNull(),
  accountNumber: text('account_number'),
  sortCode: text('sort_code'),
  iban: text('iban'),
  accountType: text('account_type'),
  currency: text('currency').default('GBP'),
  syncFromDate: integer('sync_from_date', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  connectionIdx: index('idx_bank_accounts_connection').on(table.connectionId),
  accountIdx: index('idx_bank_accounts_account').on(table.accountId),
  providerAccountIdx: index('idx_bank_accounts_provider').on(table.providerAccountId),
}));

// Transaction Sync History Table
export const transactionSyncHistory = sqliteTable('transaction_sync_history', {
  id: text('id').primaryKey(),
  connectionId: text('connection_id')
    .notNull()
    .references(() => bankConnections.id),
  bankAccountId: text('bank_account_id')
    .references(() => bankAccounts.id),
  syncStartedAt: integer('sync_started_at', { mode: 'timestamp' }).notNull(),
  syncCompletedAt: integer('sync_completed_at', { mode: 'timestamp' }),
  transactionsFetched: integer('transactions_fetched').default(0),
  transactionsImported: integer('transactions_imported').default(0),
  transactionsSkipped: integer('transactions_skipped').default(0),
  transactionsFailed: integer('transactions_failed').default(0),
  status: text('status', { enum: ['in_progress', 'completed', 'failed'] }).notNull().default('in_progress'),
  errorMessage: text('error_message'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  connectionIdx: index('idx_sync_history_connection').on(table.connectionId),
  statusIdx: index('idx_sync_history_status').on(table.status),
  dateIdx: index('idx_sync_history_date').on(table.syncStartedAt),
}));

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

// Comprehensive Audit Log Table (All user activities across all tenants)
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').references(() => tenants.id), // null for global admin actions
  userId: text('user_id').notNull().references(() => users.id),
  userName: text('user_name').notNull(),
  userEmail: text('user_email').notNull(),
  action: text('action').notNull(), // 'create', 'update', 'delete', 'login', 'logout', 'view', etc.
  resource: text('resource').notNull(), // 'transaction', 'account', 'budget', 'user', 'tenant', etc.
  resourceId: text('resource_id'), // ID of affected resource
  method: text('method').notNull(), // 'POST', 'GET', 'PUT', 'DELETE'
  endpoint: text('endpoint').notNull(), // API endpoint called
  statusCode: integer('status_code').notNull(), // HTTP status code
  details: text('details'), // JSON string with request/response details
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  duration: integer('duration'), // Request duration in ms
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_audit_logs_tenant').on(table.tenantId),
  userIdx: index('idx_audit_logs_user').on(table.userId),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  resourceIdx: index('idx_audit_logs_resource').on(table.resource),
  dateIdx: index('idx_audit_logs_date').on(table.createdAt),
  tenantDateIdx: index('idx_audit_logs_tenant_date').on(table.tenantId, table.createdAt),
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

// MFA for Regular Users
export const userMFA = sqliteTable('user_mfa', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  secret: text('secret').notNull(),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).notNull().default(false),
  backupCodes: text('backup_codes'), // JSON array of hashed backup codes
  recoveryEmail: text('recovery_email'), // Optional verified recovery email
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdx: index('idx_user_mfa_user').on(table.userId),
}));

// Trusted Devices for MFA (Remember Device feature)
export const trustedDevices = sqliteTable('trusted_devices', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  deviceName: text('device_name').notNull(), // Browser/OS identifier
  deviceFingerprint: text('device_fingerprint').notNull().unique(), // Hashed fingerprint
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(), // 30 days from creation
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  userIdx: index('idx_trusted_devices_user').on(table.userId),
  fingerprintIdx: index('idx_trusted_devices_fingerprint').on(table.deviceFingerprint),
  expiresIdx: index('idx_trusted_devices_expires').on(table.expiresAt),
}));

// Tenant MFA Settings (Admin policy)
export const tenantMFASettings = sqliteTable('tenant_mfa_settings', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull().unique().references(() => tenants.id),
  enforceMFA: integer('enforce_mfa', { mode: 'boolean' }).notNull().default(false), // Require all users to enable MFA
  gracePeriodDays: integer('grace_period_days').notNull().default(7), // Days to enable MFA after enforcement
  enforcedAt: integer('enforced_at', { mode: 'timestamp' }), // When enforcement started
  enforcedBy: text('enforced_by').references(() => users.id), // Admin who enabled enforcement
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_tenant_mfa_settings_tenant').on(table.tenantId),
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

// ============================================
// FINANCIAL HEALTH SYSTEM TABLES
// ============================================

// Financial Health Scores Table - Stores historical health score calculations
export const financialHealthScores = sqliteTable('financial_health_scores', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  // Overall score (0-100)
  overallScore: integer('overall_score').notNull(),
  // Individual component scores (0-100 each)
  savingsScore: integer('savings_score').notNull(),
  debtScore: integer('debt_score').notNull(),
  emergencyFundScore: integer('emergency_fund_score').notNull(),
  budgetScore: integer('budget_score').notNull(),
  cashFlowScore: integer('cash_flow_score').notNull(),
  // Score breakdown metadata (JSON)
  scoreBreakdown: text('score_breakdown'), // JSON with detailed breakdown
  // Metrics used for calculation
  monthlyIncome: real('monthly_income'),
  monthlyExpenses: real('monthly_expenses'),
  totalSavings: real('total_savings'),
  totalDebt: real('total_debt'),
  emergencyFundBalance: real('emergency_fund_balance'),
  // Score category: 'excellent' | 'good' | 'fair' | 'needs_improvement' | 'critical'
  scoreCategory: text('score_category', {
    enum: ['excellent', 'good', 'fair', 'needs_improvement', 'critical']
  }).notNull(),
  // Insights and recommendations (JSON array)
  insights: text('insights'),
  recommendations: text('recommendations'),
  // Calculation timestamp
  calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_financial_health_scores_tenant').on(table.tenantId),
  tenantDateIdx: index('idx_financial_health_scores_tenant_date').on(table.tenantId, table.calculatedAt),
  scoreCategoryIdx: index('idx_financial_health_scores_category').on(table.scoreCategory),
  overallScoreIdx: index('idx_financial_health_scores_overall').on(table.overallScore),
}));

// User Financial Profiles Table - Stores user financial profile data for personalized analysis
export const userFinancialProfiles = sqliteTable('user_financial_profiles', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .unique()
    .references(() => tenants.id),
  // Income information
  monthlyIncome: real('monthly_income'),
  incomeSource: text('income_source', {
    enum: ['employed', 'self_employed', 'retired', 'student', 'other']
  }),
  employmentStatus: text('employment_status', {
    enum: ['full_time', 'part_time', 'contract', 'freelance', 'unemployed', 'retired']
  }),
  // Household information
  householdSize: integer('household_size').default(1),
  dependents: integer('dependents').default(0),
  housingStatus: text('housing_status', {
    enum: ['own_outright', 'mortgage', 'rent', 'living_with_family', 'other']
  }),
  monthlyRentMortgage: real('monthly_rent_mortgage'),
  // Debt information
  totalDebtBalance: real('total_debt_balance').default(0),
  monthlyDebtPayments: real('monthly_debt_payments').default(0),
  // Emergency fund
  emergencyFundTarget: real('emergency_fund_target'), // Target in months of expenses
  emergencyFundAccountId: text('emergency_fund_account_id').references(() => accounts.id),
  // Risk profile
  riskTolerance: text('risk_tolerance', {
    enum: ['conservative', 'moderate', 'aggressive']
  }).default('moderate'),
  // Financial goals (JSON array)
  financialGoals: text('financial_goals'), // JSON array of goal types
  // Retirement
  retirementAge: integer('retirement_age'),
  hasRetirementAccount: integer('has_retirement_account', { mode: 'boolean' }).default(false),
  // Insurance
  hasLifeInsurance: integer('has_life_insurance', { mode: 'boolean' }).default(false),
  hasHealthInsurance: integer('has_health_insurance', { mode: 'boolean' }).default(false),
  hasIncomeProtection: integer('has_income_protection', { mode: 'boolean' }).default(false),
  // Profile completion
  profileCompleteness: integer('profile_completeness').default(0), // 0-100
  lastUpdatedAt: integer('last_updated_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_user_financial_profiles_tenant').on(table.tenantId),
  completenessIdx: index('idx_user_financial_profiles_completeness').on(table.profileCompleteness),
}));

// Financial Health History Table - Track score changes over time
export const financialHealthHistory = sqliteTable('financial_health_history', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  scoreId: text('score_id')
    .notNull()
    .references(() => financialHealthScores.id),
  previousScore: integer('previous_score'),
  newScore: integer('new_score').notNull(),
  scoreDelta: integer('score_delta').notNull(), // Change from previous
  changeReason: text('change_reason'), // AI-generated explanation of change
  period: text('period').notNull(), // 'YYYY-MM' format for monthly tracking
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_financial_health_history_tenant').on(table.tenantId),
  tenantPeriodIdx: index('idx_financial_health_history_tenant_period').on(table.tenantId, table.period),
  scoreIdIdx: index('idx_financial_health_history_score').on(table.scoreId),
}));

// Debt Tracking Table - Track individual debts for debt-to-income calculations
export const debtAccounts = sqliteTable('debt_accounts', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['mortgage', 'car_loan', 'student_loan', 'credit_card', 'personal_loan', 'overdraft', 'other']
  }).notNull(),
  // Linked account (optional)
  linkedAccountId: text('linked_account_id').references(() => accounts.id),
  // Debt details
  originalBalance: real('original_balance').notNull(),
  currentBalance: real('current_balance').notNull(),
  interestRate: real('interest_rate'), // APR as decimal (e.g., 0.199 for 19.9%)
  minimumPayment: real('minimum_payment'),
  monthlyPayment: real('monthly_payment'),
  // Loan term
  startDate: integer('start_date', { mode: 'timestamp' }),
  endDate: integer('end_date', { mode: 'timestamp' }),
  // Status
  status: text('status', {
    enum: ['active', 'paid_off', 'defaulted', 'refinanced']
  }).notNull().default('active'),
  // Creditor info
  creditorName: text('creditor_name'),
  // Priority for payoff strategies
  payoffPriority: integer('payoff_priority').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_debt_accounts_tenant').on(table.tenantId),
  tenantTypeIdx: index('idx_debt_accounts_tenant_type').on(table.tenantId, table.type),
  tenantStatusIdx: index('idx_debt_accounts_tenant_status').on(table.tenantId, table.status),
  linkedAccountIdx: index('idx_debt_accounts_linked').on(table.linkedAccountId),
}));

// AI Financial Insights Table - Store AI-generated insights for caching and history
export const aiFinancialInsights = sqliteTable('ai_financial_insights', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  insightType: text('insight_type', {
    enum: ['spending_pattern', 'savings_opportunity', 'debt_advice', 'budget_recommendation', 'anomaly_detection', 'goal_progress', 'general_advice']
  }).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  // Severity/Priority
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'urgent']
  }).notNull().default('medium'),
  // Impact
  potentialImpact: real('potential_impact'), // Estimated £ impact
  // Action items (JSON array)
  actionItems: text('action_items'),
  // Related entities
  relatedCategoryId: text('related_category_id').references(() => categories.id),
  relatedAccountId: text('related_account_id').references(() => accounts.id),
  relatedGoalId: text('related_goal_id').references(() => goals.id),
  // User interaction
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isDismissed: integer('is_dismissed', { mode: 'boolean' }).default(false),
  isActedUpon: integer('is_acted_upon', { mode: 'boolean' }).default(false),
  // Validity period
  validUntil: integer('valid_until', { mode: 'timestamp' }),
  generatedAt: integer('generated_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_ai_financial_insights_tenant').on(table.tenantId),
  tenantTypeIdx: index('idx_ai_financial_insights_tenant_type').on(table.tenantId, table.insightType),
  tenantPriorityIdx: index('idx_ai_financial_insights_priority').on(table.tenantId, table.priority),
  readIdx: index('idx_ai_financial_insights_read').on(table.isRead),
  validUntilIdx: index('idx_ai_financial_insights_valid').on(table.validUntil),
}));

// ============================================
// CREDIT RISK ASSESSMENT TABLES
// ============================================

// Internal Credit Risk Scores - Mimics credit bureau scoring (0-999 like Experian)
export const creditRiskScores = sqliteTable('credit_risk_scores', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  // Overall risk score (0-999 scale)
  overallScore: integer('overall_score').notNull(),
  // Score band: 'excellent' | 'good' | 'fair' | 'poor' | 'very_poor'
  scoreBand: text('score_band', {
    enum: ['excellent', 'good', 'fair', 'poor', 'very_poor']
  }).notNull(),
  // Individual risk factor scores (0-100 each)
  paymentHistoryScore: integer('payment_history_score').notNull(),
  creditUtilizationScore: integer('credit_utilization_score').notNull(),
  creditAgeScore: integer('credit_age_score').notNull(),
  creditMixScore: integer('credit_mix_score').notNull(),
  recentInquiriesScore: integer('recent_inquiries_score').notNull(),
  // Key metrics used for calculation
  totalCreditLimit: real('total_credit_limit'),
  totalCreditUsed: real('total_credit_used'),
  utilizationPercentage: real('utilization_percentage'),
  oldestAccountAge: integer('oldest_account_age'), // in months
  averageAccountAge: integer('average_account_age'), // in months
  numberOfAccounts: integer('number_of_accounts'),
  missedPayments: integer('missed_payments').default(0),
  // Score breakdown (JSON)
  scoreBreakdown: text('score_breakdown'),
  // Risk factors identified (JSON array)
  riskFactors: text('risk_factors'),
  // Positive factors identified (JSON array)
  positiveFactors: text('positive_factors'),
  // Improvement tips (JSON array)
  improvementTips: text('improvement_tips'),
  // Calculation timestamp
  calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_credit_risk_scores_tenant').on(table.tenantId),
  tenantDateIdx: index('idx_credit_risk_scores_tenant_date').on(table.tenantId, table.calculatedAt),
  scoreBandIdx: index('idx_credit_risk_scores_band').on(table.scoreBand),
  overallScoreIdx: index('idx_credit_risk_scores_overall').on(table.overallScore),
}));

// Credit Risk History - Track score changes over time
export const creditRiskHistory = sqliteTable('credit_risk_history', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  scoreId: text('score_id')
    .notNull()
    .references(() => creditRiskScores.id),
  previousScore: integer('previous_score'),
  newScore: integer('new_score').notNull(),
  scoreDelta: integer('score_delta').notNull(),
  changeReason: text('change_reason'),
  period: text('period').notNull(), // 'YYYY-MM' format
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_credit_risk_history_tenant').on(table.tenantId),
  tenantPeriodIdx: index('idx_credit_risk_history_tenant_period').on(table.tenantId, table.period),
  scoreIdIdx: index('idx_credit_risk_history_score').on(table.scoreId),
}));

// Credit Bureau Connections - For future Experian/Equifax/TransUnion integration
export const creditBureauConnections = sqliteTable('credit_bureau_connections', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  bureau: text('bureau', {
    enum: ['experian', 'equifax', 'transunion']
  }).notNull(),
  // Connection status
  status: text('status', {
    enum: ['pending', 'active', 'disconnected', 'expired', 'error']
  }).notNull().default('pending'),
  // OAuth/API credentials (encrypted in production)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: integer('token_expires_at', { mode: 'timestamp' }),
  // User identifiers at bureau
  bureauUserId: text('bureau_user_id'),
  // Last sync info
  lastSyncAt: integer('last_sync_at', { mode: 'timestamp' }),
  lastSyncStatus: text('last_sync_status'),
  lastError: text('last_error'),
  // Consent and compliance
  consentGivenAt: integer('consent_given_at', { mode: 'timestamp' }),
  consentExpiresAt: integer('consent_expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_credit_bureau_connections_tenant').on(table.tenantId),
  tenantBureauIdx: uniqueIndex('uniq_credit_bureau_connections_tenant_bureau').on(table.tenantId, table.bureau),
  statusIdx: index('idx_credit_bureau_connections_status').on(table.status),
}));

// Credit Reports - Store fetched credit reports from bureaus
export const creditReports = sqliteTable('credit_reports', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  connectionId: text('connection_id')
    .references(() => creditBureauConnections.id),
  bureau: text('bureau', {
    enum: ['experian', 'equifax', 'transunion', 'internal']
  }).notNull(),
  // Official credit score from bureau
  creditScore: integer('credit_score'),
  scoreBand: text('score_band'),
  scoreDate: integer('score_date', { mode: 'timestamp' }),
  // Report data (JSON - structured credit report data)
  reportData: text('report_data'),
  // Key summary metrics
  totalAccounts: integer('total_accounts'),
  openAccounts: integer('open_accounts'),
  closedAccounts: integer('closed_accounts'),
  delinquentAccounts: integer('delinquent_accounts'),
  totalBalances: real('total_balances'),
  totalCreditLimit: real('total_credit_limit'),
  // Inquiries
  hardInquiries: integer('hard_inquiries'),
  softInquiries: integer('soft_inquiries'),
  // Public records
  bankruptcies: integer('bankruptcies').default(0),
  judgments: integer('judgments').default(0),
  liens: integer('liens').default(0),
  // Report validity
  reportDate: integer('report_date', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_credit_reports_tenant').on(table.tenantId),
  tenantBureauIdx: index('idx_credit_reports_tenant_bureau').on(table.tenantId, table.bureau),
  connectionIdx: index('idx_credit_reports_connection').on(table.connectionId),
  reportDateIdx: index('idx_credit_reports_date').on(table.reportDate),
}));

// Loan Affordability Assessments - AI-driven loan eligibility analysis
export const loanAffordabilityAssessments = sqliteTable('loan_affordability_assessments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  // Assessment type
  loanType: text('loan_type', {
    enum: ['mortgage', 'personal', 'auto', 'credit_card', 'student', 'business', 'other']
  }).notNull(),
  // Requested loan details
  requestedAmount: real('requested_amount').notNull(),
  requestedTerm: integer('requested_term'), // in months
  estimatedInterestRate: real('estimated_interest_rate'),
  // Affordability results
  maxAffordableAmount: real('max_affordable_amount'),
  recommendedAmount: real('recommended_amount'),
  monthlyPaymentEstimate: real('monthly_payment_estimate'),
  totalInterestEstimate: real('total_interest_estimate'),
  // Affordability score (0-100)
  affordabilityScore: integer('affordability_score').notNull(),
  affordabilityBand: text('affordability_band', {
    enum: ['very_affordable', 'affordable', 'stretching', 'risky', 'unaffordable']
  }).notNull(),
  // Key metrics used
  monthlyIncome: real('monthly_income'),
  monthlyExpenses: real('monthly_expenses'),
  existingDebtPayments: real('existing_debt_payments'),
  disposableIncome: real('disposable_income'),
  debtToIncomeRatio: real('debt_to_income_ratio'),
  debtToIncomeAfterLoan: real('debt_to_income_after_loan'),
  // Stress test results (JSON)
  stressTestResults: text('stress_test_results'),
  // Risk factors (JSON array)
  riskFactors: text('risk_factors'),
  // Recommendations (JSON array)
  recommendations: text('recommendations'),
  // AI analysis summary
  aiSummary: text('ai_summary'),
  // Assessment status
  status: text('status', {
    enum: ['draft', 'completed', 'expired']
  }).notNull().default('draft'),
  calculatedAt: integer('calculated_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_loan_affordability_tenant').on(table.tenantId),
  tenantTypeIdx: index('idx_loan_affordability_tenant_type').on(table.tenantId, table.loanType),
  statusIdx: index('idx_loan_affordability_status').on(table.status),
  dateIdx: index('idx_loan_affordability_date').on(table.calculatedAt),
}));

// ============================================
// NOTIFICATIONS SYSTEM TABLES
// ============================================

// User Notification Preferences
export const notificationPreferences = sqliteTable('notification_preferences', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  // Email preferences
  emailEnabled: integer('email_enabled', { mode: 'boolean' }).default(true),
  emailBudgetAlerts: integer('email_budget_alerts', { mode: 'boolean' }).default(true),
  emailBillReminders: integer('email_bill_reminders', { mode: 'boolean' }).default(true),
  emailGoalMilestones: integer('email_goal_milestones', { mode: 'boolean' }).default(true),
  emailUnusualSpending: integer('email_unusual_spending', { mode: 'boolean' }).default(true),
  emailWeeklySummary: integer('email_weekly_summary', { mode: 'boolean' }).default(true),
  emailMonthlyReport: integer('email_monthly_report', { mode: 'boolean' }).default(false),
  // Push/In-app preferences
  pushEnabled: integer('push_enabled', { mode: 'boolean' }).default(true),
  pushBudgetAlerts: integer('push_budget_alerts', { mode: 'boolean' }).default(true),
  pushBillReminders: integer('push_bill_reminders', { mode: 'boolean' }).default(true),
  pushGoalMilestones: integer('push_goal_milestones', { mode: 'boolean' }).default(true),
  pushUnusualSpending: integer('push_unusual_spending', { mode: 'boolean' }).default(true),
  pushLowBalance: integer('push_low_balance', { mode: 'boolean' }).default(true),
  pushLargeTransactions: integer('push_large_transactions', { mode: 'boolean' }).default(true),
  // Alert thresholds
  budgetAlertThreshold: integer('budget_alert_threshold').default(80),
  lowBalanceThreshold: real('low_balance_threshold').default(100),
  largeTransactionThreshold: real('large_transaction_threshold').default(500),
  unusualSpendingSensitivity: text('unusual_spending_sensitivity', {
    enum: ['low', 'medium', 'high']
  }).default('medium'),
  // Quiet hours
  quietHoursEnabled: integer('quiet_hours_enabled', { mode: 'boolean' }).default(false),
  quietHoursStart: text('quiet_hours_start').default('22:00'),
  quietHoursEnd: text('quiet_hours_end').default('08:00'),
  // Frequency settings
  digestFrequency: text('digest_frequency', {
    enum: ['realtime', 'daily', 'weekly']
  }).default('realtime'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_notification_preferences_tenant').on(table.tenantId),
  userIdx: index('idx_notification_preferences_user').on(table.userId),
  uniqueTenantUser: uniqueIndex('uniq_notification_preferences_tenant_user').on(table.tenantId, table.userId),
}));

// Notifications Table
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  // Notification details
  type: text('type', {
    enum: ['budget_alert', 'bill_reminder', 'goal_milestone', 'unusual_spending', 'low_balance', 'large_transaction', 'system', 'insight']
  }).notNull(),
  category: text('category', {
    enum: ['alert', 'reminder', 'milestone', 'insight', 'system']
  }).notNull(),
  priority: text('priority', {
    enum: ['low', 'medium', 'high', 'urgent']
  }).notNull().default('medium'),
  // Content
  title: text('title').notNull(),
  message: text('message').notNull(),
  actionUrl: text('action_url'),
  actionLabel: text('action_label'),
  // Icon and styling
  icon: text('icon'),
  color: text('color'),
  // Related entities
  relatedEntityType: text('related_entity_type', {
    enum: ['budget', 'bill', 'goal', 'transaction', 'account', 'category']
  }),
  relatedEntityId: text('related_entity_id'),
  // Metadata
  metadata: text('metadata'),
  // Status
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  readAt: integer('read_at', { mode: 'timestamp' }),
  isDismissed: integer('is_dismissed', { mode: 'boolean' }).default(false),
  dismissedAt: integer('dismissed_at', { mode: 'timestamp' }),
  isActioned: integer('is_actioned', { mode: 'boolean' }).default(false),
  actionedAt: integer('actioned_at', { mode: 'timestamp' }),
  // Delivery status
  emailSent: integer('email_sent', { mode: 'boolean' }).default(false),
  emailSentAt: integer('email_sent_at', { mode: 'timestamp' }),
  pushSent: integer('push_sent', { mode: 'boolean' }).default(false),
  pushSentAt: integer('push_sent_at', { mode: 'timestamp' }),
  // Expiry
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_notifications_tenant').on(table.tenantId),
  userIdx: index('idx_notifications_user').on(table.userId),
  tenantUserIdx: index('idx_notifications_tenant_user').on(table.tenantId, table.userId),
  typeIdx: index('idx_notifications_type').on(table.type),
  readIdx: index('idx_notifications_read').on(table.isRead),
  createdIdx: index('idx_notifications_created').on(table.createdAt),
  tenantUserUnreadIdx: index('idx_notifications_tenant_user_unread').on(table.tenantId, table.userId, table.isRead),
}));

// Alert Rules Table - Custom user-defined alert rules
export const alertRules = sqliteTable('alert_rules', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  // Rule details
  name: text('name').notNull(),
  description: text('description'),
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  // Rule type and conditions
  ruleType: text('rule_type', {
    enum: ['spending', 'balance', 'transaction', 'budget', 'category']
  }).notNull(),
  conditions: text('conditions').notNull(), // JSON
  // Actions
  actions: text('actions').notNull(), // JSON array
  // Related entities
  categoryId: text('category_id').references(() => categories.id),
  accountId: text('account_id').references(() => accounts.id),
  budgetId: text('budget_id').references(() => budgets.id),
  // Cooldown
  cooldownMinutes: integer('cooldown_minutes').default(60),
  lastTriggeredAt: integer('last_triggered_at', { mode: 'timestamp' }),
  triggerCount: integer('trigger_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_alert_rules_tenant').on(table.tenantId),
  userIdx: index('idx_alert_rules_user').on(table.userId),
  enabledIdx: index('idx_alert_rules_enabled').on(table.isEnabled),
  typeIdx: index('idx_alert_rules_type').on(table.ruleType),
}));

// ============================================
// SCHEDULED REPORTS TABLE
// ============================================

// Scheduled Reports - User-configured recurring report schedules
export const scheduledReports = sqliteTable('scheduled_reports', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  // Report configuration
  name: text('name').notNull(),
  reportType: text('report_type', {
    enum: ['transactions', 'budgets', 'goals', 'analytics', 'all']
  }).notNull(),
  format: text('format', {
    enum: ['csv', 'json']
  }).notNull().default('csv'),
  // Schedule
  frequency: text('frequency', {
    enum: ['daily', 'weekly', 'monthly']
  }).notNull(),
  dayOfWeek: integer('day_of_week'), // 0-6 for weekly (0 = Sunday)
  dayOfMonth: integer('day_of_month'), // 1-31 for monthly
  timeOfDay: text('time_of_day').default('09:00'), // HH:MM format
  timezone: text('timezone').default('Europe/London'),
  // Filter options
  includeAllTime: integer('include_all_time', { mode: 'boolean' }).default(false),
  lookbackDays: integer('lookback_days').default(30), // Days to include in report
  // Delivery
  deliveryEmail: text('delivery_email').notNull(),
  // Status
  isEnabled: integer('is_enabled', { mode: 'boolean' }).default(true),
  lastRunAt: integer('last_run_at', { mode: 'timestamp' }),
  lastRunStatus: text('last_run_status', {
    enum: ['success', 'failed', 'pending']
  }),
  lastError: text('last_error'),
  nextRunAt: integer('next_run_at', { mode: 'timestamp' }),
  runCount: integer('run_count').default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  tenantIdx: index('idx_scheduled_reports_tenant').on(table.tenantId),
  userIdx: index('idx_scheduled_reports_user').on(table.userId),
  enabledIdx: index('idx_scheduled_reports_enabled').on(table.isEnabled),
  nextRunIdx: index('idx_scheduled_reports_next_run').on(table.nextRunAt),
}));

// Scheduled Report Runs - History of report generations
export const scheduledReportRuns = sqliteTable('scheduled_report_runs', {
  id: text('id').primaryKey(),
  reportId: text('report_id')
    .notNull()
    .references(() => scheduledReports.id),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => tenants.id),
  // Run details
  status: text('status', {
    enum: ['pending', 'generating', 'sending', 'completed', 'failed']
  }).notNull().default('pending'),
  // Report period
  periodStart: integer('period_start', { mode: 'timestamp' }).notNull(),
  periodEnd: integer('period_end', { mode: 'timestamp' }).notNull(),
  // Results
  recordCount: integer('record_count').default(0),
  fileSizeBytes: integer('file_size_bytes'),
  // Error handling
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  // Timing
  startedAt: integer('started_at', { mode: 'timestamp' }),
  completedAt: integer('completed_at', { mode: 'timestamp' }),
  processingTimeMs: integer('processing_time_ms'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => ({
  reportIdx: index('idx_scheduled_report_runs_report').on(table.reportId),
  tenantIdx: index('idx_scheduled_report_runs_tenant').on(table.tenantId),
  statusIdx: index('idx_scheduled_report_runs_status').on(table.status),
  createdIdx: index('idx_scheduled_report_runs_created').on(table.createdAt),
}));

