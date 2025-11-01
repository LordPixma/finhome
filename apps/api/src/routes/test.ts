import { Hono } from 'hono';
import type { Env } from '../types';

const testRoute = new Hono<Env>();

testRoute.get('/ping', async c => {
  return c.json({ success: true, data: { message: 'Test route working!' } });
});

export default testRoute;