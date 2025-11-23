import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, tenantMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { getDb, userSettings } from '../db';
import { UpdateUserSettingsSchema } from '@finhome360/shared';
import type { Env } from '../types';

const router = new Hono<Env>();

// Apply auth middleware to all routes
router.use('/*', authMiddleware, tenantMiddleware);

// Get user settings
router.get('/', async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get('user');
    const tenantId = c.get('tenantId');
    const userId = user!.id;

    let settings = await db
      .select()
      .from(userSettings)
      .where(and(eq(userSettings.tenantUserId, userId), eq(userSettings.tenantId, tenantId!)))
      .get();

    // Create default settings if they don't exist
    if (!settings) {
      const now = new Date();
      settings = {
        id: crypto.randomUUID(),
        tenantUserId: userId,
        tenantId: tenantId!,
        currency: 'GBP',
        currencySymbol: '£',
        language: 'en',
        timezone: 'Europe/London',
        dateFormat: 'DD/MM/YYYY',
        onboardingComplete: false,
        dashboardTourCompleted: false,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(userSettings).values(settings).run();
    }

    return c.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error fetching user settings:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user settings' },
      },
      500
    );
  }
});

// Update user settings
router.put('/', validateRequest(UpdateUserSettingsSchema), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const user = c.get('user');
    const tenantId = c.get('tenantId');
    const userId = user!.id;
    const body = await c.req.json();

    // Check if settings exist
    let settings = await db
      .select()
      .from(userSettings)
      .where(and(eq(userSettings.tenantUserId, userId), eq(userSettings.tenantId, tenantId!)))
      .get();

    const now = new Date();

    if (!settings) {
      // Create new settings
      console.log('[Settings] Creating new settings for user:', userId, 'tenant:', tenantId);
      settings = {
        id: crypto.randomUUID(),
        tenantUserId: userId,
        tenantId: tenantId!,
        currency: body.currency || 'GBP',
        currencySymbol: body.currencySymbol || '£',
        language: body.language || 'en',
        timezone: body.timezone || 'Europe/London',
        dateFormat: body.dateFormat || 'DD/MM/YYYY',
        onboardingComplete: body.onboardingComplete || false,
        dashboardTourCompleted: body.dashboardTourCompleted || false,
        createdAt: now,
        updatedAt: now,
      };

      await db.insert(userSettings).values(settings).run();
    } else {
      // Update existing settings
      console.log('[Settings] Updating settings for user:', userId, 'tenant:', tenantId, 'body:', body);
      const updated = {
        ...body,
        updatedAt: now,
      };

      const result = await db
        .update(userSettings)
        .set(updated)
        .where(and(eq(userSettings.tenantUserId, userId), eq(userSettings.tenantId, tenantId!)))
        .run();

      console.log('[Settings] Update result:', result);
      settings = { ...settings, ...updated };
    }

    return c.json({ success: true, data: settings });
  } catch (error: any) {
    console.error('Error updating user settings:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to update user settings' },
      },
      500
    );
  }
});

export default router;
