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
import recurringTransactions from './routes/recurringTransactions';
import goals from './routes/goals';
import settings from './routes/settings';
import tenantMembers from './routes/tenantMembers';
import profile from './routes/profile';
import { getDb, billReminders, users, userSettings } from './db';
import { createEmailService } from './services/email';
import type { Env } from './types';
import type { MessageBatch } from '@cloudflare/workers-types';

const app = new Hono<Env>();

// Apply CORS middleware
app.use('*', corsMiddleware);

// Health check
app.get('/', c => {
  return c.json({ status: 'ok', service: 'Finhome360 API', version: '1.0.0' });
});

// Test MailChannels verification (temporary debugging endpoint)
app.get('/test-mailchannels', async c => {
  console.log('🔍 Starting MailChannels domain verification test...');
  
  const testPayload = {
    personalizations: [
      {
        to: [{ email: 'test@example.com' }],
      },
    ],
    from: {
      email: 'noreply@finhome360.com',
      name: 'Finhome360 Test',
    },
    subject: 'MailChannels Domain Verification Test',
    content: [
      {
        type: 'text/plain',
        value: 'This is a test to verify MailChannels domain configuration.',
      },
    ],
  };

  try {
    console.log('📤 Testing MailChannels API...');
    
    const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
    });

    console.log('📧 MailChannels test response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers),
    });

    const responseText = await response.text();
    console.log('📧 Response body:', responseText);

    return c.json({
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: responseText,
      headers: Object.fromEntries(response.headers),
    });
  } catch (error) {
    console.error('❌ MailChannels test exception:', error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
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
app.route('/api/recurring-transactions', recurringTransactions);
app.route('/api/goals', goals);
app.route('/api/settings', settings);
app.route('/api/tenant-members', tenantMembers);
app.route('/api/profile', profile);

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
  const emailService = createEmailService('noreply@finhome360.com', env.FRONTEND_URL || 'https://app.finhome360.com');

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
        .where(eq(userSettings.userId, tenantUsers[0]?.id || ''))
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

// Worker export with queue handler
export default {
  fetch: app.fetch,
  queue,
} as ExportedHandler<Env['Bindings']>;
