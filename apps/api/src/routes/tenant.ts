import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { getDb, tenants } from '../db';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware);

// Get current user's tenant information
router.get('/info', async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'User not found' } },
        401
      );
    }

    if (!user.tenantId) {
      return c.json(
        { success: false, error: { code: 'INVALID_TENANT_ID', message: 'Tenant ID is missing' } },
        400
      );
    }

    const db = getDb(c.env.DB);
    const tenant = await db
      .select({
        id: tenants.id,
        name: tenants.name,
        subdomain: tenants.subdomain,
      })
      .from(tenants)
      .where(eq(tenants.id, user.tenantId))
      .get();

    if (!tenant) {
      return c.json(
        { success: false, error: { code: 'TENANT_NOT_FOUND', message: 'Tenant not found' } },
        404
      );
    }

    return c.json({
      success: true,
      data: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
      },
    });
  } catch (error) {
    console.error('Error getting tenant info:', error);
    return c.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to get tenant information' } },
      500
    );
  }
});

export default router;