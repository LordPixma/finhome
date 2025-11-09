import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, transactions, accounts, categories, importLogs } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { parseCSV, parseOFX, mapCSVToTransactions, mapOFXToTransactions, parsePDF, parseXML, parseJSON, parseXLS, parseMT940 } from '../utils/fileParser';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { Env } from '../types';
import type { ParsedTransaction } from '../utils/fileParser';

const filesRouter = new Hono<Env>();

// Apply middleware
filesRouter.use('*', authMiddleware, tenantMiddleware);

// Upload and parse bank statement (supports multiple files)
filesRouter.post('/upload', async c => {
  const startTime = Date.now();
  
  try {
    const tenantId = c.get('tenantId')!;
    const user = c.get('user')!;
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
    const fileName = file.name;
    const fileSize = file.size;
    const fileType = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

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

    // Create import log entry (initial status: processing)
    const logId = crypto.randomUUID();
    const logCreatedAt = new Date();
    
    await db
      .insert(importLogs)
      .values({
        id: logId,
        tenantId,
        userId: user.id,
        accountId,
        fileName,
        fileSize,
        fileType,
        status: 'processing',
        transactionsImported: 0,
        transactionsFailed: 0,
        transactionsTotal: 0,
        createdAt: logCreatedAt,
      })
      .run();

    // Verify account belongs to tenant
    const account = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)))
      .get();

    if (!account) {
      // Update log with failure
      await db
        .update(importLogs)
        .set({
          status: 'failed',
          errorMessage: 'Account not found',
          completedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
        })
        .where(eq(importLogs.id, logId))
        .run();
      
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
        const now = getCurrentTimestamp();
        categoryId = crypto.randomUUID();
        await db
          .insert(categories)
          .values({
            id: categoryId,
            tenantId,
            name: 'Uncategorized',
            type: 'expense',
            color: '#999999',
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }
    }

    // Read file content
    const content = await file.text();
    
    let parsedTransactions: ParsedTransaction[] = [];
    let parseError: string | null = null;

    // Parse based on file type
    try {
      if (fileName.endsWith('.csv')) {
        const { rows } = parseCSV(content);
        parsedTransactions = mapCSVToTransactions(rows);
      } else if (fileName.endsWith('.ofx') || fileName.endsWith('.qfx')) {
        const ofxTransactions = parseOFX(content);
        parsedTransactions = mapOFXToTransactions(ofxTransactions);
      } else if (fileName.endsWith('.json')) {
        parsedTransactions = parseJSON(content);
      } else if (fileName.endsWith('.xml')) {
        parsedTransactions = parseXML(content);
      } else if (fileName.endsWith('.txt') || fileName.endsWith('.mt940')) {
        parsedTransactions = parseMT940(content);
      } else if (fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
        parsedTransactions = parseXLS(content);
      } else if (fileName.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        parsedTransactions = parsePDF(arrayBuffer);
        
        if (parsedTransactions.length === 0) {
          parseError = 'PDF parsing is limited. Please export your bank statement as CSV, Excel, or another supported format for best results.';
        }
      } else {
        parseError = 'Unsupported file format';
      }
    } catch (err: any) {
      parseError = `Failed to parse file: ${err.message}`;
    }

    if (parseError || parsedTransactions.length === 0) {
      await db
        .update(importLogs)
        .set({
          status: 'failed',
          errorMessage: parseError || 'No transactions found in file',
          completedAt: new Date(),
          processingTimeMs: Date.now() - startTime,
        })
        .where(eq(importLogs.id, logId))
        .run();
      
      return c.json(
        {
          success: false,
          error: {
            code: parseError ? 'PARSE_ERROR' : 'EMPTY_FILE',
            message: parseError || 'No transactions found in file',
          },
        },
        400
      );
    }

    // Update log with total count
    await db
      .update(importLogs)
      .set({
        transactionsTotal: parsedTransactions.length,
      })
      .where(eq(importLogs.id, logId))
      .run();

    // Store file in R2 (optional, for record keeping)
    if (c.env.FILES) {
      const fileKey = `${tenantId}/${accountId}/${Date.now()}-${fileName}`;
      await c.env.FILES.put(fileKey, content, {
        httpMetadata: {
          contentType: file.type,
        },
        customMetadata: {
          tenantId,
          accountId,
          logId,
          uploadedAt: new Date().toISOString(),
          transactionCount: parsedTransactions.length.toString(),
        },
      });
    }

    // Create transactions in database
    const createdTransactions: any[] = [];
    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    // Get all categories for this tenant for matching
    const tenantCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.tenantId, tenantId))
      .all();

    for (const parsed of parsedTransactions) {
      try {
        // Try to match category by name if provided in CSV
        let transactionCategoryId = categoryId; // Default to uncategorized
        
        if (parsed.category && parsed.category.trim() !== '') {
          const matchedCategory = tenantCategories.find(
            cat => cat.name.toLowerCase() === parsed.category!.toLowerCase()
          );
          
          if (matchedCategory) {
            transactionCategoryId = matchedCategory.id;
          } else {
            // Create new category if it doesn't exist
            const now = getCurrentTimestamp();
            const newCategoryId = crypto.randomUUID();
            await db
              .insert(categories)
              .values({
                id: newCategoryId,
                tenantId,
                name: parsed.category,
                type: parsed.type,
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`, // Random color
                icon: null,
                parentId: null,
                createdAt: now,
                updatedAt: now,
              })
              .run();
            
            transactionCategoryId = newCategoryId;
            tenantCategories.push({
              id: newCategoryId,
              tenantId,
              name: parsed.category,
              type: parsed.type,
              color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
              icon: null,
              parentId: null,
              createdAt: now,
              updatedAt: now,
            });
          }
        }

        const txnNow = getCurrentTimestamp();
        const newTransaction = {
          id: crypto.randomUUID(),
          tenantId,
          accountId,
          categoryId: transactionCategoryId,
          amount: parsed.amount,
          description: parsed.description,
          date: parsed.date,
          type: parsed.type,
          notes: parsed.notes,
          createdAt: txnNow,
          updatedAt: txnNow,
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

    // Update import log with final results
    const processingTime = Date.now() - startTime;
    const finalStatus = skippedCount === 0 ? 'success' : (importedCount > 0 ? 'partial' : 'failed');
    
    await db
      .update(importLogs)
      .set({
        status: finalStatus,
        transactionsImported: importedCount,
        transactionsFailed: skippedCount,
        errorDetails: errors.length > 0 ? JSON.stringify(errors) : null,
        errorMessage: errors.length > 0 ? `${skippedCount} transaction(s) failed` : null,
        completedAt: new Date(),
        processingTimeMs: processingTime,
      })
      .where(eq(importLogs.id, logId))
      .run();

    return c.json({
      success: true,
      data: {
        logId,
        imported: importedCount,
        skipped: skippedCount,
        total: parsedTransactions.length,
        accountId,
        accountName: account.name,
        newBalance: account.balance,
        transactions: createdTransactions.slice(0, 10), // Return first 10 as sample
        errors: errors.length > 0 ? errors : undefined,
        processingTimeMs: processingTime,
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

// Get import logs for tenant
filesRouter.get('/logs', async c => {
  try {
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const logs = await db
      .select()
      .from(importLogs)
      .where(eq(importLogs.tenantId, tenantId))
      .orderBy(desc(importLogs.createdAt))
      .limit(100)
      .all();

    return c.json({
      success: true,
      data: logs.map(log => ({
        ...log,
        errorDetails: log.errorDetails ? JSON.parse(log.errorDetails) : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching import logs:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch import logs' },
      },
      500
    );
  }
});

// Get single import log details
filesRouter.get('/logs/:id', async c => {
  try {
    const { id } = c.req.param();
    const tenantId = c.get('tenantId')!;
    const db = getDb(c.env.DB);

    const log = await db
      .select()
      .from(importLogs)
      .where(and(eq(importLogs.id, id), eq(importLogs.tenantId, tenantId)))
      .get();

    if (!log) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Import log not found' },
        },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        ...log,
        errorDetails: log.errorDetails ? JSON.parse(log.errorDetails) : null,
      },
    });
  } catch (error) {
    console.error('Error fetching import log:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch import log' },
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
