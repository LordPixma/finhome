import { Hono } from 'hono';
import { and, desc, eq } from 'drizzle-orm';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import {
  getDb,
  accounts,
  bankAccounts,
  bankConnections,
  transactionSyncHistory,
} from '../db';
import type { Env } from '../types';
import { TrueLayerService } from '../services/truelayer';
import { getCurrentTimestamp } from '../utils/timestamp';

interface OAuthStatePayload {
  tenantId: string;
  userId: string;
  returnTo?: string | null;
  createdAt: number;
}

function maskAccountNumber(accountNumber?: string | null): string | null {
  if (!accountNumber) {
    return null;
  }

  const trimmed = accountNumber.replace(/\s+/g, '');
  if (trimmed.length <= 4) {
    return trimmed;
  }

  const suffix = trimmed.slice(-4);
  return `****${suffix}`;
}

function mapTrueLayerAccountType(type?: string | null, subtype?: string | null): 'current' | 'savings' | 'credit' | 'cash' | 'investment' | 'other' {
  const normalized = type?.toUpperCase() ?? '';
  const normalizedSubtype = subtype?.toUpperCase() ?? '';

  switch (normalized) {
    case 'TRANSACTION':
    case 'CHECKING':
    case 'CURRENT':
      return 'current';
    case 'SAVINGS':
      return 'savings';
    case 'CREDIT_CARD':
    case 'CREDIT':
      return 'credit';
    case 'INVESTMENT':
      return 'investment';
    case 'PREPAID':
      return 'cash';
    default:
      if (normalizedSubtype === 'CREDIT_CARD') {
        return 'credit';
      }
      return 'current';
  }
}

function buildRedirect(baseUrl: string, path?: string | null) {
  const safePath = path && path.startsWith('/') ? path : '/dashboard/banking';
  return new URL(safePath, baseUrl);
}

const banking = new Hono<Env>();
const protectedRoutes = new Hono<Env>();

protectedRoutes.use('*', authMiddleware, tenantMiddleware);

protectedRoutes.get('/connections', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const connectionRecords = await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.tenantId, tenantId))
      .orderBy(desc(bankConnections.createdAt))
      .all();

    const results = [] as any[];

    for (const connection of connectionRecords) {
      const linkedAccounts = await db
        .select({ bankAccount: bankAccounts, account: accounts })
        .from(bankAccounts)
        .innerJoin(accounts, eq(bankAccounts.accountId, accounts.id))
        .where(
          and(
            eq(bankAccounts.connectionId, connection.id),
            eq(bankAccounts.tenantId, tenantId)
          )
        )
        .all();

      const latestSync = await db
        .select()
        .from(transactionSyncHistory)
        .where(
          and(
            eq(transactionSyncHistory.connectionId, connection.id),
            eq(transactionSyncHistory.tenantId, tenantId)
          )
        )
        .orderBy(desc(transactionSyncHistory.syncStartedAt))
        .limit(1)
        .get();

      const formattedAccounts = linkedAccounts.map(({ bankAccount, account }) => {
        const rawType = account.type as unknown as string;
        const normalizedType = rawType === 'checking' ? 'current' : rawType;

        return {
          id: bankAccount.id,
          providerAccountId: bankAccount.providerAccountId,
          accountId: bankAccount.accountId,
          name: account.name,
          type: normalizedType as 'current' | 'savings' | 'credit' | 'cash' | 'investment' | 'other',
          balance: account.balance,
          currency: account.currency,
          accountNumber: bankAccount.accountNumber,
          sortCode: bankAccount.sortCode,
          iban: bankAccount.iban,
          syncFromDate: bankAccount.syncFromDate?.toISOString?.() ?? null,
          lastUpdatedAt: bankAccount.updatedAt?.toISOString?.() ?? null,
        };
      });

      results.push({
        id: connection.id,
        provider: connection.provider,
        providerConnectionId: connection.providerConnectionId,
        institutionId: connection.institutionId,
        institutionName: connection.institutionName,
        status: connection.status,
        lastSyncAt: (latestSync?.syncCompletedAt || connection.lastSyncAt)?.toISOString?.() ?? null,
        lastError: connection.lastError,
        createdAt: connection.createdAt?.toISOString?.() ?? null,
        accounts: formattedAccounts,
      });
    }

    return c.json({ success: true, data: results });
  } catch (error) {
    console.error('Failed to list bank connections:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to load bank connections' } },
      500
    );
  }
});

protectedRoutes.post('/link', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const user = c.get('user');

    if (!user) {
      return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not found in context' } }, 401);
    }

    if (!c.env.SESSIONS) {
      return c.json({ success: false, error: { code: 'CONFIG_ERROR', message: 'Session storage not configured' } }, 500);
    }

    const body = await c.req.json().catch(() => ({}));
    const returnTo = typeof body?.returnTo === 'string' ? body.returnTo : undefined;

    const state = crypto.randomUUID();
    const nonce = crypto.randomUUID();

    const statePayload: OAuthStatePayload = {
      tenantId,
      userId: user.id,
      returnTo: returnTo ?? null,
      createdAt: Date.now(),
    };

    await c.env.SESSIONS.put(`truelayer:state:${state}`, JSON.stringify(statePayload), {
      expirationTtl: 600,
    });

    const trueLayer = new TrueLayerService(c.env);
    const authorizationUrl = trueLayer.createAuthorizationUrl({ state, nonce });

    return c.json({
      success: true,
      data: {
        authorizationUrl,
        state,
      },
    });
  } catch (error) {
    console.error('Failed to create TrueLayer authorization link:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to start bank connection' } },
      500
    );
  }
});

protectedRoutes.post('/connections/:id/sync', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const user = c.get('user');
    const connectionId = c.req.param('id');
    const db = getDb(c.env.DB);

    const connection = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, tenantId)))
      .get();

    if (!connection) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } }, 404);
    }

    await c.env.TRANSACTION_SYNC.send({
      type: 'transaction-sync',
      tenantId,
      connectionId,
      triggeredBy: user?.id ?? null,
    });

    return c.json({ success: true, data: { message: 'Sync started' } });
  } catch (error) {
    console.error('Failed to queue connection sync:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to queue sync' } },
      500
    );
  }
});

protectedRoutes.post('/sync', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const user = c.get('user');
    const db = getDb(c.env.DB);

    const connectionIds = await db
      .select({ id: bankConnections.id })
      .from(bankConnections)
      .where(eq(bankConnections.tenantId, tenantId))
      .all();

    if (connectionIds.length === 0) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'No bank connections found' } }, 404);
    }

    for (const { id } of connectionIds) {
      await c.env.TRANSACTION_SYNC.send({
        type: 'transaction-sync',
        tenantId,
        connectionId: id,
        triggeredBy: user?.id ?? null,
      });
    }

    return c.json({ success: true, data: { message: 'Sync started for all connections' } });
  } catch (error) {
    console.error('Failed to queue sync for all connections:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to queue sync' } },
      500
    );
  }
});

protectedRoutes.delete('/connections/:id', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const connectionId = c.req.param('id');
    const db = getDb(c.env.DB);

    const connection = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, tenantId)))
      .get();

    if (!connection) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } }, 404);
    }

    const trueLayer = new TrueLayerService(c.env);

    if (connection.refreshToken) {
      try {
        await trueLayer.revokeToken(connection.refreshToken);
      } catch (error) {
        console.warn('Failed to revoke TrueLayer refresh token:', error);
      }
    }

    const now = getCurrentTimestamp();

    await db
      .update(bankConnections)
      .set({
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        lastError: null,
        updatedAt: now,
      })
      .where(eq(bankConnections.id, connectionId))
      .run();

    return c.json({ success: true, data: { message: 'Connection disconnected' } });
  } catch (error) {
    console.error('Failed to disconnect bank connection:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect connection' } },
      500
    );
  }
});

banking.route('/', protectedRoutes);

banking.get('/callback', async c => {
  const baseUrl = c.env.FRONTEND_URL || 'https://app.finhome360.com';
  const defaultRedirect = buildRedirect(baseUrl);

  try {
    const url = new URL(c.req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const oauthError = url.searchParams.get('error');
    const oauthErrorDescription = url.searchParams.get('error_description');

    if (oauthError) {
      const redirectUrl = buildRedirect(baseUrl);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', oauthErrorDescription || oauthError);
      return c.redirect(redirectUrl.toString(), 302);
    }

    if (!code || !state) {
      const redirectUrl = buildRedirect(baseUrl);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', 'Missing authorization code or state.');
      return c.redirect(redirectUrl.toString(), 302);
    }

    if (!c.env.SESSIONS) {
      const redirectUrl = buildRedirect(baseUrl);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', 'Session storage not configured.');
      return c.redirect(redirectUrl.toString(), 302);
    }

    const stateKey = `truelayer:state:${state}`;
    const statePayloadRaw = await c.env.SESSIONS.get(stateKey);

    if (!statePayloadRaw) {
      const redirectUrl = buildRedirect(baseUrl);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', 'Bank connection session expired. Please try again.');
      return c.redirect(redirectUrl.toString(), 302);
    }

    await c.env.SESSIONS.delete(stateKey);

    let statePayload: OAuthStatePayload;

    try {
      statePayload = JSON.parse(statePayloadRaw) as OAuthStatePayload;
    } catch (error) {
      console.error('Failed to parse TrueLayer state payload:', error);
      const redirectUrl = buildRedirect(baseUrl);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', 'Invalid bank connection state. Please try again.');
      return c.redirect(redirectUrl.toString(), 302);
    }

    const db = getDb(c.env.DB);
    const trueLayer = new TrueLayerService(c.env);

    const tokens = await trueLayer.exchangeCodeForTokens(code);
    const info = await trueLayer.getInfo(tokens.access_token).catch(() => null);
    const tlAccounts = await trueLayer.getAccounts(tokens.access_token);

    if (tlAccounts.length === 0) {
      const redirectUrl = buildRedirect(baseUrl, statePayload.returnTo);
      redirectUrl.searchParams.set('status', 'error');
      redirectUrl.searchParams.set('message', 'No accounts were returned by your bank.');
      return c.redirect(redirectUrl.toString(), 302);
    }

    const now = getCurrentTimestamp();
    const connectionId = crypto.randomUUID();
    const providerConnectionId = info?.consent_id || info?.user_id || crypto.randomUUID();
    const firstAccount = tlAccounts[0];
    const institutionName = firstAccount?.provider?.display_name ?? null;
    const institutionId = firstAccount?.provider?.provider_id ?? null;
    const tokenExpiry = new Date(Date.now() + tokens.expires_in * 1000);

    await db
      .insert(bankConnections)
      .values({
        id: connectionId,
        tenantId: statePayload.tenantId,
        userId: statePayload.userId,
        provider: 'truelayer',
        providerConnectionId,
        institutionId,
        institutionName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? null,
        tokenExpiresAt: tokenExpiry,
        status: 'active',
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    const initialSyncDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    for (const tlAccount of tlAccounts) {
      const mappedType = mapTrueLayerAccountType(tlAccount.account_type, tlAccount.account_subtype);
      const accountName = tlAccount.display_name || institutionName || 'Linked Bank Account';
      const currency = tlAccount.currency || 'GBP';
      const accountId = crypto.randomUUID();
      const accountCreatedAt = getCurrentTimestamp();

      await db
        .insert(accounts)
        .values({
          id: accountId,
          tenantId: statePayload.tenantId,
          name: accountName,
          type: mappedType,
          balance: 0,
          currency,
          createdAt: accountCreatedAt,
          updatedAt: accountCreatedAt,
        })
        .run();

      const bankAccountId = crypto.randomUUID();
      const maskedNumber = maskAccountNumber(tlAccount.account_number?.number ?? null);

      await db
        .insert(bankAccounts)
        .values({
          id: bankAccountId,
          tenantId: statePayload.tenantId,
          connectionId,
          accountId,
          providerAccountId: tlAccount.account_id,
          accountNumber: maskedNumber,
          sortCode: tlAccount.account_number?.sort_code ?? null,
          iban: tlAccount.account_number?.iban ?? null,
          accountType: tlAccount.account_type ?? null,
          currency,
          syncFromDate: initialSyncDate,
          createdAt: accountCreatedAt,
          updatedAt: accountCreatedAt,
        })
        .run();

      try {
        const balance = await trueLayer.getAccountBalance(tokens.access_token, tlAccount.account_id);
        if (balance) {
          await db
            .update(accounts)
            .set({
              balance: balance.current ?? balance.available ?? 0,
              currency: balance.currency ?? currency,
              updatedAt: getCurrentTimestamp(),
            })
            .where(eq(accounts.id, accountId))
            .run();
        }
      } catch (error) {
        console.warn('Failed to fetch initial balance for account:', error);
      }
    }

    try {
      await c.env.TRANSACTION_SYNC.send({
        type: 'transaction-sync',
        tenantId: statePayload.tenantId,
        connectionId,
        triggeredBy: statePayload.userId,
      });
    } catch (error) {
      console.warn('Failed to queue automatic sync after connection:', error);
    }

    const redirectUrl = buildRedirect(baseUrl, statePayload.returnTo);
    redirectUrl.searchParams.set('status', 'connected');
    redirectUrl.searchParams.set('connection', connectionId);

    return c.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error('TrueLayer callback processing failed:', error);
    const redirectUrl = defaultRedirect;
    redirectUrl.searchParams.set('status', 'error');
    redirectUrl.searchParams.set(
      'message',
      error instanceof Error ? error.message : 'Failed to link bank account.'
    );
    return c.redirect(redirectUrl.toString(), 302);
  }
});

export default banking;
