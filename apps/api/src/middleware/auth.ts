import { Next } from 'hono';
import * as jose from 'jose';
import type { AppContext } from '../types';

export async function authMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401);
  }

  const token = authHeader.substring(7);
  const jwtSecret = c.env.JWT_SECRET;

  if (!jwtSecret) {
    console.error('JWT_SECRET not configured');
    return c.json(
      { success: false, error: { code: 'SERVER_ERROR', message: 'Authentication not configured' } },
      500
    );
  }

  try {
    // Verify JWT token
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jose.jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (!payload.sub) {
      return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' } }, 401);
    }

    // For global admins, allow access regardless of subdomain
    const isGlobalAdmin = payload.isGlobalAdmin as boolean;
    
    if (!isGlobalAdmin) {
      // Regular users must have a tenantId
      if (!payload.tenantId) {
        return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' } }, 401);
      }

      // Verify that JWT tenantId matches subdomain tenantId (if subdomain is present)
      const subdomainTenantId = c.get('tenantId');
      if (subdomainTenantId && subdomainTenantId !== payload.tenantId) {
        return c.json(
          {
            success: false,
            error: {
              code: 'TENANT_MISMATCH',
              message: 'Your account does not have access to this tenant. Please log in to the correct subdomain.',
            },
          },
          403
        );
      }
    }

    // Set user context
    c.set('user', {
      id: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      tenantId: payload.tenantId as string | null,
      isGlobalAdmin: isGlobalAdmin,
    });
    
    // Set tenantId from JWT if not already set by subdomain middleware (and if not global admin)
    const subdomainTenantId = c.get('tenantId');
    if (!subdomainTenantId && payload.tenantId) {
      c.set('tenantId', payload.tenantId as string);
    }

    await next();
  } catch (error) {
    console.error('JWT verification failed:', error);
    return c.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } },
      401
    );
  }
}

export async function tenantMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const user = c.get('user');
  const tenantId = c.get('tenantId');

  // Global admins can bypass tenant requirement
  if (user?.isGlobalAdmin) {
    await next();
    return;
  }

  if (!tenantId) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'No tenant context' } },
      403
    );
  }

  await next();
}
