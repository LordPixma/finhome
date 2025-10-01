import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { getDb, transactions, accounts, categories } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { parseCSV, parseOFX, mapCSVToTransactions, mapOFXToTransactions } from '../utils/fileParser';
import type { Env } from '../types';
import type { ParsedTransaction } from '../utils/fileParser';

const filesRouter = new Hono<Env>();

// Apply middleware
filesRouter.use('*', authMiddleware, tenantMiddleware);

// Upload and parse bank statement (CSV or OFX)
filesRouter.post('/upload', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const formData = await c.req.formData();
    
    const fileEntry = formData.get('file');
    const accountId = formData.get('accountId') as string;
    const defaultCategoryId = formData.get('defaultCategoryId') as string;

    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'No file provided or invalid file' },
        },
        400
      );
    }

    const file = fileEntry as File;

    if (!accountId) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Account ID is required' },
        },
        400
      );
    }

    const db = getDb(c.env.DB);

    // Verify account belongs to tenant
    const account = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
      .get();

    if (!account) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Account not found' },
        },
        404
      );
    }

    // Get or create default category
    let categoryId = defaultCategoryId;
    if (!categoryId) {
      // Try to find an "Uncategorized" category
      const uncategorized = await db
        .select()
        .from(categories)
        .where(and(eq(categories.tenantId, tenantId), eq(categories.name, 'Uncategorized')))
        .get();

      if (uncategorized) {
        categoryId = uncategorized.id;
      } else {
        // Create default category
        categoryId = crypto.randomUUID();
        await db
          .insert(categories)
          .values({
            id: categoryId,
            tenantId,
            name: 'Uncategorized',
            type: 'expense',
            color: '#999999',
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .run();
      }
    }

    // Read file content
    const content = await file.text();
    const fileName = file.name.toLowerCase();
    
    let parsedTransactions: ParsedTransaction[] = [];

    // Parse based on file type
    if (fileName.endsWith('.csv')) {
      const { rows } = parseCSV(content);
      parsedTransactions = mapCSVToTransactions(rows);
    } else if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
      const ofxTransactions = parseOFX(content);
      parsedTransactions = mapOFXToTransactions(ofxTransactions);
    } else {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: 'Only CSV, OFX, and QFX files are supported',
          },
        },
        400
      );
    }

    if (parsedTransactions.length === 0) {
      return c.json(
        {
          success: false,
          error: {
            code: 'EMPTY_FILE',
            message: 'No transactions found in file',
          },
        },
        400
      );
    }

    // Store file in R2 (optional, for record keeping)
    if (c.env.FILES) {
      const fileKey = `${tenantId}/${accountId}/${Date.now()}-${file.name}`;
      await c.env.FILES.put(fileKey, content, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          tenantId,
          accountId,
          uploadedAt: new Date().toISOString(),
          transactionCount: parsedTransactions.length.toString(),
        },
      });
    }

    // Create transactions in database
    const createdTransactions = [];
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (const parsed of parsedTransactions) {
      try {
        const newTransaction = {
          id: crypto.randomUUID(),
          tenantId,
          accountId,
          categoryId,
          amount: parsed.amount,
          description: parsed.description,
          date: parsed.date,
          type: parsed.type,
          notes: parsed.notes,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await db.insert(transactions).values(newTransaction).run();
        createdTransactions.push(newTransaction);
        importedCount++;

        // Update account balance
        const balanceChange = parsed.type === 'income' ? parsed.amount : -parsed.amount;
        await db
          .update(accounts)
          .set({
            balance: account.balance + balanceChange,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, accountId))
          .run();
        
        account.balance += balanceChange; // Update local reference
      } catch (error) {
        console.error('Error importing transaction:', error);
        skippedCount++;
        errors.push(`Failed to import: ${parsed.description} - ${error}`);
      }
    }

    return c.json({
      success: true,
      data: {
        imported: importedCount,
        skipped: skippedCount,
        total: parsedTransactions.length,
        accountId,
        accountName: account.name,
        newBalance: account.balance,
        transactions: createdTransactions.slice(0, 10), // Return first 10 as sample
        errors: errors.length > 0 ? errors : undefined,
      },
    });
  } catch (error) {
    console.error('File upload error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to process file upload',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      500
    );
  }
});

// Get upload history (list files from R2)
filesRouter.get('/uploads', async c => {
  try {
    const tenantId = c.get('tenantId')!;

    if (!c.env.FILES) {
      return c.json({
        success: true,
        data: [],
      });
    }

    const list = await c.env.FILES.list({
      prefix: `${tenantId}/`,
    });

    const uploads = list.objects.map(obj => ({
      key: obj.key,
      uploaded: obj.uploaded,
      size: obj.size,
      metadata: obj.customMetadata,
    }));

    return c.json({
      success: true,
      data: uploads,
    });
  } catch (error) {
    console.error('Error fetching uploads:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch upload history' },
      },
      500
    );
  }
});

export default filesRouter;
