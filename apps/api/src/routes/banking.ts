import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { getDb, bankConnections, bankAccounts, accounts } from '../db';
import { TrueLayerService } from '../services/truelayer';
import { TransactionSyncService } from '../services/transactionSync';
import type { Env } from '../types';

const banking = new Hono<Env>();

// IMPORTANT: Do NOT require auth for the OAuth callback route.
// Apply auth selectively to endpoints that require a user/tenant context.

/**
 * POST /api/banking/link
 * Initiates TrueLayer OAuth flow
 * Returns authorization URL for user to connect their bank
 */
banking.post('/link', authMiddleware, async (c) => {
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
      c.env.TRUELAYER_REDIRECT_URI,
      // Optional: allow configuring providers via env (e.g., "uk-ob-all").
      // If not set, we omit the providers param to avoid upstream errors.
      (c.env as any).TRUELAYER_PROVIDERS
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
  console.log('[CALLBACK] Received callback request');
  console.log('[CALLBACK] Query params:', { 
    code: c.req.query('code') ? 'present' : 'missing',
    state: c.req.query('state') ? 'present' : 'missing',
    error: c.req.query('error') 
  });
  
  try {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const error = c.req.query('error');

    if (error) {
      console.error('OAuth error from TrueLayer:', error);
      const errorDescription = c.req.query('error_description') || 'Authorization failed';
      
      // Redirect to frontend with error - explicit Response with 303
      const redirectUrl = `${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=${encodeURIComponent(errorDescription)}`;
      return new Response(null, {
        status: 303,
        headers: {
          'Location': redirectUrl,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    if (!code || !state) {
      const url = `${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=Invalid+callback+parameters`;
      return new Response(null, {
        status: 303,
        headers: {
          'Location': url,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Verify state token
    const storedState = await c.env.CACHE.get(`oauth:state:${state}`);
    console.log('[CALLBACK] State verification:', storedState ? 'valid' : 'invalid/expired');
    if (!storedState) {
      const url = `${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=Invalid+or+expired+state`;
      console.log('[CALLBACK] Redirecting to:', url);
      return new Response(null, {
        status: 303,
        headers: {
          'Location': url,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
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
    console.log('[CALLBACK] Token exchange successful');

    // Fetch provider metadata (account info)
    const metadata = await truelayer.getAccountsMetadata(tokenResponse.access_token);
    console.log('[CALLBACK] Metadata:', JSON.stringify(metadata));

    const db = getDb(c.env.DB);

    // Store connection
    const connectionId = crypto.randomUUID();
    const now = new Date();

    // Use provider info from metadata
    let institutionName = metadata.provider?.display_name || 'Unknown Bank';
    let institutionId = metadata.provider?.provider_id || null;
    
    console.log('[CALLBACK] Creating connection:', { institutionName, institutionId });

    await db
      .insert(bankConnections)
      .values({
        id: connectionId,
        tenantId,
        userId,
        provider: 'truelayer',
        providerConnectionId: metadata.credentials_id || connectionId,
        institutionId,
        institutionName,
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
    const truelayerAccounts = await truelayer.getAccounts(tokenResponse.access_token);
    console.log('[CALLBACK] Fetched accounts:', truelayerAccounts.length);
    
    // Get institution name from first account's provider info if metadata didn't have it
    if (institutionName === 'Unknown Bank' && truelayerAccounts.length > 0 && truelayerAccounts[0].provider) {
      institutionName = truelayerAccounts[0].provider.display_name || 'Unknown Bank';
      institutionId = truelayerAccounts[0].provider.provider_id || null;
      console.log('[CALLBACK] Got institution from account:', { institutionName, institutionId });
      
      // Update the connection with the correct institution info
      await db
        .update(bankConnections)
        .set({ institutionName, institutionId })
        .where(eq(bankConnections.id, connectionId))
        .run();
    }
    
    for (const truelayerAccount of truelayerAccounts) {
      const bankAccountId = crypto.randomUUID();
      
      // Check if this provider account already exists (from a previous connection)
      const existingBankAccount = await db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.providerAccountId, truelayerAccount.account_id))
        .get();
      
      let finhomeAccountId: string;
      
      if (existingBankAccount) {
        // Reuse the existing Finhome account
        finhomeAccountId = existingBankAccount.accountId;
        console.log('[CALLBACK] Reusing existing Finhome account:', finhomeAccountId, 'for provider account:', truelayerAccount.account_id);
        
        // Update the existing bank account with new connection
        await db
          .update(bankAccounts)
          .set({
            connectionId,
            accountNumber: truelayerAccount.account_number?.number || null,
            sortCode: truelayerAccount.account_number?.sort_code || null,
            iban: truelayerAccount.account_number?.iban || null,
            accountType: truelayerAccount.account_type || 'transaction',
            currency: truelayerAccount.currency || 'GBP',
            syncFromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            updatedAt: now,
          })
          .where(eq(bankAccounts.id, existingBankAccount.id))
          .run();
        
        console.log('[CALLBACK] Updated existing bank account link:', existingBankAccount.id);
      } else {
        // Create a new Finhome account for this bank account
        finhomeAccountId = crypto.randomUUID();
        const accountName = truelayerAccount.display_name || 
                            truelayerAccount.account_number?.number || 
                            `${institutionName} Account`;
        
        // Determine account type mapping - convert to lowercase
        let accountType: 'current' | 'savings' | 'credit' | 'cash' | 'investment' | 'other' = 'current';
        const tlType = truelayerAccount.account_type?.toUpperCase();
        if (tlType === 'SAVINGS') {
          accountType = 'savings';
        } else if (tlType === 'TRANSACTION') {
          accountType = 'current'; // TrueLayer TRANSACTION maps to 'current' account
        } else if (tlType === 'CREDIT_CARD' || tlType === 'CREDIT') {
          accountType = 'credit';
        }
        
        console.log('[CALLBACK] Creating new Finhome account:', { name: accountName, type: accountType, currency: truelayerAccount.currency });
        
        try {
          // Create Finhome account
          await db
            .insert(accounts)
            .values({
              id: finhomeAccountId,
              tenantId,
              name: accountName,
              type: accountType,
              balance: 0, // Will be updated during sync
              currency: truelayerAccount.currency || 'GBP',
              createdAt: now,
              updatedAt: now,
            })
            .run();
            
          console.log('[CALLBACK] Finhome account created:', finhomeAccountId);
        } catch (accountError) {
          console.error('[CALLBACK] Failed to create Finhome account:', accountError);
          console.error('[CALLBACK] Account data was:', { id: finhomeAccountId, tenantId, name: accountName, type: accountType });
          throw accountError;
        }
        
        // Create new bank account link
        await db
          .insert(bankAccounts)
          .values({
            id: bankAccountId,
            connectionId,
            accountId: finhomeAccountId,
            providerAccountId: truelayerAccount.account_id,
            accountNumber: truelayerAccount.account_number?.number || null,
            sortCode: truelayerAccount.account_number?.sort_code || null,
            iban: truelayerAccount.account_number?.iban || null,
            accountType: truelayerAccount.account_type || 'transaction',
            currency: truelayerAccount.currency || 'GBP',
            syncFromDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            createdAt: now,
            updatedAt: now,
          })
          .run();
        
        console.log('[CALLBACK] Created new bank account link:', bankAccountId, '→', finhomeAccountId);
      }
    }

    console.log(`Bank connection ${connectionId} created for tenant ${tenantId}`);

    // Trigger initial FULL sync in background (2 years of history on first connection)
    try {
      const syncService = new TransactionSyncService(db, c.env);
      syncService.syncConnection(connectionId, 'full').catch(err => {
        console.error(`[CALLBACK] Background full sync failed for ${connectionId}:`, err);
      });
      console.log('[CALLBACK] Initial full historical sync (2 years) triggered in background');
    } catch (syncError) {
      console.error('[CALLBACK] Failed to trigger sync:', syncError);
      // Don't fail the callback - user can manually sync later
    }

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

    // Success - redirect to frontend
    const url = `${c.env.FRONTEND_URL}${redirectPath}?status=connected`;
    return new Response(null, {
      status: 303,
      headers: {
        'Location': url,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Failed+to+connect+bank';
    const url = `${c.env.FRONTEND_URL}/dashboard/banking?status=error&message=${encodeURIComponent(message)}`;
    return new Response(null, {
      status: 303,
      headers: {
        'Location': url,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
});

/**
 * GET /api/banking/connections
 * List all bank connections for the current tenant
 */
banking.get('/connections', authMiddleware, async (c) => {
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

    // Only return active connections (not disconnected)
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
      .where(
        and(
          eq(bankConnections.tenantId, tenantId),
          eq(bankConnections.status, 'active')
        )
      )
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
 * Body: { syncMode?: 'incremental' | 'full' } - defaults to 'incremental'
 */
banking.post('/connections/:id/sync', authMiddleware, async (c) => {
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

    // Get sync mode from request body (default: incremental)
    const body = await c.req.json().catch(() => ({}));
    const syncMode = body.syncMode === 'full' ? 'full' : 'incremental';

    // Initialize sync service
    const syncService = new TransactionSyncService(db, c.env);

    // Perform sync with specified mode
    const result = await syncService.syncConnection(connectionId, syncMode);

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
banking.post('/connections/sync-all', authMiddleware, async (c) => {
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
banking.delete('/connections/:id', authMiddleware, async (c) => {
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
