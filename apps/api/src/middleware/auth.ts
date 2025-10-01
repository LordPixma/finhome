import { Next } from 'hono';
import type { AppContext } from '../types';

// Simple JWT verification (in production, use a proper library)
function decodeJWT(token: string): any {
  try {
    const [, payloadBase64] = token.split('.');
    const payload = JSON.parse(atob(payloadBase64));
    return payload;
  } catch {
    return null;
  }
}

export async function authMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing token' } }, 401);
  }

  const token = authHeader.substring(7);
  const payload = decodeJWT(token);

  if (!payload || !payload.userId || !payload.tenantId) {
    return c.json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid token' } }, 401);
  }

  // Set user context
  c.set('user', {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    tenantId: payload.tenantId,
    role: payload.role,
  });
  c.set('tenantId', payload.tenantId);

  await next();
}

export async function tenantMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const tenantId = c.get('tenantId');

  if (!tenantId) {
    return c.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'No tenant context' } },
      403
    );
  }

  await next();
}
