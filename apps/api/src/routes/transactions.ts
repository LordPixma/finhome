import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, transactions, accounts, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import type { Env } from '../types';

const transactionsRouter = new Hono<Env>();

// Apply middleware
transactionsRouter.use('*', authMiddleware, tenantMiddleware);

// Get all transactions
transactionsRouter.get('/', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const allTransactions = await db
    .select({
      id: transactions.id,
      tenantId: transactions.tenantId,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      type: transactions.type,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      account: {
        name: accounts.name,
        type: accounts.type,
      },
      category: {
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        type: categories.type,
      },
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.tenantId, tenantId))
    .orderBy(desc(transactions.date))
    .all();

  return c.json({
    success: true,
    data: allTransactions,
  });
});

// Get single transaction
transactionsRouter.get('/:id', async c => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const transaction = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
    .get();

  if (!transaction) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
      404
    );
  }

  return c.json({
    success: true,
    data: transaction,
  });
});

// Create transaction
transactionsRouter.post('/', async c => {
  const tenantId = c.get('tenantId')!;
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  const newTransaction = {
    id: crypto.randomUUID(),
    tenantId,
    ...body,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(transactions).values(newTransaction).run();

  return c.json({
    success: true,
    data: newTransaction,
  }, 201);
});

// Update transaction
transactionsRouter.put('/:id', async c => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId')!;
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  const updated = await db
    .update(transactions)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
    .run();

  if (!updated.success) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
      404
    );
  }

  return c.json({
    success: true,
    data: { id, ...body },
  });
});

// Delete transaction
transactionsRouter.delete('/:id', async c => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
    .run();

  return c.json({
    success: true,
    data: { id },
  });
});

export default transactionsRouter;
