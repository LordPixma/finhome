import { Hono } from 'hono';
import { eq, and, desc } from 'drizzle-orm';
import { getDb, accounts, categories, importLogs } from '../db';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { parseCSV, parseOFX, mapCSVToTransactions, mapOFXToTransactions, parsePDF, parseXML, parseJSON, parseXLS, parseMT940 } from '../utils/fileParser';
import { getCurrentTimestamp } from '../utils/timestamp';
import { persistTransactionsFromImport } from '../services/importProcessor';
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

    const lowerCaseName = fileName.toLowerCase();
    let parsedTransactions: ParsedTransaction[] = [];
    let parseError: string | null = null;
    let fileContentForStorage: string | ArrayBuffer | null = null;

    try {
      if (lowerCaseName.endsWith('.pdf')) {
        if (c.env.FILES && c.env.BILL_REMINDERS) {
          const arrayBuffer = await file.arrayBuffer();
          const fileKey = `imports/${tenantId}/${accountId}/${logId}-${Date.now()}-${fileName}`;

          await c.env.FILES.put(fileKey, arrayBuffer, {
            httpMetadata: {
              contentType: file.type || 'application/pdf',
            },
            customMetadata: {
              tenantId,
              accountId,
              logId,
              uploadedAt: new Date().toISOString(),
              queued: 'true',
            },
          });

          await c.env.BILL_REMINDERS.send({
            type: 'pdf-import',
            tenantId,
            accountId,
            logId,
            fileKey,
            defaultCategoryId: categoryId,
            userId: user.id,
            fileName,
          });

          return c.json(
            {
              success: true,
              data: {
                logId,
                status: 'processing',
                queued: true,
                accountId,
                accountName: account.name,
              },
            },
            202
          );
        }

        const arrayBuffer = await file.arrayBuffer();
        fileContentForStorage = arrayBuffer;
        parsedTransactions = await parsePDF(arrayBuffer);

        if (parsedTransactions.length === 0) {
          parseError = 'PDF parsing is limited. Please export your bank statement as CSV, Excel, or another supported format for best results.';
        }
      } else {
        const content = await file.text();
        fileContentForStorage = content;

        if (lowerCaseName.endsWith('.csv')) {
          const { rows } = parseCSV(content);
          parsedTransactions = mapCSVToTransactions(rows);
        } else if (lowerCaseName.endsWith('.ofx') || lowerCaseName.endsWith('.qfx')) {
          const ofxTransactions = parseOFX(content);
          parsedTransactions = mapOFXToTransactions(ofxTransactions);
        } else if (lowerCaseName.endsWith('.json')) {
          parsedTransactions = parseJSON(content);
        } else if (lowerCaseName.endsWith('.xml')) {
          parsedTransactions = parseXML(content);
        } else if (lowerCaseName.endsWith('.txt') || lowerCaseName.endsWith('.mt940')) {
          parsedTransactions = parseMT940(content);
        } else if (lowerCaseName.endsWith('.xls') || lowerCaseName.endsWith('.xlsx')) {
          parsedTransactions = parseXLS(content);
        } else {
          parseError = 'Unsupported file format';
        }
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

    const persistenceResult = await persistTransactionsFromImport({
      db,
      tenantId,
      account,
      defaultCategoryId: categoryId!,
      parsedTransactions,
      logId,
      startedAt: startTime,
    });

    if (c.env.FILES && fileContentForStorage !== null) {
      const fileKey = `${tenantId}/${accountId}/${Date.now()}-${fileName}`;
      await c.env.FILES.put(fileKey, fileContentForStorage, {
        httpMetadata: {
          contentType: file.type || 'application/octet-stream',
        },
        customMetadata: {
          tenantId,
          accountId,
          logId,
          uploadedAt: new Date().toISOString(),
          transactionCount: persistenceResult.total.toString(),
        },
      });
    }

    return c.json({
      success: true,
      data: {
        logId,
        imported: persistenceResult.importedCount,
        skipped: persistenceResult.skippedCount,
        total: persistenceResult.total,
        accountId,
        accountName: persistenceResult.accountName,
        newBalance: persistenceResult.newBalance,
        transactions: persistenceResult.createdTransactions.slice(0, 10),
        errors: persistenceResult.errors.length > 0 ? persistenceResult.errors : undefined,
        processingTimeMs: persistenceResult.processingTimeMs,
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
