import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, transactions, accounts, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { CreateTransactionSchema } from '@finhome360/shared';
import { 
  categorizeTransaction, 
  categorizeBatch, 
  getMerchantPatterns,
  getCategorizationStats 
} from '../services/categorization';
import type { Env } from '../types';

const transactionsRouter = new Hono<Env>();

// Apply middleware
transactionsRouter.use('*', authMiddleware, tenantMiddleware);

// Get all transactions
transactionsRouter.get('/', async c => {
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const allTransactions = await db
    .select({
      id: transactions.id,
      tenantId: transactions.tenantId,
      accountId: transactions.accountId,
      categoryId: transactions.categoryId,
      amount: transactions.amount,
      description: transactions.description,
      date: transactions.date,
      type: transactions.type,
      notes: transactions.notes,
      createdAt: transactions.createdAt,
      updatedAt: transactions.updatedAt,
      account: {
        name: accounts.name,
        type: accounts.type,
      },
      category: {
        name: categories.name,
        icon: categories.icon,
        color: categories.color,
        type: categories.type,
      },
    })
    .from(transactions)
    .leftJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.tenantId, tenantId))
    .orderBy(desc(transactions.date))
    .all();

  return c.json({
    success: true,
    data: allTransactions,
  });
});

// Get categorization statistics
transactionsRouter.get('/categorization-stats', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const stats = await getCategorizationStats(db, tenantId);

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to get stats' },
      },
      500
    );
  }
});

// Get single transaction
transactionsRouter.get('/:id', async c => {
  const id = c.req.param('id');
  const tenantId = c.get('tenantId')!;
  const db = getDb(c.env.DB);

  const transaction = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
    .get();

  if (!transaction) {
    return c.json(
      { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
      404
    );
  }

  return c.json({
    success: true,
    data: transaction,
  });
});

// Create transaction
transactionsRouter.post('/', validateRequest(CreateTransactionSchema), async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const body = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Verify that the account exists and belongs to the tenant
    const account = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, body.accountId), eq(accounts.tenantId, tenantId)))
      .get();

    if (!account) {
      return c.json(
        { 
          success: false, 
          error: { code: 'INVALID_ACCOUNT', message: 'Account not found or does not belong to your organization' } 
        },
        400
      );
    }

    // Verify that the category exists and belongs to the tenant
    const category = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, body.categoryId), eq(categories.tenantId, tenantId)))
      .get();

    if (!category) {
      return c.json(
        { 
          success: false, 
          error: { code: 'INVALID_CATEGORY', message: 'Category not found or does not belong to your organization' } 
        },
        400
      );
    }

    // Ensure date is properly converted
    const date = new Date(body.date);
    if (isNaN(date.getTime())) {
      return c.json(
        { 
          success: false, 
          error: { code: 'INVALID_DATE', message: 'Invalid date format' } 
        },
        400
      );
    }

    const newTransaction = {
      id: crypto.randomUUID(),
      tenantId,
      accountId: body.accountId,
      categoryId: body.categoryId,
      amount: body.amount,
      description: body.description,
      date,
      type: body.type,
      notes: body.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(transactions).values(newTransaction).run();

    return c.json({
      success: true,
      data: newTransaction,
    }, 201);
  } catch (error) {
    console.error('Error creating transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to create transaction' },
      },
      500
    );
  }
});

// Update transaction
transactionsRouter.put('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const body = await c.req.json();
    const db = getDb(c.env.DB);

    // First check if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .get();

    if (!existingTransaction) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        404
      );
    }

    // Convert date if provided
    const updateData: any = { ...body, updatedAt: new Date() };
    if (body.date) {
      const date = new Date(body.date);
      if (isNaN(date.getTime())) {
        return c.json(
          { 
            success: false, 
            error: { code: 'INVALID_DATE', message: 'Invalid date format' } 
          },
          400
        );
      }
      updateData.date = date;
    }

    await db
      .update(transactions)
      .set(updateData)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: { id, ...updateData },
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update transaction' },
      },
      500
    );
  }
});

// Delete transaction
transactionsRouter.delete('/:id', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    // First check if transaction exists
    const existingTransaction = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .get();

    if (!existingTransaction) {
      return c.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Transaction not found' } },
        404
      );
    }

    await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .run();

    return c.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to delete transaction' },
      },
      500
    );
  }
});

// Auto-categorize a single transaction
transactionsRouter.post('/:id/auto-categorize', async c => {
  try {
    const id = c.req.param('id');
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    // Get the transaction
    const transaction = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
      .get();

    if (!transaction) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Transaction not found' },
        },
        404
      );
    }

    // Get categorization suggestion
    const merchantPatterns = await getMerchantPatterns(db, tenantId);
    const result = await categorizeTransaction(
      db,
      tenantId,
      transaction.description,
      merchantPatterns
    );

    // If confidence is high enough, auto-apply
    if (result.action === 'auto-assign' && result.suggestedCategoryId) {
      await db
        .update(transactions)
        .set({
          categoryId: result.suggestedCategoryId,
          updatedAt: new Date(),
        })
        .where(and(eq(transactions.id, id), eq(transactions.tenantId, tenantId)))
        .run();

      return c.json({
        success: true,
        data: {
          transactionId: id,
          applied: true,
          categoryId: result.suggestedCategoryId,
          categoryName: result.suggestedCategoryName,
          confidence: result.confidence,
          reasoning: result.reasoning,
        },
      });
    }

    // Otherwise, return suggestion
    return c.json({
      success: true,
      data: {
        transactionId: id,
        applied: false,
        suggestion: result,
      },
    });
  } catch (error) {
    console.error('Auto-categorize error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to categorize transaction' },
      },
      500
    );
  }
});

// Batch auto-categorize uncategorized transactions
transactionsRouter.post('/auto-categorize-batch', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    const { transactionIds, autoApply = false } = body;

    // Get uncategorized transactions
    let transactionsToProcess;
    
    if (transactionIds && Array.isArray(transactionIds)) {
      // Process specific transactions
      transactionsToProcess = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          categoryId: transactions.categoryId,
        })
        .from(transactions)
        .where(eq(transactions.tenantId, tenantId))
        .all();
      
      transactionsToProcess = transactionsToProcess.filter(t => 
        transactionIds.includes(t.id)
      );
    } else {
      // Process all uncategorized
      transactionsToProcess = await db
        .select({
          id: transactions.id,
          description: transactions.description,
          amount: transactions.amount,
          categoryId: transactions.categoryId,
        })
        .from(transactions)
        .where(eq(transactions.tenantId, tenantId))
        .all();
    }

    // Categorize batch
    const results = await categorizeBatch(
      db,
      tenantId,
      transactionsToProcess.map(t => ({
        id: t.id,
        description: t.description,
      }))
    );

    // Apply high-confidence suggestions if autoApply is true
    let appliedCount = 0;
    const suggestions: any[] = [];

    for (const [transactionId, result] of results.entries()) {
      if (autoApply && result.action === 'auto-assign' && result.suggestedCategoryId) {
        await db
          .update(transactions)
          .set({
            categoryId: result.suggestedCategoryId,
            updatedAt: new Date(),
          })
          .where(and(eq(transactions.id, transactionId), eq(transactions.tenantId, tenantId)))
          .run();
        
        appliedCount++;
      }

      suggestions.push({
        transactionId,
        ...result,
        applied: autoApply && result.action === 'auto-assign',
      });
    }

    return c.json({
      success: true,
      data: {
        processed: suggestions.length,
        applied: appliedCount,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Batch categorize error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to batch categorize' },
      },
      500
    );
  }
});

// Bulk delete selected transactions
transactionsRouter.delete('/bulk', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    
    if (!body.transactionIds || !Array.isArray(body.transactionIds)) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'transactionIds array is required' }
      }, 400);
    }

    if (body.transactionIds.length === 0) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one transaction ID is required' }
      }, 400);
    }

    // Delete transactions (with tenant isolation)
    let deletedCount = 0;
    for (const transactionId of body.transactionIds) {
      try {
        await db
          .delete(transactions)
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              eq(transactions.id, transactionId)
            )
          );
        deletedCount++;
      } catch (error) {
        console.error(`Failed to delete transaction ${transactionId}:`, error);
      }
    }

    return c.json({
      success: true,
      data: { 
        message: `Successfully deleted ${deletedCount} transaction${deletedCount !== 1 ? 's' : ''}`,
        deletedCount 
      }
    });
  } catch (error: any) {
    console.error('Bulk delete error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete transactions' }
    }, 500);
  }
});

// Clear all transactions (with confirmation)
transactionsRouter.delete('/clear', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    
    // Require explicit confirmation
    if (body.confirm !== 'DELETE_ALL_TRANSACTIONS') {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Confirmation required. Send { "confirm": "DELETE_ALL_TRANSACTIONS" }' }
      }, 400);
    }

    // Get count before deletion for reporting
    const existingTransactions = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId))
      .all();

    const totalCount = existingTransactions.length;

    // Delete all transactions for the tenant
    await db
      .delete(transactions)
      .where(eq(transactions.tenantId, tenantId));

    return c.json({
      success: true,
      data: { 
        message: `Successfully cleared all transactions`,
        deletedCount: totalCount
      }
    });
  } catch (error: any) {
    console.error('Clear all transactions error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to clear transactions' }
    }, 500);
  }
});

// Bulk archive selected transactions
transactionsRouter.patch('/bulk/archive', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);
    const body = await c.req.json();
    
    if (!body.transactionIds || !Array.isArray(body.transactionIds)) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'transactionIds array is required' }
      }, 400);
    }

    if (body.transactionIds.length === 0) {
      return c.json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'At least one transaction ID is required' }
      }, 400);
    }

    // Archive transactions by adding archived note
    let archivedCount = 0;
    for (const transactionId of body.transactionIds) {
      try {
        await db
          .update(transactions)
          .set({
            notes: 'ARCHIVED',
            updatedAt: new Date()
          })
          .where(
            and(
              eq(transactions.tenantId, tenantId),
              eq(transactions.id, transactionId)
            )
          );
        archivedCount++;
      } catch (error) {
        console.error(`Failed to archive transaction ${transactionId}:`, error);
      }
    }

    return c.json({
      success: true,
      data: { 
        message: `Successfully archived ${archivedCount} transaction${archivedCount !== 1 ? 's' : ''}`,
        archivedCount 
      }
    });
  } catch (error: any) {
    console.error('Bulk archive error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to archive transactions' }
    }, 500);
  }
});

export default transactionsRouter;
