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
  
  // Extract subdomain from host
  // Expected formats:
  // - acme.finhome360.com -> subdomain: "acme"
  // - acme.localhost:8787 -> subdomain: "acme" (local dev)
  // - localhost:8787 -> no subdomain (skip validation for base domain)
  const subdomain = extractSubdomain(host);

  // If no subdomain detected, skip validation
  // This allows access to base domain (e.g., www.finhome360.com, finhome360.com)
  if (!subdomain) {
    // For auth endpoints (login/register), allow access without subdomain
    const path = new URL(c.req.url).pathname;
    if (path.startsWith('/api/auth/')) {
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
