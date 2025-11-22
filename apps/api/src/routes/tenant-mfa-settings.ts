import { Hono } from 'hono';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { getDb, tenantMFASettings, auditLogs } from '../db';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { AppContext } from '../types';

const tenantMFASettingsRouter = new Hono<{ Bindings: any; Variables: any }>();

// All endpoints require authentication
tenantMFASettingsRouter.use('*', authMiddleware);

// Schema definitions
const updateMFAEnforcementSchema = z.object({
  enforceMFA: z.boolean(),
  gracePeriodDays: z.number().int().min(0).max(90).optional()
});

/**
 * GET /api/tenant-mfa-settings
 * Get MFA enforcement settings for current tenant
 */
tenantMFASettingsRouter.get('/', async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.tenantId) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    // Only admin/owner can view MFA settings
    if (user.role !== 'admin' && user.role !== 'owner') {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, 403);
    }

    const db = getDb(c.env.DB);

    const settings = await db.select()
      .from(tenantMFASettings)
      .where(eq(tenantMFASettings.tenantId, user.tenantId))
      .get();

    if (!settings) {
      // Return default settings if none exist
      return c.json({
        success: true,
        data: {
          enforceMFA: false,
          gracePeriodDays: 7,
          enforcedAt: null,
          enforcedBy: null,
        }
      });
    }

    return c.json({
      success: true,
      data: {
        enforceMFA: settings.enforceMFA,
        gracePeriodDays: settings.gracePeriodDays,
        enforcedAt: settings.enforcedAt,
        enforcedBy: settings.enforcedBy,
      }
    });

  } catch (error) {
    console.error('Get MFA settings error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get MFA settings' }
    }, 500);
  }
});

/**
 * PUT /api/tenant-mfa-settings
 * Update MFA enforcement settings for current tenant
 */
tenantMFASettingsRouter.put('/', validateRequest(updateMFAEnforcementSchema), async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user || !user.tenantId) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    // Only admin/owner can update MFA settings
    if (user.role !== 'admin' && user.role !== 'owner') {
      return c.json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Admin access required' }
      }, 403);
    }

    const { enforceMFA, gracePeriodDays } = c.get('validatedData');
    const db = getDb(c.env.DB);
    const now = getCurrentTimestamp();

    // Check if settings exist
    const existing = await db.select()
      .from(tenantMFASettings)
      .where(eq(tenantMFASettings.tenantId, user.tenantId))
      .get();

    if (existing) {
      // Update existing settings
      await db.update(tenantMFASettings)
        .set({
          enforceMFA,
          gracePeriodDays: gracePeriodDays ?? existing.gracePeriodDays,
          enforcedAt: enforceMFA ? (existing.enforcedAt || now) : null,
          enforcedBy: enforceMFA ? user.id : null,
          updatedAt: now,
        })
        .where(eq(tenantMFASettings.tenantId, user.tenantId));
    } else {
      // Create new settings
      await db.insert(tenantMFASettings).values({
        id: crypto.randomUUID(),
        tenantId: user.tenantId,
        enforceMFA,
        gracePeriodDays: gracePeriodDays ?? 7,
        enforcedAt: enforceMFA ? now : null,
        enforcedBy: enforceMFA ? user.id : null,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Audit log
    const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
    const userAgent = c.req.header('user-agent') || '';

    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: user.tenantId,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action: enforceMFA ? 'enable_enforcement' : 'disable_enforcement',
      resource: 'mfa_policy',
      resourceId: user.tenantId,
      method: 'PUT',
      endpoint: '/api/tenant-mfa-settings',
      statusCode: 200,
      details: JSON.stringify({
        enforceMFA,
        gracePeriodDays: gracePeriodDays ?? existing?.gracePeriodDays ?? 7,
      }),
      ipAddress,
      userAgent,
      createdAt: now,
    });

    return c.json({
      success: true,
      data: {
        message: enforceMFA
          ? 'MFA enforcement enabled for all tenant users'
          : 'MFA enforcement disabled',
      }
    });

  } catch (error) {
    console.error('Update MFA settings error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update MFA settings' }
    }, 500);
  }
});

export { tenantMFASettingsRouter };
