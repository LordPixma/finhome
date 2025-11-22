import { Next } from 'hono';
import { getDb, auditLogs } from '../db';
import type { AppContext } from '../types';

/**
 * Audit Logging Middleware
 * Logs all API requests for security and compliance monitoring
 * Accessible by global admins for review
 */
export async function auditMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const startTime = Date.now();
  const user = c.get('user');
  const tenantId = c.get('tenantId');

  // Capture request details
  const method = c.req.method;
  const endpoint = c.req.url;
  const ipAddress = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
  const userAgent = c.req.header('User-Agent') || 'unknown';

  // Execute the request
  await next();

  // Only log if user is authenticated (skip login/register endpoints)
  if (!user) {
    return;
  }

  try {
    const duration = Date.now() - startTime;
    const db = getDb(c.env.DB);

    // Determine action and resource from endpoint and method
    const { action, resource, resourceId } = parseEndpoint(endpoint, method);

    // Get status code from response (default 200 if not set)
    const statusCode = c.res.status || 200;

    // Create audit log entry
    const auditLog = {
      id: crypto.randomUUID(),
      tenantId: tenantId || null,
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      action,
      resource,
      resourceId,
      method,
      endpoint: new URL(endpoint).pathname, // Store pathname only, not full URL
      statusCode,
      details: null, // We can expand this to include request/response bodies if needed
      ipAddress,
      userAgent,
      duration,
      createdAt: new Date(),
    };

    // Insert audit log (fire and forget - don't block response)
    db.insert(auditLogs).values(auditLog).run().catch((error) => {
      console.error('Failed to write audit log:', error);
    });
  } catch (error) {
    // Don't fail the request if audit logging fails
    console.error('Audit middleware error:', error);
  }
}

/**
 * Parse endpoint to determine action and resource
 */
function parseEndpoint(url: string, method: string): { action: string; resource: string; resourceId: string | null } {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split('/').filter(Boolean);

    // Default values
    let action = method.toLowerCase();
    let resource = 'unknown';
    let resourceId: string | null = null;

    // Parse API endpoints like /api/transactions, /api/accounts/:id, etc.
    if (segments[0] === 'api' && segments.length >= 2) {
      resource = segments[1]; // e.g., 'transactions', 'accounts'

      // Check if there's an ID in the path
      if (segments.length >= 3 && segments[2] !== 'stats' && segments[2] !== 'categorization-stats') {
        resourceId = segments[2];
      }

      // Map HTTP methods to actions
      switch (method) {
        case 'GET':
          action = resourceId ? 'view' : 'list';
          break;
        case 'POST':
          action = 'create';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'update';
          break;
        case 'DELETE':
          action = 'delete';
          break;
      }
    } else if (pathname.includes('/login')) {
      action = 'login';
      resource = 'auth';
    } else if (pathname.includes('/logout')) {
      action = 'logout';
      resource = 'auth';
    } else if (pathname.includes('/register')) {
      action = 'register';
      resource = 'auth';
    }

    return { action, resource, resourceId };
  } catch {
    return { action: method.toLowerCase(), resource: 'unknown', resourceId: null };
  }
}
