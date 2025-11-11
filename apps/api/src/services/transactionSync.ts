import { eq, and } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  bankConnections,
  bankAccounts,
  transactionSyncHistory,
  accounts,
  categories,
} from '../db/schema';
import { TrueLayerService } from './truelayer';
import { persistTransactionsFromImport } from './importProcessor';
import type { Env } from '../types';
import * as schema from '../db/schema';

interface SyncResult {
  syncId: string;
  status: 'success' | 'failed';
  transactionsFetched: number;
  transactionsImported: number;
  transactionsSkipped: number;
  transactionsFailed: number;
  error?: string;
}

export class TransactionSyncService {
  constructor(
    private db: DrizzleD1Database<typeof schema> & { $client: D1Database },
    private env: Env['Bindings']
  ) {}

  /**
   * Sync transactions for a single bank connection
   */
  async syncConnection(connectionId: string): Promise<SyncResult> {
    const syncId = crypto.randomUUID();
    const startedAt = Date.now();

    try {
      // Fetch connection details
      const connection = await this.db
        .select()
        .from(bankConnections)
        .where(eq(bankConnections.id, connectionId))
        .get();

      if (!connection) {
        throw new Error(`Connection ${connectionId} not found`);
      }

      if (connection.status !== 'active') {
        throw new Error(`Connection ${connectionId} is not active (status: ${connection.status})`);
      }

      // Create sync history record
      await this.db
        .insert(transactionSyncHistory)
        .values({
          id: syncId,
          connectionId,
          bankAccountId: null, // Will update per-account if needed
          syncStartedAt: new Date(),
          syncCompletedAt: null,
          transactionsFetched: 0,
          transactionsImported: 0,
          transactionsSkipped: 0,
          transactionsFailed: 0,
          status: 'in_progress',
          errorMessage: null,
          createdAt: new Date(),
        })
        .run();

      // Initialize TrueLayer service
      const truelayer = new TrueLayerService(
        this.env.TRUELAYER_CLIENT_ID,
        this.env.TRUELAYER_CLIENT_SECRET,
        this.env.TRUELAYER_REDIRECT_URI
      );

      // Check if token is expired and refresh if needed
      let accessToken = connection.accessToken;
      if (connection.tokenExpiresAt && new Date(connection.tokenExpiresAt) < new Date()) {
        if (!connection.refreshToken) {
          throw new Error('Access token expired and no refresh token available');
        }

        const tokenResponse = await truelayer.refreshAccessToken(connection.refreshToken);
        accessToken = tokenResponse.access_token;

        // Update connection with new tokens
        await this.db
          .update(bankConnections)
          .set({
            accessToken: tokenResponse.access_token,
            refreshToken: tokenResponse.refresh_token || connection.refreshToken,
            tokenExpiresAt: tokenResponse.expires_in
              ? new Date(Date.now() + tokenResponse.expires_in * 1000)
              : null,
            updatedAt: new Date(),
          })
          .where(eq(bankConnections.id, connectionId))
          .run();
      }

      // Fetch linked bank accounts
      const linkedAccounts = await this.db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.connectionId, connectionId))
        .all();

      if (linkedAccounts.length === 0) {
        throw new Error('No linked accounts found for this connection');
      }

      let totalFetched = 0;
      let totalImported = 0;
      let totalSkipped = 0;
      let totalFailed = 0;

      // Sync each account
      for (const bankAccount of linkedAccounts) {
        try {
          // Fetch Finhome account details
          const finhomeAccount = await this.db
            .select()
            .from(accounts)
            .where(eq(accounts.id, bankAccount.accountId))
            .get();

          if (!finhomeAccount) {
            console.warn(`Finhome account ${bankAccount.accountId} not found, skipping`);
            continue;
          }

          // Determine sync date range (last 90 days or from syncFromDate)
          const fromDate = bankAccount.syncFromDate
            ? new Date(bankAccount.syncFromDate)
            : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
          const toDate = new Date();

          // Fetch transactions from TrueLayer
          const truelayerTransactions = await truelayer.getTransactions(
            accessToken!,
            bankAccount.providerAccountId,
            fromDate.toISOString().split('T')[0],
            toDate.toISOString().split('T')[0]
          );

          totalFetched += truelayerTransactions.length;

          // Map TrueLayer transactions to internal format
          const mappedTransactions = truelayerTransactions.map((tx) => {
            const isIncome = tx.amount > 0;
            return {
              description: tx.description || 'Transaction',
              amount: Math.abs(tx.amount),
              date: new Date(tx.timestamp),
              type: isIncome ? ('income' as const) : ('expense' as const),
              providerTransactionId: tx.transaction_id,
              notes: tx.meta?.provider_reference || undefined,
            };
          });

          // Get or create default category for uncategorized transactions
          const defaultCategory = await this.db
            .select()
            .from(categories)
            .where(
              and(
                eq(categories.tenantId, connection.tenantId),
                eq(categories.name, 'Uncategorized')
              )
            )
            .get();

          const defaultCategoryId =
            defaultCategory?.id ||
            (await this.createDefaultCategory(connection.tenantId, 'expense'));

          // Persist transactions using shared import logic
          const result = await persistTransactionsFromImport({
            db: this.db,
            tenantId: connection.tenantId,
            account: finhomeAccount,
            defaultCategoryId,
            parsedTransactions: mappedTransactions,
            logId: null, // No import log for automated sync
            startedAt,
          });

          totalImported += result.transactionsImported;
          totalSkipped += result.transactionsSkipped;
          totalFailed += result.transactionsFailed;

          // Update bank account sync date
          await this.db
            .update(bankAccounts)
            .set({
              syncFromDate: toDate,
              updatedAt: new Date(),
            })
            .where(eq(bankAccounts.id, bankAccount.id))
            .run();
        } catch (accountError) {
          console.error(`Error syncing account ${bankAccount.id}:`, accountError);
          totalFailed += 1;
        }
      }

      // Update connection last sync
      await this.db
        .update(bankConnections)
        .set({
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        })
        .where(eq(bankConnections.id, connectionId))
        .run();

      // Update sync history with results
      await this.db
        .update(transactionSyncHistory)
        .set({
          syncCompletedAt: new Date(),
          transactionsFetched: totalFetched,
          transactionsImported: totalImported,
          transactionsSkipped: totalSkipped,
          transactionsFailed: totalFailed,
          status: 'completed',
        })
        .where(eq(transactionSyncHistory.id, syncId))
        .run();

      return {
        syncId,
        status: 'success',
        transactionsFetched: totalFetched,
        transactionsImported: totalImported,
        transactionsSkipped: totalSkipped,
        transactionsFailed: totalFailed,
      };
    } catch (error) {
      console.error(`Sync failed for connection ${connectionId}:`, error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';

      // Update sync history with error
      await this.db
        .update(transactionSyncHistory)
        .set({
          syncCompletedAt: new Date(),
          status: 'failed',
          errorMessage,
        })
        .where(eq(transactionSyncHistory.id, syncId))
        .run();

      // Update connection with error
      await this.db
        .update(bankConnections)
        .set({
          lastError: errorMessage,
          updatedAt: new Date(),
        })
        .where(eq(bankConnections.id, connectionId))
        .run();

      return {
        syncId,
        status: 'failed',
        transactionsFetched: 0,
        transactionsImported: 0,
        transactionsSkipped: 0,
        transactionsFailed: 0,
        error: errorMessage,
      };
    }
  }

  /**
   * Sync all active connections for a tenant
   */
  async syncAllConnectionsForTenant(tenantId: string): Promise<SyncResult[]> {
    const connections = await this.db
      .select({ id: bankConnections.id })
      .from(bankConnections)
      .where(and(eq(bankConnections.tenantId, tenantId), eq(bankConnections.status, 'active')))
      .all();

    const results = await Promise.allSettled(
      connections.map((conn) => this.syncConnection(conn.id))
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          syncId: crypto.randomUUID(),
          status: 'failed',
          transactionsFetched: 0,
          transactionsImported: 0,
          transactionsSkipped: 0,
          transactionsFailed: 0,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        };
      }
    });
  }

  /**
   * Create default "Uncategorized" category if it doesn't exist
   */
  private async createDefaultCategory(tenantId: string, type: 'income' | 'expense'): Promise<string> {
    const categoryId = crypto.randomUUID();
    await this.db
      .insert(categories)
      .values({
        id: categoryId,
        tenantId,
        name: 'Uncategorized',
        type,
        color: '#9CA3AF',
        icon: '📦',
        parentId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .run();

    return categoryId;
  }
}
