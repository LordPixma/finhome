import { and, eq } from 'drizzle-orm';
import type { getDb } from '../db';
import {
  accounts,
  bankAccounts,
  bankConnections,
  categories,
  transactionSyncHistory,
  transactions,
} from '../db';
import type { Env } from '../types';
import { getCurrentTimestamp } from '../utils/timestamp';
import { TrueLayerService, TrueLayerTransaction } from './truelayer';
import { categorizeTransaction, getMerchantPatterns, type MerchantPattern } from './categorization';

interface SyncTotals {
  fetched: number;
  imported: number;
  skipped: number;
  failed: number;
  latestTransactionDate?: Date | null;
}

type Database = ReturnType<typeof getDb>;

type BankAccountRecord = typeof bankAccounts.$inferSelect;
type AccountRecord = typeof accounts.$inferSelect;
type BankConnectionRecord = typeof bankConnections.$inferSelect;

export class TransactionSyncService {
  private readonly trueLayer: TrueLayerService;
  private expenseFallbackCategoryId?: string;
  private incomeFallbackCategoryId?: string;
  private merchantPatterns?: Map<string, MerchantPattern>;

  constructor(
    private readonly db: Database,
    env: Env['Bindings'],
    private readonly tenantId: string
  ) {
    this.trueLayer = new TrueLayerService(env);
  }

  async forceSyncConnection(connectionId: string): Promise<void> {
    const connection = await this.db
      .select()
      .from(bankConnections)
      .where(and(eq(bankConnections.id, connectionId), eq(bankConnections.tenantId, this.tenantId)))
      .get();

    if (!connection) {
      throw new Error('Bank connection not found');
    }

    const linkedAccounts = await this.db
      .select({ bankAccount: bankAccounts, account: accounts })
      .from(bankAccounts)
      .innerJoin(accounts, eq(bankAccounts.accountId, accounts.id))
      .where(eq(bankAccounts.connectionId, connectionId))
      .all();

    if (linkedAccounts.length === 0) {
      throw new Error('No linked accounts found for connection');
    }

    const now = getCurrentTimestamp();
    const syncId = crypto.randomUUID();

    await this.db
      .insert(transactionSyncHistory)
      .values({
        id: syncId,
        tenantId: this.tenantId,
        connectionId: connection.id,
        bankAccountId: null,
        syncStartedAt: now,
        status: 'in_progress',
        transactionsFetched: 0,
        transactionsImported: 0,
        transactionsSkipped: 0,
        transactionsFailed: 0,
        createdAt: now,
      })
      .run();

    try {
      const accessToken = await this.ensureAccessToken(connection);
      this.merchantPatterns = await getMerchantPatterns(this.db, this.tenantId);

      const totals: SyncTotals = {
        fetched: 0,
        imported: 0,
        skipped: 0,
        failed: 0,
        latestTransactionDate: null,
      };

      for (const record of linkedAccounts) {
        const accountTotals = await this.syncBankAccount(
          record.bankAccount,
          record.account,
          accessToken
        );

        totals.fetched += accountTotals.fetched;
        totals.imported += accountTotals.imported;
        totals.skipped += accountTotals.skipped;
        totals.failed += accountTotals.failed;

        if (accountTotals.latestTransactionDate) {
          if (!totals.latestTransactionDate || accountTotals.latestTransactionDate > totals.latestTransactionDate) {
            totals.latestTransactionDate = accountTotals.latestTransactionDate;
          }
        }
      }

      const completionTime = getCurrentTimestamp();
      const status = totals.failed === 0 ? 'completed' : totals.imported > 0 ? 'completed' : 'failed';
      const errorMessage = totals.failed > 0 ? 'Some transactions failed to import. Check logs for details.' : null;

      await this.db
        .update(transactionSyncHistory)
        .set({
          status,
          syncCompletedAt: completionTime,
          transactionsFetched: totals.fetched,
          transactionsImported: totals.imported,
          transactionsSkipped: totals.skipped,
          transactionsFailed: totals.failed,
          errorMessage,
        })
        .where(eq(transactionSyncHistory.id, syncId))
        .run();

      await this.db
        .update(bankConnections)
        .set({
          lastSyncAt: completionTime,
          status: totals.failed > 0 ? 'error' : 'active',
          lastError: errorMessage,
          updatedAt: completionTime,
        })
        .where(eq(bankConnections.id, connection.id))
        .run();
    } catch (error) {
      console.error('Transaction sync failed:', error);

      await this.db
        .update(transactionSyncHistory)
        .set({
          status: 'failed',
          syncCompletedAt: getCurrentTimestamp(),
          errorMessage: error instanceof Error ? error.message : 'Transaction sync failed',
        })
        .where(eq(transactionSyncHistory.id, syncId))
        .run();

      await this.db
        .update(bankConnections)
        .set({
          status: 'error',
          lastError: error instanceof Error ? error.message : 'Transaction sync failed',
          updatedAt: getCurrentTimestamp(),
        })
        .where(eq(bankConnections.id, connection.id))
        .run();

      throw error;
    }
  }

  private async ensureAccessToken(connection: BankConnectionRecord): Promise<string> {
    const expiresAt = connection.tokenExpiresAt instanceof Date
      ? connection.tokenExpiresAt
      : connection.tokenExpiresAt
        ? new Date(connection.tokenExpiresAt)
        : null;

    if (connection.accessToken && expiresAt && expiresAt.getTime() > Date.now() + 60_000) {
      return connection.accessToken;
    }

    if (!connection.refreshToken) {
      throw new Error('Missing refresh token for connection');
    }

    const refreshed = await this.trueLayer.refreshAccessToken(connection.refreshToken);
    const newAccessToken = refreshed.access_token;
    const newRefreshToken = refreshed.refresh_token ?? connection.refreshToken;
    const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000);
    const now = getCurrentTimestamp();

    await this.db
      .update(bankConnections)
      .set({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        tokenExpiresAt: newExpiry,
        updatedAt: now,
      })
      .where(eq(bankConnections.id, connection.id))
      .run();

    connection.accessToken = newAccessToken;
    connection.refreshToken = newRefreshToken;
    connection.tokenExpiresAt = newExpiry;

    return newAccessToken;
  }

  private async syncBankAccount(
    bankAccount: BankAccountRecord,
    account: AccountRecord,
    accessToken: string
  ): Promise<SyncTotals> {
    const now = new Date();
    const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const fromDate = bankAccount.syncFromDate instanceof Date
      ? bankAccount.syncFromDate
      : bankAccount.syncFromDate
        ? new Date(bankAccount.syncFromDate)
        : ninetyDaysAgo;

    const fromParam = this.formatDate(fromDate);
    const toParam = this.formatDate(now);

    const transactionsFromProvider = await this.trueLayer.getTransactions(
      accessToken,
      bankAccount.providerAccountId,
      fromParam,
      toParam
    );

    const balance = await this.trueLayer.getAccountBalance(accessToken, bankAccount.providerAccountId).catch(error => {
      console.warn('Failed to fetch account balance from TrueLayer:', error);
      return null;
    });

    const totals: SyncTotals = {
      fetched: transactionsFromProvider.length,
      imported: 0,
      skipped: 0,
      failed: 0,
      latestTransactionDate: null,
    };

    for (const tlTransaction of transactionsFromProvider) {
      try {
    const imported = await this.importTransaction(tlTransaction, account);
        if (imported) {
          totals.imported += 1;
          if (!totals.latestTransactionDate || imported > totals.latestTransactionDate) {
            totals.latestTransactionDate = imported;
          }
        } else {
          totals.skipped += 1;
        }
      } catch (error) {
        totals.failed += 1;
        console.error('Failed to import TrueLayer transaction:', error);
      }
    }

    const updatedAt = getCurrentTimestamp();

    if (totals.latestTransactionDate) {
      await this.db
        .update(bankAccounts)
        .set({
          syncFromDate: totals.latestTransactionDate,
          updatedAt,
        })
        .where(eq(bankAccounts.id, bankAccount.id))
        .run();
    } else {
      await this.db
        .update(bankAccounts)
        .set({
          updatedAt,
        })
        .where(eq(bankAccounts.id, bankAccount.id))
        .run();
    }

    if (balance) {
      await this.db
        .update(accounts)
        .set({
          balance: balance.current ?? balance.available ?? account.balance,
          currency: balance.currency ?? account.currency,
          updatedAt,
        })
        .where(eq(accounts.id, account.id))
        .run();
    } else {
      await this.db
        .update(accounts)
        .set({
          updatedAt,
        })
        .where(eq(accounts.id, account.id))
        .run();
    }

    return totals;
  }

  private async importTransaction(
    tlTransaction: TrueLayerTransaction,
    account: AccountRecord
  ): Promise<Date | null> {
    const providerId = tlTransaction.transaction_id;
    if (!providerId) {
      return null;
    }

    const existing = await this.db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.providerTransactionId, providerId),
          eq(transactions.tenantId, this.tenantId)
        )
      )
      .get();

    if (existing) {
      return null;
    }

    const description = tlTransaction.description || tlTransaction.merchant_name || 'Bank transaction';
    const dateString = tlTransaction.booking_date || tlTransaction.timestamp;
    const transactionDate = dateString ? new Date(dateString) : new Date();

    const isDebit = tlTransaction.transaction_type
      ? tlTransaction.transaction_type.toUpperCase() === 'DEBIT'
      : tlTransaction.amount < 0;
    const amount = Math.abs(tlTransaction.amount);
    const type: 'income' | 'expense' = isDebit ? 'expense' : 'income';

    const categoryId = await this.resolveCategoryId(description, type);
    const now = getCurrentTimestamp();

    await this.db
      .insert(transactions)
      .values({
        id: crypto.randomUUID(),
        tenantId: this.tenantId,
        accountId: account.id,
        categoryId,
        amount,
        description,
        date: transactionDate,
        type,
        notes: tlTransaction.merchant_name && tlTransaction.merchant_name !== description ? tlTransaction.merchant_name : null,
        providerTransactionId: providerId,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return transactionDate;
  }

  private async resolveCategoryId(description: string, type: 'income' | 'expense'): Promise<string> {
    if (!this.merchantPatterns) {
      this.merchantPatterns = await getMerchantPatterns(this.db, this.tenantId);
    }

    const categorization = await categorizeTransaction(
      this.db,
      this.tenantId,
      description,
      this.merchantPatterns
    );

    if (categorization.action === 'auto-assign' && categorization.suggestedCategoryId) {
      return categorization.suggestedCategoryId;
    }

    return type === 'income'
      ? await this.getIncomeFallbackCategory()
      : await this.getExpenseFallbackCategory();
  }

  private async getExpenseFallbackCategory(): Promise<string> {
    if (this.expenseFallbackCategoryId) {
      return this.expenseFallbackCategoryId;
    }

    const existing = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, this.tenantId),
          eq(categories.name, 'Uncategorized')
        )
      )
      .get();

    if (existing) {
      this.expenseFallbackCategoryId = existing.id;
      return existing.id;
    }

    const now = getCurrentTimestamp();
    const id = crypto.randomUUID();

    await this.db
      .insert(categories)
      .values({
        id,
        tenantId: this.tenantId,
        name: 'Uncategorized',
        type: 'expense',
        color: '#9E9E9E',
        icon: '❓',
        parentId: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    this.expenseFallbackCategoryId = id;
    return id;
  }

  private async getIncomeFallbackCategory(): Promise<string> {
    if (this.incomeFallbackCategoryId) {
      return this.incomeFallbackCategoryId;
    }

    const existing = await this.db
      .select({ id: categories.id })
      .from(categories)
      .where(
        and(
          eq(categories.tenantId, this.tenantId),
          eq(categories.type, 'income')
        )
      )
      .orderBy(categories.createdAt)
      .get();

    if (existing) {
      this.incomeFallbackCategoryId = existing.id;
      return existing.id;
    }

    const now = getCurrentTimestamp();
    const id = crypto.randomUUID();

    await this.db
      .insert(categories)
      .values({
        id,
        tenantId: this.tenantId,
        name: 'General Income',
        type: 'income',
        color: '#4CAF50',
        icon: '💰',
        parentId: null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    this.incomeFallbackCategoryId = id;
    return id;
  }

  private formatDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
