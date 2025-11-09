import { and, eq } from 'drizzle-orm';
import { accounts, categories, importLogs, transactions } from '../db';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { ParsedTransaction } from '../utils/fileParser';
import type { getDb } from '../db';

export interface ImportPersistenceParams {
  db: ReturnType<typeof getDb>;
  tenantId: string;
  account: typeof accounts.$inferSelect;
  defaultCategoryId: string;
  parsedTransactions: ParsedTransaction[];
  logId: string;
  startedAt: number;
}

export interface ImportPersistenceResult {
  finalStatus: 'success' | 'partial' | 'failed';
  importedCount: number;
  skippedCount: number;
  total: number;
  createdTransactions: typeof transactions.$inferSelect[];
  errors: string[];
  processingTimeMs: number;
  accountName: string;
  newBalance: number;
}

export async function persistTransactionsFromImport({
  db,
  tenantId,
  account,
  defaultCategoryId,
  parsedTransactions,
  logId,
  startedAt,
}: ImportPersistenceParams): Promise<ImportPersistenceResult> {
  const createdTransactions: typeof transactions.$inferSelect[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  const errors: string[] = [];

  const tenantCategories = await db
    .select()
    .from(categories)
    .where(eq(categories.tenantId, tenantId))
    .all();

  for (const parsed of parsedTransactions) {
    try {
      let categoryId = defaultCategoryId;

      if (parsed.category && parsed.category.trim() !== '') {
        const existingCategory = tenantCategories.find(
          cat => cat.name.toLowerCase() === parsed.category!.toLowerCase()
        );

        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          const now = getCurrentTimestamp();
          const newCategoryId = crypto.randomUUID();
          const randomColor = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`;

          await db
            .insert(categories)
            .values({
              id: newCategoryId,
              tenantId,
              name: parsed.category,
              type: parsed.type,
              color: randomColor,
              icon: null,
              parentId: null,
              createdAt: now,
              updatedAt: now,
            })
            .run();

          categoryId = newCategoryId;
          tenantCategories.push({
            id: newCategoryId,
            tenantId,
            name: parsed.category,
            type: parsed.type,
            color: randomColor,
            icon: null,
            parentId: null,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      const txnTimestamp = getCurrentTimestamp();
      const newTransaction = {
        id: crypto.randomUUID(),
        tenantId,
        accountId: account.id,
        categoryId,
        amount: parsed.amount,
        description: parsed.description,
        date: parsed.date,
        type: parsed.type,
        notes: parsed.notes ?? null,
        providerTransactionId: null,
        createdAt: txnTimestamp,
        updatedAt: txnTimestamp,
      };

      await db.insert(transactions).values(newTransaction).run();
      createdTransactions.push(newTransaction);
      importedCount++;

      const balanceDelta = parsed.type === 'income' ? parsed.amount : -parsed.amount;
      const nextBalance = (account.balance || 0) + balanceDelta;

      await db
        .update(accounts)
        .set({
          balance: nextBalance,
          updatedAt: getCurrentTimestamp(),
        })
        .where(and(eq(accounts.id, account.id), eq(accounts.tenantId, tenantId)))
        .run();

      account.balance = nextBalance;
    } catch (error) {
      console.error('Error importing transaction:', error);
      skippedCount++;
      errors.push(`Failed to import: ${parsed.description} - ${error instanceof Error ? error.message : error}`);
    }
  }

  const processingTimeMs = Date.now() - startedAt;
  const finalStatus: 'success' | 'partial' | 'failed' =
    skippedCount === 0 ? 'success' : importedCount > 0 ? 'partial' : 'failed';

  await db
    .update(importLogs)
    .set({
      status: finalStatus,
      transactionsImported: importedCount,
      transactionsFailed: skippedCount,
      transactionsTotal: parsedTransactions.length,
      errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
      errorMessage: errors.length > 0 ? `${skippedCount} transaction(s) failed` : null,
      completedAt: new Date(),
      processingTimeMs,
    })
    .where(eq(importLogs.id, logId))
    .run();

  return {
    finalStatus,
    importedCount,
    skippedCount,
    total: parsedTransactions.length,
    createdTransactions,
    errors,
    processingTimeMs,
    accountName: account.name,
    newBalance: account.balance || 0,
  };
}
