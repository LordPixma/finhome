import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { getDb } from '../db';
import { SubscriptionsService } from '../services/subscriptions.service';
import type { Env } from '../types';

const subscriptionsRouter = new Hono<Env>();

// Apply auth middleware to all routes
subscriptionsRouter.use('*', authMiddleware);

// Get detected subscriptions
subscriptionsRouter.get('/', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;

  try {
    const service = new SubscriptionsService(db);
    const result = await service.detectSubscriptions(tenantId);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error detecting subscriptions:', error);
    return c.json({
      success: false,
      error: { code: 'DETECTION_ERROR', message: 'Failed to detect subscriptions' },
    }, 500);
  }
});

// Get subscription summary
subscriptionsRouter.get('/summary', async (c) => {
  const db = getDb(c.env.DB);
  const tenantId = c.get('tenantId')!;

  try {
    const service = new SubscriptionsService(db);
    const result = await service.detectSubscriptions(tenantId);

    return c.json({
      success: true,
      data: {
        totalMonthly: result.totalMonthly,
        totalYearly: result.totalYearly,
        activeCount: result.activeCount,
      },
    });
  } catch (error) {
    console.error('Error fetching subscription summary:', error);
    return c.json({
      success: false,
      error: { code: 'SUMMARY_ERROR', message: 'Failed to fetch subscription summary' },
    }, 500);
  }
});

export default subscriptionsRouter;
