import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { getDb, auditLogs, importLogs } from '../db';
import type { AppContext } from '../types';

const router = new Hono<{ Bindings: any; Variables: any }>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

/**
 * GET /api/logs/audit
 * Get audit logs for the current tenant
 */
router.get('/audit', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant ID required' },
        },
        401
      );
    }

    // Parse query parameters
    const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

    // Fetch audit logs for this tenant
    const logs = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      success: true,
      data: logs,
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
 * GET /api/logs/import
 * Get import logs for the current tenant
 */
router.get('/import', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);
    const tenantId = c.get('tenantId');

    if (!tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant ID required' },
        },
        401
      );
    }

    // Parse query parameters
    const limit = Math.min(parseInt(c.req.query('limit') || '100', 10), 500);
    const offset = Math.max(parseInt(c.req.query('offset') || '0', 10), 0);

    // Fetch import logs for this tenant
    const logs = await db
      .select()
      .from(importLogs)
      .where(eq(importLogs.tenantId, tenantId))
      .orderBy(desc(importLogs.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      success: true,
      data: logs,
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

export default router;
