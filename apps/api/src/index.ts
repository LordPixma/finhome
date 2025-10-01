import { Hono } from 'hono';
import { corsMiddleware } from './middleware/cors';
import auth from './routes/auth';
import transactions from './routes/transactions';
import budgets from './routes/budgets';
import analytics from './routes/analytics';
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
app.route('/api/transactions', transactions);
app.route('/api/budgets', budgets);
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
export async function queue(batch: MessageBatch<any>): Promise<void> {
  for (const message of batch.messages) {
    try {
      const { billReminderId, tenantId } = message.body;
      console.log(`Processing bill reminder: ${billReminderId} for tenant: ${tenantId}`);
      // TODO: Implement bill reminder notification logic
      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      message.retry();
    }
  }
}

export default app;
