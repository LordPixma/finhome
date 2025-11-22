import { Hono } from 'hono';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { globalAdminMiddleware } from '../middleware/global-admin';
import { getDb, auditLogs } from '../db';
import type { AppContext } from '../types';

const router = new Hono<{ Bindings: any; Variables: any }>();

// Apply global admin middleware to all routes
router.use('/*', globalAdminMiddleware);

/**
 * GET /api/admin/audit-logs
 * Get audit logs with filtering and pagination
 * Only accessible by global admins
 */
router.get('/audit-logs', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);

    // Parse query parameters
    const limit = parseInt(c.req.query('limit') || '100', 10);
    const offset = parseInt(c.req.query('offset') || '0', 10);
    const tenantId = c.req.query('tenantId');
    const userId = c.req.query('userId');
    const action = c.req.query('action');
    const resource = c.req.query('resource');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const search = c.req.query('search'); // Search in userName, userEmail, endpoint

    // Enforce reasonable limits
    const safeLimit = Math.min(Math.max(1, limit), 1000);
    const safeOffset = Math.max(0, offset);

    // Build where clause
    const conditions: any[] = [];

    if (tenantId) {
      conditions.push(eq(auditLogs.tenantId, tenantId));
    }

    if (userId) {
      conditions.push(eq(auditLogs.userId, userId));
    }

    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }

    if (resource) {
      conditions.push(eq(auditLogs.resource, resource));
    }

    if (startDate) {
      const startTimestamp = new Date(startDate);
      conditions.push(gte(auditLogs.createdAt, startTimestamp));
    }

    if (endDate) {
      const endTimestamp = new Date(endDate);
      conditions.push(lte(auditLogs.createdAt, endTimestamp));
    }

    // Note: SQLite doesn't support LIKE with multiple columns easily
    // For search, we'll filter in memory for now (for small result sets)
    // In production, consider using a full-text search solution

    let query = db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(safeLimit)
      .offset(safeOffset);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    let logs = await query.all();

    // Apply search filter in memory if provided
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log =>
        log.userName?.toLowerCase().includes(searchLower) ||
        log.userEmail?.toLowerCase().includes(searchLower) ||
        log.endpoint?.toLowerCase().includes(searchLower)
      );
    }

    return c.json({
      success: true,
      data: {
        logs,
        pagination: {
          limit: safeLimit,
          offset: safeOffset,
          count: logs.length,
        },
      },
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit logs' },
      },
      500
    );
  }
});

/**
 * GET /api/admin/audit-logs/stats
 * Get audit log statistics
 * Only accessible by global admins
 */
router.get('/audit-logs/stats', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);

    // Get stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentLogs = await db
      .select()
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, thirtyDaysAgo))
      .all();

    // Calculate statistics
    const totalLogs = recentLogs.length;
    const uniqueUsers = new Set(recentLogs.map(log => log.userId)).size;
    const uniqueTenants = new Set(recentLogs.map(log => log.tenantId).filter(Boolean)).size;

    const actionCounts: Record<string, number> = {};
    const resourceCounts: Record<string, number> = {};
    const errorCount = recentLogs.filter(log => log.statusCode >= 400).length;

    recentLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      resourceCounts[log.resource] = (resourceCounts[log.resource] || 0) + 1;
    });

    return c.json({
      success: true,
      data: {
        totalLogs,
        uniqueUsers,
        uniqueTenants,
        errorCount,
        actionCounts,
        resourceCounts,
        period: '30 days',
      },
    });
  } catch (error) {
    console.error('Error fetching audit log stats:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch audit log stats' },
      },
      500
    );
  }
});

export default router;
