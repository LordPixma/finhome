import { Hono } from 'hono';
import { eq, desc } from 'drizzle-orm';
import { getDb, tenants, users, globalAdminActions, globalAdminSettings } from '../db';
import { globalAdminMiddleware, logGlobalAdminAction } from '../middleware/global-admin';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { AppContext } from '../types';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

const app = new Hono<{ Bindings: any; Variables: any }>();

/**
 * POST /api/global-admin/create-first-admin
 * Create the first global admin user (no auth required)
 */
app.post('/create-first-admin', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);
    const { email, name, password } = await c.req.json();

    // Check if any global admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.isGlobalAdmin, true))
      .get();

    if (existingAdmin) {
      return c.json(
        {
          success: false,
          error: {
            code: 'ADMIN_EXISTS',
            message: 'A global admin already exists',
          },
        },
        400
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();

    const now = getCurrentTimestamp();

    // Create global admin user (no tenant_id)
    await db.insert(users).values({
      id: userId,
      tenantId: null, // Global admin has no tenant
      email,
      name,
      passwordHash,
      role: 'admin',
      isGlobalAdmin: true,
      createdAt: now,
      updatedAt: now,
    });

    return c.json({
      success: true,
      data: {
        message: 'First global admin created successfully',
        user: {
          id: userId,
          email,
          name,
          isGlobalAdmin: true,
        },
      },
    });
  } catch (error) {
    console.error('Create first global admin error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to create global admin',
        },
      },
      500
    );
  }
});

// Apply global admin middleware to all routes except create-first-admin
app.use('/stats', globalAdminMiddleware);
app.use('/tenants', globalAdminMiddleware);
app.use('/tenants/*', globalAdminMiddleware);
app.use('/users/*', globalAdminMiddleware);
app.use('/audit-log', globalAdminMiddleware);
app.use('/settings', globalAdminMiddleware);
app.use('/settings/*', globalAdminMiddleware);

/**
 * GET /api/global-admin/stats
 * Get platform statistics
 */
app.get('/stats', async (c: AppContext) => {
  try {
    const rawDb = c.env.DB; // Access raw D1 database

    // Get counts using raw D1 queries
    const totalTenants = await rawDb.prepare('SELECT COUNT(*) as count FROM tenants').first();
    const totalUsers = await rawDb.prepare('SELECT COUNT(*) as count FROM users').first();
    const totalGlobalAdmins = await rawDb.prepare('SELECT COUNT(*) as count FROM users WHERE is_global_admin = 1').first();
    
    const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);
    const recentTenants = await rawDb.prepare('SELECT COUNT(*) as count FROM tenants WHERE created_at > ?').bind(thirtyDaysAgo).first();
    const recentUsers = await rawDb.prepare('SELECT COUNT(*) as count FROM users WHERE created_at > ?').bind(thirtyDaysAgo).first();

    await logGlobalAdminAction(c, 'view_stats', 'system');

    return c.json({
      success: true,
      data: {
        totalTenants: (totalTenants as any)?.count || 0,
        totalUsers: (totalUsers as any)?.count || 0,
        totalGlobalAdmins: (totalGlobalAdmins as any)?.count || 0,
        recentTenants: (recentTenants as any)?.count || 0,
        recentUsers: (recentUsers as any)?.count || 0,
      },
    });
  } catch (error) {
    console.error('Global admin stats error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch statistics',
        },
      },
      500
    );
  }
});

/**
 * GET /api/global-admin/tenants
 * List all tenants with pagination
 */
app.get('/tenants', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);
    const url = new URL(c.req.url);
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const tenantsData = await db
      .select()
      .from(tenants)
      .orderBy(desc(tenants.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    await logGlobalAdminAction(c, 'list_tenants', 'tenant', undefined, { page, limit });

    return c.json({
      success: true,
      data: {
        tenants: tenantsData,
        pagination: {
          page,
          limit,
          hasMore: tenantsData.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Global admin tenants list error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tenants',
        },
      },
      500
    );
  }
});

/**
 * GET /api/global-admin/tenants/:id
 * Get detailed tenant information
 */
app.get('/tenants/:id', async (c: AppContext) => {
  try {
    const tenantId = c.req.param('id');
    const db = getDb(c.env.DB);

    // Get tenant info
    const tenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .get();

    if (!tenant) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant not found',
          },
        },
        404
      );
    }

    // Get tenant users
    const tenantUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.tenantId, tenantId))
      .orderBy(desc(users.createdAt))
      .all();

    await logGlobalAdminAction(c, 'view_tenant', 'tenant', tenantId);

    return c.json({
      success: true,
      data: {
        tenant,
        users: tenantUsers,
      },
    });
  } catch (error) {
    console.error('Global admin tenant detail error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch tenant details',
        },
      },
      500
    );
  }
});

/**
 * PUT /api/global-admin/users/:id/make-global-admin
 * Make a user a global admin
 */
app.put('/users/:id/make-global-admin', async (c: AppContext) => {
  try {
    const userId = c.req.param('id');
    const db = getDb(c.env.DB);

    // Get user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .get();

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        },
        404
      );
    }

    // Update user to global admin
    await db
      .update(users)
      .set({ 
        isGlobalAdmin: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await logGlobalAdminAction(c, 'make_global_admin', 'user', userId, {
      userEmail: user.email,
      userName: user.name,
    });

    return c.json({
      success: true,
      data: {
        message: 'User is now a global admin',
      },
    });
  } catch (error) {
    console.error('Global admin make global admin error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to make user global admin',
        },
      },
      500
    );
  }
});

/**
 * GET /api/global-admin/audit-log
 * Get global admin audit log
 */
app.get('/audit-log', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);
    const url = new URL(c.req.url);
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    const auditLog = await db
      .select({
        id: globalAdminActions.id,
        action: globalAdminActions.action,
        targetType: globalAdminActions.targetType,
        targetId: globalAdminActions.targetId,
        details: globalAdminActions.details,
        ipAddress: globalAdminActions.ipAddress,
        createdAt: globalAdminActions.createdAt,
        adminName: users.name,
        adminEmail: users.email,
      })
      .from(globalAdminActions)
      .leftJoin(users, eq(globalAdminActions.adminUserId, users.id))
      .orderBy(desc(globalAdminActions.createdAt))
      .limit(limit)
      .offset(offset)
      .all();

    return c.json({
      success: true,
      data: {
        auditLog,
        pagination: {
          page,
          limit,
          hasMore: auditLog.length === limit,
        },
      },
    });
  } catch (error) {
    console.error('Global admin audit log error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch audit log',
        },
      },
      500
    );
  }
});

/**
 * GET /api/global-admin/settings
 * Get global admin settings
 */
app.get('/settings', async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);

    const settings = await db
      .select()
      .from(globalAdminSettings)
      .orderBy(globalAdminSettings.key)
      .all();

    return c.json({
      success: true,
      data: {
        settings,
      },
    });
  } catch (error) {
    console.error('Global admin settings get error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch settings',
        },
      },
      500
    );
  }
});

/**
 * PUT /api/global-admin/settings/:key
 * Update a global admin setting
 */
app.put('/settings/:key', async (c: AppContext) => {
  try {
    const key = c.req.param('key');
    const { value } = await c.req.json();
    const db = getDb(c.env.DB);
    const adminUserId = c.get('userId') as string;

    // Update setting
    await db
      .update(globalAdminSettings)
      .set({ 
        value,
        updatedBy: adminUserId,
        updatedAt: new Date(),
      })
      .where(eq(globalAdminSettings.key, key));

    await logGlobalAdminAction(c, 'update_setting', 'system', key, {
      key,
      value,
    });

    return c.json({
      success: true,
      data: {
        message: 'Setting updated successfully',
      },
    });
  } catch (error) {
    console.error('Global admin settings update error:', error);
    return c.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to update setting',
        },
      },
      500
    );
  }
});

export default app;