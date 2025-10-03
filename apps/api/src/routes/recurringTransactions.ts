import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getDb, recurringTransactions, accounts, categories } from '../db';
import { CreateRecurringTransactionSchema } from '@finhome360/shared';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

// Get all recurring transactions for the current tenant
router.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;

    const recurring = await db
      .select({
        id: recurringTransactions.id,
        accountId: recurringTransactions.accountId,
        categoryId: recurringTransactions.categoryId,
        description: recurringTransactions.description,
        amount: recurringTransactions.amount,
        type: recurringTransactions.type,
        frequency: recurringTransactions.frequency,
        startDate: recurringTransactions.startDate,
        nextDate: recurringTransactions.nextDate,
        endDate: recurringTransactions.endDate,
        status: recurringTransactions.status,
        autoCreate: recurringTransactions.autoCreate,
        notes: recurringTransactions.notes,
        createdAt: recurringTransactions.createdAt,
        updatedAt: recurringTransactions.updatedAt,
        accountName: accounts.name,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(recurringTransactions)
      .leftJoin(accounts, eq(recurringTransactions.accountId, accounts.id))
      .leftJoin(categories, eq(recurringTransactions.categoryId, categories.id))
      .where(eq(recurringTransactions.tenantId, tenantId))
      .orderBy(recurringTransactions.nextDate)
      .all();

    return c.json({ success: true, data: recurring });
  } catch (error: any) {
    console.error('Error fetching recurring transactions:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recurring transactions' },
      },
      500
    );
  }
});

// Get a single recurring transaction
router.get('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();

    const recurring = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.tenantId, tenantId)))
      .get();

    if (!recurring) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Recurring transaction not found' } },
        404
      );
    }

    return c.json({ success: true, data: recurring });
  } catch (error: any) {
    console.error('Error fetching recurring transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recurring transaction' },
      },
      500
    );
  }
});

// Create a new recurring transaction
router.post('/', validateRequest(CreateRecurringTransactionSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date();

    const newRecurring = {
      id,
      tenantId,
      accountId: body.accountId,
      categoryId: body.categoryId,
      description: body.description,
      amount: body.amount,
      type: body.type,
      frequency: body.frequency,
      startDate: new Date(body.startDate),
      nextDate: new Date(body.nextDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      status: body.status || 'active',
      autoCreate: body.autoCreate !== undefined ? body.autoCreate : true,
      notes: body.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(recurringTransactions).values(newRecurring).run();

    return c.json({ success: true, data: newRecurring }, 201);
  } catch (error: any) {
    console.error('Error creating recurring transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create recurring transaction' },
      },
      500
    );
  }
});

// Update a recurring transaction
router.put('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();
    const body = await c.req.json();

    // Check if recurring transaction exists
    const existing = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.tenantId, tenantId)))
      .get();

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Recurring transaction not found' } },
        404
      );
    }

    const updated = {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : existing.startDate,
      nextDate: body.nextDate ? new Date(body.nextDate) : existing.nextDate,
      endDate: body.endDate ? new Date(body.endDate) : existing.endDate,
      updatedAt: new Date(),
    };

    await db
      .update(recurringTransactions)
      .set(updated)
      .where(eq(recurringTransactions.id, id))
      .run();

    return c.json({ success: true, data: { id, ...updated } });
  } catch (error: any) {
    console.error('Error updating recurring transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update recurring transaction' },
      },
      500
    );
  }
});

// Delete a recurring transaction
router.delete('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();

    // Check if recurring transaction exists
    const existing = await db
      .select()
      .from(recurringTransactions)
      .where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.tenantId, tenantId)))
      .get();

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Recurring transaction not found' } },
        404
      );
    }

    await db.delete(recurringTransactions).where(eq(recurringTransactions.id, id)).run();

    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error deleting recurring transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete recurring transaction' },
      },
      500
    );
  }
});

export default router;
