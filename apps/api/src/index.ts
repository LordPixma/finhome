import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { corsMiddleware } from './middleware/cors';
import auth, { password as passwordRoutes } from './routes/auth';
import transactions from './routes/transactions';
import budgets from './routes/budgets';
import analytics from './routes/analytics';
import accounts from './routes/accounts';
import categories from './routes/categories';
import billRemindersRouter from './routes/billReminders';
import filesRouter from './routes/files';
import recurringTransactions from './routes/recurringTransactions';
import goals from './routes/goals';
import settings from './routes/settings';
import tenantMembers from './routes/tenantMembers';
import profile from './routes/profile';
import tenant from './routes/tenant';
import aiRouter from './routes/ai';
import globalAdmin from './routes/global-admin';
import pdfRouter from './routes/pdf';
import { mfaRouter } from './routes/admin-mfa';
import { adminAnalyticsRouter } from './routes/admin-analytics';
import { adminTenantRouter } from './routes/admin-tenants';
import adminSecurity from './routes/admin-security';
import adminUsers from './routes/admin-users';
import adminMetrics from './routes/admin-metrics';
import { getDb, billReminders, users, userSettings, accounts as accountsTable, importLogs as importLogsTable } from './db';
import { createEmailService } from './services/email';
import { parsePDF } from './utils/fileParser';
import { persistTransactionsFromImport } from './services/importProcessor';
import type { Env } from './types';
// Note: Avoid direct dependency on '@cloudflare/workers-types' here for portability

const app = new Hono<Env>();

// Apply CORS middleware
app.use('*', corsMiddleware);

// Health check
app.get('/', c => {
  return c.json({ status: 'ok', service: 'Finhome360 API', version: '1.0.0' });
});

// TEMPORARY: Global admin database fix endpoint
app.post('/api/fix-global-admin-database', async (c) => {
  try {
    const { secretKey } = await c.req.json();
    
    if (secretKey !== 'fix-global-admin-2025') {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid secret key' },
        },
        401
      );
    }

    const db = getDb(c.env.DB);

    // Find the admin user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@finhome360.com'))
      .get();

    if (!user) {
      return c.json(
        {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Admin user not found' },
        },
        404
      );
    }

    // Update the user to be a global admin with null tenant
    await db
      .update(users)
      .set({
        isGlobalAdmin: true,
        tenantId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, 'admin@finhome360.com'))
      .run();

    return c.json({
      success: true,
      data: {
        message: 'Global admin user fixed successfully',
        before: {
          id: user.id,
          email: user.email,
          name: user.name,
          wasGlobalAdmin: user.isGlobalAdmin,
          wasTenantId: user.tenantId,
        },
        after: {
          isGlobalAdmin: true,
          tenantId: null,
        },
      },
    });
  } catch (error) {
    console.error('Fix global admin error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fix global admin' },
      },
      500
    );
  }
});

// Routes
app.route('/api/auth', auth);
app.route('/api/auth', passwordRoutes);
app.route('/api/accounts', accounts);
app.route('/api/categories', categories);
app.route('/api/transactions', transactions);
app.route('/api/budgets', budgets);
app.route('/api/bill-reminders', billRemindersRouter);
app.route('/api/files', filesRouter);
app.route('/api/analytics', analytics);
app.route('/api/recurring-transactions', recurringTransactions);
app.route('/api/goals', goals);
app.route('/api/settings', settings);
app.route('/api/tenant-members', tenantMembers);
app.route('/api/profile', profile);
app.route('/api/tenant', tenant);
app.route('/api/ai', aiRouter);
app.route('/api/pdf', pdfRouter);

app.route('/api/global-admin', globalAdmin);
app.route('/api/admin/mfa', mfaRouter);
app.route('/api/admin/analytics', adminAnalyticsRouter);
app.route('/api/admin/tenants', adminTenantRouter);
app.route('/api/admin/security', adminSecurity);
app.route('/api/admin', adminUsers);
app.route('/api/admin/metrics', adminMetrics);

// 404 handler
app.notFound(c => {
  return c.json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: c.env.ENVIRONMENT === 'development' ? err.message : 'Internal server error',
      },
    },
    500
  );
});

// Queue consumer for bill reminders and transaction sync
export async function queue(batch: any, env: Env['Bindings']): Promise<void> {
  const db = getDb(env.DB);
  const emailService = createEmailService('noreply@finhome360.com', env.FRONTEND_URL || 'https://app.finhome360.com');

  for (const message of batch.messages) {
    try {
      const body = message.body || {};
      const messageType = body.type ?? 'bill-reminder';

      if (messageType === 'pdf-import') {
        if (!env.FILES) {
          console.error('FILES binding missing for PDF import job');
          message.retry();
          continue;
        }

        const { tenantId, accountId, logId, fileKey, defaultCategoryId, templateId } = body;

        if (!tenantId || !accountId || !logId || !fileKey || !defaultCategoryId) {
          console.error('Invalid PDF import message payload', body);
          message.ack();
          continue;
        }

        const account = await db
          .select()
          .from(accountsTable)
          .where(and(eq(accountsTable.id, accountId), eq(accountsTable.tenantId, tenantId)))
          .get();

        if (!account) {
          await db
            .update(importLogsTable)
            .set({
              status: 'failed',
              errorMessage: 'Account not found for PDF import',
              completedAt: new Date(),
              processingTimeMs: 0,
            })
            .where(eq(importLogsTable.id, logId))
            .run();

          message.ack();
          continue;
        }

        const storedFile = await env.FILES.get(fileKey);
        if (!storedFile) {
          await db
            .update(importLogsTable)
            .set({
              status: 'failed',
              errorMessage: 'PDF file missing from storage',
              completedAt: new Date(),
              processingTimeMs: 0,
            })
            .where(eq(importLogsTable.id, logId))
            .run();

          message.ack();
          continue;
        }

        const startedAt = Date.now();

        try {
          const arrayBuffer = await storedFile.arrayBuffer();
          const parsedTransactions = await parsePDF(arrayBuffer, { templateId });

          if (parsedTransactions.length === 0) {
            await db
              .update(importLogsTable)
              .set({
                status: 'failed',
                errorMessage: 'No transactions detected in PDF',
                completedAt: new Date(),
                processingTimeMs: Date.now() - startedAt,
              })
              .where(eq(importLogsTable.id, logId))
              .run();

            message.ack();
            continue;
          }

          await persistTransactionsFromImport({
            db,
            tenantId,
            account,
            defaultCategoryId,
            parsedTransactions,
            logId,
            startedAt,
          });

          console.log(`PDF import completed for log ${logId} (records: ${parsedTransactions.length})`);
          message.ack();
        } catch (error) {
          console.error('Error processing PDF import message:', error);
          await db
            .update(importLogsTable)
            .set({
              status: 'failed',
              errorMessage: error instanceof Error ? error.message : 'Unknown PDF processing error',
              completedAt: new Date(),
              processingTimeMs: Date.now() - startedAt,
            })
            .where(eq(importLogsTable.id, logId))
            .run();

          message.ack();
        }

        continue;
      }

      // Handle bill reminder messages (default)
      const { billReminderId, tenantId, dueDate } = body;
      console.log(`Processing bill reminder: ${billReminderId} for tenant: ${tenantId}`);

      // Fetch bill reminder details
      const billReminder = await db
        .select()
        .from(billReminders)
        .where(and(eq(billReminders.id, billReminderId), eq(billReminders.tenantId, tenantId)))
        .get();

      if (!billReminder) {
        console.error(`Bill reminder ${billReminderId} not found`);
        message.ack(); // Acknowledge to avoid reprocessing
        continue;
      }

      // Check if bill is still pending
      if (billReminder.status !== 'pending') {
        console.log(`Bill reminder ${billReminderId} is ${billReminder.status}, skipping`);
        message.ack();
        continue;
      }

      // Calculate days until due
      const daysUntilDue = Math.ceil((new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

      // Fetch all active users in the tenant to send emails
      const tenantUsers = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
        })
        .from(users)
        .where(eq(users.tenantId, tenantId))
        .all();

      // Get tenant user's currency preference
      const userSettingsData = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.tenantUserId, tenantUsers[0]?.id || ''))
        .get();

      const currencySymbol = userSettingsData?.currencySymbol || '£';

      // Send email to all tenant users
      for (const user of tenantUsers) {
        try {
          await emailService.sendBillReminderEmail(user.email, {
            userName: user.name,
            billName: billReminder.name,
            amount: billReminder.amount,
            currency: currencySymbol,
            dueDate: new Date(dueDate).toLocaleDateString('en-GB'),
            daysUntilDue,
            loginUrl: env.FRONTEND_URL || 'https://app.finhome360.com',
          });
          console.log(`Email sent to ${user.email} for bill reminder ${billReminderId}`);
        } catch (emailError) {
          console.error(`Failed to send email to ${user.email}:`, emailError);
          // Continue processing other users even if one email fails
        }
      }

      // Store notification in KV for retrieval (simple notification store)
      if (env.CACHE) {
        const notificationKey = `notification:${tenantId}:${billReminderId}`;
        const notification = {
          type: 'bill_reminder',
          billReminderId: billReminder.id,
          name: billReminder.name,
          amount: billReminder.amount,
          dueDate,
          daysUntilDue,
          createdAt: new Date().toISOString(),
        };
        await env.CACHE.put(notificationKey, JSON.stringify(notification), {
          expirationTtl: 60 * 60 * 24 * 7, // Keep for 7 days
        });
      }

      // If bill is overdue, update status
      if (daysUntilDue < 0) {
        await db
          .update(billReminders)
          .set({ status: 'overdue', updatedAt: new Date() })
          .where(eq(billReminders.id, billReminderId))
          .run();
      }

      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      message.retry();
    }
  }
}

// Scheduled handler (cron) for periodic transaction sync
export async function scheduled(_event: any, _env: Env['Bindings'], _ctx: any): Promise<void> {
  // No-op (bank connection sync disabled in Bankless edition)
  console.log('Scheduled handler running (no scheduled banking tasks in Bankless edition)');
}

// Worker export with queue and scheduled handlers
export default {
  fetch: app.fetch,
  queue,
  scheduled,
};
