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
  currency: z.string().length(3).default('USD'),
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
  date: z.date(),
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
  startDate: z.date(),
  endDate: z.date().optional(),
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
  dueDate: z.date(),
  frequency: z.enum(['once', 'weekly', 'monthly', 'yearly']),
  reminderDays: z.number().int().min(0).max(30).default(3),
  status: z.enum(['pending', 'paid', 'overdue']),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BillReminder = z.infer<typeof BillReminderSchema>;

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
  createdAt: true,
  updatedAt: true,
});

export const CreateCategorySchema = CategorySchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateBudgetSchema = BudgetSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const CreateBillReminderSchema = BillReminderSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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
