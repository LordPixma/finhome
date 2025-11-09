import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb, budgets, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { Env } from '../types';

const budgetsRouter = new Hono<Env>();

// Apply middleware
budgetsRouter.use('*', authMiddleware, tenantMiddleware);

// Get all budgets
budgetsRouter.get('/', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const allBudgets = await db
    .select({
      id: budgets.id,
      tenantId: budgets.tenantId,
      categoryId: budgets.categoryId,
      amount: budgets.amount,
      period: budgets.period,
      startDate: budgets.startDate,
      endDate: budgets.endDate,
      createdAt: budgets.createdAt,
      updatedAt: budgets.updatedAt,
      category: {
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        type: categories.type,
      },
    })
    .from(budgets)
    .leftJoin(categories, eq(budgets.categoryId, categories.id))
    .where(eq(budgets.tenantId, tenantId))
    .all();

  return c.json({
    success: true,
    data: allBudgets,
  });
});

// Create budget
budgetsRouter.post('/', async c => {
  const tenantId = c.get('tenantId')!;
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  const now = getCurrentTimestamp();

  const newBudget = {
    id: crypto.randomUUID(),
    tenantId,
    ...body,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(budgets).values(newBudget).run();

  return c.json({
    success: true,
    data: newBudget,
  }, 201);
});

// Update budget
budgetsRouter.put('/:id', async c => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId')!;
  const body = await c.req.json();
  const db = getDb(c.env.DB);

  await db
    .update(budgets)
    .set({ ...body, updatedAt: getCurrentTimestamp() })
    .where(and(eq(budgets.id, id), eq(budgets.tenantId, tenantId)))
    .run();

  return c.json({
    success: true,
    data: { id, ...body },
  });
});

// Delete budget
budgetsRouter.delete('/:id', async c => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.tenantId, tenantId)))
    .run();

  return c.json({
    success: true,
    data: { id },
  });
});

export default budgetsRouter;
