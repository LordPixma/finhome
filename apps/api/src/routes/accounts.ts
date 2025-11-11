import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, accounts, bankAccounts, bankConnections } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreateAccountSchema } from '@finhome360/shared';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { Env } from '../types';

const accountsRouter = new Hono<Env>();

type ApiAccountType = 'current' | 'savings' | 'credit' | 'cash' | 'investment' | 'other';
type DbAccountType = 'checking' | 'savings' | 'credit' | 'cash' | 'investment' | 'other';

const toDbAccountType = (type: ApiAccountType): DbAccountType =>
  type === 'current' ? 'checking' : type;

const fromDbAccountType = (type: DbAccountType | ApiAccountType): ApiAccountType =>
  type === 'checking' ? 'current' : type;

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

    const normalizedAccounts = allAccounts.map(account => ({
      ...account,
      type: fromDbAccountType(account.type as DbAccountType),
    }));

    return c.json({
      success: true,
      data: normalizedAccounts,
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
      data: {
        ...account,
        type: fromDbAccountType(account.type as DbAccountType),
      },
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

    console.log('Creating account - tenantId:', tenantId);
    console.log('Creating account - validated body:', JSON.stringify(body));

    const now = getCurrentTimestamp();
    const dbType = toDbAccountType(body.type);

    const newAccount = {
      id: crypto.randomUUID(),
      tenantId,
      ...body,
      type: dbType,
      balance: body.balance ?? 0,
      createdAt: now,
      updatedAt: now,
    };

    console.log('Creating account - final account object:', JSON.stringify(newAccount));

    await db.insert(accounts).values(newAccount).run();

    return c.json(
      {
        success: true,
        data: {
          ...newAccount,
          type: body.type,
        },
      },
      201
    );
  } catch (error) {
    console.error('Error creating account - full error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    return c.json(
      {
        success: false,
        error: { 
          code: 'INTERNAL_ERROR', 
          message: 'Failed to create account',
          details: error instanceof Error ? error.message : String(error)
        },
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
      type: toDbAccountType(body.type),
      updatedAt: getCurrentTimestamp(),
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
        type: body.type,
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

// Trigger a bank sync for an individual account
accountsRouter.post('/:id/sync', async c => {
  try {
    const accountId = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const account = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
      .get();

    if (!account) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Account not found' } },
        404
      );
    }

    const linkedConnection = await db
      .select({ connectionId: bankConnections.id })
      .from(bankAccounts)
      .innerJoin(bankConnections, eq(bankAccounts.connectionId, bankConnections.id))
      .where(
        and(
          eq(bankAccounts.accountId, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankConnections.tenantId, tenantId)
        )
      )
      .get();

    if (!linkedConnection) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ACCOUNT_NOT_LINKED',
            message: 'This account is not linked to a bank connection.',
          },
        },
        400
      );
    }

    await c.env.TRANSACTION_SYNC.send({
      type: 'transaction-sync',
      tenantId,
      connectionId: linkedConnection.connectionId,
      triggeredBy: user?.id ?? null,
    });

    return c.json({ success: true, data: { message: 'Sync started' } });
  } catch (error) {
    console.error('Failed to queue account sync:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to queue sync' } },
      500
    );
  }
});

export default accountsRouter;
