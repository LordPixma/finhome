import { Next } from 'hono';
import type { AppContext } from '../types';

export async function corsMiddleware(c: AppContext, next: Next): Promise<Response | void> {
  const origin = c.req.header('Origin') || '*';
  
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Allow-Credentials', 'true');

  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
}
