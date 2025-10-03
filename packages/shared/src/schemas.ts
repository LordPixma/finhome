import { z } from 'zod';

// Tenant Schema
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Tenant = z.infer<typeof TenantSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  passwordHash: z.string(),
  role: z.enum(['admin', 'member']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Account Schema
export const AccountSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['checking', 'savings', 'credit', 'cash', 'investment', 'other']),
  balance: z.number(),
  currency: z.string().length(3).default('GBP'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Account = z.infer<typeof AccountSchema>;

// Category Schema
export const CategorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().optional(),
  parentId: z.string().uuid().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Category = z.infer<typeof CategorySchema>;

// Transaction Schema
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number(),
  description: z.string().max(500),
  date: z.coerce.date(),
  type: z.enum(['income', 'expense', 'transfer']),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Budget Schema
export const BudgetSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  period: z.enum(['weekly', 'monthly', 'yearly']),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Budget = z.infer<typeof BudgetSchema>;

// Bill Reminder Schema
export const BillReminderSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  amount: z.number().positive(),
  categoryId: z.string().uuid(),
  dueDate: z.coerce.date(),
  frequency: z.enum(['once', 'weekly', 'monthly', 'yearly']),
  reminderDays: z.number().int().min(0).max(30).default(3),
  status: z.enum(['pending', 'paid', 'overdue']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BillReminder = z.infer<typeof BillReminderSchema>;

// Recurring Transaction Schema
export const RecurringTransactionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  accountId: z.string().uuid(),
  categoryId: z.string().uuid(),
  description: z.string().min(1).max(500),
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.coerce.date(),
  nextDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  status: z.enum(['active', 'paused', 'completed']).default('active'),
  autoCreate: z.boolean().default(true),
  notes: z.string().max(1000).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type RecurringTransaction = z.infer<typeof RecurringTransactionSchema>;

// Goal Schema
export const GoalSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  targetAmount: z.number().positive(),
  currentAmount: z.number().default(0),
  deadline: z.coerce.date().optional(),
  accountId: z.string().uuid().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).default('active'),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  icon: z.string().default('🎯'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Goal = z.infer<typeof GoalSchema>;

// Goal Contribution Schema
export const GoalContributionSchema = z.object({
  id: z.string().uuid(),
  goalId: z.string().uuid(),
  transactionId: z.string().uuid().optional(),
  amount: z.number(),
  date: z.coerce.date(),
  notes: z.string().max(500).optional(),
  createdAt: z.date(),
});

export type GoalContribution = z.infer<typeof GoalContributionSchema>;

// Input Schemas (for API requests)
export const CreateTenantSchema = TenantSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateAccountSchema = AccountSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateCategorySchema = CategorySchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateBudgetSchema = BudgetSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateBillReminderSchema = BillReminderSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateRecurringTransactionSchema = RecurringTransactionSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateGoalSchema = GoalSchema.omit({
  id: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateGoalContributionSchema = GoalContributionSchema.omit({
  id: true,
  createdAt: true,
});

// File Upload Schema
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  type: z.enum(['csv', 'ofx']),
  accountId: z.string().uuid(),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

// Auth Schemas
export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginRequest = z.infer<typeof LoginSchema>;

export const RegisterSchema = z.object({
  tenantName: z.string().min(1).max(255),
  subdomain: z.string().min(1).max(63).regex(/^[a-z0-9-]+$/),
  email: z.string().email(),
  name: z.string().min(1).max(255),
  password: z.string().min(8).max(100),
});

export type RegisterRequest = z.infer<typeof RegisterSchema>;

export const RefreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenRequest = z.infer<typeof RefreshTokenSchema>;

// User Settings Schema
export const UserSettingsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  currency: z.string().length(3).default('GBP'),
  currencySymbol: z.string().default('£'),
  language: z.string().default('en'),
  timezone: z.string().default('Europe/London'),
  dateFormat: z.string().default('DD/MM/YYYY'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const UpdateUserSettingsSchema = UserSettingsSchema.pick({
  currency: true,
  currencySymbol: true,
  language: true,
  timezone: true,
  dateFormat: true,
}).partial();

export type UpdateUserSettingsRequest = z.infer<typeof UpdateUserSettingsSchema>;

// Tenant Member Schema
export const TenantMemberSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']).default('member'),
  invitedBy: z.string().uuid().nullable().optional(),
  invitedAt: z.date(),
  joinedAt: z.date().nullable().optional(),
  status: z.enum(['pending', 'active', 'removed']).default('active'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TenantMember = z.infer<typeof TenantMemberSchema>;

export const InviteTenantMemberSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  role: z.enum(['admin', 'member']).default('member'),
});

export type InviteTenantMemberRequest = z.infer<typeof InviteTenantMemberSchema>;

export const UpdateTenantMemberSchema = z.object({
  role: z.enum(['admin', 'member']),
});

export type UpdateTenantMemberRequest = z.infer<typeof UpdateTenantMemberSchema>;
