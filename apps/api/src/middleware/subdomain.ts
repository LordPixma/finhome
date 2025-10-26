import { Next } from 'hono';
import { eq } from 'drizzle-orm';
import { getDb, tenants } from '../db';
import type { AppContext } from '../types';

/**
 * Extract subdomain from Host header and validate tenant exists
 * Sets tenantId and subdomain in context for downstream middleware
 */
export async function subdomainMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const host = c.req.header('Host') || c.req.header('host') || '';
  
  // Extract subdomain from host or URL parameter (fallback)
  // Expected formats:
  // - acme.finhome360.com -> subdomain: "acme"
  // - acme.localhost:8787 -> subdomain: "acme" (local dev)
  // - app.finhome360.com?tenant=acme -> subdomain: "acme" (fallback)
  let subdomain = extractSubdomain(host);
  
  // If no subdomain from host, check URL parameter (fallback for when DNS wildcards aren't available)
  if (!subdomain) {
    const url = new URL(c.req.url);
    const tenantParam = url.searchParams.get('tenant');
    if (tenantParam && isValidSubdomain(tenantParam)) {
      subdomain = tenantParam;
    }
  }

  // If no subdomain detected, check if this is a system subdomain
  if (!subdomain) {
    const path = new URL(c.req.url).pathname;
    
    // For auth endpoints, always allow access without tenant validation
    if (path.startsWith('/api/auth/')) {
      await next();
      return;
    }
    
    // Check if this is a system subdomain by examining the host
    const hostWithoutPort = host.split(':')[0];
    const isAppSubdomain = hostWithoutPort.startsWith('app.');
    const isAdminSubdomain = hostWithoutPort.startsWith('admin.');
    
    if (isAppSubdomain) {
      // For app.finhome360.com, allow access but set a special context
      c.set('isAppDomain', true);
      await next();
      return;
    }
    
    if (isAdminSubdomain) {
      // For admin.finhome360.com, allow access for global admin operations
      // No tenant context is set - this bypasses tenant isolation
      c.set('isAdminDomain', true);
      await next();
      return;
    }
    
    // Check if this is a direct Workers API call (finhome-api.samuel-1e5.workers.dev)
    // In this case, we'll rely on the auth middleware to extract tenant from JWT
    const isWorkersApiDomain = hostWithoutPort.includes('.workers.dev');
    
    if (isWorkersApiDomain) {
      // Allow access - tenant context will be set by auth middleware from JWT
      await next();
      return;
    }
    
    return c.json(
      {
        success: false,
        error: {
          code: 'NO_SUBDOMAIN',
          message: 'Please access your account via your subdomain (e.g., yourcompany.finhome360.com)',
        },
      },
      400
    );
  }

  // Validate subdomain format
  if (!isValidSubdomain(subdomain)) {
    return c.json(
      {
        success: false,
        error: {
          code: 'INVALID_SUBDOMAIN',
          message: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.',
        },
      },
      400
    );
  }

  // Look up tenant by subdomain
  const db = getDb(c.env.DB);
  const tenant = await db
    .select({
      id: tenants.id,
      name: tenants.name,
      subdomain: tenants.subdomain,
    })
    .from(tenants)
    .where(eq(tenants.subdomain, subdomain))
    .get();

  if (!tenant) {
    return c.json(
      {
        success: false,
        error: {
          code: 'TENANT_NOT_FOUND',
          message: 'No account found for this subdomain. Please check the URL or register a new account.',
        },
      },
      404
    );
  }

  // Set tenant context for downstream middleware
  c.set('tenantId', tenant.id);
  c.set('subdomain', tenant.subdomain);
  c.set('tenantName', tenant.name);

  await next();
}

/**
 * Extract subdomain from host header
 * Returns null if no subdomain or base domain
 */
function extractSubdomain(host: string): string | null {
  // Remove port if present
  const hostWithoutPort = host.split(':')[0];
  
  // Split by dots
  const parts = hostWithoutPort.split('.');
  
  // Local development patterns
  if (hostWithoutPort.includes('localhost')) {
    // acme.localhost -> "acme"
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }
    return null; // localhost without subdomain
  }
  
  // Production patterns for finhome360.com
  if (parts.length >= 3) {
    // acme.finhome360.com -> "acme"
    // subdomain.app.finhome360.com -> "subdomain" (if app is also part of base)
    const baseDomain = parts.slice(-2).join('.'); // "finhome360.com"
    
    // Common base domains to skip
    const baseDomains = ['finhome360.com', 'pages.dev'];
    
    if (baseDomains.some(base => baseDomain.includes(base))) {
      const potentialSubdomain = parts[0];
      
      // Skip common non-tenant subdomains
      const systemSubdomains = ['www', 'app', 'api', 'admin', 'docs', 'status'];
      if (systemSubdomains.includes(potentialSubdomain.toLowerCase())) {
        return null;
      }
      
      return potentialSubdomain;
    }
  }
  
  return null;
}

/**
 * Validate subdomain format
 */
function isValidSubdomain(subdomain: string): boolean {
  // Must be lowercase letters, numbers, and hyphens only
  // Must be 1-63 characters (DNS limit)
  // Cannot start or end with hyphen
  const regex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
  return regex.test(subdomain);
}

/**
 * Optional: Middleware for auth endpoints that allows subdomain to be passed
 * in request body instead of Host header (useful for initial registration/login)
 */
export async function optionalSubdomainMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  // Try to get subdomain from Host header first
  const host = c.req.header('Host') || '';
  let subdomain = extractSubdomain(host);
  
  // If no subdomain in Host, check if it's in the request body (for login/register from base domain)
  if (!subdomain) {
    try {
      const body = await c.req.json();
      subdomain = body.subdomain;
      
      if (subdomain) {
        // Validate subdomain from body
        if (!isValidSubdomain(subdomain)) {
          return c.json(
            {
              success: false,
              error: {
                code: 'INVALID_SUBDOMAIN',
                message: 'Invalid subdomain format',
              },
            },
            400
          );
        }
        
        // Look up tenant
        const db = getDb(c.env.DB);
        const tenant = await db
          .select({ id: tenants.id, name: tenants.name, subdomain: tenants.subdomain })
          .from(tenants)
          .where(eq(tenants.subdomain, subdomain))
          .get();
        
        if (tenant) {
          c.set('tenantId', tenant.id);
          c.set('subdomain', tenant.subdomain);
          c.set('tenantName', tenant.name);
        }
      }
    } catch {
      // If body parsing fails, continue without subdomain context
    }
  }
  
  await next();
}
