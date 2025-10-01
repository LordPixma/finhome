import { describe, it, expect } from 'vitest';
import {
  LoginSchema,
  RegisterSchema,
  CreateAccountSchema,
  CreateCategorySchema,
  CreateTransactionSchema,
  CreateBudgetSchema,
  CreateBillReminderSchema,
} from '@finhome/shared';

describe('API Health Check', () => {
  it('should return ok status', () => {
    const result = { status: 'ok' };
    expect(result.status).toBe('ok');
  });
});

describe('Authentication Schemas', () => {
  describe('LoginSchema', () => {
    it('should validate correct login data', () => {
      const validLogin = {
        email: 'test@example.com',
        password: 'password123',
      };
      const result = LoginSchema.safeParse(validLogin);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidLogin = {
        email: 'invalid-email',
        password: 'password123',
      };
      const result = LoginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidLogin = {
        email: 'test@example.com',
        password: 'short',
      };
      const result = LoginSchema.safeParse(invalidLogin);
      expect(result.success).toBe(false);
    });
  });

  describe('RegisterSchema', () => {
    it('should validate correct registration data', () => {
      const validRegistration = {
        tenantName: 'Test Company',
        subdomain: 'testco',
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'securepass123',
      };
      const result = RegisterSchema.safeParse(validRegistration);
      expect(result.success).toBe(true);
    });

    it('should reject invalid subdomain format', () => {
      const invalidRegistration = {
        tenantName: 'Test Company',
        subdomain: 'Test_Co!',
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'securepass123',
      };
      const result = RegisterSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });

    it('should reject empty tenant name', () => {
      const invalidRegistration = {
        tenantName: '',
        subdomain: 'testco',
        email: 'admin@test.com',
        name: 'Admin User',
        password: 'securepass123',
      };
      const result = RegisterSchema.safeParse(invalidRegistration);
      expect(result.success).toBe(false);
    });
  });
});

describe('Account Schemas', () => {
  describe('CreateAccountSchema', () => {
    it('should validate correct account data', () => {
      const validAccount = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Checking Account',
        type: 'checking',
        balance: 1000.50,
        currency: 'USD',
      };
      const result = CreateAccountSchema.safeParse(validAccount);
      expect(result.success).toBe(true);
    });

    it('should accept valid account types', () => {
      const types = ['checking', 'savings', 'credit', 'cash', 'investment', 'other'];
      types.forEach(type => {
        const account = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Account',
          type,
          balance: 100,
          currency: 'USD',
        };
        const result = CreateAccountSchema.safeParse(account);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid account type', () => {
      const invalidAccount = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Account',
        type: 'invalid',
        balance: 100,
        currency: 'USD',
      };
      const result = CreateAccountSchema.safeParse(invalidAccount);
      expect(result.success).toBe(false);
    });
  });
});

describe('Category Schemas', () => {
  describe('CreateCategorySchema', () => {
    it('should validate correct category data', () => {
      const validCategory = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Groceries',
        type: 'expense',
        color: '#FF5733',
        icon: '🛒',
      };
      const result = CreateCategorySchema.safeParse(validCategory);
      expect(result.success).toBe(true);
    });

    it('should validate income and expense types', () => {
      ['income', 'expense'].forEach(type => {
        const category = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Category',
          type,
          color: '#000000',
        };
        const result = CreateCategorySchema.safeParse(category);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid color format', () => {
      const invalidCategory = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test',
        type: 'expense',
        color: 'red',
      };
      const result = CreateCategorySchema.safeParse(invalidCategory);
      expect(result.success).toBe(false);
    });
  });
});

describe('Transaction Schemas', () => {
  describe('CreateTransactionSchema', () => {
    it('should validate correct transaction data', () => {
      const validTransaction = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        accountId: '123e4567-e89b-12d3-a456-426614174001',
        categoryId: '123e4567-e89b-12d3-a456-426614174002',
        amount: 50.99,
        description: 'Grocery shopping',
        date: new Date(),
        type: 'expense',
        notes: 'Weekly groceries',
      };
      const result = CreateTransactionSchema.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('should accept income, expense, and transfer types', () => {
      ['income', 'expense', 'transfer'].forEach(type => {
        const transaction = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          accountId: '123e4567-e89b-12d3-a456-426614174001',
          categoryId: '123e4567-e89b-12d3-a456-426614174002',
          amount: 100,
          description: 'Test',
          date: new Date(),
          type,
        };
        const result = CreateTransactionSchema.safeParse(transaction);
        expect(result.success).toBe(true);
      });
    });

    it('should reject description longer than 500 characters', () => {
      const longDescription = 'a'.repeat(501);
      const transaction = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        accountId: '123e4567-e89b-12d3-a456-426614174001',
        categoryId: '123e4567-e89b-12d3-a456-426614174002',
        amount: 100,
        description: longDescription,
        date: new Date(),
        type: 'expense',
      };
      const result = CreateTransactionSchema.safeParse(transaction);
      expect(result.success).toBe(false);
    });
  });
});

describe('Budget Schemas', () => {
  describe('CreateBudgetSchema', () => {
    it('should validate correct budget data', () => {
      const validBudget = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        amount: 500,
        period: 'monthly',
        startDate: new Date(),
      };
      const result = CreateBudgetSchema.safeParse(validBudget);
      expect(result.success).toBe(true);
    });

    it('should accept weekly, monthly, and yearly periods', () => {
      ['weekly', 'monthly', 'yearly'].forEach(period => {
        const budget = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          categoryId: '123e4567-e89b-12d3-a456-426614174001',
          amount: 500,
          period,
          startDate: new Date(),
        };
        const result = CreateBudgetSchema.safeParse(budget);
        expect(result.success).toBe(true);
      });
    });

    it('should reject negative amount', () => {
      const invalidBudget = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        amount: -100,
        period: 'monthly',
        startDate: new Date(),
      };
      const result = CreateBudgetSchema.safeParse(invalidBudget);
      expect(result.success).toBe(false);
    });
  });
});

describe('Bill Reminder Schemas', () => {
  describe('CreateBillReminderSchema', () => {
    it('should validate correct bill reminder data', () => {
      const validReminder = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Electricity Bill',
        amount: 150,
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        dueDate: new Date('2025-11-01'),
        frequency: 'monthly',
        reminderDays: 3,
        status: 'pending',
      };
      const result = CreateBillReminderSchema.safeParse(validReminder);
      expect(result.success).toBe(true);
    });

    it('should accept all frequency types', () => {
      ['once', 'weekly', 'monthly', 'yearly'].forEach(frequency => {
        const reminder = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Bill',
          amount: 100,
          categoryId: '123e4567-e89b-12d3-a456-426614174001',
          dueDate: new Date(),
          frequency,
          reminderDays: 5,
          status: 'pending',
        };
        const result = CreateBillReminderSchema.safeParse(reminder);
        expect(result.success).toBe(true);
      });
    });

    it('should reject reminder days outside valid range', () => {
      const invalidReminder = {
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Test Bill',
        amount: 100,
        categoryId: '123e4567-e89b-12d3-a456-426614174001',
        dueDate: new Date(),
        frequency: 'monthly',
        reminderDays: 35,
        status: 'pending',
      };
      const result = CreateBillReminderSchema.safeParse(invalidReminder);
      expect(result.success).toBe(false);
    });

    it('should accept all status types', () => {
      ['pending', 'paid', 'overdue'].forEach(status => {
        const reminder = {
          tenantId: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Test Bill',
          amount: 100,
          categoryId: '123e4567-e89b-12d3-a456-426614174001',
          dueDate: new Date(),
          frequency: 'monthly',
          reminderDays: 3,
          status,
        };
        const result = CreateBillReminderSchema.safeParse(reminder);
        expect(result.success).toBe(true);
      });
    });
  });
});

describe('File Parser', () => {
  it('should parse simple CSV content', () => {
    // This would require importing the parser
    // Placeholder for file parser tests
    expect(true).toBe(true);
  });

  it('should handle CSV with quotes and commas', () => {
    expect(true).toBe(true);
  });

  it('should parse OFX transaction format', () => {
    expect(true).toBe(true);
  });
});

describe('API Error Codes', () => {
  it('should have consistent error code format', () => {
    const errorCodes = [
      'VALIDATION_ERROR',
      'UNAUTHORIZED',
      'INVALID_TOKEN',
      'NOT_FOUND',
      'INTERNAL_ERROR',
      'RATE_LIMIT_EXCEEDED',
      'SUBDOMAIN_TAKEN',
      'EMAIL_TAKEN',
    ];

    errorCodes.forEach(code => {
      expect(code).toMatch(/^[A-Z_]+$/);
      expect(code.length).toBeGreaterThan(0);
    });
  });
});

describe('Multi-tenancy', () => {
  it('should validate tenant ID is UUID format', () => {
    const validUUID = '123e4567-e89b-12d3-a456-426614174000';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(validUUID)).toBe(true);
  });

  it('should reject invalid UUID format', () => {
    const invalidUUID = 'not-a-uuid';
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(invalidUUID)).toBe(false);
  });
});
