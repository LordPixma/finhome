import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth';
import { NotificationsService } from '../services/notifications.service';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

/**
 * Get notifications for the current user
 * GET /notifications
 * Query params: limit, offset, unreadOnly, type, category
 */
router.get('/', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const userId = c.get('userId')!;
    const query = c.req.query();

    const notifications = await NotificationsService.getNotifications(c, tenantId, userId, {
      limit: query.limit ? parseInt(query.limit) : 50,
      offset: query.offset ? parseInt(query.offset) : 0,
      unreadOnly: query.unreadOnly === 'true',
      type: query.type as any,
      category: query.category as any,
    });

    return c.json({ success: true, data: notifications });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' },
      },
      500
    );
  }
});

/**
 * Get unread notification count
 * GET /notifications/unread-count
 */
router.get('/unread-count', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const userId = c.get('userId')!;

    const count = await NotificationsService.getUnreadCount(c, tenantId, userId);

    return c.json({ success: true, data: { count } });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch unread count' },
      },
      500
    );
  }
});

/**
 * Mark a notification as read
 * PUT /notifications/:id/read
 */
router.put('/:id/read', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();

    await NotificationsService.markAsRead(c, id, tenantId);

    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark notification as read' },
      },
      500
    );
  }
});

/**
 * Mark all notifications as read
 * PUT /notifications/read-all
 */
router.put('/read-all', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const userId = c.get('userId')!;

    await NotificationsService.markAllAsRead(c, tenantId, userId);

    return c.json({ success: true, data: { message: 'All notifications marked as read' } });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to mark all notifications as read' },
      },
      500
    );
  }
});

/**
 * Dismiss a notification
 * DELETE /notifications/:id
 */
router.delete('/:id', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const { id } = c.req.param();

    await NotificationsService.dismissNotification(c, id, tenantId);

    return c.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error('Error dismissing notification:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to dismiss notification' },
      },
      500
    );
  }
});

/**
 * Get notification preferences
 * GET /notifications/preferences
 */
router.get('/preferences', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const userId = c.get('userId')!;

    const preferences = await NotificationsService.getPreferences(c, tenantId, userId);

    return c.json({ success: true, data: preferences });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notification preferences' },
      },
      500
    );
  }
});

/**
 * Update notification preferences
 * PUT /notifications/preferences
 */
router.put('/preferences', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;
    const userId = c.get('userId')!;
    const body = await c.req.json();

    const preferences = await NotificationsService.updatePreferences(c, tenantId, userId, body);

    return c.json({ success: true, data: preferences });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update notification preferences' },
      },
      500
    );
  }
});

/**
 * Trigger alert checks (admin/system use)
 * POST /notifications/check-alerts
 */
router.post('/check-alerts', async (c) => {
  try {
    const tenantId = c.get('tenantId')!;

    const results = await NotificationsService.runAllAlertChecks(c, tenantId);

    return c.json({
      success: true,
      data: {
        message: 'Alert checks completed',
        ...results,
        total: results.budgetAlerts + results.goalMilestones + results.unusualSpending + results.lowBalances
      }
    });
  } catch (error: any) {
    console.error('Error running alert checks:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to run alert checks' },
      },
      500
    );
  }
});

export default router;
