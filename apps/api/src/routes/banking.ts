import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { getDb, bankConnections, bankAccounts } from '../db';
import { TrueLayerService } from '../services/truelayer';
import { TransactionSyncService } from '../services/transactionSync';
import type { Env } from '../types';

const banking = new Hono<Env>();

// Apply auth middleware to all routes
banking.use('*', authMiddleware);

/**
 * POST /api/banking/link
 * Initiates TrueLayer OAuth flow
 * Returns authorization URL for user to connect their bank
 */
banking.post('/link', async (c) => {
  try {
    const user = c.get('user');
    const tenantId = c.get('tenantId');

    if (!user || !tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        401
      );
    }

    const body = await c.req.json();
    const { redirectUrl } = body;

    const truelayer = new TrueLayerService(
      c.env.TRUELAYER_CLIENT_ID,
      c.env.TRUELAYER_CLIENT_SECRET,
      c.env.TRUELAYER_REDIRECT_URI
    );

    // Generate state token (tenant + user + timestamp + random)
    const state = btoa(
      JSON.stringify({
        tenantId,
        userId: user.id,
        timestamp: Date.now(),
        nonce: crypto.randomUUID(),
        redirectUrl: redirectUrl || '/dashboard/banking',
      })
    );

    // Store state in KV with 15 minute expiration
    await c.env.CACHE.put(`oauth:state:${state}`, JSON.stringify({ tenantId, userId: user.id }), {
      expirationTtl: 900, // 15 minutes
    });

    const authorizationUrl = truelayer.getAuthorizationUrl(state);

    return c.json({
      success: true,
      data: { authorizationUrl, state },
    });
  } catch (error) {
    console.error('Error initiating bank link:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'LINK_INIT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to initiate bank link',
        },
      },
      500
    );
  }
});

/**
 * GET /api/banking/callback
 * TrueLayer OAuth callback handler
 * Exchanges authorization code for access token and stores connection
 */
banking.get('/callback', async (c) => {
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      console.error('OAuth error from TrueLayer:', error);
      const errorDescription = c.req.query('error_description') || 'Authorization failed';
      
      // Redirect to frontend with error
      const redirectUrl = `${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=${encodeURIComponent(errorDescription)}`;
      return c.redirect(redirectUrl);
    }

    if (!code || !state) {
      return c.redirect(`${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=Invalid+callback+parameters`);
    }

    // Verify state token
    const storedState = await c.env.CACHE.get(`oauth:state:${state}`);
    if (!storedState) {
      return c.redirect(`${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=Invalid+or+expired+state`);
    }

    const { tenantId, userId } = JSON.parse(storedState);

    // Delete used state token
    await c.env.CACHE.delete(`oauth:state:${state}`);

    const truelayer = new TrueLayerService(
      c.env.TRUELAYER_CLIENT_ID,
      c.env.TRUELAYER_CLIENT_SECRET,
      c.env.TRUELAYER_REDIRECT_URI
    );

    // Exchange code for tokens
    const tokenResponse = await truelayer.exchangeCodeForToken(code);

    // Fetch provider metadata (account info)
    const metadata = await truelayer.getAccountsMetadata(tokenResponse.access_token);

    const db = getDb(c.env.DB);

    // Store connection
    const connectionId = crypto.randomUUID();
    const now = new Date();

    await db
      .insert(bankConnections)
      .values({
        id: connectionId,
        tenantId,
        userId,
        provider: 'truelayer',
        providerConnectionId: metadata.credentials_id || connectionId,
        institutionId: metadata.provider?.provider_id || null,
        institutionName: metadata.provider?.display_name || 'Bank',
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
        tokenExpiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000)
          : null,
        status: 'active',
        lastSyncAt: null,
        lastError: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Fetch and store linked accounts
    const accounts = await truelayer.getAccounts(tokenResponse.access_token);

    for (const truelayerAccount of accounts) {
      const accountId = crypto.randomUUID();
      
      await db
        .insert(bankAccounts)
        .values({
          id: accountId,
          connectionId,
          accountId: accountId, // Will be linked to user's Finhome account later
          providerAccountId: truelayerAccount.account_id,
          accountNumber: truelayerAccount.account_number?.number || null,
          sortCode: truelayerAccount.account_number?.sort_code || null,
          iban: truelayerAccount.account_number?.iban || null,
          accountType: truelayerAccount.account_type || 'transaction',
          currency: truelayerAccount.currency || 'GBP',
          syncFromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
          createdAt: now,
          updatedAt: now,
        })
        .run();
    }

    console.log(`Bank connection ${connectionId} created for tenant ${tenantId}`);

    // Decode state to get redirect URL
    let redirectPath = '/dashboard/banking';
    try {
      const stateData = JSON.parse(atob(state));
      if (stateData.redirectUrl) {
        redirectPath = stateData.redirectUrl;
      }
    } catch (e) {
      // Use default
    }

    return c.redirect(`${c.env.FRONTEND_URL}${redirectPath}?status=connected`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Failed+to+connect+bank';
    return c.redirect(`${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=${encodeURIComponent(message)}`);
  }
});

/**
 * GET /api/banking/connections
 * List all bank connections for the current tenant
 */
banking.get('/connections', async (c) => {
  try {
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        },
        401
      );
    }

    const db = getDb(c.env.DB);

    const connections = await db
      .select({
        id: bankConnections.id,
        provider: bankConnections.provider,
        institutionName: bankConnections.institutionName,
        status: bankConnections.status,
        lastSyncAt: bankConnections.lastSyncAt,
        lastError: bankConnections.lastError,
        createdAt: bankConnections.createdAt,
      })
      .from(bankConnections)
      .where(eq(bankConnections.tenantId, tenantId))
      .orderBy(desc(bankConnections.createdAt))
      .all();

    // For each connection, count linked accounts
    const connectionsWithAccounts = await Promise.all(
      connections.map(async (conn) => {
        const accounts = await db
          .select({ count: bankAccounts.id })
          .from(bankAccounts)
          .where(eq(bankAccounts.connectionId, conn.id))
          .all();

        return {
          ...conn,
          accountCount: accounts.length,
        };
      })
    );

    return c.json({
      success: true,
      data: connectionsWithAccounts,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch connections',
        },
      },
      500
    );
  }
});

/**
 * POST /api/banking/connections/:id/sync
 * Trigger manual sync for a connection
 */
banking.post('/connections/:id/sync', async (c) => {
  try {
    const connectionId = c.req.param('id');
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        },
        401
      );
    }

    const db = getDb(c.env.DB);

    // Fetch connection
    const connection = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, tenantId)))
      .get();

    if (!connection) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Connection not found' },
        },
        404
      );
    }

    // Initialize sync service
    const syncService = new TransactionSyncService(db, c.env);

    // Perform sync
    const result = await syncService.syncConnection(connectionId);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error syncing connection:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SYNC_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync connection',
        },
      },
      500
    );
  }
});

/**
 * POST /api/banking/connections/sync-all
 * Trigger sync for all active connections
 */
banking.post('/connections/sync-all', async (c) => {
  try {
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        },
        401
      );
    }

    const db = getDb(c.env.DB);

    // Fetch all active connections for tenant
    const connections = await db
      .select({ id: bankConnections.id })
      .from(bankConnections)
      .where(and(eq(bankConnections.tenantId, tenantId), eq(bankConnections.status, 'active')))
      .all();

    const syncService = new TransactionSyncService(db, c.env);

    const results = await Promise.allSettled(
      connections.map((conn) => syncService.syncConnection(conn.id))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return c.json({
      success: true,
      data: {
        total: connections.length,
        succeeded,
        failed,
      },
    });
  } catch (error) {
    console.error('Error syncing all connections:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'SYNC_ALL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to sync all connections',
        },
      },
      500
    );
  }
});

/**
 * DELETE /api/banking/connections/:id
 * Disconnect a bank connection
 */
banking.delete('/connections/:id', async (c) => {
  try {
    const connectionId = c.req.param('id');
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant context required' },
        },
        401
      );
    }

    const db = getDb(c.env.DB);

    // Verify connection belongs to tenant
    const connection = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, tenantId)))
      .get();

    if (!connection) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Connection not found' },
        },
        404
      );
    }

    // Update status to disconnected (soft delete)
    await db
      .update(bankConnections)
      .set({
        status: 'disconnected',
        accessToken: null,
        refreshToken: null,
        updatedAt: new Date(),
      })
      .where(eq(bankConnections.id, connectionId))
      .run();

    return c.json({
      success: true,
      data: { message: 'Connection disconnected successfully' },
    });
  } catch (error) {
    console.error('Error disconnecting connection:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'DISCONNECT_ERROR',
          message: error instanceof Error ? error.message : 'Failed to disconnect connection',
        },
      },
      500
    );
  }
});

export default banking;
