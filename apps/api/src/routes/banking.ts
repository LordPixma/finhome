import { Hono } from 'hono';
import { eq, and, sql } from 'drizzle-orm';
import { getDb, bankConnections, bankAccounts, accounts, transactions } from '../db';
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
    
    // Exchange authorization code for access token
    const tokenResponse = await truelayer.exchangeCodeForToken(code);
    
    // Get account information
    const tlAccounts = await truelayer.getAccounts(tokenResponse.access_token);

    if (tlAccounts.length === 0) {
      return c.redirect(`${frontendUrl}/dashboard/banking?error=No accounts found`);
    }

    const provider = tlAccounts[0].provider;
    const connectionId = crypto.randomUUID();
    const now = Date.now();

    // Create bank connection record
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

    // Create account records for each bank account
    for (const tlAccount of tlAccounts) {
      const accountId = crypto.randomUUID();
      
      // Create Finhome account
      await db.insert(accounts).values({
        id: accountId,
        tenantId,
        name: tlAccount.display_name,
        type: tlAccount.account_type === 'TRANSACTION' ? 'checking' : 'savings',
        balance: 0, // Will be updated during sync
        currency: tlAccount.currency,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }).run();

      // Create bank account mapping
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
        syncFromDate: now - 90 * 24 * 60 * 60 * 1000, // Sync from 90 days ago
        createdAt: new Date(now),
        updatedAt: new Date(now),
      }).run();
    }

    // Start automatic transaction sync for the new connection
    try {
      const { TransactionSyncService } = await import('../services/transactionSync');
      const syncService = new TransactionSyncService(db, c.env, tenantId);
      
      // Sync in background (don't await to avoid blocking the redirect)
      syncService.forceSyncConnection(connectionId).catch(error => {
        console.error('Auto-sync after connection failed:', error);
      });
      
      console.log(`Started automatic transaction sync for connection: ${connectionId}`);
    } catch (error) {
      console.warn('Failed to start automatic sync:', error);
      // Don't fail the connection process if sync fails
    }

    return c.redirect(`${frontendUrl}/dashboard/banking?success=true`);
  } catch (error: any) {
    console.error('Banking callback error:', error);
    const frontendUrl = c.env.FRONTEND_URL || 'https://app.finhome360.com';
    return c.redirect(`${frontendUrl}/dashboard/banking?error=${encodeURIComponent(error.message || 'Connection failed')}`);
  }
});

// Test endpoint for debugging (no auth required)
banking.get('/test', async c => {
  return c.json({ success: true, data: { message: 'Banking routes are working!' } });
});

// Debug endpoint to check TrueLayer configuration and connection status
banking.get('/debug', async c => {
  try {
    const hasClientId = !!c.env.TRUELAYER_CLIENT_ID;
    const hasClientSecret = !!c.env.TRUELAYER_CLIENT_SECRET;
    const hasRedirectUri = !!c.env.TRUELAYER_REDIRECT_URI;
    
    // Test TrueLayer service initialization
    let trueLayerInitialized = false;
    let trueLayerError = null;
    
    try {
      const truelayer = new TrueLayerService(c.env);
      trueLayerInitialized = true;
    } catch (error: any) {
      trueLayerError = error.message;
    }

    return c.json({ 
      success: true, 
      data: { 
        message: 'Banking debug info',
        config: {
          hasClientId,
          hasClientSecret,
          hasRedirectUri,
          redirectUri: c.env.TRUELAYER_REDIRECT_URI,
        },
        trueLayer: {
          initialized: trueLayerInitialized,
          error: trueLayerError
        }
      } 
    });
  } catch (error: any) {
    return c.json({ 
      success: false, 
      error: { code: 'DEBUG_ERROR', message: error.message } 
    });
  }
});

// Apply auth middleware to all other routes
banking.use('*', authMiddleware, tenantMiddleware);

// Connect bank account
banking.post('/connect', async c => {
  try {
    const user = c.get('user')!;
    const tenantId = c.get('tenantId')!;
    const truelayer = new TrueLayerService(c.env);
    const state = crypto.randomUUID();
    
    // Store state with user/tenant context
    await c.env.SESSIONS.put(
      `banking_state:${state}`,
      JSON.stringify({ userId: user.id, tenantId }),
      { expirationTtl: 600 } // 10 minutes
    );

    const authUrl = truelayer.getAuthorizationUrl(state);
    return c.json({ success: true, data: { authUrl } });
  } catch (error: any) {
    console.error('Banking connect error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to initiate bank connection' } 
    }, 500);
  }
});

// Get bank connections
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
        institutionId: conn.institutionId,
        status: conn.status,
        lastSyncAt: conn.lastSyncAt,
        createdAt: conn.createdAt,
      })),
    });
  } catch (error: any) {
    console.error('Banking connections error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch connections' } 
    }, 500);
  }
});

// Disconnect bank
banking.delete('/connections/:connectionId', async c => {
  try {
    const { connectionId } = c.req.param();
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    // Find the connection
    const connection = await db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, tenantId)))
      .get();

    if (!connection) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Connection not found' } 
      }, 404);
    }

    // Revoke token with TrueLayer if connection is still active
    if (connection.status === 'active' && connection.accessToken) {
      try {
        const truelayer = new TrueLayerService(c.env);
        await truelayer.revokeToken(connection.accessToken);
      } catch (error) {
        console.warn('Failed to revoke TrueLayer token:', error);
        // Continue with disconnection even if revocation fails
      }
    }

    // Get all bank accounts linked to this connection before deletion
    const linkedBankAccounts = await db
      .select({ accountId: bankAccounts.accountId })
      .from(bankAccounts)
      .where(eq(bankAccounts.connectionId, connectionId))
      .all();

    // Clear providerTransactionId from transactions to show they're no longer synced
    // This preserves transaction history while indicating disconnection
    for (const bankAccount of linkedBankAccounts) {
      await db
        .update(transactions)
        .set({ 
          providerTransactionId: null,
          notes: sql`CASE 
            WHEN ${transactions.notes} IS NULL THEN 'Bank disconnected - no longer syncing'
            ELSE ${transactions.notes} || ' (Bank disconnected - no longer syncing)'
          END`,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(transactions.accountId, bankAccount.accountId),
            eq(transactions.tenantId, tenantId)
          )
        )
        .run();
    }

    // Delete the bank connection (cascades to bankAccounts and sync history)
    await db
      .delete(bankConnections)
      .where(eq(bankConnections.id, connectionId))
      .run();

    return c.json({ 
      success: true, 
      data: { message: 'Bank connection deleted successfully. Transaction history preserved.' } 
    });
  } catch (error: any) {
    console.error('Banking disconnect error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disconnect bank' } 
    }, 500);
  }
});

// Sync transactions for all connections
banking.post('/sync', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    
    const { TransactionSyncService } = await import('../services/transactionSync');
    const syncService = new TransactionSyncService(db, c.env, tenantId);
    
    // Start sync in background
    await syncService.syncAllConnections();
    
    return c.json({ 
      success: true, 
      data: { message: 'Transaction sync started successfully' } 
    });
  } catch (error: any) {
    console.error('Transaction sync error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to sync transactions' } 
    }, 500);
  }
});

// Sync transactions for a specific connection
banking.post('/sync/:connectionId', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    const connectionId = c.req.param('connectionId');
    
    const { TransactionSyncService } = await import('../services/transactionSync');
    const syncService = new TransactionSyncService(db, c.env, tenantId);
    
    await syncService.forceSyncConnection(connectionId);
    
    return c.json({ 
      success: true, 
      data: { message: 'Connection sync completed successfully' } 
    });
  } catch (error: any) {
    console.error('Connection sync error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to sync connection' } 
    }, 500);
  }
});

// Debug connection status for authenticated users
banking.get('/debug/connections', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId')!;
    
    // Get all connections with detailed info
    const connections = await db
      .select()
      .from(bankConnections)
      .where(eq(bankConnections.tenantId, tenantId))
      .all();

    // Get bank accounts for each connection
    const connectionsWithAccounts = await Promise.all(
      connections.map(async (connection) => {
        const accounts = await db
          .select()
          .from(bankAccounts)
          .where(eq(bankAccounts.connectionId, connection.id))
          .all();
        
        // Test TrueLayer access token if connection is active
        let tokenValid = false;
        let tokenError = null;
        
        if (connection.status === 'active' && connection.accessToken) {
          try {
            const truelayer = new TrueLayerService(c.env);
            await truelayer.getAccounts(connection.accessToken);
            tokenValid = true;
          } catch (error: any) {
            tokenError = error.message;
          }
        }
        
        return {
          ...connection,
          accounts,
          tokenStatus: {
            valid: tokenValid,
            error: tokenError,
            expired: connection.tokenExpiresAt ? Date.now() > connection.tokenExpiresAt : null
          }
        };
      })
    );

    return c.json({ 
      success: true, 
      data: { 
        connections: connectionsWithAccounts,
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.status === 'active').length
      } 
    });
  } catch (error: any) {
    console.error('Debug connections error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message } 
    }, 500);
  }
});

export default banking;
