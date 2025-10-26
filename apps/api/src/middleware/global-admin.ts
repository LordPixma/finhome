import { Next } from 'hono';
import * as jose from 'jose';
import { eq } from 'drizzle-orm';
import { getDb, users } from '../db';
import type { AppContext } from '../types';

/**
 * Global Admin Authentication Middleware
 * Verifies that the user is a global admin and bypasses tenant isolation
 */
export async function globalAdminMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  try {
    // Get JWT token from Authorization header
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid authorization header',
          },
        },
        401
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT token
    const secret = new TextEncoder().encode(c.env.JWT_SECRET);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });
    
    const userId = payload.userId as string;

    if (!userId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid token payload',
          },
        },
        401
      );
    }

    // Get user from database and verify global admin status
    const db = getDb(c.env.DB);
    const user = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        tenantId: users.tenantId,
        role: users.role,
        isGlobalAdmin: users.isGlobalAdmin,
      })
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
        401
      );
    }

    // Verify global admin status
    if (!user.isGlobalAdmin) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Global admin access required',
          },
        },
        403
      );
    }

    // Set global admin context (bypasses tenant isolation)
    c.set('userId', user.id);
    c.set('userName', user.name);
    c.set('userEmail', user.email);
    c.set('userRole', user.role);
    c.set('isGlobalAdmin', true);
    c.set('originalTenantId', user.tenantId || undefined); // Keep track of admin's original tenant if any
    
    // Note: We intentionally do NOT set tenantId for global admin context
    // This allows access to cross-tenant operations

    await next();
  } catch (error) {
    console.error('Global admin middleware error:', error);
    
    return c.json(
      {
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
        },
      },
      401
    );
  }
}

/**
 * Log global admin actions for audit trail
 */
export async function logGlobalAdminAction(
  c: AppContext,
  action: string,
  targetType: 'tenant' | 'user' | 'system',
  targetId?: string,
  details?: any
): Promise<void> {
  try {
    const { globalAdminActions } = await import('../db/schema');
    
    const adminUserId = c.get('userId') as string;
    const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
    const userAgent = c.req.header('User-Agent') || 'unknown';

    const db = getDb(c.env.DB);
    await db.insert(globalAdminActions).values({
      id: crypto.randomUUID(),
      adminUserId,
      action,
      targetType,
      targetId,
      details: details ? JSON.stringify(details) : null,
      ipAddress,
      userAgent,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log global admin action:', error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}

/**
 * Middleware to require specific global admin permissions
 */
export function requireGlobalAdminPermission(_requiredAction: string) {
  return async (c: AppContext, next: Next): Promise<Response | void> => {
    const isGlobalAdmin = c.get('isGlobalAdmin');
    
    if (!isGlobalAdmin) {
      return c.json(
        {
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Global admin access required',
          },
        },
        403
      );
    }

    // In a more complex system, you could check specific permissions here
    // For now, all global admins have all permissions
    
    await next();
  };
}