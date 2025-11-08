import { Hono } from 'hono';
import * as jose from 'jose';
import * as bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { getDb, tenants, users, userMFA, globalAdminMFA } from '../db';
import { extractSubdomain, isValidSubdomain } from '../middleware/subdomain';
import { LoginSchema, RegisterSchema, RefreshTokenSchema } from '@finhome360/shared';
import { TrustedDeviceService } from '../services/trusted-devices';
import { authRateLimiter } from '../middleware/rateLimit';
import { createHybridEmailService } from '../services/hybridEmail';
import type { Env } from '../types';

const auth = new Hono<Env>();

// Apply rate limiting to all auth routes
auth.use('*', authRateLimiter);

// Helper to generate JWT tokens
async function generateTokens(
  userId: string,
  email: string,
  name: string,
  tenantId: string | null,
  role: 'admin' | 'member',
  isGlobalAdmin: boolean,
  secret: string
): Promise<{ accessToken: string; refreshToken: string }> {
  const secretKey = new TextEncoder().encode(secret);

  // Access token (1 hour)
  const accessToken = await new jose.SignJWT({
    userId, // retain for backward compatibility
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

// Login endpoint
auth.post('/login', async c => {
  try {
    console.log('[Login] Starting login attempt');
    const body = await c.req.json();
    console.log('[Login] Request body parsed, email:', body.email);

    const validation = LoginSchema.safeParse(body);

    if (!validation.success) {
      console.error('[Login] Validation failed:', validation.error);
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        },
        400
      );
    }

    const { email, password, subdomain } = validation.data;
    console.log('[Login] Getting database connection');
    const db = getDb(c.env.DB);

    const host = c.req.header('Host') || '';
    const hostSubdomain = extractSubdomain(host);
    const requestedSubdomain = subdomain?.toLowerCase() || hostSubdomain || null;

    let tenantContext: { id: string; subdomain: string } | null = null;
    if (requestedSubdomain) {
      if (!isValidSubdomain(requestedSubdomain)) {
        return c.json(
          {
            success: false,
            error: { code: 'INVALID_SUBDOMAIN', message: 'Invalid tenant subdomain provided' },
          },
          400
        );
      }

      const tenantRecord = await db
        .select({ id: tenants.id, subdomain: tenants.subdomain })
        .from(tenants)
        .where(eq(tenants.subdomain, requestedSubdomain))
        .get();

      if (!tenantRecord) {
        return c.json(
          {
            success: false,
            error: { code: 'TENANT_NOT_FOUND', message: 'No tenant found for the provided subdomain' },
          },
          404
        );
      }

      tenantContext = tenantRecord;
    }

    const hostWithoutPort = host.split(':')[0];
    const isAdminDomain = hostWithoutPort.startsWith('admin.');

    // Find user by email
    console.log('[Login] Searching for user by email');
    let user;

    if (tenantContext) {
      user = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), eq(users.tenantId, tenantContext.id)))
        .get();
    } else {
      const matches = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .all();

      if (matches.length === 0) {
        return c.json(
          {
            success: false,
            error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
          },
          401
        );
      }

      if (matches.length === 1) {
        user = matches[0];
      } else if (isAdminDomain) {
        user = matches.find(candidate => candidate.isGlobalAdmin);
        if (!user) {
          return c.json(
            {
              success: false,
              error: {
                code: 'TENANT_REQUIRED',
                message: 'Multiple tenants found for this email. Provide a tenant subdomain to continue.',
              },
            },
            400
          );
        }
      } else {
        return c.json(
          {
            success: false,
            error: {
              code: 'TENANT_REQUIRED',
              message: 'Multiple tenants found for this email. Sign in from your tenant subdomain or include it in the request.',
            },
          },
          400
        );
      }
    }

    if (!user) {
      console.log('[Login] User not found');
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    console.log('[Login] User found, ID:', user.id, 'isGlobalAdmin:', user.isGlobalAdmin, 'tenantId:', user.tenantId);

    if (tenantContext && user.tenantId !== tenantContext.id) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    // For regular users, require tenantId. For global admins, allow null tenantId
    if (!user.isGlobalAdmin && !user.tenantId) {
      console.log('[Login] User missing tenantId');
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    // Verify password
    console.log('[Login] Verifying password');
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      console.log('[Login] Password mismatch');
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    console.log('[Login] Password verified, checking MFA');
    // Check if MFA is enabled for this user (gracefully handle if tables don't exist)
    let mfaData = null;
    try {
      mfaData = user.isGlobalAdmin
        ? await db.select()
            .from(globalAdminMFA)
            .where(and(
              eq(globalAdminMFA.userId, user.id),
              eq(globalAdminMFA.isEnabled, true)
            ))
            .get()
        : await db.select()
            .from(userMFA)
            .where(and(
              eq(userMFA.userId, user.id),
              eq(userMFA.isEnabled, true)
            ))
            .get();
    } catch (mfaError: any) {
      // If MFA tables don't exist yet, skip MFA check
      if (mfaError?.message?.includes('no such table')) {
        console.log('[Login] MFA tables not found, skipping MFA check');
        mfaData = null;
      } else {
        // Re-throw if it's a different error
        throw mfaError;
      }
    }

    console.log('[Login] MFA data:', mfaData ? 'enabled' : 'not enabled');

    // If MFA is enabled, check if device is trusted
    if (mfaData) {
      console.log('[Login] Checking trusted device');
      const userAgent = c.req.header('user-agent') || '';
      const ipAddress = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for');
      const deviceFingerprint = TrustedDeviceService.generateFingerprint(userAgent, ipAddress);

      const isTrusted = await TrustedDeviceService.isTrustedDevice(db, user.id, deviceFingerprint);

      // If device is not trusted, require MFA verification
      if (!isTrusted) {
        console.log('[Login] Device not trusted, requiring MFA');
        return c.json({
          success: true,
          data: {
            mfaRequired: true,
            email: user.email,
            message: 'MFA verification required'
          }
        });
      }

      console.log('[Login] Device is trusted, continuing');
      // Device is trusted, skip MFA and continue with normal login
    }

    // Generate tokens (only if MFA is not enabled)
    console.log('[Login] Generating tokens');
    const tokens = await generateTokens(
      user.id,
      user.email,
      user.name,
      user.tenantId,
      user.role,
      user.isGlobalAdmin || false,
      c.env.JWT_SECRET
    );

    console.log('[Login] Tokens generated, storing refresh token');
    // Store refresh token in KV (optional, for token revocation)
    if (c.env.SESSIONS) {
      await c.env.SESSIONS.put(`refresh:${user.id}`, tokens.refreshToken, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      });
    }

    console.log('[Login] Login successful');
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
      },
    });
  } catch (error) {
    console.error('[Login] ERROR - Type:', error?.constructor?.name);
    console.error('[Login] ERROR - Message:', error?.message);
    console.error('[Login] ERROR - Stack:', error?.stack);
    console.error('[Login] ERROR - Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An error occurred during login' },
      },
      500
    );
  }
});

// Register endpoint
auth.post('/register', async c => {
  try {
    const body = await c.req.json();
    const validation = RegisterSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validation.error.errors,
          },
        },
        400
      );
    }

    const { tenantName, subdomain, email, name, password } = validation.data;
    const db = getDb(c.env.DB);

    // Check if subdomain already exists
    const existingTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .get();

    if (existingTenant) {
      return c.json(
        {
          success: false,
          error: { code: 'SUBDOMAIN_TAKEN', message: 'This subdomain is already taken' },
        },
        409
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create tenant
    const tenantId = crypto.randomUUID();
    const now = new Date();

    await db
      .insert(tenants)
      .values({
        id: tenantId,
        name: tenantName,
        subdomain,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Create user (admin role)
    const userId = crypto.randomUUID();

    await db
      .insert(users)
      .values({
        id: userId,
        tenantId,
        email,
        name,
        passwordHash,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // Create default categories for the new tenant
    const { createDefaultCategories } = await import('../services/defaultCategories');
    await createDefaultCategories(db, tenantId);

    // Generate tokens
    const tokens = await generateTokens(userId, email, name, tenantId, 'admin', false, c.env.JWT_SECRET);

    // Store refresh token in KV
    if (c.env.SESSIONS) {
      await c.env.SESSIONS.put(`refresh:${userId}`, tokens.refreshToken, {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      });
    }

    // Build subdomain URL for frontend redirect
    const frontendUrl = c.env.FRONTEND_URL || 'https://finhome360.com';
    const baseUrl = new URL(frontendUrl);
    const subdomainUrl = `${baseUrl.protocol}//${subdomain}.${baseUrl.host}`;

    // Send welcome email (async, don't block response)
    const emailService = createHybridEmailService(
      c.env.RESEND_API_KEY,
      'noreply@finhome360.com', // Using verified domain
      frontendUrl
    );

    // Send welcome email in background
    emailService.sendWelcomeEmail(email, {
      userName: name,
      userEmail: email,
      tenantName,
      subdomain,
      loginUrl: subdomainUrl
    }).then((success) => {
      console.log('📧 Welcome email result:', { success, email, timestamp: new Date().toISOString() });
    }).catch((error) => {
      console.error('❌ Welcome email failed:', { error, email, timestamp: new Date().toISOString() });
    });

    return c.json(
      {
        success: true,
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: 3600,
          user: {
            id: userId,
            email,
            name,
            tenantId,
            role: 'admin',
          },
          tenant: {
            id: tenantId,
            name: tenantName,
            subdomain,
            url: subdomainUrl,
          },
        },
      },
      201
    );
  } catch (error) {
    console.error('Registration error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An error occurred during registration' },
      },
      500
    );
  }
});

// Refresh token endpoint
auth.post('/refresh', async c => {
  try {
    const body = await c.req.json();
    const validation = RefreshTokenSchema.safeParse(body);

    if (!validation.success) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
        },
        400
      );
    }

    const { refreshToken } = validation.data;
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);

    // Verify refresh token
    const { payload } = await jose.jwtVerify(refreshToken, secret, {
      algorithms: ['HS256'],
    });

    if (payload.type !== 'refresh' || !payload.userId || !payload.tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid refresh token' },
        },
        401
      );
    }

    // Optional: Check if token is still valid in KV
    if (c.env.SESSIONS) {
      const storedToken = await c.env.SESSIONS.get(`refresh:${payload.userId}`);
      if (storedToken !== refreshToken) {
        return c.json(
          {
            success: false,
            error: { code: 'INVALID_TOKEN', message: 'Refresh token has been revoked' },
          },
          401
        );
      }
    }

    // Get user details
    const db = getDb(c.env.DB);
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.id, payload.userId as string), eq(users.tenantId, payload.tenantId as string)))
      .get();

    if (!user || !user.tenantId) {
      return c.json(
        {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'User not found' },
        },
        404
      );
    }

    // Generate new tokens
    const tokens = await generateTokens(
      user.id,
      user.email,
      user.name,
      user.tenantId,
      user.role,
      user.isGlobalAdmin || false,
      c.env.JWT_SECRET
    );

    // Update refresh token in KV
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
      },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired refresh token' },
      },
      401
    );
  }
});

/**
 * POST /api/auth/global-admin/login
 * Global admin login (bypasses tenant isolation)
 */
auth.post('/global-admin/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
        },
        400
      );
    }

    const db = getDb(c.env.DB);

    // Find user by email and check if they're a global admin
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user || !user.isGlobalAdmin) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid global admin credentials' },
        },
        401
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid global admin credentials' },
        },
        401
      );
    }

    // Generate special global admin tokens (no tenantId)
    const secretKey = new TextEncoder().encode(c.env.JWT_SECRET);

    const accessToken = await new jose.SignJWT({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isGlobalAdmin: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setSubject(user.id)
      .sign(secretKey);

    const refreshToken = await new jose.SignJWT({
      userId: user.id,
      isGlobalAdmin: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setSubject(user.id)
      .sign(secretKey);

    // Store refresh token in KV
    const refreshTokenId = crypto.randomUUID();
    await c.env.SESSIONS.put(`refresh_token:${refreshTokenId}`, refreshToken, {
      expirationTtl: 7 * 24 * 60 * 60, // 7 days
    });

    return c.json({
      success: true,
      data: {
        accessToken,
        refreshToken: refreshTokenId,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isGlobalAdmin: true,
        },
      },
    });
  } catch (error) {
    console.error('Global admin login error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Login failed' },
      },
      500
    );
  }
});

// TEMPORARY DEBUG ENDPOINT - Remove after fixing global admin
auth.post('/debug/fix-global-admin', async (c) => {
  try {
    const { secretKey } = await c.req.json();
    
    // Security check - only allow with a secret key
    if (secretKey !== 'fix-global-admin-2025') {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid secret key' },
        },
        401
      );
    }

    const db = getDb(c.env.DB);

    // Find the admin user
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@finhome360.com'))
      .get();

    if (!user) {
      return c.json(
        {
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Admin user not found' },
        },
        404
      );
    }

    // Update the user to be a global admin with null tenant
    await db
      .update(users)
      .set({
        isGlobalAdmin: true,
        tenantId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, 'admin@finhome360.com'))
      .run();

    return c.json({
      success: true,
      data: {
        message: 'Global admin user fixed successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          wasGlobalAdmin: user.isGlobalAdmin,
          wasTestTenant: user.tenantId,
        },
      },
    });
  } catch (error) {
    console.error('Fix global admin error:', error);
    return c.json(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to fix global admin' },
      },
      500
    );
  }
});

export default auth;

// Password reset routes
const password = new Hono<Env>();

// Request password reset
password.post('/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email || typeof email !== 'string') {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email is required' } }, 400);
    }

    const db = getDb(c.env.DB);
    const user = await db.select().from(users).where(eq(users.email, email)).get();

    // Always return success to avoid email enumeration
    if (!user) {
      return c.json({ success: true, data: { message: 'If the email exists, a reset link has been sent.' } });
    }

    // Generate token and store in KV (1 hour TTL)
    const token = crypto.randomUUID();
    const resetData = { userId: user.id, email: user.email };
    await c.env.SESSIONS.put(`reset:${token}`, JSON.stringify(resetData), { expirationTtl: 60 * 60 });

    // Send email
    const frontendUrl = c.env.FRONTEND_URL || 'https://app.finhome360.com';
    const emailService = createHybridEmailService(c.env.RESEND_API_KEY, 'noreply@finhome360.com', frontendUrl);
    await emailService.sendPasswordResetEmail(user.email, token, user.name);

    return c.json({ success: true, data: { message: 'If the email exists, a reset link has been sent.' } });
  } catch (error) {
    console.error('Forgot password error:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to process request' } }, 500);
  }
});

// Confirm password reset
password.post('/reset-password', async (c) => {
  try {
    const { token, password } = await c.req.json();
    if (!token || typeof token !== 'string' || !password || typeof password !== 'string') {
      return c.json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Token and password are required' } }, 400);
    }

    const dataJson = await c.env.SESSIONS.get(`reset:${token}`);
    if (!dataJson) {
      return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } }, 400);
    }

    const { userId } = JSON.parse(dataJson) as { userId: string };
    const db = getDb(c.env.DB);
    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      return c.json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'User not found' } }, 404);
    }

    // Update password
    const passwordHash = await bcrypt.hash(password, 10);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, user.id)).run();

    // Invalidate token
    await c.env.SESSIONS.delete(`reset:${token}`);

    return c.json({ success: true, data: { message: 'Password reset successfully' } });
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to reset password' } }, 500);
  }
});

export { password };
