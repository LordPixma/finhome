import { Next } from 'hono';
import type { AppContext } from '../types';

/**
 * Rate limiting middleware using KV storage
 * @param options Configuration options for rate limiting
 */
export function rateLimiter(options: {
  windowMs?: number; // Time window in milliseconds (default: 15 minutes)
  maxRequests?: number; // Max requests per window (default: 100)
  keyPrefix?: string; // Prefix for KV keys (default: 'ratelimit')
}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes
  const maxRequests = options.maxRequests || 100;
  const keyPrefix = options.keyPrefix || 'ratelimit';

  return async (c: AppContext, next: Next): Promise<Response | void> => {
    if (!c.env.CACHE) {
      console.warn('Rate limiting disabled: CACHE KV namespace not available');
      return await next();
    }

    // Get client identifier (IP or authenticated user)
    const user = c.get('user');
    const clientId = user?.id || c.req.header('cf-connecting-ip') || 'unknown';
    const key = `${keyPrefix}:${clientId}`;

    try {
      // Get current count from KV
      const data = await c.env.CACHE.get(key);
      
      let requestCount = 1;
      let resetTime = Date.now() + windowMs;

      if (data) {
        const parsed = JSON.parse(data);
        requestCount = parsed.count + 1;
        resetTime = parsed.resetTime;

        // Check if window has expired
        if (Date.now() > resetTime) {
          requestCount = 1;
          resetTime = Date.now() + windowMs;
        }
      }

      // Check if limit exceeded
      if (requestCount > maxRequests) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        
        return c.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later',
              retryAfter,
            },
          },
          429,
          {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          }
        );
      }

      // Update count in KV
      await c.env.CACHE.put(
        key,
        JSON.stringify({ count: requestCount, resetTime }),
        { expirationTtl: Math.ceil(windowMs / 1000) }
      );

      // Set rate limit headers
      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', (maxRequests - requestCount).toString());
      c.header('X-RateLimit-Reset', new Date(resetTime).toISOString());

      await next();
    } catch (error) {
      console.error('Rate limiting error:', error);
      // On error, allow request to proceed
      await next();
    }
  };
}

/**
 * Strict rate limiter for authentication endpoints
 */
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts
  keyPrefix: 'auth_ratelimit',
});

/**
 * Standard rate limiter for API endpoints
 */
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100, // 100 requests
  keyPrefix: 'api_ratelimit',
});
