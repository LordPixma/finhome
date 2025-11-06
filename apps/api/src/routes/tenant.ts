import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { getDb, tenants, users, tenantMembers, accounts, transactions, categories, goals, billReminders, budgets, recurringTransactions, goalContributions, userSettings } from '../db';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

// Get current user's tenant information
router.get('/info', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } },
        401
      );
    }

    if (!user.tenantId) {
      return c.json(
        { success: false, error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID is missing' } },
        400
      );
    }

    const db = getDb(c.env.DB);
    const tenant = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
      })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .get();

    if (!tenant) {
      return c.json(
        { success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
    });
  } catch (error) {
    console.error('Error getting tenant info:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant information' } },
      500
    );
  }
});

// Delete tenant (requires admin role and 3 confirmations)
router.delete('/delete', tenantMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId')!;

    if (!user) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } },
        401
      );
    }

    const db = getDb(c.env.DB);

    // Check if user is admin/owner of the tenant
    const member = await db
      .select()
      .from(tenantMembers)
      .where(
        and(
          eq(tenantMembers.tenantId, tenantId),
          eq(tenantMembers.userId, user.id)
        )
      )
      .get();

    if (!member || (member.role !== 'admin' && user.role !== 'admin')) {
      return c.json(
        { 
          success: false, 
          error: { 
            code: 'FORBIDDEN', 
            message: 'Only tenant administrators can delete the tenant' 
          } 
        },
        403
      );
    }

    // Get confirmation counts from request body
    const body = await c.req.json();
    const { confirmations } = body;

    if (!confirmations || confirmations.length !== 3) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_CONFIRMATIONS',
            message: 'Three confirmations are required to delete the tenant. Please provide an array of 3 confirmation strings.',
          },
        },
        400
      );
    }

    // Validate confirmations
    const requiredConfirmations = [
      'DELETE_ALL_DATA',
      'CANNOT_BE_UNDONE', 
      'I_UNDERSTAND'
    ];

    const hasAllConfirmations = requiredConfirmations.every(required => 
      confirmations.includes(required)
    );

    if (!hasAllConfirmations) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONFIRMATIONS',
            message: `All three confirmations required: ${requiredConfirmations.join(', ')}`,
          },
        },
        400
      );
    }

    // Count total data that will be deleted (for user information)
    const [
      transactionCount,
      accountCount,
      categoryCount,
      goalCount,
      budgetCount,
      memberCount
    ] = await Promise.all([
      db.select().from(transactions).where(eq(transactions.tenantId, tenantId)).all().then(r => r.length),
      db.select().from(accounts).where(eq(accounts.tenantId, tenantId)).all().then(r => r.length),
      db.select().from(categories).where(eq(categories.tenantId, tenantId)).all().then(r => r.length),
      db.select().from(goals).where(eq(goals.tenantId, tenantId)).all().then(r => r.length),
      db.select().from(budgets).where(eq(budgets.tenantId, tenantId)).all().then(r => r.length),
      db.select().from(tenantMembers).where(eq(tenantMembers.tenantId, tenantId)).all().then(r => r.length)
    ]);

    // Delete all tenant data in correct order (respecting foreign key constraints)
    
    // First get all goal IDs for this tenant
    const tenantGoalIds = await db.select({ id: goals.id }).from(goals).where(eq(goals.tenantId, tenantId)).all();
    const goalIds = tenantGoalIds.map(g => g.id);
    
    await Promise.all([
      // Delete goal contributions first (using goalId relationship)
      ...goalIds.map(goalId => 
        db.delete(goalContributions).where(eq(goalContributions.goalId, goalId)).run()
      ),
      // Delete transactions
      db.delete(transactions).where(eq(transactions.tenantId, tenantId)).run(),
      // Delete recurring transactions
      db.delete(recurringTransactions).where(eq(recurringTransactions.tenantId, tenantId)).run(),
      // Delete bill reminders
      db.delete(billReminders).where(eq(billReminders.tenantId, tenantId)).run(),
    ]);

    // Delete remaining tenant data
    await Promise.all([
      // Delete budgets
      db.delete(budgets).where(eq(budgets.tenantId, tenantId)).run(),
      // Delete goals
      db.delete(goals).where(eq(goals.tenantId, tenantId)).run(),
      // Delete accounts
      db.delete(accounts).where(eq(accounts.tenantId, tenantId)).run(),
      // Delete categories
      db.delete(categories).where(eq(categories.tenantId, tenantId)).run(),
      // Delete user settings for tenant users
      db.delete(userSettings).where(eq(userSettings.tenantId, tenantId)).run(),
    ]);

    // Delete tenant members
    await db.delete(tenantMembers).where(eq(tenantMembers.tenantId, tenantId)).run();

    // Delete tenant users (keep global admins)
    await db.delete(users).where(
      and(
        eq(users.tenantId, tenantId),
        eq(users.isGlobalAdmin, false)
      )
    ).run();

    // Finally, delete the tenant itself
    await db.delete(tenants).where(eq(tenants.id, tenantId)).run();

    return c.json({
      success: true,
      data: {
        message: 'Tenant deleted successfully',
        deletedData: {
          transactions: transactionCount,
          accounts: accountCount,
          categories: categoryCount,
          goals: goalCount,
          budgets: budgetCount,
          members: memberCount,
        },
      },
    });
  } catch (error) {
    console.error('Error deleting tenant:', error);
    return c.json(
      { 
        success: false, 
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to delete tenant',
          details: error instanceof Error ? error.message : 'Unknown error'
        } 
      },
      500
    );
  }
});

export default router;