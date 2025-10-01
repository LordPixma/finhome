import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, accounts } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreateAccountSchema } from '@finhome/shared';
import type { Env } from '../types';

const accountsRouter = new Hono<Env>();

// Apply middleware
accountsRouter.use('*', authMiddleware, tenantMiddleware);

// Get all accounts
accountsRouter.get('/', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.tenantId, tenantId))
      .orderBy(desc(accounts.createdAt))
      .all();

    return c.json({
      success: true,
      data: allAccounts,
    });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch accounts' },
      },
      500
    );
  }
});

// Get single account
accountsRouter.get('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const account = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .get();

    if (!account) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: account,
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch account' },
      },
      500
    );
  }
});

// Create account
accountsRouter.post('/', validateRequest(CreateAccountSchema), async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    const newAccount = {
      id: crypto.randomUUID(),
      tenantId,
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(accounts).values(newAccount).run();

    return c.json(
      {
        success: true,
        data: newAccount,
      },
      201
    );
  } catch (error) {
    console.error('Error creating account:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create account' },
      },
      500
    );
  }
});

// Update account
accountsRouter.put('/:id', validateRequest(CreateAccountSchema), async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Check if account exists and belongs to tenant
    const existingAccount = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .get();

    if (!existingAccount) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404
      );
    }

    const updatedAccount = {
      ...body,
      updatedAt: new Date(),
    };

    await db
      .update(accounts)
      .set(updatedAccount)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: {
        id,
        tenantId,
        ...updatedAccount,
        createdAt: existingAccount.createdAt,
      },
    });
  } catch (error) {
    console.error('Error updating account:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update account' },
      },
      500
    );
  }
});

// Delete account
accountsRouter.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    // Check if account exists and belongs to tenant
    const existingAccount = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .get();

    if (!existingAccount) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404
      );
    }

    await db
      .delete(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: { message: 'Account deleted successfully' },
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete account' },
      },
      500
    );
  }
});

export default accountsRouter;
