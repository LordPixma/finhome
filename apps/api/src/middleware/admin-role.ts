import { Next } from 'hono';
import type { AppContext } from '../types';

/**
 * Admin Role Middleware
 * Verifies that the authenticated user has admin or owner role
 * Must be used after authMiddleware
 */
export async function adminRoleMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const user = c.get('user');

  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      },
      401
    );
  }

  // Check if user has admin or owner role
  if (user.role !== 'admin' && user.role !== 'owner' && !user.isGlobalAdmin) {
    return c.json(
      {
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin or owner access required',
        },
      },
      403
    );
  }

  await next();
}
