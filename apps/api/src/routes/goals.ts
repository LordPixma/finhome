import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getDb, goals, goalContributions, accounts } from '../db';
import { CreateGoalSchema, CreateGoalContributionSchema } from '@finhome360/shared';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

// Get all goals for the current tenant
router.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;

    const allGoals = await db
      .select({
        id: goals.id,
        name: goals.name,
        description: goals.description,
        targetAmount: goals.targetAmount,
        currentAmount: goals.currentAmount,
        deadline: goals.deadline,
        accountId: goals.accountId,
        status: goals.status,
        color: goals.color,
        icon: goals.icon,
        createdAt: goals.createdAt,
        updatedAt: goals.updatedAt,
        accountName: accounts.name,
      })
      .from(goals)
      .leftJoin(accounts, eq(goals.accountId, accounts.id))
      .where(eq(goals.tenantId, tenantId))
      .orderBy(goals.createdAt)
      .all();

    return c.json({ success: true, data: allGoals });
  } catch (error: any) {
    console.error('Error fetching goals:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch goals' },
      },
      500
    );
  }
});

// Get a single goal with contributions
router.get('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();

    const goal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.tenantId, tenantId)))
      .get();

    if (!goal) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        404
      );
    }

    // Get contributions for this goal
    const contributions = await db
      .select()
      .from(goalContributions)
      .where(eq(goalContributions.goalId, id))
      .orderBy(goalContributions.date)
      .all();

    return c.json({ success: true, data: { ...goal, contributions } });
  } catch (error: any) {
    console.error('Error fetching goal:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch goal' },
      },
      500
    );
  }
});

// Create a new goal
router.post('/', validateRequest(CreateGoalSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const body = await c.req.json();

    const id = crypto.randomUUID();
    const now = new Date();

    const newGoal = {
      id,
      tenantId,
      name: body.name,
      description: body.description || null,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount || 0,
      deadline: body.deadline ? new Date(body.deadline) : null,
      accountId: body.accountId || null,
      status: body.status || 'active',
      color: body.color,
      icon: body.icon || '🎯',
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(goals).values(newGoal).run();

    return c.json({ success: true, data: newGoal }, 201);
  } catch (error: any) {
    console.error('Error creating goal:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create goal' },
      },
      500
    );
  }
});

// Add a contribution to a goal
router.post('/:id/contributions', validateRequest(CreateGoalContributionSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id: goalId } = c.req.param();
    const body = await c.req.json();

    // Check if goal exists
    const goal = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, goalId), eq(goals.tenantId, tenantId)))
      .get();

    if (!goal) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        404
      );
    }

    const contributionId = crypto.randomUUID();
    const now = new Date();

    const newContribution = {
      id: contributionId,
      goalId,
      transactionId: body.transactionId || null,
      amount: body.amount,
      date: new Date(body.date),
      notes: body.notes || null,
      createdAt: now,
    };

    await db.insert(goalContributions).values(newContribution).run();

    // Update goal current amount
    const newCurrentAmount = goal.currentAmount + body.amount;
    await db
      .update(goals)
      .set({ 
        currentAmount: newCurrentAmount,
        updatedAt: now,
        status: newCurrentAmount >= goal.targetAmount ? 'completed' : goal.status
      })
      .where(eq(goals.id, goalId))
      .run();

    return c.json({ success: true, data: newContribution }, 201);
  } catch (error: any) {
    console.error('Error adding contribution:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to add contribution' },
      },
      500
    );
  }
});

// Update a goal
router.put('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();
    const body = await c.req.json();

    // Check if goal exists
    const existing = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.tenantId, tenantId)))
      .get();

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        404
      );
    }

    const updated = {
      ...body,
      deadline: body.deadline ? new Date(body.deadline) : existing.deadline,
      updatedAt: new Date(),
    };

    await db
      .update(goals)
      .set(updated)
      .where(eq(goals.id, id))
      .run();

    return c.json({ success: true, data: { id, ...updated } });
  } catch (error: any) {
    console.error('Error updating goal:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update goal' },
      },
      500
    );
  }
});

// Delete a goal
router.delete('/:id', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();

    // Check if goal exists
    const existing = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, id), eq(goals.tenantId, tenantId)))
      .get();

    if (!existing) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Goal not found' } },
        404
      );
    }

    // Delete contributions first
    await db.delete(goalContributions).where(eq(goalContributions.goalId, id)).run();

    // Delete goal
    await db.delete(goals).where(eq(goals.id, id)).run();

    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error deleting goal:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete goal' },
      },
      500
    );
  }
});

export default router;
