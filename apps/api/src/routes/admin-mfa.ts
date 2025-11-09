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

export { mfaRouter };