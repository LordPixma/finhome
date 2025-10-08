import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb, bankConnections, bankAccounts, accounts } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { TrueLayerService } from '../services/banking';
import type { Env } from '../types';

const banking = new Hono<Env>();

// Callback route - no auth required (called by TrueLayer)
banking.get('/callback', async c => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');
    const frontendUrl = c.env.FRONTEND_URL || 'https://app.finhome360.com';

    if (error) {
      return c.redirect(`${frontendUrl}/dashboard/banking?error=${encodeURIComponent(c.req.query('error_description') || 'Authorization failed')}`);
    }
    if (!code || !state) {
      return c.redirect(`${frontendUrl}/dashboard/banking?error=Missing code or state`);
    }

    const stateData = await c.env.SESSIONS.get(`banking_state:${state}`);
    if (!stateData) {
      return c.redirect(`${frontendUrl}/dashboard/banking?error=Invalid state`);
    }

    const { userId, tenantId } = JSON.parse(stateData);
    await c.env.SESSIONS.delete(`banking_state:${state}`);

    const truelayer = new TrueLayerService(c.env);
    const db = getDb(c.env.DB);
    const tokenResponse = await truelayer.exchangeCodeForToken(code);
    const tlAccounts = await truelayer.getAccounts(tokenResponse.access_token);

    if (tlAccounts.length === 0) {
      return c.redirect(`${frontendUrl}/dashboard/banking?error=No accounts found`);
    }

    const provider = tlAccounts[0].provider;
    const connectionId = crypto.randomUUID();
    const now = Date.now();

    await db.insert(bankConnections).values({
      id: connectionId,
      tenantId,
      userId,
      provider: 'truelayer',
      providerConnectionId: `tl_${crypto.randomUUID()}`,
      institutionId: provider.provider_id,
      institutionName: provider.display_name,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenExpiresAt: now + tokenResponse.expires_in * 1000,
      status: 'active',
      lastSyncAt: now,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }).run();

    for (const tlAccount of tlAccounts) {
      const accountId = crypto.randomUUID();
      
      await db.insert(accounts).values({
        id: accountId,
        tenantId,
        name: tlAccount.display_name,
        type: tlAccount.account_type === 'TRANSACTION' ? 'checking' : 'savings',
        balance: 0,
        currency: tlAccount.currency,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }).run();

      await db.insert(bankAccounts).values({
        id: crypto.randomUUID(),
        connectionId,
        accountId,
        providerAccountId: tlAccount.account_id,
        accountNumber: tlAccount.account_number?.number,
        sortCode: tlAccount.account_number?.sort_code,
        iban: tlAccount.account_number?.iban,
        accountType: tlAccount.account_type === 'TRANSACTION' ? 'checking' : 'savings',
        currency: tlAccount.currency,
        syncFromDate: now - 90 * 24 * 60 * 60 * 1000,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }).run();
    }

    return c.redirect(`${frontendUrl}/dashboard/banking?success=true`);
  } catch (error: any) {
    const frontendUrl = c.env.FRONTEND_URL || 'https://app.finhome360.com';
    return c.redirect(`${frontendUrl}/dashboard/banking?error=${encodeURIComponent(error.message)}`);
  }
});

// Apply auth middleware to all other routes
banking.use('*', authMiddleware, tenantMiddleware);

banking.post('/connect', async c => {
  try {
    const user = c.get('user')!;
    const tenantId = c.get('tenantId')!;
    const truelayer = new TrueLayerService(c.env);
    const state = crypto.randomUUID();
    
    await c.env.SESSIONS.put(
      `banking_state:${state}`,
      JSON.stringify({ userId: user.id, tenantId }),
      { expirationTtl: 600 }
    );

    const authUrl = truelayer.getAuthorizationUrl(state);
    return c.json({ success: true, data: { authUrl } });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } }, 500);
  }
});

banking.get('/connections', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const connections = await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.tenantId, tenantId))
      .all();

    return c.json({
      success: true,
      data: connections.map(conn => ({
        id: conn.id,
        institutionName: conn.institutionName,
        status: conn.status,
        lastSyncAt: conn.lastSyncAt,
        createdAt: conn.createdAt,
      })),
    });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch connections' } }, 500);
  }
});

banking.delete('/connections/:connectionId', async c => {
  try {
    const { connectionId } = c.req.param();
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const connection = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, tenantId)))
      .get();

    if (!connection) {
      return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Connection not found' } }, 404);
    }

    await db
      .update(bankConnections)
      .set({ status: 'disconnected', updatedAt: new Date() })
      .where(eq(bankConnections.id, connectionId))
      .run();

    return c.json({ success: true, data: { message: 'Bank disconnected successfully' } });
  } catch (error: any) {
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect bank' } }, 500);
  }
});

export default banking;
