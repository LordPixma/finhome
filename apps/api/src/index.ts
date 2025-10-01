import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { corsMiddleware } from './middleware/cors';
import auth from './routes/auth';
import transactions from './routes/transactions';
import budgets from './routes/budgets';
import analytics from './routes/analytics';
import accounts from './routes/accounts';
import categories from './routes/categories';
import billRemindersRouter from './routes/billReminders';
import filesRouter from './routes/files';
import { getDb, billReminders } from './db';
import type { Env } from './types';

const app = new Hono<Env>();

// Apply CORS middleware
app.use('*', corsMiddleware);

// Health check
app.get('/', c => {
  return c.json({ status: 'ok', service: 'FamilyBudget API', version: '1.0.0' });
});

// Routes
app.route('/api/auth', auth);
app.route('/api/accounts', accounts);
app.route('/api/categories', categories);
app.route('/api/transactions', transactions);
app.route('/api/budgets', budgets);
app.route('/api/bill-reminders', billRemindersRouter);
app.route('/api/files', filesRouter);
app.route('/api/analytics', analytics);

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

// Queue consumer for bill reminders
export async function queue(batch: MessageBatch<any>, env: Env['Bindings']): Promise<void> {
  const db = getDb(env.DB);

  for (const message of batch.messages) {
    try {
      const { billReminderId, tenantId, dueDate } = message.body;
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

      // Send notification logic
      // In production, this would integrate with email service, push notifications, etc.
      console.log(`[NOTIFICATION] Bill Reminder for tenant ${tenantId}:`);
      console.log(`  - Name: ${billReminder.name}`);
      console.log(`  - Amount: $${billReminder.amount}`);
      console.log(`  - Due in: ${daysUntilDue} days`);
      console.log(`  - Due Date: ${dueDate}`);

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

export default app;
