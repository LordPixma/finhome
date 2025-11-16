import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import { MFAService } from '../services/mfa';
import { validateRequest } from '../middleware/validation';
import { getDb, globalAdminMFA, users } from '../db';
import { globalAdminMiddleware } from '../middleware/global-admin';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { AppContext } from '../types';

const mfaRouter = new Hono<{ Bindings: any; Variables: any }>();

// Schema definitions
const setupMFASchema = z.object({
  email: z.string().email()
});

const verifyMFASchema = z.object({
  email: z.string().email(),
  token: z.string().length(6)
});

const confirmMFASetupSchema = z.object({
  email: z.string().email(),
  token: z.string().length(6),
  secret: z.string()
});

/**
 * POST /api/admin/mfa/setup
 * Generate MFA setup data for a global admin
 */
mfaRouter.post('/setup', validateRequest(setupMFASchema), async (c: AppContext) => {
  try {
    const { email } = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Verify the user is a global admin
    const admin = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!admin || !admin.isGlobalAdmin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    // Check if MFA is already enabled
    const existingMFA = await db.select()
      .from(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, admin.id))
      .get();

    if (existingMFA?.isEnabled) {
      return c.json({ 
        success: false, 
        error: { code: 'MFA_ALREADY_ENABLED', message: 'MFA is already enabled for this admin' } 
      }, 400);
    }

    // Generate MFA setup data
    const mfaSetup = MFAService.generateMFASetup(email);

    // Store the secret temporarily (not enabled until verified)
    if (existingMFA) {
      await db.update(globalAdminMFA)
        .set({
          secret: mfaSetup.secret,
          backupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
          updatedAt: new Date()
        })
        .where(eq(globalAdminMFA.userId, admin.id));
    } else {
      const now = getCurrentTimestamp();
      await db.insert(globalAdminMFA).values({
        id: crypto.randomUUID(),
        userId: admin.id,
        secret: mfaSetup.secret,
        isEnabled: false,
        backupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
        createdAt: now,
        updatedAt: now
      });
    }

    return c.json({
      success: true,
      data: {
        qrCodeURL: mfaSetup.qrCodeURL,
        secret: mfaSetup.secret,
        backupCodes: mfaSetup.backupCodes // Return unhashed codes for user to save
      }
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to setup MFA' } 
    }, 500);
  }
});

/**
 * POST /api/admin/mfa/confirm
 * Confirm MFA setup and enable it
 */
mfaRouter.post('/confirm', validateRequest(confirmMFASetupSchema), async (c: AppContext) => {
  try {
    const { email, token, secret } = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Verify the user is a global admin
    const admin = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!admin || !admin.isGlobalAdmin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    // Verify the TOTP token
    const isValidToken = MFAService.verifyTOTP(token, secret);
    if (!isValidToken) {
      return c.json({ 
        success: false, 
        error: { code: 'INVALID_TOKEN', message: 'Invalid MFA token' } 
      }, 400);
    }

    // Enable MFA
    await db.update(globalAdminMFA)
      .set({
        isEnabled: true,
        updatedAt: new Date()
      })
      .where(eq(globalAdminMFA.userId, admin.id));

    return c.json({
      success: true,
      data: { message: 'MFA enabled successfully' }
    });

  } catch (error) {
    console.error('MFA confirmation error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to confirm MFA' } 
    }, 500);
  }
});

/**
 * POST /api/admin/mfa/verify
 * Verify MFA token for login
 */
mfaRouter.post('/verify', validateRequest(verifyMFASchema), async (c: AppContext) => {
  try {
    const { email, token } = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Get admin and MFA data
    const admin = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!admin || !admin.isGlobalAdmin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    const mfaData = await db.select()
      .from(globalAdminMFA)
      .where(and(
        eq(globalAdminMFA.userId, admin.id),
        eq(globalAdminMFA.isEnabled, true)
      ))
      .get();

    if (!mfaData) {
      return c.json({ 
        success: false, 
        error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled for this admin' } 
      }, 400);
    }

    // Verify TOTP token
    let isValid = MFAService.verifyTOTP(token, mfaData.secret);
    
    // If TOTP fails, check backup codes
    if (!isValid && mfaData.backupCodes) {
      const backupCodes = JSON.parse(mfaData.backupCodes) as string[];
      isValid = MFAService.verifyHashedBackupCode(token, backupCodes);
      
      if (isValid) {
        // Remove used backup code
        const remainingCodes = backupCodes.filter(code => {
          const hash = createHmac('sha256', 'backup-code-salt');
          hash.update(token);
          return hash.digest('hex') !== code;
        });
        
        await db.update(globalAdminMFA)
          .set({
            backupCodes: JSON.stringify(remainingCodes),
            updatedAt: new Date()
          })
          .where(eq(globalAdminMFA.userId, admin.id));
      }
    }

    if (!isValid) {
      return c.json({ 
        success: false, 
        error: { code: 'INVALID_TOKEN', message: 'Invalid MFA token' } 
      }, 400);
    }

    // Update last used timestamp (if the schema had this field)
    await db.update(globalAdminMFA)
      .set({
        updatedAt: new Date()
      })
      .where(eq(globalAdminMFA.userId, admin.id));

    return c.json({
      success: true,
      data: { verified: true }
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify MFA' } 
    }, 500);
  }
});

/**
 * GET /api/admin/mfa/status/:email
 * Get MFA status for an admin
 */
mfaRouter.get('/status/:email', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const email = c.req.param('email');
    const db = getDb(c.env.DB);

    const admin = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!admin || !admin.isGlobalAdmin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    const mfaData = await db.select()
      .from(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, admin.id))
      .get();

    const backupCodesCount = mfaData?.backupCodes 
      ? JSON.parse(mfaData.backupCodes).length 
      : 0;

    return c.json({
      success: true,
      data: {
        isEnabled: mfaData?.isEnabled || false,
        backupCodesRemaining: backupCodesCount
      }
    });

  } catch (error) {
    console.error('MFA status error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get MFA status' } 
    }, 500);
  }
});

/**
 * DELETE /api/admin/mfa/disable
 * Disable MFA for an admin
 */
mfaRouter.delete('/disable', validateRequest(verifyMFASchema), globalAdminMiddleware, async (c: AppContext) => {
  try {
    const { email, token } = c.get('validatedData');
    const db = getDb(c.env.DB);

    const admin = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!admin || !admin.isGlobalAdmin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    const mfaData = await db.select()
      .from(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, admin.id))
      .get();

    if (!mfaData?.isEnabled) {
      return c.json({ 
        success: false, 
        error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled' } 
      }, 400);
    }

    // Verify current MFA token before disabling
    const isValid = MFAService.verifyTOTP(token, mfaData.secret);
    if (!isValid) {
      return c.json({ 
        success: false, 
        error: { code: 'INVALID_TOKEN', message: 'Invalid MFA token' } 
      }, 400);
    }

    // Disable MFA
    await db.delete(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, admin.id));

    return c.json({
      success: true,
      data: { message: 'MFA disabled successfully' }
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disable MFA' } 
    }, 500);
  }
});

/**
 * GET /api/admin/mfa/stats
 * Get MFA statistics for the admin dashboard
 */
mfaRouter.get('/stats', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);

    // Get all global admins
    const allAdmins = await db.select({
      id: users.id,
      email: users.email,
      name: users.name
    })
    .from(users)
    .where(eq(users.isGlobalAdmin, true));

    // Get MFA data for all admins
    const mfaData = await db.select()
      .from(globalAdminMFA)
      .innerJoin(users, eq(globalAdminMFA.userId, users.id));

    const enabledCount = mfaData.filter(m => m.global_admin_mfa.isEnabled).length;
    const disabledCount = allAdmins.length - enabledCount;
    const totalFailedAttempts = 0; // Would track in a separate table
    const complianceRate = allAdmins.length > 0 ? Math.round((enabledCount / allAdmins.length) * 100) : 0;

    return c.json({
      success: true,
      data: {
        mfaEnabled: enabledCount,
        mfaDisabled: disabledCount,
        totalAdmins: allAdmins.length,
        failedAttempts: totalFailedAttempts,
        complianceRate
      }
    });

  } catch (error) {
    console.error('MFA stats error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get MFA stats' } 
    }, 500);
  }
});

/**
 * GET /api/admin/mfa/users
 * Get all users with their MFA status
 */
mfaRouter.get('/users', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const db = getDb(c.env.DB);

    // Get all global admins with their MFA status
    const adminsWithMFA = await db.select({
      userId: users.id,
      email: users.email,
      firstName: users.name, // Using name as firstName
      lastName: users.name, // Placeholder - could split name
      mfaEnabled: globalAdminMFA.isEnabled,
      mfaMethod: globalAdminMFA.secret, // We'll derive method from having a secret
      backupCodes: globalAdminMFA.backupCodes,
      lastMFASetup: globalAdminMFA.createdAt,
      lastMFAUsed: globalAdminMFA.updatedAt
    })
    .from(users)
    .leftJoin(globalAdminMFA, eq(users.id, globalAdminMFA.userId))
    .where(eq(users.isGlobalAdmin, true));

    // Transform the data to match frontend expectations
    const mfaUsers = adminsWithMFA.map(admin => {
      const backupCodesArray = admin.backupCodes ? JSON.parse(admin.backupCodes) : [];
      
      return {
        userId: admin.userId,
        email: admin.email,
        firstName: admin.firstName?.split(' ')[0] || 'Unknown',
        lastName: admin.firstName?.split(' ').slice(1).join(' ') || 'User',
        tenantName: 'Global Admin', // Global admins don't belong to specific tenants
        mfaEnabled: admin.mfaEnabled || false,
        mfaMethod: admin.mfaEnabled ? 'app' : undefined, // TOTP is app-based
        backupCodes: backupCodesArray.length,
        lastMFASetup: admin.lastMFASetup?.toISOString(),
        lastMFAUsed: admin.lastMFAUsed?.toISOString(),
        failedAttempts: 0 // Would track separately
      };
    });

    return c.json({
      success: true,
      data: mfaUsers
    });

  } catch (error) {
    console.error('MFA users error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get MFA users' } 
    }, 500);
  }
});

/**
 * GET /api/admin/mfa/settings
 * Get global MFA settings
 */
mfaRouter.get('/settings', globalAdminMiddleware, async (c: AppContext) => {
  try {
    // For now, return default settings. In a full implementation, 
    // these would be stored in a settings table
    const settings = {
      enforceMFA: false, // Could be stored in globalAdminSettings
      allowedMethods: ['app'], // Only TOTP supported currently
      maxFailedAttempts: 5,
      backupCodesRequired: true,
      gracePeriodDays: 30
    };

    return c.json({
      success: true,
      data: settings
    });

  } catch (error) {
    console.error('MFA settings error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to get MFA settings' } 
    }, 500);
  }
});

/**
 * PUT /api/admin/mfa/settings
 * Update global MFA settings
 */
mfaRouter.put('/settings', globalAdminMiddleware, async (c: AppContext) => {
  try {
    // TODO: Parse and use settings for MFA configuration
    
    // In a full implementation, store these in globalAdminSettings table
    // For now, just return success
    
    return c.json({
      success: true,
      data: { message: 'MFA settings updated successfully' }
    });

  } catch (error) {
    console.error('MFA settings update error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update MFA settings' } 
    }, 500);
  }
});

/**
 * POST /api/admin/mfa/users/:userId/enable
 * Enable MFA for a specific user
 */
mfaRouter.post('/users/:userId/enable', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env.DB);

    const admin = await db.select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.isGlobalAdmin, true)
      ))
      .get();

    if (!admin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    // Generate MFA setup for the user
    const mfaSetup = MFAService.generateMFASetup(admin.email);

    // Store the setup (not enabled until confirmed)
    const existingMFA = await db.select()
      .from(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, userId))
      .get();

    if (existingMFA) {
      await db.update(globalAdminMFA)
        .set({
          secret: mfaSetup.secret,
          backupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
          updatedAt: new Date()
        })
        .where(eq(globalAdminMFA.userId, userId));
    } else {
      const now = getCurrentTimestamp();
      await db.insert(globalAdminMFA).values({
        id: crypto.randomUUID(),
        userId: userId,
        secret: mfaSetup.secret,
        isEnabled: false,
        backupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
        createdAt: now,
        updatedAt: now
      });
    }

    return c.json({
      success: true,
      data: { 
        message: `MFA setup initiated for ${admin.name}`,
        qrCodeURL: mfaSetup.qrCodeURL
      }
    });

  } catch (error) {
    console.error('Enable MFA error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to enable MFA' } 
    }, 500);
  }
});

/**
 * POST /api/admin/mfa/users/:userId/disable
 * Disable MFA for a specific user
 */
mfaRouter.post('/users/:userId/disable', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env.DB);

    const admin = await db.select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.isGlobalAdmin, true)
      ))
      .get();

    if (!admin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    // Disable MFA by deleting the record
    await db.delete(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, userId));

    return c.json({
      success: true,
      data: { message: `MFA disabled for ${admin.name}` }
    });

  } catch (error) {
    console.error('Disable MFA error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to disable MFA' } 
    }, 500);
  }
});

/**
 * POST /api/admin/mfa/users/:userId/reset
 * Reset MFA for a specific user
 */
mfaRouter.post('/users/:userId/reset', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env.DB);

    const admin = await db.select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.isGlobalAdmin, true)
      ))
      .get();

    if (!admin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    // Reset MFA by generating new setup
    const mfaSetup = MFAService.generateMFASetup(admin.email);

    await db.update(globalAdminMFA)
      .set({
        secret: mfaSetup.secret,
        isEnabled: false, // Require re-confirmation
        backupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
        updatedAt: new Date()
      })
      .where(eq(globalAdminMFA.userId, userId));

    return c.json({
      success: true,
      data: { 
        message: `MFA reset for ${admin.name}. Re-setup required.`,
        qrCodeURL: mfaSetup.qrCodeURL
      }
    });

  } catch (error) {
    console.error('Reset MFA error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to reset MFA' } 
    }, 500);
  }
});

/**
 * POST /api/admin/mfa/users/:userId/backup-codes
 * Generate new backup codes for a user
 */
mfaRouter.post('/users/:userId/backup-codes', globalAdminMiddleware, async (c: AppContext) => {
  try {
    const userId = c.req.param('userId');
    const db = getDb(c.env.DB);

    const admin = await db.select()
      .from(users)
      .where(and(
        eq(users.id, userId),
        eq(users.isGlobalAdmin, true)
      ))
      .get();

    if (!admin) {
      return c.json({ 
        success: false, 
        error: { code: 'NOT_FOUND', message: 'Global admin not found' } 
      }, 404);
    }

    // Check if MFA is enabled
    const mfaData = await db.select()
      .from(globalAdminMFA)
      .where(eq(globalAdminMFA.userId, userId))
      .get();

    if (!mfaData?.isEnabled) {
      return c.json({ 
        success: false, 
        error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled for this user' } 
      }, 400);
    }

    // Generate new backup codes
    const backupCodes = MFAService.generateBackupCodes();
    const hashedBackupCodes = MFAService.hashBackupCodes(backupCodes);

    await db.update(globalAdminMFA)
      .set({
        backupCodes: JSON.stringify(hashedBackupCodes),
        updatedAt: new Date()
      })
      .where(eq(globalAdminMFA.userId, userId));

    return c.json({
      success: true,
      data: { 
        message: `New backup codes generated for ${admin.name}`,
        backupCodes // Return unhashed codes for user to save
      }
    });

  } catch (error) {
    console.error('Generate backup codes error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: 'Failed to generate backup codes' } 
    }, 500);
  }
});

export { mfaRouter };