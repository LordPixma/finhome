import { Hono } from 'hono';
import * as jose from 'jose';
import * as bcrypt from 'bcryptjs';
import { eq, and } from 'drizzle-orm';
import { getDb, tenants, users } from '../db';
import { LoginSchema, RegisterSchema, RefreshTokenSchema } from '@finhome360/shared';
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
  tenantId: string,
  role: 'admin' | 'member',
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
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
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
    .sign(secretKey);

  return { accessToken, refreshToken };
}

// Login endpoint
auth.post('/login', async c => {
  try {
    const body = await c.req.json();
    const validation = LoginSchema.safeParse(body);

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

    const { email, password } = validation.data;
    const db = getDb(c.env.DB);

    // Find user by email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (!user) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      return c.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        },
        401
      );
    }

    // Generate tokens
    const tokens = await generateTokens(
      user.id,
      user.email,
      user.name,
      user.tenantId,
      user.role,
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
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
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

    // Check if email already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .get();

    if (existingUser) {
      return c.json(
        {
          success: false,
          error: { code: 'EMAIL_TAKEN', message: 'This email is already registered' },
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

    // Generate tokens
    const tokens = await generateTokens(userId, email, name, tenantId, 'admin', c.env.JWT_SECRET);

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

    if (!user) {
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

export default auth;
