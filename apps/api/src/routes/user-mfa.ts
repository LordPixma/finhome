import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { createHmac } from 'node:crypto';
import * as jose from 'jose';
import { MFAService } from '../services/mfa';
import { validateRequest } from '../middleware/validation';
import { authMiddleware } from '../middleware/auth';
import { getDb, userMFA, users, globalAdminMFA } from '../db';
import { getCurrentTimestamp } from '../utils/timestamp';
import type { AppContext } from '../types';

const userMFARouter = new Hono<{ Bindings: any; Variables: any }>();

// Note: /verify endpoint is public (used during login), other endpoints require auth

// Helper to generate JWT tokens
async function generateTokens(
  userId: string,
  email: string,
  name: string,
  tenantId: string | null,
  role: 'admin' | 'member' | 'owner',
  isGlobalAdmin: boolean,
  secret: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const secretKey = new TextEncoder().encode(secret);

  // Access token (1 hour)
  const accessToken = await new jose.SignJWT({
    userId,
    email,
    name,
    tenantId,
    role,
    isGlobalAdmin,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .setSubject(userId)
    .sign(secretKey);

  // Refresh token (7 days)
  const refreshToken = await new jose.SignJWT({
    userId,
    tenantId,
    type: 'refresh',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setSubject(userId)
    .sign(secretKey);

  return { accessToken, refreshToken };
}

// Schema definitions
const setupMFASchema = z.object({});

const verifyMFASchema = z.object({
  email: z.string().email(),
  token: z.string().length(6)
});

const confirmMFASetupSchema = z.object({
  token: z.string().length(6),
  secret: z.string()
});

const disableMFASchema = z.object({
  token: z.string().length(6)
});

/**
 * GET /api/mfa/status
 * Get MFA status for the current user
 */
userMFARouter.get('/status', authMiddleware, async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    const db = getDb(c.env.DB);

    const mfaData = await db.select()
      .from(userMFA)
      .where(eq(userMFA.userId, user.id))
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
 * POST /api/mfa/setup
 * Generate MFA setup data for the current user
 */
userMFARouter.post('/setup', authMiddleware, validateRequest(setupMFASchema), async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    const db = getDb(c.env.DB);

    // Check if MFA is already enabled
    const existingMFA = await db.select()
      .from(userMFA)
      .where(eq(userMFA.userId, user.id))
      .get();

    if (existingMFA?.isEnabled) {
      return c.json({
        success: false,
        error: { code: 'MFA_ALREADY_ENABLED', message: 'MFA is already enabled for this account' }
      }, 400);
    }

    // Generate MFA setup data
    const mfaSetup = MFAService.generateMFASetup(user.email);

    // Store the secret temporarily (not enabled until verified)
    if (existingMFA) {
      await db.update(userMFA)
        .set({
          secret: mfaSetup.secret,
          backupCodes: JSON.stringify(mfaSetup.hashedBackupCodes),
          updatedAt: new Date()
        })
        .where(eq(userMFA.userId, user.id));
    } else {
      const now = getCurrentTimestamp();
      await db.insert(userMFA).values({
        id: crypto.randomUUID(),
        userId: user.id,
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
 * POST /api/mfa/confirm
 * Confirm MFA setup and enable it
 */
userMFARouter.post('/confirm', authMiddleware, validateRequest(confirmMFASetupSchema), async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    const { token, secret } = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Verify the TOTP token
    const isValidToken = MFAService.verifyTOTP(token, secret);
    if (!isValidToken) {
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid MFA token' }
      }, 400);
    }

    // Enable MFA
    await db.update(userMFA)
      .set({
        isEnabled: true,
        updatedAt: new Date()
      })
      .where(eq(userMFA.userId, user.id));

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
 * POST /api/mfa/verify
 * Verify MFA token during login (called after password verification)
 */
userMFARouter.post('/verify', validateRequest(verifyMFASchema), async (c: AppContext) => {
  try {
    const { email, token } = c.get('validatedData');
    const db = getDb(c.env.DB);

    // Get user and MFA data
    const user = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      return c.json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'User not found' }
      }, 404);
    }

    // Check both regular user MFA and global admin MFA tables
    const mfaTable = user.isGlobalAdmin ? globalAdminMFA : userMFA;
    const mfaData = await db.select()
      .from(mfaTable)
      .where(and(
        eq(mfaTable.userId, user.id),
        eq(mfaTable.isEnabled, true)
      ))
      .get();

    if (!mfaData) {
      return c.json({
        success: false,
        error: { code: 'MFA_NOT_ENABLED', message: 'MFA is not enabled for this user' }
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

        await db.update(mfaTable)
          .set({
            backupCodes: JSON.stringify(remainingCodes),
            updatedAt: new Date()
          })
          .where(eq(mfaTable.userId, user.id));
      }
    }

    if (!isValid) {
      return c.json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid MFA token' }
      }, 400);
    }

    // Update last used timestamp
    await db.update(mfaTable)
      .set({
        updatedAt: new Date()
      })
      .where(eq(mfaTable.userId, user.id));

    // Generate tokens for the user
    const tokens = await generateTokens(
      user.id,
      user.email,
      user.name,
      user.tenantId,
      user.role,
      user.isGlobalAdmin || false,
      c.env.JWT_SECRET
    );

    // Store refresh token in KV (optional, for token revocation)
    if (c.env.SESSIONS) {
      await c.env.SESSIONS.put(`refresh:${user.id}`, tokens.refreshToken, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return c.json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: 3600,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          tenantId: user.tenantId,
          role: user.role,
          isGlobalAdmin: user.isGlobalAdmin || false,
        },
      }
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
 * POST /api/mfa/disable
 * Disable MFA for the current user
 */
userMFARouter.post('/disable', authMiddleware, validateRequest(disableMFASchema), async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    const { token } = c.get('validatedData');
    const db = getDb(c.env.DB);

    const mfaData = await db.select()
      .from(userMFA)
      .where(eq(userMFA.userId, user.id))
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

    // Disable MFA by deleting the record
    await db.delete(userMFA)
      .where(eq(userMFA.userId, user.id));

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
 * POST /api/mfa/regenerate-backup-codes
 * Generate new backup codes for the current user
 */
userMFARouter.post('/regenerate-backup-codes', authMiddleware, async (c: AppContext) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      }, 401);
    }

    const db = getDb(c.env.DB);

    // Check if MFA is enabled
    const mfaData = await db.select()
      .from(userMFA)
      .where(eq(userMFA.userId, user.id))
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

    await db.update(userMFA)
      .set({
        backupCodes: JSON.stringify(hashedBackupCodes),
        updatedAt: new Date()
      })
      .where(eq(userMFA.userId, user.id));

    return c.json({
      success: true,
      data: {
        message: 'New backup codes generated',
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

export { userMFARouter };
