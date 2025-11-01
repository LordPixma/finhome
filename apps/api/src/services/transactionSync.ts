/**
 * Transaction Sync Service
 * Handles synchronization of transactions from TrueLayer to local database
 */

import { eq, and, max } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { transactions, bankConnections, bankAccounts, transactionSyncHistory } from '../db';
import { TrueLayerService } from './banking';
import { categorizeTransaction } from './categorization';
import type { Env } from '../types';

class TransactionSyncService {
  private db: any;
  private trueLayerService: TrueLayerService;
  private tenantId: string;

  constructor(db: any, env: Env['Bindings'], tenantId: string) {
    this.db = db;
    this.trueLayerService = new TrueLayerService(env);
    this.tenantId = tenantId;
  }

  /**
   * Sync all transactions for all active bank connections
   */
  async syncAllConnections(): Promise<void> {
    console.log(`Starting transaction sync for tenant: ${this.tenantId}`);

    // Get all active bank connections for this tenant
    const connections = await this.db
      .select()
      .from(bankConnections)
      .where(
        and(
          eq(bankConnections.tenantId, this.tenantId),
          eq(bankConnections.status, 'active')
        )
      );

    console.log(`Found ${connections.length} active bank connections`);

    for (const connection of connections) {
      try {
        await this.syncConnection(connection);
      } catch (error) {
        console.error(`Failed to sync connection ${connection.id}:`, error);
        
        // Update connection with error
        await this.db
          .update(bankConnections)
          .set({
            lastError: String(error),
            updatedAt: new Date()
          })
          .where(eq(bankConnections.id, connection.id));
      }
    }

    console.log(`Transaction sync completed for tenant: ${this.tenantId}`);
  }

  /**
   * Sync transactions for a specific bank connection
   */
  async syncConnection(connection: any): Promise<void> {
    console.log(`Syncing connection: ${connection.id} (${connection.institutionName})`);

    // Create sync history record
    const syncId = uuidv4();
    await this.db.insert(transactionSyncHistory).values({
      id: syncId,
      connectionId: connection.id,
      syncStartedAt: new Date(),
      status: 'in_progress',
      createdAt: new Date()
    });

    let totalFetched = 0;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    try {
      // Get all bank accounts for this connection
      const bankAccountsList = await this.db
        .select()
        .from(bankAccounts)
        .where(eq(bankAccounts.connectionId, connection.id));

      console.log(`Found ${bankAccountsList.length} bank accounts for connection`);

      for (const bankAccount of bankAccountsList) {
        try {
          const result = await this.syncBankAccount(connection, bankAccount);
          totalFetched += result.fetched;
          totalImported += result.imported;
          totalSkipped += result.skipped;
          totalFailed += result.failed;
        } catch (error) {
          console.error(`Failed to sync bank account ${bankAccount.id}:`, error);
          totalFailed++;
        }
      }

      // Update sync history with success
      await this.db
        .update(transactionSyncHistory)
        .set({
          syncCompletedAt: new Date(),
          transactionsFetched: totalFetched,
          transactionsImported: totalImported,
          transactionsSkipped: totalSkipped,
          transactionsFailed: totalFailed,
          status: 'completed'
        })
        .where(eq(transactionSyncHistory.id, syncId));

      // Update connection last sync time
      await this.db
        .update(bankConnections)
        .set({
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date()
        })
        .where(eq(bankConnections.id, connection.id));

      console.log(`Sync completed for connection ${connection.id}: ${totalImported} imported, ${totalSkipped} skipped`);

    } catch (error) {
      // Update sync history with failure
      await this.db
        .update(transactionSyncHistory)
        .set({
          syncCompletedAt: new Date(),
          transactionsFetched: totalFetched,
          transactionsImported: totalImported,
          transactionsSkipped: totalSkipped,
          transactionsFailed: totalFailed,
          status: 'failed',
          errorMessage: String(error)
        })
        .where(eq(transactionSyncHistory.id, syncId));

      throw error;
    }
  }

  /**
   * Sync transactions for a specific bank account
   */
  async syncBankAccount(connection: any, bankAccount: any): Promise<{
    fetched: number;
    imported: number;
    skipped: number;
    failed: number;
  }> {
    console.log(`Syncing bank account: ${bankAccount.providerAccountId}`);

    // Get the last transaction date to sync from
    const lastTransaction = await this.db
      .select({ date: max(transactions.date) })
      .from(transactions)
      .where(
        and(
          eq(transactions.tenantId, this.tenantId),
          eq(transactions.accountId, bankAccount.accountId)
        )
      )
      .get();

    // Default to 90 days ago if no previous transactions
    const fromDate = lastTransaction?.date 
      ? new Date(lastTransaction.date.getTime() + 24 * 60 * 60 * 1000) // Next day
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days ago

    try {
      // Fetch transactions from TrueLayer
      const trueLayerTransactions = await this.trueLayerService.getTransactions(
        connection.accessToken,
        bankAccount.providerAccountId,
        fromDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
        new Date().toISOString().split('T')[0] // Today as YYYY-MM-DD
      );

      console.log(`Fetched ${trueLayerTransactions.length} transactions from TrueLayer`);

      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const tlTransaction of trueLayerTransactions) {
        try {
          // Check if transaction already exists
          const existingTransaction = await this.db
            .select()
            .from(transactions)
            .where(
              and(
                eq(transactions.tenantId, this.tenantId),
                eq(transactions.providerTransactionId, tlTransaction.transaction_id)
              )
            )
            .get();

          if (existingTransaction) {
            skipped++;
            continue;
          }

          // Import the transaction
          await this.importTransaction(tlTransaction, bankAccount);
          imported++;

        } catch (error) {
          console.error(`Failed to import transaction ${tlTransaction.transaction_id}:`, error);
          failed++;
        }
      }

      return {
        fetched: trueLayerTransactions.length,
        imported,
        skipped,
        failed
      };

    } catch (error) {
      console.error(`Failed to fetch transactions for account ${bankAccount.providerAccountId}:`, error);
      throw error;
    }
  }

  /**
   * Import a single TrueLayer transaction into the database
   */
  async importTransaction(tlTransaction: any, bankAccount: any): Promise<void> {
    // Determine transaction type
    const amount = Math.abs(tlTransaction.amount);
    const type = tlTransaction.amount >= 0 ? 'income' : 'expense';

    // Categorize the transaction
    const categoryResult = await categorizeTransaction(
      this.db,
      this.tenantId,
      tlTransaction.description
    );

    // Create transaction
    const transactionId = uuidv4();
    await this.db.insert(transactions).values({
      id: transactionId,
      tenantId: this.tenantId,
      accountId: bankAccount.accountId,
      categoryId: categoryResult.suggestedCategoryId || 'uncategorized', // Use suggestedCategoryId
      amount: amount,
      description: tlTransaction.description,
      date: new Date(tlTransaction.timestamp),
      type,
      notes: tlTransaction.transaction_type ? `Bank: ${tlTransaction.transaction_type}` : null,
      providerTransactionId: tlTransaction.transaction_id,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`Imported transaction: ${tlTransaction.description} (${amount})`);
  }

  /**
   * Force sync a specific connection (manual trigger)
   */
  async forceSyncConnection(connectionId: string): Promise<void> {
    const connection = await this.db
      .select()
      .from(bankConnections)
      .where(
        and(
          eq(bankConnections.id, connectionId),
          eq(bankConnections.tenantId, this.tenantId)
        )
      )
      .get();

    if (!connection) {
      throw new Error('Bank connection not found');
    }

    await this.syncConnection(connection);
  }
}

export { TransactionSyncService };