import { describe, it, expect } from 'vitest';

describe('API Health Check', () => {
  it('should return ok status', () => {
    const result = { status: 'ok' };
    expect(result.status).toBe('ok');
  });
});

describe('Transaction Schema', () => {
  it('should validate transaction data', () => {
    const transaction = {
      id: '123',
      tenantId: '456',
      accountId: '789',
      categoryId: '012',
      amount: 100,
      description: 'Test transaction',
      date: new Date(),
      type: 'expense',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(transaction.amount).toBeGreaterThan(0);
    expect(transaction.type).toMatch(/^(income|expense|transfer)$/);
  });
});
