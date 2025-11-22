import { eq, and, isNull, sql } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import {
  bankConnections,
  bankAccounts,
  transactionSyncHistory,
  accounts,
  categories,
  transactions,
  recurringTransactions,
} from '../db/schema';
import { TrueLayerService } from './truelayer';
import { persistTransactionsFromImport } from './importProcessor';
import { CloudflareAIService } from './workersai.service';
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
      const now = new Date();
      await this.db
        .insert(transactionSyncHistory)
        .values({
          id: syncId,
          connectionId,
          bankAccountId: null, // Will update per-account if needed
          syncStartedAt: now,
          syncCompletedAt: null,
          transactionsFetched: 0,
          transactionsImported: 0,
          transactionsSkipped: 0,
          transactionsFailed: 0,
          status: 'in_progress',
          errorMessage: null,
          createdAt: now,
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
          const fromDate = bankAccount.syncFromDate ||
            new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
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

          // Auto-categorize newly imported transactions using AI
          if (result.transactionsImported > 0 && this.env.AI) {
            try {
              await this.autoCategorizeTransactions(connection.tenantId, finhomeAccount.id);
              console.log(`Auto-categorized ${result.transactionsImported} transactions for account ${finhomeAccount.id}`);
            } catch (categorizationError) {
              console.error('Auto-categorization failed:', categorizationError);
              // Don't fail the sync if categorization fails
            }
          }

          // Detect and create recurring transactions
          if (result.transactionsImported > 0) {
            try {
              await this.detectRecurringTransactions(connection.tenantId, finhomeAccount.id);
              console.log(`Detected recurring transactions for account ${finhomeAccount.id}`);
            } catch (recurringError) {
              console.error('Recurring transaction detection failed:', recurringError);
              // Don't fail the sync if detection fails
            }
          }

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
   * Detect recurring transactions and create recurring transaction records
   */
  private async detectRecurringTransactions(tenantId: string, accountId: string): Promise<void> {
    // Get all transactions from last 6 months for pattern detection
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allTransactions = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.accountId, accountId)
        )
      )
      .all();

    // Group transactions by similar description (fuzzy match)
    const transactionGroups = new Map<string, typeof allTransactions>();

    for (const transaction of allTransactions) {
      const normalizedDesc = this.normalizeDescription(transaction.description);

      if (!transactionGroups.has(normalizedDesc)) {
        transactionGroups.set(normalizedDesc, []);
      }
      transactionGroups.get(normalizedDesc)!.push(transaction);
    }

    // Find groups with 3+ transactions (potential recurring)
    for (const [description, group] of transactionGroups.entries()) {
      if (group.length < 3) continue;

      // Sort by date
      group.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate intervals between transactions
      const intervals: number[] = [];
      for (let i = 1; i < group.length; i++) {
        const daysDiff = Math.round(
          (new Date(group[i].date).getTime() - new Date(group[i - 1].date).getTime()) /
          (1000 * 60 * 60 * 24)
        );
        intervals.push(daysDiff);
      }

      // Check for consistent pattern (monthly: ~28-32 days, weekly: ~6-8 days)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const isMonthly = avgInterval >= 25 && avgInterval <= 35;
      const isWeekly = avgInterval >= 6 && avgInterval <= 8;
      const isBiweekly = avgInterval >= 13 && avgInterval <= 15;

      if (isMonthly || isWeekly || isBiweekly) {
        // Check if this recurring transaction already exists
        const existingRecurring = await this.db
          .select()
          .from(recurringTransactions)
          .where(
            and(
              eq(recurringTransactions.tenantId, tenantId),
              eq(recurringTransactions.accountId, accountId),
              eq(recurringTransactions.description, group[0].description)
            )
          )
          .get();

        if (!existingRecurring) {
          // Create new recurring transaction
          const frequency = isWeekly ? 'weekly' : isBiweekly ? 'biweekly' : 'monthly';
          const lastTransaction = group[group.length - 1];

          // Calculate next occurrence
          const nextDate = new Date(lastTransaction.date);
          if (frequency === 'weekly') {
            nextDate.setDate(nextDate.getDate() + 7);
          } else if (frequency === 'biweekly') {
            nextDate.setDate(nextDate.getDate() + 14);
          } else {
            nextDate.setMonth(nextDate.getMonth() + 1);
          }

          await this.db
            .insert(recurringTransactions)
            .values({
              id: crypto.randomUUID(),
              tenantId,
              accountId: accountId,
              categoryId: lastTransaction.categoryId,
              description: lastTransaction.description,
              amount: lastTransaction.amount,
              type: lastTransaction.type,
              frequency,
              dayOfMonth: frequency === 'monthly' ? new Date(lastTransaction.date).getDate() : null,
              dayOfWeek: frequency === 'weekly' || frequency === 'biweekly'
                ? new Date(lastTransaction.date).getDay()
                : null,
              startDate: new Date(group[0].date),
              endDate: null,
              nextOccurrence: nextDate,
              isActive: true,
              autoDetected: true,
              notes: `Auto-detected from ${group.length} similar transactions`,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
            .run();

          console.log(`Created recurring transaction: "${lastTransaction.description}" (${frequency})`);
        }
      }
    }
  }

  /**
   * Normalize transaction description for pattern matching
   */
  private normalizeDescription(description: string): string {
    return description
      .toLowerCase()
      .replace(/\d+/g, '') // Remove numbers
      .replace(/[^a-z\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Auto-categorize uncategorized transactions using AI
   */
  private async autoCategorizeTransactions(tenantId: string, accountId: string): Promise<void> {
    // Find all uncategorized transactions for this account (imported in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const uncategorizedCategory = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.tenantId, tenantId), eq(categories.name, 'Uncategorized')))
      .get();

    if (!uncategorizedCategory) return;

    const uncategorizedTransactions = await this.db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, tenantId),
          eq(transactions.accountId, accountId),
          eq(transactions.categoryId, uncategorizedCategory.id)
        )
      )
      .limit(50) // Categorize up to 50 transactions per sync
      .all();

    if (uncategorizedTransactions.length === 0) return;

    // Get all available categories for this tenant
    const allCategories = await this.db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .all();

    const aiService = new CloudflareAIService(this.env.AI);

    // Categorize each transaction
    for (const transaction of uncategorizedTransactions) {
      try {
        const suggestion = await aiService.categorizeTransaction(
          transaction.description,
          transaction.amount
        );

        // Find matching category
        const matchingCategory = allCategories.find(
          (cat) => cat.name.toLowerCase() === suggestion.category.toLowerCase()
        );

        if (matchingCategory) {
          // Update transaction with AI-suggested category
          await this.db
            .update(transactions)
            .set({
              categoryId: matchingCategory.id,
              updatedAt: new Date(),
            })
            .where(eq(transactions.id, transaction.id))
            .run();

          console.log(`Auto-categorized "${transaction.description}" as "${matchingCategory.name}"`);
        }
      } catch (error) {
        console.error(`Failed to categorize transaction ${transaction.id}:`, error);
        // Continue with next transaction
      }
    }
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
